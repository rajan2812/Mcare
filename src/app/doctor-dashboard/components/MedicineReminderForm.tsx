"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Clock, Plus, Trash } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface MedicineReminderFormProps {
  patientId: string
  appointmentId: string
  onSuccess?: () => void
  onCancel?: () => void
}

interface Reminder {
  medicationName: string
  dosage: string
  frequency: string
  time: string
  duration: string
  instructions: string
  startDate?: string
}

export function MedicineReminderForm({ patientId, appointmentId, onSuccess, onCancel }: MedicineReminderFormProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [reminders, setReminders] = useState<Reminder[]>([
    {
      medicationName: "",
      dosage: "",
      frequency: "once",
      time: "08:00",
      duration: "7",
      instructions: "",
      startDate: new Date().toISOString().split("T")[0],
    },
  ])

  const handleAddReminder = () => {
    setReminders([
      ...reminders,
      {
        medicationName: "",
        dosage: "",
        frequency: "once",
        time: "08:00",
        duration: "7",
        instructions: "",
        startDate: new Date().toISOString().split("T")[0],
      },
    ])
  }

  const handleRemoveReminder = (index: number) => {
    if (reminders.length > 1) {
      setReminders(reminders.filter((_, i) => i !== index))
    }
  }

  const handleChange = (index: number, field: keyof Reminder, value: string) => {
    const updatedReminders = [...reminders]
    updatedReminders[index] = {
      ...updatedReminders[index],
      [field]: value,
    }
    setReminders(updatedReminders)
  }

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)

      // Validate form
      const invalidReminders = reminders.filter(
        (reminder) => !reminder.medicationName || !reminder.dosage || !reminder.time,
      )

      if (invalidReminders.length > 0) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields for each medication reminder",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("Authentication token not found")
      }

      const user = JSON.parse(localStorage.getItem("user") || "{}")

      // Format the reminders data for the API
      const reminderData = {
        patientId,
        appointmentId,
        doctorId: user.id,
        reminders: reminders.map((reminder) => ({
          medicationName: reminder.medicationName,
          dosage: reminder.dosage,
          frequency: reminder.frequency,
          scheduledTime: reminder.time,
          duration: Number.parseInt(reminder.duration),
          instructions: reminder.instructions,
          startDate: reminder.startDate,
        })),
      }

      console.log("Sending reminder data:", reminderData)

      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/medication-reminders`
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(reminderData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to create medication reminders")
      }

      const data = await response.json()
      console.log("Reminder creation response:", data)

      toast({
        title: "Reminders Created",
        description: "Medication reminders have been set successfully",
      })

      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error("Error creating medication reminders:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create medication reminders",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <ScrollArea className="max-h-[70vh] pr-4">
        <div className="space-y-6">
          {reminders.map((reminder, index) => (
            <div key={index} className="p-4 border rounded-lg bg-gray-50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">Medication #{index + 1}</h3>
                {reminders.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveReminder(index)}
                    className="h-8 w-8 p-0 text-red-500"
                  >
                    <Trash className="h-4 w-4" />
                    <span className="sr-only">Remove</span>
                  </Button>
                )}
              </div>

              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`medication-${index}`}>Medication Name*</Label>
                    <Input
                      id={`medication-${index}`}
                      value={reminder.medicationName}
                      onChange={(e) => handleChange(index, "medicationName", e.target.value)}
                      placeholder="e.g., Amoxicillin"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`dosage-${index}`}>Dosage*</Label>
                    <Input
                      id={`dosage-${index}`}
                      value={reminder.dosage}
                      onChange={(e) => handleChange(index, "dosage", e.target.value)}
                      placeholder="e.g., 500mg"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`frequency-${index}`}>Frequency</Label>
                    <Select
                      value={reminder.frequency}
                      onValueChange={(value) => handleChange(index, "frequency", value)}
                    >
                      <SelectTrigger id={`frequency-${index}`}>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="once">Once daily</SelectItem>
                        <SelectItem value="twice">Twice daily</SelectItem>
                        <SelectItem value="thrice">Three times daily</SelectItem>
                        <SelectItem value="four">Four times daily</SelectItem>
                        <SelectItem value="asNeeded">As needed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`time-${index}`}>Time*</Label>
                    <div className="flex items-center">
                      <Clock className="mr-2 h-4 w-4 text-gray-500" />
                      <Input
                        id={`time-${index}`}
                        type="time"
                        value={reminder.time}
                        onChange={(e) => handleChange(index, "time", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`duration-${index}`}>Duration (days)</Label>
                    <Input
                      id={`duration-${index}`}
                      type="number"
                      min="1"
                      value={reminder.duration}
                      onChange={(e) => handleChange(index, "duration", e.target.value)}
                      placeholder="e.g., 7"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`start-date-${index}`}>Start Date</Label>
                  <Input
                    id={`start-date-${index}`}
                    type="date"
                    value={reminder.startDate}
                    onChange={(e) => handleChange(index, "startDate", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`instructions-${index}`}>Instructions</Label>
                  <Textarea
                    id={`instructions-${index}`}
                    value={reminder.instructions}
                    onChange={(e) => handleChange(index, "instructions", e.target.value)}
                    placeholder="e.g., Take with food"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={handleAddReminder} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Another Medication
          </Button>
        </div>
      </ScrollArea>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              <span>Setting Reminders...</span>
            </div>
          ) : (
            "Set Reminders"
          )}
        </Button>
      </div>
    </div>
  )
}

