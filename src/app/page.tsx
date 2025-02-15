"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Home from "./home/page"

export default function Page() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem("isLoggedIn")

    if (isLoggedIn === "true") {
      router.push("/patient-dashboard")
    }
  }, [router])

  // If not logged in, show the home page
  return <Home />
}

