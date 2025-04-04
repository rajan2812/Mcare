import { Queue } from "../model/queueModel.js"
import { Appointment } from "../model/appointmentModel.js"
import { io } from "../server.js"

// Initialize or get queue for a doctor
export const initializeQueue = async (req, res) => {
  try {
    const { doctorId } = req.params
    const date = new Date(req.query.date || new Date())
    date.setHours(0, 0, 0, 0)

    console.log(`Initializing queue for doctor ${doctorId} on date ${date.toISOString()}`)

    let queue = await Queue.findOne({ doctorId, date })

    if (!queue) {
      console.log("No queue found, creating new queue")
      queue = new Queue({
        doctorId,
        date,
        entries: [],
      })
      await queue.save()
    }

    // Always sync with today's confirmed appointments
    await syncQueueWithAppointments(doctorId, date)

    // Fetch the updated queue
    queue = await Queue.findOne({ doctorId, date })

    // Calculate wait times
    if (queue) {
      queue.calculateWaitTimes()
      await queue.save()
    }

    res.status(200).json({
      success: true,
      data: queue,
    })
  } catch (error) {
    console.error("Error initializing queue:", error)
    res.status(500).json({
      success: false,
      message: "Error initializing queue",
      error: error.message,
    })
  }
}

// Helper function to sync queue with appointments
const syncQueueWithAppointments = async (doctorId, date) => {
  try {
    console.log(`Syncing queue with appointments for doctor ${doctorId} on date ${date.toISOString()}`)

    // Find or create queue for the date
    let queue = await Queue.findOne({ doctorId, date })
    if (!queue) {
      queue = new Queue({
        doctorId,
        date,
        entries: [],
      })
    }

    // Get all confirmed appointments for the day
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    console.log(`Searching for appointments between ${startOfDay.toISOString()} and ${endOfDay.toISOString()}`)

    const appointments = await Appointment.find({
      doctorId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ["confirmed", "in-progress"] },
    }).populate("patientId", "firstName lastName")

    console.log(`Found ${appointments.length} confirmed/in-progress appointments`)

    // Get existing appointment IDs in queue
    const existingAppointmentIds = queue.entries.map((entry) => entry.appointmentId.toString())

    // Add new appointments to queue
    let addedCount = 0
    for (const appointment of appointments) {
      if (!existingAppointmentIds.includes(appointment._id.toString()) && appointment.patientId) {
        console.log(`Adding appointment ${appointment._id} to queue`)

        queue.entries.push({
          appointmentId: appointment._id,
          patientId: appointment.patientId._id,
          patientName: `${appointment.patientId.firstName} ${appointment.patientId.lastName}`,
          scheduledTime: appointment.timeSlot.startTime,
          status: appointment.status === "in-progress" ? "in-progress" : "waiting",
          priority: appointment.isEmergency ? 1 : 0,
          consultationType: appointment.consultationType,
          notes: appointment.symptoms,
        })
        addedCount++
      }
    }

    console.log(`Added ${addedCount} new appointments to queue`)

    // Save the updated queue
    await queue.save()
    return queue
  } catch (error) {
    console.error("Error syncing queue with appointments:", error)
    throw error
  }
}

// Update queue entry status
export const updateQueueStatus = async (req, res) => {
  try {
    const { doctorId, appointmentId } = req.params
    const { status, additionalData } = req.body

    const date = new Date()
    date.setHours(0, 0, 0, 0)

    const queue = await Queue.findOne({ doctorId, date })

    if (!queue) {
      return res.status(404).json({
        success: false,
        message: "Queue not found",
      })
    }

    const updatedEntry = queue.updateEntryStatus(appointmentId, status, additionalData)
    if (!updatedEntry) {
      return res.status(404).json({
        success: false,
        message: "Queue entry not found",
      })
    }

    // Recalculate wait times
    queue.calculateWaitTimes()
    await queue.save()

    // Update appointment status
    const updatedAppointment = await Appointment.findByIdAndUpdate(appointmentId, { status }, { new: true }).populate(
      "patientId",
      "firstName lastName email profileImage",
    )

    // Emit detailed socket events
    io.emit("queueUpdated", {
      doctorId,
      date: date.toISOString(),
      queue: queue.toObject(),
      updatedEntry,
    })

    // Also emit appointment status update for LiveAppointmentStatus
    if (updatedAppointment) {
      io.emit("appointmentStatusUpdate", {
        appointmentId,
        status,
        doctorId,
        patientId: updatedAppointment.patientId?._id,
        updatedEntry,
        appointment: updatedAppointment,
      })
    }

    res.status(200).json({
      success: true,
      data: queue,
    })
  } catch (error) {
    console.error("Error updating queue status:", error)
    res.status(500).json({
      success: false,
      message: "Error updating queue status",
      error: error.message,
    })
  }
}

// Get queue status
export const getQueueStatus = async (req, res) => {
  try {
    const { doctorId } = req.params
    const date = new Date(req.query.date || new Date())
    date.setHours(0, 0, 0, 0)

    console.log(`Getting queue status for doctor ${doctorId} on date ${date.toISOString()}`)

    // First ensure the queue is synced with today's appointments
    await syncQueueWithAppointments(doctorId, date)

    // Then fetch the updated queue
    const queue = await Queue.findOne({ doctorId, date })

    if (!queue) {
      return res.status(404).json({
        success: false,
        message: "Queue not found",
      })
    }

    // Find the current in-progress appointment
    const currentEntry = queue.entries.find((entry) => entry.status === "in-progress") || null

    // Return the queue with the current entry
    const queueData = {
      ...queue.toObject(),
      currentEntry,
    }

    res.status(200).json({
      success: true,
      data: queueData,
    })
  } catch (error) {
    console.error("Error getting queue status:", error)
    res.status(500).json({
      success: false,
      message: "Error getting queue status",
      error: error.message,
    })
  }
}

// Update queue delay
export const updateQueueDelay = async (req, res) => {
  try {
    const { doctorId } = req.params
    const { delay } = req.body

    const date = new Date()
    date.setHours(0, 0, 0, 0)

    const queue = await Queue.findOne({ doctorId, date })

    if (!queue) {
      return res.status(404).json({
        success: false,
        message: "Queue not found",
      })
    }

    queue.currentDelay = delay
    queue.calculateWaitTimes()
    await queue.save()

    // Emit socket event
    io.emit("queueDelayUpdated", {
      doctorId,
      date: date.toISOString(),
      currentDelay: delay,
      queue: queue.toObject(),
    })

    res.status(200).json({
      success: true,
      data: queue,
    })
  } catch (error) {
    console.error("Error updating queue delay:", error)
    res.status(500).json({
      success: false,
      message: "Error updating queue delay",
      error: error.message,
    })
  }
}

// Sync confirmed appointments with queue
export const syncAppointmentsWithQueue = async (req, res) => {
  try {
    const { doctorId } = req.params
    const date = new Date()
    date.setHours(0, 0, 0, 0)

    console.log(`Manually syncing appointments with queue for doctor ${doctorId}`)

    // Use the helper function to sync
    const queue = await syncQueueWithAppointments(doctorId, date)

    res.status(200).json({
      success: true,
      message: "Appointments synced with queue successfully",
      data: queue,
    })
  } catch (error) {
    console.error("Error syncing appointments with queue:", error)
    res.status(500).json({
      success: false,
      message: "Error syncing appointments with queue",
      error: error.message,
    })
  }
}

