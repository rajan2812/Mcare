"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CalendarDays, Clock, User, AlertCircle } from "lucide-react"
import { useSocket } from "@/hooks/useSocket"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"

// Update the formatDisplayDate function to avoid timezone issues
const formatDisplayDate = (dateString) => {
  if (!dateString) return "Unknown date"

  // If it's already in YYYY-MM-DD format, parse it directly
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split("-").map(Number)
    // Create a new date with the specified values and return localized string
    return new Date(year, month - 1, day).toLocaleDateString()
  }

  // Otherwise try to parse as a date string
  return new Date(dateString).toLocaleDateString()
}

interface Appointment {
  id: string
  doctorId: string
  doctorName: string
  doctorImage?: string
  date: string
  timeSlot: {
    startTime: string
    endTime: string
  }
  status: string
  type: string
  consultationType: string
  symptoms?: string
  diagnosis?: string
  prescription?: string
  notes?: string
  paymentStatus: string
  statusHistory?: { status: string; timestamp: number }[]
  requestedReschedule?: {
    date: string
    timeSlot: {
      startTime: string
      endTime: string
    }
  }
}

interface TimeSlot {
  startTime: string
  endTime: string
  isAvailable: boolean
  isBreak?: boolean
}

// Update the MyAppointments component to show reschedule request status
export function MyAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("upcoming")
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [selectedTime, setSelectedTime] = useState("")
  const [cancelReason, setCancelReason] = useState("")
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
  const { toast } = useToast()
  const [confirmingAppointmentId, setConfirmingAppointmentId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const user = JSON.parse(localStorage.getItem("user") || "{}")
  const socket = useSocket(user.id, "patient")

  const fetchAppointments = useCallback(
    async (filter = "upcoming") => {
      try {
        setIsLoading(true)
        setError(null)
        const token = localStorage.getItem("token")
        if (!token) {
          throw new Error("No authentication token found")
        }

        const user = JSON.parse(localStorage.getItem("user") || "{}")
        if (!user.id) {
          throw new Error("User information not found")
        }

        console.log("Fetching appointments with params:", {
          userId: user.id,
          userType: "patient",
          filter,
          token: token ? "Present" : "Missing",
        })

        const response = await fetch(
          `http://localhost:4000/api/appointments?userId=${user.id}&userType=patient&filter=${filter}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              user: JSON.stringify(user),
              "user-role": "patient",
            },
          },
        )

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error("API Error Response:", errorData)
          throw new Error(errorData.message || `Server responded with status: ${response.status}`)
        }

        const data = await response.json()
        if (data.success) {
          console.log("Appointments fetched successfully:", data.appointments.length)
          setAppointments(data.appointments)
        } else {
          throw new Error(data.message || "Failed to fetch appointments data")
        }
      } catch (error) {
        console.error("Error fetching appointments:", error)
        setError(error instanceof Error ? error.message : "Failed to load appointments")
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load appointments",
          variant: "destructive",
        })
        // Set empty appointments array to prevent rendering with stale data
        setAppointments([])
      } finally {
        setIsLoading(false)
      }
    },
    [user.id, toast],
  )

  useEffect(() => {
    fetchAppointments(activeTab)
  }, [fetchAppointments, activeTab])

  useEffect(() => {
    fetchAppointments()

    if (socket) {
      socket.on("appointmentStatusUpdated", () => {
        fetchAppointments(activeTab) // Refresh appointments when status is updated
      })

      socket.on("appointmentRescheduled", (data) => {
        toast({
          title: "Appointment Rescheduled",
          description: `Your appointment has been rescheduled from ${data.oldDate} at ${data.oldTime} to ${data.newDate} at ${data.newTime}`,
        })

        // Refresh appointments list after rescheduling
        fetchAppointments(activeTab)
      })

      return () => {
        socket.off("appointmentStatusUpdated")
        socket.off("appointmentRescheduled")
      }
    }
  }, [socket, fetchAppointments, activeTab])

  const handleViewDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setIsDetailsDialogOpen(true)
  }

  const handleReschedule = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setSelectedDate(new Date(appointment.date))
    setIsRescheduleDialogOpen(true)
    checkSlotAvailability(new Date(appointment.date), appointment.doctorId)
  }

  const handleCancel = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setIsCancelDialogOpen(true)
  }

  const checkSlotAvailability = async (date: Date, doctorId: string) => {
    if (!doctorId) return

    setIsCheckingAvailability(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No authentication token found")
      }

      const formattedDate = date.toISOString().split("T")[0]
      const response = await fetch(`http://localhost:4000/api/doctor/availability/${doctorId}/${formattedDate}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to check availability")
      }

      const data = await response.json()

      if (data.success) {
        const availableSlots = data.data.timeSlots.filter((slot: TimeSlot) => !slot.isBooked && !slot.isBreak) || []
        setAvailableSlots(availableSlots)
      } else {
        throw new Error(data.message || "No availability data returned")
      }
    } catch (error) {
      console.error("Error checking availability:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to check slot availability",
        variant: "destructive",
      })
    } finally {
      setIsCheckingAvailability(false)
    }
  }

  const confirmReschedule = async () => {
    if (!selectedAppointment || !selectedDate || !selectedTime) {
      toast({
        title: "Error",
        description: "Please select both date and time for rescheduling",
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
            endTime: selectedTime, // The end time will be calculated on the server
          },
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to reschedule appointment")
      }

      toast({
        title: "Success",
        description: "Appointment rescheduled successfully",
      })

      // Refresh appointments
      fetchAppointments(activeTab)
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

  const confirmCancel = async () => {
    if (!selectedAppointment) return

    try {
      const token = localStorage.getItem("token")
      const user = JSON.parse(localStorage.getItem("user") || "{}")

      console.log("Sending cancel request with user:", user)

      const response = await fetch(`http://localhost:4000/api/appointments/${selectedAppointment.id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "user-role": "patient",
          user: JSON.stringify(user),
        },
        body: JSON.stringify({
          status: "cancelled",
          notes: cancelReason,
          userType: "patient", // Add user type in the body as well
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to cancel appointment")
      }

      toast({
        title: "Success",
        description: "Appointment cancelled successfully",
      })

      // Refresh appointments
      fetchAppointments(activeTab)
      setIsCancelDialogOpen(false)
      setCancelReason("")
    } catch (error) {
      console.error("Error cancelling appointment:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel appointment",
        variant: "destructive",
      })
    }
  }

  // Update the getStatusBadgeVariant function to include pending_reschedule
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "warning"
      case "confirmed":
        return "default"
      case "in-progress":
        return "secondary"
      case "completed":
        return "success"
      case "cancelled":
        return "destructive"
      case "rejected":
        return "destructive"
      case "no-show":
        return "destructive"
      case "pending_patient_confirmation":
        return "warning"
      case "pending_reschedule":
        return "warning"
      default:
        return "outline"
    }
  }

  // Add this function to handle confirmation of rescheduled appointments
  const handleConfirmReschedule = async (appointmentId: string, action: "confirm" | "reject") => {
    try {
      setConfirmingAppointmentId(appointmentId)
      const token = localStorage.getItem("token")
      const user = JSON.parse(localStorage.getItem("user") || "{}")

      console.log("Sending confirmation request with user:", user)

      const response = await fetch(`http://localhost:4000/api/appointments/${appointmentId}/confirm-reschedule`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          user: JSON.stringify(user),
          "user-role": "patient",
        },
        body: JSON.stringify({
          action,
          userId: user.id,
          userType: "patient",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Error response:", errorData)
        throw new Error(errorData.message || "Failed to confirm appointment")
      }

      const data = await response.json()

      toast({
        title: action === "confirm" ? "Appointment Confirmed" : "Appointment Rejected",
        description: data.message,
      })

      // Refresh appointments
      fetchAppointments(activeTab)
    } catch (error) {
      console.error("Error confirming rescheduled appointment:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process your request",
        variant: "destructive",
      })
    } finally {
      setConfirmingAppointmentId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>My Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button onClick={() => fetchAppointments(activeTab)}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Update the appointment card rendering to show reschedule request status
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>My Appointments</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {appointments.length === 0 ? (
              <div className="text-center p-4 text-muted-foreground">No upcoming appointments found.</div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {appointments.map((appointment) => (
                    <Card key={appointment.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarImage
                              src={
                                appointment.doctorImage ||
                                `https://api.dicebear.com/6.x/initials/svg?seed=${appointment.doctorName}`
                              }
                            />
                            <AvatarFallback>
                              {appointment.doctorName
                                ? appointment.doctorName
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                : "DR"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-semibold">{appointment.doctorName}</h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CalendarDays className="h-4 w-4" />
                              {formatDisplayDate(appointment.date)}
                              <Clock className="h-4 w-4 ml-2" />
                              {appointment.timeSlot.startTime}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">{appointment.type}</Badge>
                              <Badge variant={appointment.consultationType === "video" ? "secondary" : "outline"}>
                                {appointment.consultationType === "video" ? (
                                  <User className="h-3 w-3 mr-1" />
                                ) : (
                                  <User className="h-3 w-3 mr-1" />
                                )}
                                {appointment.consultationType === "video" ? "Video" : "In-Person"}
                              </Badge>
                              <Badge variant={getStatusBadgeVariant(appointment.status)}>
                                {appointment.status === "pending_reschedule"
                                  ? "Reschedule Requested"
                                  : appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                              </Badge>
                              {appointment.status === "confirmed" &&
                                appointment.statusHistory &&
                                appointment.statusHistory[appointment.statusHistory.length - 1]?.timestamp >
                                  Date.now() - 24 * 60 * 60 * 1000 && <Badge className="ml-2 bg-green-500">New</Badge>}
                            </div>

                            {/* Add this section to show reschedule request details */}
                            {appointment.status === "pending_reschedule" && appointment.requestedReschedule && (
                              <div className="mt-2 text-sm text-amber-600">
                                <p>
                                  Requested new date: {formatDisplayDate(appointment.requestedReschedule.date)} at{" "}
                                  {appointment.requestedReschedule.timeSlot.startTime}
                                </p>
                                <p className="text-xs text-muted-foreground">Waiting for doctor's approval</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button size="sm" onClick={() => handleViewDetails(appointment)}>
                            View Details
                          </Button>
                          {["pending", "confirmed"].includes(appointment.status) && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleReschedule(appointment)}>
                                Reschedule
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleCancel(appointment)}>
                                Cancel
                              </Button>
                            </>
                          )}
                          {appointment.status === "confirmed" && appointment.consultationType === "video" && (
                            <Button size="sm" variant="default">
                              <User className="h-4 w-4 mr-2" />
                              Join
                            </Button>
                          )}
                          {appointment.status === "pending_patient_confirmation" && (
                            <div className="mt-2 flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleConfirmReschedule(appointment.id, "confirm")}
                                disabled={confirmingAppointmentId === appointment.id}
                              >
                                {confirmingAppointmentId === appointment.id ? "Processing..." : "Confirm"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleConfirmReschedule(appointment.id, "reject")}
                                disabled={confirmingAppointmentId === appointment.id}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {appointments.length === 0 ? (
              <div className="text-center p-4 text-muted-foreground">No past appointments found.</div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {appointments.map((appointment) => (
                    <Card key={appointment.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarImage
                              src={
                                appointment.doctorImage ||
                                `https://api.dicebear.com/6.x/initials/svg?seed=${appointment.doctorName}`
                              }
                            />
                            <AvatarFallback>
                              {appointment.doctorName ? appointment.doctorName.split(" ").map((n) => n[0]) : "DR"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-semibold">{appointment.doctorName}</h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CalendarDays className="h-4 w-4" />
                              {formatDisplayDate(appointment.date)}
                              <Clock className="h-4 w-4 ml-2" />
                              {appointment.timeSlot.startTime}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">{appointment.type}</Badge>
                              <Badge variant={getStatusBadgeVariant(appointment.status)}>
                                {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Button size="sm" onClick={() => handleViewDetails(appointment)}>
                          View Details
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="space-y-4">
            {appointments.length === 0 ? (
              <div className="text-center p-4 text-muted-foreground">No cancelled appointments found.</div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {appointments.map((appointment) => (
                    <Card key={appointment.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarImage
                              src={
                                appointment.doctorImage ||
                                `https://api.dicebear.com/6.x/initials/svg?seed=${appointment.doctorName}`
                              }
                            />
                            <AvatarFallback>
                              {appointment.doctorName ? appointment.doctorName.split(" ").map((n) => n[0]) : "DR"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-semibold">{appointment.doctorName}</h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CalendarDays className="h-4 w-4" />
                              {formatDisplayDate(appointment.date)}
                              <Clock className="h-4 w-4 ml-2" />
                              {appointment.timeSlot.startTime}
                            </div>
                            <Badge variant="destructive">Cancelled</Badge>
                          </div>
                        </div>
                        <Button size="sm" onClick={() => handleViewDetails(appointment)}>
                          View Details
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>

        {/* Appointment Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Appointment Details</DialogTitle>
            </DialogHeader>
            {selectedAppointment && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage
                      src={
                        selectedAppointment.doctorImage ||
                        `https://api.dicebear.com/6.x/initials/svg?seed=${selectedAppointment.doctorName}`
                      }
                    />
                    <AvatarFallback>
                      {selectedAppointment.doctorName
                        ? selectedAppointment.doctorName.split(" ").map((n) => n[0])
                        : "DR"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">{selectedAppointment.doctorName}</h3>
                    <p className="text-sm text-muted-foreground">{selectedAppointment.type}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Date</p>
                    <p className="text-sm">{formatDisplayDate(selectedAppointment.date)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Time</p>
                    <p className="text-sm">{selectedAppointment.timeSlot.startTime}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <Badge variant={getStatusBadgeVariant(selectedAppointment.status)}>
                      {selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Consultation Type</p>
                    <Badge variant={selectedAppointment.consultationType === "video" ? "secondary" : "outline"}>
                      {selectedAppointment.consultationType === "video" ? "Video" : "In-Person"}
                    </Badge>
                  </div>
                </div>

                {selectedAppointment.symptoms && (
                  <div>
                    <p className="text-sm font-medium">Symptoms/Notes</p>
                    <p className="text-sm bg-muted p-2 rounded">{selectedAppointment.symptoms}</p>
                  </div>
                )}

                {selectedAppointment.diagnosis && (
                  <div>
                    <p className="text-sm font-medium">Diagnosis</p>
                    <p className="text-sm bg-muted p-2 rounded">{selectedAppointment.diagnosis}</p>
                  </div>
                )}

                {selectedAppointment.prescription && (
                  <div>
                    <p className="text-sm font-medium">Prescription</p>
                    <p className="text-sm bg-muted p-2 rounded">{selectedAppointment.prescription}</p>
                  </div>
                )}

                {selectedAppointment.notes && (
                  <div>
                    <p className="text-sm font-medium">Additional Notes</p>
                    <p className="text-sm bg-muted p-2 rounded">{selectedAppointment.notes}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium">Payment Status</p>
                  <Badge variant={selectedAppointment.paymentStatus === "completed" ? "success" : "warning"}>
                    {selectedAppointment.paymentStatus.charAt(0).toUpperCase() +
                      selectedAppointment.paymentStatus.slice(1)}
                  </Badge>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Reschedule Dialog */}
        <Dialog open={isRescheduleDialogOpen} onOpenChange={setIsRescheduleDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Reschedule Appointment</DialogTitle>
              <DialogDescription>
                Select a new date and time for your appointment with {selectedAppointment?.doctorName}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Select Date</p>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => {
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    const maxDate = new Date(today)
                    maxDate.setDate(today.getDate() + 30)
                    return date < today || date > maxDate
                  }}
                  onDayClick={(date) => {
                    if (selectedAppointment) {
                      checkSlotAvailability(date, selectedAppointment.doctorId)
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Select Time</p>
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time slot" />
                  </SelectTrigger>
                  <SelectContent>
                    {isCheckingAvailability ? (
                      <SelectItem value="loading" disabled>
                        Checking availability...
                      </SelectItem>
                    ) : availableSlots.length > 0 ? (
                      availableSlots.map((slot) => (
                        <SelectItem key={slot.startTime} value={slot.startTime}>
                          {slot.startTime}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        No slots available
                      </SelectItem>
                    )}
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

        {/* Cancel Dialog */}
        <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Cancel Appointment</DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel your appointment with {selectedAppointment?.doctorName} on{" "}
                {selectedAppointment && formatDisplayDate(selectedAppointment.date)} at{" "}
                {selectedAppointment?.timeSlot.startTime}?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Reason for cancellation (optional)</p>
                <Textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Please provide a reason for cancellation"
                />
              </div>
              <Alert variant="warning">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  Cancelling an appointment may be subject to the doctor's cancellation policy. Late cancellations may
                  incur a fee.
                </AlertDescription>
              </Alert>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
                  Back
                </Button>
                <Button variant="destructive" onClick={confirmCancel}>
                  Confirm Cancellation
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

