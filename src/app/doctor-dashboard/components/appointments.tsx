"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Clock } from "lucide-react"
import type { AppointmentRequest } from "@/types/appointment"
import { Activity } from "lucide-react"

// AppointmentList Component
export function AppointmentList() {
  const appointments = [
    { id: 1, patient: "Alice Johnson", time: "09:00 AM", type: "Check-up", status: "Confirmed" },
    { id: 2, patient: "Bob Smith", time: "10:30 AM", type: "Follow-up", status: "In Progress" },
    { id: 3, patient: "Charlie Brown", time: "11:45 AM", type: "Consultation", status: "Waiting" },
    { id: 4, patient: "Diana Ross", time: "02:15 PM", type: "Check-up", status: "Confirmed" },
    { id: 5, patient: "Edward Norton", time: "03:30 PM", type: "Follow-up", status: "Cancelled" },
  ]

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Patient</TableHead>
          <TableHead>Time</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {appointments.map((appointment) => (
          <TableRow key={appointment.id}>
            <TableCell className="font-medium">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${appointment.patient}`} />
                  <AvatarFallback>
                    {appointment.patient
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-bold">{appointment.patient}</div>
                  <div className="text-sm text-gray-500">{appointment.time}</div>
                </div>
              </div>
            </TableCell>
            <TableCell>{appointment.time}</TableCell>
            <TableCell>{appointment.type}</TableCell>
            <TableCell>
              <Badge
                variant={
                  appointment.status === "Confirmed"
                    ? "success"
                    : appointment.status === "In Progress"
                      ? "default"
                      : appointment.status === "Waiting"
                        ? "secondary"
                        : appointment.status === "Cancelled"
                          ? "destructive"
                          : "outline"
                }
              >
                {appointment.status}
              </Badge>
            </TableCell>
            <TableCell>
              <Button size="sm">View</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// AppointmentsSection Component
export function AppointmentsSection() {
  const appointments = [
    {
      id: 1,
      patientName: "Alice Johnson",
      time: "09:00 AM",
      type: "Check-up",
      status: "Confirmed",
    },
    {
      id: 2,
      patientName: "Bob Smith",
      time: "10:30 AM",
      type: "Follow-up",
      status: "In Progress",
    },
    {
      id: 3,
      patientName: "Charlie Brown",
      time: "11:45 AM",
      type: "Consultation",
      status: "Waiting",
    },
  ]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-md font-medium">Today Appointments</CardTitle>
        <Button variant="outline" size="sm">
          View All
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <div key={appointment.id} className="flex items-center">
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">{appointment.patientName}</p>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="mr-1 h-3 w-3" />
                  {appointment.time}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{appointment.type}</Badge>
                <Badge
                  variant={
                    appointment.status === "Confirmed"
                      ? "default"
                      : appointment.status === "In Progress"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {appointment.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
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

  useEffect(() => {
    // Load appointment requests from localStorage
    const loadRequests = () => {
      const storedRequests = localStorage.getItem("appointmentRequests")
      if (storedRequests) {
        const parsedRequests = JSON.parse(storedRequests)
        setRequests(parsedRequests)
      }
    }

    loadRequests()
    // Add event listener for storage changes
    window.addEventListener("storage", loadRequests)

    return () => {
      window.removeEventListener("storage", loadRequests)
    }
  }, [])

  const updateAppointmentStatus = (appointmentId: string, newStatus: AppointmentRequest["status"]) => {
    const updatedRequests = requests.map((req) =>
      req.id === appointmentId
        ? {
            ...req,
            status: newStatus,
            updatedAt: new Date().toISOString(),
          }
        : req,
    )

    // Update localStorage
    localStorage.setItem("appointmentRequests", JSON.stringify(updatedRequests))
    // Trigger storage event for other windows
    window.dispatchEvent(new Event("storage"))

    setRequests(updatedRequests)
  }

  const handleAccept = (appointmentId: string) => {
    updateAppointmentStatus(appointmentId, "accepted")
    toast({
      title: "Appointment Accepted",
      description: "The patient will be notified of your decision.",
    })
  }

  const handleReject = (appointmentId: string) => {
    updateAppointmentStatus(appointmentId, "rejected")
    toast({
      title: "Appointment Rejected",
      description: "The patient will be notified of your decision.",
    })
  }

  const handleReschedule = (appointment: AppointmentRequest) => {
    setSelectedAppointment(appointment)
    setIsRescheduleDialogOpen(true)
  }

  const confirmReschedule = () => {
    if (!selectedAppointment || !selectedDate || !selectedTime) {
      toast({
        title: "Error",
        description: "Please select both date and time for rescheduling.",
        variant: "destructive",
      })
      return
    }

    const updatedRequests = requests.map((req) =>
      req.id === selectedAppointment.id
        ? {
            ...req,
            requestedDate: selectedDate.toISOString().split("T")[0],
            requestedTime: selectedTime,
            status: "rescheduled" as const,
            updatedAt: new Date().toISOString(),
          }
        : req,
    )

    localStorage.setItem("appointmentRequests", JSON.stringify(updatedRequests))
    window.dispatchEvent(new Event("storage"))

    setRequests(updatedRequests)
    toast({
      title: "Appointment Rescheduled",
      description: "The patient will be notified of the new schedule.",
    })
    setIsRescheduleDialogOpen(false)
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
              <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
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
                    <p className="text-sm text-gray-500">ID: {request.patientId}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{request.type}</Badge>
                      <span className="text-sm text-gray-500">
                        {request.requestedDate} at {request.requestedTime}
                      </span>
                    </div>
                    {request.note && <p className="text-sm text-gray-500 mt-1">Note: {request.note}</p>}
                  </div>
                </div>
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

// AvailabilityManager Component
export function AvailabilityManager() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [availability, setAvailability] = useState<{
    [date: string]: Array<{ start: string; end: string }>
  }>({})
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    // Load availability from localStorage
    const storedAvailability = localStorage.getItem("doctorAvailability")
    if (storedAvailability) {
      setAvailability(JSON.parse(storedAvailability))
    }
  }, [])

  const saveAvailability = (newAvailability: {
    [date: string]: Array<{ start: string; end: string }>
  }) => {
    setAvailability(newAvailability)
    localStorage.setItem("doctorAvailability", JSON.stringify(newAvailability))
  }

  const handleAddTimeSlot = () => {
    if (!selectedDate || !startTime || !endTime) {
      toast({
        title: "Error",
        description: "Please select a date and time range.",
        variant: "destructive",
      })
      return
    }

    const dateStr = selectedDate.toISOString().split("T")[0]
    const newSlot = { start: startTime, end: endTime }

    setAvailability((prev) => {
      const updatedAvailability = { ...prev }
      if (!updatedAvailability[dateStr]) {
        updatedAvailability[dateStr] = []
      }
      updatedAvailability[dateStr].push(newSlot)
      return updatedAvailability
    })

    saveAvailability({ ...availability, [dateStr]: [...(availability[dateStr] || []), newSlot] })

    setStartTime("")
    setEndTime("")

    toast({
      title: "Availability Added",
      description: `Added availability for ${dateStr} from ${startTime} to ${endTime}`,
    })
  }

  const handleRemoveTimeSlot = (date: string, index: number) => {
    const updatedAvailability = { ...availability }
    updatedAvailability[date].splice(index, 1)
    if (updatedAvailability[date].length === 0) {
      delete updatedAvailability[date]
    }
    saveAvailability(updatedAvailability)

    toast({
      title: "Availability Removed",
      description: `Removed availability slot for ${date}`,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Availability</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <div className="flex space-x-4">
            <div className="flex-1">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Time</label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End Time</label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1" />
              </div>
              <Button onClick={handleAddTimeSlot}>Add Availability</Button>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Current Availability</h3>
            {Object.entries(availability).map(([date, slots]) => (
              <div key={date} className="mb-4">
                <h4 className="font-medium">{new Date(date).toDateString()}</h4>
                <div className="flex flex-wrap gap-2 mt-1">
                  {slots.map((slot, index) => (
                    <Badge key={index} variant="secondary" className="text-sm">
                      {slot.start} - {slot.end}
                      <button
                        onClick={() => handleRemoveTimeSlot(date, index)}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
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

