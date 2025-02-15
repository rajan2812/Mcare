import { PatientUser } from "../model/usermodal.js"

export const getPatientDashboardData = async (req, res) => {
  try {
    const userId = req.user.id // Assuming the user ID is set in the request by the auth middleware

    // Find patient data
    const patient = await PatientUser.findById(userId).select("-password")

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      })
    }

    // Return patient data
    res.status(200).json({
      success: true,
      data: {
        id: patient._id,
        patientId: patient.patientId,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        phone: patient.phone,
        address: patient.address,
        height: patient.height,
        weight: patient.weight,
        bloodType: patient.bloodType,
        emergencyContact: patient.emergencyContact,
        avatarUrl: patient.avatarUrl,
      },
    })
  } catch (error) {
    console.error("Error fetching patient dashboard data:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard data",
      error: error.message,
    })
  }
}

