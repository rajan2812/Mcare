"use client"

import type React from "react"

import { Search, Bell, LogOut, Calendar, Clock, Info, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { FC, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"

// Update the Notification interface to include more fields
interface Notification {
  id: string
  message: string
  time: string
  type?: string
  title?: string
  isRead?: boolean
}

interface HeaderProps {
  notifications?: Notification[]
}

interface NotificationProps {
  notifications?: Notification[]
}

interface SidebarLayoutProps {
  children?: ReactNode
}

// Header Component
const Header: FC<HeaderProps> = ({ notifications = [] }) => {
  const currentDate = new Date().toLocaleDateString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

  return (
    <header className="h-16 border-b bg-white px-6 flex items-center justify-between">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search Doctor"
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <NotificationComponent notifications={notifications} />
        <div className="text-right">
          <div className="text-sm text-gray-500">Today Date</div>
          <div className="font-medium">{currentDate}</div>
        </div>
      </div>
    </header>
  )
}

// Update the NotificationComponent to fetch and display real notifications
const NotificationComponent: FC<NotificationProps> = ({ notifications = [] }) => {
  const [notificationsList, setNotificationsList] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  // Get user from localStorage
  const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : {}

  const fetchNotifications = async () => {
    if (!user.id) return

    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      // Update the API endpoint to match your backend route
      const response = await fetch(`http://localhost:4000/api/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error("Failed to fetch notifications")

      const data = await response.json()
      if (data.success) {
        setNotificationsList(
          data.data.map((notif) => ({
            id: notif._id,
            title: notif.title || "Notification",
            message: notif.message,
            time: new Date(notif.createdAt).toLocaleString(),
            type: notif.type,
            isRead: notif.status === "read",
          })),
        )
      }
    } catch (err) {
      console.error("Error fetching notifications:", err)
      // Don't set error state to avoid showing error message to user
      // Just log it to console for debugging
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()

    // Set up interval to refresh notifications every minute
    const intervalId = setInterval(fetchNotifications, 60000)

    return () => clearInterval(intervalId)
  }, [user.id])

  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem("token")
      await fetch(`http://localhost:4000/api/notifications/${notificationId}/read`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      // Update local state
      setNotificationsList((prev) =>
        prev.map((notif) => (notif.id === notificationId ? { ...notif, isRead: true } : notif)),
      )
    } catch (err) {
      console.error("Error marking notification as read:", err)
    }
  }

  const clearAllNotifications = async (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent dropdown from closing

    try {
      setLoading(true)
      const token = localStorage.getItem("token")
      const response = await fetch(`http://localhost:4000/api/notifications/clear-all`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) throw new Error("Failed to clear notifications")

      const data = await response.json()
      if (data.success) {
        // Clear notifications in state
        setNotificationsList([])
        toast({
          title: "Notifications cleared",
          description: `${data.message || "All notifications have been cleared"}`,
        })
      }
    } catch (err) {
      console.error("Error clearing notifications:", err)
      toast({
        title: "Error",
        description: "Failed to clear notifications",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const viewAllNotifications = () => {
    router.push("/patient-dashboard/notifications")
  }

  const notificationCount = notificationsList.filter((n) => !n.isRead).length

  const getNotificationIcon = (type = "") => {
    switch (type) {
      case "APPOINTMENT":
        return <Calendar className="h-4 w-4 mr-2 text-blue-500" />
      case "SYSTEM":
        return <Bell className="h-4 w-4 mr-2 text-amber-500" />
      case "REMINDER":
        return <Clock className="h-4 w-4 mr-2 text-green-500" />
      default:
        return <Info className="h-4 w-4 mr-2 text-gray-500" />
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
              {notificationCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[400px] overflow-auto">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>Notifications</span>
          {notificationCount > 0 && (
            <Badge variant="outline" className="ml-2">
              {notificationCount} new
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {loading ? (
          <div className="p-4 text-center">
            <span className="animate-spin inline-block h-4 w-4 border-2 border-current border-t-transparent text-blue-600 rounded-full mr-2"></span>
            Loading...
          </div>
        ) : notificationsList.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No new notifications</div>
        ) : (
          <>
            {notificationsList.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex items-start p-3 cursor-pointer ${!notification.isRead ? "bg-blue-50" : ""}`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex items-start">
                  {getNotificationIcon(notification.type)}
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{notification.title}</span>
                    <span className="text-sm text-gray-700">{notification.message}</span>
                    <span className="text-xs text-gray-500 mt-1">{notification.time}</span>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}

        <DropdownMenuSeparator />
        <div className="flex justify-between p-2">
          <DropdownMenuItem className="cursor-pointer" onClick={viewAllNotifications}>
            <span className="text-blue-500">View all</span>
          </DropdownMenuItem>

          {notificationsList.length > 0 && (
            <DropdownMenuItem
              className="cursor-pointer text-red-500 flex items-center"
              onClick={clearAllNotifications}
              disabled={loading}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              <span>Clear all</span>
            </DropdownMenuItem>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Sidebar Component
const SidebarLayout: FC<SidebarLayoutProps> = ({ children }) => {
  const router = useRouter()

  const handleLogout = () => {
    // Clear user session and local storage
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    localStorage.removeItem("isLoggedIn")

    // Redirect to home page
    router.push("/home")
  }

  return (
    <div className="w-64 h-screen bg-white border-r flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="text-2xl font-bold text-blue-600">Mcare</div>
          <span className="text-xl font-bold">Pt</span>
        </div>
      </div>
      {children}
      <div className="mt-auto p-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-100"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 mr-2" />
          Log Out
        </Button>
      </div>
    </div>
  )
}

export { Header, NotificationComponent as Notification, SidebarLayout as Sidebar }

