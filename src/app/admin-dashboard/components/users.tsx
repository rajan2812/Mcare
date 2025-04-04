"use client"

import { useState, useEffect } from "react"
import { Search, Filter, Eye } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"

interface User {
  _id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  createdAt: string
  status?: string
  verificationStatus?: string
  specializations?: string[]
  patientId?: string
  licenseNumber?: string
  isProfileCompleted?: boolean
}

export function UsersOverview() {
  const [activeTab, setActiveTab] = useState("doctors")
  const [doctors, setDoctors] = useState<User[]>([])
  const [patients, setPatients] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem("token")

      // Fetch doctors
      const doctorsResponse = await fetch("http://localhost:4000/api/admin/doctors", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const doctorsData = await doctorsResponse.json()

      // Fetch patients
      const patientsResponse = await fetch("http://localhost:4000/api/admin/patients", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const patientsData = await patientsResponse.json()

      if (doctorsData.success) setDoctors(doctorsData.data)
      if (patientsData.success) setPatients(patientsData.data)
    } catch (error) {
      console.error("Error fetching users:", error)
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filteredUsers = (users: User[]) => {
    return users.filter(
      (user) =>
        user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }

  const handleViewDetails = async (user: User) => {
    try {
      const token = localStorage.getItem("token")
      const endpoint = `http://localhost:4000/api/admin/${activeTab === "doctors" ? "doctors" : "patients"}/${user._id}`

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await response.json()

      if (data.success) {
        setSelectedUser(data.data)
        setIsDetailsOpen(true)
      }
    } catch (error) {
      console.error("Error fetching user details:", error)
      toast({
        title: "Error",
        description: "Failed to fetch user details",
        variant: "destructive",
      })
    }
  }

  const renderUserDetails = () => {
    if (!selectedUser) return null

    const isDoctor = activeTab === "doctors"

    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={selectedUser.avatarUrl || "/placeholder.svg"} />
            <AvatarFallback>
              {selectedUser.firstName[0]}
              {selectedUser.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-xl font-semibold">
              {selectedUser.firstName} {selectedUser.lastName}
            </h3>
            <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
          </div>
        </div>

        <div className="grid gap-4">
          {isDoctor ? (
            <>
              <div className="grid gap-2">
                <h4 className="font-semibold">Specializations</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedUser.specializations?.map((spec) => (
                    <Badge key={spec} variant="secondary">
                      {spec}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <h4 className="font-semibold">License Number</h4>
                <p>{selectedUser.licenseNumber}</p>
              </div>
              <div className="grid gap-2">
                <h4 className="font-semibold">Verification Status</h4>
                <Badge
                  variant={
                    selectedUser.verificationStatus === "approved"
                      ? "success"
                      : selectedUser.verificationStatus === "rejected"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {selectedUser.verificationStatus}
                </Badge>
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-2">
                <h4 className="font-semibold">Patient ID</h4>
                <p>{selectedUser.patientId}</p>
              </div>
            </>
          )}

          <div className="grid gap-2">
            <h4 className="font-semibold">Contact Information</h4>
            <p>Phone: {selectedUser.phone || "Not provided"}</p>
          </div>

          <div className="grid gap-2">
            <h4 className="font-semibold">Account Created</h4>
            <p>{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users Overview</CardTitle>
        <CardDescription>Manage and view all doctors and patients in the system.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="doctors">Doctors</TabsTrigger>
              <TabsTrigger value="patients">Patients</TabsTrigger>
            </TabsList>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Sort by Name</DropdownMenuItem>
                  <DropdownMenuItem>Sort by Date</DropdownMenuItem>
                  <DropdownMenuItem>Sort by Status</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <TabsContent value="doctors" className="border rounded-lg">
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Specialization</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>License</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers(doctors).map((doctor) => (
                    <TableRow key={doctor._id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage src={doctor.avatarUrl || "/placeholder.svg"} />
                            <AvatarFallback>
                              {doctor.firstName[0]}
                              {doctor.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {doctor.firstName} {doctor.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">{doctor.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {doctor.specializations?.slice(0, 2).map((spec) => (
                            <Badge key={spec} variant="outline">
                              {spec}
                            </Badge>
                          ))}
                          {(doctor.specializations?.length || 0) > 2 && (
                            <Badge variant="outline">+{doctor.specializations!.length - 2}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            doctor.verificationStatus === "approved"
                              ? "success"
                              : doctor.verificationStatus === "rejected"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {doctor.verificationStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>{doctor.licenseNumber}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleViewDetails(doctor)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="patients" className="border rounded-lg">
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Patient ID</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers(patients).map((patient) => (
                    <TableRow key={patient._id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage src={patient.avatarUrl || "/placeholder.svg"} />
                            <AvatarFallback>
                              {patient.firstName[0]}
                              {patient.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="font-medium">
                            {patient.firstName} {patient.lastName}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{patient.patientId}</TableCell>
                      <TableCell>{patient.email}</TableCell>
                      <TableCell>{new Date(patient.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleViewDetails(patient)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>Detailed information about the selected {activeTab.slice(0, -1)}.</DialogDescription>
            </DialogHeader>
            {renderUserDetails()}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

