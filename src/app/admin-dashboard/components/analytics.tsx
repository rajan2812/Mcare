"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Users, UserCheck, Clock, Activity } from "lucide-react"

interface AnalyticsData {
  overview: {
    totalDoctors: number
    totalPatients: number
    pendingVerifications: number
    verifiedDoctors: number
    verificationRate: number
  }
}

export function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  const fetchAnalytics = useCallback(async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("http://localhost:4000/api/admin/analytics", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch analytics data")
      }

      const result = await response.json()
      if (result.success) {
        setData(result.data)
      }
    } catch (error) {
      console.error("Error fetching analytics:", error)
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchAnalytics()
    // Poll for updates every 30 seconds
    const intervalId = setInterval(fetchAnalytics, 30000)
    return () => clearInterval(intervalId)
  }, [fetchAnalytics])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/10 dark:to-blue-900/20">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-500/10 rounded-full">
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <h3 className="text-sm font-medium">Total Users</h3>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold">{data.overview.totalDoctors + data.overview.totalPatients}</div>
            <div className="text-xs text-muted-foreground">
              {data.overview.totalDoctors} Doctors • {data.overview.totalPatients} Patients
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/10 dark:to-green-900/20">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-green-500/10 rounded-full">
              <UserCheck className="h-4 w-4 text-green-500" />
            </div>
            <h3 className="text-sm font-medium">Verified Doctors</h3>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold">{data.overview.verifiedDoctors}</div>
            <div className="text-xs text-muted-foreground">
              {data.overview.verificationRate.toFixed(1)}% verification rate
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/10 dark:to-yellow-900/20">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-yellow-500/10 rounded-full">
              <Clock className="h-4 w-4 text-yellow-500" />
            </div>
            <h3 className="text-sm font-medium">Pending Verifications</h3>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold">{data.overview.pendingVerifications}</div>
            <div className="text-xs text-muted-foreground">Awaiting review</div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/10 dark:to-purple-900/20">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-purple-500/10 rounded-full">
              <Activity className="h-4 w-4 text-purple-500" />
            </div>
            <h3 className="text-sm font-medium">Platform Activity</h3>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold">Active</div>
            <div className="text-xs text-muted-foreground">System running normally</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

