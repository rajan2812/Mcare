import express from "express"
import { authenticateToken } from "../middleware/authMiddleware.js"
import {
  initializeQueue,
  updateQueueStatus,
  getQueueStatus,
  updateQueueDelay,
  syncAppointmentsWithQueue,
} from "../controllers/queueController.js"

const router = express.Router()

// Protected routes
router.post("/initialize/:doctorId", authenticateToken, initializeQueue)
router.put("/status/:doctorId/:appointmentId", authenticateToken, updateQueueStatus)
router.get("/status/:doctorId", authenticateToken, getQueueStatus)
router.put("/delay/:doctorId", authenticateToken, updateQueueDelay)
router.post("/sync-appointments/:doctorId", authenticateToken, syncAppointmentsWithQueue)

export default router

