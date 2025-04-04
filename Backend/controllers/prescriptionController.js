import { Prescription } from "../model/prescriptionModel.js"
import { MedicationReminder } from "../model/medicationReminderModel.js"
import { Notification } from "../model/notificationModel.js"
import { io } from "../server.js"
import nodemailer from "nodemailer"

// Create a nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

// Create a new prescription
export const createPrescription = async (req, res) => {
  try {
    const { appointmentId, patientId, diagnosis, medications, additionalNotes } = req.body
    const doctorId = req.user.id

    // Validate required fields
    if (!appointmentId || !patientId || !diagnosis || !medications || !medications.length) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      })
    }

    // Create the prescription
    const prescription = new Prescription({
      appointmentId,
      patientId,
      doctorId,
      diagnosis,
      medications,
      additionalNotes,
    })

    await prescription.save()

    // Create medication reminders if enabled
    const reminders = []
    for (const medication of medications) {
      if (medication.reminderEnabled && medication.reminderTimes && medication.reminderTimes.length > 0) {
        // Calculate reminder dates based on frequency and duration
        const startDate = medication.startDate || new Date()
        const endDate = medication.endDate || calculateEndDate(startDate, medication.duration)

        // Generate reminder schedule
        const reminderSchedule = generateReminderSchedule(
          startDate,
          endDate,
          medication.reminderFrequency,
          medication.reminderTimes,
        )

        // Create reminder documents
        for (const scheduledTime of reminderSchedule) {
          const reminder = new MedicationReminder({
            prescriptionId: prescription._id,
            patientId,
            medicationName: medication.name,
            dosage: medication.dosage,
            scheduledTime,
            instructions: medication.instructions,
            notificationMethod: "all", // Default to all notification methods
          })

          await reminder.save()
          reminders.push(reminder)
        }
      }
    }

    // Create notification for patient
    const notification = await Notification.create({
      recipient: patientId,
      recipientModel: "patient_user",
      type: "SYSTEM",
      title: "New Prescription",
      message: "Your doctor has prescribed new medications for you",
      metadata: {
        prescriptionId: prescription._id,
        doctorId,
      },
    })

    // Emit socket event for real-time notification
    io.to(`patient-${patientId}`).emit("newNotification", notification)
    io.to(`patient-${patientId}`).emit("newPrescription", {
      prescriptionId: prescription._id,
      diagnosis,
      medicationsCount: medications.length,
    })

    res.status(201).json({
      success: true,
      data: {
        prescription,
        reminders,
      },
      message: "Prescription created successfully",
    })
  } catch (error) {
    console.error("Error creating prescription:", error)
    res.status(500).json({
      success: false,
      message: "Error creating prescription",
      error: error.message,
    })
  }
}

// Get prescriptions for a patient
export const getPatientPrescriptions = async (req, res) => {
  try {
    const { patientId } = req.params
    const { limit = 10, page = 1 } = req.query

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    const prescriptions = await Prescription.find({ patientId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit))
      .populate("doctorId", "firstName lastName specializations")

    const total = await Prescription.countDocuments({ patientId })

    res.status(200).json({
      success: true,
      data: {
        prescriptions,
        pagination: {
          total,
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          pages: Math.ceil(total / Number.parseInt(limit)),
        },
      },
    })
  } catch (error) {
    console.error("Error fetching patient prescriptions:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching prescriptions",
      error: error.message,
    })
  }
}

// Get prescriptions created by a doctor
export const getDoctorPrescriptions = async (req, res) => {
  try {
    const doctorId = req.user.id
    const { limit = 10, page = 1 } = req.query

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    const prescriptions = await Prescription.find({ doctorId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit))
      .populate("patientId", "firstName lastName patientId")

    const total = await Prescription.countDocuments({ doctorId })

    res.status(200).json({
      success: true,
      data: {
        prescriptions,
        pagination: {
          total,
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          pages: Math.ceil(total / Number.parseInt(limit)),
        },
      },
    })
  } catch (error) {
    console.error("Error fetching doctor prescriptions:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching prescriptions",
      error: error.message,
    })
  }
}

// Get a specific prescription by ID
export const getPrescriptionById = async (req, res) => {
  try {
    const { prescriptionId } = req.params

    const prescription = await Prescription.findById(prescriptionId)
      .populate("doctorId", "firstName lastName specializations")
      .populate("patientId", "firstName lastName patientId")

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found",
      })
    }

    res.status(200).json({
      success: true,
      data: prescription,
    })
  } catch (error) {
    console.error("Error fetching prescription:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching prescription",
      error: error.message,
    })
  }
}

