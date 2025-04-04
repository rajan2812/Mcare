"use client"

import { useEffect, useState } from "react"
import { Calendar, Users, Clock, TrendingUp } from "lucide-react"
import axios from "axios"

interface DashboardStats {
  appointmentsToday: number
  appointmentsDiff: number
  totalPatients: number
  newPatientsThisWeek: number
  upcomingAppointments: number
  averageRating: number
  ratingDiff: number
}

export default function StatsCards() {
  const [stats, setStats] = useState<DashboardStats>({
    appointmentsToday: 0,
    appointmentsDiff: 0,
    totalPatients: 0,
    newPatientsThisWeek: 0,
    upcomingAppointments: 0,
    averageRating: 0,
    ratingDiff: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true)
        const token = localStorage.getItem("token")

        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/doctor-stats`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.data.success) {
          setStats(response.data.data)
        } else {
          setError("Failed to fetch dashboard statistics")
        }
      } catch (err) {
        console.error("Error fetching dashboard stats:", err)
        setError("An error occurred while fetching dashboard statistics")
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardStats()
  }, [])

  const statCards = [
    {
      title: "Appointments Today",
      value: stats.appointmentsToday,
      icon: <Calendar className="h-8 w-8 text-white" />,
      iconBg: "bg-blue-500",
      change: `${stats.appointmentsDiff >= 0 ? "+" : ""}${stats.appointmentsDiff} from yesterday`,
    },
    {
      title: "Total Patients",
      value: stats.totalPatients,
      icon: <Users className="h-8 w-8 text-white" />,
      iconBg: "bg-green-500",
      change: `+${stats.newPatientsThisWeek} new this week`,
    },
    {
      title: "Upcoming Appointments",
      value: stats.upcomingAppointments,
      icon: <Clock className="h-8 w-8 text-white" />,
      iconBg: "bg-purple-500",
      change: "For next 7 days",
    },
    {
      title: "Average Rating",
      value: stats.averageRating,
      icon: <TrendingUp className="h-8 w-8 text-white" />,
      iconBg: "bg-orange-500",
      change: `${stats.ratingDiff >= 0 ? "+" : ""}${stats.ratingDiff.toFixed(1)} from last month`,
    },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-4 rounded-lg shadow animate-pulse">
            <div className="h-16 bg-gray-200 rounded mb-4"></div>
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg mb-6">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statCards.map((card, index) => (
        <div key={index} className="bg-white p-4 rounded-lg shadow flex items-start">
          <div className={`${card.iconBg} p-3 rounded-full mr-4`}>{card.icon}</div>
          <div>
            <h3 className="text-gray-500 text-sm font-medium">{card.title}</h3>
            <p className="text-3xl font-bold mt-1">{card.value}</p>
            <p className="text-gray-500 text-xs mt-1">{card.change}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

