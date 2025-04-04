"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Clock, AlertCircle, CalendarIcon } from "lucide-react"
import type { DayProps } from "react-day-picker"
import { useSocket } from "@/hooks/useSocket"

interface TimeRange {
  start: string
  end: string
}

interface Break {
  startTime: string
  endTime: string
  type: "lunch" | "quick" | "other"
}

interface Availability {
  date: string
  isAvailable: boolean
  regularHours: TimeRange
  emergencyHours?: TimeRange
  breaks: Break[]
  timeSlots?: Array<{
    startTime: string
    endTime: string
    isBooked: boolean
    isBreak: boolean
  }>
}

interface SavedAvailability {
  date: string
  hours: TimeRange
  isAvailable: boolean
}

export function AvailabilityCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [isAvailable, setIsAvailable] = useState(true)
  const [regularHours, setRegularHours] = useState<TimeRange>({ start: "09:00", end: "17:00" })
  const [emergencyHours, setEmergencyHours] = useState<TimeRange | undefined>()
  const [breaks, setBreaks] = useState<Break[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [savedAvailabilities, setSavedAvailabilities] = useState<SavedAvailability[]>([])
  const { toast } = useToast()

  const user = JSON.parse(localStorage.getItem("user") || "{}")
  const socket = useSocket(user.id, "doctor")

  const formatDate = (date: Date): string => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d.toISOString().split("T")[0]
  }

  // Add this function to load availability from local storage as a fallback
  const loadAvailabilityFromLocalStorage = useCallback(() => {
    const storedAvailabilities = JSON.parse(localStorage.getItem("doctorAvailabilities") || "[]")
    const savedAvailability = storedAvailabilities.find(
      (a) => formatDate(new Date(a.date)) === formatDate(selectedDate),
    )

    if (savedAvailability) {
      setIsAvailable(savedAvailability.isAvailable)
      setRegularHours(savedAvailability.regularHours)
      setEmergencyHours(savedAvailability.emergencyHours || undefined)
      setBreaks(savedAvailability.breaks || [])
    }
  }, [selectedDate])

  // Fetch saved availabilities on component mount
  useEffect(() => {
    fetchSavedAvailabilities()
  }, [])

  // Fetch availability when date changes
  useEffect(() => {
    if (selectedDate) {
      const savedAvailability = savedAvailabilities.find(
        (a: any) => formatDate(new Date(a.date)) === formatDate(selectedDate),
      )

      if (savedAvailability) {
        setIsAvailable(savedAvailability.isAvailable)
        setRegularHours(savedAvailability.regularHours)
        setEmergencyHours(savedAvailability.emergencyHours || undefined)
        setBreaks(savedAvailability.breaks || [])
      } else {
        // Try to load from local storage as fallback
        loadAvailabilityFromLocalStorage()
        // If not found in local storage, fetch from server
        fetchAvailability(selectedDate)
      }
    }
  }, [selectedDate, savedAvailabilities, loadAvailabilityFromLocalStorage])

  // Socket event listeners
  useEffect(() => {
    if (socket) {
      socket.on("availabilityUpdated", (data) => {
        if (data.doctorId === user.id) {
          const availability = data.availability
          setIsAvailable(availability.isAvailable)
          setRegularHours(availability.regularHours)
          setEmergencyHours(availability.emergencyHours)
          setBreaks(availability.breaks || [])

          // Refresh saved availabilities
          fetchSavedAvailabilities()
        }
      })

      return () => {
        socket.off("availabilityUpdated")
      }
    }
  }, [socket, user.id])

  const fetchSavedAvailabilities = async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) throw new Error("No authentication token found")

      const response = await fetch(`http://localhost:4000/api/doctor/availabilities/${user.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to fetch saved availabilities")
      }

      const data = await response.json()
      if (data.success) {
        setSavedAvailabilities(data.data)

        // Find availability for selected date
        const currentDateAvailability = data.data.find(
          (a: any) => formatDate(new Date(a.date)) === formatDate(selectedDate),
        )

        // Update current availability states if found
        if (currentDateAvailability) {
          setIsAvailable(currentDateAvailability.isAvailable)
          setRegularHours(currentDateAvailability.regularHours)
          setEmergencyHours(currentDateAvailability.emergencyHours || undefined)
          setBreaks(currentDateAvailability.breaks || [])
        }
      }
    } catch (error) {
      console.error("Error fetching saved availabilities:", error)
      toast({
        title: "Error",
        description: "Failed to fetch saved availabilities",
        variant: "destructive",
      })
    }
  }

  const fetchAvailability = async (date: Date) => {
    try {
      setIsLoading(true)
      setError("")

      const token = localStorage.getItem("token")
      if (!token) throw new Error("No authentication token found")

      const formattedDate = formatDate(date)
      const response = await fetch(`http://localhost:4000/api/doctor/availability/${user.id}/${formattedDate}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to fetch availability")
      }

      const data = await response.json()
      if (data.success) {
        const availability = data.data
        setIsAvailable(availability.isAvailable)
        setRegularHours(availability.regularHours)
        setEmergencyHours(availability.emergencyHours)
        setBreaks(availability.breaks || [])
      } else {
        throw new Error(data.message || "Failed to fetch availability")
      }
    } catch (error) {
      console.error("Error fetching availability:", error)
      setError(error instanceof Error ? error.message : "Failed to fetch availability")
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch availability",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const validateTimeRange = (time: string) => {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    return timeRegex.test(time)
  }

  const validateAvailability = () => {
    if (!validateTimeRange(regularHours.start) || !validateTimeRange(regularHours.end)) {
      throw new Error("Invalid regular hours format. Please use HH:mm format")
    }

    if (emergencyHours) {
      if (!validateTimeRange(emergencyHours.start) || !validateTimeRange(emergencyHours.end)) {
        throw new Error("Invalid emergency hours format. Please use HH:mm format")
      }
    }

    const regularStart = convertTimeToMinutes(regularHours.start)
    const regularEnd = convertTimeToMinutes(regularHours.end)

    if (regularStart >= regularEnd) {
      throw new Error("Regular hours end time must be after start time")
    }

    if (emergencyHours) {
      const emergencyStart = convertTimeToMinutes(emergencyHours.start)
      const emergencyEnd = convertTimeToMinutes(emergencyHours.end)

      if (emergencyStart >= emergencyEnd) {
        throw new Error("Emergency hours end time must be after start time")
      }

      if (emergencyStart < regularEnd) {
        throw new Error("Emergency hours must start after regular hours end")
      }
    }
  }

  const convertTimeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number)
    return hours * 60 + minutes
  }

  // Update the handleSave function to ensure proper data persistence
  const handleSave = async () => {
    try {
      setIsLoading(true)
      setError("")

      // Validate time ranges
      validateAvailability()

      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No authentication token found")
      }

      const availabilityData = {
        date: formatDate(selectedDate),
        isAvailable,
        regularHours,
        emergencyHours,
        breaks,
      }

      console.log("Saving availability data:", availabilityData)

      const response = await fetch("http://localhost:4000/api/doctor/set-availability", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(availabilityData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to save availability")
      }

      const data = await response.json()
      if (data.success) {
        toast({
          title: "Success",
          description: "Availability has been saved successfully",
        })

        // Update saved availabilities
        fetchSavedAvailabilities()

        // Store availability in local storage as a backup
        const storedAvailabilities = JSON.parse(localStorage.getItem("doctorAvailabilities") || "[]")
        const existingIndex = storedAvailabilities.findIndex(
          (a) => formatDate(new Date(a.date)) === formatDate(selectedDate),
        )

        if (existingIndex >= 0) {
          storedAvailabilities[existingIndex] = {
            ...availabilityData,
            id: data.data.id,
          }
        } else {
          storedAvailabilities.push({
            ...availabilityData,
            id: data.data.id,
          })
        }

        localStorage.setItem("doctorAvailabilities", JSON.stringify(storedAvailabilities))

        // Emit socket event for real-time updates
        if (socket) {
          socket.emit("availabilityUpdated", {
            doctorId: user.id,
            date: selectedDate,
            availability: data.data,
          })
        }
      }
    } catch (error) {
      console.error("Error saving availability:", error)
      setError(error instanceof Error ? error.message : "Failed to save availability")
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save availability",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTimeChange = (type: "regular" | "emergency", field: "start" | "end", value: string) => {
    if (value && !validateTimeRange(value)) {
      toast({
        title: "Invalid Time Format",
        description: "Please use HH:mm format (24-hour)",
        variant: "destructive",
      })
      return
    }

    if (type === "regular") {
      setRegularHours((prev) => ({ ...prev, [field]: value }))
    } else {
      setEmergencyHours((prev) => (prev ? { ...prev, [field]: value } : { start: "", end: "" }))
    }
  }

  const CustomDay = (props: DayProps) => {
    const { date, displayMonth } = props
    if (!date) return null

    const isSelected = selectedDate?.toDateString() === date.toDateString()
    const isToday = date.toDateString() === new Date().toDateString()
    const isOutsideMonth = date.getMonth() !== displayMonth.getMonth()
    const hasAvailability = savedAvailabilities.some((a) => a.date === formatDate(date))

    return (
      <div
        {...props}
        className={`relative w-full h-full p-2 ${
          isOutsideMonth ? "text-gray-400" : "text-gray-900"
        } ${isSelected ? "bg-primary/10" : ""}`}
      >
        {isToday && (
          <Badge className="absolute top-0 right-0" variant="secondary">
            Today
          </Badge>
        )}
        {hasAvailability && (
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-green-500 rounded-full" />
        )}
        <div className="flex items-center justify-center w-full h-full">{date.getDate()}</div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Manage Availability</span>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Available for Appointments</Label>
                <Switch checked={isAvailable} onCheckedChange={setIsAvailable} />
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>Regular Hours</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                      <Input
                        type="text"
                        placeholder="HH:mm"
                        value={regularHours.start}
                        onChange={(e) => handleTimeChange("regular", "start", e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                      <Input
                        type="text"
                        placeholder="HH:mm"
                        value={regularHours.end}
                        onChange={(e) => handleTimeChange("regular", "end", e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Emergency Hours</Label>
                  <Switch
                    checked={!!emergencyHours}
                    onCheckedChange={(checked) =>
                      setEmergencyHours(checked ? { start: "17:00", end: "20:00" } : undefined)
                    }
                  />
                </div>

                {emergencyHours && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                        <Input
                          type="text"
                          placeholder="HH:mm"
                          value={emergencyHours.start}
                          onChange={(e) => handleTimeChange("emergency", "start", e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                        <Input
                          type="text"
                          placeholder="HH:mm"
                          value={emergencyHours.end}
                          onChange={(e) => handleTimeChange("emergency", "end", e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                <Label>Select Date</Label>
              </div>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
                components={{
                  Day: CustomDay,
                }}
                disabled={(date) => {
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  return date < today
                }}
              />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>Availability set</span>
              </div>
            </div>
          </div>

          {savedAvailabilities.length > 0 && (
            <div className="space-y-4">
              <Separator />
              <div>
                <h3 className="font-medium mb-2">Saved Availability</h3>
                <div className="grid gap-2">
                  {savedAvailabilities.map((availability, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 rounded-lg border bg-card text-card-foreground"
                    >
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(availability.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={availability.isAvailable ? "default" : "destructive"}>
                          {availability.isAvailable ? "Available" : "Unavailable"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {availability.hours.start} - {availability.hours.end}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

