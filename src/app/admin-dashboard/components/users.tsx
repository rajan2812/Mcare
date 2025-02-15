"use client"

import { useState } from "react"
import { Check, X, Eye, FileText, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Doctor } from "@/types"

const initialDoctors: Doctor[] = [
  {
    id: "1",
    name: "Dr. Sarah Smith",
    email: "sarah.smith@example.com",
    phone: "+1 (555) 123-4567",
    address: "123 Medical St, Healthville, HV 12345",
    speciality: "Cardiology",
    licenseNumber: "MED12345",
    status: "Pending",
  },
  {
    id: "2",
    name: "Dr. John Doe",
    email: "john.doe@example.com",
    phone: "+1 (555) 987-6543",
    address: "456 Doctor Ave, Wellness City, WC 67890",
    speciality: "Pediatrics",
    licenseNumber: "MED67890",
    status: "Pending",
  },
  // Add more doctors as needed
]

export function UserManagement() {
  const [doctors, setDoctors] = useState<Doctor[]>(initialDoctors)
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleApprove = (id: string) => {
    setDoctors(doctors.map((doctor) => (doctor.id === id ? { ...doctor, status: "Approved" } : doctor)))
  }

  const handleReject = (id: string) => {
    setDoctors(doctors.map((doctor) => (doctor.id === id ? { ...doctor, status: "Rejected" } : doctor)))
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Doctor Registrations</h3>
        <Button className="bg-[#4169E1] hover:bg-[#4169E1]/90">
          <Plus className="mr-2 h-4 w-4" /> Add New Doctor
        </Button>
      </div>
      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Specialty</TableHead>
              <TableHead className="font-semibold">License Number</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {doctors.map((doctor) => (
              <TableRow key={doctor.id}>
                <TableCell className="font-medium">{doctor.name}</TableCell>
                <TableCell>{doctor.speciality}</TableCell>
                <TableCell>{doctor.licenseNumber}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      doctor.status === "Approved"
                        ? "success"
                        : doctor.status === "Rejected"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {doctor.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDoctor(doctor)}
                          className="text-[#4169E1] border-[#4169E1]"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Doctor Details</DialogTitle>
                          <DialogDescription>Review the doctors information and documents.</DialogDescription>
                        </DialogHeader>
                        {selectedDoctor && (
                          <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="name" className="text-right">
                                Name
                              </Label>
                              <Input id="name" value={selectedDoctor.name} className="col-span-3" readOnly />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="email" className="text-right">
                                Email
                              </Label>
                              <Input id="email" value={selectedDoctor.email} className="col-span-3" readOnly />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="phone" className="text-right">
                                Phone
                              </Label>
                              <Input id="phone" value={selectedDoctor.phone} className="col-span-3" readOnly />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="speciality" className="text-right">
                                Specialty
                              </Label>
                              <Input
                                id="speciality"
                                value={selectedDoctor.speciality}
                                className="col-span-3"
                                readOnly
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="license" className="text-right">
                                License Number
                              </Label>
                              <Input
                                id="license"
                                value={selectedDoctor.licenseNumber}
                                className="col-span-3"
                                readOnly
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4" />
                              <span>View Uploaded Documents</span>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApprove(doctor.id)}
                      disabled={doctor.status !== "Pending"}
                      className="text-green-600 border-green-600 hover:bg-green-50"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(doctor.id)}
                      disabled={doctor.status !== "Pending"}
                      className="text-red-600 border-red-600 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

