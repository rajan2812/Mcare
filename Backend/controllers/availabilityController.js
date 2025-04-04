import { Appointment } from "../model/appointmentModel.js"
import { Availability } from "../model/availabilityModel.js"
import { DoctorUser } from "../model/usermodal.js"
import { Notification } from "../model/notificationModel.js"
import { io } from "../server.js"

// Add this constant at the top of the file, after the imports
const TIMEZONE = "Asia/Kolkata" // Mumbai, India timezone

// Add these helper functions at the top
// Update the formatISODate function to use the India timezone
const formatISODate = (date) => {
  // Create a date object
  const d = new Date(date)
  // Format to YYYY-MM-DD in India timezone
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(d)
    .replace(/\//g, "-")
}

// Update the validateAndParseDate function
const validateAndParseDate = (dateString) => {
  const date = new Date(dateString)
  if (isNaN(date.getTime())) {
    throw new Error("Invalid date format")
  }
  // Set to midnight in India timezone
  const options = { timeZone: TIMEZONE }
  const indiaDate = new Date(new Intl.DateTimeFormat("en-US", options).format(date))
  indiaDate.setHours(0, 0, 0, 0)
  return indiaDate
}

// Helper function to validate date format (YYYY-MM-DD)
const isValidDateFormat = (dateString) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/
  return regex.test(dateString)
}

// Update the formatDateToString function
const formatDateToString = (date) => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(date)
    .replace(/\//g, "-")
}

