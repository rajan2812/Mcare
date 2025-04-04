"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bell, Calendar } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import axios from "axios"

interface Notification {
  _id: string
  title: string
  message: string
  status: "read" | "unread"
  createdAt: string
  type: string
  metadata: any
}

export function NotificationsList() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      // Get user from localStorage
      const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : {}

      if (!user.id) {
        setLoading(false)
        return
      }

      const response = await axios.get(`/api/notifications?userId=${user.id}&userType=patient`)

      if (response.data.success) {
        setNotifications(response.data.notifications)
      } else {
        setError("Failed to load notifications")
      }
    } catch (err) {
      console.error("Error fetching notifications:", err)
      setError("An error occurred while fetching notifications")
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await axios.put(`/api/notifications/${notificationId}/read`)

      if (response.data.success) {
        // Update the local state
        setNotifications((prev) =>
          prev.map((notification) =>
            notification._id === notificationId ? { ...notification, status: "read" } : notification,
          ),
        )
      }
    } catch (err) {
      console.error("Error marking notification as read:", err)
    }
  }

  useEffect(() => {
    fetchNotifications()

    // Set up a refresh interval
    const intervalId = setInterval(fetchNotifications, 60000) // Refresh every minute

    return () => clearInterval(intervalId)
  }, [])

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "APPOINTMENT":
        return <Calendar className="h-5 w-5 text-blue-500" />
      default:
        return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-500">Confirmed</Badge>
      case "rejected":
        return <Badge className="bg-red-500">Rejected</Badge>
      case "cancelled":
        return <Badge className="bg-orange-500">Cancelled</Badge>
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>
  }

  if (notifications.length === 0) {
    return <div className="text-gray-500 p-4 text-center">No notifications yet</div>
  }

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto p-2">
      {notifications.map((notification) => (
        <Card
          key={notification._id}
          className={`cursor-pointer hover:bg-gray-50 transition-colors ${notification.status === "unread" ? "border-l-4 border-l-blue-500" : ""}`}
          onClick={() => markAsRead(notification._id)}
        >
          <CardContent className="p-3">
            <div className="flex items-start gap-3">
              <div className="mt-1">{getNotificationIcon(notification.type)}</div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h4 className="font-medium text-sm">
                    {notification.title}
                    {notification.metadata?.status && getStatusBadge(notification.metadata.status)}
                  </h4>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

