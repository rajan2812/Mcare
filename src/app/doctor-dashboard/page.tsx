"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Users, Clock, ChevronRight, MessageSquare, TrendingUp, CalendarDays } from "lucide-react"
import { AppointmentsSection, RecentActivities } from "./components/appointments"
import { PatientSection } from "./components/PatientSection"
import Link from "next/link"
import { motion } from "framer-motion"
import { DoctorDashboardLayout } from "./components/layout-components"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { LiveAppointmentStatus } from "./components/LiveAppointmentStatus"
import { PrescriptionForm } from "./components/PrescriptionForm"

const MotionCard = motion(Card)

// If there's an existing UpcomingAppointments component, update its styling to match this:
const UpcomingAppointments = () => {
  const [appointments, setAppointments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setIsLoading(true)
        const token = localStorage.getItem("token")
        const user = JSON.parse(localStorage.getItem("user") || "{}")

        if (!token) {
          throw new Error("Authentication token not found")
        }

        const response = await fetch(
          `http://localhost:4000/api/appointments?userId=${user.id}&userType=doctor&filter=upcoming&limit=3`,
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
      } finally {
        setIsLoading(false)
      }
    }

    fetchAppointments()
  }, [toast])

  const handleViewAppointment = (appointmentId) => {
    router.push(`/doctor-dashboard/appointments?id=${appointmentId}`)
  }

  return (
    <Card className="col-span-3">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-bold">Upcoming Appointments</CardTitle>
        <Button
          variant="ghost"
          className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          onClick={() => router.push("/doctor-dashboard/appointments")}
        >
          View All <ChevronRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-2 text-muted-foreground/60" />
            <p>No upcoming appointments</p>
            <Button variant="outline" className="mt-4" onClick={() => router.push("/doctor-dashboard/availability")}>
              Manage Availability
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="border rounded-lg overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border">
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {appointment.patientName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium">{appointment.patientName}</h4>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />
                            <span>{appointment.date}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{appointment.timeSlot.startTime}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={
                        appointment.status === "confirmed"
                          ? "default"
                          : appointment.status === "pending"
                            ? "outline"
                            : appointment.status === "in-progress"
                              ? "secondary"
                              : "outline"
                      }
                    >
                      {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="outline" className="bg-gray-50">
                      {appointment.consultationType || "In-Person"}
                    </Badge>
                    {appointment.paymentStatus && (
                      <Badge
                        variant={appointment.paymentStatus === "completed" ? "success" : "warning"}
                        className="bg-opacity-10"
                      >
                        {appointment.paymentStatus === "completed" ? "Paid" : "Payment Pending"}
                      </Badge>
                    )}
                  </div>

                  {appointment.symptoms && (
                    <div className="bg-gray-50 p-3 rounded-md mt-2">
                      <p className="text-xs font-medium text-gray-500 mb-1">Symptoms/Notes:</p>
                      <p className="text-sm">{appointment.symptoms}</p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 mt-3">
                    <Button variant="outline" size="sm" onClick={() => handleViewAppointment(appointment.id)}>
                      View
                    </Button>
                    {(appointment.status === "confirmed" || appointment.status === "pending") && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700"
                        onClick={() =>
                          router.push(`/doctor-dashboard/appointments?id=${appointment.id}&action=reschedule`)
                        }
                      >
                        Reschedule
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function DoctorDashboardPage() {
  const [doctorInfo, setDoctorInfo] = useState({
    name: "",
    specializations: [] as string[],
    appointmentsToday: 0,
    patientsTotal: 0,
    upcomingAppointments: 0,
    averageRating: 0,
    verificationStatus: "pending",
    isProfileCompleted: false,
    id: null,
  })
  const { toast } = useToast()
  const router = useRouter()

  const [isPrescriptionFormOpen, setIsPrescriptionFormOpen] = useState(false)
  const [currentAppointment, setCurrentAppointment] = useState<any>(null)

  const handleProfileStatus = (isProfileCompleted: boolean, verificationStatus: string) => {
    if (!isProfileCompleted) {
      router.push("/doctor-dashboard/complete-profile")
    } else if (verificationStatus === "rejected") {
      toast({
        title: "Profile Rejected",
        description: "Your profile has been rejected. Please update your information and resubmit.",
        variant: "destructive",
      })
    } else if (verificationStatus === "approved") {
      toast({
        title: "Welcome Back",
        description: "Your profile is approved. You can now use all features.",
      })
    }
  }

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem("token")
        if (!token) throw new Error("No token found")

        // Fetch verification status first
        const statusResponse = await fetch("http://localhost:4000/api/user/verification-status", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!statusResponse.ok) {
          throw new Error("Failed to fetch verification status")
        }

        const statusData = await statusResponse.json()

        // Update localStorage with latest verification status
        const currentUser = JSON.parse(localStorage.getItem("user") || "{}")
        const updatedUser = {
          ...currentUser,
          verificationStatus: statusData.verificationStatus,
        }
        localStorage.setItem("user", JSON.stringify(updatedUser))

        // Update component state
        setDoctorInfo((prev) => ({
          ...prev,
          verificationStatus: statusData.verificationStatus,
          name: `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim(),
          specializations: currentUser.specializations || ["General Medicine"],
          id: currentUser.id,
        }))
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
        toast({
          title: "Error",
          description: "Failed to load dashboard data. Please try again.",
          variant: "destructive",
        })
      }
    }

    fetchDashboardData()

    // Poll for verification status updates every 30 seconds
    const intervalId = setInterval(fetchDashboardData, 30000)

    return () => clearInterval(intervalId)
  }, [toast])

  useEffect(() => {
    const fetchCurrentAppointment = async () => {
      try {
        const token = localStorage.getItem("token")
        if (!token) return
        const user = JSON.parse(localStorage.getItem("user") || "{}")

        const response = await fetch(
          `http://localhost:4000/api/appointments?userId=${doctorInfo.id || user.id}&userType=doctor&filter=current`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            // Find the in-progress appointment
            const inProgressAppointment = data.appointments.find((apt) => apt.status === "in-progress")

            if (inProgressAppointment) {
              setCurrentAppointment(inProgressAppointment)
            } else {
              setCurrentAppointment(null)
            }
          }
        }
      } catch (error) {
        console.error("Error fetching current appointment:", error)
      }
    }

    fetchCurrentAppointment()

    // Set up an interval to periodically check for current appointments
    const intervalId = setInterval(fetchCurrentAppointment, 30000)
    return () => clearInterval(intervalId)
  }, [doctorInfo.id])

  // Render verification status badge
  const renderVerificationStatus = () => {
    const status = doctorInfo.verificationStatus
    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-2">Profile Status</h2>
          <Badge variant={status === "approved" ? "success" : status === "rejected" ? "destructive" : "secondary"}>
            {status === "approved" ? "Verified" : status === "rejected" ? "Rejected" : "Pending Verification"}
          </Badge>
          {status === "pending" && (
            <p className="mt-2 text-sm text-gray-600">
              Your profile is currently under review. We will notify you once the verification is complete.
            </p>
          )}
        </CardContent>
      </Card>
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

  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <DoctorDashboardLayout>
      <motion.div
        className="container mx-auto space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Welcome Section - Moved to top */}
        <MotionCard variants={itemVariants} className="bg-gradient-to-r from-blue-500 to-purple-600">
          <CardContent className="p-6">
            <h1 className="text-3xl font-bold text-white">
              Welcome, Dr. {doctorInfo.name.split(" ")[0]} {doctorInfo.name.split(" ")[1] || ""}!
            </h1>
            <p className="text-xl text-white/80">Specializations: {doctorInfo.specializations.join(", ")}</p>
            <p className="text-xl text-white/80">Here is your summary for {currentDate}</p>
          </CardContent>
        </MotionCard>

        {/* Quick Stats - Moved to second position */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MotionCard variants={itemVariants}>
            <CardContent className="p-6 flex items-center">
              <div className="bg-blue-500 p-3 rounded-full mr-4">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Appointments Today</p>
                <p className="text-2xl font-bold">{doctorInfo.appointmentsToday}</p>
                <p className="text-xs text-muted-foreground">+2 from yesterday</p>
              </div>
            </CardContent>
          </MotionCard>

          <MotionCard variants={itemVariants}>
            <CardContent className="p-6 flex items-center">
              <div className="bg-green-500 p-3 rounded-full mr-4">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Patients</p>
                <p className="text-2xl font-bold">{doctorInfo.patientsTotal}</p>
                <p className="text-xs text-muted-foreground">+5 new this week</p>
              </div>
            </CardContent>
          </MotionCard>

          <MotionCard variants={itemVariants}>
            <CardContent className="p-6 flex items-center">
              <div className="bg-purple-500 p-3 rounded-full mr-4">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Upcoming Appointments</p>
                <p className="text-2xl font-bold">{doctorInfo.upcomingAppointments}</p>
                <p className="text-xs text-muted-foreground">For next 7 days</p>
              </div>
            </CardContent>
          </MotionCard>

          <MotionCard variants={itemVariants}>
            <CardContent className="p-6 flex items-center">
              <div className="bg-orange-500 p-3 rounded-full mr-4">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Average Rating</p>
                <p className="text-2xl font-bold">{doctorInfo.averageRating}</p>
                <p className="text-xs text-muted-foreground">+0.2 from last month</p>
              </div>
            </CardContent>
          </MotionCard>
        </motion.div>

        {/* Profile Status - Moved to third position */}
        {renderVerificationStatus()}

        {/* Live Appointment Status */}
        <MotionCard variants={itemVariants}>
          <LiveAppointmentStatus
            onOpenPrescriptionForm={() => {
              console.log("Opening prescription form")
              setIsPrescriptionFormOpen(true)
            }}
          />
        </MotionCard>

        {/* Prescription Form */}
        {isPrescriptionFormOpen && (
          <PrescriptionForm
            isOpen={isPrescriptionFormOpen}
            onClose={() => setIsPrescriptionFormOpen(false)}
            appointmentId={currentAppointment?.id || JSON.parse(localStorage.getItem("currentAppointment") || "{}")?.id}
            patientId={
              currentAppointment?.patientId || JSON.parse(localStorage.getItem("currentAppointment") || "{}")?.patientId
            }
            patientName={
              currentAppointment?.patientName ||
              JSON.parse(localStorage.getItem("currentAppointment") || "{}")?.patientName
            }
          />
        )}

        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <UpcomingAppointments />

          <MotionCard variants={itemVariants}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Recent Patients</CardTitle>
              <Link href="/doctor-dashboard/patients">
                <Button variant="ghost" size="sm">
                  View All <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <PatientSection />
            </CardContent>
          </MotionCard>
        </motion.div>

        <MotionCard variants={itemVariants}>
          <Tabs defaultValue="appointments" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none px-6">
              <TabsTrigger value="appointments">Todays Appointments</TabsTrigger>
              <TabsTrigger value="activities">Recent Activities</TabsTrigger>
            </TabsList>
            <TabsContent value="appointments" className="p-6">
              <AppointmentsSection />
            </TabsContent>
            <TabsContent value="activities" className="p-6">
              <RecentActivities />
            </TabsContent>
          </Tabs>
        </MotionCard>

        <MotionCard variants={itemVariants}>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Button className="w-full">
                <MessageSquare className="w-4 h-4 mr-2" /> Start Consultation
              </Button>
              <Button className="w-full">
                <Calendar className="w-4 h-4 mr-2" /> Schedule Appointment
              </Button>
              <Button className="w-full">
                <Users className="w-4 h-4 mr-2" /> View Patient Records
              </Button>
            </div>
          </CardContent>
        </MotionCard>
      </motion.div>
    </DoctorDashboardLayout>
  )
}

