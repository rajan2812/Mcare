"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Sidebar, Header } from "../dashboard-components/layout-components"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from "next/image"
import { Search, CalendarIcon, Clock, User, MapPin, Video, Star, AlertCircle } from "lucide-react"
import { useSocket } from "@/hooks/useSocket"
import { MyAppointments } from "./my-appointments"

// Add this constant at the top of the file, after the imports
const SPECIALIZATIONS = [
  "General Physician (GP)",
  "Cardiologist",
  "Endocrinologist",
  "Gastroenterologist",
  "Nephrologist",
  "Pulmonologist",
  "Hematologist",
  "General Surgeon",
  "Orthopedic Surgeon",
  "Neurosurgeon",
  "Plastic Surgeon",
  "Gynecologist & Obstetrician (OB-GYN)",
  "Pediatrician",
  "Dermatologist",
  "Ophthalmologist",
  "ENT Specialist (Otorhinolaryngologist)",
  "Neurologist",
  "Psychiatrist",
  "Urologist",
  "Oncologist",
  "Rheumatologist",
  "Radiologist",
  "Anesthesiologist",
]

interface Doctor {
  id: string
  name: string
  specialization: string
  imageUrl: string
  rating: number
  reviewCount: number
  experience: string
  location: string
  isOnline: boolean
  consultationType: string[]
  nextSlot: string
  hasAvailableSlots?: boolean
  isOnBreak?: boolean
  breakEndTime?: string
  isAvailable?: boolean
  onBreak?: boolean
  workingHours?: {
    start: string
    end: string
  }
}

interface TimeSlot {
  startTime: string
  endTime: string
  isAvailable: boolean
  isBooked?: boolean
  isBreak?: boolean
}

