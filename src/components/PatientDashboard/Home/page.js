"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CalendarDays, Pill, FileText, Activity, Home, Calendar, CreditCard, Settings } from "lucide-react"
import { Sidebar, Header } from "@/components/PatientDashboard/Layout/LayoutComponents"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

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

const MedicationReminder = ({ medications }) => (
  <div className="space-y-2">
    {medications.map((med) => (
      <div key={med.id} className="p-2 border rounded-md">
        <p className="font-semibold">
          {med.name} - {med.dosage}
        </p>
        <p>Time: {med.time}</p>
        <p>Status: {med.status}</p>
      </div>
    ))}
  </div>
)

const MotionCard = motion(Card)

const menuItems = [
  { icon: Home, label: "Home", href: "/dashboard" },
  { icon: Calendar, label: "Book Appointment", href: "/appointments" },
  { icon: FileText, label: "View Records", href: "/records" },
  { icon: CreditCard, label: "Payments", href: "/payments" },
  { icon: Settings, label: "Settings", href: "/settings" },
]

export function PatientDashboardpage() {
  const [notifications, setNotifications] = useState([])
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        // Simulate API calls
        await new Promise((resolve) => setTimeout(resolve, 1000))
        setAppointments(mockAppointments)
        setLoading(false)
      } catch (err) {
        console.error("Error fetching dashboard data:", err)
        setError("Failed to load dashboard data. Please try again.")
        setLoading(false)
      }
    }

    fetchData()
  }, [])

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
      },
      {
        title: "Active Medications",
        value: "3",
        icon: Pill,
        color: "bg-green-500",
      },
      {
        title: "Recent Health Records",
        value: "2",
        icon: FileText,
        color: "bg-purple-500",
      },
      {
        title: "Today's Steps",
        value: "8,500",
        icon: Activity,
        color: "bg-orange-500",
      },
    ],
    [],
  )

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleReschedule = useCallback((id) => {
    console.log("Reschedule appointment:", id)
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleCancel = useCallback((id) => {
    console.log("Cancel appointment:", id)
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDownload = useCallback((id) => {
    console.log("Download record:", id)
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleUpload = useCallback(() => {
    console.log("Upload new record")
  }, [])

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
        <Link href="/settings?section=profile" className="block">
          <div className="p-4 border-b">
            <div className="flex flex-col items-center space-y-1">
              <Avatar className="w-16 h-16">
                <AvatarImage src="/placeholder.svg" alt="Profile Picture" />
                <AvatarFallback>R</AvatarFallback>
              </Avatar>
              <h3 className="font-medium">Rajan</h3>
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
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
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
            <MotionCard variants={itemVariants} className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
              <CardContent className="pt-6">
                <h2 className="text-2xl font-bold mb-2">Welcome to Your Health Dashboard!</h2>
                <p>Here is your health summary for {currentDate}</p>
              </CardContent>
            </MotionCard>

            {/* Quick Stats */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickStats.map((stat, index) => (
                <MotionCard key={index} variants={itemVariants}>
                  <CardContent className="flex items-center p-4">
                    <div className={`${stat.color} p-3 rounded-full mr-4`}>
                      <stat.icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{stat.title}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                  </CardContent>
                </MotionCard>
              ))}
            </motion.div>

            {/* Upcoming Appointments and Medication Reminders */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MotionCard variants={itemVariants}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CalendarDays className="mr-2 h-5 w-5" />
                    Upcoming Appointments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {appointments && appointments.length > 0 ? (
                    appointments
                      .filter((a) => a.status === "upcoming")
                      .map((appointment) => (
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
                        </motion.div>
                      ))
                  ) : (
                    <p>No upcoming appointments.</p>
                  )}
                  <Link href="/appointments">
                    <Button className="w-full mt-4">Book New Appointment</Button>
                  </Link>
                </CardContent>
              </MotionCard>

              <MotionCard variants={itemVariants}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Pill className="mr-2 h-5 w-5" />
                    Medication Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <MedicationReminder medications={medications} />
                </CardContent>
              </MotionCard>
            </motion.div>

            {/* Recent Health Records */}
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
          </motion.div>
        </main>
      </div>
    </div>
  )
}

export default PatientDashboardpage;