"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, User } from "lucide-react"

interface Patient {
  id: string
  name: string
  avatar: string
  lastVisit: string
  nextAppointment: string | null
  condition: string
}

export function PatientSection() {
  const [patients, setPatients] = useState<Patient[]>([])

  useEffect(() => {
    // In a real application, this would be an API call
    const fetchPatients = async () => {
      // Simulating an API call with setTimeout
      setTimeout(() => {
        const mockPatients: Patient[] = [
          {
            id: "1",
            name: "Alice Johnson",
            avatar: "/placeholder.svg",
            lastVisit: "2023-05-15",
            nextAppointment: "2023-06-01",
            condition: "Hypertension",
          },
          {
            id: "2",
            name: "Bob Smith",
            avatar: "/placeholder.svg",
            lastVisit: "2023-05-18",
            nextAppointment: null,
            condition: "Diabetes",
          },
          {
            id: "3",
            name: "Charlie Brown",
            avatar: "/placeholder.svg",
            lastVisit: "2023-05-20",
            nextAppointment: "2023-06-05",
            condition: "Asthma",
          },
        ]
        setPatients(mockPatients)
      }, 1000)
    }

    fetchPatients()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <User className="h-5 w-5" />
          Recent Patients
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {patients.map((patient) => (
            <div key={patient.id} className="flex items-center space-x-4">
              <Avatar>
                <AvatarImage src={patient.avatar} alt={patient.name} />
                <AvatarFallback>{patient.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <p className="font-medium">{patient.name}</p>
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="mr-1 h-4 w-4" />
                  Last visit: {patient.lastVisit}
                </div>
                {patient.nextAppointment && (
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="mr-1 h-4 w-4" />
                    Next appointment: {patient.nextAppointment}
                  </div>
                )}
              </div>
              <Badge>{patient.condition}</Badge>
            </div>
          ))}
        </div>
        <Button className="w-full mt-4">View All Patients</Button>
      </CardContent>
    </Card>
  )
}

