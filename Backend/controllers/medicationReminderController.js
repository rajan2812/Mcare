import { MedicationReminder } from "../model/medicationReminderModel.js"
import { Notification } from "../model/notificationModel.js"
import { io } from "../server.js"
import nodemailer from "nodemailer"
import { PatientUser } from "../model/usermodal.js"

// Create a nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

// Create medication reminders
export const createMedicationReminders = async (req, res) => {
  try {
    const { patientId, appointmentId, doctorId, reminders } = req.body

    if (!patientId || !doctorId || !reminders || !Array.isArray(reminders)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data. Patient ID, doctor ID, and reminders array are required",
      })
    }

    // Get patient details for notifications
    const patient = await PatientUser.findById(patientId)
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      })
    }

    // Create reminders
    const createdReminders = []
    for (const reminder of reminders) {
      // Validate required fields
      if (!reminder.medicationName || !reminder.dosage || !reminder.scheduledTime) {
        return res.status(400).json({
          success: false,
          message: "Each reminder must include medicationName, dosage, and scheduledTime",
        })
      }

      // Create reminder for each day in the duration
      const duration = reminder.duration || 7 // Default to 7 days if not specified
      const startDate = reminder.startDate ? new Date(reminder.startDate) : new Date()

      for (let day = 0; day < duration; day++) {
        const reminderDate = new Date(startDate)
        reminderDate.setDate(reminderDate.getDate() + day)

        // Set the time for the reminder
        const [hours, minutes] = reminder.scheduledTime.split(":")
        reminderDate.setHours(Number.parseInt(hours, 10), Number.parseInt(minutes, 10), 0, 0)

        // Only create future reminders
        if (reminderDate > new Date()) {
          // Create the reminder
          const newReminder = new MedicationReminder({
            patientId,
            appointmentId,
            doctorId,
            medicationName: reminder.medicationName,
            dosage: reminder.dosage,
            frequency: reminder.frequency || "once",
            scheduledTime: reminderDate,
            instructions: reminder.instructions || "",
            status: "pending",
            notificationSent: false,
          })

          await newReminder.save()
          createdReminders.push(newReminder)
        }
      }
    }

    // Send confirmation notification to patient
    const notification = await Notification.create({
      recipient: patientId,
      recipientModel: "patient_user",
      type: "REMINDER",
      title: "Medication Reminders Set",
      message: `Your doctor has set medication reminders for you. Check your medications section for details.`,
      metadata: {
        appointmentId,
        doctorId,
      },
    })

    // Emit socket event for real-time notification
    io.to(`patient-${patientId}`).emit("newNotification", notification)

    res.status(201).json({
      success: true,
      message: "Medication reminders created successfully",
      data: {
        reminders: createdReminders,
      },
    })
  } catch (error) {
    console.error("Error creating medication reminders:", error)
    res.status(500).json({
      success: false,
      message: "Error creating medication reminders",
      error: error.message,
    })
  }
}

// Get upcoming reminders for a patient
export const getPatientReminders = async (req, res) => {
  try {
    const patientId = req.user.id
    const { status, limit = 10, page = 1 } = req.query

    const query = { patientId }
    if (status) {
      query.status = status
    }

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    const reminders = await MedicationReminder.find(query)
      .sort({ scheduledTime: 1 })
      .skip(skip)
      .limit(Number.parseInt(limit))
      .populate({
        path: "doctorId",
        select: "firstName lastName specializations",
      })

    const total = await MedicationReminder.countDocuments(query)

    res.status(200).json({
      success: true,
      data: {
        reminders,
        pagination: {
          total,
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          pages: Math.ceil(total / Number.parseInt(limit)),
        },
      },
    })
  } catch (error) {
    console.error("Error fetching patient reminders:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching reminders",
      error: error.message,
    })
  }
}

// Update reminder status (acknowledge or dismiss)
export const updateReminderStatus = async (req, res) => {
  try {
    const { reminderId } = req.params
    const { status } = req.body
    const patientId = req.user.id

    if (!["acknowledged", "missed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'acknowledged' or 'missed'",
      })
    }

    const reminder = await MedicationReminder.findById(reminderId)

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: "Reminder not found",
      })
    }

    // Check if the patient is authorized to update this reminder
    if (reminder.patientId.toString() !== patientId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update this reminder",
      })
    }

    reminder.status = status
    if (status === "acknowledged") {
      reminder.acknowledgedAt = new Date()
    }

    await reminder.save()

    res.status(200).json({
      success: true,
      data: reminder,
      message: `Reminder marked as ${status}`,
    })
  } catch (error) {
    console.error("Error updating reminder status:", error)
    res.status(500).json({
      success: false,
      message: "Error updating reminder status",
      error: error.message,
    })
  }
}

