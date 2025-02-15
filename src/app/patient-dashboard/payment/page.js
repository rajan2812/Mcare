"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar, Header } from "../dashboard-components/layout-components"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"

export default function PaymentPage() {
  const [appointmentDetails, setAppointmentDetails] = useState(null)
  const [cardNumber, setCardNumber] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [cvv, setCvv] = useState("")
  const [nameOnCard, setNameOnCard] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const lastAppointment = localStorage.getItem("lastAppointment")
    if (lastAppointment) {
      setAppointmentDetails(JSON.parse(lastAppointment))
    }
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    // Here you would typically process the payment
    // For this example, we'll just show a success message
    toast({
      title: "Payment Successful",
      description: "Your payment has been processed successfully.",
    })
    // Clear the stored appointment details
    localStorage.removeItem("lastAppointment")
    // Redirect to dashboard after a short delay
    setTimeout(() => router.push("/patient-dashboard/dashboard"), 2000)
  }

  if (!appointmentDetails) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Payment for Telemedicine Appointment</CardTitle>
                <CardDescription>
                  Please enter your payment details to confirm your appointment with {appointmentDetails.doctor} on{" "}
                  {new Date(appointmentDetails.date).toLocaleDateString()} at {appointmentDetails.time}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <Input
                      id="cardNumber"
                      placeholder="1234 5678 9012 3456"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiryDate">Expiry Date</Label>
                      <Input
                        id="expiryDate"
                        placeholder="MM/YY"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvv">CVV</Label>
                      <Input id="cvv" placeholder="123" value={cvv} onChange={(e) => setCvv(e.target.value)} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nameOnCard">Name on Card</Label>
                    <Input
                      id="nameOnCard"
                      placeholder="John Doe"
                      value={nameOnCard}
                      onChange={(e) => setNameOnCard(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Pay Now
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  )
}

