"use client"

import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AppointmentList, AvailabilityManager } from "../components/appointments"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Clock, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useSocket } from "@/hooks/useSocket"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Appointment {
  id: string
  patientName: string
  date: string
  time: string
  type: string
  status: string
  symptoms?: string
}

interface AppointmentRequest {
  id: string
  patientName: string
  requestedDate: string
  requestedTime: string
  note?: string
}

// Update the AppointmentRequests component in appointments.tsx
export function AppointmentRequests() {
  const [requests, setRequests] = useState<AppointmentRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  const user = JSON.parse(localStorage.getItem("user") || "{}")
  const socket = useSocket(user.id, "doctor")

  const fetchRequests = useCallback(async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(
        `http://localhost:4000/api/appointments?userId=${user.id}&userType=doctor&status=pending`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) {
        throw new Error("Failed to fetch appointment requests")
      }

      const data = await response.json()
      if (data.success) {
        // Process the appointments to ensure dates are properly formatted
        const formattedAppointments = data.appointments
          .filter((appointment) => appointment.status === "pending") // Only include pending appointments
          .map((appointment) => {
            // Format date properly
            let formattedDate = "Date not available"
            let formattedTime = "Time not available"

            try {
              if (appointment.date) {
                const dateObj = new Date(appointment.date)
                if (!isNaN(dateObj.getTime())) {
                  formattedDate = dateObj.toLocaleDateString()
                }
              }

              if (appointment.timeSlot && appointment.timeSlot.startTime) {
                formattedTime = appointment.timeSlot.startTime
              }
            } catch (error) {
              console.error("Error formatting date/time:", error)
            }

            return {
              id: appointment._id || appointment.id,
              patientName: appointment.patientName || "Unknown Patient",
              requestedDate: formattedDate,
              requestedTime: formattedTime,
              note: appointment.symptoms || "",
              type: appointment.consultationType || "Regular",
              status: appointment.status,
            }
          })

        setRequests(formattedAppointments)
        console.log("Formatted appointments:", formattedAppointments)
      }
    } catch (error) {
      console.error("Error fetching requests:", error)
      toast({
        title: "Error",
        description: "Failed to load appointment requests",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [user.id, toast])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  useEffect(() => {
    if (socket) {
      socket.on("newAppointmentRequest", (data) => {
        console.log("New appointment request received:", data)
        toast({
          title: "New Appointment Request",
          description: `New request from ${data.patientName} for ${data.date}`,
        })
        fetchRequests() // Refresh the requests list
      })

      return () => {
        socket.off("newAppointmentRequest")
      }
    }
  }, [socket, toast, fetchRequests])

  const handleAction = async (appointmentId: string, status: "accepted" | "rejected") => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem("token")
      const user = JSON.parse(localStorage.getItem("user") || "{}")

      // Update the status to "confirmed" instead of "accepted" to match backend expectations
      const statusToSend = status === "accepted" ? "confirmed" : "rejected"

      // Immediately remove the appointment from the local state to prevent double-clicking
      setRequests((prev) => prev.filter((req) => req.id !== appointmentId))

      // Include role information in the request body
      const requestBody = {
        status: statusToSend,
        notes: status === "accepted" ? "Appointment confirmed by doctor" : "Appointment rejected by doctor",
        doctorId: user.id,
        doctorRole: "doctor", // Include role information
        userType: "doctor", // Include user type
      }

      console.log("Sending appointment status update:", {
        appointmentId,
        ...requestBody,
        token: token ? "Present" : "Missing",
      })

      // Also include role information in the headers
      const response = await fetch(`http://localhost:4000/api/appointments/${appointmentId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "user-role": "doctor", // Add role in header
          user: JSON.stringify({ userType: "doctor", role: "doctor" }), // Add user info in header
        },
        body: JSON.stringify(requestBody),
      })

      console.log("Response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Error response:", errorText)
        let errorMessage = "Failed to update appointment status"

        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.message || errorMessage
        } catch (e) {
          // If parsing fails, use the raw text
          errorMessage = errorText || errorMessage
        }

        // If we get an error about already confirmed, just ignore it since we've already removed it from UI
        if (errorMessage.includes("Cannot change appointment status from confirmed to confirmed")) {
          console.log("Appointment was already confirmed, ignoring error")
          toast({
            title: status === "accepted" ? "Appointment Confirmed" : "Appointment Rejected",
            description:
              status === "accepted"
                ? "The patient will be notified that their appointment has been confirmed."
                : "The patient will be notified that their appointment has been rejected.",
          })
          return
        }

        throw new Error(`Failed to ${status} appointment: ${errorMessage}`)
      }

      const data = await response.json()
      console.log("Success response:", data)

      // Emit socket event for real-time updates
      if (socket) {
        socket.emit("appointmentStatusUpdate", {
          appointmentId,
          status: statusToSend,
          doctorId: user.id,
          doctorName: `Dr. ${user.firstName} ${user.lastName}`,
          patientId: data.data?.appointment?.patientId,
          date: data.data?.appointment?.date,
          time: data.data?.appointment?.timeSlot?.startTime,
          message:
            status === "accepted"
              ? "Your appointment request has been confirmed"
              : "Your appointment request has been rejected",
        })
      }

      toast({
        title: status === "accepted" ? "Appointment Confirmed" : "Appointment Rejected",
        description:
          status === "accepted"
            ? "The patient will be notified that their appointment has been confirmed."
            : "The patient will be notified that their appointment has been rejected.",
      })

      // No need to call fetchRequests here since we've already removed the item from the UI
      // and we don't want to risk showing it again if the backend hasn't fully processed the update
    } catch (error) {
      console.error(`Error ${status} appointment:`, error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${status} appointment`,
        variant: "destructive",
      })
      // If there was an error, refresh the requests to restore any incorrectly removed items
      fetchRequests()
    } finally {
      setIsLoading(false)
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appointment Requests</CardTitle>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-center text-muted-foreground">No pending appointment requests.</p>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${request.patientName}`} />
                    <AvatarFallback>
                      {request.patientName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-semibold">{request.patientName}</h4>
                    <p className="text-sm text-muted-foreground">
                      {request.requestedDate} at {request.requestedTime}
                    </p>
                    {request.type && <Badge className="mt-1">{request.type}</Badge>}
                    {request.note && <p className="text-sm mt-1">{request.note}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction(request.id, "rejected")}
                    className="text-red-600 hover:text-red-700"
                  >
                    Reject
                  </Button>
                  <Button size="sm" onClick={() => handleAction(request.id, "accepted")} className="bg-green-600">
                    Accept
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

export default function AppointmentsPage() {
  const [activeTab, setActiveTab] = useState("today")
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isOnBreak, setIsOnBreak] = useState(false)
  const [breakEndTime, setBreakEndTime] = useState<Date | null>(null)
  const { toast } = useToast()
  const [availability, setAvailability] = useState<{ [date: string]: { isAvailable: boolean } }>({})
  const [weeklyAvailability, setWeeklyAvailability] = useState<{ [date: string]: boolean }>({})
  const [workingHours, setWorkingHours] = useState<{ startTime: string; endTime: string } | null>(null)
  const [isLoadingDates, setIsLoadingDates] = useState(false)

  const user = JSON.parse(localStorage.getItem("user") || "{}")
  const socket = useSocket(user.id, "doctor")

  useEffect(() => {
    if (socket) {
      socket.on("newAppointmentRequest", (appointmentData) => {
        toast({
          title: "New Appointment Request",
          description: `New appointment request from ${appointmentData.patientName} for ${appointmentData.date} at ${appointmentData.timeSlot.startTime}`,
        })
        // Refresh appointment requests list
        fetchAppointmentRequests()
      })

      return () => {
        socket.off("newAppointmentRequest")
      }
    }
  }, [socket, toast])

  const fetchAppointmentRequests = useCallback(async () => {
    // Implement the logic to fetch appointment requests here
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(
        `http://localhost:4000/api/appointments?userId=${user.id}&userType=doctor&status=pending`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) {
        throw new Error("Failed to fetch appointment requests")
      }

      const data = await response.json()
      if (data.success) {
        // Update any state that holds appointment requests
        // This will depend on how your component is structured
        // If you have a state for requests, update it here
      }
    } catch (error) {
      console.error("Error fetching requests:", error)
      toast({
        title: "Error",
        description: "Failed to load appointment requests",
        variant: "destructive",
      })
    }
  }, [user.id, toast])

  useEffect(() => {
    if (socket) {
      socket.on("newAppointmentRequest", (appointmentData) => {
        console.log("New appointment request received:", appointmentData)
        toast({
          title: "New Appointment Request",
          description: `New request from ${appointmentData.patientName} for ${appointmentData.requestedDate} at ${appointmentData.requestedTime}`,
        })
        // Refresh appointment requests list
        fetchAppointmentRequests()
      })

      return () => {
        socket.off("newAppointmentRequest")
      }
    }
  }, [socket, toast, fetchAppointmentRequests])

  const fetchAvailability = useCallback(async () => {
    try {
      setIsLoadingDates(true)
      const token = localStorage.getItem("token")
      const user = JSON.parse(localStorage.getItem("user") || "{}")

      const response = await fetch(
        `http://localhost:4000/api/doctor/availability/${user.id}/${new Date().toISOString().split("T")[0]}/7`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) throw new Error("Failed to fetch availability")

      const data = await response.json()
      if (data.success) {
        setAvailability(data.data)
        if (data.workingHours) {
          setWorkingHours(data.workingHours)
        }

        const weeklyData: { [date: string]: boolean } = {}
        Object.keys(data.data).forEach((date) => {
          weeklyData[date] = data.data[date].isAvailable
        })
        setWeeklyAvailability(weeklyData)
      }
    } catch (error) {
      console.error("Error fetching availability:", error)
      toast({
        title: "Error",
        description: "Failed to load availability settings",
        variant: "destructive",
      })
    } finally {
      setIsLoadingDates(false)
    }
  }, [toast])

  // Function to handle quick break
  const handleQuickBreak = async (duration: number) => {
    try {
      const token = localStorage.getItem("token")
      const endTime = new Date(Date.now() + duration * 60000) // Convert minutes to milliseconds

      const response = await fetch("http://localhost:4000/api/doctor/break", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          startTime: new Date(),
          endTime,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to set break")
      }

      setIsOnBreak(true)
      setBreakEndTime(endTime)
      toast({
        title: "Break Started",
        description: `You are now on break until ${endTime.toLocaleTimeString()}`,
      })

      // Set timeout to automatically end break
      setTimeout(() => {
        setIsOnBreak(false)
        setBreakEndTime(null)
        toast({
          title: "Break Ended",
          description: "Your break has ended. You are now available for appointments.",
        })
      }, duration * 60000)
    } catch (error) {
      console.error("Error setting break:", error)
      toast({
        title: "Error",
        description: "Failed to set break. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Function to end break early
  const handleEndBreak = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("http://localhost:4000/api/doctor/break/end", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to end break")
      }

      setIsOnBreak(false)
      setBreakEndTime(null)
      toast({
        title: "Break Ended",
        description: "You are now available for appointments.",
      })
    } catch (error) {
      console.error("Error ending break:", error)
      toast({
        title: "Error",
        description: "Failed to end break. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleAppointmentAction = async (appointmentId: string, status: string) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`http://localhost:4000/api/doctor/appointments/${appointmentId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        throw new Error("Failed to update appointment status")
      }

      const data = await response.json()

      // Emit socket event for real-time updates
      if (socket) {
        socket.emit("appointmentStatusUpdate", {
          appointmentId,
          status,
          doctorId: user.id,
          doctorName: `Dr. ${user.firstName} ${user.lastName}`,
          patientId: data.appointment.patientId,
          date: data.appointment.date,
          time: data.appointment.time,
        })
      }

      toast({
        title: "Success",
        description: `Appointment ${status} successfully`,
      })

      // Refresh appointment list
      fetchAppointmentRequests()
    } catch (error) {
      console.error("Error updating appointment status:", error)
      toast({
        title: "Error",
        description: "Failed to update appointment status",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage Appointments</h1>
        <div className="flex gap-2">
          {isOnBreak ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="px-3 py-1">
                <Clock className="w-4 h-4 mr-1" />
                On Break until {breakEndTime?.toLocaleTimeString()}
              </Badge>
              <Button size="sm" onClick={handleEndBreak}>
                End Break Early
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleQuickBreak(15)}>
                15min Break
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleQuickBreak(30)}>
                30min Break
              </Button>
            </div>
          )}
        </div>
      </div>

      {isOnBreak && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>You are currently on break</AlertTitle>
          <AlertDescription>
            New appointments cannot be booked during this time. Your break will end at{" "}
            {breakEndTime?.toLocaleTimeString()}.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="today">Today's Appointments</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming Appointments</TabsTrigger>
          <TabsTrigger value="requests">Appointment Requests</TabsTrigger>
          <TabsTrigger value="availability">Manage Availability</TabsTrigger>
        </TabsList>

        <TabsContent value="today">
          <Card>
            <CardHeader>
              <CardTitle>Today's Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <AppointmentList filter="today" onAppointmentSelect={setSelectedAppointment} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <AppointmentList filter="upcoming" onAppointmentSelect={setSelectedAppointment} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <AppointmentRequests />
        </TabsContent>

        <TabsContent value="availability">
          <AvailabilityManager isOnBreak={isOnBreak} />
        </TabsContent>
      </Tabs>

      {/* Appointment Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Patient</Label>
                <div className="col-span-3">
                  <p className="font-medium">{selectedAppointment.patientName}</p>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Date & Time</Label>
                <div className="col-span-3">
                  <p>{selectedAppointment.date}</p>
                  <p>{selectedAppointment.time}</p>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Type</Label>
                <div className="col-span-3">
                  <Badge variant="outline">{selectedAppointment.type}</Badge>
                </div>
              </div>
              {selectedAppointment.symptoms && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Symptoms</Label>
                  <div className="col-span-3">
                    <p className="text-sm">{selectedAppointment.symptoms}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

