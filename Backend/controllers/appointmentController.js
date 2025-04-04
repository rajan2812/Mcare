import { Appointment } from "../model/appointmentModel.js"
import { Availability } from "../model/availabilityModel.js"
import { Notification } from "../model/notificationModel.js"
import { Queue } from "../model/queueModel.js"
import { io } from "../server.js"
import nodemailer from "nodemailer"
import mongoose from "mongoose"

// Add this constant at the top of the file, after the imports
const TIMEZONE = "Asia/Kolkata" // Mumbai, India timezone

// Create a nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

// Helper function to send appointment status email
const sendAppointmentStatusEmail = async (patientEmail, patientName, doctorName, status, date, time, reason = "") => {
  const statusText = status === "confirmed" ? "accepted" : "rejected"
  const subject = `Your Appointment Request has been ${statusText.charAt(0).toUpperCase() + statusText.slice(1)} - Mcare`

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: patientEmail,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4a5568;">Hello, ${patientName}!</h1>
        <p>Your appointment request with Dr. ${doctorName} on ${date} at ${time} has been <strong>${statusText}</strong>.</p>
        ${status === "rejected" && reason ? `<p>Reason: ${reason}</p>` : ""}
        ${
          status === "confirmed"
            ? `
          <p>Please make sure to arrive on time for your appointment.</p>
          <p>If you need to reschedule or cancel, please do so at least 24 hours in advance.</p>
        `
            : `
          <p>You can book another appointment through our platform at your convenience.</p>
        `
        }
        <p>If you have any questions, please don't hesitate to contact our support team.</p>
        <p>Thank you for choosing Mcare!</p>
        <p>Best regards,<br>The Mcare Team</p>
      </div>
    `,
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log(`Appointment ${statusText} email sent successfully to ${patientEmail}`)
    return true
  } catch (error) {
    console.error(`Error sending appointment ${statusText} email:`, error)
    return false
  }
}

// Helper function to validate date format (YYYY-MM-DD)
const isValidDateFormat = (dateString) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/
  return regex.test(dateString)
}

// Helper function to parse and validate date with India timezone
const parseDate = (dateInput) => {
  // If input is already a Date object
  if (dateInput instanceof Date) {
    return new Date(dateInput)
  }

  // If input is a string
  if (typeof dateInput === "string") {
    // First try YYYY-MM-DD format
    if (isValidDateFormat(dateInput)) {
      // Parse the date in India timezone without shifting the day
      const [year, month, day] = dateInput.split("-").map(Number)

      // Create date with the exact day specified, using noon time to avoid any day boundary issues
      const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
      return date
    }

    // Try parsing other date string formats
    const date = new Date(dateInput)
    if (!isNaN(date.getTime())) {
      return date
    }
  }

  throw new Error("Invalid date format. Please use YYYY-MM-DD format")
}

// Helper function to format date to YYYY-MM-DD in India timezone
const formatDateToString = (date) => {
  // Use UTC methods to avoid timezone shifts
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Helper function to convert time to minutes
const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

// Helper function to calculate estimated wait time
const calculateWaitTime = async (doctorId, slotTime) => {
  const queuePosition = await Queue.countDocuments({
    doctorId,
    expectedStartTime: { $lte: slotTime },
    status: "waiting",
  })

  // Assume average consultation time is 15 minutes
  const averageConsultationTime = 15
  return queuePosition * averageConsultationTime
}

// Helper function to check slot availability
const isSlotAvailable = async (doctorId, date, startTime, endTime) => {
  // Format date for MongoDB query (keep only the date part)
  const formattedDate = date instanceof Date ? formatDateToString(date) : date

  const availability = await Availability.findOne({
    doctorId,
    date: {
      $gte: new Date(`${formattedDate}T00:00:00.000+05:30`),
      $lt: new Date(`${formattedDate}T23:59:59.999+05:30`),
    },
    isAvailable: true,
  })

  if (!availability) return { available: false, reason: "DOCTOR_UNAVAILABLE" }

  // Check if slot is within working hours
  const slot = availability.timeSlots.find((slot) => slot.startTime === startTime && slot.endTime === endTime)

  if (!slot) return { available: false, reason: "OUTSIDE_HOURS" }
  if (slot.isBooked) return { available: false, reason: "ALREADY_BOOKED" }
  if (slot.isBreak) return { available: false, reason: "DOCTOR_BREAK" }

  return {
    available: true,
    slotType: slot.type || "regular",
    isEmergency: slot.type === "emergency",
  }
}

// Helper function to suggest alternative slots
const findAlternativeSlots = async (doctorId, date, preferredTime) => {
  // Format date for MongoDB query (keep only the date part)
  const formattedDate = date instanceof Date ? formatDateToString(date) : date

  const availability = await Availability.findOne({
    doctorId,
    date: {
      $gte: new Date(`${formattedDate}T00:00:00.000+05:30`),
      $lt: new Date(`${formattedDate}T23:59:59.999+05:30`),
    },
  })

  if (!availability) return []

  const preferredTimeMinutes = timeToMinutes(preferredTime)

  return availability.timeSlots
    .filter((slot) => !slot.isBooked && !slot.isBreak)
    .sort((a, b) => {
      const diffA = Math.abs(timeToMinutes(a.startTime) - preferredTimeMinutes)
      const diffB = Math.abs(timeToMinutes(b.startTime) - preferredTimeMinutes)
      return diffA - diffB
    })
    .slice(0, 3) // Return top 3 closest available slots
}

// Helper function to send appointment rescheduling email
const sendAppointmentRescheduleEmail = async (
  patientEmail,
  patientName,
  doctorName,
  oldDate,
  oldTime,
  newDate,
  newTime,
  rescheduleInitiator,
) => {
  const subject = `Your Appointment Has Been Rescheduled - Mcare`
  const initiatorText = rescheduleInitiator === "doctor" ? `Dr. ${doctorName} has` : "You have"

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: patientEmail,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4a5568;">Hello, ${patientName}!</h1>
        <p>${initiatorText} has rescheduled your appointment.</p>
        <div style="background-color: #f7fafc; border-left: 4px solid #e53e3e; padding: 15px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Previous Schedule:</strong> ${oldDate} at ${oldTime}</p>
        </div>
        <div style="background-color: #f7fafc; border-left: 4px solid #38a169; padding: 15px; margin: 20px 0;">
          <p style="margin: 0;"><strong>New Schedule:</strong> ${newDate} at ${newTime}</p>
        </div>
        <p>If you have any questions or need to make further changes, please log in to your account or contact our support team.</p>
        <p>Thank you for choosing Mcare!</p>
        <p>Best regards,<br>The Mcare Team</p>
      </div>
    `,
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log(`Appointment reschedule email sent successfully to ${patientEmail}`)
    return true
  } catch (error) {
    console.error(`Error sending appointment reschedule email:`, error)
    return false
  }
}

