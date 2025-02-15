"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  CalendarDays,
  Pill,
  FileText,
  Home,
  Calendar,
  CreditCard,
  Settings,
  Video,
  MessageSquare,
  PillIcon as PrescriptionIcon,
} from "lucide-react"
import { Sidebar, Header } from "./layout-components"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChatSection } from "../components/ChatSection"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Prescription } from "./Prescription"

const ScrollLink = ({ children, targetId }) => {
  const scrollToElement = () => {
    const element = document.getElementById(targetId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <div onClick={scrollToElement} className="cursor-pointer">
      {children}
    </div>
  )
}

const mockAppointments = [
  {
    id: "1",
    doctorName: "Dr. Sarah Smith",
    date: "2024-01-20",
    time: "10:00 AM",
    status: "upcoming",
    type: "in-person",
  },
  {
    id: "2",
    doctorName: "Dr. John Doe",
    date: "2024-01-22",
    time: "2:30 PM",
    status: "upcoming",
    type: "online",
  },
  {
    id: "3",
    doctorName: "Dr. Emily Brown",
    date: "2024-01-15",
    time: "11:00 AM",
    status: "completed",
    type: "in-person",
  },
]

const HealthRecordCard = ({ record }) => (
  <div className="p-4 border rounded-md">
    <h3 className="font-semibold">{record.title}</h3>
    <p>Date: {record.date}</p>
    <p>Type: {record.type}</p>
  </div>
)

const MotionCard = motion(Card)

const menuItems = [
  { icon: Home, label: "Home", href: "/patient-dashboard/dashboard" },
  { icon: Calendar, label: "Book Appointment", href: "/patient-dashboard/appointments" },
  { icon: MessageSquare, label: "Chat", href: "#chat-section" },
  { icon: FileText, label: "Medical Records", href: "/patient-dashboard/records" },
  { icon: Video, label: "Telemedicine", href: "/patient-dashboard/telemedicine" },
  { icon: CreditCard, label: "Payment History", href: "/patient-dashboard/payment-history" },
  { icon: Settings, label: "Settings", href: "/patient-dashboard/settings" },
]

export function HomePage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [appointments, setAppointments] = useState([])
  const [upcomingAppointments, setUpcomingAppointments] = useState([])
  const [isChatOpen, setIsChatOpen] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get token from localStorage
        const token = localStorage.getItem("token")
        if (!token) {
          throw new Error("No authentication token found")
        }

        // Fetch user data
        const response = await fetch("http://localhost:4000/api/user/patient-dashboard-data", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem("token") // Clear invalid token
            window.location.href = "/login" // Redirect to login
            throw new Error("Authentication expired. Please login again.")
          }
          throw new Error("Failed to fetch dashboard data")
        }

        const result = await response.json()

        if (!result.success) {
          throw new Error(result.message || "Failed to fetch dashboard data")
        }

        setUser(result.data)

        // Fetch other dashboard data
        // For now using mock data, but you would fetch this from your API
        setAppointments(mockAppointments)
        setUpcomingAppointments(mockUpcomingAppointments)
      } catch (err) {
        console.error("Error fetching dashboard data:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, []) // Empty dependency array since we only want to fetch once on mount

  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const healthRecords = useMemo(
    () => [
      {
        id: "1",
        title: "Blood Test Results",
        date: "2024-01-15",
        type: "Laboratory",
        fileUrl: "/reports/blood-test.pdf",
      },
      {
        id: "2",
        title: "X-Ray Report",
        date: "2024-01-10",
        type: "Radiology",
        fileUrl: "/reports/xray.pdf",
      },
    ],
    [],
  )

  const medications = useMemo(
    () => [
      {
        id: "1",
        name: "Paracetamol",
        dosage: "500mg",
        time: "9:00 AM",
        status: "taken",
      },
      {
        id: "2",
        name: "Vitamin D",
        dosage: "1000 IU",
        time: "2:00 PM",
        status: "pending",
      },
      {
        id: "3",
        name: "Antibiotic",
        dosage: "250mg",
        time: "8:00 PM",
        status: "missed",
      },
    ],
    [],
  )

  const quickStats = useMemo(
    () => [
      {
        title: "Upcoming Appointments",
        value: "2",
        icon: CalendarDays,
        color: "bg-blue-500",
        targetId: null,
      },
      {
        title: "Active Medications",
        value: "3",
        icon: Pill,
        color: "bg-green-500",
        targetId: "prescriptions-section", // Add this to enable scrolling
      },
      {
        title: "Recent Health Records",
        value: "2",
        icon: FileText,
        color: "bg-purple-500",
        targetId: null,
      },
      {
        title: "Telemedicine Consultations",
        value: "1",
        icon: Video,
        color: "bg-yellow-500",
        targetId: null,
      },
    ],
    [],
  )

  const generateAppointmentNotifications = useCallback(() => {
    if (!appointments || appointments.length === 0) return []
    const now = new Date()
    return appointments
      .map((appointment) => {
        const appointmentTime = new Date(`${appointment.date}T${appointment.time}`)
        const timeDiff = appointmentTime.getTime() - now.getTime()
        if (timeDiff > 0 && timeDiff <= 30 * 60 * 1000) {
          return {
            id: `appointment-${appointment.id}`,
            type: "appointment",
            message: `Upcoming appointment with ${appointment.doctorName} in 30 minutes`,
            time: appointmentTime.toLocaleTimeString(),
          }
        }
        return null
      })
      .filter(Boolean)
  }, [appointments])

  const generateMedicineReminders = useCallback(() => {
    if (!medications || medications.length === 0) return []
    const now = new Date()
    return medications
      .map((medication) => {
        const medicationTime = new Date(`${now.toDateString()} ${medication.time}`)
        const timeDiff = medicationTime.getTime() - now.getTime()
        if (timeDiff > 0 && timeDiff <= 30 * 60 * 1000 && medication.status === "pending") {
          return {
            id: `medicine-${medication.id}`,
            type: "medicine",
            message: `Time to take ${medication.name} (${medication.dosage}) in 30 minutes`,
            time: medicationTime.toLocaleTimeString(),
          }
        }
        return null
      })
      .filter(Boolean)
  }, [medications])

  useEffect(() => {
    const updateNotifications = () => {
      const appointmentNotifications = generateAppointmentNotifications()
      const medicineNotifications = generateMedicineReminders()
      const allNotifications = [...appointmentNotifications, ...medicineNotifications]
      setNotifications(allNotifications)
    }

    updateNotifications()
    const intervalId = setInterval(updateNotifications, 60000)

    return () => clearInterval(intervalId)
  }, [generateAppointmentNotifications, generateMedicineReminders])

  const mockUpcomingAppointments = [
    {
      id: "1",
      doctorName: "Dr. Sarah Smith",
      date: "2024-01-20",
      time: "10:00 AM",
      type: "video",
      isPaid: false,
    },
    {
      id: "2",
      doctorName: "Dr. John Doe",
      date: "2024-01-22",
      time: "2:30 PM",
      type: "in-person",
      isPaid: true,
    },
  ]

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header notifications={[]} />
          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <Skeleton className="h-32 w-full" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar>
        {/* Profile Section */}
        <Link href="/patient-dashboard/settings?section=profile" className="block">
          <div className="p-4 border-b">
            <div className="flex flex-col items-center space-y-1">
              <Avatar className="w-16 h-16">
                <AvatarImage src="/placeholder.svg" alt="Profile Picture" />
                <AvatarFallback>
                  {user?.firstName?.[0]}
                  {user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <h3 className="font-medium">
                {user?.firstName} {user?.lastName}
              </h3>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="flex items-center text-sm text-green-500">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                Online
              </div>
            </div>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.label}>
                {item.label === "Chat" ? (
                  <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" className="w-full justify-start">
                        <item.icon className="w-5 h-5 mr-2" />
                        <span>{item.label}</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[900px] sm:h-[80vh]">
                      <DialogHeader>
                        <DialogTitle>Chat with Your Doctors</DialogTitle>
                      </DialogHeader>
                      <div className="h-full overflow-hidden">
                        <ChatSection patientId={user?.id} />
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </Sidebar>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header notifications={notifications} />
        <main className="flex-1 overflow-auto p-6">
          <motion.div
            className="max-w-7xl mx-auto space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Welcome Section */}
            <motion.div variants={itemVariants}>
              <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                <CardContent className="pt-6">
                  <h2 className="text-2xl font-bold mb-2">Welcome, {user?.firstName}!</h2>
                  <p>Here is your health summary for {new Date().toLocaleDateString()}</p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick Stats */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickStats.map((stat, index) => (
                <Card key={index} className="cursor-pointer transition-transform hover:scale-105">
                  <CardContent className="flex items-center p-4">
                    <div className={`${stat.color} p-3 rounded-full mr-4`}>
                      <stat.icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{stat.title}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>

            {/* Upcoming Appointments and Telemedicine */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MotionCard variants={itemVariants}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CalendarDays className="mr-2 h-5 w-5" />
                    Upcoming Appointments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {upcomingAppointments.length > 0 ? (
                    upcomingAppointments.map((appointment) => (
                      <motion.div
                        key={appointment.id}
                        className="mb-4 p-3 bg-gray-50 rounded-lg"
                        variants={itemVariants}
                      >
                        <h3 className="font-semibold">{appointment.doctorName}</h3>
                        <p className="text-sm text-gray-600">
                          {appointment.date} at {appointment.time}
                        </p>
                        <p className="text-sm text-gray-600">Type: {appointment.type}</p>
                        {appointment.type === "video" && !appointment.isPaid && (
                          <Link href="/patient-dashboard/payment">
                            <Button variant="outline" size="sm" className="mt-2">
                              Pay Now
                            </Button>
                          </Link>
                        )}
                      </motion.div>
                    ))
                  ) : (
                    <p>No upcoming appointments.</p>
                  )}
                  <Link href="/patient-dashboard/appointments">
                    <Button className="w-full mt-4">Book New Appointment</Button>
                  </Link>
                </CardContent>
              </MotionCard>

              <MotionCard variants={itemVariants}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Video className="mr-2 h-5 w-5" />
                    Telemedicine Consultations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">Your next telemedicine consultation:</p>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold">Dr. Sarah Smith</h3>
                    <p className="text-sm text-gray-600">Tomorrow at 10:00 AM</p>
                    <p className="text-sm text-gray-600">Type: Video Call</p>
                  </div>
                  <Link href="/patient-dashboard/telemedicine">
                    <Button className="w-full mt-4">Manage Telemedicine</Button>
                  </Link>
                </CardContent>
              </MotionCard>
            </motion.div>

            {/* Recent Health Records and Prescriptions */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MotionCard variants={itemVariants}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="mr-2 h-5 w-5" />
                    Recent Health Records
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <motion.div className="grid gap-4" variants={containerVariants}>
                    {healthRecords.map((record) => (
                      <motion.div key={record.id} variants={itemVariants}>
                        <HealthRecordCard record={record} />
                      </motion.div>
                    ))}
                  </motion.div>
                  <Button className="w-full mt-4">View All Records</Button>
                </CardContent>
              </MotionCard>

              <Card variants={itemVariants} id="prescriptions-section">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PrescriptionIcon className="mr-2 h-5 w-5" />
                    Recent Prescriptions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Prescription patientId={user?.id} />
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </main>
      </div>
    </div>
  )
}

