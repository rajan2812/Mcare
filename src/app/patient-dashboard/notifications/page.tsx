"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Calendar, Clock, Info, Bell, Check, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

interface Notification {
  _id: string
  title: string
  message: string
  type: string
  status: string
  createdAt: string
  metadata: any
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [pagination, setPagination] = useState({
    total: 0,
    unreadCount: 0,
    page: 1,
    limit: 10,
    pages: 1,
  })

  const router = useRouter()

  // Get user from localStorage
  const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : {}

  const fetchNotifications = async (page = 1, tab = activeTab) => {
    if (!user.id) return

    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const onlyUnread = tab === "unread" ? "true" : "false"
      const typeFilter = tab !== "all" && tab !== "unread" ? `&type=${tab}` : ""

      const response = await fetch(
        `http://localhost:4000/api/notifications?userId=${user.id}&userType=patient&limit=10&page=${page}&onlyUnread=${onlyUnread}${typeFilter}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) throw new Error("Failed to fetch notifications")

      const data = await response.json()
      if (data.success) {
        setNotifications(data.data || [])
        setPagination({
          total: data.pagination?.total || 0,
          unreadCount: data.pagination?.unreadCount || 0,
          page: data.pagination?.page || 1,
          limit: data.pagination?.limit || 10,
          pages: data.pagination?.pages || 1,
        })
      } else {
        throw new Error(data.message || "Failed to fetch notifications")
      }
    } catch (err) {
      console.error("Error fetching notifications:", err)
      setError("Failed to load notifications")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user.id) {
      fetchNotifications()
    }
  }, [user.id])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    fetchNotifications(1, value)
  }

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
      setNotifications((prev) =>
        prev.map((notif) => (notif._id === notificationId ? { ...notif, status: "read" } : notif)),
      )

      // Update unread count in pagination
      setPagination((prev) => ({
        ...prev,
        unreadCount: Math.max(0, prev.unreadCount - 1),
      }))
    } catch (err) {
      console.error("Error marking notification as read:", err)
    }
  }

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("token")
      await fetch(`http://localhost:4000/api/notifications/mark-all-read`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          userType: "patient",
        }),
      })

      // Update local state
      setNotifications((prev) => prev.map((notif) => ({ ...notif, status: "read" })))

      // Update unread count in pagination
      setPagination((prev) => ({
        ...prev,
        unreadCount: 0,
      }))
    } catch (err) {
      console.error("Error marking all notifications as read:", err)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const token = localStorage.getItem("token")
      await fetch(`http://localhost:4000/api/notifications/${notificationId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      // Update local state
      setNotifications((prev) => prev.filter((notif) => notif._id !== notificationId))

      // Update total count in pagination
      setPagination((prev) => ({
        ...prev,
        total: prev.total - 1,
        unreadCount:
          prev.unreadCount - (notifications.find((n) => n._id === notificationId)?.status === "unread" ? 1 : 0),
      }))
    } catch (err) {
      console.error("Error deleting notification:", err)
    }
  }

  const handlePageChange = (newPage: number) => {
    fetchNotifications(newPage)
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "APPOINTMENT":
        return <Calendar className="h-5 w-5 text-blue-500" />
      case "SYSTEM":
        return <Bell className="h-5 w-5 text-amber-500" />
      case "REMINDER":
        return <Clock className="h-5 w-5 text-green-500" />
      case "PAYMENT":
        return <div className="h-5 w-5 text-purple-500">$</div>
      case "MESSAGE":
        return <div className="h-5 w-5 text-indigo-500">✉️</div>
      default:
        return <Info className="h-5 w-5 text-gray-500" />
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>View and manage your notifications</CardDescription>
            </div>
            {pagination.unreadCount > 0 && (
              <Button variant="outline" onClick={markAllAsRead}>
                Mark all as read
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">
                All
                <Badge variant="outline" className="ml-2">
                  {pagination.total}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="unread">
                Unread
                <Badge variant="outline" className="ml-2">
                  {pagination.unreadCount}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="APPOINTMENT">Appointments</TabsTrigger>
              <TabsTrigger value="REMINDER">Reminders</TabsTrigger>
              <TabsTrigger value="SYSTEM">System</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start space-x-4 p-4 border rounded-lg">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="text-center p-8 text-red-500">{error}</div>
              ) : notifications.length === 0 ? (
                <div className="text-center p-8 text-gray-500">No notifications found</div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div
                      key={notification._id}
                      className={`flex items-start p-4 border rounded-lg ${notification.status === "unread" ? "bg-blue-50 border-blue-200" : ""}`}
                    >
                      <div className="mr-4 mt-1">{getNotificationIcon(notification.type)}</div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium">{notification.title}</h4>
                          <div className="flex items-center space-x-2">
                            {notification.status === "unread" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsRead(notification._id)}
                                className="h-8 w-8 p-0"
                              >
                                <Check className="h-4 w-4" />
                                <span className="sr-only">Mark as read</span>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteNotification(notification._id)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </div>
                        <p className="text-gray-700 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-2">{formatDate(notification.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex justify-center mt-6">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1 || loading}
                    >
                      Previous
                    </Button>
                    {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={pagination.page === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        disabled={loading}
                      >
                        {page}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.pages || loading}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

