import express from "express"
import { authenticateToken } from "../middleware/authMiddleware.js"
import {
  getPatientReminders,
  updateReminderStatus,
  createMedicationReminders,
} from "../controllers/medicationReminderController.js"

const router = express.Router()

// Create medication reminders
router.post("/medication-reminders", authenticateToken, async (req, res) => {
  try {
    await createMedicationReminders(req, res)
  } catch (error) {
    console.error("Error in create medication reminders route:", error)
    res.status(500).json({
      success: false,
      message: "Error creating medication reminders",
      error: error.message,
    })
  }
})

// Get upcoming reminders for a patient
router.get("/patient/reminders", authenticateToken, async (req, res) => {
  try {
    await getPatientReminders(req, res)
  } catch (error) {
    console.error("Error in get patient reminders route:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching reminders",
      error: error.message,
    })
  }
})

// Update reminder status (acknowledge or dismiss)
router.put("/reminders/:reminderId/status", authenticateToken, async (req, res) => {
  try {
    await updateReminderStatus(req, res)
  } catch (error) {
    console.error("Error in update reminder status route:", error)
    res.status(500).json({
      success: false,
      message: "Error updating reminder status",
      error: error.message,
    })
  }
})

export default router

