"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clock, Calendar, Video, User, FileText, Bell } from "lucide-react"
import { PrescriptionForm } from "./PrescriptionForm"
import { MedicineReminderForm } from "./MedicineReminderForm"
import { useToast } from "@/components/ui/use-toast"
import { useSocket } from "@/hooks/useSocket"

interface Appointment {
  _id: string
  patientId: {
    _id: string
    firstName: string
    lastName: string
    email: string
    profileImage?: string
  }
  date: string
  timeSlot: {
    startTime: string
    endTime: string
  }
  consultationType: string
  status: string
  symptoms?: string
  notes?: string
}

export function LiveAppointmentStatus() {
  const [currentAppointment, setCurrentAppointment] = useState<Appointment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("details")
  const [isPrescriptionDialogOpen, setIsPrescriptionDialogOpen] = useState(false)
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false)
  const { toast } = useToast()

  const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : {}
  const socket = useSocket(user.id, "doctor")

  const fetchCurrentAppointment = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem("token")

      console.log("Fetching current appointment for doctor:", user.id)

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/doctor/${user.id}/current-appointment`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) {
        throw new Error("Failed to fetch current appointment")
      }

      const data = await response.json()
      console.log("Current appointment data:", data)

      if (data.success && data.appointment) {
        setCurrentAppointment(data.appointment)
      } else {
        setCurrentAppointment(null)
      }
    } catch (error) {
      console.error("Error fetching current appointment:", error)
      toast({
        title: "Error",
        description: "Failed to load current appointment",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user.id) {
      fetchCurrentAppointment()

      // Set up a refresh interval (every 30 seconds)
      const intervalId = setInterval(() => {
        fetchCurrentAppointment()
      }, 30000)

      // Clean up the interval on unmount
      return () => clearInterval(intervalId)
    }
  }, [user.id])

  useEffect(() => {
    if (socket) {
      socket.on("appointmentStatusUpdate", (data) => {
        console.log("Appointment status update received:", data)

        // If the appointment is updated to in-progress or completed, refresh current appointment
        if (data.status === "in-progress" || data.status === "completed") {
          fetchCurrentAppointment()
        }

        // If this is the current appointment being updated, refresh
        if (currentAppointment && data.appointmentId === currentAppointment._id) {
          fetchCurrentAppointment()
        }
      })

      socket.on("queueUpdated", (data) => {
        console.log("Queue updated:", data)
        fetchCurrentAppointment()
      })

      return () => {
        socket.off("appointmentStatusUpdate")
        socket.off("queueUpdated")
      }
    }
  }, [socket, currentAppointment])

  const handleCompleteAppointment = async () => {
    if (!currentAppointment) return

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/appointments/${currentAppointment._id}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: "completed",
            notes: "Appointment completed successfully",
            doctorId: user.id,
            userType: "doctor",
          }),
        },
      )

      if (!response.ok) {
        throw new Error("Failed to complete appointment")
      }

      toast({
        title: "Appointment Completed",
        description: "The appointment has been marked as completed",
      })

      // Emit socket event for real-time updates
      if (socket) {
        socket.emit("appointmentStatusUpdate", {
          appointmentId: currentAppointment._id,
          status: "completed",
          doctorId: user.id,
          doctorName: `Dr. ${user.firstName} ${user.lastName}`,
          patientId: currentAppointment.patientId._id,
        })
      }

      fetchCurrentAppointment()
    } catch (error) {
      console.error("Error completing appointment:", error)
      toast({
        title: "Error",
        description: "Failed to complete appointment",
        variant: "destructive",
      })
    }
  }

  const handlePrescriptionSuccess = () => {
    setIsPrescriptionDialogOpen(false)
    toast({
      title: "Prescription Created",
      description: "The prescription has been created successfully",
    })
  }

  const handleReminderSuccess = () => {
    setIsReminderDialogOpen(false)
    toast({
      title: "Medication Reminders Set",
      description: "Medication reminders have been set for the patient",
    })
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

  if (!currentAppointment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Current Appointment</CardTitle>
          <CardDescription>No active appointment at the moment</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            You don't have any ongoing appointments right now. Check your appointment schedule for upcoming
            appointments.
          </p>
        </CardContent>
      </Card>
    )
  }

  const patientName = `${currentAppointment.patientId.firstName} ${currentAppointment.patientId.lastName}`
  const appointmentDate = new Date(currentAppointment.date).toLocaleDateString()
  const appointmentTime = `${currentAppointment.timeSlot.startTime} - ${currentAppointment.timeSlot.endTime}`

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Current Appointment</CardTitle>
            <CardDescription>Manage your ongoing appointment</CardDescription>
          </div>
          <Badge variant={currentAppointment.status === "in-progress" ? "default" : "outline"}>
            {currentAppointment.status === "in-progress" ? "In Progress" : currentAppointment.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-16 w-16">
            <AvatarImage
              src={
                currentAppointment.patientId.profileImage ||
                `https://api.dicebear.com/6.x/initials/svg?seed=${patientName}`
              }
              alt={patientName}
            />
            <AvatarFallback>
              {currentAppointment.patientId.firstName[0]}
              {currentAppointment.patientId.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-xl font-semibold">{patientName}</h3>
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="mr-1 h-4 w-4" />
              {appointmentDate}
              <Clock className="ml-3 mr-1 h-4 w-4" />
              {appointmentTime}
            </div>
            <div className="flex items-center mt-1">
              <Badge variant="outline" className="mr-2">
                {currentAppointment.consultationType === "video" ? (
                  <>
                    <Video className="mr-1 h-3 w-3" /> Video
                  </>
                ) : (
                  <>
                    <User className="mr-1 h-3 w-3" /> In-person
                  </>
                )}
              </Badge>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Appointment Details</TabsTrigger>
            <TabsTrigger value="notes">Notes & Symptoms</TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="pt-4">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Patient Email</h4>
                <p>{currentAppointment.patientId.email}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Appointment Type</h4>
                <p>
                  {currentAppointment.consultationType === "video" ? "Video Consultation" : "In-person Consultation"}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Appointment Status</h4>
                <p className="capitalize">{currentAppointment.status}</p>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="notes" className="pt-4">
            <div className="space-y-4">
              {currentAppointment.symptoms && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Patient Symptoms</h4>
                  <p className="p-3 bg-muted rounded-md mt-1">{currentAppointment.symptoms}</p>
                </div>
              )}
              {currentAppointment.notes && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Appointment Notes</h4>
                  <p className="p-3 bg-muted rounded-md mt-1">{currentAppointment.notes}</p>
                </div>
              )}
              {!currentAppointment.symptoms && !currentAppointment.notes && (
                <p className="text-center text-muted-foreground py-4">
                  No symptoms or notes provided for this appointment.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <div className="flex gap-3 w-full">
          <Dialog open={isPrescriptionDialogOpen} onOpenChange={setIsPrescriptionDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1">
                <FileText className="mr-2 h-4 w-4" />
                Write Prescription
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Write Prescription</DialogTitle>
                <DialogDescription>Create a prescription for {patientName}</DialogDescription>
              </DialogHeader>
              <PrescriptionForm
                patientId={currentAppointment.patientId._id}
                patientName={patientName}
                appointmentId={currentAppointment._id}
                onSuccess={handlePrescriptionSuccess}
                onCancel={() => setIsPrescriptionDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1">
                <Bell className="mr-2 h-4 w-4" />
                Set Medicine Reminder
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Set Medicine Reminder</DialogTitle>
                <DialogDescription>Create medication reminders for {patientName}</DialogDescription>
              </DialogHeader>
              <MedicineReminderForm
                patientId={currentAppointment.patientId._id}
                appointmentId={currentAppointment._id}
                onSuccess={handleReminderSuccess}
                onCancel={() => setIsReminderDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
        <Button
          onClick={handleCompleteAppointment}
          className="w-full"
          disabled={currentAppointment.status === "completed"}
        >
          {currentAppointment.status === "completed" ? "Appointment Completed" : "Complete Appointment"}
        </Button>
      </CardFooter>
    </Card>
  )
}

