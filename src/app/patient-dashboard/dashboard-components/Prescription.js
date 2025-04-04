"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, Pill, Printer } from "lucide-react"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"

const MotionCard = motion(Card)

const MedicationStatusCard = ({ count }) => (
  <div className="bg-white rounded-lg p-4 shadow-sm border mb-4">
    <div className="flex items-center gap-4">
      <div className="bg-green-500 rounded-full p-3">
        <Pill className="h-6 w-6 text-white" />
      </div>
      <div>
        <h3 className="text-gray-600 text-sm">Active Medications</h3>
        <p className="text-2xl font-bold">{count}</p>
      </div>
    </div>
  </div>
)

export function Prescription({ patientId }) {
  const { toast } = useToast()
  const [prescriptions, setPrescriptions] = useState([])
  const [activeMedicationCount, setActiveMedicationCount] = useState(3)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchPrescriptions = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem("token")
      const user = JSON.parse(localStorage.getItem("user") || "{}")

      if (!token || !user.id) {
        throw new Error("Authentication required")
      }

      console.log("Fetching prescriptions for patient ID:", user.id)

      const response = await fetch(`http://localhost:4000/api/patients/${user.id}/prescriptions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to fetch prescriptions")
      }

      const data = await response.json()
      console.log("Prescriptions data received:", data)

      if (data.success && data.data && data.data.prescriptions) {
        setPrescriptions(data.data.prescriptions)
      } else {
        setPrescriptions([])
      }
    } catch (error) {
      console.error("Error fetching prescriptions:", error)
      setError(error.message || "Failed to load prescriptions")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPrescriptions()
  }, [])

  const handlePrintPrescription = (prescription) => {
    // Create a printable version of the prescription
    const printWindow = window.open("", "_blank")

    if (!printWindow) {
      toast({
        title: "Error",
        description: "Please allow pop-ups to print prescriptions",
        variant: "destructive",
      })
      return
    }

    const doctorName = prescription.doctorId
      ? `${prescription.doctorId.firstName} ${prescription.doctorId.lastName}`
      : "Your Doctor"

    const specialization = prescription.doctorId?.specializations?.join(", ") || ""

    printWindow.document.write(`
      <html>
        <head>
          <title>Prescription</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
            .prescription-details { margin-top: 20px; }
            .medication { margin-bottom: 15px; padding: 10px; border: 1px solid #eee; border-radius: 5px; }
            .footer { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Medical Prescription</h1>
              <p>Date: ${new Date(prescription.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <h2>Dr. ${doctorName}</h2>
              <p>${specialization}</p>
            </div>
          </div>
          
          <div class="prescription-details">
            <h3>Diagnosis</h3>
            <p>${prescription.diagnosis}</p>
            
            <h3>Medications</h3>
            ${prescription.medications
              .map(
                (med) => `
              <div class="medication">
                <p><strong>${med.name}</strong> - ${med.dosage}</p>
                <p>Frequency: ${med.frequency}</p>
                <p>Duration: ${med.duration}</p>
                ${med.instructions ? `<p>Instructions: ${med.instructions}</p>` : ""}
              </div>
            `,
              )
              .join("")}
            
            ${
              prescription.additionalNotes
                ? `
              <h3>Additional Notes</h3>
              <p>${prescription.additionalNotes}</p>
            `
                : ""
            }
          </div>
          
          <div class="footer">
            <p>Doctor's Signature: ___________________</p>
          </div>
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 500)
  }

  const renderPrescriptions = () => {
    if (prescriptions.length === 0) {
      return (
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No prescriptions found</h3>
          <p className="text-gray-500">You don't have any prescriptions yet.</p>
        </div>
      )
    }

    return prescriptions.map((prescription) => (
      <Card key={prescription._id} className="mb-4">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Prescription</CardTitle>
              <CardDescription>{new Date(prescription.createdAt).toLocaleDateString()}</CardDescription>
            </div>
            <Badge variant={prescription.status === "active" ? "success" : "secondary"}>{prescription.status}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm text-gray-500">Diagnosis</h4>
              <p>{prescription.diagnosis}</p>
            </div>

            <div>
              <h4 className="font-medium text-sm text-gray-500 mb-2">Medications</h4>
              <div className="space-y-3">
                {prescription.medications.map((medication, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-md">
                    <div className="flex justify-between">
                      <div className="font-medium">{medication.name}</div>
                      <div>{medication.dosage}</div>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {medication.frequency} · {medication.duration}
                    </div>
                    {medication.instructions && (
                      <div className="text-sm mt-2 border-t pt-2">
                        <span className="font-medium">Instructions: </span>
                        {medication.instructions}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {prescription.additionalNotes && (
              <div>
                <h4 className="font-medium text-sm text-gray-500">Additional Notes</h4>
                <p>{prescription.additionalNotes}</p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full" onClick={() => handlePrintPrescription(prescription)}>
            <Printer className="w-4 h-4 mr-2" />
            Print Prescription
          </Button>
        </CardFooter>
      </Card>
    ))
  }

  return (
    <div className="space-y-4">
      <MedicationStatusCard count={activeMedicationCount} />

      {isLoading ? (
        <p>Loading prescriptions...</p>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        renderPrescriptions()
      )}
      <Button className="w-full mt-4">View All Prescriptions</Button>
    </div>
  )
}