// Check for upcoming reminders and send notifications
export const checkAndSendMedicationReminders = async () => {
  try {
    console.log("Checking for upcoming medication reminders...")

    // Get current time
    const now = new Date()

    // Find reminders due in the next 5 minutes that haven't been sent yet
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)

    const upcomingReminders = await MedicationReminder.find({
      scheduledTime: {
        $gte: now,
        $lte: fiveMinutesFromNow,
      },
      status: "pending",
      notificationSent: false,
    }).populate("patientId", "firstName lastName email")

    console.log(`Found ${upcomingReminders.length} upcoming medication reminders`)

    let remindersSent = 0

    // Process each reminder
    for (const reminder of upcomingReminders) {
      try {
        if (!reminder.patientId) {
          console.log(`Patient not found for reminder ID: ${reminder._id}`)
          continue
        }

        // Send email notification
        const emailSent = await sendMedicationReminderEmail(reminder)

        // Send in-app notification
        const notificationSent = await sendMedicationReminderNotification(reminder)

        if (emailSent || notificationSent) {
          // Mark reminder as sent
          reminder.notificationSent = true
          await reminder.save()
          console.log(`Marked reminder as sent for medication: ${reminder.medicationName}`)
          remindersSent++
        }
      } catch (reminderError) {
        console.error(`Error processing reminder ${reminder._id}:`, reminderError)
        // Continue with next reminder
      }
    }

    console.log(`Finished checking for medication reminders. Sent ${remindersSent} reminders.`)
    return remindersSent
  } catch (error) {
    console.error("Error checking and sending medication reminders:", error)
    throw error
  }
}

// Helper function to send medication reminder email
const sendMedicationReminderEmail = async (reminder) => {
  try {
    if (!reminder.patientId || !reminder.patientId.email) {
      console.log(`No email found for patient ID: ${reminder.patientId?._id || "unknown"}`)
      return false
    }

    const patientName = `${reminder.patientId.firstName} ${reminder.patientId.lastName}`
    const scheduledTime = reminder.scheduledTime.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h1 style="color: #3b82f6; text-align: center;">Medication Reminder</h1>
        <p>Dear ${patientName},</p>
        <p>This is a reminder to take your medication in 5 minutes:</p>
        
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h2 style="color: #334155; font-size: 18px; margin-top: 0;">Medication Details:</h2>
          <p><strong>Medication:</strong> ${reminder.medicationName}</p>
          <p><strong>Dosage:</strong> ${reminder.dosage}</p>
          <p><strong>Time:</strong> ${scheduledTime}</p>
          ${reminder.instructions ? `<p><strong>Instructions:</strong> ${reminder.instructions}</p>` : ""}
        </div>
        
        <p>Please take your medication as prescribed by your doctor.</p>
        
        <div style="text-align: center; margin: 25px 0;">
          <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/patient-dashboard/medications" 
             style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View Medication Details
          </a>
        </div>
        
        <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 30px;">
          Thank you for choosing Mcare for your healthcare needs.
        </p>
      </div>
    `

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: reminder.patientId.email,
      subject: "Medication Reminder - Mcare",
      html: emailContent,
    })

    console.log(`Medication reminder email sent to ${reminder.patientId.email}`)
    return true
  } catch (error) {
    console.error("Error sending medication reminder email:", error)
    return false
  }
}

// Helper function to send in-app medication reminder notification
const sendMedicationReminderNotification = async (reminder) => {
  try {
    // Create notification for patient
    const notification = await Notification.create({
      recipient: reminder.patientId._id,
      recipientModel: "patient_user",
      type: "REMINDER",
      title: "Medication Reminder",
      message: `Time to take ${reminder.medicationName} (${reminder.dosage}) in 5 minutes`,
      metadata: {
        reminderId: reminder._id,
        medicationName: reminder.medicationName,
        scheduledTime: reminder.scheduledTime,
      },
    })

    // Emit socket event for real-time notification
    io.to(`patient-${reminder.patientId._id}`).emit("newNotification", notification)
    io.to(`patient-${reminder.patientId._id}`).emit("medicationReminder", {
      reminderId: reminder._id,
      medicationName: reminder.medicationName,
      dosage: reminder.dosage,
      scheduledTime: reminder.scheduledTime,
    })

    console.log(`Medication reminder notification sent for patient ID: ${reminder.patientId._id}`)
    return true
  } catch (error) {
    console.error("Error sending medication reminder notification:", error)
    return false
  }
}