// Add this helper function to send appointment cancellation email to doctor
const sendAppointmentCancellationEmailToDoctor = async (
  doctorEmail,
  doctorName,
  patientName,
  date,
  time,
  reason = "",
) => {
  const subject = `Appointment Cancellation Notice - Mcare`

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: doctorEmail,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4a5568;">Hello, Dr. ${doctorName}!</h1>
        <p>This is to inform you that <strong>${patientName}</strong> has cancelled their appointment scheduled for ${date} at ${time}.</p>
        
        ${
          reason
            ? `
        <div style="background-color: #f7fafc; border-left: 4px solid #e53e3e; padding: 15px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Reason for cancellation:</strong> ${reason}</p>
        </div>
        `
            : ""
        }
        
        <p>Your schedule has been updated accordingly, and this time slot is now available for other appointments.</p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/doctor-dashboard/appointments" 
             style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View Schedule
          </a>
        </div>
        <p>Thank you for using Mcare!</p>
        <p>Best regards,<br>The Mcare Team</p>
      </div>
    `,
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log(`Appointment cancellation email sent successfully to doctor: ${doctorEmail}`)
    return true
  } catch (error) {
    console.error(`Error sending appointment cancellation email to doctor:`, error)
    return false
  }
}

// Update the bookAppointment function to ensure correct date handling
export const bookAppointment = async (req, res) => {
  try {
    const { doctorId, date, startTime, endTime, isEmergency, patientName, consultationType, symptoms } = req.body
    const patientId = req.user.id

    console.log("Received appointment request:", req.body)

    // Validate date and time
    let appointmentDate
    let formattedDate

    try {
      // Handle date string directly to avoid timezone shifts
      if (isValidDateFormat(date)) {
        // For YYYY-MM-DD format, store exactly as provided without timezone conversion
        formattedDate = date

        // Create a date object with the exact date (setting time to noon to avoid day boundary issues)
        const [year, month, day] = date.split("-").map(Number)
        appointmentDate = new Date(
          `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}T12:00:00.000Z`,
        )
      } else {
        // For other formats, create a date and format it
        const tempDate = new Date(date)
        if (isNaN(tempDate.getTime())) {
          throw new Error("Invalid date")
        }

        // Format to YYYY-MM-DD to prevent timezone shifts
        const year = tempDate.getFullYear()
        const month = String(tempDate.getMonth() + 1).padStart(2, "0")
        const day = String(tempDate.getDate()).padStart(2, "0")
        formattedDate = `${year}-${month}-${day}`

        // Create date with fixed time to avoid timezone issues
        appointmentDate = new Date(`${formattedDate}T12:00:00.000Z`)
      }

      console.log("Parsed appointment date:", appointmentDate)
      console.log("Formatted date for storage:", formattedDate)
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || "Invalid date format. Please use YYYY-MM-DD format",
      })
    }

    // Check real-time availability
    const availabilityCheck = await isSlotAvailable(doctorId, formattedDate, startTime, endTime)

    if (!availabilityCheck.available) {
      const alternativeSlots = await findAlternativeSlots(doctorId, formattedDate, startTime)

      return res.status(409).json({
        success: false,
        message: `Slot unavailable: ${availabilityCheck.reason}`,
        alternativeSlots,
        reason: availabilityCheck.reason,
      })
    }

    // Validate emergency booking
    if (isEmergency && availabilityCheck.slotType !== "emergency") {
      return res.status(400).json({
        success: false,
        message: "Emergency booking not allowed in regular slots",
      })
    }

    // Calculate queue position and wait time
    const estimatedWaitTime = await calculateWaitTime(doctorId, startTime)
    const queuePosition =
      (await Queue.countDocuments({
        doctorId,
        status: "waiting",
      })) + 1

    // Create appointment with the correct date
    const appointment = new Appointment({
      doctorId,
      patientId,
      patientName,
      date: appointmentDate, // Store the Date object
      dateString: formattedDate, // Store the original string format as well
      timeSlot: { startTime, endTime },
      status: "pending",
      isEmergency,
      consultationType,
      symptoms,
      queueNumber: queuePosition,
      estimatedWaitTime,
      reminderSent: false,
    })

    await appointment.save()

    // Find or create a queue document for this doctor and date
    let queueDoc = await Queue.findOne({
      doctorId,
      date: {
        $gte: new Date(`${formattedDate}T00:00:00.000+05:30`),
        $lt: new Date(`${formattedDate}T23:59:59.999+05:30`),
      },
    })

    if (!queueDoc) {
      // Create a new queue document if one doesn't exist
      queueDoc = new Queue({
        doctorId,
        date: appointmentDate,
        isActive: true,
        entries: [],
      })
    }

    // Add the new appointment to the entries array
    const queueEntry = {
      appointmentId: appointment._id,
      patientId,
      patientName,
      scheduledTime: startTime,
      status: "waiting",
      priority: isEmergency ? 1 : 0,
      estimatedWaitTime,
    }

    queueDoc.entries.push(queueEntry)
    await queueDoc.save()

    // Create notification for doctor
    await Notification.create({
      recipient: doctorId,
      recipientModel: "doctor_user",
      type: "APPOINTMENT",
      title: "New Appointment Booked",
      message: `New ${isEmergency ? "emergency " : ""}appointment booked for ${formattedDate} at ${startTime}`,
      metadata: {
        appointmentId: appointment._id,
        patientId,
        timeSlot: { startTime, endTime },
      },
    })

    // Emit real-time updates
    io.to(`doctor-${doctorId}`).emit("newAppointment", {
      appointment: {
        ...appointment.toObject(),
        date: formattedDate, // Ensure the date is correctly formatted
      },
      queueEntry,
    })

    // Update availability status
    const availability = await Availability.findOne({
      doctorId,
      date: {
        $gte: new Date(`${formattedDate}T00:00:00.000+05:30`),
        $lt: new Date(`${formattedDate}T23:59:59.999+05:30`),
      },
    })

    if (availability) {
      const updatedSlots = availability.timeSlots.map((slot) => {
        if (slot.startTime === startTime) {
          return {
            ...slot,
            isBooked: true,
            appointmentId: appointment._id,
            patientId,
          }
        }
        return slot
      })

      availability.timeSlots = updatedSlots
      await availability.save()

      // Broadcast availability update
      io.emit("availabilityUpdated", {
        doctorId,
        date: formattedDate,
        timeSlots: updatedSlots,
      })
    }

    // When sending response, use the formatted date string to prevent timezone shifts
    res.status(201).json({
      success: true,
      data: {
        appointment: {
          ...appointment.toObject(),
          date: formattedDate, // Use the formatted date string
        },
        queuePosition,
        estimatedWaitTime,
        queueEntry,
      },
    })
  } catch (error) {
    console.error("Error booking appointment:", error)
    res.status(500).json({
      success: false,
      message: "Error booking appointment",
      error: error.message,
    })
  }
}

// Update the getAvailableSlots function to handle date parameter correctly
export const getAvailableSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.params

    // Validate and parse date properly
    let appointmentDate
    let formattedDate

    try {
      // Handle date string directly to avoid timezone shifts
      if (isValidDateFormat(date)) {
        // For YYYY-MM-DD format, preserve the exact date
        const [year, month, day] = date.split("-").map(Number)
        appointmentDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
        formattedDate = date
      } else {
        // For other formats, create a date and format it in India timezone
        appointmentDate = new Date(date)
        formattedDate = formatDateToString(appointmentDate)
      }

      if (isNaN(appointmentDate.getTime())) {
        throw new Error("Invalid date")
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      })
    }

    const availability = await Availability.findOne({
      doctorId,
      date: {
        $gte: new Date(`${formattedDate}T00:00:00.000+05:30`),
        $lt: new Date(`${formattedDate}T23:59:59.999+05:30`),
      },
      isAvailable: true,
    })

    if (!availability) {
      return res.status(404).json({
        success: false,
        message: "No availability found for this date",
      })
    }

    // Process slots with detailed status
    const processedSlots = await Promise.all(
      availability.timeSlots.map(async (slot) => {
        const waitTime = await calculateWaitTime(doctorId, slot.startTime)

        return {
          ...slot,
          status: slot.isBooked ? "BOOKED" : slot.isBreak ? "BREAK" : "AVAILABLE",
          type: slot.type || "regular",
          estimatedWaitTime: slot.isBooked ? null : waitTime,
          reason: slot.isBooked ? "Already booked" : slot.isBreak ? "Doctor break" : null,
        }
      }),
    )

    // Set up server-sent events for real-time updates
    const headers = {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    }

    res.status(200).json({
      success: true,
      data: {
        slots: processedSlots,
        regularHours: availability.regularHours,
        emergencyHours: availability.emergencyHours,
        breaks: availability.breaks,
        lastUpdated: availability.lastUpdated,
      },
      headers,
    })
  } catch (error) {
    console.error("Error fetching available slots:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching available slots",
      error: error.message,
    })
  }
}

// Update the handleScheduleChange function to handle date parameter correctly
export const handleScheduleChange = async (req, res) => {
  try {
    const { doctorId, date, changes } = req.body

    // Validate and parse date properly
    let appointmentDate
    let formattedDate

    try {
      // Handle date string directly to avoid timezone shifts
      if (isValidDateFormat(date)) {
        // For YYYY-MM-DD format, create a date in India timezone
        const [year, month, day] = date.split("-").map(Number)
        appointmentDate = new Date(
          `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}T12:00:00.000+05:30`,
        )
        formattedDate = date
      } else {
        // For other formats, create a date and format it in India timezone
        appointmentDate = new Date(date)
        formattedDate = formatDateToString(appointmentDate)
      }

      if (isNaN(appointmentDate.getTime())) {
        throw new Error("Invalid date")
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      })
    }

    // Find affected appointments
    const affectedAppointments = await Appointment.find({
      doctorId,
      date: {
        $gte: new Date(`${formattedDate}T00:00:00.000+05:30`),
        $lt: new Date(`${formattedDate}T23:59:59.999+05:30`),
      },
      status: "scheduled",
      "timeSlot.startTime": { $in: changes.unavailableSlots },
    })

    // Process each affected appointment
    for (const appointment of affectedAppointments) {
      // Find alternative slots
      const alternativeSlots = await findAlternativeSlots(doctorId, formattedDate, appointment.timeSlot.startTime)

      // Create notification for affected patient
      await Notification.create({
        recipient: appointment.patientId,
        recipientModel: "patient_user",
        type: "SYSTEM", // Changed from "SCHEDULE_CHANGE" to "SYSTEM"
        title: "Appointment Affected by Schedule Change",
        message: "Your appointment needs to be rescheduled due to doctor's schedule change.",
        metadata: {
          appointmentId: appointment._id,
          originalSlot: appointment.timeSlot,
          alternativeSlots,
          doctorId,
        },
      })

      // Update appointment status
      appointment.status = "pending_reschedule"
      appointment.lastUpdated = new Date()
      await appointment.save()

      // Emit real-time notification
      io.to(`patient-${appointment.patientId}`).emit("appointmentAffected", {
        appointmentId: appointment._id,
        message: "Your appointment needs to be rescheduled",
        alternativeSlots,
      })
    }

    // Update availability
    const availability = await Availability.findOne({
      doctorId,
      date: {
        $gte: new Date(`${formattedDate}T00:00:00.000+05:30`),
        $lt: new Date(`${formattedDate}T23:59:59.999+05:30`),
      },
    })

    if (availability) {
      availability.timeSlots = availability.timeSlots.map((slot) => ({
        ...slot,
        isBreak: changes.breaks.some(
          (breakTime) => slot.startTime >= breakTime.startTime && slot.endTime <= breakTime.endTime,
        ),
      }))

      await availability.save()

      // Broadcast availability update
      io.emit("availabilityUpdated", {
        doctorId,
        date: formattedDate,
        timeSlots: availability.timeSlots,
      })
    }

    res.status(200).json({
      success: true,
      data: {
        affectedAppointments,
        updatedAvailability: availability,
      },
    })
  } catch (error) {
    console.error("Error handling schedule change:", error)
    res.status(500).json({
      success: false,
      message: "Error handling schedule change",
      error: error.message,
    })
  }
}

// Update the updateAppointmentStatus function to handle date parameter correctly
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { appointmentId } = req.params
    const { status, notes, doctorId, doctorRole, userType } = req.body

    // Log the request details for debugging
    console.log("Appointment status update request:", {
      appointmentId,
      status,
      notes,
      doctorId,
      doctorRole,
      userType,
      user: req.user,
      headers: {
        authorization: req.headers.authorization ? "Present" : "Missing",
        userRole: req.headers["user-role"],
        userHeader: req.headers["user"] ? "Present" : "Missing",
      },
    })

    // Merge role information from the request body with the user object
    if (doctorRole) {
      req.user.role = doctorRole
    }

    if (userType) {
      req.user.userType = userType
    }

    // Also check headers for role information
    if (req.headers["user-role"]) {
      req.user.role = req.headers["user-role"]
    }

    if (req.headers["user"]) {
      try {
        const userInfo = JSON.parse(req.headers["user"])
        if (userInfo.role) req.user.role = userInfo.role
        if (userInfo.userType) req.user.userType = userInfo.userType
      } catch (e) {
        console.error("Error parsing user header:", e)
      }
    }

    // If we still don't have role information, try to determine it from the appointment
    if (!req.user.role && !req.user.userType) {
      // Find the appointment
      const appointment = await Appointment.findById(appointmentId)
      if (appointment) {
        // Check if the user is the patient or doctor
        if (appointment.patientId.toString() === req.user.id) {
          req.user.role = "patient"
          req.user.userType = "patient"
          console.log("Determined role from appointment: patient")
        } else if (appointment.doctorId.toString() === req.user.id) {
          req.user.role = "doctor"
          req.user.userType = "doctor"
          console.log("Determined role from appointment: doctor")
        }
      }
    }

    // Check if the user has the necessary permissions
    if (!req.user.role && !req.user.userType) {
      console.log("Missing role information in request")
      return res.status(403).json({
        success: false,
        message: "Forbidden: Missing role information",
        error: "User role is required for this operation",
      })
    }

    // Validate status transition
    const validStatuses = ["pending", "confirmed", "in-progress", "completed", "cancelled", "rejected", "no-show"]
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment status",
      })
    }

    // Find the appointment
    const appointment = await Appointment.findById(appointmentId)
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      })
    }

    // Check authorization
    const isDoctor =
      (req.user.role === "doctor" || req.user.userType === "doctor") &&
      appointment.doctorId.toString() === (doctorId || req.user.id)
    const isPatient =
      (req.user.role === "patient" || req.user.userType === "patient") &&
      appointment.patientId.toString() === req.user.id

    if (!isDoctor && !isPatient) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update this appointment",
      })
    }

    // Validate status transitions based on user type and current status
    const currentStatus = appointment.status

    // Doctor-initiated status changes
    if (isDoctor) {
      const validDoctorTransitions = {
        pending: ["confirmed", "rejected"],
        confirmed: ["in-progress", "completed", "cancelled", "no-show", "confirmed"], // Allow confirmed->confirmed
        "in-progress": ["completed", "cancelled"],
      }

      if (validDoctorTransitions[currentStatus] && !validDoctorTransitions[currentStatus].includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot change appointment status from ${currentStatus} to ${status}`,
        })
      }

      // If the status is already what we're trying to set it to, just return success
      if (currentStatus === status) {
        return res.status(200).json({
          success: true,
          message: `Appointment already in ${status} status`,
          data: {
            appointment: appointment.toObject(),
          },
        })
      }
    }

    // Patient-initiated status changes
    if (isPatient) {
      const validPatientTransitions = {
        pending: ["cancelled"],
        confirmed: ["cancelled"],
      }

      if (validPatientTransitions[currentStatus] && !validPatientTransitions[currentStatus].includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot change appointment status from ${currentStatus} to ${status}`,
        })
      }
    }

    // Update appointment status
    appointment.status = status
    if (notes) appointment.notes = notes

    // Add to status history
    appointment.statusHistory.push({
      status,
      timestamp: new Date(),
      updatedBy: req.user.id,
      updatedByModel: req.user.role === "doctor" || req.user.userType === "doctor" ? "doctor_user" : "patient_user",
      notes,
    })

    // Handle specific status transitions
    if (status === "in-progress") {
      appointment.startTime = new Date()
    } else if (status === "completed" && appointment.startTime) {
      appointment.endTime = new Date()
    } else if (status === "cancelled") {
      appointment.cancelledBy = req.user.role || req.user.userType
      appointment.cancelReason = notes || "No reason provided"

      // Free up the time slot in availability when appointment is cancelled
      const formattedDate = formatDateToString(appointment.date)
      const availability = await Availability.findOne({
        doctorId: appointment.doctorId,
        date: {
          $gte: new Date(`${formattedDate}T00:00:00.000+05:30`),
          $lt: new Date(`${formattedDate}T23:59:59.999+05:30`),
        },
      })

      if (availability) {
        // Find the matching time slot and mark it as available
        const updatedTimeSlots = availability.timeSlots.map((slot) => {
          if (slot.startTime === appointment.timeSlot.startTime) {
            return {
              ...slot,
              isBooked: false,
              appointmentId: null,
              patientId: null,
            }
          }
          return slot
        })

        availability.timeSlots = updatedTimeSlots
        await availability.save()

        // Broadcast availability update
        io.emit("availabilityUpdated", {
          doctorId: appointment.doctorId,
          date: formattedDate,
          timeSlots: updatedTimeSlots,
        })
      }
    } else if (status === "confirmed") {
      // When confirming an appointment, ensure it's properly scheduled
      // Update the availability to mark the slot as booked
      const formattedDate = formatDateToString(appointment.date)

      const availability = await Availability.findOne({
        doctorId: appointment.doctorId,
        date: {
          $gte: new Date(`${formattedDate}T00:00:00.000+05:30`),
          $lt: new Date(`${formattedDate}T23:59:59.999+05:30`),
        },
      })

      if (availability) {
        // Find the matching time slot and mark it as booked
        const updatedTimeSlots = availability.timeSlots.map((slot) => {
          if (slot.startTime === appointment.timeSlot.startTime) {
            return {
              ...slot,
              isBooked: true,
              appointmentId: appointment._id,
              patientId: appointment.patientId,
            }
          }
          return slot
        })

        availability.timeSlots = updatedTimeSlots
        await availability.save()
      }

      // Add the appointment to the queue if it's for today
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const appointmentDate = new Date(appointment.date)
      appointmentDate.setHours(0, 0, 0, 0)

      if (appointmentDate.getTime() === today.getTime()) {
        try {
          // Find or create queue for today
          let queue = await Queue.findOne({
            doctorId: appointment.doctorId,
            date: today,
          })

          if (!queue) {
            queue = new Queue({
              doctorId: appointment.doctorId,
              date: today,
              entries: [],
            })
          }

          // Check if this appointment is already in the queue
          const existingEntry = queue.entries.find(
            (entry) => entry.appointmentId.toString() === appointment._id.toString(),
          )

          if (!existingEntry) {
            // Get patient name
            const patient = await mongoose.model("patient_user").findById(appointment.patientId)
            const patientName = patient ? `${patient.firstName} ${patient.lastName}` : "Patient"

            // Add to queue
            queue.entries.push({
              appointmentId: appointment._id,
              patientId: appointment.patientId,
              patientName: patientName,
              scheduledTime: appointment.timeSlot.startTime,
              status: "waiting",
              priority: appointment.priority || 0,
              consultationType: appointment.consultationType,
              notes: appointment.symptoms,
            })

            queue.calculateWaitTimes()
            await queue.save()

            console.log(`Added appointment ${appointment._id} to queue for doctor ${appointment.doctorId}`)

            // Emit socket event for queue update
            io.emit("queueUpdated", {
              doctorId: appointment.doctorId,
              date: today.toISOString(),
              queue: queue.toObject(),
            })
          }
        } catch (queueError) {
          console.error("Error adding appointment to queue:", queueError)
          // Don't fail the request if queue update fails
        }
      }
    }

    await appointment.save()

    // Get patient and doctor email for notification
    let patientEmail, patientName, doctorEmail, doctorName

    try {
      // Fetch patient and doctor details if needed for email
      const populatedAppointment = await Appointment.findById(appointmentId)
        .populate("patientId", "firstName lastName email")
        .populate("doctorId", "firstName lastName email")

      if (populatedAppointment) {
        if (populatedAppointment.patientId) {
          patientEmail = populatedAppointment.patientId.email
          patientName = `${populatedAppointment.patientId.firstName} ${populatedAppointment.patientId.lastName}`
        }

        if (populatedAppointment.doctorId) {
          doctorEmail = populatedAppointment.doctorId.email
          doctorName = `${populatedAppointment.doctorId.firstName} ${populatedAppointment.doctorId.lastName}`
        }

        // Send email notification based on status change
        const formattedDate = formatDateToString(appointment.date)

        if (status === "confirmed" || status === "rejected") {
          // Send confirmation/rejection email to patient
          if (patientEmail && doctorName) {
            await sendAppointmentStatusEmail(
              patientEmail,
              patientName,
              doctorName,
              status,
              formattedDate,
              appointment.timeSlot.startTime,
              notes,
            )
          }
        } else if (status === "cancelled" && isPatient) {
          // Send cancellation email to doctor when patient cancels
          if (doctorEmail && patientName) {
            await sendAppointmentCancellationEmailToDoctor(
              doctorEmail,
              doctorName,
              patientName,
              formattedDate,
              appointment.timeSlot.startTime,
              notes,
            )
            console.log(`Cancellation email sent to doctor: ${doctorEmail}`)
          } else {
            console.log("Missing doctor email or patient name for cancellation email")
          }
        }
      }
    } catch (emailError) {
      console.error("Error sending appointment status email:", emailError)
      // Don't fail the request if email sending fails
    }

    // Create notifications
    let notificationRecipient, recipientModel, notificationTitle, notificationMessage

    const isDoctorUpdating = req.user.role === "doctor" || req.user.userType === "doctor"

    if (isDoctorUpdating) {
      notificationRecipient = appointment.patientId
      recipientModel = "patient_user"
      notificationTitle = `Appointment ${status.charAt(0).toUpperCase() + status.slice(1)}`
      notificationMessage = `Your appointment on ${formatDateToString(appointment.date)} at ${appointment.timeSlot.startTime} has been ${status}`
    } else {
      notificationRecipient = appointment.doctorId
      recipientModel = "doctor_user"
      notificationTitle = `Appointment ${status.charAt(0).toUpperCase() + status.slice(1)}`
      notificationMessage = `Patient ${status === "cancelled" ? "cancelled" : "updated"} appointment on ${formatDateToString(appointment.date)} at ${appointment.timeSlot.startTime}`
    }

    // Create notification in database
    const notification = await Notification.create({
      recipient: notificationRecipient,
      recipientModel,
      type: "APPOINTMENT",
      title: notificationTitle,
      message: notificationMessage,
      metadata: {
        appointmentId: appointment._id,
        status,
        updatedBy: req.user.id,
      },
    })

    console.log("Created notification:", notification)

    // Prepare socket event data
    const socketData = {
      appointmentId: appointment._id.toString(),
      status,
      updatedBy: req.user.id,
      updatedByName: `${req.user.firstName || ""} ${req.user.lastName || ""}`,
      date: formatDateToString(appointment.date),
      time: appointment.timeSlot.startTime,
      notes: notes || "",
      patientId: appointment.patientId.toString(),
      doctorId: appointment.doctorId.toString(),
    }

    console.log("Emitting socket event with data:", socketData)

    // Emit socket event for real-time updates - using both methods
    const recipientSocketRoom = isDoctorUpdating ? `patient-${appointment.patientId}` : `doctor-${appointment.doctorId}`

    // Method 1: Direct room emission
    io.to(recipientSocketRoom).emit("appointmentStatusUpdated", socketData)
    console.log(`Emitted appointmentStatusUpdated to ${recipientSocketRoom}`)

    // Method 2: Using the appointmentStatusUpdate event
    io.emit("appointmentStatusUpdate", socketData)
    console.log("Emitted appointmentStatusUpdate globally")

    // Method 3: Direct emission to all clients
    if (isDoctorUpdating) {
      io.emit("directAppointmentStatusUpdate", socketData)
      console.log("Emitted directAppointmentStatusUpdate globally")
    }

    // Return a success response
    return res.status(200).json({
      success: true,
      message: `Appointment ${status} successfully`,
      data: {
        appointment: {
          ...appointment.toObject(),
          notification: notification,
        },
      },
    })
  } catch (error) {
    console.error("Error updating appointment status:", error)
    return res.status(500).json({
      success: false,
      message: "Error updating appointment status",
      error: error.message,
    })
  }
}

// Update the getAppointments function to handle date parameter correctly
export const getAppointments = async (req, res) => {
  try {
    const { userId, userType, filter } = req.query

    // Add detailed logging
    console.log("getAppointments request received:", {
      query: req.query,
      user: req.user,
      headers: {
        authorization: req.headers.authorization ? "Present" : "Missing",
        userRole: req.headers["user-role"],
        userHeader: req.headers["user"] ? "Present" : "Missing",
      },
    })

    if (!userId || !["doctor", "patient"].includes(userType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user type or missing user ID",
      })
    }

    // Build query
    const query = {}

    // Set user field based on user type
    if (userType === "doctor") {
      query.doctorId = userId
    } else {
      query.patientId = userId
    }

    // Apply specific filters
    if (filter === "today") {
      // Get today's date in YYYY-MM-DD format
      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, "0")
      const day = String(today.getDate()).padStart(2, "0")
      const todayFormatted = `${year}-${month}-${day}`

      // Match on dateString for exact date match without timezone issues
      query.dateString = todayFormatted
    } else if (filter === "upcoming") {
      // Get today's date
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // This still uses date for comparison, but we'll handle the output differently
      query.date = { $gte: today }

      // Check if we should include appointments pending confirmation
      const includeConfirmationPending = req.query.includeConfirmationPending === "true"

      if (includeConfirmationPending) {
        query.status = { $in: ["pending", "confirmed", "pending_patient_confirmation"] }
      } else {
        query.status = { $in: ["pending", "confirmed"] }
      }
    } else if (filter === "past") {
      // Get today's date
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // This still uses date for comparison, but we'll handle the output differently
      query.date = { $lt: today }
    } else if (filter === "cancelled") {
      query.status = "cancelled"
    } else if (filter === "current") {
      // Get today's date in YYYY-MM-DD format
      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, "0")
      const day = String(today.getDate()).padStart(2, "0")
      const todayFormatted = `${year}-${month}-${day}`

      // Match on dateString for exact date match without timezone issues
      query.dateString = todayFormatted

      // Only include in-progress or confirmed appointments
      query.status = { $in: ["in-progress", "confirmed"] }
    }

    console.log("Query built:", query)

    // Execute query with population
    const appointments = await Appointment.find(query)
      .sort({ date: 1, "timeSlot.startTime": 1 })
      .populate(userType === "doctor" ? "patientId" : "doctorId", "firstName lastName email profileImage")

    console.log(`Found ${appointments.length} appointments`)

    // Format response data with null checks
    const formattedAppointments = appointments.map((appointment) => {
      // Use dateString if available, otherwise format date
      const formattedDate = appointment.dateString || formatDateToString(appointment.date)

      // Add null checks for populated documents
      const populatedEntity = userType === "doctor" ? appointment.patientId : appointment.doctorId

      // Create safe default values if the populated entity is null
      const entityName = populatedEntity
        ? userType === "doctor"
          ? `${populatedEntity.firstName || "Unknown"} ${populatedEntity.lastName || "Patient"}`
          : `Dr. ${populatedEntity.firstName || "Unknown"} ${populatedEntity.lastName || "Doctor"}`
        : userType === "doctor"
          ? "Unknown Patient"
          : "Unknown Doctor"

      const entityEmail = populatedEntity ? populatedEntity.email : "no-email@example.com"
      const entityImage = populatedEntity ? populatedEntity.profileImage : null

      return {
        id: appointment._id,
        date: formattedDate, // Use the dateString or properly formatted date
        timeSlot: appointment.timeSlot,
        status: appointment.status,
        type: appointment.type || "regular",
        consultationType: appointment.consultationType || "in-person",
        symptoms: appointment.symptoms,
        diagnosis: appointment.diagnosis,
        prescription: appointment.prescription,
        notes: appointment.notes,
        paymentStatus: appointment.paymentStatus || "pending",
        doctorId: appointment.doctorId,
        patientId: appointment.patientId,
        doctorName: userType === "patient" ? entityName : undefined,
        patientName: userType === "doctor" ? entityName : undefined,
        patientEmail: userType === "doctor" ? entityEmail : undefined,
        doctorEmail: userType === "patient" ? entityEmail : undefined,
        patientImage: userType === "doctor" ? entityImage : undefined,
        doctorImage: userType === "patient" ? entityImage : undefined,
        statusHistory: appointment.statusHistory || [],
      }
    })

    res.status(200).json({
      success: true,
      appointments: formattedAppointments,
    })
  } catch (error) {
    console.error("Error fetching appointments:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching appointments",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    })
  }
}

// Update the rescheduleAppointment function to set the status to pending_patient_confirmation when a doctor reschedules
export const rescheduleAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params
    const { newDate, newTimeSlot } = req.body
    const userId = req.user.id
    const userType = req.user.role || req.user.userType

    // Validate date and time
    let appointmentDate
    let formattedDate

    try {
      // Handle date string directly to avoid timezone shifts
      if (isValidDateFormat(newDate)) {
        // Store the formatted date string exactly as provided
        formattedDate = newDate

        // Create date object with fixed time
        const [year, month, day] = newDate.split("-").map(Number)
        appointmentDate = new Date(
          `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}T12:00:00.000Z`,
        )
      } else {
        // For other formats, create a date and format it to prevent timezone shifts
        const tempDate = new Date(newDate)
        if (isNaN(tempDate.getTime())) {
          throw new Error("Invalid date")
        }

        // Format to YYYY-MM-DD
        const year = tempDate.getFullYear()
        const month = String(tempDate.getMonth() + 1).padStart(2, "0")
        const day = String(tempDate.getDate()).padStart(2, "0")
        formattedDate = `${year}-${month}-${day}`

        // Create date with fixed time
        appointmentDate = new Date(`${formattedDate}T12:00:00.000Z`)
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      })
    }

    // Find the appointment
    const appointment = await Appointment.findById(appointmentId)
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      })
    }

    // Check authorization
    const isDoctor = userType === "doctor" && appointment.doctorId.toString() === userId
    const isPatient = userType === "patient" && appointment.patientId.toString() === userId

    if (!isDoctor && !isPatient) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to reschedule this appointment",
      })
    }

    // Check if the appointment can be rescheduled
    if (!["pending", "confirmed"].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot reschedule appointment with status: ${appointment.status}`,
      })
    }

    // Check slot availability
    const availabilityCheck = await isSlotAvailable(
      appointment.doctorId,
      appointmentDate,
      newTimeSlot.startTime,
      newTimeSlot.endTime,
    )

    if (!availabilityCheck.available) {
      const alternativeSlots = await findAlternativeSlots(appointment.doctorId, appointmentDate, newTimeSlot.startTime)

      return res.status(409).json({
        success: false,
        message: `Slot unavailable: ${availabilityCheck.reason}`,
        alternativeSlots,
        reason: availabilityCheck.reason,
      })
    }

    // Store old values for notification
    const oldDate = formatDateToString(appointment.date)
    const oldTime = appointment.timeSlot.startTime

    // Store the requested new date and time without immediately applying them
    appointment.requestedReschedule = {
      date: appointmentDate,
      timeSlot: newTimeSlot,
      requestedBy: userType,
      requestedAt: new Date(),
    }

    // If doctor is rescheduling, set status to pending_patient_confirmation
    // If patient is rescheduling, set status to pending_reschedule
    if (isDoctor) {
      appointment.status = "pending_patient_confirmation"

      // Update appointment with new date and time
      appointment.date = appointmentDate
      appointment.dateString = formattedDate
      appointment.timeSlot = newTimeSlot
    } else {
      // For patient-initiated reschedules, we still need to store the requested values
      appointment.status = "pending_reschedule"

      // Store the requested reschedule information with both formats
      appointment.requestedReschedule = {
        date: appointmentDate,
        dateString: formattedDate,
        timeSlot: newTimeSlot,
        requestedBy: userType,
        requestedAt: new Date(),
      }
    }

    appointment.lastUpdated = new Date()
    // Reset the reminderSent flag when rescheduling
    appointment.reminderSent = false

    // Add to status history
    appointment.statusHistory.push({
      status: isDoctor ? "pending_patient_confirmation" : "pending_reschedule",
      timestamp: new Date(),
      updatedBy: userId,
      updatedByModel: userType === "doctor" ? "doctor_user" : "patient_user",
      notes: `Reschedule requested from ${oldDate} ${oldTime} to ${formattedDate} ${newTimeSlot.startTime}`,
    })

    await appointment.save()

    // Create notifications
    let notificationRecipient, recipientModel, notificationTitle, notificationMessage

    if (isDoctor) {
      notificationRecipient = appointment.patientId
      recipientModel = "patient_user"
      notificationTitle = "Appointment Rescheduled"
      notificationMessage = `Your appointment has been rescheduled by the doctor from ${oldDate} at ${oldTime} to ${formattedDate} at ${newTimeSlot.startTime}. Please confirm the new timing.`
    } else {
      notificationRecipient = appointment.doctorId
      recipientModel = "doctor_user"
      notificationTitle = "Reschedule Request"
      notificationMessage = `Patient has requested to reschedule appointment from ${oldDate} at ${oldTime} to ${formattedDate} at ${newTimeSlot.startTime}.`
    }

    await Notification.create({
      recipient: notificationRecipient,
      recipientModel,
      type: "APPOINTMENT",
      title: notificationTitle,
      message: notificationMessage,
      metadata: {
        appointmentId: appointment._id,
        oldDate,
        oldTime,
        newDate: formattedDate,
        newTime: newTimeSlot.startTime,
        updatedBy: userId,
        requiresConfirmation: isDoctor,
        requiresApproval: isPatient,
      },
    })

    // Emit socket event for real-time updates
    const recipientSocketRoom = isDoctor ? `patient-${appointment.patientId}` : `doctor-${appointment.doctorId}`
    io.to(recipientSocketRoom).emit("appointmentRescheduleRequested", {
      appointmentId: appointment._id,
      oldDate,
      oldTime,
      newDate: formattedDate,
      newTime: newTimeSlot.startTime,
      updatedBy: userId,
      updatedByName: req.user.firstName + " " + req.user.lastName,
      requiresConfirmation: isDoctor,
      requiresApproval: isPatient,
    })

    // If doctor is rescheduling, update availability for old and new slots
    if (isDoctor) {
      await updateAvailabilityForReschedule(
        appointment.doctorId,
        oldDate,
        oldTime,
        formattedDate,
        newTimeSlot.startTime,
        appointment._id,
        appointment.patientId,
      )
    }

    // Send email notification
    try {
      // Fetch patient and doctor details for the email
      const populatedAppointment = await Appointment.findById(appointmentId)
        .populate("patientId", "firstName lastName email")
        .populate("doctorId", "firstName lastName email")

      if (populatedAppointment) {
        const patientName = `${populatedAppointment.patientId.firstName} ${populatedAppointment.patientId.lastName}`
        const doctorName = `${populatedAppointment.doctorId.firstName} ${populatedAppointment.doctorId.lastName}`

        if (isPatient) {
          // Send email to doctor about patient's reschedule request
          const doctorEmail = populatedAppointment.doctorId.email
          await sendRescheduleRequestEmail(
            doctorEmail,
            doctorName,
            patientName,
            oldDate,
            oldTime,
            formattedDate,
            newTimeSlot.startTime,
          )
          console.log(`Reschedule request email sent to doctor: ${doctorEmail}`)
        } else if (isDoctor) {
          // Send email to patient about doctor's reschedule
          const patientEmail = populatedAppointment.patientId.email
          await sendAppointmentRescheduleEmail(
            patientEmail,
            patientName,
            doctorName,
            oldDate,
            oldTime,
            formattedDate,
            newTimeSlot.startTime,
            "doctor",
          )
          console.log(`Reschedule email sent to patient: ${patientEmail}`)
        }
      }
    } catch (emailError) {
      console.error("Error sending reschedule notification email:", emailError)
      // Don't fail the request if email sending fails
    }

    res.status(200).json({
      success: true,
      message: isPatient ? "Reschedule request sent to doctor" : "Appointment rescheduled successfully",
      data: {
        appointment,
      },
    })
  } catch (error) {
    console.error("Error rescheduling appointment:", error)
    res.status(500).json({
      success: false,
      message: "Error rescheduling appointment",
      error: error.message,
    })
  }
}

