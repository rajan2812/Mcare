"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Inter } from "next/font/google"
import type React from "react"

const inter = Inter({ subsets: ["latin"] })

export default function DoctorDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if user is logged in
        const isLoggedIn = localStorage.getItem("isLoggedIn")
        const token = localStorage.getItem("token")
        const user = JSON.parse(localStorage.getItem("user") || "{}")

        if (!isLoggedIn || !token || !user) {
          throw new Error("Not authenticated")
        }

        // Verify token with backend
        const response = await fetch("http://localhost:4000/api/user/check-auth", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error("Authentication failed")
        }

        const data = await response.json()

        if (!data.isAuthenticated) {
          throw new Error("Session expired")
        }

        // Check if user type is doctor
        if (user.userType !== "doctor") {
          throw new Error("Unauthorized access")
        }

        // Check if profile is completed
        if (!user.isProfileCompleted && router.pathname !== "/doctor-dashboard/complete-profile") {
          router.push("/doctor-dashboard/complete-profile")
          return
        }

        setIsLoading(false)
      } catch (error) {
        console.error("Authentication error:", error)
        // Clear all auth data
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        localStorage.removeItem("isLoggedIn")
        router.push("/login")
      }
    }

    checkAuth()
  }, [router])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return <div className={inter.className}>{children}</div>
}

