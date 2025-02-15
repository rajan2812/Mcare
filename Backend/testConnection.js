import { connectDB } from "./config/db.js"

async function testConnection() {
  try {
    await connectDB()
    console.log("Connection successful!")
    process.exit(0)
  } catch (error) {
    console.error("Connection failed:", error)
    process.exit(1)
  }
}

testConnection()
