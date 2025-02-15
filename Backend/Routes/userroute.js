import express from "express"
import {
  sendOTP,
  forgotPassword,
  resetPassword,
  registerUser,
  updateProfile,
  uploadProfilePicture,
  removeProfilePicture,
} from "../controllers/usercontroller.js"
import { protectRoute, authenticateToken } from "../middleware/authMiddleware.js"
import { PatientUser, DoctorUser } from "../model/usermodal.js"
import { getPatientDashboardData } from "../controllers/patientDashboardController.js"
import { checkAuth } from "../controllers/authController.js"
import bcrypt from "bcrypt" // Import bcrypt
import jwt from "jsonwebtoken" // Import jsonwebtoken

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
      patientId: user.patientId, // Assuming this field exists
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
userRouter.post("/upload-profile-picture", authenticateToken, uploadProfilePicture)

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

export default userRouter