// Helper function to update availability when rescheduling
async function updateAvailabilityForReschedule(doctorId, oldDate, oldTime, newDate, newTime, appointmentId, patientId) {
  try {
    // Free up old slot
    const oldAvailability = await Availability.findOne({
      doctorId,
      date: {
        $gte: new Date(`${oldDate}T00:00:00.000+05:30`),
        $lt: new Date(`${oldDate}T23:59:59.999+05:30`),
      },
    })

    if (oldAvailability) {
      const updatedOldSlots = oldAvailability.timeSlots.map((slot) => {
        if (slot.startTime === oldTime) {
          return {
            ...slot,
            isBooked: false,
            appointmentId: null,
            patientId: null,
          }
        }
        return slot
      })

      oldAvailability.timeSlots = updatedOldSlots
      await oldAvailability.save()
    }

    // Book new slot
    const newAvailability = await Availability.findOne({
      doctorId,
      date: {
        $gte: new Date(`${newDate}T00:00:00.000+05:30`),
        $lt: new Date(`${newDate}T23:59:59.999+05:30`),
      },
    })

    if (newAvailability) {
      const updatedNewSlots = newAvailability.timeSlots.map((slot) => {
        if (slot.startTime === newTime) {
          return {
            ...slot,
            isBooked: true,
            appointmentId,
            patientId,
          }
        }
        return slot
      })

      newAvailability.timeSlots = updatedNewSlots
      await newAvailability.save()
    }

    // Broadcast availability updates
    io.emit("availabilityUpdated", {
      doctorId,
      date: oldDate,
      availability: oldAvailability,
    })

    io.emit("availabilityUpdated", {
      doctorId,
      date: newDate,
      availability: newAvailability,
    })
  } catch (error) {
    console.error("Error updating availability for reschedule:", error)
    throw error
  }
}

