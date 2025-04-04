"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Inter } from "next/font/google"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import type React from "react"
import { useToast } from "@/components/ui/use-toast"

const inter = Inter({ subsets: ["latin"] })

export default function DoctorDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(true)
  const [verificationStatus, setVerificationStatus] = useState<"pending" | "approved" | "rejected" | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const checkAuthAndProfile = async () => {
      try {
        // Get token and user data
        const token = localStorage.getItem("token")
        const user = JSON.parse(localStorage.getItem("user") || "{}")

        if (!token || !user) {
          throw new Error("Not authenticated")
        }

        // Check if user is a doctor
        if (user.userType !== "doctor") {
          throw new Error("Unauthorized access")
        }

        // Get fresh user data from server
        const response = await fetch("http://localhost:4000/api/user/check-auth", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error("Authentication failed")
        }

        const authData = await response.json()

        // If not authenticated, redirect to login
        if (!authData.isAuthenticated) {
          throw new Error("Session expired")
        }

        // Check profile completion status from database
        const profileResponse = await fetch(`http://localhost:4000/api/doctor/profile/${user.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!profileResponse.ok) {
          throw new Error("Failed to fetch profile data")
        }

        const profileData = await profileResponse.json()

        // Update local storage with fresh data
        const updatedUser = {
          ...user,
          isProfileCompleted: profileData.data.isProfileCompleted,
          verificationStatus: profileData.data.verificationStatus,
        }
        localStorage.setItem("user", JSON.stringify(updatedUser))

        const isProfileCompleted = Boolean(profileData.data.isProfileCompleted)
        const isOnCompletePage = pathname === "/doctor-dashboard/complete-profile"

        // Handle routing based on profile status
        if (!isProfileCompleted && !isOnCompletePage) {
          console.log("Redirecting to complete profile")
          router.push("/doctor-dashboard/complete-profile")
          return
        }

        if (isProfileCompleted && isOnCompletePage) {
          console.log("Profile already completed, redirecting to dashboard")
          router.push("/doctor-dashboard")
          return
        }

        setVerificationStatus(profileData.data.verificationStatus)
        setIsLoading(false)
      } catch (error) {
        console.error("Authentication error:", error)
        localStorage.clear()
        router.push("/login")
      }
    }

    checkAuthAndProfile()
  }, [pathname, router]) // Only re-run when pathname changes

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className={inter.className}>
      {verificationStatus === "pending" && pathname !== "/doctor-dashboard/complete-profile" && (
        <Alert variant="default" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Profile Under Review</AlertTitle>
          <AlertDescription>
            Your profile is currently under review by our admin team. Some features may be limited until your profile is
            verified. We will notify you once the review is complete.
          </AlertDescription>
        </Alert>
      )}
      {children}
    </div>
  )
}

