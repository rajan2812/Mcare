"use client"

import { useState, useEffect, useRef } from "react"
import { Bell } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useSocket } from "@/hooks/useSocket"
import { useToast } from "@/components/ui/use-toast"

interface Notification {
  _id: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
}

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Get user from localStorage
  const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : {}
  const socket = useSocket(user.id, "doctor")

  // Fetch notifications on component mount
  useEffect(() => {
    fetchNotifications()

    // Set up event listener to close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Listen for new notifications via socket
  useEffect(() => {
    if (!socket) return

    socket.on("newNotification", (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev])
      setUnreadCount((prev) => prev + 1)

      // Show toast for new notification
      toast({
        title: notification.title,
        description: notification.message,
        duration: 5000,
      })
    })

    return () => {
      socket.off("newNotification")
    }
  }, [socket, toast])

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token || !user.id) return

      const response = await fetch(
        `http://localhost:4000/api/notifications?userId=${user.id}&userType=doctor&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) {
        throw new Error("Failed to fetch notifications")
      }

      const data = await response.json()
      if (data.success) {
        setNotifications(data.notifications || [])
        setUnreadCount(data.pagination?.unreadCount || 0)
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
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
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("token")
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
      setUnreadCount(0)
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
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

  const getNotificationTime = (createdAt: string) => {
    const date = new Date(createdAt)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`

    return date.toLocaleDateString()
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-50 border">
          <div className="p-3 border-b flex justify-between items-center">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                Mark all as read
              </Button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No notifications</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-3 border-b hover:bg-gray-50 cursor-pointer ${!notification.isRead ? "bg-blue-50" : ""}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-sm">{notification.title}</h4>
                    <span className="text-xs text-gray-500">{getNotificationTime(notification.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                </div>
              ))
            )}
          </div>

          <div className="p-2 border-t text-center">
            <Button
              variant="link"
              size="sm"
              className="text-blue-600 w-full"
              onClick={() => (window.location.href = "/doctor-dashboard/notifications")}
            >
              View all notifications
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

