import express from "express"
import { authenticateToken } from "../middleware/authMiddleware.js"
import {
  setAvailability,
  getAvailability,
  getDoctorAvailabilities,
  setQuickBreak,
  endBreak,
} from "../controllers/availabilityController.js"

const router = express.Router()

// Update the route parameter to handle the date correctly
router.get("/availability/:doctorId/:date", authenticateToken, getAvailability)

// Get all availabilities for a doctor
router.get("/availabilities/:doctorId", authenticateToken, getDoctorAvailabilities)

// Set availability
router.post("/set-availability", authenticateToken, setAvailability)

// Quick break management
router.post("/break", authenticateToken, setQuickBreak)
router.post("/break/end", authenticateToken, endBreak)

export default router

