"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import type { DayProps } from "react-day-picker"

export function AvailabilityCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const { toast } = useToast()

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date)
  }

  const handleSave = () => {
    if (!selectedDate) {
      toast({
        title: "No dates selected",
        description: `Please select at least one date.`,
      })
      return
    }
    toast({
      title: "Availability Updated",
      description: `You have marked ${selectedDate ? 1 : 0} day as unavailable.`,
    })
  }

  const isDateSelected = (date: Date) => {
    return selectedDate?.toISOString() === date.toISOString()
  }

  const CustomDay = (props: DayProps) => {
    const { date, displayMonth } = props
    if (!date) return null

    const isSelected = isDateSelected(date)
    const isToday = date.toDateString() === new Date().toDateString()
    const isOutsideMonth = date.getMonth() !== displayMonth.getMonth()

    return (
      <div
        {...props}
        className={`relative w-full h-full p-2 ${
          isOutsideMonth ? "text-gray-400" : "text-gray-900"
        } ${isSelected ? "bg-red-100" : ""}`}
      >
        {isToday && (
          <Badge className="absolute top-0 right-0" variant="secondary">
            Today
          </Badge>
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
          <Button onClick={handleSave}>Save Changes</Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-gray-500">
            Select dates when you will be unavailable. Patients wont be able to book appointments on these dates.
          </div>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            className="rounded-md border"
            components={{
              Day: CustomDay,
            }}
          />
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 rounded-full" />
              <span>Unavailable</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border rounded-full" />
              <span>Available</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

