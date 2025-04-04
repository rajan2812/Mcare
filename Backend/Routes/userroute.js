import express from "express"
import {
  sendOTP,
  forgotPassword,
  resetPassword,
  registerUser,
  updateProfile,
  removeProfilePicture,
  completeDoctorProfile,
} from "../controllers/usercontroller.js"
import { protectRoute, authenticateToken } from "../middleware/authMiddleware.js"
import { PatientUser, DoctorUser } from "../model/usermodal.js"
import { getPatientDashboardData } from "../controllers/patientDashboardController.js"
import { checkAuth, adminLogin } from "../controllers/authController.js"
import { completeProfile } from "../controllers/doctorProfileController.js"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { cloudinary } from "../config/cloudinary.js"
import multer from "multer"
import { CloudinaryStorage } from "multer-storage-cloudinary"

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "mcare_uploads",
    allowed_formats: ["jpg", "png", "pdf", "doc", "docx"],
    resource_type: "auto",
  },
})

const upload = multer({ storage: storage })

const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  })
}

const userRouter = express.Router()

// Add test route to check user existence
userRouter.get("/check-user/:email", async (req, res) => {
  try {
    const { email } = req.params
    console.log("Checking user existence for email:", email)

    // Check in both collections
    const patientUser = await PatientUser.findOne({ email })
    const doctorUser = await DoctorUser.findOne({ email })

    res.json({
      exists: !!(patientUser || doctorUser),
      userType: patientUser ? "patient" : doctorUser ? "doctor" : null,
    })
  } catch (error) {
    console.error("Error checking user:", error)
    res.status(500).json({ error: "Error checking user" })
  }
})

// Public routes
userRouter.post("/send-otp", sendOTP)
userRouter.post("/login", async (req, res) => {
  try {
    const { email, password, userType } = req.body

    // Determine which model to use based on userType
    const UserModel = userType.toLowerCase() === "patient" ? PatientUser : DoctorUser

    // Find user
    const user = await UserModel.findOne({ email })

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

    // Prepare user data to send (excluding sensitive information)
    const userData = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      patientId: user.patientId,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      phone: user.phone,
      address: user.address,
      height: user.height,
      weight: user.weight,
      bloodType: user.bloodType,
      emergencyContact: user.emergencyContact,
      userType: userType.toLowerCase(),
    }

    res.status(200).json({
      success: true,
      token,
      user: userData,
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({
      success: false,
      message: "Error during login",
      error: error.message,
    })
  }
})
userRouter.post("/register", registerUser)
userRouter.post("/forgot-password", forgotPassword)
userRouter.post("/reset-password", resetPassword)

// Protected route for uploading profile picture
userRouter.post("/upload-profile-picture", authenticateToken, upload.single("profilePicture"), async (req, res) => {
  try {
    const userId = req.user.id
    const file = req.file

    if (!file) {
      return res.status(400).json({ success: false, message: "No file uploaded" })
    }

    const UserModel = req.user.userType === "patient" ? PatientUser : DoctorUser
    const user = await UserModel.findById(userId)

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" })
    }

    // Update user's avatar URL with Cloudinary URL
    user.avatarUrl = file.path
    await user.save()

    res.json({ success: true, avatarUrl: user.avatarUrl })
  } catch (error) {
    console.error("Profile picture upload error:", error)
    res.status(500).json({ success: false, message: "Error uploading profile picture", error: error.message })
  }
})

// New route for general file upload
userRouter.post("/upload-file", authenticateToken, upload.single("file"), async (req, res) => {
  try {
    const file = req.file

    if (!file) {
      return res.status(400).json({ success: false, message: "No file uploaded" })
    }

    res.json({ success: true, fileUrl: file.path })
  } catch (error) {
    console.error("File upload error:", error)
    res.status(500).json({ success: false, message: "Error uploading file", error: error.message })
  }
})

// Protected route for removing profile picture
userRouter.delete("/remove-profile-picture", authenticateToken, removeProfilePicture)

// Protected route for updating user profile
userRouter.put("/update-profile", authenticateToken, updateProfile)

// Protected routes
userRouter.get("/patient-dashboard", protectRoute, (req, res) => {
  // Verify user role
  if (req.session.user.role !== "patient") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Patient access only",
      redirectTo: "/login",
    })
  }

  res.json({
    success: true,
    data: {
      user: req.session.user,
      dashboard: "Patient Dashboard Data",
    },
  })
})

// Protected route for patient dashboard
userRouter.get("/patient-dashboard-data", protectRoute, getPatientDashboardData)

// Auth check endpoint
userRouter.get("/check-auth", checkAuth)

// Logout route
userRouter.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Error logging out",
      })
    }
    res.json({
      success: true,
      message: "Logged out successfully",
      redirectTo: "/login",
    })
  })
})

// Add the complete-profile route
userRouter.post("/complete-profile", authenticateToken, completeProfile)

// Add this new route after the existing routes
userRouter.post("/admin/login", adminLogin)
userRouter.post("/complete-doctor-profile", authenticateToken, completeDoctorProfile)

// Add this route to get verification status
userRouter.get("/verification-status", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const doctor = await DoctorUser.findById(userId).select("verificationStatus")

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      })
    }

    res.json({
      success: true,
      verificationStatus: doctor.verificationStatus,
    })
  } catch (error) {
    console.error("Error fetching verification status:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching verification status",
    })
  }
})

export default userRouter

