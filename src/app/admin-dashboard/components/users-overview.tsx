"use client"

import { useState, useEffect } from "react"
import { Search, Filter, Eye, Mail, Phone, MapPin, Stethoscope, User } from "lucide-react"
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
import { Separator } from "@/components/ui/separator"

interface User {
  _id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  address?: string
  createdAt: string
  status?: string
  verificationStatus?: string
  specializations?: string[]
  patientId?: string
  licenseNumber?: string
  isProfileCompleted?: boolean
  dateOfBirth?: string
  gender?: string
  bloodType?: string
  medicalHistory?: string[]
  emergencyContact?: {
    name: string
    relationship: string
    phone: string
  }
  qualifications?: string
  experience?: string
  consultationFee?: number
  about?: string
  avatarUrl?: string
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
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.patientId && user.patientId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.licenseNumber && user.licenseNumber.toLowerCase().includes(searchQuery.toLowerCase())),
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
        {/* Header with Avatar and Basic Info */}
        <div className="flex items-start space-x-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={selectedUser.avatarUrl || "/placeholder.svg"} />
            <AvatarFallback>
              {selectedUser.firstName[0]}
              {selectedUser.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h3 className="text-xl font-semibold">
              {selectedUser.firstName} {selectedUser.lastName}
            </h3>
            <div className="flex items-center text-sm text-muted-foreground">
              <Mail className="mr-2 h-4 w-4" />
              {selectedUser.email}
            </div>
            {selectedUser.phone && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Phone className="mr-2 h-4 w-4" />
                {selectedUser.phone}
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Main Content */}
        <div className="grid gap-6">
          {/* Basic Information */}
          <div>
            <h4 className="text-sm font-semibold mb-4">Basic Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">ID</label>
                <p className="font-medium">{isDoctor ? selectedUser.licenseNumber : selectedUser.patientId}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Gender</label>
                <p className="font-medium">{selectedUser.gender || "Not specified"}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Date of Birth</label>
                <p className="font-medium">
                  {selectedUser.dateOfBirth ? new Date(selectedUser.dateOfBirth).toLocaleDateString() : "Not specified"}
                </p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Joined Date</label>
                <p className="font-medium">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Doctor Specific Information */}
          {isDoctor && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-4">Professional Information</h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Specializations</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedUser.specializations?.map((spec) => (
                        <Badge key={spec} variant="secondary">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Qualifications</label>
                      <p className="font-medium">{selectedUser.qualifications || "Not specified"}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Experience</label>
                      <p className="font-medium">{selectedUser.experience || "Not specified"}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Consultation Fee</label>
                      <p className="font-medium">
                        {selectedUser.consultationFee ? `$${selectedUser.consultationFee}` : "Not specified"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Verification Status</label>
                      <Badge
                        variant={
                          selectedUser.verificationStatus === "approved"
                            ? "success"
                            : selectedUser.verificationStatus === "rejected"
                              ? "destructive"
                              : "secondary"
                        }
                        className="mt-1"
                      >
                        {selectedUser.verificationStatus}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Patient Specific Information */}
          {!isDoctor && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-4">Medical Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Blood Type</label>
                    <p className="font-medium">{selectedUser.bloodType || "Not specified"}</p>
                  </div>
                  {selectedUser.medicalHistory && selectedUser.medicalHistory.length > 0 && (
                    <div className="col-span-2">
                      <label className="text-sm text-muted-foreground">Medical History</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedUser.medicalHistory.map((condition, index) => (
                          <Badge key={index} variant="outline">
                            {condition}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {selectedUser.emergencyContact && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-4">Emergency Contact</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-muted-foreground">Name</label>
                        <p className="font-medium">{selectedUser.emergencyContact.name}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Relationship</label>
                        <p className="font-medium">{selectedUser.emergencyContact.relationship}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Phone</label>
                        <p className="font-medium">{selectedUser.emergencyContact.phone}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* Address Information */}
          {selectedUser.address && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-4">Address</h4>
                <div className="flex items-start">
                  <MapPin className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                  <p className="font-medium">{selectedUser.address}</p>
                </div>
              </div>
            </>
          )}

          {/* About Section for Doctors */}
          {isDoctor && selectedUser.about && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-4">About</h4>
                <p className="text-sm text-muted-foreground">{selectedUser.about}</p>
              </div>
            </>
          )}
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
              <TabsTrigger value="doctors" className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                Doctors
              </TabsTrigger>
              <TabsTrigger value="patients" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Patients
              </TabsTrigger>
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
                    <TableHead>Contact</TableHead>
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
                        <div className="text-sm">
                          <div>{doctor.phone || "No phone"}</div>
                          <div className="text-muted-foreground">{doctor.address ? "Has address" : "No address"}</div>
                        </div>
                      </TableCell>
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
                    <TableHead>Contact Info</TableHead>
                    <TableHead>Medical Info</TableHead>
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
                          <div>
                            <div className="font-medium">
                              {patient.firstName} {patient.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">{patient.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{patient.patientId}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{patient.phone || "No phone"}</div>
                          <div className="text-muted-foreground">{patient.address ? "Has address" : "No address"}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Blood Type: {patient.bloodType || "N/A"}</div>
                          <div className="text-muted-foreground">
                            {patient.medicalHistory?.length || 0} conditions recorded
                          </div>
                        </div>
                      </TableCell>
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
          <DialogContent className="max-w-3xl">
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

