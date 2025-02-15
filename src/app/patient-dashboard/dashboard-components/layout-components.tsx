'use client'

import { Search } from "lucide-react"
import { Bell } from "lucide-react"
import { LogOut } from "lucide-react"
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

interface Notification {
  id: string
  message: string
  time: string
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

// Notification Component
const NotificationComponent: FC<NotificationProps> = ({ notifications = [] }) => {
  const notificationCount = notifications?.length || 0

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
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notificationCount === 0 ? (
          <DropdownMenuItem>No new notifications</DropdownMenuItem>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem key={notification.id}>
              <div className="flex flex-col">
                <span className="font-medium">{notification.message}</span>
                <span className="text-sm text-gray-500">{notification.time}</span>
              </div>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <span className="text-blue-500">View all notifications</span>
        </DropdownMenuItem>
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

