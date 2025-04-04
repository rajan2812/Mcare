"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { DoctorDashboardLayout } from "../components/layout-components"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowUp,
  ArrowDown,
  User,
  Video,
  RefreshCw,
  Play,
} from "lucide-react"
import { motion } from "framer-motion"
import { useSocket } from "@/hooks/useSocket"

const MotionCard = motion(Card)

interface QueueEntry {
  _id: string
  appointmentId: string
  patientId: string
  patientName: string
  scheduledTime: string
  status: string
  waitTime: number
  priority: number
  notes?: string
  consultationType?: string
}

interface QueueData {
  _id: string
  doctorId: string
  date: string
  entries: QueueEntry[]
  currentDelay: number
  currentEntry?: QueueEntry | null
}

export default function QueuePage() {
  const [queue, setQueue] = useState<QueueData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [currentDelay, setCurrentDelay] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const { toast } = useToast()
  const router = useRouter()
  const socket = useSocket()

  useEffect(() => {
    fetchQueue()

    // Socket event listeners
    if (socket) {
      socket.on("queueUpdated", handleQueueUpdate)
      socket.on("queueDelayUpdated", handleDelayUpdate)
      socket.on("appointmentStatusUpdated", (data) => {
        console.log("Appointment status updated:", data)
        fetchQueue() // Refresh queue when appointment status changes
      })

      return () => {
        socket.off("queueUpdated", handleQueueUpdate)
        socket.off("queueDelayUpdated", handleDelayUpdate)
        socket.off("appointmentStatusUpdated")
      }
    }
  }, [socket])

  const handleQueueUpdate = (data: any) => {
    if (data.queue) {
      setQueue(data.queue)
    }
  }

  const handleDelayUpdate = (data: any) => {
    if (data.currentDelay !== undefined) {
      setCurrentDelay(data.currentDelay)
    }
    if (data.queue) {
      setQueue(data.queue)
    }
  }

  const fetchQueue = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem("token")
      const user = JSON.parse(localStorage.getItem("user") || "{}")

      if (!token) {
        throw new Error("Authentication token not found")
      }

      // Directly sync appointments with queue
      try {
        const syncResponse = await fetch(`http://localhost:4000/api/queue/sync-appointments/${user.id}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (!syncResponse.ok) {
          console.warn("Sync appointments warning:", await syncResponse.text())
        }
      } catch (syncError) {
        console.error("Error syncing appointments:", syncError)
        // Continue even if sync fails
      }

      // Then fetch the queue status
      const response = await fetch(`http://localhost:4000/api/queue/status/${user.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch queue")
      }

      const data = await response.json()
      if (data.success) {
        console.log("Queue data received:", data.data)
        setQueue(data.data)
        setCurrentDelay(data.data.currentDelay || 0)
      } else {
        throw new Error(data.message || "Failed to fetch queue")
      }
    } catch (error) {
      console.error("Error fetching queue:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load queue",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const syncAppointments = async () => {
    try {
      setIsSyncing(true)
      const token = localStorage.getItem("token")
      const user = JSON.parse(localStorage.getItem("user") || "{}")

      if (!token) {
        throw new Error("Authentication token not found")
      }

      const response = await fetch(`http://localhost:4000/api/queue/sync-appointments/${user.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to sync appointments")
      }

      const data = await response.json()
      if (data.success) {
        setQueue(data.data)
        toast({
          title: "Success",
          description: "Appointments synced with queue successfully",
        })
      } else {
        throw new Error(data.message || "Failed to sync appointments")
      }
    } catch (error) {
      console.error("Error syncing appointments:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sync appointments",
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
      // Refresh the queue after syncing
      fetchQueue()
    }
  }

  const updateQueueStatus = async (appointmentId: string, status: string, additionalData?: any) => {
    try {
      const token = localStorage.getItem("token")
      const user = JSON.parse(localStorage.getItem("user") || "{}")

      if (!token) {
        throw new Error("Authentication token not found")
      }

      const response = await fetch(`http://localhost:4000/api/queue/status/${user.id}/${appointmentId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          additionalData,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update queue status")
      }

      const data = await response.json()
      if (data.success) {
        setQueue(data.data)
        toast({
          title: "Success",
          description: `Patient status updated to ${status}`,
        })
      } else {
        throw new Error(data.message || "Failed to update queue status")
      }
    } catch (error) {
      console.error("Error updating queue status:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update status",
        variant: "destructive",
      })
    }
  }

  const updateAppointmentStatus = async (appointmentId: string, status: string) => {
    try {
      const token = localStorage.getItem("token")
      const user = JSON.parse(localStorage.getItem("user") || "{}")

      if (!token) {
        throw new Error("Authentication token not found")
      }

      // Update the appointment status in the appointments collection
      const response = await fetch(`http://localhost:4000/api/appointments/status/${appointmentId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "user-role": "doctor",
        },
        body: JSON.stringify({
          status,
          doctorId: user.id,
          doctorRole: "doctor",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update appointment status")
      }

      const data = await response.json()
      if (data.success) {
        toast({
          title: "Success",
          description: `Appointment status updated to ${status}`,
        })

        // Also update the queue status
        await updateQueueStatus(appointmentId, status === "in-progress" ? "in-progress" : "completed")

        // Refresh the queue
        fetchQueue()
      } else {
        throw new Error(data.message || "Failed to update appointment status")
      }
    } catch (error) {
      console.error("Error updating appointment status:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update status",
        variant: "destructive",
      })
    }
  }

  const updateQueueDelay = async (delay: number) => {
    try {
      const token = localStorage.getItem("token")
      const user = JSON.parse(localStorage.getItem("user") || "{}")

      if (!token) {
        throw new Error("Authentication token not found")
      }

      const response = await fetch(`http://localhost:4000/api/queue/delay/${user.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          delay,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update queue delay")
      }

      const data = await response.json()
      if (data.success) {
        setQueue(data.data)
        setCurrentDelay(delay)
        toast({
          title: "Success",
          description: `Queue delay updated to ${delay} minutes`,
        })
      } else {
        throw new Error(data.message || "Failed to update queue delay")
      }
    } catch (error) {
      console.error("Error updating queue delay:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update delay",
        variant: "destructive",
      })
    }
  }

  const startAppointment = (appointmentId: string) => {
    updateAppointmentStatus(appointmentId, "in-progress")
  }

  const completeAppointment = (appointmentId: string) => {
    updateAppointmentStatus(appointmentId, "completed")
  }

  const markNoShow = (appointmentId: string) => {
    updateAppointmentStatus(appointmentId, "no-show")
  }

  const changePriority = (appointmentId: string, newPriority: number) => {
    updateQueueStatus(appointmentId, "waiting", { priority: newPriority })
  }

  const handleDelayChange = (value: number[]) => {
    setCurrentDelay(value[0])
  }

  const handleUpdateDelay = () => {
    updateQueueDelay(currentDelay)
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const filteredEntries = queue?.entries
    ? queue.entries.filter((entry) => {
        // Filter by search term
        const matchesSearch = entry.patientName.toLowerCase().includes(searchTerm.toLowerCase())

        // Filter by tab
        const matchesTab =
          activeTab === "all" ||
          (activeTab === "waiting" && entry.status === "waiting") ||
          (activeTab === "in-progress" && entry.status === "in-progress") ||
          (activeTab === "completed" && (entry.status === "completed" || entry.status === "no-show"))

        return matchesSearch && matchesTab
      })
    : []

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "waiting":
        return "outline"
      case "in-progress":
        return "secondary"
      case "completed":
        return "default"
      case "no-show":
        return "destructive"
      default:
        return "outline"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "waiting":
        return "Waiting"
      case "in-progress":
        return "In Progress"
      case "completed":
        return "Completed"
      case "no-show":
        return "No Show"
      default:
        return status.charAt(0).toUpperCase() + status.slice(1)
    }
  }

  const formatTime = (timeString: string) => {
    try {
      const time = new Date(`2000-01-01T${timeString}`)
      return time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } catch (e) {
      return timeString
    }
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

  return (
    <DoctorDashboardLayout>
      <motion.div
        className="container mx-auto space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <MotionCard variants={itemVariants} className="bg-gradient-to-r from-blue-500 to-purple-600">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-white">Patient Queue Management</h1>
                <p className="text-xl text-white/80">Manage your patient queue and appointments</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={syncAppointments}
                disabled={isSyncing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Syncing..." : "Sync Appointments"}
              </Button>
            </div>
          </CardContent>
        </MotionCard>

        {/* Current Appointment */}
        <MotionCard variants={itemVariants}>
          <CardHeader>
            <CardTitle>Current Appointment</CardTitle>
          </CardHeader>
          <CardContent>
            {queue?.currentEntry ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border">
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {queue.currentEntry.patientName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-semibold">{queue.currentEntry.patientName}</h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Scheduled: {formatTime(queue.currentEntry.scheduledTime)}</span>
                        </div>
                        <Badge variant="secondary">{queue.currentEntry.consultationType || "In-Person"}</Badge>
                      </div>
                    </div>
                  </div>
                  <Badge variant={queue.currentEntry.status === "in-progress" ? "secondary" : "outline"}>
                    {queue.currentEntry.status === "in-progress" ? "In Progress" : "Scheduled"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {queue.currentEntry.status === "in-progress" ? (
                    <Button variant="default" onClick={() => completeAppointment(queue.currentEntry!.appointmentId)}>
                      <CheckCircle className="mr-2 h-4 w-4" /> Complete
                    </Button>
                  ) : (
                    <Button variant="default" onClick={() => startAppointment(queue.currentEntry!.appointmentId)}>
                      <Play className="mr-2 h-4 w-4" /> Start Appointment
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() =>
                      router.push(`/doctor-dashboard/appointments?id=${queue.currentEntry!.appointmentId}`)
                    }
                  >
                    <User className="mr-2 h-4 w-4" /> View Details
                  </Button>
                  {queue.currentEntry.consultationType === "Video" && (
                    <Button variant="outline">
                      <Video className="mr-2 h-4 w-4" /> Start Video Call
                    </Button>
                  )}
                  <Button variant="destructive" onClick={() => markNoShow(queue.currentEntry!.appointmentId)}>
                    <XCircle className="mr-2 h-4 w-4" /> Mark No-Show
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-2 text-muted-foreground/60" />
                <p>No active appointment</p>
                <p className="text-sm">Start an appointment from the queue below</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={syncAppointments}
                  disabled={isSyncing}
                  className="mt-4 flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                  {isSyncing ? "Syncing..." : "Sync Appointments"}
                </Button>
              </div>
            )}
          </CardContent>
        </MotionCard>

        {/* Queue Delay Settings */}
        <MotionCard variants={itemVariants}>
          <CardHeader>
            <CardTitle>Queue Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="delay">Current Delay: {currentDelay} minutes</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Slider
                    id="delay"
                    min={0}
                    max={60}
                    step={5}
                    value={[currentDelay]}
                    onValueChange={handleDelayChange}
                    className="flex-1"
                  />
                  <Button onClick={handleUpdateDelay}>Update</Button>
                </div>
              </div>
              <div>
                <Label htmlFor="search">Search Patient</Label>
                <Input
                  id="search"
                  placeholder="Search by patient name..."
                  value={searchTerm}
                  onChange={handleSearch}
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </MotionCard>

        {/* Queue List */}
        <MotionCard variants={itemVariants}>
          <CardHeader>
            <CardTitle>Patient Queue</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
                  <TabsList className="w-full justify-start border-b rounded-none mb-4">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="waiting">Waiting</TabsTrigger>
                    <TabsTrigger value="in-progress">In Progress</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                  </TabsList>

                  <TabsContent value={activeTab} className="mt-0">
                    {filteredEntries.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Calendar className="h-12 w-12 mx-auto mb-2 text-muted-foreground/60" />
                        <p>No patients in queue</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={syncAppointments}
                          disabled={isSyncing}
                          className="mt-4 flex items-center gap-2"
                        >
                          <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                          {isSyncing ? "Syncing..." : "Sync Appointments"}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {filteredEntries.map((entry) => (
                          <div key={entry._id} className="border rounded-lg overflow-hidden">
                            <div className="p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10 border">
                                    <AvatarFallback className="bg-blue-100 text-blue-600">
                                      {entry.patientName
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <h4 className="font-medium">{entry.patientName}</h4>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-3.5 w-3.5" />
                                        <span>Scheduled: {formatTime(entry.scheduledTime)}</span>
                                      </div>
                                      {entry.waitTime !== undefined && entry.status === "waiting" && (
                                        <div className="flex items-center gap-1">
                                          <AlertCircle className="h-3.5 w-3.5" />
                                          <span>Est. Wait: {entry.waitTime} min</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <Badge variant={getStatusBadgeVariant(entry.status)}>
                                  {getStatusText(entry.status)}
                                </Badge>
                              </div>

                              <div className="flex flex-wrap gap-2 mb-3">
                                <Badge variant="outline" className="bg-gray-50">
                                  {entry.consultationType || "In-Person"}
                                </Badge>
                                {entry.priority > 0 && (
                                  <Badge
                                    variant="secondary"
                                    className="bg-orange-100 text-orange-800 border-orange-200"
                                  >
                                    Priority {entry.priority}
                                  </Badge>
                                )}
                              </div>

                              {entry.notes && (
                                <div className="bg-gray-50 p-3 rounded-md mt-2 mb-3">
                                  <p className="text-xs font-medium text-gray-500 mb-1">Notes:</p>
                                  <p className="text-sm">{entry.notes}</p>
                                </div>
                              )}

                              <div className="flex flex-wrap justify-end gap-2 mt-3">
                                {entry.status === "waiting" && (
                                  <>
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => startAppointment(entry.appointmentId)}
                                    >
                                      Start
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => changePriority(entry.appointmentId, (entry.priority || 0) + 1)}
                                      title="Increase Priority"
                                    >
                                      <ArrowUp className="h-4 w-4" />
                                    </Button>
                                    {entry.priority > 0 && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => changePriority(entry.appointmentId, (entry.priority || 0) - 1)}
                                        title="Decrease Priority"
                                      >
                                        <ArrowDown className="h-4 w-4" />
                                      </Button>
                                    )}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700"
                                      onClick={() => markNoShow(entry.appointmentId)}
                                    >
                                      No-Show
                                    </Button>
                                  </>
                                )}
                                {entry.status === "in-progress" && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => completeAppointment(entry.appointmentId)}
                                  >
                                    Complete
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    router.push(`/doctor-dashboard/appointments?id=${entry.appointmentId}`)
                                  }
                                >
                                  View
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            )}
          </CardContent>
        </MotionCard>
      </motion.div>
    </DoctorDashboardLayout>
  )
}