// Add the updatePaymentStatus function to the appointment controller
export const updatePaymentStatus = async (req, res) => {
  try {
    const { appointmentId } = req.params
    const { paymentStatus, paymentAmount, paymentMethod, transactionId } = req.body
    const userId = req.user.id
    const userType = req.user.role

    // Validate payment status
    const validPaymentStatuses = ["pending", "completed", "refunded"]
    if (!validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status",
      })
    }

    // Find the appointment
    const appointment = await Appointment.findById(appointmentId)
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      })
    }

    // Check authorization
    const isDoctor = userType === "doctor" && appointment.doctorId.toString() === userId
    const isPatient = userType === "patient" && appointment.patientId.toString() === userId

    if (!isDoctor && !isPatient) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update payment status",
      })
    }

    // Update payment status
    appointment.paymentStatus = paymentStatus
    if (paymentAmount) appointment.paymentAmount = paymentAmount

    // Add payment metadata if provided
    if (paymentMethod || transactionId) {
      appointment.paymentDetails = {
        ...(appointment.paymentDetails || {}),
        paymentMethod,
        transactionId,
        updatedAt: new Date(),
        updatedBy: userId,
      }
    }

    await appointment.save()

    // Create notification for the other party
    const notificationRecipient = isDoctor ? appointment.patientId : appointment.doctorId
    const recipientModel = isDoctor ? "patient_user" : "doctor_user"

    await Notification.create({
      recipient: notificationRecipient,
      recipientModel,
      type: "SYSTEM", // Changed from "PAYMENT_STATUS" to "SYSTEM"
      title: `Payment ${paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)}`,
      message: `Payment for appointment on ${formatDateToString(appointment.date)} has been marked as ${paymentStatus}`,
      metadata: {
        appointmentId: appointment._id,
        paymentStatus,
        paymentAmount,
        transactionId,
        updatedBy: userId,
      },
    })

    // Emit socket event for real-time updates
    const recipientSocketRoom = isDoctor ? `patient-${appointment.patientId}` : `doctor-${appointment.doctorId}`
    io.to(recipientSocketRoom).emit("paymentStatusUpdated", {
      appointmentId: appointment._id,
      paymentStatus,
      updatedBy: userId,
      updatedByName: req.user.firstName + " " + req.user.lastName,
    })

    res.status(200).json({
      success: true,
      data: {
        appointment,
      },
    })
  } catch (error) {
    console.error("Error updating payment status:", error)
    res.status(500).json({
      success: false,
      message: "Error updating payment status",
      error: error.message,
    })
  }
}

