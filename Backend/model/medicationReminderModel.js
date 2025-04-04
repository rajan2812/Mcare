import mongoose from "mongoose"

const medicationReminderSchema = new mongoose.Schema(
  {
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
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
    },
    medicationName: {
      type: String,
      required: true,
    },
    dosage: {
      type: String,
      required: true,
    },
    frequency: {
      type: String,
      enum: ["once", "twice", "thrice", "four", "asNeeded"],
      default: "once",
    },
    scheduledTime: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number,
      default: 7, // Default duration in days
    },
    instructions: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "acknowledged", "missed"],
      default: "pending",
    },
    notificationSent: {
      type: Boolean,
      default: false,
    },
    acknowledgedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
)

export const MedicationReminder = mongoose.model("MedicationReminder", medicationReminderSchema)