// Update the parseDate function to handle India timezone
const parseDate = (dateInput) => {
  // If input is already a Date object
  if (dateInput instanceof Date) {
    return new Date(dateInput)
  }

  // If input is a string
  if (typeof dateInput === "string") {
    // First try YYYY-MM-DD format
    if (isValidDateFormat(dateInput)) {
      // Parse the date in India timezone
      const [year, month, day] = dateInput.split("-").map(Number)
      // Create date with fixed time to avoid timezone issues
      const date = new Date(
        `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}T12:00:00.000+05:30`,
      )
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

// Helper function to validate time format (HH:mm)
const isValidTimeFormat = (time) => {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
  return timeRegex.test(time)
}

// Helper function to convert time to minutes for comparison
const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

// Helper function to check for overlapping time ranges
const isOverlapping = (range1, range2) => {
  const start1 = timeToMinutes(range1.start)
  const end1 = timeToMinutes(range1.end)
  const start2 = timeToMinutes(range2.start)
  const end2 = timeToMinutes(range2.end)

  return start1 < end2 && start2 < end1
}

// Helper function to validate working hours
const validateWorkingHours = (regularHours, emergencyHours = null) => {
  if (!isValidTimeFormat(regularHours.start) || !isValidTimeFormat(regularHours.end)) {
    throw new Error("Invalid time format. Use HH:mm format")
  }

  const regularStart = timeToMinutes(regularHours.start)
  const regularEnd = timeToMinutes(regularHours.end)

  if (regularStart >= regularEnd) {
    throw new Error("End time must be after start time")
  }

  if (emergencyHours) {
    if (!isValidTimeFormat(emergencyHours.start) || !isValidTimeFormat(emergencyHours.end)) {
      throw new Error("Invalid emergency hours time format")
    }

    const emergencyStart = timeToMinutes(emergencyHours.start)
    const emergencyEnd = timeToMinutes(emergencyHours.end)

    if (emergencyStart >= emergencyEnd) {
      throw new Error("Emergency hours end time must be after start time")
    }
  }

  return true
}

// Helper function to validate breaks
const validateBreaks = (breaks, workingHours) => {
  const validatedBreaks = []
  const workStart = timeToMinutes(workingHours.start)
  const workEnd = timeToMinutes(workingHours.end)

  for (const breakItem of breaks) {
    // Validate break time format
    if (!isValidTimeFormat(breakItem.startTime) || !isValidTimeFormat(breakItem.endTime)) {
      throw new Error("Invalid break time format. Use HH:mm format")
    }

    const breakStart = timeToMinutes(breakItem.startTime)
    const breakEnd = timeToMinutes(breakItem.endTime)

    // Validate break duration
    if (breakStart >= breakEnd) {
      throw new Error("Break end time must be after start time")
    }

    // Validate break is within working hours
    if (breakStart < workStart || breakEnd > workEnd) {
      throw new Error("Breaks must be within working hours")
    }

    // Check for overlap with existing breaks
    for (const existingBreak of validatedBreaks) {
      if (
        isOverlapping(
          { start: breakItem.startTime, end: breakItem.endTime },
          { start: existingBreak.startTime, end: existingBreak.endTime },
        )
      ) {
        throw new Error("Breaks cannot overlap")
      }
    }

    validatedBreaks.push(breakItem)
  }

  return validatedBreaks
}

// Helper function to check for appointment conflicts
const checkForAppointmentConflicts = async (doctorId, date, startTime, endTime) => {
  const appointments = await Appointment.find({
    doctorId,
    date,
    status: { $in: ["confirmed", "scheduled"] },
    "timeSlot.startTime": { $lt: endTime },
    "timeSlot.endTime": { $gt: startTime },
  })

  return appointments
}

// Helper function to generate time slots
const generateTimeSlots = (workHours, slotDuration = 30) => {
  const slots = []
  const startTime = new Date(`2000-01-01T${workHours.start}:00`)
  const endTime = new Date(`2000-01-01T${workHours.end}:00`)

  while (startTime < endTime) {
    const slot = {
      startTime: startTime.toTimeString().slice(0, 5),
      endTime: new Date(startTime.getTime() + slotDuration * 60000).toTimeString().slice(0, 5),
      isBooked: false,
      isBreak: false,
      type: "regular",
    }
    slots.push(slot)
    startTime.setMinutes(startTime.getMinutes() + slotDuration)
  }

  return slots
}

// Add this helper function for date validation
const isValidDate = (dateString) => {
  const date = new Date(dateString)
  return date instanceof Date && !isNaN(date.getTime())
}

// Update the formatDate helper function
const formatDate = (date) => {
  const d = new Date(date)
  // Format in India timezone
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(d)
    .replace(/\//g, "-")
}

// Update the getAvailability function to handle date parameter correctly
export const getAvailability = async (req, res) => {
  try {
    const { doctorId, date } = req.params

    // Validate and parse date properly
    let availabilityDate
    let formattedDate

    try {
      // Handle date string directly to avoid timezone shifts
      if (isValidDateFormat(date)) {
        // For YYYY-MM-DD format, create a date in India timezone
        const [year, month, day] = date.split("-").map(Number)
        availabilityDate = new Date(
          `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}T12:00:00.000+05:30`,
        )
        formattedDate = date
      } else {
        // For other formats, create a date and format it in India timezone
        const tempDate = new Date(date)
        formattedDate = formatDateToString(tempDate)
        availabilityDate = new Date(`${formattedDate}T12:00:00.000+05:30`)
      }

      if (isNaN(availabilityDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format",
        })
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format",
      })
    }

    // Find availability for the specific date in India timezone
    let availability = await Availability.findOne({
      doctorId,
      date: {
        $gte: new Date(`${formattedDate}T00:00:00.000+05:30`),
        $lt: new Date(`${formattedDate}T23:59:59.999+05:30`),
      },
    })

    if (!availability) {
      // Get doctor info to use their working hours if available
      const doctor = await DoctorUser.findById(doctorId).select("workingHours").lean()

      // Create default availability
      const defaultAvailability = {
        date: formattedDate,
        isAvailable: true,
        regularHours: doctor?.workingHours || { start: "09:00", end: "17:00" },
        emergencyHours: null,
        breaks: [],
        timeSlots: [],
      }

      // Generate default time slots
      const slots = []
      const start = new Date(`2000-01-01T${defaultAvailability.regularHours.start}`)
      const end = new Date(`2000-01-01T${defaultAvailability.regularHours.end}`)

      while (start < end) {
        slots.push({
          startTime: start.toTimeString().slice(0, 5),
          endTime: new Date(start.getTime() + 30 * 60000).toTimeString().slice(0, 5),
          isBooked: false,
          isBreak: false,
        })
        start.setMinutes(start.getMinutes() + 30)
      }

      defaultAvailability.timeSlots = slots

      // Create and save the new availability with the correct date
      availability = new Availability({
        doctorId,
        date: new Date(`${formattedDate}T12:00:00.000+05:30`),
        isAvailable: true,
        regularHours: defaultAvailability.regularHours,
        breaks: [],
        timeSlots: slots,
        timezone: TIMEZONE,
      })

      await availability.save()

      return res.status(200).json({
        success: true,
        data: defaultAvailability,
      })
    }

    res.status(200).json({
      success: true,
      data: availability,
    })
  } catch (error) {
    console.error("Error fetching availability:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching availability",
      error: error.message,
    })
  }
}

// Update setAvailability to handle timezone and emergency hours
export const setAvailability = async (req, res) => {
  try {
    const doctorId = req.user.id
    const { date, regularHours, emergencyHours, breaks = [], isAvailable = true } = req.body

    // Validate date
    let availabilityDate
    let formattedDate

    try {
      // Handle date string directly to avoid timezone shifts
      if (isValidDateFormat(date)) {
        // For YYYY-MM-DD format, create a date in India timezone
        const [year, month, day] = date.split("-").map(Number)
        availabilityDate = new Date(
          `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}T12:00:00.000+05:30`,
        )
        formattedDate = date
      } else {
        // For other formats, create a date and format it in India timezone
        const tempDate = new Date(date)
        formattedDate = formatDateToString(tempDate)
        availabilityDate = new Date(`${formattedDate}T12:00:00.000+05:30`)
      }

      if (isNaN(availabilityDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format",
        })
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format: " + error.message,
      })
    }

    // Validate working hours
    try {
      validateWorkingHours(regularHours, emergencyHours)
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      })
    }

    // Find existing availability or create new
    let availability = await Availability.findOne({
      doctorId,
      date: {
        $gte: new Date(`${formattedDate}T00:00:00.000+05:30`),
        $lt: new Date(`${formattedDate}T23:59:59.999+05:30`),
      },
    })

    if (!availability) {
      availability = new Availability({
        doctorId,
        date: new Date(`${formattedDate}T12:00:00.000+05:30`),
        regularHours,
        emergencyHours,
        isAvailable,
        timezone: TIMEZONE,
      })
    } else {
      availability.regularHours = regularHours
      availability.emergencyHours = emergencyHours
      availability.isAvailable = isAvailable
      availability.timezone = TIMEZONE
    }

    // Generate time slots
    const regularTimeSlots = generateTimeSlots(regularHours)
    const emergencyTimeSlots = emergencyHours ? generateTimeSlots(emergencyHours) : []

    // Mark emergency slots
    emergencyTimeSlots.forEach((slot) => {
      slot.type = "emergency"
    })

    // Combine and sort all time slots
    availability.timeSlots = [...regularTimeSlots, ...emergencyTimeSlots].sort((a, b) =>
      a.startTime.localeCompare(b.startTime),
    )

    // Handle breaks
    if (breaks.length > 0) {
      availability.breaks = breaks
      availability.timeSlots = availability.timeSlots.map((slot) => ({
        ...slot,
        isBreak: breaks.some(
          (breakTime) =>
            timeToMinutes(slot.startTime) >= timeToMinutes(breakTime.startTime) &&
            timeToMinutes(slot.endTime) <= timeToMinutes(breakTime.endTime),
        ),
      }))
    }

    await availability.save()

    // Format the response data
    const responseData = {
      id: availability._id,
      date: formattedDate,
      isAvailable: availability.isAvailable,
      regularHours: availability.regularHours,
      emergencyHours: availability.emergencyHours,
      breaks: availability.breaks,
      timeSlots: availability.timeSlots,
      timezone: TIMEZONE,
    }

    // Emit socket event for real-time updates
    io.emit("doctorAvailabilityUpdated", {
      doctorId,
      date: formattedDate,
      availability: responseData,
    })

    res.status(200).json({
      success: true,
      data: responseData,
    })
  } catch (error) {
    console.error("Error setting availability:", error)
    res.status(500).json({
      success: false,
      message: "Error setting availability",
      error: error.message,
    })
  }
}

