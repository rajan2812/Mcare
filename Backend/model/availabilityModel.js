import mongoose from "mongoose"

const timeSlotSchema = new mongoose.Schema({
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
  isBooked: {
    type: Boolean,
    default: false,
  },
  isBreak: {
    type: Boolean,
    default: false,
  },
  type: {
    type: String,
    enum: ["regular", "emergency"],
    default: "regular",
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PatientUser",
    default: null,
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Appointment",
    default: null,
  },
})

const breakSchema = new mongoose.Schema({
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["lunch", "quick", "other"],
    default: "quick",
  },
  recurring: {
    type: Boolean,
    default: false,
  },
})

const availabilitySchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "DoctorUser",
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  regularHours: {
    start: {
      type: String,
      required: true,
    },
    end: {
      type: String,
      required: true,
    },
  },
  emergencyHours: {
    start: String,
    end: String,
  },
  breaks: [breakSchema],
  timeSlots: [timeSlotSchema],
  timezone: {
    type: String,
    default: "UTC",
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
})

// Create a compound index for doctorId and date
availabilitySchema.index({ doctorId: 1, date: 1 }, { unique: true })

// Pre-save middleware to update lastUpdated
availabilitySchema.pre("save", function (next) {
  this.lastUpdated = new Date()

  // Ensure isAvailable is explicitly set
  if (this.isAvailable === undefined) {
    this.isAvailable = true
  }

  // Ensure regularHours is properly set
  if (!this.regularHours || !this.regularHours.start || !this.regularHours.end) {
    this.regularHours = {
      start: "09:00",
      end: "17:00",
    }
  }

  // Log the save operation for debugging
  console.log(`Saving availability for doctor ${this.doctorId} on ${this.date}, isAvailable: ${this.isAvailable}`)

  next()
})

// Add this method to help with debugging
availabilitySchema.methods.toJSON = function () {
  const obj = this.toObject()
  console.log(`Converting availability to JSON: ${obj._id}, isAvailable: ${obj.isAvailable}`)
  return obj
}

export const Availability = mongoose.model("Availability", availabilitySchema)

