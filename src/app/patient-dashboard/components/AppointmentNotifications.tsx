"use client"

import { useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { useSocket } from "@/hooks/useSocket"

export function AppointmentNotifications() {
  const { toast } = useToast()
  const router = useRouter()

  // Get user from localStorage
  const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : {}
  const socket = useSocket(user.id, "patient")

  useEffect(() => {
    if (!socket) return

    // Listen for appointment status updates
    socket.on("appointmentStatusUpdated", (data) => {
      const { status, appointmentId, updatedByName, date, time } = data

      let title = ""
      let description = ""
      let variant: "default" | "destructive" = "default"
      const type = "APPOINTMENT"

      switch (status) {
        case "confirmed":
          title = "Appointment Confirmed"
          description = `Your appointment on ${date} at ${time} has been confirmed by ${updatedByName}.`
          break
        case "rejected":
          title = "Appointment Rejected"
          description = `Your appointment request on ${date} at ${time} has been rejected by ${updatedByName}.`
          variant = "destructive"
          break
        case "cancelled":
          title = "Appointment Cancelled"
          description = `Your appointment on ${date} at ${time} has been cancelled by ${updatedByName}.`
          variant = "destructive"
          break
        case "rescheduled":
          title = "Appointment Rescheduled"
          description = `Your appointment has been rescheduled by ${updatedByName}. Please check your appointments for details.`
          break
        default:
          title = "Appointment Update"
          description = `Your appointment status has been updated to ${status} by ${updatedByName}.`
      }

      // Show toast notification
      toast({
        title,
        description,
        variant,
        action:
          status === "confirmed"
            ? {
                label: "View Appointment",
                onClick: () => router.push("/patient-dashboard/appointments"),
              }
            : undefined,
      })

      // Store notification in database with the current timestamp
      storeNotification(user.id, type, title, description, appointmentId)

      // Refresh the page if we're on the appointments page
      if (window.location.pathname.includes("/patient-dashboard/appointments")) {
        router.refresh()
      }
    })

    // Listen for appointment reminders
    socket.on("appointmentReminder", (data) => {
      const { appointmentId, doctorName, date, time } = data

      const title = "Appointment Reminder"
      const description = `Your appointment with Dr. ${doctorName} is scheduled for ${date} at ${time}.`

      toast({
        title,
        description,
        action: {
          label: "View Appointment",
          onClick: () => router.push("/patient-dashboard/appointments"),
        },
      })

      // Store reminder notification
      storeNotification(user.id, "REMINDER", title, description, appointmentId)
    })

    // Listen for important system notifications
    socket.on("systemNotification", (data) => {
      const { title, message, metadata } = data

      toast({
        title,
        description: message,
      })

      // Store system notification
      storeNotification(user.id, "SYSTEM", title, message, metadata?.appointmentId)
    })

    // Add this to the useEffect hook where you set up socket listeners
    socket.on("appointmentRescheduled", (data) => {
      const { oldDate, oldTime, newDate, newTime, updatedByName, requiresConfirmation } = data

      const title = "Appointment Rescheduled"
      const description = requiresConfirmation
        ? `Your appointment has been rescheduled from ${oldDate} at ${oldTime} to ${newDate} at ${newTime} by ${updatedByName}. Please confirm the new timing.`
        : `Your appointment has been rescheduled from ${oldDate} at ${oldTime} to ${newDate} at ${newTime} by ${updatedByName}.`

      toast({
        title,
        description,
        action: {
          label: "View Appointment",
          onClick: () => router.push("/patient-dashboard/dashboard"),
        },
      })

      // Store notification
      storeNotification(
        user.id,
        "APPOINTMENT",
        title,
        description,
        data.appointmentId,
        requiresConfirmation ? { requiresConfirmation: true } : undefined,
      )

      // Refresh the page if we're on the appointments page
      if (window.location.pathname.includes("/patient-dashboard")) {
        router.refresh()
      }
    })

    // Add this new socket listener for reschedule request responses
    socket.on("rescheduleRequestResponse", (data) => {
      const { action, oldDate, oldTime, newDate, newTime } = data

      const title = action === "approve" ? "Reschedule Request Approved" : "Reschedule Request Rejected"
      const description =
        action === "approve"
          ? `Your request to reschedule appointment from ${oldDate} at ${oldTime} to ${newDate} at ${newTime} has been approved.`
          : `Your request to reschedule appointment from ${oldDate} at ${oldTime} to ${newDate} at ${newTime} has been rejected.`

      toast({
        title,
        description,
        variant: action === "approve" ? "default" : "destructive",
        action: {
          label: "View Appointments",
          onClick: () => router.push("/patient-dashboard/appointments"),
        },
      })

      // Store notification
      storeNotification(user.id, "APPOINTMENT", title, description, data.appointmentId)

      // Refresh the page if we're on the appointments page
      if (window.location.pathname.includes("/patient-dashboard/appointments")) {
        router.refresh()
      }
    })

    return () => {
      socket.off("appointmentStatusUpdated")
      socket.off("appointmentReminder")
      socket.off("systemNotification")
      socket.off("appointmentRescheduled")
      socket.off("rescheduleRequestResponse")
    }
  }, [socket, toast, router, user.id])

  // Helper function to store notifications in the database
  const storeNotification = async (userId, type, title, message, appointmentId = null, metadata = {}) => {
    try {
      const token = localStorage.getItem("token")
      await fetch("http://localhost:4000/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipient: userId,
          recipientModel: "patient_user",
          type,
          title,
          message,
          metadata: appointmentId ? { appointmentId, ...metadata } : metadata,
        }),
      })
    } catch (error) {
      console.error("Error storing notification:", error)
    }
  }

  return null // This component doesn't render anything
}

