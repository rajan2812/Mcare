"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Filter, FileText, Calendar, Clock } from "lucide-react"

interface Patient {
  id: string
  name: string
  age: number
  gender: string
  condition: string
  lastVisit: string
  nextAppointment: string | null
  status: "Active" | "Inactive" | "Pending"
  contactNumber: string
  email: string
  medicalHistory: string[]
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    // In a real application, this would be an API call
    const mockPatients: Patient[] = [
      {
        id: "P1",
        name: "Alice Johnson",
        age: 35,
        gender: "Female",
        condition: "Hypertension",
        lastVisit: "2024-01-15",
        nextAppointment: "2024-02-01",
        status: "Active",
        contactNumber: "+1 234-567-8901",
        email: "alice@example.com",
        medicalHistory: ["Diabetes Type 2", "High Blood Pressure"],
      },
      {
        id: "P2",
        name: "Bob Smith",
        age: 45,
        gender: "Male",
        condition: "Diabetes",
        lastVisit: "2024-01-10",
        nextAppointment: null,
        status: "Inactive",
        contactNumber: "+1 234-567-8902",
        email: "bob@example.com",
        medicalHistory: ["Asthma", "Allergies"],
      },
      {
        id: "P3",
        name: "Carol White",
        age: 28,
        gender: "Female",
        condition: "Asthma",
        lastVisit: "2024-01-18",
        nextAppointment: "2024-02-05",
        status: "Active",
        contactNumber: "+1 234-567-8903",
        email: "carol@example.com",
        medicalHistory: ["Seasonal Allergies"],
      },
    ]
    setPatients(mockPatients)
  }, [])

  const filteredPatients = patients.filter((patient) => {
    const matchesSearch =
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.condition.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || patient.status.toLowerCase() === statusFilter.toLowerCase()
    return matchesSearch && matchesStatus
  })

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Patient Management</h1>
        <Button>Add New Patient</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Patient Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search patients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Patients</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="list" className="space-y-4">
            <TabsList>
              <TabsTrigger value="list">List View</TabsTrigger>
              <TabsTrigger value="grid">Grid View</TabsTrigger>
            </TabsList>

            <TabsContent value="list">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Visit</TableHead>
                      <TableHead>Next Appointment</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPatients.map((patient) => (
                      <TableRow key={patient.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${patient.name}`} />
                              <AvatarFallback>{patient.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{patient.name}</div>
                              <div className="text-sm text-gray-500">{patient.condition}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              patient.status === "Active"
                                ? "success"
                                : patient.status === "Inactive"
                                  ? "secondary"
                                  : "default"
                            }
                          >
                            {patient.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{patient.lastVisit}</TableCell>
                        <TableCell>{patient.nextAppointment || "Not Scheduled"}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <FileText className="w-4 h-4 mr-1" />
                              Records
                            </Button>
                            <Button variant="outline" size="sm">
                              <Calendar className="w-4 h-4 mr-1" />
                              Schedule
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="grid">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPatients.map((patient) => (
                  <Card key={patient.id}>
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center text-center mb-4">
                        <Avatar className="h-20 w-20 mb-4">
                          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${patient.name}`} />
                          <AvatarFallback>{patient.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <h3 className="font-semibold text-lg">{patient.name}</h3>
                        <p className="text-sm text-gray-500">{patient.email}</p>
                        <Badge
                          className="mt-2"
                          variant={
                            patient.status === "Active"
                              ? "success"
                              : patient.status === "Inactive"
                                ? "secondary"
                                : "default"
                          }
                        >
                          {patient.status}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center text-sm">
                          <Clock className="w-4 h-4 mr-2 text-gray-500" />
                          Last Visit: {patient.lastVisit}
                        </div>
                        <div className="flex items-center text-sm">
                          <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                          Next Appointment: {patient.nextAppointment || "Not Scheduled"}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button className="flex-1" variant="outline" size="sm">
                          <FileText className="w-4 h-4 mr-1" />
                          Records
                        </Button>
                        <Button className="flex-1" variant="outline" size="sm">
                          <Calendar className="w-4 h-4 mr-1" />
                          Schedule
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

