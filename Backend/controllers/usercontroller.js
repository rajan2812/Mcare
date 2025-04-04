import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { createTransport } from "nodemailer"
import { PatientUser, DoctorUser } from "../model/usermodal.js"
import dotenv from "dotenv"
import multer from "multer"
import path from "path"
import fs from "fs"

dotenv.config()

// Create a Map to store OTPs with email as key and an object containing OTP and timestamp as value
const otpStore = new Map()

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "fallback-secret-key", {
    expiresIn: "30d",
  })
}

// Create Gmail transporter
const transporter = createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

const sendOTP = async (req, res) => {
  try {
    console.log("Received OTP request for email:", req.body.email)
    const { email } = req.body

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      })
    }

    // Generate OTP
    const otp = generateOTP()
    console.log(`Generated new OTP for ${email}:`, otp)

    // Store OTP with timestamp
    otpStore.set(email, {
      otp,
      timestamp: Date.now(),
      attempts: 0,
    })

    console.log("Current OTP store:", Array.from(otpStore.entries()))

    // Send email
    try {
      const info = await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: email,
        subject: "Your OTP for Mcare Registration",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Welcome to Mcare</h1>
            <p>Your OTP for registration is: <strong style="font-size: 24px; color: #2563eb;">${otp}</strong></p>
            <p>This OTP will expire in 5 minutes.</p>
            <p style="color: #64748b; font-size: 12px;">If you didn't request this OTP, please ignore this email.</p>
          </div>
        `,
      })

      console.log("Email sent successfully:", info.messageId)
      res.status(200).json({
        success: true,
        message: "OTP sent successfully. Please check your email.",
      })
    } catch (emailError) {
      console.error("Email sending error:", emailError)
      // Remove OTP from store if email fails
      otpStore.delete(email)
      throw new Error("Failed to send OTP email")
    }
  } catch (error) {
    console.error("Send OTP error:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Error sending OTP",
    })
  }
}

const verifyOTP = (email, inputOTP) => {
  console.log("Verifying OTP for email:", email)
  console.log("Input OTP:", inputOTP)

  const storedData = otpStore.get(email)
  console.log("Stored OTP data:", storedData)

  if (!storedData) {
    console.log("No OTP found for email:", email)
    return { isValid: false, message: "No OTP found. Please request a new OTP." }
  }

  const { otp, timestamp, attempts } = storedData

  // Check if OTP has expired (5 minutes)
  if (Date.now() - timestamp > 5 * 60 * 1000) {
    console.log("OTP expired for email:", email)
    otpStore.delete(email)
    return { isValid: false, message: "OTP has expired. Please request a new OTP." }
  }

  // Check if max attempts exceeded (3 attempts)
  if (attempts >= 3) {
    console.log("Max attempts exceeded for email:", email)
    otpStore.delete(email)
    return { isValid: false, message: "Maximum attempts exceeded. Please request a new OTP." }
  }

  // Verify OTP
  if (otp !== inputOTP) {
    console.log("Invalid OTP for email:", email)
    console.log("Stored OTP:", otp)
    console.log("Input OTP:", inputOTP)

    // Only increment attempts for invalid OTPs
    storedData.attempts += 1
    otpStore.set(email, storedData)

    return {
      isValid: false,
      message: `Invalid OTP. ${3 - storedData.attempts} attempts remaining.`,
    }
  }

  // OTP is valid - remove it from store
  console.log("Valid OTP for email:", email)
  otpStore.delete(email)
  return { isValid: true }
}

const registerUser = async (req, res) => {
  try {
    console.log("Registration request received:", {
      ...req.body,
      password: "[HIDDEN]",
    })

    const { firstName, lastName, email, password, userType, otp } = req.body

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !userType || !otp) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      })
    }

    // Verify OTP
    const otpVerification = verifyOTP(email, otp)
    if (!otpVerification.isValid) {
      return res.status(400).json({
        success: false,
        message: otpVerification.message,
      })
    }

    // Check if user exists
    let existingUser = await PatientUser.findOne({ email })
    if (!existingUser) {
      existingUser = await DoctorUser.findOne({ email })
    }

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      })
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Create user in MongoDB
    const UserModel = userType.toLowerCase() === "patient" ? PatientUser : DoctorUser
    const userData = {
      firstName,
      lastName,
      email,
      password: hashedPassword,
      avatarUrl: "/placeholder.svg",
      isProfileCompleted: userType.toLowerCase() === "patient", // Set to false for doctors
      verificationStatus: userType.toLowerCase() === "doctor" ? "pending" : undefined,
    }

    const newUser = await UserModel.create(userData)

    console.log("User created successfully:", {
      id: newUser._id,
      email: newUser.email,
      userType,
    })

    // Create token
    const token = createToken(newUser._id)

    // Set redirect path based on user type
    const redirectPath = userType === "Doctor" ? "/doctor-dashboard/complete-profile" : "/patient-dashboard"

    res.status(201).json({
      success: true,
      message: "Registration successful!",
      token,
      user: {
        id: newUser._id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        userType,
        avatarUrl: "/placeholder.svg",
        isProfileCompleted: newUser.isProfileCompleted,
        verificationStatus: newUser.verificationStatus,
      },
      redirectPath,
    })
  } catch (error) {
    console.error("Registration error:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Error creating user",
    })
  }
}

const loginUser = async (req, res) => {
  try {
    const { email, password, userType } = req.body

    // Determine which model to use based on userType
    const UserModel = userType === "patient" ? PatientUser : DoctorUser

    // Find user
    const user = await UserModel.findOne({ email }).select("+password")

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      })
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      })
    }

    // Create token
    const token = createToken(user._id)

    // Determine redirect URL based on user type and profile status
    let redirectUrl = "/patient-dashboard"
    if (userType === "doctor") {
      redirectUrl = user.isProfileCompleted ? "/doctor-dashboard" : "/doctor-dashboard/complete-profile"
    }

    // Prepare user data to send
    const userData = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      dateOfBirth: user.dateOfBirth,
      userType: userType,
      avatarUrl: user.avatarUrl,
      isProfileCompleted: user.isProfileCompleted || false,
      verificationStatus: user.verificationStatus || "pending",
      specializations: user.specializations || [],
      qualifications: user.qualifications || "",
      experience: user.experience || "",
      licenseNumber: user.licenseNumber || "",
    }

    // Set session
    req.session.user = userData

    console.log("Login response:", {
      userData,
      redirectUrl,
    })

    res.status(200).json({
      success: true,
      token,
      user: userData,
      redirectUrl,
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({
      success: false,
      message: "Error during login",
      error: error.message,
    })
  }
}

const forgotPassword = async (req, res) => {
  try {
    console.log("Forgot password request received for email:", req.body.email)
    const { email } = req.body

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      })
    }

    // Check if user exists
    let user = await PatientUser.findOne({ email })
    let userType = "patient"

    if (!user) {
      user = await DoctorUser.findOne({ email })
      userType = "doctor"
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email",
      })
    }

    // Generate and store OTP
    const otp = generateOTP()
    console.log(`Generated password reset OTP for ${email}:`, otp)

    // Store OTP with timestamp and purpose
    otpStore.set(email, {
      otp,
      timestamp: Date.now(),
      attempts: 0,
      purpose: "password-reset",
      userType,
    })

    console.log("Stored OTP data:", otpStore.get(email))

    // Send password reset email
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: "Password Reset OTP - Mcare",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Password Reset - Mcare</h1>
          <p>Your OTP for password reset is: <strong style="font-size: 24px; color: #2563eb;">${otp}</strong></p>
          <p>This OTP will expire in 5 minutes.</p>
          <p>If you didn't request this password reset, please ignore this email.</p>
        </div>
      `,
    })

    res.status(200).json({
      success: true,
      message: "Password reset OTP sent successfully. Please check your email.",
    })
  } catch (error) {
    console.error("Forgot password error:", error)
    res.status(500).json({
      success: false,
      message: "Error processing password reset request",
    })
  }
}

