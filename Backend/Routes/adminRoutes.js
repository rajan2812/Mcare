import express from "express"
import { authenticateToken } from "../middleware/authMiddleware.js"
import { DoctorUser, PatientUser } from "../model/usermodal.js"
import { Notification } from "../model/notificationModel.js"
import nodemailer from "nodemailer"

const router = express.Router()

// Create a nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

// Function to send approval email
const sendApprovalEmail = async (doctorEmail, doctorName) => {
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: doctorEmail,
    subject: "Your Doctor Profile Has Been Approved - Mcare",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4a5568;">Congratulations, Dr. ${doctorName}!</h1>
        <p>Your profile on Mcare has been approved by our admin team. You can now start using all features of the platform.</p>
        <p>Here's what you can do now:</p>
        <ul>
          <li>Set up your availability</li>
          <li>Start accepting appointments</li>
          <li>Interact with patients through our secure messaging system</li>
        </ul>
        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
        <p>Thank you for choosing Mcare. We look forward to working with you!</p>
        <p>Best regards,<br>The Mcare Team</p>
      </div>
    `,
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log("Approval email sent successfully")
  } catch (error) {
    console.error("Error sending approval email:", error)
  }
}

// Admin login route - POST /api/admin/login
router.post("/login", (req, res) => {
  const { email, password } = req.body

  // Check admin credentials
  if (email === "g22.rajan.vinod@gnkhalsa.edu.in" && password === "admin@123") {
    res.status(200).json({
      success: true,
      message: "Admin login successful",
      token: "admin-token", // In production, use JWT token
      user: {
        id: "admin",
        email,
        userType: "admin",
      },
    })
  } else {
    res.status(401).json({
      success: false,
      message: "Invalid admin credentials",
    })
  }
})

// Add the pending doctors route
router.get("/pending-doctors", authenticateToken, async (req, res) => {
  console.log("Received request for pending doctors")
  try {
    const pendingDoctors = await DoctorUser.find({
      verificationStatus: "pending",
      isProfileCompleted: true,
    }).select("firstName lastName email specializations licenseNumber documents")

    res.json({
      success: true,
      data: pendingDoctors,
    })
  } catch (error) {
    console.error("Error fetching pending doctors:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending doctors",
      error: error.message,
    })
  }
})

// Add verify-doctor route
router.post("/verify-doctor", authenticateToken, async (req, res) => {
  try {
    const { doctorId, status, remarks } = req.body

    if (!doctorId || !status) {
      return res.status(400).json({
        success: false,
        message: "Doctor ID and status are required",
      })
    }

    const doctor = await DoctorUser.findById(doctorId)

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      })
    }

    // Update doctor verification status
    doctor.verificationStatus = status
    doctor.verificationRemarks = remarks || ""
    doctor.verifiedAt = new Date()
    await doctor.save()

    // Create notification for the doctor
    await Notification.create({
      recipient: doctor._id,
      recipientModel: "doctor_user",
      type: "SYSTEM", // Changed from "APPROVAL"/"REJECTION" to "SYSTEM" which is a valid enum value
      title: status === "approved" ? "Profile Approved" : "Profile Rejected",
      message:
        status === "approved"
          ? "Congratulations! Your profile has been approved. You can now start using all features of the platform."
          : `Your profile verification was rejected. Reason: ${remarks || "No specific reason provided"}`,
      metadata: {
        verificationStatus: status,
        verifiedAt: doctor.verifiedAt,
        remarks: remarks || "",
      },
    })

    // Send approval email if the status is "approved"
    if (status === "approved") {
      await sendApprovalEmail(doctor.email, `${doctor.firstName} ${doctor.lastName}`)
    }

    res.json({
      success: true,
      message: `Doctor verification ${status} successfully`,
      data: {
        id: doctor._id,
        status: doctor.verificationStatus,
        verifiedAt: doctor.verifiedAt,
      },
    })
  } catch (error) {
    console.error("Error verifying doctor:", error)
    res.status(500).json({
      success: false,
      message: "Failed to verify doctor",
      error: error.message,
    })
  }
})

// Add route to get all doctors
router.get("/doctors", authenticateToken, async (req, res) => {
  try {
    const doctors = await DoctorUser.find({}).select("-password").sort({ createdAt: -1 })

    res.json({
      success: true,
      data: doctors,
    })
  } catch (error) {
    console.error("Error fetching doctors:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch doctors",
      error: error.message,
    })
  }
})

// Add route to get all patients
router.get("/patients", authenticateToken, async (req, res) => {
  try {
    const patients = await PatientUser.find({}).select("-password").sort({ createdAt: -1 })

    res.json({
      success: true,
      data: patients,
    })
  } catch (error) {
    console.error("Error fetching patients:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch patients",
      error: error.message,
    })
  }
})

// Add route to get specific doctor details
router.get("/doctors/:id", authenticateToken, async (req, res) => {
  try {
    const doctor = await DoctorUser.findById(req.params.id).select("-password")
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      })
    }

    res.json({
      success: true,
      data: doctor,
    })
  } catch (error) {
    console.error("Error fetching doctor details:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch doctor details",
      error: error.message,
    })
  }
})

// Add route to get specific patient details
router.get("/patients/:id", authenticateToken, async (req, res) => {
  try {
    const patient = await PatientUser.findById(req.params.id).select("-password")
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      })
    }

    res.json({
      success: true,
      data: patient,
    })
  } catch (error) {
    console.error("Error fetching patient details:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch patient details",
      error: error.message,
    })
  }
})

// Add these new routes to your existing adminRoutes.js
router.get("/analytics", authenticateToken, async (req, res) => {
  try {
    // Get counts
    const doctorCount = await DoctorUser.countDocuments()
    const patientCount = await PatientUser.countDocuments()
    const pendingDoctors = await DoctorUser.countDocuments({ verificationStatus: "pending" })
    const verifiedDoctors = await DoctorUser.countDocuments({ verificationStatus: "approved" })

    // Get registration trends (last 7 days)
    const last7Days = new Date()
    last7Days.setDate(last7Days.getDate() - 7)

    const doctorTrend = await DoctorUser.aggregate([
      {
        $match: {
          createdAt: { $gte: last7Days },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])

    const patientTrend = await PatientUser.aggregate([
      {
        $match: {
          createdAt: { $gte: last7Days },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])

    // Get specialization distribution
    const specializationStats = await DoctorUser.aggregate([
      { $unwind: "$specializations" },
      {
        $group: {
          _id: "$specializations",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ])

    // Calculate verification rate
    const verificationRate = (verifiedDoctors / doctorCount) * 100 || 0

    res.json({
      success: true,
      data: {
        overview: {
          totalDoctors: doctorCount,
          totalPatients: patientCount,
          pendingVerifications: pendingDoctors,
          verifiedDoctors,
          verificationRate,
        },
        trends: {
          doctors: doctorTrend,
          patients: patientTrend,
        },
        specializationDistribution: specializationStats,
      },
    })
  } catch (error) {
    console.error("Error fetching analytics:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching analytics data",
      error: error.message,
    })
  }
})

// Update admin profile
router.put("/profile", authenticateToken, async (req, res) => {
  try {
    const { name, email, phone } = req.body

    // Since we're using a simple admin system, we'll store updates in environment variables
    // In a production system, you would update these in a database
    process.env.ADMIN_NAME = name
    process.env.ADMIN_EMAIL = email
    process.env.ADMIN_PHONE = phone

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: { name, email, phone },
    })
  } catch (error) {
    console.error("Error updating admin profile:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    })
  }
})

// Change admin password
router.put("/change-password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    // Verify current password matches admin password
    if (currentPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      })
    }

    // Update admin password
    process.env.ADMIN_PASSWORD = newPassword

    res.json({
      success: true,
      message: "Password updated successfully",
    })
  } catch (error) {
    console.error("Error changing admin password:", error)
    res.status(500).json({
      success: false,
      message: "Failed to change password",
      error: error.message,
    })
  }
})

// Update email preferences
router.put("/email-preferences", authenticateToken, async (req, res) => {
  try {
    const { notifyOnNewDoctor, notifyOnNewPatient, notifyOnComplaints, emailFrequency } = req.body

    // Store email preferences
    // In a production system, these would be stored in a database
    const emailPreferences = {
      notifyOnNewDoctor,
      notifyOnNewPatient,
      notifyOnComplaints,
      emailFrequency,
    }

    // Store in environment variable as JSON string
    process.env.ADMIN_EMAIL_PREFERENCES = JSON.stringify(emailPreferences)

    res.json({
      success: true,
      message: "Email preferences updated successfully",
      data: emailPreferences,
    })
  } catch (error) {
    console.error("Error updating email preferences:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update email preferences",
      error: error.message,
    })
  }
})

// Get admin settings
router.get("/settings", authenticateToken, async (req, res) => {
  try {
    // Get stored preferences
    const emailPreferences = JSON.parse(process.env.ADMIN_EMAIL_PREFERENCES || "{}")

    res.json({
      success: true,
      data: {
        profile: {
          name: process.env.ADMIN_NAME || "Admin User",
          email: process.env.ADMIN_EMAIL || "g22.rajan.vinod@gnkhalsa.edu.in",
          phone: process.env.ADMIN_PHONE || "",
        },
        emailPreferences,
      },
    })
  } catch (error) {
    console.error("Error fetching admin settings:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch settings",
      error: error.message,
    })
  }
})

// Send test email
router.post("/send-test-email", authenticateToken, async (req, res) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || "g22.rajan.vinod@gnkhalsa.edu.in"

    // Use the existing nodemailer transporter
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: adminEmail,
      subject: "Mcare Admin - Test Email",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Test Email</h1>
          <p>This is a test email from your Mcare admin dashboard.</p>
          <p>If you received this email, your email notifications are working correctly.</p>
        </div>
      `,
    })

    res.json({
      success: true,
      message: "Test email sent successfully",
    })
  } catch (error) {
    console.error("Error sending test email:", error)
    res.status(500).json({
      success: false,
      message: "Failed to send test email",
      error: error.message,
    })
  }
})

export default router

