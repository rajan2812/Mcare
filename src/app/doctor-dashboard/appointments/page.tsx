"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AppointmentList,
  AppointmentsSection,
  AppointmentRequests,
  AvailabilityManager,
} from "../components/appointments"

export default function AppointmentsPage() {
  const [activeTab, setActiveTab] = useState("today")

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage Appointments</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="today">Today Appointments</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming Appointments</TabsTrigger>
          <TabsTrigger value="requests">Appointment Requests</TabsTrigger>
          <TabsTrigger value="availability">Manage Availability</TabsTrigger>
        </TabsList>

        <TabsContent value="today">
          <Card>
            <CardHeader>
              <CardTitle>Today  Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <AppointmentsSection />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <AppointmentList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <AppointmentRequests />
        </TabsContent>

        <TabsContent value="availability">
          <AvailabilityManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}

