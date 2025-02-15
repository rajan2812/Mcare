import dotenv from "dotenv"
import express from "express"
import cors from "cors"
import session from "express-session"
import MongoStore from "connect-mongo"
import { connectDB } from "./config/db.js"
import userRouter from "./Routes/userroute.js"

dotenv.config()

const app = express()
const port = process.env.PORT || 4000

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Configure CORS with credentials
app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Global error handler:", err)
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : "An error occurred",
  })
  next(err) // Add this line to properly handle the error
})

// DB connection
connectDB()

// Routes
app.use("/api/user", userRouter)

// Test route
app.get("/", (req, res) => {
  res.json({ message: "Server is running" })
})

// Start server with error handling
const startServer = async () => {
  try {
    app.listen(port, () => {
      console.log(`Server running on port ${port}`)
    })
  } catch (error) {
    console.error("Failed to start server:", error)
    process.exit(1)
  }
}

startServer()

