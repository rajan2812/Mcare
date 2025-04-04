import multer from "multer"
import path from "path"
import fs from "fs"
import { DoctorUser } from "../model/usermodal.js"

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads/doctor-documents")
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname))
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"]
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error("Invalid file type. Only PDF, JPG and PNG files are allowed."))
    }
  },
}).array("documents", 5) // Allow up to 5 documents

export const completeProfile = async (req, res) => {
  try {
    upload(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({
          success: false,
          message: "File upload error",
          error: err.message,
        })
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        })
      }

      try {
        const userId = req.user.id
        const profileData = JSON.parse(req.body.profile)
        const documentTypes = req.body.documentTypes ? JSON.parse(req.body.documentTypes) : []

        // Find the doctor
        const doctor = await DoctorUser.findById(userId)
        if (!doctor) {
          return res.status(404).json({
            success: false,
            message: "Doctor not found",
          })
        }

        // Validate license number format
        const LICENSE_FORMATS = {
          NMC: /^NMC-\d{4}-\d{6}$/,
          SMC_NEW: /^[A-Z]{2,4}\/\d{6}\/\d{4}$/,
          SMC_OLD: /^[A-Z]{2,4}\/R\/\d{5}$/,
        }

        const isValidFormat = Object.values(LICENSE_FORMATS).some((format) => format.test(profileData.licenseNumber))

        if (!isValidFormat) {
          return res.status(400).json({
            success: false,
            message: "Invalid license number format. Please use the correct format.",
          })
        }

        // Check for unique license number
        const existingDoctor = await DoctorUser.findOne({
          licenseNumber: profileData.licenseNumber,
          _id: { $ne: userId },
        })

        if (existingDoctor) {
          return res.status(400).json({
            success: false,
            message: "This license number is already registered with another doctor.",
          })
        }

        // Update doctor profile with explicit clinic address handling
        console.log("Received clinic address data:", profileData.clinicAddress)
        doctor.specializations = profileData.specializations
        doctor.qualifications = profileData.qualifications
        doctor.experience = profileData.experience
        doctor.licenseNumber = profileData.licenseNumber
        doctor.about = profileData.about
        console.log("Updating doctor clinic address with:", {
          street: profileData.clinicAddress.street,
          city: profileData.clinicAddress.city,
          state: profileData.clinicAddress.state,
          pincode: profileData.clinicAddress.pincode,
        })
        doctor.clinicAddress = {
          street: profileData.clinicAddress.street,
          city: profileData.clinicAddress.city,
          state: profileData.clinicAddress.state,
          pincode: profileData.clinicAddress.pincode,
        }

        // Reset required documents tracking
        doctor.requiredDocuments = {
          degreeCertificate: false,
          medicalRegistration: false,
          practiceProof: false,
        }

        // Process uploaded documents
        if (req.files && req.files.length > 0) {
          const newDocuments = req.files.map((file, index) => ({
            filename: file.filename,
            originalName: file.originalname,
            path: file.path,
            type: file.mimetype,
            documentType: documentTypes[index],
            uploadedAt: new Date(),
          }))

          // Update or add new documents
          doctor.documents = doctor.documents || []
          newDocuments.forEach((newDoc) => {
            const existingIndex = doctor.documents.findIndex((doc) => doc.documentType === newDoc.documentType)
            if (existingIndex >= 0) {
              doctor.documents[existingIndex] = newDoc
            } else {
              doctor.documents.push(newDoc)
            }
            doctor.requiredDocuments[newDoc.documentType] = true
          })
        }

        // Check if all required documents are provided
        const missingDocuments = []
        if (!doctor.requiredDocuments.degreeCertificate) {
          missingDocuments.push("Degree Certificate")
        }
        if (!doctor.requiredDocuments.medicalRegistration) {
          missingDocuments.push("Medical Registration Certificate")
        }
        if (!doctor.requiredDocuments.practiceProof) {
          missingDocuments.push("Hospital Affiliation or Practice Proof")
        }

        if (missingDocuments.length > 0) {
          return res.status(400).json({
            success: false,
            message: `Please provide the following required documents: ${missingDocuments.join(", ")}`,
          })
        }

        // Set profile as completed if all required fields and documents are present
        doctor.isProfileCompleted = true
        doctor.verificationStatus = "pending"

        await doctor.save()
        console.log("Saved doctor data:", doctor.toObject())

        res.status(200).json({
          success: true,
          message: "Profile completed successfully. Awaiting admin verification.",
          user: {
            id: doctor._id,
            email: doctor.email,
            firstName: doctor.firstName,
            lastName: doctor.lastName,
            verificationStatus: doctor.verificationStatus,
            isProfileCompleted: doctor.isProfileCompleted,
          },
        })
      } catch (error) {
        console.error("Profile completion error:", error)
        res.status(500).json({
          success: false,
          message: error.message || "Error completing profile",
        })
      }
    })
  } catch (error) {
    console.error("Profile completion error:", error)
    res.status(500).json({
      success: false,
      message: "Error completing profile",
      error: error.message,
    })
  }
}

export const getDoctorProfile = async (req, res) => {
  try {
    const doctorId = req.params.id
    // Use select to explicitly include all fields
    const doctor = await DoctorUser.findById(doctorId).select({
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
    console.log("Sending doctor profile data:", doctor.toObject())

    res.status(200).json({
      success: true,
      data: doctor,
    })
  } catch (error) {
    console.error("Error fetching doctor profile:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching doctor profile",
      error: error.message,
    })
  }
}

export const updateVerificationStatus = async (req, res) => {
  try {
    const { doctorId, status, remarks } = req.body
    console.log("Updating verification status:", { doctorId, status, remarks })

    if (!doctorId || !status) {
      return res.status(400).json({
        success: false,
        message: "Doctor ID and status are required",
      })
    }

    const doctor = await DoctorUser.findById(doctorId)

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      })
    }

    doctor.verificationStatus = status
    doctor.verificationRemarks = remarks
    doctor.verifiedAt = new Date()
    await doctor.save()

    // Send the complete updated user data
    const updatedUserData = {
      id: doctor._id,
      email: doctor.email,
      firstName: doctor.firstName,
      lastName: doctor.lastName,
      userType: "doctor",
      isProfileCompleted: doctor.isProfileCompleted,
      verificationStatus: doctor.verificationStatus,
      verificationRemarks: doctor.verificationRemarks,
      verifiedAt: doctor.verifiedAt,
    }

    res.status(200).json({
      success: true,
      message: "Verification status updated successfully",
      user: updatedUserData,
    })
  } catch (error) {
    console.error("Error updating verification status:", error)
    res.status(500).json({
      success: false,
      message: "Error updating verification status",
      error: error.message,
    })
  }
}

export const getPendingVerifications = async (req, res) => {
  try {
    const pendingDoctors = await DoctorUser.find({
      verificationStatus: "pending",
      isProfileCompleted: true,
    }).select("firstName lastName email specializations licenseNumber documents")

    res.status(200).json({
      success: true,
      data: pendingDoctors,
    })
  } catch (error) {
    console.error("Error fetching pending verifications:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching pending verifications",
      error: error.message,
    })
  }
}

export const getDocument = async (req, res) => {
  try {
    const { doctorId, filename } = req.params
    const doctor = await DoctorUser.findById(doctorId)

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      })
    }

    const document = doctor.documents.find((doc) => doc.filename === filename)

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      })
    }

    res.sendFile(path.resolve(document.path))
  } catch (error) {
    console.error("Error fetching document:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching document",
      error: error.message,
    })
  }
}

