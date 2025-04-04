"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, Check, AlertCircle, Bell } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useSocket } from "@/hooks/useSocket"

interface Medication {
  _id: string
  medicationName: string
  dosage: string
  frequency: string
  scheduledTime: string
  duration: number
  instructions?: string
  status: string
  notificationSent: boolean
  acknowledgedAt?: string
  createdAt: string
}

export function MedicationReminders() {
  const [reminders, setReminders] = useState<Medication[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : {}
  const socket = useSocket(user.id, "patient")

  const fetchReminders = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const token = localStorage.getItem("token")

      if (!token || !user.id) {
        throw new Error("Authentication required")
      }

      const response = await fetch(`http://localhost:4000/api/patient/reminders?status=pending`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to fetch medication reminders")
      }

      const data = await response.json()
      console.log("Medication reminders data:", data)

      if (data.success && data.data && data.data.reminders) {
        setReminders(data.data.reminders)
      } else {
        setReminders([])
      }
    } catch (error) {
      console.error("Error fetching medication reminders:", error)
      setError(error instanceof Error ? error.message : "Failed to load medication reminders")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user.id) {
      fetchReminders()
    }
  }, [user.id])

  useEffect(() => {
    if (socket) {
      socket.on("medicationReminder", (data) => {
        console.log("New medication reminder received:", data)
        toast({
          title: "Medication Reminder",
          description: `Time to take ${data.medicationName} (${data.dosage})`,
          action: (
            <Button size="sm" variant="outline" onClick={() => handleAcknowledge(data.reminderId)}>
              Mark as Taken
            </Button>
          ),
        })
        fetchReminders()
      })

      return () => {
        socket.off("medicationReminder")
      }
    }
  }, [socket])

  const handleAcknowledge = async (reminderId: string) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`http://localhost:4000/api/reminders/${reminderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: "acknowledged",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to acknowledge medication")
      }

      toast({
        title: "Medication Taken",
        description: "Thank you for confirming you've taken your medication",
      })

      // Update the local state
      setReminders((prev) =>
        prev.map((reminder) =>
          reminder._id === reminderId
            ? { ...reminder, status: "acknowledged", acknowledgedAt: new Date().toISOString() }
            : reminder,
        ),
      )
    } catch (error) {
      console.error("Error acknowledging medication:", error)
      toast({
        title: "Error",
        description: "Failed to mark medication as taken",
        variant: "destructive",
      })
    }
  }

  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(":")
      const date = new Date()
      date.setHours(Number.parseInt(hours, 10))
      date.setMinutes(Number.parseInt(minutes, 10))
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } catch (e) {
      return timeString
    }
  }

  const getFrequencyText = (frequency: string) => {
    switch (frequency) {
      case "once":
        return "Once daily"
      case "twice":
        return "Twice daily"
      case "thrice":
        return "Three times daily"
      case "four":
        return "Four times daily"
      case "asNeeded":
        return "As needed"
      default:
        return frequency
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bell className="mr-2 h-5 w-5" />
          Medication Reminders
        </CardTitle>
      </CardHeader>
      <CardContent>
        {reminders.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p>No upcoming medication reminders</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reminders.map((reminder) => (
              <div key={reminder._id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{reminder.medicationName}</h3>
                    <p className="text-sm text-muted-foreground">{reminder.dosage}</p>
                  </div>
                  <Badge variant={reminder.status === "acknowledged" ? "outline" : "default"}>
                    {reminder.status === "acknowledged" ? "Taken" : "Pending"}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center text-sm">
                  <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                  <span>{formatTime(reminder.scheduledTime)}</span>
                  <span className="mx-2">•</span>
                  <span>{getFrequencyText(reminder.frequency)}</span>
                </div>
                {reminder.instructions && (
                  <p className="mt-2 text-sm bg-muted p-2 rounded-md">{reminder.instructions}</p>
                )}
                <div className="mt-3">
                  {reminder.status === "pending" ? (
                    <Button size="sm" onClick={() => handleAcknowledge(reminder._id)} className="w-full">
                      <Check className="h-4 w-4 mr-2" />
                      Mark as Taken
                    </Button>
                  ) : (
                    <p className="text-xs text-right text-muted-foreground">
                      Taken at {new Date(reminder.acknowledgedAt || "").toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