// Add this function to handle patient confirmation of rescheduled appointments
export const confirmRescheduledAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params
    const { action } = req.body // 'confirm' or 'reject'
    const userId = req.user.id
    const userType = req.user.role || req.user.userType

    console.log("Confirm reschedule request:", {
      appointmentId,
      action,
      userId,
      userType,
      user: req.user,
      headers: req.headers,
      body: req.body,
    })

    // Find the appointment
    const appointment = await Appointment.findById(appointmentId)
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      })
    }

    console.log("Found appointment:", {
      id: appointment._id,
      patientId: appointment.patientId.toString(),
      doctorId: appointment.doctorId.toString(),
      status: appointment.status,
    })

    // Check authorization - only the patient can confirm their own appointment
    if (userType !== "patient" || appointment.patientId.toString() !== userId) {
      console.log("Authorization failed:", {
        userType,
        requestUserId: userId,
        appointmentPatientId: appointment.patientId.toString(),
        match: appointment.patientId.toString() === userId,
      })

      return res.status(403).json({
        success: false,
        message: "Unauthorized to confirm this appointment",
        details: {
          userType,
          userId,
          appointmentPatientId: appointment.patientId.toString(),
        },
      })
    }

    // Update appointment status based on patient's action
    if (action === "confirm") {
      appointment.status = "confirmed"

      // Add to status history
      appointment.statusHistory.push({
        status: "confirmed",
        timestamp: new Date(),
        updatedBy: userId,
        updatedByModel: "patient_user",
        notes: "Patient confirmed rescheduled appointment",
      })
    } else if (action === "reject") {
      appointment.status = "cancelled"
      appointment.cancelledBy = "patient"
      appointment.cancelReason = "Patient rejected rescheduled appointment"

      // Add to status history
      appointment.statusHistory.push({
        status: "cancelled",
        timestamp: new Date(),
        updatedBy: userId,
        updatedByModel: "patient_user",
        notes: "Patient rejected rescheduled appointment",
      })
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid action. Must be 'confirm' or 'reject'",
      })
    }

    await appointment.save()

    // Create notification for the doctor
    const notificationTitle =
      action === "confirm" ? "Rescheduled Appointment Confirmed" : "Rescheduled Appointment Rejected"

    const notificationMessage =
      action === "confirm"
        ? `Patient has confirmed the rescheduled appointment on ${formatDateToString(appointment.date)} at ${appointment.timeSlot.startTime}`
        : `Patient has rejected the rescheduled appointment on ${formatDateToString(appointment.date)} at ${appointment.timeSlot.startTime}`

    await Notification.create({
      recipient: appointment.doctorId,
      recipientModel: "doctor_user",
      type: "APPOINTMENT",
      title: notificationTitle,
      message: notificationMessage,
      metadata: {
        appointmentId: appointment._id,
        action,
        updatedBy: userId,
      },
    })

    // Emit socket event for real-time updates
    io.to(`doctor-${appointment.doctorId}`).emit("appointmentConfirmationUpdate", {
      appointmentId: appointment._id,
      action,
      status: appointment.status,
      updatedBy: userId,
      date: formatDateToString(appointment.date),
      time: appointment.timeSlot.startTime,
    })

    // If rejected, update availability to free up the slot
    if (action === "reject") {
      const formattedDate = formatDateToString(appointment.date)
      const availability = await Availability.findOne({
        doctorId: appointment.doctorId,
        date: {
          $gte: new Date(`${formattedDate}T00:00:00.000+05:30`),
          $lt: new Date(`${formattedDate}T23:59:59.999+05:30`),
        },
      })

      if (availability) {
        const updatedSlots = availability.timeSlots.map((slot) => {
          if (slot.startTime === appointment.timeSlot.startTime) {
            return {
              ...slot,
              isBooked: false,
              appointmentId: null,
              patientId: null,
            }
          }
          return slot
        })

        availability.timeSlots = updatedSlots
        await availability.save()

        // Broadcast availability update
        io.emit("availabilityUpdated", {
          doctorId: appointment.doctorId,
          date: formattedDate,
          timeSlots: updatedSlots,
        })
      }
    }

    res.status(200).json({
      success: true,
      message:
        action === "confirm"
          ? "Rescheduled appointment confirmed successfully"
          : "Rescheduled appointment rejected successfully",
      data: {
        appointment,
      },
    })
  } catch (error) {
    console.error("Error confirming rescheduled appointment:", error)
    res.status(500).json({
      success: false,
      message: "Error confirming rescheduled appointment",
      error: error.message,
    })
  }
}

