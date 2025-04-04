import express from "express"
import { authenticateToken } from "../middleware/authMiddleware.js"
import { DoctorUser } from "../model/usermodal.js"

const router = express.Router()

// Get doctor profile
router.get("/profile/:id", authenticateToken, async (req, res) => {
  try {
    // Use select to explicitly include all fields we want to return
    const doctor = await DoctorUser.findById(req.params.id).select({
      firstName: 1,
      lastName: 1,
      email: 1,
      phone: 1,
      specializations: 1,
      qualifications: 1,
      experience: 1,
      licenseNumber: 1,
      about: 1,
      clinicAddress: 1,
      consultationFee: 1,
      languages: 1,
      isProfileCompleted: 1,
      verificationStatus: 1,
      avatarUrl: 1,
    })

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      })
    }

    // Log the data being sent
    console.log("Sending doctor profile data:", doctor)

    res.json({
      success: true,
      data: doctor,
    })
  } catch (error) {
    console.error("Error fetching doctor profile:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching doctor profile",
    })
  }
})

// Add this route to your existing doctorProfileRoutes.js
router.put("/update-profile", authenticateToken, async (req, res) => {
  try {
    const doctorId = req.user.id
    const updates = req.body

    const doctor = await DoctorUser.findById(doctorId)
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      })
    }

    // Update all fields including specializations
    Object.assign(doctor, updates)
    await doctor.save()

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: doctor._id,
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        email: doctor.email,
        specializations: doctor.specializations,
        qualifications: doctor.qualifications,
        experience: doctor.experience,
        consultationFee: doctor.consultationFee,
        languages: doctor.languages,
        phone: doctor.phone,
        address: doctor.address,
        about: doctor.about,
      },
    })
  } catch (error) {
    console.error("Error updating profile:", error)
    res.status(500).json({
      success: false,
      message: "Error updating profile",
      error: error.message,
    })
  }
})

export default router

