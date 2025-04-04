import nodemailer from "nodemailer"
import { Appointment } from "../model/appointmentModel.js"
import { PatientUser, DoctorUser } from "../model/usermodal.js"
import { Notification } from "../model/notificationModel.js"
import { io } from "../server.js"

// Create a nodemailer transporter using the existing configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

// Function to send appointment reminder email
export const sendAppointmentReminderEmail = async (appointment, patientDetails, doctorDetails) => {
  try {
    const appointmentDate = new Date(appointment.date)
    const formattedDate = appointmentDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h1 style="color: #3b82f6; text-align: center;">Appointment Reminder</h1>
        <p>Dear ${patientDetails.firstName} ${patientDetails.lastName},</p>
        <p>This is a reminder that your appointment is scheduled in <strong>1 hour</strong>.</p>
        
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h2 style="color: #334155; font-size: 18px; margin-top: 0;">Appointment Details:</h2>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${appointment.timeSlot.startTime} - ${appointment.timeSlot.endTime}</p>
          <p><strong>Doctor:</strong> Dr. ${doctorDetails.firstName} ${doctorDetails.lastName}</p>
          <p><strong>Consultation Type:</strong> ${appointment.consultationType === "video" ? "Video Consultation" : "In-Person Visit"}</p>
        </div>
        
        <h3 style="color: #334155;">Preparation Instructions:</h3>
        <ul>
          <li>Please be ready 5-10 minutes before your scheduled time.</li>
          <li>Have your health insurance card and ID ready if applicable.</li>
          <li>Prepare a list of any symptoms, concerns, or questions you want to discuss.</li>
          ${
            appointment.consultationType === "video"
              ? `<li>Ensure you have a stable internet connection and your device is charged.</li>
             <li>Find a quiet, well-lit place for your video consultation.</li>`
              : `<li>Plan to arrive at the clinic at least 10 minutes early.</li>
             <li>Bring any relevant medical records or test results.</li>`
          }
        </ul>
        
        <p>If you need to reschedule, please click the link below or contact us as soon as possible:</p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/patient-dashboard/appointments" 
             style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Manage Your Appointment
          </a>
        </div>
        
        <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 30px;">
          Thank you for choosing Mcare for your healthcare needs.
        </p>
      </div>
    `

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: patientDetails.email,
      subject: "Upcoming Appointment Reminder - Mcare",
      html: emailContent,
    })

    console.log(`Reminder email sent to ${patientDetails.email} for appointment ID: ${appointment._id}`)
    return true
  } catch (error) {
    console.error("Error sending appointment reminder:", error)
    return false
  }
}

// Function to send in-app notification
const sendAppointmentReminderNotification = async (appointment, patientDetails, doctorDetails) => {
  try {
    // Create notification for patient
    const patientNotification = await Notification.create({
      recipient: patientDetails._id,
      recipientModel: "patient_user",
      type: "REMINDER",
      title: "Upcoming Appointment Reminder",
      message: `Your appointment with Dr. ${doctorDetails.firstName} ${doctorDetails.lastName} is scheduled in 1 hour at ${appointment.timeSlot.startTime}`,
      metadata: {
        appointmentId: appointment._id,
        doctorId: doctorDetails._id,
        timeSlot: appointment.timeSlot,
      },
    })

    // Create notification for doctor
    const doctorNotification = await Notification.create({
      recipient: doctorDetails._id,
      recipientModel: "doctor_user",
      type: "REMINDER",
      title: "Upcoming Appointment Reminder",
      message: `Your appointment with ${patientDetails.firstName} ${patientDetails.lastName} is scheduled in 1 hour at ${appointment.timeSlot.startTime}`,
      metadata: {
        appointmentId: appointment._id,
        patientId: patientDetails._id,
        timeSlot: appointment.timeSlot,
      },
    })

    // Emit socket events for real-time notifications
    io.to(`patient-${patientDetails._id}`).emit("newNotification", patientNotification)
    io.to(`doctor-${doctorDetails._id}`).emit("newNotification", doctorNotification)

    // Also emit specific appointment reminder event for patient
    io.to(`patient-${patientDetails._id}`).emit("appointmentReminder", {
      appointmentId: appointment._id,
      doctorName: `${doctorDetails.firstName} ${doctorDetails.lastName}`,
      date: new Date(appointment.date).toLocaleDateString(),
      time: appointment.timeSlot.startTime,
    })

    console.log(`Reminder notifications sent for appointment ID: ${appointment._id}`)
    return true
  } catch (error) {
    console.error("Error sending appointment reminder notifications:", error)
    return false
  }
}

// Function to check for upcoming appointments and send reminders
export const checkAndSendReminders = async () => {
  try {
    console.log("Checking for upcoming appointments that need reminders...")

    // Get current time
    const now = new Date()
    console.log(`Current server time: ${now.toISOString()}`)

    // Find confirmed appointments for today
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Find all confirmed appointments for today that haven't had reminders sent
    const todayAppointments = await Appointment.find({
      date: {
        $gte: today,
        $lt: tomorrow,
      },
      status: "confirmed",
      reminderSent: { $ne: true },
    })

    console.log(`Found ${todayAppointments.length} confirmed appointments for today that need reminders`)

    let remindersSent = 0

    // Process each appointment
    for (const appointment of todayAppointments) {
      try {
        // Calculate the appointment time
        const appointmentTime = new Date(appointment.date)
        const [hours, minutes] = appointment.timeSlot.startTime.split(":").map(Number)
        appointmentTime.setHours(hours, minutes, 0, 0)

        console.log(`Appointment ID: ${appointment._id}`)
        console.log(`Appointment time: ${appointmentTime.toISOString()}`)

        // Calculate time difference in minutes
        const timeDiffMs = appointmentTime.getTime() - now.getTime()
        const timeDiffMinutes = Math.floor(timeDiffMs / (1000 * 60))

        console.log(`Time difference: ${timeDiffMinutes} minutes`)

        // Send reminder if appointment is between 50-70 minutes away (approximately 1 hour)
        // Widening the window to catch more appointments
        if (timeDiffMinutes >= 50 && timeDiffMinutes <= 70) {
          console.log(`Sending reminder for appointment scheduled in ${timeDiffMinutes} minutes`)

          // Get patient and doctor details
          const patient = await PatientUser.findById(appointment.patientId)
          const doctor = await DoctorUser.findById(appointment.doctorId)

          if (patient && doctor) {
            // Send email reminder
            const emailSent = await sendAppointmentReminderEmail(appointment, patient, doctor)

            // Send in-app notification
            const notificationSent = await sendAppointmentReminderNotification(appointment, patient, doctor)

            if (emailSent || notificationSent) {
              // Mark reminder as sent
              appointment.reminderSent = true
              await appointment.save()
              console.log(`Marked reminder as sent for appointment ID: ${appointment._id}`)
              remindersSent++
            }
          } else {
            console.log(`Could not find patient or doctor for appointment ID: ${appointment._id}`)
          }
        } else {
          console.log(`Appointment not in reminder window (${timeDiffMinutes} minutes away)`)
        }
      } catch (appointmentError) {
        console.error(`Error processing appointment ${appointment._id}:`, appointmentError)
        // Continue with next appointment
      }
    }

    console.log(`Finished checking for appointments. Sent ${remindersSent} reminders.`)
    return remindersSent
  } catch (error) {
    console.error("Error checking and sending reminders:", error)
    throw error
  }
}

// Export with the name expected by server.js
export const checkAndSendAppointmentReminders = checkAndSendReminders

