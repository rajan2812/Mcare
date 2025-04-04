// Add this file to update existing appointments with dateString field

import { Appointment } from "../model/appointmentModel.js"
import mongoose from "mongoose"

export const migrateAppointments = async () => {
  try {
    console.log("Starting migration to add dateString field to appointments...")

    // Find all appointments without dateString
    const appointments = await Appointment.find({ dateString: { $exists: false } })
    console.log(`Found ${appointments.length} appointments to update`)

    for (const appointment of appointments) {
      // Format the date to YYYY-MM-DD
      const date = new Date(appointment.date)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, "0")
      const day = String(date.getDate()).padStart(2, "0")
      const dateString = `${year}-${month}-${day}`

      // Update the appointment
      appointment.dateString = dateString
      await appointment.save()
      console.log(`Updated appointment ${appointment._id} with dateString ${dateString}`)
    }

    console.log("Migration completed successfully")
    return { success: true, message: `Updated ${appointments.length} appointments` }
  } catch (error) {
    console.error("Migration failed:", error)
    return { success: false, message: error.message }
  }
}

// Run the migration directly if this file is executed
if (process.argv[1].includes("addDateString.js")) {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log("Connected to MongoDB")
      return migrateAppointments()
    })
    .then((result) => {
      console.log(result)
      process.exit(0)
    })
    .catch((error) => {
      console.error("Migration error:", error)
      process.exit(1)
    })
}

