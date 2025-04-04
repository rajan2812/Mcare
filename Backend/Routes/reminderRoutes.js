import express from "express"
import { authenticateToken, checkUserType } from "../middleware/authMiddleware.js"
import { checkAndSendAppointmentReminders } from "../services/reminderService.js"

const router = express.Router()

// Route to manually trigger reminder checks (admin only)
router.post("/check-reminders", authenticateToken, checkUserType(["admin"]), async (req, res) => {
  try {
    const remindersSent = await checkAndSendAppointmentReminders()
    res.status(200).json({
      success: true,
      message: `Checked for upcoming appointments and sent ${remindersSent} reminders`,
      remindersSent,
    })
  } catch (error) {
    console.error("Error in check-reminders route:", error)
    res.status(500).json({
      success: false,
      message: "Error checking reminders",
      error: error.message,
    })
  }
})

export default router

