"use client"

import { useState, useCallback } from "react"
import { Sidebar, Header } from "@/components/PatientDashboard/Layout/LayoutComponents"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { Search, CalendarIcon, Clock, User, MapPin, Video, Star } from "lucide-react"

interface Doctor {
  id: number
  name: string
  specialization: string
  imageUrl: string
  rating: number
  reviewCount: number
  experience: number
  location: string
  isOnline: boolean
  consultationType: string[]
  nextSlot: string
}

// Mock data for doctors
const doctors: Doctor[] = [
  {
    id: 1,
    name: "Dr. Sarah Smith",
    specialization: "Cardiologist",
    imageUrl: "/placeholder.svg",
    rating: 4.8,
    reviewCount: 124,
    experience: 12,
    location: "New York Medical Center",
    isOnline: true,
    consultationType: ["video", "inPerson"],
    nextSlot: "Today, 2:00 PM",
  },
  {
    id: 2,
    name: "Dr. Michael Johnson",
    specialization: "Dermatologist",
    imageUrl: "/placeholder.svg",
    rating: 4.9,
    reviewCount: 89,
    experience: 8,
    location: "Skin Care Clinic",
    isOnline: false,
    consultationType: ["inPerson"],
    nextSlot: "Tomorrow, 10:00 AM",
  },
]

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

interface DoctorCardProps {
  doctor: Doctor
  onBookAppointment: (doctor: Doctor) => void
}

function DoctorCard({ doctor, onBookAppointment }: DoctorCardProps) {
  return (
    <Card className="w-full hover:shadow-lg transition-shadow">
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
            {doctor.isOnline && (
              <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{doctor.name}</h3>
                <p className="text-sm text-muted-foreground">{doctor.specialization}</p>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">{doctor.rating}</span>
                <span className="text-sm text-muted-foreground">({doctor.reviewCount})</span>
              </div>
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

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-blue-500" />
                <span>Next Available:</span>
                <span className="font-medium">{doctor.nextSlot}</span>
              </div>
              <Button size="sm" onClick={() => onBookAppointment(doctor)}>
                <CalendarIcon className="w-4 h-4 mr-2" />
                Book Now
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  doctor: Doctor | null
}

function BookingModal({ isOpen, onClose, doctor }: BookingModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [selectedTime, setSelectedTime] = useState("")
  const [consultationType, setConsultationType] = useState("")
  const [note, setNote] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedTime || !consultationType) {
      alert("Please select both time and consultation type.")
      return
    }

    alert(
      `Appointment Booked! Your appointment with ${doctor?.name} has been scheduled for ${selectedDate?.toLocaleDateString()} at ${selectedTime}.`,
    )
    onClose()
  }

  if (!doctor) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Book Appointment with {doctor.name}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="overflow-y-auto pr-2" style={{ maxHeight: "calc(85vh - 180px)" }}>
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Date</label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
                disabled={(date) => {
                  const currentDate = new Date()
                  currentDate.setHours(0, 0, 0, 0)
                  const thirtyDaysFromNow = new Date(currentDate)
                  thirtyDaysFromNow.setDate(currentDate.getDate() + 30)
                  return date < currentDate || date > thirtyDaysFromNow
                }}
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Consultation Type</label>
              <Select value={consultationType} onValueChange={setConsultationType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select consultation type" />
                </SelectTrigger>
                <SelectContent>
                  {doctor.consultationType.includes("video") && (
                    <SelectItem value="video">Video Consultation</SelectItem>
                  )}
                  {doctor.consultationType.includes("inPerson") && (
                    <SelectItem value="inPerson">In-Person Visit</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Add a Note (Optional)</label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Describe your symptoms or reason for visit"
                className="h-20"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Confirm Booking</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function AppointmentsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSpecialization, setSelectedSpecialization] = useState("")
  const [selectedConsultationType, setSelectedConsultationType] = useState("")
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)

  const handleBookAppointment = useCallback((doctor: Doctor) => {
    setSelectedDoctor(doctor)
    setIsBookingModalOpen(true)
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
      <Sidebar>
        <nav className="flex-1 p-4">
          {/* Add navigation items here */}
          <ul className="space-y-2">
            <li>
              <a
                href="/dashboard"
                className="flex items-center p-2 text-base font-normal text-gray-900 rounded-lg hover:bg-gray-100"
              >
                Dashboard
              </a>
            </li>
            <li>
              <a
                href="/appointments"
                className="flex items-center p-2 text-base font-normal text-gray-900 rounded-lg bg-gray-200"
              >
                Appointments
              </a>
            </li>
            {/* Add more navigation items as needed */}
          </ul>
        </nav>
      </Sidebar>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header notifications={[]} />
        <main className="flex-1 overflow-auto p-6">
          <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-6">Book an Appointment</h1>
            <Card>
              <CardHeader>
                <CardTitle>Find Available Doctors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3 mb-8">
                  <div className="md:col-span-1 relative">
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
                      <SelectItem value="Cardiologist">Cardiologist</SelectItem>
                      <SelectItem value="Dermatologist">Dermatologist</SelectItem>
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
                <div className="grid gap-6 md:grid-cols-2">
                  {filteredDoctors.map((doctor) => (
                    <DoctorCard key={doctor.id} doctor={doctor} onBookAppointment={handleBookAppointment} />
                  ))}
                </div>
                <BookingModal
                  isOpen={isBookingModalOpen}
                  onClose={() => setIsBookingModalOpen(false)}
                  doctor={selectedDoctor}
                />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

