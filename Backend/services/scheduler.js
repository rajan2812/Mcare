import { scheduleAppointmentReminders } from "./reminderService.js"

// Initialize the scheduler
export const initializeScheduler = () => {
  console.log("Initializing appointment reminder scheduler...")

  // Run immediately on startup
  scheduleAppointmentReminders()

  // Then run every 5 minutes
  // This interval is frequent enough to catch appointments approaching the 1-hour mark
  // without putting too much load on the system
  setInterval(scheduleAppointmentReminders, 5 * 60 * 1000)

  console.log("Appointment reminder scheduler initialized successfully")
}

