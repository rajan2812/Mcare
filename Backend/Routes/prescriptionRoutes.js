import express from "express"
import { authenticateToken } from "../middleware/authMiddleware.js"
import {
  createPrescription,
  getPatientPrescriptions,
  getDoctorPrescriptions,
  getPrescriptionById,
  updatePrescription,
} from "../controllers/prescriptionController.js"

const router = express.Router()

// Create a new prescription
router.post("/prescriptions", authenticateToken, async (req, res) => {
  try {
    await createPrescription(req, res)
  } catch (error) {
    console.error("Error in create prescription route:", error)
    res.status(500).json({
      success: false,
      message: "Error creating prescription",
      error: error.message,
    })
  }
})

// Get prescriptions for a patient
router.get("/patients/:patientId/prescriptions", authenticateToken, async (req, res) => {
  try {
    // Add authorization check to ensure patients can only access their own prescriptions
    if (req.user.role === "patient" && req.user.id !== req.params.patientId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You can only view your own prescriptions",
      })
    }

    await getPatientPrescriptions(req, res)
  } catch (error) {
    console.error("Error in get patient prescriptions route:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching prescriptions",
      error: error.message,
    })
  }
})

// Get prescriptions created by a doctor
router.get("/doctor/prescriptions", authenticateToken, async (req, res) => {
  try {
    await getDoctorPrescriptions(req, res)
  } catch (error) {
    console.error("Error in get doctor prescriptions route:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching prescriptions",
      error: error.message,
    })
  }
})

// Get a specific prescription by ID
router.get("/prescriptions/:prescriptionId", authenticateToken, async (req, res) => {
  try {
    await getPrescriptionById(req, res)
  } catch (error) {
    console.error("Error in get prescription route:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching prescription",
      error: error.message,
    })
  }
})

// Update a prescription
router.put("/prescriptions/:prescriptionId", authenticateToken, async (req, res) => {
  try {
    await updatePrescription(req, res)
  } catch (error) {
    console.error("Error in update prescription route:", error)
    res.status(500).json({
      success: false,
      message: "Error updating prescription",
      error: error.message,
    })
  }
})

export default router

