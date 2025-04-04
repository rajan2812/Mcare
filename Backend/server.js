import dotenv from "dotenv"
import express from "express"
import cors from "cors"
import session from "express-session"
import MongoStore from "connect-mongo"
import { connectDB } from "./config/db.js"
import userRouter from "./Routes/userroute.js"
import adminRouter from "./Routes/adminRoutes.js"
import doctorProfileRoutes from "./Routes/doctorProfileRoutes.js"
import notificationRouter from "./routes/notificationRoutes.js" // Add this line with your other imports
import { authenticateToken } from "./middleware/authMiddleware.js" // Import the authentication middleware
import { Server } from "socket.io"
import { createServer } from "http"
import availabilityRoutes from "./Routes/availabilityRoutes.js"
// Add this to your server.js routes configuration
import doctorRoutes from "./Routes/doctorRoutes.js"
// Add this to your imports at the top of the file
import appointmentRouter from "./routes/appointmentRoutes.js"
// Add this line to import the health check routes
import healthCheckRoutes from "./routes/healthCheckRoutes.js"
// Import the reminder routes and service
import reminderRoutes from "./routes/reminderRoutes.js"
import { checkAndSendReminders } from "./services/reminderService.js"
// Add this line with the other route imports
import notificationRoutes from "./routes/notificationRoutes.js"
// Add import for the migration
import { migrateAppointments } from "./migrations/addDateString.js"
import mongoose from "mongoose"
// Add these imports near the top of the file with other imports
import prescriptionRoutes from "./routes/prescriptionRoutes.js"
import medicationReminderRoutes from "./routes/medicationReminderRoutes.js"
import { checkAndSendMedicationReminders } from "./controllers/medicationReminderController.js"

dotenv.config()

const app = express()
const port = 4000 // Changed to match frontend port

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Add or update CORS configuration
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001", process.env.FRONTEND_URL || "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "user", "user-role"],
  }),
)

app.use("/uploads", express.static("uploads"))

// Session configuration with MongoDB store
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      ttl: 24 * 60 * 60, // Session TTL (1 day)
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: "lax",
    },
  }),
)

// Add security headers
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", "true")
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS")
  res.header("Access-Control-Allow-Headers", "Origin,X-Requested-With,Content-Type,Accept,Authorization")
  next()
})

// Route logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`)
  next()
})

// Routes
app.use("/api/user", userRouter)
app.use("/api/admin", authenticateToken, adminRouter) // Admin routes with authentication middleware
console.log("Admin routes registered at /api/admin")
app.use("/api/doctor", doctorProfileRoutes)
app.use("/api/notifications", notificationRouter) // Add this line with your other route configurations
// Add this with other routes
app.use("/api/doctor", availabilityRoutes)
// Add this with other routes
app.use("/api/doctors", doctorRoutes)
// Add this with your other route registrations (around line 80-90)
app.use("/api", appointmentRouter) // Add appointment routes
// Add this line where you're setting up other routes
app.use("/api", healthCheckRoutes)
// Add reminder routes
app.use("/api/reminders", reminderRoutes)
// Add this line with the other app.use statements
app.use("/api/notifications", notificationRoutes)
// Add these routes in the routes section where other routes are defined
app.use("/api", prescriptionRoutes)
app.use("/api", medicationReminderRoutes)

// Add static file serving for doctor documents
app.use("/uploads/doctor-documents", express.static("uploads/doctor-documents"))

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Global error handler:", err)
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : "An error occurred",
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  })
})

// DB connection
connectDB()

// Add this after connecting to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB")
    // Run migration to ensure all appointments have dateString field
    migrateAppointments()
      .then((result) => console.log("Migration result:", result))
      .catch((err) => console.warn("Migration warning:", err.message))
  })
  .catch((error) => {
    console.log("Error connecting", error)
  })

// Test route
app.get("/", (req, res) => {
  res.json({ message: "Server is running" })
})

const httpServer = createServer(app)
export const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST"],
    credentials: true,
  },
})

// Update the Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id)

  // Join room based on user type and ID
  socket.on("join", ({ userId, userType }) => {
    socket.join(`${userType}-${userId}`)
    console.log(`${userType} ${userId} joined their room`)
  })

  // Handle availability updates with acknowledgment
  socket.on("availabilityUpdate", async (data, callback) => {
    try {
      console.log("Availability update received:", data)

      // Validate the data
      if (!data.doctorId || !data.date) {
        throw new Error("Invalid availability update data")
      }

      // Broadcast the update to all connected clients
      io.emit("doctorAvailabilityUpdated", data)

      // Send acknowledgment
      if (callback) {
        callback({
          success: true,
          timestamp: new Date().toISOString(),
        })
      }
    } catch (error) {
      console.error("Error handling availability update:", error)
      if (callback) {
        callback({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        })
      }
    }
  })

  // Handle appointment updates
  socket.on("appointmentUpdate", (data) => {
    io.emit("appointmentUpdated", data)
  })

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id)
  })

  // Handle reconnection
  socket.on("reconnect", () => {
    console.log("Client reconnected:", socket.id)
  })

  // Handle errors
  socket.on("error", (error) => {
    console.error("Socket error:", error)
  })
})

// Set up a scheduler to check for appointments that need reminders
// Run every 5 minutes
const REMINDER_CHECK_INTERVAL = 5 * 60 * 1000 // 5 minutes in milliseconds

// Start the reminder scheduler
setInterval(async () => {
  console.log("Running scheduled reminder check...")
  await checkAndSendReminders()
}, REMINDER_CHECK_INTERVAL)

// Find the server initialization section and add this after the server is started
// This should be somewhere near the bottom of the file, after the server is listening

// Schedule reminder checks to run every 5 minutes
//const REMINDER_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Initial check after server starts
setTimeout(() => {
  console.log("Running initial appointment reminder check...")
  checkAndSendReminders().catch((err) => {
    console.error("Error in initial reminder check:", err)
  })
}, 10000) // Wait 10 seconds after server start

// Set up recurring checks
setInterval(() => {
  console.log("Running scheduled appointment reminder check...")
  checkAndSendReminders().catch((err) => {
    console.error("Error in scheduled reminder check:", err)
  })
}, REMINDER_CHECK_INTERVAL)

console.log(`Appointment reminder checks scheduled to run every ${REMINDER_CHECK_INTERVAL / 60000} minutes`)

// Add this in the scheduled tasks section where other scheduled tasks are defined
// Schedule medication reminder checks every 5 minutes
setInterval(
  async () => {
    try {
      await checkAndSendMedicationReminders()
    } catch (error) {
      console.error("Error running scheduled medication reminder check:", error)
    }
  },
  5 * 60 * 1000,
) // 5 minutes

// Update the server startup
httpServer.listen(port, () => {
  console.log(`Server running on port ${port}`)
  console.log(`Reminder scheduler running every ${REMINDER_CHECK_INTERVAL / 60000} minutes`)
})

