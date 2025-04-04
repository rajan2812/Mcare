"use client"

import { useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { useSocket } from "@/hooks/useSocket"

export function AppointmentNotificationListener() {
  const { toast } = useToast()
  const router = useRouter()
  const socket = useSocket()

  useEffect(() => {
    if (!socket) return

    const handleAppointmentUpdate = (data) => {
      console.log("Appointment update received:", data) // Debug log

      if (data.status === "confirmed" || data.status === "accepted") {
        // Show a toast notification
        toast({
          title: "Appointment Accepted",
          description: "Your appointment has been accepted by the doctor. Please upload your medical records.",
          duration: 10000,
          action: (
            <button
              onClick={() => router.push("/patient-dashboard/records")}
              className="bg-primary text-white px-3 py-2 rounded-md text-xs font-medium"
            >
              Upload Now
            </button>
          ),
        })

        // Force refresh to show the upload prompt
        router.refresh()

        // Also store in localStorage that an appointment was accepted
        localStorage.setItem("hasAcceptedAppointment", "true")
      }
    }

    socket.on("appointmentUpdate", handleAppointmentUpdate)

    return () => {
      socket.off("appointmentUpdate", handleAppointmentUpdate)
    }
  }, [socket, toast, router])

  return null
}

