import mongoose from "mongoose"
import bcrypt from "bcrypt"

// Function to generate a unique patient ID
function generatePatientId() {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0")
  return `MCR-${year}-${random}`
}

const baseUserSchema = {
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"],
  },
  password: {
    type: String,
    required: true,
    minlength: [6, "Password must be at least 6 characters long"],
  },
  dateOfBirth: {
    type: Date,
  },
  gender: {
    type: String,
    enum: ["male", "female", "other", "prefer_not_to_say"],
  },
  phone: {
    type: String,
    match: [/^[0-9]{10}$/, "Please enter a valid 10-digit phone number"],
  },
  address: {
    type: String,
  },
  avatarUrl: {
    type: String,
    default: "/placeholder.svg",
  },
  isProfileCompleted: {
    type: Boolean,
    default: false,
  },
}

const LICENSE_FORMATS = {
  NMC: /^NMC-\d{4}-\d{6}$/,
  SMC_NEW: /^[A-Z]{2,4}\/\d{6}\/\d{4}$/,
  SMC_OLD: /^[A-Z]{2,4}\/R\/\d{5}$/,
}

const validateLicenseNumber = (licenseNumber) => {
  if (!licenseNumber) return false

  // Check if the license number matches any of the allowed formats
  return Object.values(LICENSE_FORMATS).some((format) => format.test(licenseNumber))
}

const doctorSchema = new mongoose.Schema({
  ...baseUserSchema,
  specializations: [
    {
      type: String,
      required: true,
    },
  ],
  licenseNumber: {
    type: String,
    unique: true,
    sparse: true,
    required: function () {
      return this.isProfileCompleted
    },
    validate: {
      validator: validateLicenseNumber,
      message: (props) =>
        "Invalid license number format. Please use one of the following formats:\n" +
        "- NMC Format: NMC-YYYY-XXXXXX (e.g., NMC-2023-567890)\n" +
        "- SMC Format: XXX/XXXXXX/YYYY (e.g., MMC/123456/2022)\n" +
        "- Old SMC Format: XXX/R/XXXXX (e.g., DMC/R/09876)",
    },
  },
  qualifications: {
    type: String,
  },
  experience: {
    type: String,
  },
  about: {
    type: String,
  },
  clinicAddress: {
    street: {
      type: String,
      required: function () {
        return this.isProfileCompleted
      },
    },
    city: {
      type: String,
      required: function () {
        return this.isProfileCompleted
      },
    },
    state: {
      type: String,
      required: function () {
        return this.isProfileCompleted
      },
    },
    pincode: {
      type: String,
      required: function () {
        return this.isProfileCompleted
      },
      match: [/^[0-9]{6}$/, "Please enter a valid 6-digit pincode"],
    },
  },
  consultationFee: {
    type: Number,
  },
  availability: {
    type: Map,
    of: [
      {
        start: String,
        end: String,
      },
    ],
  },
  documents: [
    {
      filename: { type: String, required: true },
      originalName: { type: String, required: true },
      path: { type: String, required: true },
      type: { type: String, required: true },
      documentType: {
        type: String,
        required: true,
        enum: ["degreeCertificate", "medicalRegistration", "practiceProof"],
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  requiredDocuments: {
    degreeCertificate: { type: Boolean, default: false },
    medicalRegistration: { type: Boolean, default: false },
    practiceProof: { type: Boolean, default: false },
  },
  verificationStatus: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  verificationRemarks: String,
  verifiedAt: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "admin_user",
    required: false,
  },
  isProfileCompleted: {
    type: Boolean,
    default: false,
  },
  adminReviewRequired: {
    type: Boolean,
    default: false,
  },
  workingHours: {
    start: {
      type: String,
      default: "09:00",
    },
    end: {
      type: String,
      default: "17:00",
    },
  },
  lastAvailabilityUpdate: {
    type: Date,
  },
})

// Add a pre-save middleware to validate working hours
doctorSchema.pre("save", function (next) {
  if (this.isModified("workingHours")) {
    const { start, end } = this.workingHours
    const startTime = new Date(`2000-01-01T${start}`)
    const endTime = new Date(`2000-01-01T${end}`)

    if (startTime >= endTime) {
      next(new Error("End time must be after start time"))
    }
  }
  next()
})

// Add method to get availability for a date range
doctorSchema.methods.getAvailabilityForDateRange = async function (startDate, endDate) {
  return await mongoose.model("Availability").find({
    doctorId: this._id,
    date: {
      $gte: startDate,
      $lte: endDate,
    },
  })
}

const patientSchema = new mongoose.Schema({
  ...baseUserSchema,
  patientId: {
    type: String,
    unique: true,
  },
  medicalHistory: {
    type: String,
  },
  allergies: {
    type: String,
  },
})

// Add pre-save middleware to check for unique license number
doctorSchema.pre("save", async function (next) {
  if (this.isModified("licenseNumber")) {
    // First validate format
    if (!validateLicenseNumber(this.licenseNumber)) {
      throw new Error("Invalid license number format")
    }

    // Then check for uniqueness
    const existingDoctor = await this.constructor.findOne({
      licenseNumber: this.licenseNumber,
      _id: { $ne: this._id },
    })

    if (existingDoctor) {
      throw new Error("License number already exists")
    }
  }
  next()
})

// Add pre-save middleware to log clinic address data
doctorSchema.pre("save", async function (next) {
  if (this.isModified("clinicAddress")) {
    console.log("Saving clinic address:", this.clinicAddress)
  }
  next()
})

// Add timestamps
patientSchema.set("timestamps", true)
doctorSchema.set("timestamps", true)

// Add indexes
patientSchema.index({ email: 1 })
patientSchema.index({ patientId: 1 })
doctorSchema.index({ email: 1 })
doctorSchema.index({ licenseNumber: 1 })

// Add methods to compare passwords
patientSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

doctorSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

// Pre-save middleware to ensure patientId is set
patientSchema.pre("save", async function (next) {
  if (this.isNew && !this.patientId) {
    let isUnique = false
    let newPatientId

    while (!isUnique) {
      newPatientId = generatePatientId()
      const existingPatient = await this.constructor.findOne({ patientId: newPatientId })
      if (!existingPatient) {
        isUnique = true
      }
    }

    this.patientId = newPatientId
  }
  next()
})

export const PatientUser = mongoose.model("patient_user", patientSchema)
export const DoctorUser = mongoose.model("doctor_user", doctorSchema)

