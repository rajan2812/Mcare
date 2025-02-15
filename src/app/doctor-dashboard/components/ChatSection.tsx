"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type Message = {
  id: string
  sender: "doctor" | "patient"
  content: string
  timestamp: Date
}

type Patient = {
  id: string
  name: string
  avatar: string
}

type Prescription = {
  id: string
  patientId: string
  content: string
  timestamp: Date
}

// Mock data
const mockPatients: Patient[] = [
  { id: "1", name: "John Doe", avatar: "/placeholder.svg" },
  { id: "2", name: "Jane Smith", avatar: "/placeholder.svg" },
  { id: "3", name: "Alice Johnson", avatar: "/placeholder.svg" },
]

const mockChats: Record<string, Message[]> = {
  "1": [
    {
      id: "1",
      sender: "patient",
      content: "Hello doctor, I have a question about my medication.",
      timestamp: new Date(),
    },
    { id: "2", sender: "doctor", content: "Of course, what would you like to know?", timestamp: new Date() },
  ],
  "2": [
    {
      id: "1",
      sender: "patient",
      content: "I'm experiencing some side effects from the new prescription.",
      timestamp: new Date(),
    },
  ],
  "3": [
    { id: "1", sender: "doctor", content: "How are you feeling after our last appointment?", timestamp: new Date() },
  ],
}

export function ChatSection() {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [prescription, setPrescription] = useState("")

  const selectPatient = (patient: Patient) => {
    setSelectedPatient(patient)
    setMessages(mockChats[patient.id] || [])
  }

  const sendMessage = () => {
    if (newMessage.trim() && selectedPatient) {
      const newMsg: Message = {
        id: Date.now().toString(),
        sender: "doctor",
        content: newMessage,
        timestamp: new Date(),
      }
      setMessages([...messages, newMsg])
      setNewMessage("")
      // In a real app, you'd send this message to your backend here
    }
  }

  const sendPrescription = () => {
    if (prescription.trim() && selectedPatient) {
      const newPrescription: Prescription = {
        id: Date.now().toString(),
        patientId: selectedPatient.id,
        content: prescription,
        timestamp: new Date(),
      }
      // In a real app, you'd send this prescription to your backend here
      // and it would be reflected on the patient's dashboard
      alert(`Prescription sent to ${selectedPatient.name}: ${prescription}`)
      setPrescription("")
    }
  }

  return (
    <div className="flex h-[500px]">
      <div className="w-1/4 border-r">
        <ScrollArea className="h-full">
          {mockPatients.map((patient) => (
            <Button
              key={patient.id}
              variant="ghost"
              className="w-full justify-start"
              onClick={() => selectPatient(patient)}
            >
              <Avatar className="h-8 w-8 mr-2">
                <AvatarImage src={patient.avatar} alt={patient.name} />
                <AvatarFallback>{patient.name[0]}</AvatarFallback>
              </Avatar>
              {patient.name}
            </Button>
          ))}
        </ScrollArea>
      </div>
      <div className="flex-1 flex flex-col">
        {selectedPatient ? (
          <>
            <div className="p-4 border-b">
              <h3 className="font-semibold">{selectedPatient.name}</h3>
            </div>
            <ScrollArea className="flex-1 p-4">
              {messages.map((message) => (
                <div key={message.id} className={`mb-4 ${message.sender === "doctor" ? "text-right" : "text-left"}`}>
                  <div
                    className={`inline-block p-2 rounded-lg ${
                      message.sender === "doctor" ? "bg-blue-500 text-white" : "bg-gray-200"
                    }`}
                  >
                    {message.content}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{message.timestamp.toLocaleTimeString()}</div>
                </div>
              ))}
            </ScrollArea>
            <div className="p-4 border-t">
              <div className="flex mb-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 mr-2"
                />
                <Button onClick={sendMessage}>Send</Button>
              </div>
              <div className="flex">
                <Textarea
                  value={prescription}
                  onChange={(e) => setPrescription(e.target.value)}
                  placeholder="Write a prescription..."
                  className="flex-1 mr-2"
                />
                <Button onClick={sendPrescription}>Send Prescription</Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a patient to start chatting
          </div>
        )}
      </div>
    </div>
  )
}