// Update a prescription
export const updatePrescription = async (req, res) => {
  try {
    const { prescriptionId } = req.params
    const { diagnosis, medications, additionalNotes, status } = req.body
    const doctorId = req.user.id

    const prescription = await Prescription.findById(prescriptionId)

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found",
      })
    }

    // Check if the doctor is authorized to update this prescription
    if (prescription.doctorId.toString() !== doctorId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update this prescription",
      })
    }

    // Update prescription fields
    if (diagnosis) prescription.diagnosis = diagnosis
    if (medications) prescription.medications = medications
    if (additionalNotes) prescription.additionalNotes = additionalNotes
    if (status) prescription.status = status

    prescription.updatedAt = new Date()

    await prescription.save()

    // If medication reminders are updated, handle them
    if (medications) {
      // Delete existing future reminders
      await MedicationReminder.deleteMany({
        prescriptionId: prescription._id,
        scheduledTime: { $gt: new Date() },
        status: "pending",
      })

      // Create new reminders
      const reminders = []
      for (const medication of medications) {
        if (medication.reminderEnabled && medication.reminderTimes && medication.reminderTimes.length > 0) {
          // Calculate reminder dates
          const startDate = medication.startDate || new Date()
          const endDate = medication.endDate || calculateEndDate(startDate, medication.duration)

          // Generate reminder schedule
          const reminderSchedule = generateReminderSchedule(
            startDate,
            endDate,
            medication.reminderFrequency,
            medication.reminderTimes,
          )

          // Create reminder documents
          for (const scheduledTime of reminderSchedule) {
            // Only create reminders for future times
            if (scheduledTime > new Date()) {
              const reminder = new MedicationReminder({
                prescriptionId: prescription._id,
                patientId: prescription.patientId,
                medicationName: medication.name,
                dosage: medication.dosage,
                scheduledTime,
                instructions: medication.instructions,
                notificationMethod: "all",
              })

              await reminder.save()
              reminders.push(reminder)
            }
          }
        }
      }

      // Create notification for patient about updated prescription
      const notification = await Notification.create({
        recipient: prescription.patientId,
        recipientModel: "patient_user",
        type: "SYSTEM",
        title: "Prescription Updated",
        message: "Your doctor has updated your prescription",
        metadata: {
          prescriptionId: prescription._id,
          doctorId,
        },
      })

      // Emit socket event for real-time notification
      io.to(`patient-${prescription.patientId}`).emit("newNotification", notification)
      io.to(`patient-${prescription.patientId}`).emit("prescriptionUpdated", {
        prescriptionId: prescription._id,
        diagnosis: prescription.diagnosis,
        medicationsCount: prescription.medications.length,
      })
    }

    res.status(200).json({
      success: true,
      data: prescription,
      message: "Prescription updated successfully",
    })
  } catch (error) {
    console.error("Error updating prescription:", error)
    res.status(500).json({
      success: false,
      message: "Error updating prescription",
      error: error.message,
    })
  }
}

// Helper function to calculate end date based on duration
const calculateEndDate = (startDate, duration) => {
  const start = new Date(startDate)
  const durationMatch = duration.match(/(\d+)\s*(day|week|month|year)s?/)

  if (!durationMatch) return start

  const [_, amount, unit] = durationMatch
  const numAmount = Number.parseInt(amount)

  switch (unit) {
    case "day":
      start.setDate(start.getDate() + numAmount)
      break
    case "week":
      start.setDate(start.getDate() + numAmount * 7)
      break
    case "month":
      start.setMonth(start.getMonth() + numAmount)
      break
    case "year":
      start.setFullYear(start.getFullYear() + numAmount)
      break
  }

  return start
}

// Helper function to generate reminder schedule
const generateReminderSchedule = (startDate, endDate, frequency, reminderTimes) => {
  const schedule = []
  const start = new Date(startDate)
  const end = new Date(endDate)

  // Set start to beginning of day
  start.setHours(0, 0, 0, 0)

  // Set end to end of day
  end.setHours(23, 59, 59, 999)

  // Generate dates between start and end
  const currentDate = new Date(start)
  while (currentDate <= end) {
    // For each day, add reminder times
    for (const timeStr of reminderTimes) {
      const [hours, minutes] = timeStr.split(":").map(Number)
      const reminderTime = new Date(currentDate)
      reminderTime.setHours(hours, minutes, 0, 0)

      // Only add future reminders
      if (reminderTime > new Date()) {
        schedule.push(new Date(reminderTime))
      }
    }

    // Move to next day or appropriate interval based on frequency
    switch (frequency) {
      case "daily":
        currentDate.setDate(currentDate.getDate() + 1)
        break
      case "twice_daily":
        currentDate.setDate(currentDate.getDate() + 1)
        break
      case "thrice_daily":
        currentDate.setDate(currentDate.getDate() + 1)
        break
      case "once_weekly":
        currentDate.setDate(currentDate.getDate() + 7)
        break
      case "custom":
        currentDate.setDate(currentDate.getDate() + 1)
        break
      default:
        currentDate.setDate(currentDate.getDate() + 1)
    }
  }

  return schedule
}

