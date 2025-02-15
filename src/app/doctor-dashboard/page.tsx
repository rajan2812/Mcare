"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Users, Clock, ChevronRight, MessageSquare, TrendingUp } from "lucide-react"
import { AppointmentList, AppointmentsSection, RecentActivities } from "./components/appointments"
import { PatientSection } from "./components/PatientSection"
import { ChatSection } from "./components/ChatSection"
import Link from "next/link"
import { motion } from "framer-motion"
import { DoctorDashboardLayout } from "./components/layout-components"

const MotionCard = motion(Card)

export default function DoctorDashboardPage() {
  const [doctorInfo, setDoctorInfo] = useState({
    name: "",
    specializations: [] as string[],
    appointmentsToday: 0,
    patientsTotal: 0,
    upcomingAppointments: 0,
    averageRating: 0,
  })

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}")
    setDoctorInfo({
      name: userData.firstName ? `${userData.firstName} ${userData.lastName}` : "",
      appointmentsToday: 8,
      patientsTotal: 150,
      upcomingAppointments: 3,
      averageRating: 4.8,
      specializations: ["General Medicine"], // Default specialization
    })
  }, [])

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
        {/* Welcome Section */}
        <MotionCard variants={itemVariants} className="bg-gradient-to-r from-blue-500 to-purple-600">
          <CardContent className="p-6">
            <h1 className="text-3xl font-bold text-white">
              Welcome, Dr. {doctorInfo.name ? doctorInfo.name.split(" ")[0] : ""}!
            </h1>
            <p className="text-xl text-white/80">Specializations: {doctorInfo.specializations.join(", ")}</p>
            <p className="text-xl text-white/80">Here is your summary for {currentDate}</p>
          </CardContent>
        </MotionCard>

        {/* Quick Stats */}
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

        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MotionCard variants={itemVariants}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Upcoming Appointments</CardTitle>
              <Link href="/doctor-dashboard/appointments">
                <Button variant="ghost" size="sm">
                  View All <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <AppointmentList />
            </CardContent>
          </MotionCard>

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
              <TabsTrigger value="chats">Recent Chats</TabsTrigger>
              <TabsTrigger value="activities">Recent Activities</TabsTrigger>
            </TabsList>
            <TabsContent value="appointments" className="p-6">
              <AppointmentsSection />
            </TabsContent>
            <TabsContent value="chats" className="p-6">
              <ChatSection />
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

