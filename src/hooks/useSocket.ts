"use client"

import { useEffect, useState } from "react"
import io, { type Socket } from "socket.io-client"

export const useSocket = (userId: string, userType: "patient" | "doctor") => {
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    if (!userId) {
      console.log("No user ID provided to useSocket hook")
      return
    }

    console.log(`Initializing socket for ${userType} ${userId}`)

    // Create a new socket connection
    const SOCKET_URL = "http://localhost:4000"
    const newSocket = io(SOCKET_URL, {
      query: {
        userId,
        userType,
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    newSocket.on("connect", () => {
      console.log(`Socket connected for ${userType} ${userId}`)
    })

    newSocket.on("connect_error", (error) => {
      console.error("Socket connection error:", error)
    })

    newSocket.on("error", (error) => {
      console.error("Socket error:", error)
    })

    newSocket.on("disconnect", (reason) => {
      console.log(`Socket disconnected: ${reason}`)
    })

    setSocket(newSocket)

    return () => {
      console.log(`Cleaning up socket for ${userType} ${userId}`)
      newSocket.disconnect()
    }
  }, [userId, userType])

  return socket
}

