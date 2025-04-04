import mongoose from "mongoose"

const queueEntrySchema = new mongoose.Schema({
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
  patientName: {
    type: String,
    required: true,
  },
  scheduledTime: {
    type: String,
    required: true,
  },
  estimatedWaitTime: {
    type: Number, // in minutes
    default: 0,
  },
  status: {
    type: String,
    enum: ["waiting", "in-progress", "completed", "cancelled", "no-show"],
    default: "waiting",
  },
  checkInTime: {
    type: Date,
  },
  startTime: {
    type: Date,
  },
  endTime: {
    type: Date,
  },
  priority: {
    type: Number,
    default: 0, // Higher number means higher priority
  },
  notes: String,
  consultationType: String,
})

const queueSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "doctor_user",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    currentDelay: {
      type: Number,
      default: 0, // Delay in minutes
    },
    entries: [queueEntrySchema],
    averageConsultationTime: {
      type: Number,
      default: 15, // Average time in minutes per patient
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
)

// Add indexes for better query performance
queueSchema.index({ doctorId: 1, date: 1 }, { unique: true })

// Update the addToQueue method to handle consultationType
queueSchema.methods.addToQueue = function (entryData) {
  // Check if entry with this appointmentId already exists
  const existingEntryIndex = this.entries.findIndex(
    (entry) => entry.appointmentId.toString() === entryData.appointmentId.toString(),
  )

  if (existingEntryIndex !== -1) {
    // Update existing entry
    this.entries[existingEntryIndex] = {
      ...this.entries[existingEntryIndex],
      ...entryData,
      lastUpdated: new Date(),
    }
  } else {
    // Add new entry
    this.entries.push({
      ...entryData,
      status: entryData.status || "waiting",
      waitTime: 0,
      arrivalTime: entryData.arrivalTime || new Date(),
      lastUpdated: new Date(),
      consultationType: entryData.consultationType || "in-person",
    })
  }

  // Sort entries by priority (high to low) and then by scheduledTime
  this.entries.sort((a, b) => {
    if (a.status === "in-progress") return -1
    if (b.status === "in-progress") return 1

    if (a.priority !== b.priority) return b.priority - a.priority

    return new Date(`2000-01-01T${a.scheduledTime}`) - new Date(`2000-01-01T${b.scheduledTime}`)
  })

  return this.entries[this.entries.length - 1]
}

// Method to update queue entry status
queueSchema.methods.updateEntryStatus = function (appointmentId, status, additionalData = {}) {
  const entry = this.entries.find((e) => e.appointmentId.toString() === appointmentId.toString())
  if (!entry) return null

  entry.status = status
  Object.assign(entry, additionalData)

  if (status === "in-progress") {
    entry.startTime = new Date()
  } else if (status === "completed") {
    entry.endTime = new Date()
    // Update average consultation time
    if (entry.startTime) {
      const consultationTime = Math.round((entry.endTime - entry.startTime) / (1000 * 60)) // in minutes
      this.averageConsultationTime = Math.round((this.averageConsultationTime + consultationTime) / 2)
    }
  }

  this.lastUpdated = new Date()
  return entry
}

// Method to calculate estimated wait times
queueSchema.methods.calculateWaitTimes = function () {
  const waitingEntries = this.entries.filter((entry) => entry.status === "waiting")
  let cumulativeWaitTime = 0

  waitingEntries.forEach((entry, index) => {
    entry.estimatedWaitTime = cumulativeWaitTime
    cumulativeWaitTime += this.averageConsultationTime
  })

  this.lastUpdated = new Date()
  return waitingEntries
}

// Method to get current queue status
queueSchema.methods.getQueueStatus = function () {
  // Find the current in-progress appointment
  const currentEntry = this.entries.find((entry) => entry.status === "in-progress") || null

  return {
    _id: this._id,
    doctorId: this.doctorId,
    date: this.date,
    entries: this.entries,
    currentDelay: this.currentDelay,
    averageConsultationTime: this.averageConsultationTime,
    currentEntry,
  }
}

// Pre-save middleware to sort entries by priority and scheduled time
queueSchema.pre("save", function (next) {
  this.entries.sort((a, b) => {
    if (a.status === "in-progress") return -1
    if (b.status === "in-progress") return 1

    if (a.priority !== b.priority) {
      return b.priority - a.priority // Higher priority first
    }
    return a.scheduledTime.localeCompare(b.scheduledTime) // Earlier time first
  })
  next()
})

export const Queue = mongoose.model("queue", queueSchema)

