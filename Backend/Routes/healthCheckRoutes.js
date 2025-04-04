import express from "express"

const router = express.Router()

// Simple health check endpoint
router.get("/health-check", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  })
})

export default router

