import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { Resend } from "resend"
import nodemailer from "nodemailer"
import smtpTransport from "nodemailer-smtp-transport"
import { PatientUser, DoctorUser } from "../model/usermodal.js"
import admin from "../config/firebase-admin.js"
import dotenv from "dotenv"

dotenv.config()

const otpStore = new Map()

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "fallback-secret-key", {
    expiresIn: "30d",
  })
}

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY)

// Create a nodemailer transporter using your Gmail account
const gmailTransporter = nodemailer.createTransport(
  smtpTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  }),
)

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
    console.log(`Generated OTP for ${email}:`, otp)

    // Store OTP with 5-minute expiry
    const otpData = {
      otp,
      expiry: Date.now() + 5 * 60 * 1000, // 5 minutes
    }
    otpStore.set(email, otpData)
    console.log("Stored OTP data:", { email, otpData })

    const emailContent = {
      subject: "Your OTP for Mcare Registration",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Welcome to Mcare</h1>
          <p>Your OTP for registration is: <strong style="font-size: 24px; color: #2563eb;">${otp}</strong></p>
          <p>This OTP will expire in 5 minutes.</p>
          <p style="color: #64748b; font-size: 12px;">If you didn't request this OTP, please ignore this email.</p>
        </div>
      `,
      text: `Your OTP for Mcare Registration is: ${otp}. This OTP will expire in 5 minutes.`,
    }

    try {
      let emailSent = false

      // First, try to send using Gmail
      try {
        await gmailTransporter.sendMail({
          from: process.env.GMAIL_USER,
          to: email,
          ...emailContent,
        })
        console.log("Email sent successfully via Gmail")
        emailSent = true
      } catch (gmailError) {
        console.log("Gmail email failed, falling back to Resend:", gmailError)
      }

      // If Gmail fails, fall back to Resend (for verified emails)
      if (!emailSent) {
        const { data, error } = await resend.emails.send({
          from: "Mcare <onboarding@resend.dev>",
          to: email,
          ...emailContent,
        })

        if (error) {
          throw error
        }

        console.log("Email sent successfully via Resend:", data)
        emailSent = true
      }

      if (emailSent) {
        return res.json({
          success: true,
          message: "OTP sent successfully. Please check your email.",
          ...(process.env.NODE_ENV === "development" && { otp }), // Include OTP in development mode
        })
      } else {
        throw new Error("Failed to send email through both methods")
      }
    } catch (emailError) {
      console.error("Email sending error:", emailError)
      res.status(500).json({
        success: false,
        message: "Error sending OTP email",
        error: emailError.message,
      })
    }
  } catch (error) {
    console.error("Send OTP error:", error)
    res.status(500).json({
      success: false,
      message: "Error processing OTP request",
      error: error.message,
    })
  }
}

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body

    // Find user in both collections
    let user = await PatientUser.findOne({ email })
    let role = "patient"

    if (!user) {
      user = await DoctorUser.findOne({ email })
      role = "doctor"
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User does not exist",
      })
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      })
    }

    // Check if email is verified
    const firebaseUser = await admin.auth().getUserByEmail(email)
    if (!firebaseUser.emailVerified) {
      return res.status(400).json({
        success: false,
        message: "Please verify your email before logging in",
      })
    }

    // Create token
    const token = createToken(user._id)

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: role,
      },
      redirectUrl: role === "patient" ? "/patient-dashboard" : "/doctor-dashboard",
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({
      success: false,
      message: "Error logging in",
      error: error.message,
    })
  }
}

const verifyOTP = (email, otp) => {
  const storedOTPData = otpStore.get(email)
  console.log("Verifying OTP:", { email, inputOTP: otp, storedData: storedOTPData }) // Add logging

  if (!storedOTPData) {
    console.log("No OTP data found for email:", email)
    return { isValid: false, message: "No OTP found. Please request a new OTP" }
  }

  if (Date.now() > storedOTPData.expiry) {
    console.log("OTP expired for email:", email)
    otpStore.delete(email) // Clean up expired OTP
    return { isValid: false, message: "OTP has expired. Please request a new OTP" }
  }

  const isMatch = storedOTPData.otp === otp
  console.log("OTP match result:", isMatch)

  if (!isMatch) {
    return { isValid: false, message: "Invalid OTP. Please try again" }
  }

  // Valid OTP - clean up
  otpStore.delete(email)
  return { isValid: true }
}

const registerUser = async (req, res) => {
  try {
    console.log("Registration request received:", {
      ...req.body,
      password: "[HIDDEN]", // Don't log password
    })

    const { firstName, lastName, email, password, userType, otp } = req.body

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !userType || !otp) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
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

    // Clear OTP
    otpStore.delete(email)

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
    const newUser = await UserModel.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      avatarUrl: "/placeholder.svg",
    })

    // For patient users, ensure patientId is generated
    const userData = {
      id: newUser._id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      userType,
    }

    if (userType.toLowerCase() === "patient") {
      userData.patientId = newUser.patientId
    }

    console.log("User created successfully:", {
      id: newUser._id,
      email: newUser.email,
      userType,
      ...(userType.toLowerCase() === "patient" ? { patientId: newUser.patientId } : {}),
    })

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: userData,
    })
  } catch (error) {
    console.error("Registration error:", error)
    res.status(500).json({
      success: false,
      message: "Error creating user",
      error: error.message,
    })
  }
}

export { loginUser, registerUser, sendOTP }

