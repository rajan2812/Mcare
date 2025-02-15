"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Home, Calendar, Users, MessageSquare, Settings, Bell, Search, LogOut, AlertCircle } from "lucide-react"
import type React from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const menuItems = [
  { icon: Home, label: "Home", href: "/doctor-dashboard" },
  { icon: Calendar, label: "Appointments", href: "/doctor-dashboard/appointments" },
  { icon: Users, label: "Patients", href: "/doctor-dashboard/patients" },
  { icon: MessageSquare, label: "Chat", href: "/doctor-dashboard/chat" },
  { icon: Settings, label: "Settings", href: "/doctor-dashboard/settings" },
]

interface DoctorDashboardLayoutProps {
  children: React.ReactNode
}

export function DoctorDashboardLayout({ children }: DoctorDashboardLayoutProps) {
  const [doctorInfo, setDoctorInfo] = useState<{
    name: string
    email: string
    initials: string
    isVerified: boolean
  }>({
    name: "",
    email: "",
    initials: "",
    isVerified: false,
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [currentDate, setCurrentDate] = useState("")

  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const storedDoctor = localStorage.getItem("user")
    if (storedDoctor) {
      const data = JSON.parse(storedDoctor)
      const initials = data.firstName[0] + data.lastName[0]

      setDoctorInfo({
        name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        initials,
        isVerified: data.isVerified || false,
      })
    }

    const updateDate = () => {
      const now = new Date()
      setCurrentDate(formatDate(now))
    }

    updateDate()
    const intervalId = setInterval(updateDate, 60000)

    return () => clearInterval(intervalId)
  }, [])

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
    return date.toLocaleDateString("en-US", options)
  }

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn")
    localStorage.removeItem("user")
    localStorage.removeItem("token")
    router.push("/login")
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-64 min-h-screen bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <Link href="/doctor-dashboard" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-blue-600">Mcare</span>
            <span className="text-xl font-bold">Dr</span>
          </Link>
        </div>
        <Link href="/doctor-dashboard/settings?section=profile" className="block">
          <div className="p-4 border-b">
            <div className="flex flex-col items-center space-y-1">
              <Avatar className="w-16 h-16">
                <AvatarImage src="/placeholder.svg" alt={doctorInfo.name} />
                <AvatarFallback>{doctorInfo.initials}</AvatarFallback>
              </Avatar>
              <h3 className="font-medium">{doctorInfo.name}</h3>
              <p className="text-sm text-muted-foreground">{doctorInfo.email}</p>
              <div className="flex items-center text-sm text-green-500">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                Online
              </div>
            </div>
          </div>
        </Link>
        <nav className="flex-1 px-2 py-4">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.label}>
                  <Link href={item.href}>
                    <div
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="p-4 border-t">
          <Button
            variant="ghost"
            className="w-full flex items-center gap-3 text-gray-700 hover:text-red-600 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
            <span>Log Out</span>
          </Button>
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b bg-white px-6 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search patients, appointments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                    3
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>New appointment request</DropdownMenuItem>
                <DropdownMenuItem>Patient message received</DropdownMenuItem>
                <DropdownMenuItem>Upcoming appointment reminder</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="text-right">
              <div className="text-sm text-gray-500">Today Date</div>
              <div className="font-medium">{currentDate}</div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          {!doctorInfo.isVerified && (
            <Alert variant="warning" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Profile Under Review</AlertTitle>
              <AlertDescription>
                Your profile is currently under review by our admin team. Some features may be limited until your
                profile is verified. We will notify you once the review is complete.
              </AlertDescription>
            </Alert>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}

