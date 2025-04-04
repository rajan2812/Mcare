import express from "express"
import { getVerifiedDoctors } from "../controllers/doctorController.js"
import { authenticateToken } from "../middleware/authMiddleware.js"
import { Appointment } from "../model/appointmentModel.js"

const router = express.Router()

// Add authentication middleware to protect the route
router.get("/verified-doctors", authenticateToken, async (req, res) => {
  try {
    // Log the request for debugging
    console.log("Received request for verified doctors")
    console.log("Query params:", req.query)
    console.log("Auth token:", req.headers.authorization)

    await getVerifiedDoctors(req, res)
  } catch (error) {
    console.error("Error in verified doctors route:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch doctors",
      error: error.message,
    })
  }
})

// Add appointment booking route
router.post("/appointments/book", authenticateToken, async (req, res) => {
  try {
    const { doctorId, patientId, date, timeSlot, type, consultationType, symptoms } = req.body

    // Validate required fields
    if (!doctorId || !patientId || !date || !timeSlot || !consultationType) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      })
    }

    // Create appointment
    const appointment = new Appointment({
      doctorId,
      patientId,
      date,
      time: timeSlot.startTime,
      type,
      consultationType,
      symptoms,
      status: "pending",
    })

    await appointment.save()

    res.status(201).json({
      success: true,
      message: "Appointment request submitted successfully",
      appointmentId: appointment._id,
    })
  } catch (error) {
    console.error("Error booking appointment:", error)
    res.status(500).json({
      success: false,
      message: "Error booking appointment",
      error: error.message,
    })
  }
})

export default router

