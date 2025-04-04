import mongoose from "mongoose"
import { Availability } from "./availabilityModel.js"

const appointmentSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "doctor_user",
      required: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "patient_user",
      required: true,
    },
    patientName: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    dateString: {
      type: String, // Store the raw date string to avoid timezone issues
      required: true,
    },
    timeSlot: {
      startTime: {
        type: String,
        required: true,
      },
      endTime: {
        type: String,
        required: true,
      },
    },
    type: {
      type: String,
      enum: ["regular", "follow-up", "emergency"],
      default: "regular",
    },
    consultationType: {
      type: String,
      enum: ["video", "inPerson"],
      required: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "cancelled",
        "completed",
        "no-show",
        "in-progress",
        "rejected",
        "pending_patient_confirmation",
      ],
      default: "pending",
    },
    symptoms: {
      type: String,
    },
    diagnosis: {
      type: String,
    },
    prescription: {
      type: String,
    },
    notes: {
      type: String,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "refunded"],
      default: "pending",
    },
    paymentAmount: {
      type: Number,
    },
    cancelledBy: {
      type: String,
      enum: ["doctor", "patient"],
    },
    cancelReason: {
      type: String,
    },
    startTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
    duration: {
      type: Number, // in minutes
      default: 30,
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: [
            "pending",
            "confirmed",
            "in-progress",
            "completed",
            "cancelled",
            "rejected",
            "no-show",
            "rescheduled",
            "pending_patient_confirmation",
          ],
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: "statusHistory.updatedByModel",
        },
        updatedByModel: {
          type: String,
          enum: ["doctor_user", "patient_user", "admin_user"],
        },
        notes: String,
      },
    ],
  },
  { timestamps: true },
)

// Add middleware to track status changes
appointmentSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
      updatedBy: this._update?.$set?.updatedBy,
      updatedByModel: this._update?.$set?.updatedByModel,
    })
  }
  next()
})

// Add method to get appointment duration
appointmentSchema.methods.getDuration = function () {
  if (this.startTime && this.endTime) {
    return Math.round((this.endTime - this.startTime) / (1000 * 60)) // Duration in minutes
  }
  return this.duration // Return default duration if actual duration not available
}

// Add indexes for better query performance
appointmentSchema.index({ doctorId: 1, date: 1 })
appointmentSchema.index({ patientId: 1, date: 1 })
appointmentSchema.index({ status: 1 })

// Pre-save middleware to update availability
appointmentSchema.pre("save", async function (next) {
  try {
    if (this.isModified("status")) {
      // Use the imported Availability model instead of trying to get it from mongoose
      const availability = await Availability.findOne({
        doctorId: this.doctorId,
        date: this.date,
      })

      if (availability) {
        const slot = availability.timeSlots.find((slot) => slot.startTime === this.timeSlot.startTime)

        if (slot) {
          // Update slot based on appointment status
          if (["confirmed", "in-progress", "pending_patient_confirmation"].includes(this.status)) {
            slot.isBooked = true
            slot.appointmentId = this._id
            slot.patientId = this.patientId
          } else if (["cancelled", "rejected", "completed", "no-show"].includes(this.status)) {
            slot.isBooked = false
            slot.appointmentId = null
            slot.patientId = null
          }
          await availability.save()
        }
      }
    }
    next()
  } catch (error) {
    next(error)
  }
})

// Pre-remove middleware to update availability
appointmentSchema.pre("remove", async function (next) {
  try {
    // Use the imported Availability model instead of trying to get it from mongoose
    const availability = await Availability.findOne({
      doctorId: this.doctorId,
      date: this.date,
    })

    if (availability) {
      const slot = availability.timeSlots.find((slot) => slot.startTime === this.timeSlot.startTime)

      if (slot) {
        slot.isBooked = false
        slot.appointmentId = null
        slot.patientId = null
        await availability.save()
      }
    }
    next()
  } catch (error) {
    next(error)
  }
})

export const Appointment = mongoose.model("appointment", appointmentSchema)

