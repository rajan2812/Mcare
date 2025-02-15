"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type React from "react" // Added import for React

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("token")

        if (!token) {
          router.push("/login")
          return
        }

        const response = await fetch("http://localhost:4000/api/user/check-auth", {
          credentials: "include",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const data = await response.json()

        if (!data.success) {
          localStorage.removeItem("token")
          router.push("/login")
          return
        }

        setIsAuthenticated(true)
      } catch (error) {
        console.error("Auth check failed:", error)
        router.push("/login")
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (isLoading) {
    return <div>Loading...</div>
  }

  return isAuthenticated ? children : null
}

