import express from "express"
import { authenticateToken } from "../middleware/authMiddleware.js"
import {
  bookAppointment,
  updateAppointmentStatus,
  getAppointments,
  rescheduleAppointment,
  updatePaymentStatus,
  confirmRescheduledAppointment,
  respondToRescheduleRequest,
  getCurrentAppointment,
} from "../controllers/appointmentController.js"

const router = express.Router()

// Get appointments with filters
router.get("/appointments", authenticateToken, async (req, res) => {
  try {
    await getAppointments(req, res)
  } catch (error) {
    console.error("Error in get appointments route:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching appointments",
      error: error.message,
    })
  }
})

// Book a new appointment
router.post("/appointments/book", authenticateToken, async (req, res) => {
  try {
    await bookAppointment(req, res)
  } catch (error) {
    console.error("Error in appointment booking route:", error)
    res.status(500).json({
      success: false,
      message: "Error booking appointment",
      error: error.message,
    })
  }
})

// Update appointment status
router.put("/appointments/:appointmentId/status", authenticateToken, async (req, res) => {
  try {
    // Log the request for debugging
    console.log("Appointment status update request:", {
      appointmentId: req.params.appointmentId,
      status: req.body.status,
      user: req.user,
      headers: {
        authorization: req.headers.authorization ? "Present" : "Missing",
        userRole: req.headers["user-role"],
        userHeader: req.headers["user"] ? "Present" : "Missing",
      },
    })

    // Add user role from body if not in headers
    if (!req.headers["user-role"] && req.body.userType) {
      req.headers["user-role"] = req.body.userType
      console.log(`Added user-role from body: ${req.body.userType}`)
    }

    // Check if user has role information before proceeding
    if (!req.user.role && !req.user.userType && !req.headers["user-role"]) {
      console.error("Missing role information in request")
      return res.status(403).json({
        success: false,
        message: "Forbidden: Missing role information",
        error: "User role is required for this operation",
      })
    }

    await updateAppointmentStatus(req, res)
  } catch (error) {
    console.error("Error in appointment status update route:", error)
    res.status(500).json({
      success: false,
      message: "Error updating appointment status",
      error: error.message,
    })
  }
})

// Update payment status
router.put("/appointments/:appointmentId/payment", authenticateToken, async (req, res) => {
  try {
    await updatePaymentStatus(req, res)
  } catch (error) {
    console.error("Error in payment status update route:", error)
    res.status(500).json({
      success: false,
      message: "Error updating payment status",
      error: error.message,
    })
  }
})

// Reschedule appointment
router.put("/appointments/:appointmentId/reschedule", authenticateToken, async (req, res) => {
  try {
    await rescheduleAppointment(req, res)
  } catch (error) {
    console.error("Error in appointment reschedule route:", error)
    res.status(500).json({
      success: false,
      message: "Error rescheduling appointment",
      error: error.message,
    })
  }
})

// Confirm rescheduled appointment
router.put("/appointments/:appointmentId/confirm-reschedule", authenticateToken, async (req, res) => {
  try {
    await confirmRescheduledAppointment(req, res)
  } catch (error) {
    console.error("Error in appointment confirm reschedule route:", error)
    res.status(500).json({
      success: false,
      message: "Error confirming rescheduled appointment",
      error: error.message,
    })
  }
})

// Add the new route for responding to reschedule requests
router.put("/appointments/:appointmentId/respond-reschedule", authenticateToken, async (req, res) => {
  try {
    await respondToRescheduleRequest(req, res)
  } catch (error) {
    console.error("Error in respond to reschedule route:", error)
    res.status(500).json({
      success: false,
      message: "Error responding to reschedule request",
      error: error.message,
    })
  }
})

// Add this new route before the export default statement
// Get current appointment for doctor
router.get("/doctor/:doctorId/current-appointment", authenticateToken, async (req, res) => {
  try {
    await getCurrentAppointment(req, res)
  } catch (error) {
    console.error("Error in get current appointment route:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching current appointment",
      error: error.message,
    })
  }
})

export default router