const resetPassword = async (req, res) => {
  try {
    console.log("Password reset request received:", {
      email: req.body.email,
      otp: req.body.otp,
      hasNewPassword: !!req.body.newPassword,
    })

    const { email, otp, newPassword } = req.body

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP, and new password are required",
      })
    }

    // Get stored OTP data
    const storedData = otpStore.get(email)
    console.log("Stored OTP data:", storedData)

    if (!storedData) {
      return res.status(400).json({
        success: false,
        message: "No OTP found. Please request a new OTP.",
      })
    }

    if (storedData.purpose !== "password-reset") {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP purpose. Please request a new password reset OTP.",
      })
    }

    // Verify OTP
    const otpVerification = verifyOTP(email, otp)
    if (!otpVerification.isValid) {
      return res.status(400).json({
        success: false,
        message: otpVerification.message,
      })
    }

    // Select the correct user model
    const UserModel = storedData.userType === "patient" ? PatientUser : DoctorUser

    // Find user and update password
    const user = await UserModel.findOne({ email })
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(newPassword, salt)

    // Update password
    user.password = hashedPassword
    await user.save()

    console.log("Password updated successfully for user:", email)

    // Send confirmation email
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: "Password Reset Successful - Mcare",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Password Reset Successful</h1>
          <p>Your password has been successfully reset.</p>
          <p>You can now log in with your new password.</p>
          <p>If you didn't make this change, please contact support immediately.</p>
        </div>
      `,
    })

    // Clear the OTP from store
    otpStore.delete(email)

    res.status(200).json({
      success: true,
      message: "Password reset successful. You can now login with your new password.",
    })
  } catch (error) {
    console.error("Password reset error:", error)
    res.status(500).json({
      success: false,
      message: "Error resetting password",
    })
  }
}

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id
    const updates = req.body

    // Determine which model to use based on userType
    const UserModel = updates.userType === "patient" ? PatientUser : DoctorUser

    // Find and update the user
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      {
        firstName: updates.firstName,
        lastName: updates.lastName,
        dateOfBirth: updates.dateOfBirth,
        gender: updates.gender,
        email: updates.email,
        phone: updates.phone,
        address: updates.address,
        height: updates.height,
        weight: updates.weight,
        bloodType: updates.bloodType,
        emergencyContact: updates.emergencyContact,
        avatarUrl: updates.avatarUrl,
      },
      { new: true, runValidators: true },
    )

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" })
    }

    // Prepare user data to send (excluding sensitive information)
    const userData = {
      id: updatedUser._id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      dateOfBirth: updatedUser.dateOfBirth,
      gender: updatedUser.gender,
      phone: updatedUser.phone,
      address: updatedUser.address,
      height: updatedUser.height,
      weight: updatedUser.weight,
      bloodType: updatedUser.bloodType,
      emergencyContact: updatedUser.emergencyContact,
      userType: updates.userType,
      avatarUrl: updatedUser.avatarUrl,
    }

    res.json({ success: true, user: userData })
  } catch (error) {
    console.error("Profile update error:", error)
    res.status(500).json({ success: false, message: "Error updating profile", error: error.message })
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/")
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname))
  },
})

const upload = multer({ storage: storage })

const uploadProfilePicture = [
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      console.log("Upload request received:", req.user)
      const userId = req.user.id
      const file = req.file

      if (!file) {
        return res.status(400).json({ success: false, message: "No file uploaded" })
      }

      console.log("User ID:", userId)
      console.log("File:", file)

      const UserModel = req.user.userType === "patient" ? PatientUser : DoctorUser
      const user = await UserModel.findById(userId)

      if (!user) {
        console.error("User not found:", userId)
        return res.status(404).json({ success: false, message: "User not found" })
      }

      // Remove old profile picture if it exists
      if (user.avatarUrl && user.avatarUrl !== "/placeholder.svg") {
        const oldFilePath = path.join(__dirname, "..", user.avatarUrl)
        fs.unlinkSync(oldFilePath)
      }

      // Update user's avatar URL
      user.avatarUrl = `/uploads/${file.filename}`
      await user.save()

      console.log("Profile picture updated for user:", userId)
      res.json({ success: true, avatarUrl: user.avatarUrl })
    } catch (error) {
      console.error("Profile picture upload error:", error)
      res.status(500).json({ success: false, message: "Error uploading profile picture", error: error.message })
    }
  },
]

const removeProfilePicture = async (req, res) => {
  try {
    const userId = req.user.id
    const UserModel = req.user.userType === "patient" ? PatientUser : DoctorUser
    const user = await UserModel.findById(userId)

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" })
    }

    // Remove profile picture if it exists
    if (user.avatarUrl && user.avatarUrl !== "/placeholder.svg") {
      const filePath = path.join(__dirname, "..", user.avatarUrl)
      fs.unlinkSync(filePath)
    }

    // Reset avatar URL to placeholder
    user.avatarUrl = "/placeholder.svg"
    await user.save()

    res.json({ success: true, message: "Profile picture removed successfully" })
  } catch (error) {
    console.error("Profile picture removal error:", error)
    res.status(500).json({ success: false, message: "Error removing profile picture", error: error.message })
  }
}

const completeProfile = async (req, res) => {
  try {
    const { specializations, qualifications, experience, licenseNumber, about } = req.body
    const userId = req.user.id

    // Find the doctor user
    const doctor = await DoctorUser.findById(userId)

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      })
    }

    // Update doctor's profile
    doctor.specializations = specializations
    doctor.qualifications = qualifications
    doctor.experience = experience
    doctor.licenseNumber = licenseNumber
    doctor.about = about
    doctor.isProfileCompleted = true

    await doctor.save()

    console.log(`Profile completed for doctor: ${doctor._id}`)

    res.status(200).json({
      success: true,
      message: "Profile completed successfully",
      user: {
        id: doctor._id,
        email: doctor.email,
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        userType: "doctor",
        avatarUrl: doctor.avatarUrl,
        isProfileCompleted: doctor.isProfileCompleted,
        verificationStatus: doctor.verificationStatus,
      },
    })
  } catch (error) {
    console.error("Complete profile error:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Error completing profile",
    })
  }
}

const completeDoctorProfile = async (req, res) => {
  try {
    const { licenseNumber, specialization, qualifications, experience } = req.body
    const userId = req.user.id

    // Find the doctor user
    const doctor = await DoctorUser.findById(userId)

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      })
    }

    // Update doctor's profile
    doctor.licenseNumber = licenseNumber
    doctor.specialization = specialization
    doctor.qualifications = qualifications
    doctor.experience = experience
    doctor.isProfileCompleted = true

    await doctor.save()

    res.status(200).json({
      success: true,
      message: "Profile completed successfully",
      user: {
        id: doctor._id,
        email: doctor.email,
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        userType: "doctor",
        avatarUrl: doctor.avatarUrl,
        isProfileCompleted: doctor.isProfileCompleted,
      },
    })
  } catch (error) {
    console.error("Complete doctor profile error:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Error completing doctor profile",
    })
  }
}

// Add this new function to handle verification status checks
const getVerificationStatus = async (req, res) => {
  try {
    const userId = req.user.id
    const doctor = await DoctorUser.findById(userId)

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      })
    }

    // Log the verification status being sent
    console.log("Sending verification status:", {
      userId,
      status: doctor.verificationStatus,
      timestamp: new Date().toISOString(),
    })

    res.json({
      success: true,
      verificationStatus: doctor.verificationStatus,
      verificationRemarks: doctor.verificationRemarks,
      verifiedAt: doctor.verifiedAt,
    })
  } catch (error) {
    console.error("Error fetching verification status:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching verification status",
      error: error.message,
    })
  }
}

export {
  loginUser,
  registerUser,
  sendOTP,
  forgotPassword,
  resetPassword,
  updateProfile,
  uploadProfilePicture,
  removeProfilePicture,
  completeProfile,
  completeDoctorProfile,
  getVerificationStatus,
}

