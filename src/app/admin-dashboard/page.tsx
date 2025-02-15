"use client"

import { useState } from "react"
import { Home, Users, Calendar, FileText, MessageSquare, BarChart, Settings, LogOut, Bell, X } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserManagement } from "./components/users"
import { ComplaintManagement } from "./components/complaint"
import { Analytics } from "./components/analytics"
import { Settings as SettingsComponent } from "./components/settings"

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

  const handleLogout = () => {
    router.push("../")
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
              <div className="flex items-center gap-2">
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
              <div className="rounded-lg bg-gradient-to-br from-[#4169E1] to-[#9370DB] p-6 text-white shadow-lg">
                <h2 className="text-2xl font-bold mb-2">Welcome, Admin!</h2>
                <p>Here is your dashboard summary for 2/13/2025</p>
              </div>

              {/* Summary Cards */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[
                  { title: "Total Users", icon: Users, value: "1,284", change: "+180 from last month" },
                  { title: "Active Appointments", icon: Calendar, value: "145", change: "+22% from last week" },
                  { title: "Pending Approvals", icon: FileText, value: "24", change: "4 doctor registrations" },
                  { title: "Active Doctors", icon: Users, value: "48", change: "+3 this month" },
                ].map((card, index) => (
                  <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                      <card.icon className="h-4 w-4 text-[#4169E1]" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{card.value}</div>
                      <p className="text-xs text-gray-500">{card.change}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Main Content Tabs */}
              <Card className="mt-6">
                <CardContent className="p-6">
                  <Tabs defaultValue="user-management" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-3 gap-4">
                      <TabsTrigger value="user-management">User Management</TabsTrigger>
                      <TabsTrigger value="complaints">Complaints</TabsTrigger>
                      <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    </TabsList>
                    <TabsContent value="user-management" className="space-y-4">
                      <h3 className="text-lg font-semibold">Recent Doctor Registrations</h3>
                      <UserManagement />
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

