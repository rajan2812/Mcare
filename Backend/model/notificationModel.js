import mongoose from "mongoose"

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: "recipientModel",
  },
  recipientModel: {
    type: String,
    required: true,
    enum: ["patient_user", "doctor_user", "admin_user"],
  },
  type: {
    type: String,
    required: true,
    enum: ["APPOINTMENT", "SYSTEM", "REMINDER", "PAYMENT", "MESSAGE"],
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    default: "unread",
    enum: ["read", "unread"],
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

// Add index for faster queries
notificationSchema.index({ recipient: 1, status: 1, createdAt: -1 })

export const Notification = mongoose.model("Notification", notificationSchema)