function DoctorCard({
  doctor,
  onRequestAppointment,
}: {
  doctor: Doctor
  onRequestAppointment: (doctor: Doctor) => void
}) {
  // Get current time to check availability
  const now = new Date()
  const currentTime = now.toTimeString().slice(0, 5)

  const isAvailableNow =
    doctor.isAvailable &&
    !doctor.onBreak &&
    doctor.workingHours &&
    currentTime >= doctor.workingHours.start &&
    currentTime <= doctor.workingHours.end

  return (
    <Card className="w-full hover:shadow-lg transition-shadow mb-4">
      <CardContent className="p-6">
        <div className="flex gap-4">
          <div className="relative">
            <Image
              src={doctor.imageUrl || "/placeholder.svg"}
              alt={doctor.name}
              width={80}
              height={80}
              className="rounded-full object-cover"
            />
            {isAvailableNow && (
              <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{doctor.name}</h3>
                <p className="text-sm text-muted-foreground">{doctor.specialization}</p>
              </div>
              {doctor.rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{doctor.rating}</span>
                  <span className="text-sm text-muted-foreground">({doctor.reviewCount})</span>
                </div>
              )}
            </div>

            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                <span>{doctor.experience} years experience</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{doctor.location}</span>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              {doctor.consultationType.includes("video") && (
                <Badge variant="secondary">
                  <Video className="w-3 h-3 mr-1" />
                  Video Consult
                </Badge>
              )}
              {doctor.consultationType.includes("inPerson") && (
                <Badge variant="secondary">
                  <User className="w-3 h-3 mr-1" />
                  In-Person
                </Badge>
              )}
            </div>

            {doctor.isAvailable ? (
              doctor.onBreak ? (
                <Alert className="mt-3" variant="warning">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Doctor is on break</AlertTitle>
                  <AlertDescription>Available after {doctor.breakEndTime}</AlertDescription>
                </Alert>
              ) : (
                <div className="mt-3 text-green-600 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>Available for appointments</span>
                </div>
              )
            ) : (
              <Alert className="mt-3" variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Not Available Today</AlertTitle>
                <AlertDescription>This doctor is not available for appointments today.</AlertDescription>
              </Alert>
            )}

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-blue-500" />
                <span>Next Available:</span>
                {doctor.hasAvailableSlots === false ? (
                  <span className="font-medium text-red-500">No available slots</span>
                ) : (
                  <span className="font-medium">{doctor.nextSlot}</span>
                )}
              </div>
              <Button
                size="sm"
                onClick={() => onRequestAppointment(doctor)}
                disabled={!doctor.isAvailable || doctor.onBreak || doctor.hasAvailableSlots === false}
              >
                <CalendarIcon className="w-4 h-4 mr-2" />
                Request Appointment
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AppointmentRequestModal({
  isOpen,
  onClose,
  doctor,
}: {
  isOpen: boolean
  onClose: () => void
  doctor: Doctor | null
}) {
  const { toast } = useToast()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [selectedTime, setSelectedTime] = useState("")
  const [consultationType, setConsultationType] = useState("")
  const [note, setNote] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const user = JSON.parse(localStorage.getItem("user") || "{}")
  const socket = useSocket(user.id, "patient")

  useEffect(() => {
    if (!doctor) return

    if (selectedDate) {
      checkSlotAvailability(selectedDate)
    }
  }, [selectedDate, doctor])

  const checkSlotAvailability = async (date: Date) => {
    if (!doctor) return

    setIsCheckingAvailability(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No authentication token found")
      }

      // Format date as YYYY-MM-DD to avoid timezone issues
      // Use the date's own methods to get the exact date selected by the user
      const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
      console.log("Checking availability for date:", formattedDate)

      const response = await fetch(`http://localhost:4000/api/doctor/availability/${doctor.id}/${formattedDate}`, {
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
        // The API returns data in a different format than expected
        // Extract timeSlots directly from the data.data object
        const slots = data.data.timeSlots || []

        // Get current time
        const now = new Date()
        const currentHour = now.getHours()
        const currentMinute = now.getMinutes()
        const currentTimeString = `${currentHour.toString().padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}`

        // Check if selected date is today
        const today = new Date()
        const isToday =
          date.getDate() === today.getDate() &&
          date.getMonth() === today.getMonth() &&
          date.getFullYear() === today.getFullYear()

        // Filter available slots (not booked and not break)
        // If today, also filter out past time slots
        const availableSlots = slots.filter((slot: TimeSlot) => {
          const isPastTimeSlot = isToday && slot.startTime < currentTimeString
          return !slot.isBooked && !slot.isBreak && !isPastTimeSlot
        })

        setAvailableSlots(availableSlots)

        // If no slots are available, show a toast notification
        if (availableSlots.length === 0) {
          toast({
            title: "No Available Slots",
            description: "There are no available slots for this date. Please try another date.",
            variant: "destructive",
          })
        }
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

  // Update the handleSubmit function in the AppointmentRequestModal component
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage("")
    setIsSubmitting(true)

    if (!selectedTime || !consultationType) {
      setErrorMessage("Please select both time and consultation type.")
      setIsSubmitting(false)
      return
    }

    try {
      const token = localStorage.getItem("token")

      // Calculate end time (assuming 30 min appointments)
      const [hours, minutes] = selectedTime.split(":").map(Number)
      let endHours = hours
      let endMinutes = minutes + 30

      if (endMinutes >= 60) {
        endHours += 1
        endMinutes -= 60
      }

      const endTime = `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`

      // Format date as YYYY-MM-DD to avoid timezone issues
      // Use the date values directly to create the formatted string
      const formattedDate = selectedDate
        ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`
        : ""

      console.log("Selected date object:", selectedDate)
      console.log("Formatted date for API:", formattedDate)

      console.log("User data:", user)
      const appointmentData = {
        doctorId: doctor?.id,
        date: formattedDate, // Send the formatted date string
        startTime: selectedTime,
        endTime: endTime,
        isEmergency: false,
        patientId: user.id,
        patientName: `${user.firstName} ${user.lastName}`,
        consultationType,
        symptoms: note,
        status: "pending",
      }

      console.log("Sending appointment request with data:", appointmentData)

      // Looking at your appointmentRoutes.js, the correct endpoint is:
      const response = await fetch("http://localhost:4000/api/appointments/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(appointmentData),
      })

      console.log("Response status:", response.status)

      // Rest of the function remains unchanged
      // ...

      // Try to get the response body regardless of status
      let responseText
      try {
        responseText = await response.text()
        console.log("Raw response:", responseText)
      } catch (e) {
        console.error("Error reading response text:", e)
      }

      if (!response.ok) {
        throw new Error(responseText || "Failed to book appointment")
      }

      // Parse the response if it's JSON
      let data
      try {
        data = JSON.parse(responseText)
        console.log("Parsed response data:", data)
      } catch (e) {
        console.error("Error parsing response as JSON:", e)
        throw new Error("Invalid response format from server")
      }

      // Emit socket event for real-time updates
      if (socket) {
        // Make sure we're sending the correct data structure that the doctor dashboard expects
        const socketData = {
          id: data.data?.appointment?._id || data._id || "temp-" + Date.now(),
          appointmentId: data.data?.appointment?._id || data._id || "temp-" + Date.now(),
          patientName: `${user.firstName} ${user.lastName}`,
          patientId: user.id,
          doctorId: doctor?.id,
          date: formattedDate,
          timeSlot: {
            startTime: selectedTime,
            endTime: endTime,
          },
          type: "regular",
          consultationType,
          symptoms: note,
          status: "pending",
          requestedDate: formattedDate,
          requestedTime: selectedTime,
          note: note,
        }

        console.log("Emitting socket event with data:", socketData)

        // Try different event names that might be expected by the doctor dashboard
        socket.emit("newAppointmentRequest", socketData)
        socket.emit("appointmentRequest", socketData)
        socket.emit("newAppointment", socketData)

        // Also emit a general appointment update for real-time updates
        socket.emit("appointmentUpdate", {
          appointmentId: socketData.id,
          status: "pending",
          type: "new",
        })
      }

      toast({
        title: "Appointment Requested!",
        description: "Your appointment request has been sent to the doctor.",
      })

      // Clear form and close modal
      setSelectedTime("")
      setConsultationType("")
      setNote("")
      onClose()
    } catch (error) {
      // Error handling remains unchanged
      // ...
      console.error("Error booking appointment:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to book appointment",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // ... rest of the modal JSX remains the same, but update the submit button to show loading state:
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request Appointment with {doctor?.name}</DialogTitle>
          <DialogDescription>
            Select your preferred date (within next 7 days), time, and consultation type to request an appointment.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {errorMessage && <div className="text-red-500">{errorMessage}</div>}
            <div className="space-y-2">
              <Label>Select Date</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => {
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  const maxDate = new Date(today)
                  maxDate.setDate(today.getDate() + 7)
                  return date < today || date > maxDate
                }}
                className="rounded-md border"
              />
            </div>

            <div className="space-y-2">
              <Label>Select Time</Label>
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

            <div className="space-y-2">
              <Label>Consultation Type</Label>
              <Select value={consultationType} onValueChange={setConsultationType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select consultation type" />
                </SelectTrigger>
                <SelectContent>
                  {doctor?.consultationType.includes("video") && (
                    <SelectItem value="video">Video Consultation</SelectItem>
                  )}
                  {doctor?.consultationType.includes("inPerson") && (
                    <SelectItem value="inPerson">In-Person Visit</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Add a Note (Optional)</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Describe your symptoms or reason for visit"
                className="h-20"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function AppointmentsPage() {
  const [activeTab, setActiveTab] = useState("find")
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSpecialization, setSelectedSpecialization] = useState("")
  const [selectedConsultationType, setSelectedConsultationType] = useState("")
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const user = JSON.parse(localStorage.getItem("user") || "{}")
  const socket = useSocket(user.id, "patient")

  // Update the fetchDoctors function in the AppointmentsPage component
  const fetchDoctors = useCallback(async () => {
    try {
      setIsLoading(true)
      setError("")

      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No authentication token found")
      }

      const queryParams = new URLSearchParams()
      if (selectedSpecialization) queryParams.append("specialization", selectedSpecialization)
      if (selectedConsultationType) queryParams.append("consultationType", selectedConsultationType)

      const response = await fetch(`http://localhost:4000/api/doctors/verified-doctors?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Error response from server:", errorData)
        // Don't throw an error here, just log it and continue with empty doctors array
        setError(errorData.message || "Failed to fetch some doctors. Showing available doctors only.")
        setDoctors([])
        return
      }

      const data = await response.json()
      console.log("Received doctors data:", data)

      if (data.success) {
        // Transform the data to include availability status
        const transformedDoctors = await Promise.all(
          data.doctors.map(async (doctor) => {
            const now = new Date()
            const currentTime = now.toTimeString().slice(0, 5)
            const today = now.toISOString().split("T")[0]

            // Check if doctor is currently available
            const isAvailableNow =
              doctor.isAvailable &&
              !doctor.onBreak &&
              doctor.workingHours &&
              currentTime >= doctor.workingHours.start &&
              currentTime <= doctor.workingHours.end

            // Get the doctor's availability for today to find the next available slot
            let nextSlot = "Not available"
            let hasAvailableSlots = false

            try {
              const availabilityResponse = await fetch(
                `http://localhost:4000/api/doctor/availability/${doctor.id}/${today}`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                },
              )

              if (availabilityResponse.ok) {
                const availabilityData = await availabilityResponse.json()

                if (availabilityData.success && availabilityData.data) {
                  const timeSlots = availabilityData.data.timeSlots || []

                  // Filter available slots (not booked and not break)
                  const availableSlots = timeSlots.filter((slot) => {
                    return !slot.isBooked && !slot.isBreak && slot.startTime > currentTime
                  })

                  if (availableSlots.length > 0) {
                    // Sort slots by time
                    availableSlots.sort((a, b) => a.startTime.localeCompare(b.startTime))
                    nextSlot = availableSlots[0].startTime
                    hasAvailableSlots = true
                  } else {
                    nextSlot = "No available slots today"
                    hasAvailableSlots = false
                  }
                }
              }
            } catch (error) {
              console.error(`Error fetching availability for doctor ${doctor.id}:`, error)
              nextSlot = "Error checking availability"
            }

            return {
              ...doctor,
              isOnline: isAvailableNow,
              nextSlot: nextSlot,
              hasAvailableSlots: hasAvailableSlots,
            }
          }),
        )

        setDoctors(transformedDoctors)
        // Clear any previous error if successful
        setError("")
      } else {
        // Don't throw an error, just set a message and continue with empty doctors array
        setError(data.message || "No doctors available at this time.")
        setDoctors([])
      }
    } catch (error) {
      console.error("Error fetching doctors:", error)
      setError("Failed to load some doctors. Showing available doctors only.")
      // Don't show the toast for every error, only for critical ones
      if (error instanceof Error && error.message !== "No authentication token found") {
        toast({
          title: "Warning",
          description: "Some doctors could not be loaded. Showing available doctors only.",
          variant: "warning",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }, [selectedSpecialization, selectedConsultationType, toast])

  useEffect(() => {
    if (socket) {
      socket.on("doctorAvailabilityUpdated", ({ doctorId, availability }) => {
        console.log("Received availability update:", { doctorId, availability })

        setDoctors((prevDoctors) =>
          prevDoctors.map((doctor) => {
            if (doctor.id === doctorId) {
              const now = new Date()
              const currentTime = now.toTimeString().slice(0, 5)

              const isOnBreak =
                availability.breaks?.some(
                  (breakTime) => currentTime >= breakTime.startTime && currentTime <= breakTime.endTime,
                ) || false

              // Find the next available slot
              let nextSlot = "No available slots"
              let hasAvailableSlots = false

              if (availability.timeSlots && availability.timeSlots.length > 0) {
                const availableSlots = availability.timeSlots.filter(
                  (slot) => !slot.isBooked && !slot.isBreak && slot.startTime > currentTime,
                )

                if (availableSlots.length > 0) {
                  // Sort slots by time
                  availableSlots.sort((a, b) => a.startTime.localeCompare(b.startTime))
                  nextSlot = availableSlots[0].startTime
                  hasAvailableSlots = true
                }
              }

              const isAvailableNow =
                availability.isAvailable &&
                !isOnBreak &&
                availability.regularHours &&
                currentTime >= availability.regularHours.start &&
                currentTime <= availability.regularHours.end

              console.log("Updating doctor availability:", {
                doctorId,
                isAvailable: availability.isAvailable,
                isOnBreak,
                isAvailableNow,
                nextSlot,
                hasAvailableSlots,
              })

              return {
                ...doctor,
                isAvailable: availability.isAvailable,
                onBreak: isOnBreak,
                workingHours: availability.regularHours,
                nextSlot: nextSlot,
                hasAvailableSlots: hasAvailableSlots,
                isOnline: isAvailableNow,
              }
            }
            return doctor
          }),
        )
      })

      // Add new socket event listeners for appointment updates
      socket.on("appointmentStatusUpdated", (data) => {
        const statusMessages = {
          accepted: "Your appointment request has been accepted",
          rejected: "Your appointment request has been rejected",
          completed: "Your appointment has been marked as completed",
          cancelled: "Your appointment has been cancelled",
        }

        toast({
          title: `Appointment ${data.status}`,
          description: statusMessages[data.status] || `Appointment status updated to ${data.status}`,
          variant: data.status === "rejected" ? "destructive" : "default",
        })

        // Refresh doctors list to update availability
        fetchDoctors()
      })

      // Add listener for appointment confirmation
      socket.on("appointmentConfirmed", (data) => {
        toast({
          title: "Appointment Confirmed",
          description: `Your appointment with ${data.doctorName} has been confirmed for ${data.date} at ${data.time}`,
        })
      })

      return () => {
        socket.off("doctorAvailabilityUpdated")
        socket.off("appointmentStatusUpdated")
        socket.off("appointmentConfirmed")
      }
    }
  }, [socket, toast, fetchDoctors])

  useEffect(() => {
    fetchDoctors()
    const intervalId = setInterval(fetchDoctors, 30000) // Poll every 30 seconds
    return () => clearInterval(intervalId)
  }, [fetchDoctors])

  const handleRequestAppointment = useCallback((doctor: Doctor) => {
    setSelectedDoctor(doctor)
    setIsRequestModalOpen(true)
  }, [])

  const filteredDoctors = doctors.filter((doctor) => {
    const matchesSearch =
      doctor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doctor.specialization.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesSpecialization =
      !selectedSpecialization || selectedSpecialization === "All" || doctor.specialization === selectedSpecialization

    const matchesConsultationType =
      !selectedConsultationType ||
      selectedConsultationType === "All" ||
      doctor.consultationType.includes(selectedConsultationType)

    return matchesSearch && matchesSpecialization && matchesConsultationType
  })

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-6">Appointments</h1>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="find">Find a Doctor</TabsTrigger>
                <TabsTrigger value="my-appointments">My Appointments</TabsTrigger>
              </TabsList>

              <TabsContent value="find">
                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle>Find a Doctor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3 mb-8">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <Input
                          placeholder="Search doctors"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <Select value={selectedSpecialization} onValueChange={setSelectedSpecialization}>
                        <SelectTrigger>
                          <SelectValue placeholder="Specialization" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="All">All Specializations</SelectItem>
                          {SPECIALIZATIONS.map((specialization) => (
                            <SelectItem key={specialization} value={specialization}>
                              {specialization}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={selectedConsultationType} onValueChange={setSelectedConsultationType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Consultation Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="All">All Types</SelectItem>
                          <SelectItem value="video">Video Consultation</SelectItem>
                          <SelectItem value="inPerson">In-Person Visit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {error && (
                      <Alert variant="destructive" className="mb-4">
                        {error}
                      </Alert>
                    )}

                    {isLoading ? (
                      <div className="flex justify-center items-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      </div>
                    ) : (
                      <ScrollArea className="h-[600px]">
                        {filteredDoctors.length > 0 ? (
                          filteredDoctors.map((doctor) => (
                            <DoctorCard
                              key={doctor.id}
                              doctor={doctor}
                              onRequestAppointment={handleRequestAppointment}
                            />
                          ))
                        ) : (
                          <div className="text-center py-8">
                            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                            <h3 className="text-lg font-medium mb-2">No doctors found</h3>
                            <p className="text-gray-500">
                              {error || "No doctors match your current search criteria. Try adjusting your filters."}
                            </p>
                          </div>
                        )}
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="my-appointments">
                <MyAppointments />
              </TabsContent>
            </Tabs>

            {selectedDoctor && (
              <AppointmentRequestModal
                isOpen={isRequestModalOpen}
                onClose={() => setIsRequestModalOpen(false)}
                doctor={selectedDoctor}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