// Only updating the setQuickBreak function to fix the workHours vs regularHours issue
export const setQuickBreak = async (req, res) => {
  try {
    const doctorId = req.user.id
    const { startTime, endTime } = req.body

    // Get today's date in India timezone
    const today = new Date()
    const todayIndia = new Intl.DateTimeFormat("en-CA", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .format(today)
      .replace(/\//g, "-")

    // Create date objects for the start and end of the day in India timezone
    const todayStart = new Date(`${todayIndia}T00:00:00.000+05:30`)
    const todayEnd = new Date(`${todayIndia}T23:59:59.999+05:30`)

    // Check for appointment conflicts
    const conflictingAppointments = await checkForAppointmentConflicts(doctorId, todayStart, startTime, endTime)

    if (conflictingAppointments.length > 0) {
      // Create notifications for affected patients
      const notifications = conflictingAppointments.map((appointment) => ({
        recipient: appointment.patientId,
        recipientModel: "patient_user",
        type: "APPOINTMENT",
        title: "Appointment Affected by Doctor Break",
        message: `Your appointment at ${appointment.timeSlot.startTime} needs to be rescheduled due to doctor unavailability.`,
        metadata: {
          appointmentId: appointment._id,
          originalTime: appointment.timeSlot.startTime,
          doctorId,
        },
      }))

      await Notification.insertMany(notifications)

      // Emit socket events for real-time updates
      io.to(`doctor-${doctorId}`).emit("breakConflicts", {
        conflictingAppointments,
        breakTime: { startTime, endTime },
      })

      // Notify affected patients
      conflictingAppointments.forEach((appointment) => {
        io.to(`patient-${appointment.patientId}`).emit("appointmentAffected", {
          appointmentId: appointment._id,
          message: "Your appointment needs to be rescheduled due to doctor unavailability",
        })
      })

      return res.status(409).json({
        success: false,
        message: "Break time conflicts with existing appointments",
        conflicts: conflictingAppointments,
      })
    }

    // If no conflicts, proceed with setting break
    let availability = await Availability.findOne({
      doctorId,
      date: {
        $gte: todayStart,
        $lt: todayEnd,
      },
    })

    if (!availability) {
      const doctor = await DoctorUser.findById(doctorId)
      const regularHours = doctor.workingHours || { start: "09:00", end: "17:00" }

      availability = new Availability({
        doctorId,
        date: new Date(`${todayIndia}T12:00:00.000+05:30`),
        regularHours: regularHours,
        isAvailable: true,
        breaks: [],
        timezone: TIMEZONE,
      })
    }

    // Validate break time is within working hours
    const { start: workStart, end: workEnd } = availability.regularHours
    if (startTime < workStart || endTime > workEnd) {
      return res.status(400).json({
        success: false,
        message: "Break time must be within working hours",
      })
    }

    // Check for overlapping breaks
    const hasOverlap = availability.breaks.some(
      (breakTime) =>
        (startTime >= breakTime.startTime && startTime < breakTime.endTime) ||
        (endTime > breakTime.startTime && endTime <= breakTime.endTime),
    )

    if (hasOverlap) {
      return res.status(400).json({
        success: false,
        message: "Break time overlaps with existing break",
      })
    }

    // Add break
    const newBreak = {
      startTime: startTime.toTimeString().slice(0, 5),
      endTime: endTime.toTimeString().slice(0, 5),
    }

    availability.breaks.push(newBreak)
    await availability.save()

    // Emit socket event for real-time updates
    io.emit("doctorAvailabilityUpdated", {
      doctorId,
      date: todayIndia,
      availability: availability.toObject(),
    })

    res.status(200).json({
      success: true,
      data: availability.toObject(),
    })
  } catch (error) {
    console.error("Error setting quick break:", error)
    res.status(500).json({
      success: false,
      message: "Error setting quick break",
      error: error.message,
    })
  }
}

// Update endBreak to handle India timezone
export const endBreak = async (req, res) => {
  try {
    const doctorId = req.user.id

    // Get today's date in India timezone
    const today = new Date()
    const todayIndia = new Intl.DateTimeFormat("en-CA", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .format(today)
      .replace(/\//g, "-")

    // Create date objects for the start and end of the day in India timezone
    const todayStart = new Date(`${todayIndia}T00:00:00.000+05:30`)
    const todayEnd = new Date(`${todayIndia}T23:59:59.999+05:30`)

    const availability = await Availability.findOne({
      doctorId,
      date: {
        $gte: todayStart,
        $lt: todayEnd,
      },
    })

    if (!availability) {
      return res.status(404).json({
        success: false,
        message: "No availability record found for today",
      })
    }

    // Get current time in India timezone
    const now = new Date()
    const currentTime = new Intl.DateTimeFormat("en-US", {
      timeZone: TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .format(now)
      .replace(/\s/g, "")

    // Remove current break
    availability.breaks = availability.breaks.filter((breakTime) => breakTime.endTime < currentTime)

    // Update time slots while preserving bookings
    availability.timeSlots = availability.timeSlots.map((slot) => ({
      ...slot,
      isBreak: availability.breaks.some(
        (breakTime) => slot.startTime >= breakTime.startTime && slot.endTime <= breakTime.endTime,
      ),
      // Preserve existing booking information
      isBooked: slot.isBooked || false,
      patientId: slot.patientId || null,
      appointmentId: slot.appointmentId || null,
    }))

    await availability.save()

    // Emit socket event
    io.emit("doctorAvailabilityUpdated", {
      doctorId,
      date: todayIndia,
      availability: {
        isAvailable: availability.isAvailable,
        regularHours: availability.regularHours,
        breaks: availability.breaks,
        timeSlots: availability.timeSlots,
        lastUpdated: new Date(),
        timezone: TIMEZONE,
      },
    })

    res.status(200).json({
      success: true,
      data: availability.toObject(),
    })
  } catch (error) {
    console.error("Error ending break:", error)
    res.status(500).json({
      success: false,
      message: "Error ending break",
      error: error.message,
    })
  }
}

// Add this new function to the existing controller
export const getDoctorAvailabilities = async (req, res) => {
  try {
    const { doctorId } = req.params

    // Get today's date in India timezone
    const today = new Date()
    const todayIndia = new Intl.DateTimeFormat("en-CA", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .format(today)
      .replace(/\//g, "-")

    // Create date object for the start of the day in India timezone
    const todayStart = new Date(`${todayIndia}T00:00:00.000+05:30`)

    const availabilities = await Availability.find({
      doctorId,
      date: { $gte: todayStart },
    }).sort({ date: 1 })

    const formattedAvailabilities = availabilities.map((availability) => {
      // Format the date in India timezone
      const availDate = new Date(availability.date)
      const formattedDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
        .format(availDate)
        .replace(/\//g, "-")

      return {
        id: availability._id,
        date: formattedDate,
        isAvailable: availability.isAvailable,
        regularHours: availability.regularHours,
        emergencyHours: availability.emergencyHours,
        breaks: availability.breaks || [],
        timeSlots: availability.timeSlots || [],
        timezone: TIMEZONE,
      }
    })

    res.status(200).json({
      success: true,
      data: formattedAvailabilities,
    })
  } catch (error) {
    console.error("Error fetching doctor availabilities:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching doctor availabilities",
      error: error.message,
    })
  }
}

