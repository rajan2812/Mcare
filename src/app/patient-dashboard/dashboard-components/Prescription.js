import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, Pill } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

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
  const [prescriptions, setPrescriptions] = useState([])
  const [activeMedicationCount, setActiveMedicationCount] = useState(3)

  useEffect(() => {
    // In a real application, you would fetch prescriptions from an API
    // For now, we'll use mock data
    const mockPrescriptions = [
      {
        id: "1",
        doctorName: "Dr. Sarah Smith",
        medication: "Amoxicillin",
        dosage: "500mg",
        frequency: "3 times a day",
        duration: "7 days",
        date: "2024-01-18",
        notes: "Take with food. Complete the full course.",
        isActive: true,
      },
      {
        id: "2",
        doctorName: "Dr. John Doe",
        medication: "Lisinopril",
        dosage: "10mg",
        frequency: "Once daily",
        duration: "30 days",
        date: "2024-01-20",
        notes: "Take in the morning. Monitor blood pressure regularly.",
        isActive: true,
      },
      {
        id: "3",
        doctorName: "Dr. Emily Brown",
        medication: "Ibuprofen",
        dosage: "400mg",
        frequency: "As needed",
        duration: "5 days",
        date: "2024-01-15",
        notes: "Take for pain relief. Do not exceed 3 doses in 24 hours.",
        isActive: true,
      },
    ]

    setPrescriptions(mockPrescriptions)
    setActiveMedicationCount(mockPrescriptions.filter((p) => p.isActive).length)
  }, [])

  return (
    <div className="space-y-4">
      <MedicationStatusCard count={activeMedicationCount} />

      {prescriptions.length > 0 ? (
        <div className="space-y-4">
          {prescriptions.map((prescription) => (
            <motion.div
              key={prescription.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "p-4 border rounded-md",
                prescription.isActive ? "border-green-200 bg-green-50" : "border-gray-200",
              )}
            >
              <h3 className="font-semibold">{prescription.medication}</h3>
              <p className="text-sm text-gray-600">Prescribed by: {prescription.doctorName}</p>
              <p className="text-sm">Dosage: {prescription.dosage}</p>
              <p className="text-sm">Frequency: {prescription.frequency}</p>
              <p className="text-sm">Duration: {prescription.duration}</p>
              <p className="text-sm text-gray-500 mt-2">Prescribed on: {prescription.date}</p>
              {prescription.notes && (
                <div className="mt-2 p-2 bg-yellow-50 rounded-md flex items-start">
                  <AlertCircle className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-700">{prescription.notes}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500">No recent prescriptions</p>
      )}
      <Button className="w-full mt-4">View All Prescriptions</Button>
    </div>
  )
}

