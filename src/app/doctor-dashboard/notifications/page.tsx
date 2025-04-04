"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { DoctorDashboardLayout } from "../components/layout-components"

interface Notification {
  _id: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
  metadata?: any
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const { toast } = useToast()

  useEffect(() => {
    fetchNotifications()
  }, [activeTab])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")
      const user = JSON.parse(localStorage.getItem("user") || "{}")

      if (!token || !user.id) {
        throw new Error("Authentication required")
      }

      const queryParams = new URLSearchParams({
        userId: user.id,
        userType: "doctor",
        limit: "50",
      })

      if (activeTab === "unread") {
        queryParams.append("onlyUnread", "true")
      }

      const response = await fetch(`http://localhost:4000/api/notifications?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch notifications")
      }

      const data = await response.json()
      if (data.success) {
        setNotifications(data.notifications || [])
      } else {
        throw new Error(data.message || "Failed to fetch notifications")
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load notifications",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return

      const response = await fetch(`http://localhost:4000/api/notifications/${id}/read`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to mark notification as read")
      }

      // Update local state
      setNotifications((prev) => prev.map((notif) => (notif._id === id ? { ...notif, isRead: true } : notif)))
    } catch (error) {
      console.error("Error marking notification as read:", error)
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      })
    }
  }

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("token")
      const user = JSON.parse(localStorage.getItem("user") || "{}")

      if (!token || !user.id) return

      const response = await fetch(
        `http://localhost:4000/api/notifications/mark-all-read?userId=${user.id}&userType=doctor`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) {
        throw new Error("Failed to mark all notifications as read")
      }

      // Update local state
      setNotifications((prev) => prev.map((notif) => ({ ...notif, isRead: true })))

      toast({
        title: "Success",
        description: "All notifications marked as read",
      })
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      })
    }
  }

  const clearAllNotifications = async () => {
    try {
      const token = localStorage.getItem("token")
      const user = JSON.parse(localStorage.getItem("user") || "{}")

      if (!token || !user.id) return

      const response = await fetch(`http://localhost:4000/api/notifications/clear-all`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to clear notifications")
      }

      // Update local state
      setNotifications([])

      toast({
        title: "Success",
        description: "All notifications cleared",
      })
    } catch (error) {
      console.error("Error clearing notifications:", error)
      toast({
        title: "Error",
        description: "Failed to clear notifications",
        variant: "destructive",
      })
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read when clicked
    if (!notification.isRead) {
      markAsRead(notification._id)
    }

    // Handle navigation based on notification type
    if (notification.type === "appointment_request") {
      window.location.href = "/doctor-dashboard/appointments"
    } else if (notification.type === "message") {
      window.location.href = "/doctor-dashboard/messages"
    } else if (notification.type === "appointment_reminder") {
      window.location.href = "/doctor-dashboard/appointments"
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    })
  }

  return (
    <DoctorDashboardLayout>
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Notifications</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={markAllAsRead} disabled={!notifications.some((n) => !n.isRead)}>
                Mark all as read
              </Button>
              <Button variant="outline" onClick={clearAllNotifications} disabled={notifications.length === 0}>
                Clear all
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unread">Unread</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4">
                {loading ? (
                  <div className="flex justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No notifications</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification._id}
                      className={`p-4 border rounded-lg hover:bg-gray-50 cursor-pointer ${
                        !notification.isRead ? "bg-blue-50" : ""
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">{notification.title}</h4>
                        <span className="text-xs text-gray-500">{formatDate(notification.createdAt)}</span>
                      </div>
                      <p className="text-gray-600 mt-1">{notification.message}</p>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="unread" className="space-y-4">
                {loading ? (
                  <div className="flex justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No unread notifications</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification._id}
                      className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer bg-blue-50"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">{notification.title}</h4>
                        <span className="text-xs text-gray-500">{formatDate(notification.createdAt)}</span>
                      </div>
                      <p className="text-gray-600 mt-1">{notification.message}</p>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DoctorDashboardLayout>
  )
}

