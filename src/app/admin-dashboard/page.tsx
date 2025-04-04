"use client"

import { useState, useEffect } from "react"
import { Home, Users, FileText, MessageSquare, BarChart, Settings, LogOut, Bell, X, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ComplaintManagement } from "./components/complaint"
import { Analytics } from "./components/analytics"
import { Settings as SettingsComponent } from "./components/settings"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { UsersOverview } from "./components/users-overview"

const navigation = [
  { icon: Home, label: "Dashboard", href: "/admin-dashboard", active: true },
  { icon: Users, label: "User Management", href: "/admin-dashboard/user-management", badge: 4 },
  { icon: FileText, label: "Medical Records", href: "/admin-dashboard/medical-records" },
  { icon: MessageSquare, label: "Complaints", href: "/admin-dashboard/complaints", badge: 3 },
  { icon: BarChart, label: "Analytics", href: "/admin-dashboard/analytics" },
  { icon: Settings, label: "Settings", href: "/admin-dashboard/settings" },
]

export default function AdminDashboard() {
  const [showSettings, setShowSettings] = useState(false)
  const router = useRouter()
  const [pendingDoctors, setPendingDoctors] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const { toast } = useToast()
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [verificationRemarks, setVerificationRemarks] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const token = localStorage.getItem("token")

  useEffect(() => {
    // Check if token exists before fetching
    const token = localStorage.getItem("token")
    if (token) {
      fetchPendingDoctors()
    } else {
      setError("Authentication token not found. Please log in again.")
      setIsLoading(false)
    }
  }, [])

  const fetchPendingDoctors = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Check if token exists
      if (!token) {
        throw new Error("Authentication token not found")
      }

      console.log("Fetching pending doctors with token:", token)

      // Update the URL to match the server.js route configuration
      // The issue is that in server.js, the route is mounted at /api/admin
      // So the full path should be /api/admin/pending-doctors
      const response = await fetch("http://localhost:4000/api/admin/pending-doctors", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      console.log("Response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Error response:", errorText)
        throw new Error(`Failed to fetch pending doctors: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      console.log("Pending doctors data:", data)
      setPendingDoctors(data.data || [])
    } catch (err) {
      console.error("Error fetching pending doctors:", err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    router.push("../")
  }

  const handleVerification = async (doctorId, status) => {
    try {
      const response = await fetch(`http://localhost:4000/api/admin/verify-doctor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ doctorId, status, remarks: verificationRemarks }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to update verification status")
      }

      const data = await response.json()

      toast({
        title: "Success",
        description: `Doctor ${status === "approved" ? "approved" : "rejected"} successfully`,
      })

      // Refresh the pending doctors list
      fetchPendingDoctors()
      setIsDialogOpen(false)
      setVerificationRemarks("")
    } catch (error) {
      console.error("Error updating verification status:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update verification status",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col bg-white shadow-lg lg:flex">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-[#4169E1]">Mcare</span>
            <span className="text-sm font-medium text-gray-500">Admin</span>
          </Link>
        </div>

        <nav className="flex-1 overflow-auto py-4">
          <div className="grid items-start px-4 text-sm font-medium gap-1">
            {navigation.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 ${
                  item.active ? "bg-[#4169E1] text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {item.badge && <Badge className="ml-auto bg-[#4169E1]/10 text-[#4169E1]">{item.badge}</Badge>}
              </Link>
            ))}
          </div>
        </nav>

        <div className="border-t p-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-gray-600 hover:bg-gray-100"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm">
          <div className="flex h-16 items-center justify-between px-6">
            <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#4169E1] text-xs text-white">
                  3
                </span>
              </Button>
              <div className="text-right">
                <div className="text-sm font-medium">Admin User</div>
                <div className="text-xs text-gray-500">02/13/2025</div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
                <div className="w-8 h-8 bg-[#4169E1] text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  AD
                </div>
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {showSettings ? (
            <div className="max-w-3xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Settings</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)}>
                  <X className="h-6 w-6" />
                </Button>
              </div>
              <SettingsComponent />
            </div>
          ) : (
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Welcome Banner */}
              <Card className="bg-gradient-to-r from-blue-500 to-purple-600">
                <CardContent className="p-6">
                  <h1 className="text-3xl font-bold text-white">Welcome, Admin!</h1>
                  <p className="text-xl text-white/80">Here is your dashboard summary for 2/13/2025</p>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6 flex items-center">
                    <div className="bg-blue-500 p-3 rounded-full mr-4">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Pending Verifications</p>
                      <p className="text-2xl font-bold">{pendingDoctors.length}</p>
                    </div>
                  </CardContent>
                </Card>
                {/* Add more stat cards here */}
              </div>

              {/* Main Content Tabs */}
              <Card>
                <CardContent className="p-6">
                  <Tabs defaultValue="user-management" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-4 gap-4">
                      <TabsTrigger value="user-management">User Management</TabsTrigger>
                      <TabsTrigger value="users-overview">Users Overview</TabsTrigger>
                      <TabsTrigger value="complaints">Complaints</TabsTrigger>
                      <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    </TabsList>
                    <TabsContent value="user-management" className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <span>Doctor Registration Requests</span>
                            <Badge variant="secondary">{pendingDoctors.length} Pending</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {isLoading ? (
                            <div className="flex items-center justify-center p-4">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                          ) : error ? (
                            <Alert variant="destructive">
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle>Error</AlertTitle>
                              <AlertDescription>{error}</AlertDescription>
                            </Alert>
                          ) : pendingDoctors.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              No pending doctor registrations
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {pendingDoctors.map((doctor) => (
                                <Card key={doctor._id} className="p-4">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h3 className="font-semibold">{`${doctor.firstName} ${doctor.lastName}`}</h3>
                                      <p className="text-sm text-muted-foreground">{doctor.email}</p>
                                      <div className="mt-2 flex flex-wrap gap-2">
                                        {doctor.specializations?.map((spec) => (
                                          <Badge key={spec} variant="outline">
                                            {spec}
                                          </Badge>
                                        ))}
                                      </div>
                                      <p className="mt-2 text-sm">License: {doctor.licenseNumber}</p>
                                    </div>
                                    <div className="flex gap-2">
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-red-600 hover:text-red-700"
                                            onClick={() => setSelectedDoctor(doctor)}
                                          >
                                            Reject
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                          <DialogHeader>
                                            <DialogTitle>Reject Doctor Verification</DialogTitle>
                                            <DialogDescription>
                                              Please provide a reason for rejecting this doctors verification.
                                            </DialogDescription>
                                          </DialogHeader>
                                          <div className="grid gap-4 py-4">
                                            <div className="grid grid-cols-4 items-center gap-4">
                                              <Label htmlFor="rejection-reason" className="text-right">
                                                Reason
                                              </Label>
                                              <Textarea
                                                id="rejection-reason"
                                                className="col-span-3"
                                                value={verificationRemarks}
                                                onChange={(e) => setVerificationRemarks(e.target.value)}
                                              />
                                            </div>
                                          </div>
                                          <DialogFooter>
                                            <Button variant="outline" onClick={() => setSelectedDoctor(null)}>
                                              Cancel
                                            </Button>
                                            <Button
                                              variant="destructive"
                                              onClick={() => handleVerification(selectedDoctor._id, "rejected")}
                                            >
                                              Reject
                                            </Button>
                                          </DialogFooter>
                                        </DialogContent>
                                      </Dialog>
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700"
                                            onClick={() => setSelectedDoctor(doctor)}
                                          >
                                            Approve
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                          <DialogHeader>
                                            <DialogTitle>Approve Doctor Verification</DialogTitle>
                                            <DialogDescription>
                                              Are you sure you want to approve this doctors verification?
                                            </DialogDescription>
                                          </DialogHeader>
                                          <DialogFooter>
                                            <Button variant="outline" onClick={() => setSelectedDoctor(null)}>
                                              Cancel
                                            </Button>
                                            <Button
                                              className="bg-green-600 hover:bg-green-700"
                                              onClick={() => handleVerification(selectedDoctor._id, "approved")}
                                            >
                                              Approve
                                            </Button>
                                          </DialogFooter>
                                        </DialogContent>
                                      </Dialog>
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                    <TabsContent value="users-overview">
                      <UsersOverview />
                    </TabsContent>
                    <TabsContent value="complaints" className="space-y-4">
                      <h3 className="text-lg font-semibold">Recent Complaints</h3>
                      <ComplaintManagement />
                    </TabsContent>
                    <TabsContent value="analytics" className="space-y-4">
                      <h3 className="text-lg font-semibold">Analytics Overview</h3>
                      <Analytics />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

