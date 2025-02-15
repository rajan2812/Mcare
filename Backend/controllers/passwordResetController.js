import { PatientUser, DoctorUser } from "../model/usermodal.js"
import crypto from "crypto"
import nodemailer from "nodemailer"
import bcrypt from "bcrypt"

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export const forgotPassword = async (req, res) => {
  const { email } = req.body

  try {
    // Find user in either Patient or Doctor collection
    const user = (await PatientUser.findOne({ email })) || (await DoctorUser.findOne({ email }))

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" })
    }

    // Generate reset token and expiry
    const resetToken = crypto.randomBytes(32).toString("hex")
    const resetTokenExpiry = Date.now() + 3600000 // 1 hour from now

    // Save token and expiry to user document
    user.resetPasswordToken = resetToken
    user.resetPasswordExpires = resetTokenExpiry
    await user.save()

    // Create reset URL
    const resetUrl = `http://localhost:3000/reset-password?token=${resetToken}`

    // Send email
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: user.email,
      subject: "Password Reset Request - Mcare",
      html: `
        <h1>Password Reset Request</h1>
        <p>You are receiving this because you (or someone else) have requested the reset of the password for your account.</p>
        <p>Please click on the following link to complete the process:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
      `,
    }

    await transporter.sendMail(mailOptions)

    res.status(200).json({
      success: true,
      message: "Password reset email sent successfully",
    })
  } catch (error) {
    console.error("Forgot password error:", error)
    res.status(500).json({
      success: false,
      message: "Error sending password reset email",
    })
  }
}

export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body

  try {
    // Find user with valid reset token and token not expired
    const user =
      (await PatientUser.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
      })) ||
      (await DoctorUser.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
      }))

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Password reset token is invalid or has expired",
      })
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(newPassword, salt)

    // Update user's password and clear reset token fields
    user.password = hashedPassword
    user.resetPasswordToken = undefined
    user.resetPasswordExpires = undefined
    await user.save()

    res.status(200).json({
      success: true,
      message: "Password has been reset successfully",
    })
  } catch (error) {
    console.error("Reset password error:", error)
    res.status(500).json({
      success: false,
      message: "Error resetting password",
    })
  }
}

