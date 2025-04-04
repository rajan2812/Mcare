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
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // In a real application, this would be an API call
    const fetchPatients = async () => {
      // Simulating an API call with setTimeout
      setTimeout(() => {
        const mockPatients: Patient[] = [
          {
            id: "1",
            name: "Rajan Bhagat",
            avatar: "/placeholder.svg",
            lastVisit: "2025-04-01",
            nextAppointment: "2025-04-15",
            condition: "Fever, Cold, Acidity",
          },
          {
            id: "2",
            name: "Rajan Bhagat",
            avatar: "/placeholder.svg",
            lastVisit: "2025-04-01",
            nextAppointment: null,
            condition: "General Checkup",
          },
          {
            id: "3",
            name: "Priya Patel",
            avatar: "/placeholder.svg",
            lastVisit: "2025-03-30",
            nextAppointment: "2025-04-20",
            condition: "Hypertension",
          },
        ]
        setPatients(mockPatients)
        setLoading(false)
      }, 500)
    }

    setLoading(true)
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
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : patients.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p>No recent patients found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {patients.map((patient, index) => (
              <div key={`${patient.id}-${index}`} className="flex items-center space-x-4">
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
        )}
        <Button className="w-full mt-4">View All Patients</Button>
      </CardContent>
    </Card>
  )
}

