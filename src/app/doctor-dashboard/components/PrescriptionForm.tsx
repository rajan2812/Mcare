"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { Trash2, Plus, Bell } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Medication {
  name: string
  dosage: string
  frequency: string
  duration: string
  instructions: string
  reminderEnabled: boolean
  reminderFrequency: string
  reminderTimes: string[]
  startDate?: string
  endDate?: string
}

interface PrescriptionFormProps {
  isOpen?: boolean
  onClose?: () => void
  appointmentId: string
  patientId: string
  patientName: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function PrescriptionForm({
  isOpen,
  onClose,
  appointmentId,
  patientId,
  patientName,
  onSuccess,
  onCancel,
}: PrescriptionFormProps) {
  const [diagnosis, setDiagnosis] = useState("")
  const [medications, setMedications] = useState<Medication[]>([
    {
      name: "",
      dosage: "",
      frequency: "",
      duration: "",
      instructions: "",
      reminderEnabled: false,
      reminderFrequency: "daily",
      reminderTimes: ["09:00"],
      startDate: new Date().toISOString().split("T")[0],
    },
  ])
  const [additionalNotes, setAdditionalNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [medicationSuggestions, setMedicationSuggestions] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  const { toast } = useToast()

  // Sample medication database (in a real app, this would come from an API)
  const medicationDatabase = [
    "Acetaminophen",
    "Ibuprofen",
    "Amoxicillin",
    "Lisinopril",
    "Metformin",
    "Atorvastatin",
    "Levothyroxine",
    "Amlodipine",
    "Metoprolol",
    "Omeprazole",
    "Albuterol",
    "Gabapentin",
    "Losartan",
    "Hydrochlorothiazide",
    "Sertraline",
  ]

  // Search medications when search term changes
  useEffect(() => {
    if (searchTerm.length > 1) {
      const filteredMedications = medicationDatabase.filter((med) =>
        med.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setMedicationSuggestions(filteredMedications)
    } else {
      setMedicationSuggestions([])
    }
  }, [searchTerm])

  // Handle medication selection
  const handleSelectMedication = (index: number, name: string) => {
    const updatedMedications = [...medications]
    updatedMedications[index].name = name
    setMedications(updatedMedications)
    setSearchTerm("")
    setMedicationSuggestions([])
  }

  // Add a new medication
  const addMedication = () => {
    console.log("Adding new medication")
    setMedications([
      ...medications,
      {
        name: "",
        dosage: "",
        frequency: "",
        duration: "",
        instructions: "",
        reminderEnabled: false,
        reminderFrequency: "daily",
        reminderTimes: ["09:00"],
        startDate: new Date().toISOString().split("T")[0],
      },
    ])
  }

  // Remove a medication
  const removeMedication = (index: number) => {
    const updatedMedications = [...medications]
    updatedMedications.splice(index, 1)
    setMedications(updatedMedications)
  }

  // Update medication field
  const updateMedication = (index: number, field: keyof Medication, value: any) => {
    const updatedMedications = [...medications]
    updatedMedications[index][field] = value
    setMedications(updatedMedications)
  }

  // Add reminder time
  const addReminderTime = (index: number) => {
    const updatedMedications = [...medications]
    updatedMedications[index].reminderTimes.push("09:00")
    setMedications(updatedMedications)
  }

  // Remove reminder time
  const removeReminderTime = (medicationIndex: number, timeIndex: number) => {
    const updatedMedications = [...medications]
    updatedMedications[medicationIndex].reminderTimes.splice(timeIndex, 1)
    setMedications(updatedMedications)
  }

  // Update reminder time
  const updateReminderTime = (medicationIndex: number, timeIndex: number, time: string) => {
    const updatedMedications = [...medications]
    updatedMedications[medicationIndex].reminderTimes[timeIndex] = time
    setMedications(updatedMedications)
  }

  // Handle form submission
  const handleSubmit = async () => {
    console.log("Submitting prescription form...")

    try {
      // Validate form
      if (!diagnosis.trim()) {
        toast({
          title: "Validation Error",
          description: "Please enter a diagnosis",
          variant: "destructive",
        })
        return
      }

      if (medications.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please add at least one medication",
          variant: "destructive",
        })
        return
      }

      // Validate each medication
      for (let i = 0; i < medications.length; i++) {
        const med = medications[i]
        if (!med.name.trim() || !med.dosage.trim() || !med.frequency.trim() || !med.duration.trim()) {
          toast({
            title: "Validation Error",
            description: `Please complete all required fields for medication #${i + 1}`,
            variant: "destructive",
          })
          return
        }

        // Validate reminder times if enabled
        if (med.reminderEnabled && med.reminderTimes.length === 0) {
          toast({
            title: "Validation Error",
            description: `Please add at least one reminder time for medication #${i + 1}`,
            variant: "destructive",
          })
          return
        }
      }

      setIsSubmitting(true)
      console.log("Form validated, submitting to API...")

      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("Authentication token not found")
      }

      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/prescriptions`
      console.log("API URL:", apiUrl)

      const requestData = {
        appointmentId,
        patientId,
        diagnosis,
        medications,
        additionalNotes,
      }

      console.log("Sending prescription data:", requestData)

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestData),
      })

      console.log("API response status:", response.status)

      const responseData = await response.json()
      console.log("API response data:", responseData)

      if (!response.ok) {
        throw new Error(responseData.message || `Server error: ${response.status}`)
      }

      if (responseData.success) {
        toast({
          title: "Success",
          description: "Prescription created successfully",
        })

        // Reset form and close dialog
        setDiagnosis("")
        setMedications([
          {
            name: "",
            dosage: "",
            frequency: "",
            duration: "",
            instructions: "",
            reminderEnabled: false,
            reminderFrequency: "daily",
            reminderTimes: ["09:00"],
            startDate: new Date().toISOString().split("T")[0],
          },
        ])
        setAdditionalNotes("")

        if (onSuccess) {
          onSuccess()
        } else if (onClose) {
          onClose()
        }
      } else {
        throw new Error(responseData.message || "Failed to create prescription")
      }
    } catch (error) {
      console.error("Error creating prescription:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create prescription",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else if (onClose) {
      onClose()
    }
  }

  return (
    <div className="space-y-6">
      <ScrollArea className="max-h-[70vh] pr-4">
        <div className="space-y-6 py-4">
          {/* Diagnosis */}
          <div className="space-y-2">
            <Label htmlFor="diagnosis" className="text-base font-medium">
              Diagnosis
            </Label>
            <Textarea
              id="diagnosis"
              placeholder="Enter diagnosis"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <Separator />

          {/* Medications */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <Label className="text-base font-medium">Medications</Label>
              <Button
                type="button"
                onClick={addMedication}
                size="sm"
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4" /> Add Medicine
              </Button>
            </div>

            <div className="space-y-6">
              {medications.map((medication, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-blue-700">Medicine #{index + 1}</h4>
                    {medications.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeMedication(index)}
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Medication Name */}
                    <div className="space-y-2 relative">
                      <Label htmlFor={`med-name-${index}`}>Medication Name</Label>
                      <Input
                        id={`med-name-${index}`}
                        placeholder="Search medication"
                        value={medication.name}
                        onChange={(e) => {
                          updateMedication(index, "name", e.target.value)
                          setSearchTerm(e.target.value)
                        }}
                      />
                      {searchTerm && medicationSuggestions.length > 0 && (
                        <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg mt-1 max-h-40 overflow-y-auto">
                          {medicationSuggestions.map((med) => (
                            <div
                              key={med}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                              onClick={() => handleSelectMedication(index, med)}
                            >
                              {med}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Dosage */}
                    <div className="space-y-2">
                      <Label htmlFor={`med-dosage-${index}`}>Dosage</Label>
                      <Input
                        id={`med-dosage-${index}`}
                        placeholder="e.g., 500mg"
                        value={medication.dosage}
                        onChange={(e) => updateMedication(index, "dosage", e.target.value)}
                      />
                    </div>

                    {/* Frequency */}
                    <div className="space-y-2">
                      <Label htmlFor={`med-frequency-${index}`}>Frequency</Label>
                      <Select
                        value={medication.frequency}
                        onValueChange={(value) => updateMedication(index, "frequency", value)}
                      >
                        <SelectTrigger id={`med-frequency-${index}`}>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="once_daily">Once Daily</SelectItem>
                          <SelectItem value="twice_daily">Twice Daily</SelectItem>
                          <SelectItem value="thrice_daily">Three Times Daily</SelectItem>
                          <SelectItem value="four_times_daily">Four Times Daily</SelectItem>
                          <SelectItem value="every_morning">Every Morning</SelectItem>
                          <SelectItem value="every_night">Every Night</SelectItem>
                          <SelectItem value="as_needed">As Needed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Duration */}
                    <div className="space-y-2">
                      <Label htmlFor={`med-duration-${index}`}>Duration</Label>
                      <Input
                        id={`med-duration-${index}`}
                        placeholder="e.g., 7 days"
                        value={medication.duration}
                        onChange={(e) => updateMedication(index, "duration", e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="space-y-2">
                    <Label htmlFor={`med-instructions-${index}`}>Instructions</Label>
                    <Textarea
                      id={`med-instructions-${index}`}
                      placeholder="e.g., Take with food"
                      value={medication.instructions}
                      onChange={(e) => updateMedication(index, "instructions", e.target.value)}
                    />
                  </div>

                  {/* Medication Reminders */}
                  <div className="space-y-4 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Bell className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor={`med-reminder-${index}`} className="font-medium">
                          Enable Medication Reminders
                        </Label>
                      </div>
                      <Switch
                        id={`med-reminder-${index}`}
                        checked={medication.reminderEnabled}
                        onCheckedChange={(checked) => updateMedication(index, "reminderEnabled", checked)}
                      />
                    </div>

                    {medication.reminderEnabled && (
                      <div className="space-y-4 pl-6">
                        <div className="space-y-2">
                          <Label htmlFor={`med-reminder-freq-${index}`}>Reminder Frequency</Label>
                          <Select
                            value={medication.reminderFrequency}
                            onValueChange={(value) => updateMedication(index, "reminderFrequency", value)}
                          >
                            <SelectTrigger id={`med-reminder-freq-${index}`}>
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="twice_daily">Twice Daily</SelectItem>
                              <SelectItem value="thrice_daily">Three Times Daily</SelectItem>
                              <SelectItem value="once_weekly">Once Weekly</SelectItem>
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`med-start-date-${index}`}>Start Date</Label>
                            <Input
                              id={`med-start-date-${index}`}
                              type="date"
                              value={medication.startDate}
                              onChange={(e) => updateMedication(index, "startDate", e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`med-end-date-${index}`}>End Date (Optional)</Label>
                            <Input
                              id={`med-end-date-${index}`}
                              type="date"
                              value={medication.endDate || ""}
                              onChange={(e) => updateMedication(index, "endDate", e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>Reminder Times</Label>
                            <Button type="button" onClick={() => addReminderTime(index)} size="sm" variant="outline">
                              <Plus className="h-3 w-3 mr-1" /> Add Time
                            </Button>
                          </div>

                          <div className="space-y-2">
                            {medication.reminderTimes.map((time, timeIndex) => (
                              <div key={timeIndex} className="flex items-center gap-2">
                                <div className="flex-1">
                                  <Input
                                    type="time"
                                    value={time}
                                    onChange={(e) => updateReminderTime(index, timeIndex, e.target.value)}
                                  />
                                </div>
                                {medication.reminderTimes.length > 1 && (
                                  <Button
                                    type="button"
                                    onClick={() => removeReminderTime(index, timeIndex)}
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Another Medicine Button */}
            <Button
              type="button"
              onClick={addMedication}
              className="w-full mt-4 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="h-5 w-5" /> Add Another Medicine
            </Button>
          </div>

          <Separator />

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="additional-notes" className="text-base font-medium">
              Additional Notes
            </Label>
            <Textarea
              id="additional-notes"
              placeholder="Enter any additional notes or instructions"
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        </div>
      </ScrollArea>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              <span>Saving...</span>
            </div>
          ) : (
            "Save Prescription"
          )}
        </Button>
      </div>
    </div>
  )
}

