import mongoose from "mongoose"

const medicationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  dosage: {
    type: String,
    required: true,
    trim: true,
  },
  frequency: {
    type: String,
    required: true,
    trim: true,
  },
  duration: {
    type: String,
    required: true,
    trim: true,
  },
  instructions: {
    type: String,
    trim: true,
  },
  reminderEnabled: {
    type: Boolean,
    default: false,
  },
  reminderFrequency: {
    type: String,
    enum: ["daily", "twice_daily", "thrice_daily", "once_weekly", "custom"],
    default: "daily",
  },
  reminderTimes: [
    {
      type: String,
    },
  ],
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
  },
})

const prescriptionSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "appointment",
      required: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "patient_user",
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "doctor_user",
      required: true,
    },
    diagnosis: {
      type: String,
      required: true,
      trim: true,
    },
    medications: [medicationSchema],
    additionalNotes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
)

// Add indexes for better query performance
prescriptionSchema.index({ patientId: 1, createdAt: -1 })
prescriptionSchema.index({ doctorId: 1, createdAt: -1 })
prescriptionSchema.index({ appointmentId: 1 })

export const Prescription = mongoose.model("prescription", prescriptionSchema)

