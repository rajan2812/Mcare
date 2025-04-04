"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Clock } from "lucide-react"
import type { AppointmentRequest } from "@/types/appointment"
import { Activity } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useSocket } from "@/hooks/useSocket"
import { CalendarDays } from "lucide-react"
import { useRouter } from "next/navigation"
import { ChevronRight } from "lucide-react"

// Update the formatDisplayDate function to avoid timezone issues
const formatDisplayDate = (dateString) => {
  if (!dateString) return "Unknown date"

  // Directly return the dateString if it's already in the correct format
  return dateString
}

// Add these status configurations
const APPOINTMENT_STATUSES = {
  pending: {
    label: "Pending",
    color: "bg-yellow-500",
    nextStates: ["confirmed", "rejected"],
  },
  confirmed: {
    label: "Confirmed",
    color: "bg-blue-500",
    nextStates: ["in-progress", "cancelled", "no-show"],
  },
  "in-progress": {
    label: "In Progress",
    color: "bg-green-500",
    nextStates: ["completed", "cancelled"],
  },
  completed: {
    label: "Completed",
    color: "bg-green-700",
    nextStates: [],
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-gray-500",
    nextStates: [],
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-500",
    nextStates: [],
  },
  "no-show": {
    label: "No Show",
    color: "bg-red-700",
    nextStates: [],
  },
}

