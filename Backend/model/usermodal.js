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

const patientSchema = new mongoose.Schema({
  ...baseUserSchema,
  patientId: {
    type: String,
    unique: true,
    required: true,
    default: generatePatientId,
  },
  height: { type: Number },
  weight: { type: Number },
  bloodType: { type: String },
  emergencyContact: {
    name: { type: String },
    relationship: { type: String },
    phone: { type: String },
  },
  medicalHistory: [{ type: String }],
})

const doctorSchema = new mongoose.Schema({
  ...baseUserSchema,
  specialization: {
    type: String,
    required: function () {
      return this.isProfileCompleted
    },
  },
  licenseNumber: {
    type: String,
    required: function () {
      return this.isProfileCompleted
    },
    unique: true,
    sparse: true,
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
  specializations: [
    {
      type: String,
    },
  ],
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

