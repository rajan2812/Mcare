import express from "express"
import { forgotPassword, resetPassword } from "../controllers/passwordResetController.js"

const passwordResetRouter = express.Router()

// Route for initiating password reset
passwordResetRouter.post("/forgot-password", forgotPassword)

// Route for resetting password with token
passwordResetRouter.post("/reset-password", resetPassword)

export default passwordResetRouter

