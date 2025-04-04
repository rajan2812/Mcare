import { Server } from "socket.io"
import { Appointment } from "./model/availabilityModel.js"
import { DoctorUser } from "./model/usermodal.js"
import { Notification } from "./model/notificationModel.js"

const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
      methods: ["GET", "POST"],
      credentials: true,
    },
  })

  // Set up middleware for authentication
  io.use(async (socket, next) => {
    const userId = socket.handshake.query.userId
    const userType = socket.handshake.query.userType

    if (!userId || !userType) {
      return next(new Error("Authentication error"))
    }

    socket.userId = userId
    socket.userType = userType
    socket.join(`${userType}-${userId}`)
    next()
  })

  // Add this function to emit notifications to the appropriate user
  const emitNotification = (notification) => {
    const { recipient, recipientModel } = notification
    const userType = recipientModel.split("_")[0] // Extract 'doctor' or 'patient' from 'doctor_user' or 'patient_user'
    const roomName = `${userType}-${recipient}`

    io.to(roomName).emit("newNotification", notification)
    console.log(`Emitted notification to ${roomName}`)
  }

  // Handle connections
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.userId} (${socket.userType})`)

    // Handle doctor availability updates
    socket.on("availabilityUpdate", async (data) => {
      try {
        const { doctorId, date, availability } = data

        // Broadcast to all connected clients
        io.emit("doctorAvailabilityUpdated", {
          doctorId,
          availability,
          updateType: "availability",
          timestamp: new Date(),
        })

        // Store in database
        const doctor = await DoctorUser.findById(doctorId)
        if (doctor) {
          doctor.lastAvailabilityUpdate = new Date()
          await doctor.save()
        }
      } catch (error) {
        console.error("Error updating availability:", error)
        socket.emit("error", { message: "Failed to update availability" })
      }
    })

    // Handle appointment updates
    socket.on("appointmentUpdate", async (data) => {
      try {
        const { appointmentId, status, type } = data
        const appointment = await Appointment.findById(appointmentId)

        if (!appointment) {
          throw new Error("Appointment not found")
        }

        // Update appointment status
        appointment.status = status
        await appointment.save()

        // Create notification
        const notification = await Notification.create({
          recipient: appointment.patientId,
          recipientModel: "patient_user",
          type: "APPOINTMENT",
          title: `Appointment ${status}`,
          message: `Your appointment has been ${status}`,
          metadata: {
            appointmentId,
            status,
            updatedAt: new Date(),
          },
        })

        emitNotification(notification)

        // Broadcast update
        io.to(`patient-${appointment.patientId}`).emit("appointmentUpdated", {
          appointment,
          type,
          timestamp: new Date(),
        })

        io.to(`doctor-${appointment.doctorId}`).emit("appointmentUpdated", {
          appointment,
          type,
          timestamp: new Date(),
        })
      } catch (error) {
        console.error("Error updating appointment:", error)
        socket.emit("error", { message: "Failed to update appointment" })
      }
    })

    // Handle queue updates
    socket.on("queueUpdate", async (data) => {
      try {
        const { doctorId, queueData } = data

        // Broadcast queue update to all relevant clients
        io.emit("queueUpdated", {
          doctorId,
          queue: queueData,
          timestamp: new Date(),
        })
      } catch (error) {
        console.error("Error updating queue:", error)
        socket.emit("error", { message: "Failed to update queue" })
      }
    })

    socket.on("appointmentStatusUpdate", (data) => {
      const { appointmentId, status, doctorId, patientId, message } = data

      // Emit to the specific patient
      if (patientId) {
        io.to(`patient-${patientId}`).emit("appointmentStatusUpdated", {
          ...data,
          timestamp: new Date(),
        })
      }

      // Emit to the doctor as well for UI updates
      if (doctorId) {
        io.to(`doctor-${doctorId}`).emit("appointmentStatusUpdated", {
          ...data,
          timestamp: new Date(),
        })
      }

      // Log the event
      console.log(`Appointment ${appointmentId} status updated to ${status}`)
    })

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.userId}`)
    })
  })

  return io
}

export default initializeSocket