// Helper function to send reschedule request email
const sendRescheduleRequestEmail = async (doctorEmail, doctorName, patientName, oldDate, oldTime, newDate, newTime) => {
  const subject = `Appointment Reschedule Request - Mcare`

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: doctorEmail,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4a5568;">Hello, Dr. ${doctorName}!</h1>
        <p>Patient <strong>${patientName}</strong> has requested to reschedule their appointment.</p>
        <div style="background-color: #f7fafc; border-left: 4px solid #e53e3e; padding: 15px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Current Schedule:</strong> ${oldDate} at ${oldTime}</p>
        </div>
        <div style="background-color: #f7fafc; border-left: 4px solid #38a169; padding: 15px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Requested New Schedule:</strong> ${newDate} at ${newTime}</p>
        </div>
        <p>Please log in to your dashboard to approve or reject this reschedule request.</p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/doctor-dashboard/appointments" 
             style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Manage Appointments
          </a>
        </div>
        <p>Thank you for using Mcare!</p>
        <p>Best regards,<br>The Mcare Team</p>
      </div>
    `,
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log(`Reschedule request email sent successfully to doctor: ${doctorEmail}`)
    return true
  } catch (error) {
    console.error(`Error sending reschedule request email:`, error)
    return false
  }
}

// Add this function to handle doctor's response to reschedule requests
export const respondToRescheduleRequest = async (req, res) => {
  try {
    const { appointmentId } = req.params
    const { action } = req.body // 'approve' or 'reject'
    const userId = req.user.id
    const userType = req.user.role || req.user.userType

    console.log("Respond to reschedule request:", {
      appointmentId,
      action,
      userId,
      userType,
      user: req.user,
    })

    // Find the appointment
    const appointment = await Appointment.findById(appointmentId)
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      })
    }

    // Check authorization - only the doctor can respond to reschedule requests
    if (userType !== "doctor" || appointment.doctorId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to respond to this reschedule request",
      })
    }

    // Check if the appointment is in pending_reschedule status
    if (appointment.status !== "pending_reschedule") {
      return res.status(400).json({
        success: false,
        message: "This appointment is not pending reschedule",
      })
    }

    // Get the requested reschedule details
    if (!appointment.requestedReschedule) {
      return res.status(400).json({
        success: false,
        message: "No reschedule request found for this appointment",
      })
    }

    const oldDate = formatDateToString(appointment.date)
    const oldTime = appointment.timeSlot.startTime
    const newDate = formatDateToString(appointment.requestedReschedule.date)
    const newTime = appointment.requestedReschedule.timeSlot.startTime

    // Update appointment based on doctor's action
    if (action === "approve") {
      // Apply the requested changes, including both date formats
      appointment.date = appointment.requestedReschedule.date
      appointment.dateString = appointment.requestedReschedule.dateString
      appointment.timeSlot = appointment.requestedReschedule.timeSlot
      appointment.status = "confirmed"

      // Add to status history
      appointment.statusHistory.push({
        status: "confirmed",
        timestamp: new Date(),
        updatedBy: userId,
        updatedByModel: "doctor_user",
        notes: "Doctor approved reschedule request",
      })

      // Update availability for old and new slots
      await updateAvailabilityForReschedule(
        appointment.doctorId,
        oldDate,
        oldTime,
        newDate,
        newTime,
        appointment._id,
        appointment.patientId,
      )
    } else if (action === "reject") {
      // Keep the original date and time, just update status
      appointment.status = "confirmed"

      // Add to status history
      appointment.statusHistory.push({
        status: "confirmed",
        timestamp: new Date(),
        updatedBy: userId,
        updatedByModel: "doctor_user",
        notes: "Doctor rejected reschedule request",
      })
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid action. Must be 'approve' or 'reject'",
      })
    }

    // Clear the reschedule request
    appointment.requestedReschedule = undefined
    appointment.lastUpdated = new Date()
    await appointment.save()

    // Create notification for the patient
    const notificationTitle = action === "approve" ? "Reschedule Request Approved" : "Reschedule Request Rejected"
    const notificationMessage =
      action === "approve"
        ? `Your request to reschedule appointment from ${oldDate} at ${oldTime} to ${newDate} at ${newTime} has been approved.`
        : `Your request to reschedule appointment from ${oldDate} at ${oldTime} to ${newDate} at ${newTime} has been rejected.`

    await Notification.create({
      recipient: appointment.patientId,
      recipientModel: "patient_user",
      type: "APPOINTMENT",
      title: notificationTitle,
      message: notificationMessage,
      metadata: {
        appointmentId: appointment._id,
        action,
        updatedBy: userId,
      },
    })

    // Emit socket event for real-time updates
    io.to(`patient-${appointment.patientId}`).emit("rescheduleRequestResponse", {
      appointmentId: appointment._id,
      action,
      status: appointment.status,
      updatedBy: userId,
      oldDate,
      oldTime,
      newDate: action === "approve" ? newDate : oldDate,
      newTime: action === "approve" ? newTime : oldTime,
    })

    // Send email notification to patient
    try {
      // Fetch patient and doctor details for the email
      const populatedAppointment = await Appointment.findById(appointmentId)
        .populate("patientId", "firstName lastName email")
        .populate("doctorId", "firstName lastName")

      if (populatedAppointment && populatedAppointment.patientId) {
        const patientEmail = populatedAppointment.patientId.email
        const patientName = `${populatedAppointment.patientId.firstName} ${populatedAppointment.patientId.lastName}`
        const doctorName = `${populatedAppointment.doctorId.firstName} ${populatedAppointment.doctorId.lastName}`

        // Send email notification
        await sendRescheduleResponseEmail(
          patientEmail,
          patientName,
          doctorName,
          action,
          oldDate,
          oldTime,
          newDate,
          newTime,
        )
      }
    } catch (emailError) {
      console.error("Error sending reschedule response email:", emailError)
      // Don't fail the request if email sending fails
    }

    res.status(200).json({
      success: true,
      message:
        action === "approve" ? "Reschedule request approved successfully" : "Reschedule request rejected successfully",
      data: {
        appointment,
      },
    })
  } catch (error) {
    console.error("Error responding to reschedule request:", error)
    res.status(500).json({
      success: false,
      message: "Error responding to reschedule request",
      error: error.message,
    })
  }
}

// Helper function to send reschedule response email
const sendRescheduleResponseEmail = async (
  patientEmail,
  patientName,
  doctorName,
  action,
  oldDate,
  oldTime,
  newDate,
  newTime,
) => {
  const subject = `Reschedule Request ${action === "approve" ? "Approved" : "Rejected"} - Mcare`

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: patientEmail,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4a5568;">Hello, ${patientName}!</h1>
        <p>Your request to reschedule your appointment with Dr. ${doctorName} has been <strong>${action === "approve" ? "approved" : "rejected"}</strong>.</p>
        
        <div style="background-color: #f7fafc; border-left: 4px solid #e53e3e; padding: 15px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Original Schedule:</strong> ${oldDate} at ${oldTime}</p>
        </div>
        
        ${
          action === "approve"
            ? `
        <div style="background-color: #f7fafc; border-left: 4px solid #38a169; padding: 15px; margin: 20px 0;">
          <p style="margin: 0;"><strong>New Schedule:</strong> ${newDate} at ${newTime}</p>
        </div>
        `
            : `
        <p>Your appointment will remain scheduled for the original date and time.</p>
        `
        }
        
        <div style="text-align: center; margin: 25px 0;">
          <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/patient-dashboard/appointments" 
             style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View Appointments
          </a>
        </div>
        
        <p>Thank you for choosing Mcare!</p>
        <p>Best regards,<br>The Mcare Team</p>
      </div>
    `,
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log(`Reschedule response email sent successfully to ${patientEmail}`)
    return true
  } catch (error) {
    console.error(`Error sending reschedule response email:`, error)
    return false
  }
}