// Add this new component for status management
function AppointmentStatusManager({ appointment, onStatusChange }) {
  const currentStatus = appointment.status
  const availableTransitions = APPOINTMENT_STATUSES[currentStatus]?.nextStates || []

  if (availableTransitions.length === 0) {
    return (
      <Badge className={`${APPOINTMENT_STATUSES[currentStatus]?.color} text-white`}>
        {APPOINTMENT_STATUSES[currentStatus]?.label}
      </Badge>
    )
  }

  return (
    <Select value={currentStatus} onValueChange={(newStatus) => onStatusChange(appointment.id, newStatus)}>
      <SelectTrigger className="w-[180px]">
        <SelectValue>
          <Badge className={`${APPOINTMENT_STATUSES[currentStatus]?.color} text-white`}>
            {APPOINTMENT_STATUSES[currentStatus]?.label}
          </Badge>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {availableTransitions.map((status) => (
          <SelectItem key={status} value={status}>
            <Badge className={`${APPOINTMENT_STATUSES[status]?.color} text-white`}>
              {APPOINTMENT_STATUSES[status]?.label}
            </Badge>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// Update the AppointmentList component
export function AppointmentList({ filter = "today", onAppointmentSelect }) {
  const [appointments, setAppointments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null) // Add error state to handle and display errors
  const { toast } = useToast()

  const user = JSON.parse(localStorage.getItem("user") || "{}")
  const socket = useSocket(user.id, "doctor")

  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false)
  const [appointmentToReschedule, setAppointmentToReschedule] = useState(null)
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(undefined)
  const [rescheduleTime, setRescheduleTime] = useState("")
  const [availableTimeSlots, setAvailableTimeSlots] = useState([])
  const [isLoadingTimeSlots, setIsLoadingTimeSlots] = useState(false)

  // Update the fetchAppointments function in the AppointmentList component
  const fetchAppointments = useCallback(async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No authentication token found")
      }

      const response = await fetch(
        `http://localhost:4000/api/appointments?userId=${user.id}&userType=doctor&filter=${filter}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      )

      if (!response.ok) {
        if (response.status === 404) {
          setAppointments([])
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      if (data.success) {
        setAppointments(data.appointments)
      } else {
        throw new Error(data.message || "Failed to fetch appointments")
      }
    } catch (error) {
      console.error("Error fetching appointments:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load appointments",
        variant: "destructive",
      })
      setAppointments([])
    } finally {
      setIsLoading(false)
    }
  }, [user.id, filter, toast])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  useEffect(() => {
    if (socket) {
      socket.on("appointmentStatusUpdated", (data) => {
        setAppointments((prevAppointments) =>
          prevAppointments.map((apt) => (apt.id === data.appointmentId ? { ...apt, status: data.status } : apt)),
        )

        toast({
          title: "Appointment Updated",
          description: `Appointment status changed to ${APPOINTMENT_STATUSES[data.status]?.label}`,
        })
      })

      return () => {
        socket.off("appointmentStatusUpdated")
      }
    }
  }, [socket, toast])

  // Update the handleStatusChange function:

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`http://localhost:4000/api/appointments/${appointmentId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: newStatus,
          notes:
            newStatus === "completed"
              ? "Appointment completed successfully"
              : newStatus === "cancelled"
                ? "Appointment cancelled by doctor"
                : newStatus === "no-show"
                  ? "Patient did not show up"
                  : "",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update appointment status")
      }

      const data = await response.json()

      // Emit socket event for real-time updates
      if (socket) {
        socket.emit("appointmentStatusUpdate", {
          appointmentId,
          status: newStatus,
          doctorId: user.id,
          doctorName: `Dr. ${user.firstName} ${user.lastName}`,
        })
      }

      // Update local state
      setAppointments((prevAppointments) =>
        prevAppointments.map((apt) => (apt.id === appointmentId ? { ...apt, status: newStatus } : apt)),
      )

      toast({
        title: "Success",
        description: `Appointment status updated to ${APPOINTMENT_STATUSES[newStatus]?.label}`,
      })
    } catch (error) {
      console.error("Error updating appointment status:", error)
      toast({
        title: "Error",
        description: "Failed to update appointment status",
        variant: "destructive",
      })
    }
  }

  // Add a new function to handle payment status updates
  const handlePaymentStatusUpdate = async (appointmentId: string, paymentStatus: string) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`http://localhost:4000/api/appointments/${appointmentId}/payment`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentStatus }),
      })

      if (!response.ok) {
        throw new Error("Failed to update payment status")
      }

      // Update local state
      setAppointments((prevAppointments) =>
        prevAppointments.map((apt) => (apt.id === appointmentId ? { ...apt, paymentStatus } : apt)),
      )

      toast({
        title: "Success",
        description: `Payment status updated to ${paymentStatus}`,
      })
    } catch (error) {
      console.error("Error updating payment status:", error)
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive",
      })
    }
  }

  const handleOpenReschedule = (appointment) => {
    setAppointmentToReschedule(appointment)
    // Set initial reschedule date to the current appointment date
    if (appointment.date) {
      const [year, month, day] = appointment.date.split("-").map(Number)
      const appointmentDate = new Date(Date.UTC(year, month - 1, day))
      setRescheduleDate(appointmentDate)
    } else {
      setRescheduleDate(new Date())
    }
    setRescheduleTime("")
    setIsRescheduleDialogOpen(true)
    // Fetch available time slots for the selected date
    fetchAvailableTimeSlots(appointment.date)
  }

  const fetchAvailableTimeSlots = async (dateString) => {
    try {
      setIsLoadingTimeSlots(true)
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No authentication token found")
      }

      // Format date for API
      let formattedDate = dateString
      if (!formattedDate && rescheduleDate) {
        formattedDate = rescheduleDate.toISOString().split("T")[0]
      }

      console.log("Fetching available time slots for:", formattedDate)

      const response = await fetch(`http://localhost:4000/api/doctor/availability/${user.id}/${formattedDate}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          // Handle 404 by setting empty slots
          setAvailableTimeSlots([])
          return
        }
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      if (data.success) {
        // Filter only available slots
        const slots = data.data.timeSlots
          ? data.data.timeSlots
              .filter((slot) => !slot.isBooked && !slot.isBreak)
              .map((slot) => ({
                startTime: slot.startTime,
                endTime: slot.endTime,
              }))
          : []

        console.log("Available time slots:", slots)
        setAvailableTimeSlots(slots)
      } else {
        throw new Error(data.message || "Failed to fetch available time slots")
      }
    } catch (error) {
      console.error("Error fetching available time slots:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load available time slots",
        variant: "destructive",
      })
      setAvailableTimeSlots([])
    } finally {
      setIsLoadingTimeSlots(false)
    }
  }

  const handleRescheduleDateChange = (date) => {
    setRescheduleDate(date)
    if (date) {
      fetchAvailableTimeSlots(date.toISOString().split("T")[0])
    }
  }

  const handleConfirmReschedule = async () => {
    if (!appointmentToReschedule || !rescheduleDate || !rescheduleTime) {
      toast({
        title: "Error",
        description: "Please select both date and time for rescheduling",
        variant: "destructive",
      })
      return
    }

    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("Authentication token not found")
      }

      // Get user information
      const user = JSON.parse(localStorage.getItem("user") || "{}")

      // Find the selected time slot
      const selectedSlot = availableTimeSlots.find((slot) => slot.startTime === rescheduleTime)

      if (!selectedSlot) {
        throw new Error("Selected time slot is not available")
      }

      // Format the date properly for the API
      const formattedDate = rescheduleDate.toISOString().split("T")[0]

      console.log("Rescheduling appointment:", {
        appointmentId: appointmentToReschedule.id,
        doctorId: user.id,
        doctorRole: "doctor",
        userType: "doctor",
        newDate: formattedDate,
        newTimeSlot: {
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
        },
      })

      const response = await fetch(`http://localhost:4000/api/appointments/${appointmentToReschedule.id}/reschedule`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          // Add user information in headers
          user: JSON.stringify({
            id: user.id,
            role: "doctor",
            userType: "doctor",
          }),
          "user-role": "doctor",
        },
        body: JSON.stringify({
          newDate: formattedDate,
          newTimeSlot: {
            startTime: selectedSlot.startTime,
            endTime: selectedSlot.endTime,
          },
          // Include doctor information in the request body
          doctorId: user.id,
          userRole: "doctor",
          userType: "doctor",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to reschedule appointment")
      }

      const data = await response.json()
      console.log("Reschedule response:", data)

      // Update local state
      setAppointments((prevAppointments) =>
        prevAppointments.map((apt) =>
          apt.id === appointmentToReschedule.id
            ? {
                ...apt,
                date: formattedDate,
                timeSlot: {
                  startTime: selectedSlot.startTime,
                  endTime: selectedSlot.endTime,
                },
              }
            : apt,
        ),
      )

      // Add debugging to see if this code is being executed
      console.log("About to show toast for rescheduled appointment")

      // Try a simple toast first to see if it works
      toast({
        title: "Appointment Rescheduled",
        description: "The appointment has been successfully rescheduled.",
      })

      // Force an alert to confirm the code is executing
      alert(
        `Appointment with ${appointmentToReschedule.patientName} successfully rescheduled to ${formatDisplayDate(formattedDate)} at ${selectedSlot.startTime}`,
      )

      setIsRescheduleDialogOpen(false)
    } catch (error) {
      console.error("Error rescheduling appointment:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reschedule appointment",
        variant: "destructive",
      })
    }
  }

  // Add this function to handle reschedule requests
  const handleRescheduleResponse = async (appointmentId, action) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`http://localhost:4000/api/appointments/${appointmentId}/respond-reschedule`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action, // 'approve' or 'reject'
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to respond to reschedule request")
      }

      toast({
        title: "Success",
        description: `Reschedule request ${action === "approve" ? "approved" : "rejected"} successfully`,
      })

      // Refresh appointments
      fetchAppointments()
    } catch (error) {
      console.error(`Error ${action}ing reschedule request:`, error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${action} reschedule request`,
        variant: "destructive",
      })
    }
  }

  // Update the appointment card rendering to include payment status
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <div className="text-red-500 mb-2">Error: {error}</div>
        <Button onClick={() => fetchAppointments()}>Retry</Button>
      </div>
    )
  }

  if (appointments.length === 0) {
    return <div className="text-center p-4 text-muted-foreground">No appointments found.</div>
  }

  return (
    <div className="space-y-4">
      {appointments.map((appointment) => (
        <Card key={appointment.id} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${appointment.patientName}`} />
                <AvatarFallback>
                  {appointment.patientName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <h4 className="font-semibold">{appointment.patientName}</h4>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  {formatDisplayDate(appointment.date)}
                  <Clock className="h-4 w-4 ml-2" />
                  {appointment.timeSlot.startTime}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{appointment.consultationType}</Badge>
                  {appointment.paymentStatus && (
                    <Badge variant={appointment.paymentStatus === "completed" ? "success" : "warning"}>
                      {appointment.paymentStatus === "completed" ? "Paid" : "Payment Pending"}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AppointmentStatusManager appointment={appointment} onStatusChange={handleStatusChange} />
              <Button variant="outline" size="sm" onClick={() => onAppointmentSelect(appointment)}>
                View
              </Button>
              {(appointment.status === "confirmed" || appointment.status === "pending") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenReschedule(appointment)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Reschedule
                </Button>
              )}

              {/* Add this section for reschedule requests */}
              {appointment.status === "pending_reschedule" && (
                <div className="flex items-center gap-2">
                  <div className="text-sm text-amber-600 font-medium">
                    Reschedule requested:{" "}
                    {appointment.requestedReschedule
                      ? `${formatDisplayDate(appointment.requestedReschedule.date)} at ${appointment.requestedReschedule.timeSlot.startTime}`
                      : "Details not available"}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRescheduleResponse(appointment.id, "approve")}
                    className="text-green-600 hover:text-green-700"
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRescheduleResponse(appointment.id, "reject")}
                    className="text-red-600 hover:text-red-700"
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          </div>
          {appointment.symptoms && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium">Symptoms/Notes:</p>
              <p className="text-sm text-muted-foreground">{appointment.symptoms}</p>
            </div>
          )}
        </Card>
      ))}
      {/* Reschedule Dialog */}
      <Dialog open={isRescheduleDialogOpen} onOpenChange={setIsRescheduleDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Select a new date and time for the appointment with {appointmentToReschedule?.patientName}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reschedule-date">New Date</Label>
              <Calendar
                mode="single"
                selected={rescheduleDate}
                onSelect={handleRescheduleDateChange}
                disabled={(date) => date < new Date() || date > new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)}
                initialFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reschedule-time">New Time</Label>
              {isLoadingTimeSlots ? (
                <div className="flex items-center justify-center p-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : availableTimeSlots.length === 0 ? (
                <div className="text-center p-2 border rounded-md text-muted-foreground">
                  No available time slots for this date
                </div>
              ) : (
                <Select value={rescheduleTime} onValueChange={setRescheduleTime}>
                  <SelectTrigger id="reschedule-time">
                    <SelectValue placeholder="Select a time slot" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTimeSlots.map((slot) => (
                      <SelectItem key={slot.startTime} value={slot.startTime}>
                        {slot.startTime} - {slot.endTime}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRescheduleDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmReschedule}
              disabled={!rescheduleDate || !rescheduleTime || isLoadingTimeSlots}
            >
              Confirm Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// AppointmentsSection Component
// Update the AppointmentsSection component to improve its styling
export function AppointmentsSection() {
  const [appointments, setAppointments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const fetchTodayAppointments = async () => {
      try {
        const token = localStorage.getItem("token")
        const user = JSON.parse(localStorage.getItem("user") || "{}")

        if (!token) {
          throw new Error("Authentication token not found")
        }

        const response = await fetch(
          `http://localhost:4000/api/appointments?userId=${user.id}&userType=doctor&filter=today`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )

        if (!response.ok) {
          throw new Error("Failed to fetch appointments")
        }

        const data = await response.json()
        if (data.success) {
          setAppointments(data.appointments.slice(0, 3)) // Limit to 3 appointments
        } else {
          throw new Error(data.message || "Failed to fetch appointments")
        }
      } catch (error) {
        console.error("Error fetching today's appointments:", error)
        toast({
          title: "Error",
          description: "Failed to load today's appointments",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchTodayAppointments()
  }, [toast])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-md font-medium">Today's Appointments</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          onClick={() => router.push("/doctor-dashboard/appointments?filter=today")}
        >
          View All <ChevronRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <p>No appointments scheduled for today</p>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {appointment.patientName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{appointment.patientName}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{appointment.timeSlot.startTime}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {appointment.consultationType || "In-Person"}
                  </Badge>
                  <Badge
                    variant={
                      appointment.status === "confirmed"
                        ? "default"
                        : appointment.status === "in-progress"
                          ? "secondary"
                          : "outline"
                    }
                    className="text-xs"
                  >
                    {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() => router.push(`/doctor-dashboard/appointments?id=${appointment.id}`)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// AppointmentRequests Component
export function AppointmentRequests() {
  const [requests, setRequests] = useState<AppointmentRequest[]>([])
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentRequest | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedTime, setSelectedTime] = useState("")
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const timeSlots = [
    "09:00 AM",
    "09:30 AM",
    "10:00 AM",
    "10:30 AM",
    "11:00 AM",
    "11:30 AM",
    "02:00 PM",
    "02:30 PM",
    "03:00 PM",
    "03:30 PM",
    "04:00 PM",
    "04:30 PM",
  ]

  // Fetch appointment requests from the API
  const fetchAppointmentRequests = useCallback(async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No authentication token found")
      }

      const user = JSON.parse(localStorage.getItem("user") || "{}")
      const doctorId = user.id

      const response = await fetch(
        `http://localhost:4000/api/appointments?userId=${doctorId}&userType=doctor&filter=pending`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      if (data.success) {
        // Log the raw data to see what we're getting
        console.log("Raw appointment data:", data.appointments)

        // Transform the API response to match the AppointmentRequest interface
        const formattedRequests = data.appointments.map((appointment) => {
          // Format date properly
          let formattedDate = "Date not specified"
          try {
            if (appointment.date) {
              const dateObj = new Date(appointment.date)
              if (!isNaN(dateObj.getTime())) {
                formattedDate = dateObj.toLocaleDateString()
              }
            }
          } catch (e) {
            console.error("Error formatting date:", e)
          }

          return {
            id: appointment._id || appointment.id,
            patientName: appointment.patientName || "Unknown Patient",
            patientId: appointment.patientId || "Unknown ID",
            requestedDate: formattedDate,
            requestedTime: appointment.timeSlot?.startTime || "No time specified",
            type: appointment.consultationType || "Regular",
            status: appointment.status || "pending",
            note: appointment.symptoms || "",
            createdAt: appointment.createdAt || new Date().toISOString(),
          }
        })

        console.log("Formatted requests:", formattedRequests)

        // Filter out past-time requests
        const now = new Date()
        const filteredRequests = formattedRequests.filter((request) => {
          // Only keep pending requests
          if (request.status !== "pending") {
            return false
          }

          // Check if the appointment time has passed
          try {
            const [requestMonth, requestDay, requestYear] = request.requestedDate.split("/")
            const requestDate = new Date(
              Number.parseInt(requestYear),
              Number.parseInt(requestMonth) - 1,
              Number.parseInt(requestDay),
            )

            // Parse time (assuming format like "9:00 AM")
            let [hours, minutesPeriod] = request.requestedTime.split(":")
            let [minutes, period] = minutesPeriod.split(" ")
            hours = Number.parseInt(hours)
            minutes = Number.parseInt(minutes)

            // Convert to 24-hour format
            if (period && period.toUpperCase() === "PM" && hours < 12) {
              hours += 12
            } else if (period && period.toUpperCase() === "AM" && hours === 12) {
              hours = 0
            }

            requestDate.setHours(hours, minutes, 0, 0)

            // Return false (filter out) if the appointment time has passed
            return requestDate > now
          } catch (e) {
            console.error("Error parsing date/time:", e)
            // If there's an error parsing, keep the request (fail safe)
            return true
          }
        })

        setRequests(filteredRequests)
      } else {
        throw new Error(data.message || "Failed to fetch appointment requests")
      }
    } catch (error) {
      console.error("Error fetching appointment requests:", error)
      setError(error instanceof Error ? error.message : "Failed to load appointment requests")
      setRequests([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAppointmentRequests()
  }, [fetchAppointmentRequests])

  const handleAccept = async (appointmentId: string) => {
    try {
      const token = localStorage.getItem("token")
      console.log("Accepting appointment with ID:", appointmentId)

      const response = await fetch(`http://localhost:4000/api/appointments/${appointmentId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: "confirmed",
          notes: "Appointment confirmed by doctor",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to accept appointment")
      }

      // Remove the accepted request from the list
      setRequests((prev) => prev.filter((req) => req.id !== appointmentId))

      toast({
        title: "Appointment Accepted",
        description: "The patient will be notified of your decision.",
      })

      // Refresh the list
      // fetchAppointmentRequests()
    } catch (error) {
      console.error("Error accepting appointment:", error)
      toast({
        title: "Error",
        description: "Failed to accept appointment",
        variant: "destructive",
      })
    }
  }

  const handleReject = async (appointmentId: string) => {
    try {
      const token = localStorage.getItem("token")
      console.log("Rejecting appointment with ID:", appointmentId)

      const response = await fetch(`http://localhost:4000/api/appointments/${appointmentId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: "rejected",
          notes: "Appointment rejected by doctor",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to reject appointment")
      }

      // Remove the rejected request from the list
      setRequests((prev) => prev.filter((req) => req.id !== appointmentId))

      toast({
        title: "Appointment Rejected",
        description: "The patient will be notified of your decision.",
      })

      // Refresh the list
      // fetchAppointmentRequests()
    } catch (error) {
      console.error("Error rejecting appointment:", error)
      toast({
        title: "Error",
        description: "Failed to reject appointment",
        variant: "destructive",
      })
    }
  }

  const handleReschedule = (appointment: AppointmentRequest) => {
    setSelectedAppointment(appointment)
    setIsRescheduleDialogOpen(true)
  }

  const confirmReschedule = async () => {
    if (!selectedAppointment || !selectedDate || !selectedTime) {
      toast({
        title: "Error",
        description: "Please select both date and time for rescheduling.",
        variant: "destructive",
      })
      return
    }

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`http://localhost:4000/api/appointments/${selectedAppointment.id}/reschedule`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          newDate: selectedDate.toISOString().split("T")[0],
          newTimeSlot: {
            startTime: selectedTime,
            endTime: calculateEndTime(selectedTime),
          },
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to reschedule appointment")
      }

      // Update local state
      setRequests((prev) =>
        prev.map((req) =>
          req.id === selectedAppointment.id
            ? {
                ...req,
                status: "rescheduled",
                requestedDate: selectedDate.toLocaleDateString(),
                requestedTime: selectedTime,
              }
            : req,
        ),
      )

      toast({
        title: "Appointment Rescheduled",
        description: "The patient will be notified of the new schedule.",
      })
      setIsRescheduleDialogOpen(false)
    } catch (error) {
      console.error("Error rescheduling appointment:", error)
      toast({
        title: "Error",
        description: "Failed to reschedule appointment",
        variant: "destructive",
      })
    }
  }

  // Helper function to calculate end time (30 minutes after start time)
  const calculateEndTime = (startTime: string) => {
    const [time, period] = startTime.split(" ")
    const [hours, minutes] = time.split(":").map(Number)

    const totalMinutes = hours * 60 + minutes + 30
    const newHours = Math.floor(totalMinutes / 60) % 12 || 12
    const newMinutes = totalMinutes % 60

    return `${newHours}:${newMinutes.toString().padStart(2, "0")} ${period}`
  }

  // Inside the AppointmentRequests component, after the existing useEffect hooks:
  useEffect(() => {
    // Set up an interval to check for past-time requests every minute
    const intervalId = setInterval(() => {
      const now = new Date()
      setRequests((currentRequests) =>
        currentRequests.filter((request) => {
          try {
            const [requestMonth, requestDay, requestYear] = request.requestedDate.split("/")
            const requestDate = new Date(
              Number.parseInt(requestYear),
              Number.parseInt(requestMonth) - 1,
              Number.parseInt(requestDay),
            )

            // Parse time (assuming format like "9:00 AM")
            let [hours, minutesPeriod] = request.requestedTime.split(":")
            let [minutes, period] = minutesPeriod.split(" ")
            hours = Number.parseInt(hours)
            minutes = Number.parseInt(minutes)

            // Convert to 24-hour format
            if (period && period.toUpperCase() === "PM" && hours < 12) {
              hours += 12
            } else if (period && period.toUpperCase() === "AM" && hours === 12) {
              hours = 0
            }

            requestDate.setHours(hours, minutes, 0, 0)

            // Return false (filter out) if the appointment time has passed
            return requestDate > now
          } catch (e) {
            console.error("Error parsing date/time:", e)
            // If there's an error parsing, keep the request (fail safe)
            return true
          }
        }),
      )
    }, 60000) // Check every minute

    // Clean up the interval when the component unmounts
    return () => clearInterval(intervalId)
  }, [])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Appointment Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Appointment Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchAppointmentRequests} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appointment Requests</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {requests.length === 0 ? (
            <p className="text-center text-muted-foreground">No appointment requests yet.</p>
          ) : (
            requests.map((request) => (
              <div key={request.id} className="flex flex-col p-4 border rounded-lg">
                {/* Patient Info Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${request.patientName}`} />
                      <AvatarFallback>
                        {request.patientName
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold">{request.patientName}</h4>
                      <p className="text-sm text-gray-500">Patient ID: {request.patientId}</p>
                    </div>
                  </div>

                  {/* Status Badge and Action Buttons */}
                  <div className="flex items-center gap-2">
                    {request.status === "pending" ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(request.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAccept(request.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Accept
                        </Button>
                      </>
                    ) : (
                      <Badge
                        variant={
                          request.status === "accepted"
                            ? "success"
                            : request.status === "rejected"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </Badge>
                    )}
                    {request.status === "accepted" && (
                      <Button variant="outline" size="sm" onClick={() => handleReschedule(request)}>
                        Reschedule
                      </Button>
                    )}
                  </div>
                </div>

                {/* Appointment Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 bg-gray-50 p-3 rounded-md">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarDays className="h-4 w-4 text-gray-500" />
                      <span className="font-medium text-sm">Date:</span>
                      <span className="text-sm">{request.requestedDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="font-medium text-sm">Time:</span>
                      <span className="text-sm">{request.requestedTime}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{request.type}</Badge>
                    </div>
                    {request.note && (
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-sm">Note:</span>
                        <span className="text-sm text-gray-700">{request.note}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <Dialog open={isRescheduleDialogOpen} onOpenChange={setIsRescheduleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reschedule Appointment</DialogTitle>
              <DialogDescription>Select a new date and time for the appointment.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Date</label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date() || date > new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Time</label>
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time slot" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsRescheduleDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={confirmReschedule}>Confirm Reschedule</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

interface TimeSlot {
  startTime: string
  endTime: string
  isAvailable: boolean
  isBreak: boolean
}

interface DayAvailability {
  date: string
  isAvailable: boolean
  timeSlots: TimeSlot[]
  breaks: TimeSlot[]
}

export function AvailabilityManager({ isOnBreak }: { isOnBreak: boolean }) {
  const [availability, setAvailability] = useState<{ [date: string]: DayAvailability }>({})
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [workingHours, setWorkingHours] = useState({
    start: "09:00",
    end: "17:00",
  })
  const [breakTime, setBreakTime] = useState({
    start: "",
    end: "",
  })
  const [isLeave, setIsLeave] = useState(false)
  const [leaveReason, setLeaveReason] = useState("")
  const { toast } = useToast()
  const [isSettingAvailability, setIsSettingAvailability] = useState(false)

  const [weeklyAvailability, setWeeklyAvailability] = useState<{
    [date: string]: boolean
  }>({})
  const [isLoadingDates, setIsLoadingDates] = useState(true)
  const [savedAvailability, setSavedAvailability] = useState<{
    [date: string]: {
      workingHours: { start: string; end: string }
      breaks: { startTime: string; endTime: string }[]
      isAvailable: boolean
      leaveReason: string
    }
  }>({})
  const [isEditing, setIsEditing] = useState(false)

  // Add at the top of the component
  const user = JSON.parse(localStorage.getItem("user") || "{}")
  const socket = useSocket(user.id, "doctor")

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const doctorId = user.id

  // Update the fetchAvailability function in the AvailabilityManager component
  const fetchAvailability = useCallback(
    async (date: Date) => {
      try {
        setIsLoading(true)
        const token = localStorage.getItem("token")
        if (!token) {
          throw new Error("No authentication token found")
        }

        // Format the date properly for the API
        const formattedDate = date.toISOString().split("T")[0]

        // Ensure doctorId is properly formatted and encoded
        const encodedDoctorId = encodeURIComponent(doctorId)

        const response = await fetch(
          `http://localhost:4000/api/doctor/availability/${encodedDoctorId}/${formattedDate}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )

        if (!response.ok) {
          if (response.status === 404) {
            // Handle 404 by returning default availability
            return {
              date: formattedDate,
              isAvailable: true,
              regularHours: { start: "09:00", end: "17:00" },
              timeSlots: [],
              breaks: [],
            }
          }
          const errorData = await response.json()
          throw new Error(errorData.message || "Failed to fetch availability")
        }

        const data = await response.json()
        if (!data.success) {
          throw new Error(data.message || "Failed to fetch availability")
        }

        return data.data
      } catch (error) {
        console.error("Error fetching availability:", error)
        setError(error instanceof Error ? error.message : "Failed to fetch availability")
        // Return default availability on error
        return {
          date: date.toISOString().split("T")[0],
          isAvailable: true,
          regularHours: { start: "09:00", end: "17:00" },
          timeSlots: [],
          breaks: [],
        }
      } finally {
        setIsLoading(false)
      }
    },
    [doctorId],
  )

  const fetchAllAvailabilities = useCallback(async () => {
    try {
      setIsLoadingDates(true)
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No authentication token found")
      }

      const response = await fetch(`http://localhost:4000/api/doctor/availabilities/${doctorId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch availabilities")
      }

      const data = await response.json()
      if (data.success) {
        // Update savedAvailability state with all availabilities
        const savedData = {}
        data.data.forEach((item) => {
          const formattedDate = new Date(item.date).toISOString().split("T")[0]
          savedData[formattedDate] = {
            workingHours: item.regularHours,
            breaks: item.breaks || [],
            isAvailable: item.isAvailable,
            leaveReason: item.leaveReason,
          }
        })
        setSavedAvailability(savedData)

        // Update weekly availability state
        const weeklyData = {}
        data.data.forEach((item) => {
          const formattedDate = new Date(item.date).toISOString().split("T")[0]
          weeklyData[formattedDate] = item.isAvailable
        })
        setWeeklyAvailability(weeklyData)

        // If the selected date is in the saved data, update the form
        const selectedDateStr = selectedDate.toISOString().split("T")[0]
        if (savedData[selectedDateStr]) {
          setWorkingHours(savedData[selectedDateStr].workingHours)
          setIsLeave(!savedData[selectedDateStr].isAvailable)
          setLeaveReason(savedData[selectedDateStr].leaveReason || "")
        }
      }
    } catch (error) {
      console.error("Error fetching all availabilities:", error)
      toast({
        title: "Error",
        description: "Failed to load availability settings",
        variant: "destructive",
      })
    } finally {
      setIsLoadingDates(false)
    }
  }, [doctorId, selectedDate, toast])

  useEffect(() => {
    if (socket) {
      socket.on("availabilityUpdated", (data) => {
        const { date, availability: newAvailability } = data

        // Add null check for newAvailability
        if (!newAvailability) {
          console.error("Received undefined availability data")
          return
        }

        // Update availability state
        setAvailability((prev) => {
          // Only update if the data is newer
          if (
            !prev[date] ||
            !prev[date].lastUpdated ||
            !newAvailability.lastUpdated ||
            new Date(newAvailability.lastUpdated) > new Date(prev[date].lastUpdated)
          ) {
            return {
              ...prev,
              [date]: {
                ...newAvailability,
                date,
              },
            }
          }
          return prev
        })

        // Update savedAvailability state with null checks
        setSavedAvailability((prev) => ({
          ...prev,
          [date]: {
            workingHours: newAvailability.regularHours || newAvailability.workHours || { start: "09:00", end: "17:00" },
            breaks: newAvailability.breaks || [],
            isAvailable: newAvailability.isAvailable !== undefined ? newAvailability.isAvailable : true,
            leaveReason: newAvailability.leaveReason || "",
          },
        }))

        // Update weeklyAvailability state
        setWeeklyAvailability((prev) => ({
          ...prev,
          [date]: newAvailability.isAvailable !== undefined ? newAvailability.isAvailable : true,
        }))

        // If this is for the currently selected date, update the form
        const selectedDateStr = selectedDate.toISOString().split("T")[0]
        if (date === selectedDateStr) {
          setWorkingHours(newAvailability.regularHours || newAvailability.workHours || { start: "09:00", end: "17:00" })
          setIsLeave(newAvailability.isAvailable !== undefined ? !newAvailability.isAvailable : false)
          setLeaveReason(newAvailability.leaveReason || "")
        }
      })
    }

    return () => {
      if (socket) {
        socket.off("availabilityUpdated")
      }
    }
  }, [socket, selectedDate])

  // Update the useEffect that calls fetchAvailability
  useEffect(() => {
    fetchAvailability(selectedDate)
    fetchAllAvailabilities() // Add this line to fetch all availabilities
  }, [selectedDate, fetchAvailability, fetchAllAvailabilities])

  const handleSetAvailability = async () => {
    try {
      setIsSettingAvailability(true)
      const token = localStorage.getItem("token")
      const formattedDate = selectedDate.toISOString().split("T")[0]

      // Validate working hours
      if (!workingHours.start || !workingHours.end) {
        toast({
          title: "Error",
          description: "Please set both start and end working hours",
          variant: "destructive",
        })
        return
      }

      // Validate working hours format
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
      if (!timeRegex.test(workingHours.start) || !timeRegex.test(workingHours.end)) {
        toast({
          title: "Error",
          description: "Invalid time format. Please use HH:mm format (e.g., 09:00)",
          variant: "destructive",
        })
        return
      }

      // Create availability data with proper structure
      const availabilityData = {
        date: formattedDate,
        regularHours: {
          start: workingHours.start,
          end: workingHours.end,
        },
        breaks: availability[formattedDate]?.breaks || [],
        isAvailable: !isLeave,
        leaveReason: isLeave ? leaveReason : undefined,
      }

      console.log("Sending availability data:", availabilityData) // Debug log

      const response = await fetch("http://localhost:4000/api/doctor/set-availability", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(availabilityData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to set availability")
      }

      const data = await response.json()
      if (data.success) {
        // Update availability state
        setAvailability((prev) => ({
          ...prev,
          [formattedDate]: {
            date: formattedDate,
            isAvailable: !isLeave,
            breaks: data.data.breaks || [],
            timeSlots: data.data.timeSlots || [],
            workHours: data.data.regularHours,
          },
        }))

        // Update savedAvailability state
        setSavedAvailability((prev) => ({
          ...prev,
          [formattedDate]: {
            workingHours: data.data.regularHours,
            breaks: data.data.breaks || [],
            isAvailable: !isLeave,
            leaveReason: isLeave ? leaveReason : undefined,
          },
        }))

        // Update weeklyAvailability state
        setWeeklyAvailability((prev) => ({
          ...prev,
          [formattedDate]: !isLeave,
        }))

        // Show success notification
        toast({
          title: "Success!",
          description: `Availability ${isLeave ? "and leave " : ""}updated successfully for ${selectedDate.toLocaleDateString()}`,
        })

        // Emit socket event for real-time updates
        if (socket) {
          socket.emit("availabilityUpdate", {
            doctorId: user.id,
            date: formattedDate,
            availability: data.data,
          })
        }

        setIsEditing(false)

        // Refresh all availabilities to ensure consistency
        fetchAllAvailabilities()
      }
    } catch (error) {
      console.error("Error setting availability:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to set availability",
        variant: "destructive",
      })
    } finally {
      setIsSettingAvailability(false)
    }
  }

  const handleEditAvailability = (date: string) => {
    const savedData = savedAvailability[date]
    if (savedData) {
      setWorkingHours(savedData.workingHours)
      setIsLeave(!savedData.isAvailable)
      setLeaveReason(savedData.leaveReason || "")
      setSelectedDate(new Date(date))
      setIsEditing(true)
    }
  }

  // Get date range for next 7 days
  const getDateRange = () => {
    const today = new Date()
    const nextWeek = new Date(today)
    nextWeek.setDate(today.getDate() + 7)
    return { from: today, to: nextWeek }
  }

  const dateRange = getDateRange()

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Availability Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            {/* Working Hours Section */}
            <div className="space-y-4">
              <h3 className="font-semibold">Working Hours</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={workingHours.start}
                    onChange={(e) => setWorkingHours((prev) => ({ ...prev, start: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={workingHours.end}
                    onChange={(e) => setWorkingHours((prev) => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Calendar Section */}
            <div className="space-y-4">
              <h3 className="font-semibold">Schedule Management</h3>
              <div className="flex gap-6">
                <div className="flex-1">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    disabled={(date) => {
                      return date < dateRange.from || date > dateRange.to
                    }}
                    modifiers={{
                      available: (date) => {
                        const dateStr = date.toISOString().split("T")[0]
                        return Boolean(weeklyAvailability[dateStr])
                      },
                      unavailable: (date) => {
                        const dateStr = date.toISOString().split("T")[0]
                        return weeklyAvailability[dateStr] === false
                      },
                    }}
                    modifiersStyles={{
                      available: { backgroundColor: "var(--success-50)", color: "var(--success-900)" },
                      unavailable: { backgroundColor: "var(--destructive-50)", color: "var(--destructive-900)" },
                    }}
                    className="rounded-md border"
                  />
                  <div className="mt-4 flex gap-2">
                    <Button onClick={handleSetAvailability} disabled={isSettingAvailability}>
                      {isSettingAvailability ? "Saving..." : isEditing ? "Update Availability" : "Set Availability"}
                    </Button>
                    {isEditing && (
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  {/* Leave Management */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Mark as Leave Day</Label>
                      <Switch checked={isLeave} onCheckedChange={setIsLeave} />
                    </div>
                    {isLeave && (
                      <Input
                        placeholder="Reason for leave"
                        value={leaveReason}
                        onChange={(e) => setLeaveReason(e.target.value)}
                      />
                    )}
                  </div>

                  <Separator />

                  {/* Break Management */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Add Break Time</h4>
                    <div className="grid gap-4">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label>Start Time</Label>
                          <Input
                            type="time"
                            value={breakTime.start}
                            onChange={(e) => setBreakTime((prev) => ({ ...prev, start: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>End Time</Label>
                          <Input
                            type="time"
                            value={breakTime.end}
                            onChange={(e) => setBreakTime((prev) => ({ ...prev, end: e.target.value }))}
                          />
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          // Add break time logic here
                          if (breakTime.start && breakTime.end) {
                            const formattedDate = selectedDate.toISOString().split("T")[0]
                            const currentBreaks = availability[formattedDate]?.breaks || []
                            setAvailability((prev) => ({
                              ...prev,
                              [formattedDate]: {
                                ...prev[formattedDate],
                                breaks: [...currentBreaks, breakTime],
                              },
                            }))
                            setBreakTime({ start: "", end: "" })
                          }
                        }}
                      >
                        Add Break
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Saved Availability Section */}
            <div className="space-y-4">
              <h3 className="font-semibold">Saved Availability</h3>
              <div className="space-y-4">
                {Object.entries(savedAvailability).map(([date, data]) => (
                  <Card key={date}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{new Date(date).toLocaleDateString()}</p>
                          <p className="text-sm text-muted-foreground">
                            {data.isAvailable ? (
                              <>
                                Working Hours: {data.workingHours.start} - {data.workingHours.end}
                                {data.breaks.length > 0 && (
                                  <span className="ml-2">
                                    ({data.breaks.length} break{data.breaks.length > 1 ? "s" : ""})
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-destructive">
                                On Leave{data.leaveReason ? `: ${data.leaveReason}` : ""}
                              </span>
                            )}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleEditAvailability(date)}>
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Current Day Schedule */}
            <div className="space-y-4">
              <h3 className="font-semibold">Schedule for {selectedDate.toLocaleDateString()}</h3>
              <ScrollArea className="h-[200px] rounded-md border p-4">
                {availability[selectedDate.toISOString().split("T")[0]]?.timeSlots?.map((slot, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {slot.startTime} - {slot.endTime}
                      </span>
                    </div>
                    <Badge variant={slot.isBreak ? "destructive" : slot.isAvailable ? "success" : "secondary"}>
                      {slot.isBreak ? "Break" : slot.isAvailable ? "Available" : "Booked"}
                    </Badge>
                  </div>
                )) || <div className="text-center text-muted-foreground">No time slots available</div>}
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>

      {isOnBreak && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Currently On Break</AlertTitle>
          <AlertDescription>
            You are currently on a break. New appointments cannot be scheduled during this time.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

// PatientList Component
export function PatientList() {
  const patients = [
    { id: 1, name: "Alice Johnson", lastVisit: "2023-05-15", condition: "Hypertension" },
    { id: 2, name: "Bob Smith", lastVisit: "2023-05-18", condition: "Diabetes" },
    { id: 3, name: "Charlie Brown", lastVisit: "2023-05-20", condition: "Asthma" },
    { id: 4, name: "Diana Ross", lastVisit: "2023-05-22", condition: "Arthritis" },
    { id: 5, name: "Edward Norton", lastVisit: "2023-05-25", condition: "Migraine" },
  ]

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Last Visit</TableHead>
          <TableHead>Condition</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {patients.map((patient) => (
          <TableRow key={patient.id}>
            <TableCell className="font-medium">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${patient.name}`} />
                  <AvatarFallback>
                    {patient.name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>{patient.name}</div>
              </div>
            </TableCell>
            <TableCell>{patient.lastVisit}</TableCell>
            <TableCell>{patient.condition}</TableCell>
            <TableCell>
              <Button size="sm">View Records</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// RecentActivities Component
export function RecentActivities() {
  const activities = [
    {
      id: 1,
      type: "appointment",
      description: "Appointment with Alice Johnson completed",
      time: "2 hours ago",
    },
    {
      id: 2,
      type: "prescription",
      description: "Prescription issued for Bob Smith",
      time: "4 hours ago",
    },
    {
      id: 3,
      type: "lab_result",
      description: "Lab results received for Carol White",
      time: "Yesterday",
    },
    {
      id: 4,
      type: "note",
      description: "Added notes to David Brown's record",
      time: "2 days ago",
    },
  ]

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-center space-x-4">
          <div className="bg-blue-100 p-2 rounded-full">
            <Activity className="h-4 w-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{activity.description}</p>
            <p className="text-xs text-gray-500">{activity.time}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

