import mongoose from "mongoose"
import dotenv from "dotenv"

dotenv.config()

const mongodburl = process.env.MONGODB_URI

export const connectDB = async () => {
  try {
    if (!mongodburl) {
      throw new Error("MONGODB_URI is not defined in the environment variables")
    }

    const conn = await mongoose.connect(mongodburl)

    console.log(`MongoDB Connected: ${conn.connection.host}`)

    mongoose.connection.on("error", (err) => {
      console.error("Mongoose connection error:", err)
    })

    mongoose.connection.on("disconnected", () => {
      console.log("Mongoose connection is disconnected")
    })
  } catch (error) {
    console.error("Error connecting to MongoDB:")
    console.error(error)
    process.exit(1)
  }
}

export default mongoose