// Add this new function to the exports at the end of the file
export const getCurrentAppointment = async (req, res) => {
  try {
    const { doctorId } = req.params

    // Get today's date in YYYY-MM-DD format to avoid timezone issues
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, "0")
    const day = String(today.getDate()).padStart(2, "0")
    const todayFormatted = `${year}-${month}-${day}`

    // Get current time in HH:MM format
    const currentHour = today.getHours().toString().padStart(2, "0")
    const currentMinute = today.getMinutes().toString().padStart(2, "0")
    const currentTime = `${currentHour}:${currentMinute}`

    console.log(`Searching for current appointment for doctor ${doctorId} on ${todayFormatted} at ${currentTime}`)

    // First try to find an in-progress appointment
    let appointment = await Appointment.findOne({
      doctorId,
      dateString: todayFormatted,
      status: "in-progress",
    }).populate("patientId", "firstName lastName email profileImage")

    // If no in-progress appointment, find the next confirmed appointment for today
    if (!appointment) {
      appointment = await Appointment.findOne({
        doctorId,
        dateString: todayFormatted,
        status: "confirmed",
        "timeSlot.startTime": { $lte: currentTime },
      })
        .sort({ "timeSlot.startTime": 1 })
        .populate("patientId", "firstName lastName email profileImage")
    }

    // If still no appointment, find the earliest confirmed appointment for today
    if (!appointment) {
      appointment = await Appointment.findOne({
        doctorId,
        dateString: todayFormatted,
        status: "confirmed",
      })
        .sort({ "timeSlot.startTime": 1 })
        .populate("patientId", "firstName lastName email profileImage")
    }

    if (!appointment) {
      return res.status(200).json({
        success: true,
        message: "No current appointment found",
        appointment: null,
      })
    }

    res.status(200).json({
      success: true,
      appointment,
    })
  } catch (error) {
    console.error("Error fetching current appointment:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching current appointment",
      error: error.message,
    })
  }
}

