"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  sender: "patient" | "doctor"
  content: string
  timestamp: string
}

interface Doctor {
  id: string
  name: string
  avatarUrl: string
  lastSeen?: string
  status?: "online" | "offline"
}

interface Appointment {
  id: string
  doctorId: string
  doctorName: string
  date: string
  time: string
  specialty?: string
}

interface ChatSectionProps {
  patientId: string
}

export function ChatSection({ patientId }: ChatSectionProps) {
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [messages, setMessages] = useState<{ [doctorId: string]: Message[] }>({})
  const [newMessage, setNewMessage] = useState("")
  const [appointments, setAppointments] = useState<Appointment[]>([])

  useEffect(() => {
    // In a real application, you would fetch this data from an API
    const mockAppointments: Appointment[] = [
      {
        id: "1",
        doctorId: "1",
        doctorName: "Dr. Sarah Smith",
        date: "2024-01-20",
        time: "10:00 AM",
        specialty: "Cardiologist",
      },
      {
        id: "2",
        doctorId: "2",
        doctorName: "Dr. John Doe",
        date: "2024-01-22",
        time: "2:30 PM",
        specialty: "Dermatologist",
      },
    ]
    setAppointments(mockAppointments)

    // Load messages from localStorage
    const storedMessages = localStorage.getItem(`chat_messages_${patientId}`)
    if (storedMessages) {
      setMessages(JSON.parse(storedMessages))
    }
  }, [patientId])

  useEffect(() => {
    // Save messages to localStorage whenever they change
    localStorage.setItem(`chat_messages_${patientId}`, JSON.stringify(messages))
  }, [messages, patientId])

  const handleSendMessage = () => {
    if (newMessage.trim() && selectedDoctor) {
      const newMsg: Message = {
        id: Date.now().toString(),
        sender: "patient",
        content: newMessage.trim(),
        timestamp: new Date().toISOString(),
      }
      setMessages((prevMessages) => ({
        ...prevMessages,
        [selectedDoctor.id]: [...(prevMessages[selectedDoctor.id] || []), newMsg],
      }))
      setNewMessage("")

      // Simulate doctor's response
      setTimeout(() => {
        const doctorReply: Message = {
          id: (Date.now() + 1).toString(),
          sender: "doctor",
          content: `This is an automated reply from ${selectedDoctor.name}. In a real application, the doctor would respond to your message.`,
          timestamp: new Date().toISOString(),
        }
        setMessages((prevMessages) => ({
          ...prevMessages,
          [selectedDoctor.id]: [...(prevMessages[selectedDoctor.id] || []), doctorReply],
        }))
      }, 1000)
    }
  }

  return (
    <div className="flex h-full bg-white rounded-lg overflow-hidden border">
      {/* Doctors List Sidebar */}
      <div className="w-80 border-r bg-gray-50/50">
        <div className="p-4 border-b bg-white">
          <h3 className="font-semibold text-lg">Your Doctors</h3>
          <p className="text-sm text-muted-foreground">Chat with your healthcare providers</p>
        </div>
        <ScrollArea className="h-[calc(100%-5rem)]">
          <div className="p-2">
            {appointments.map((appointment) => (
              <button
                key={appointment.doctorId}
                onClick={() =>
                  setSelectedDoctor({
                    id: appointment.doctorId,
                    name: appointment.doctorName,
                    avatarUrl: "/placeholder.svg",
                    status: appointment.doctorId === "1" ? "online" : "offline",
                    lastSeen: "5m ago",
                  })
                }
                className={cn(
                  "w-full text-left p-3 rounded-lg transition-colors",
                  "hover:bg-gray-100",
                  selectedDoctor?.id === appointment.doctorId ? "bg-gray-100" : "bg-transparent",
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src="/placeholder.svg" alt={appointment.doctorName} />
                      <AvatarFallback>{appointment.doctorName[0]}</AvatarFallback>
                    </Avatar>
                    <span
                      className={cn(
                        "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white",
                        appointment.doctorId === "1" ? "bg-green-500" : "bg-gray-400",
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{appointment.doctorName}</div>
                    <div className="text-xs text-muted-foreground">{appointment.specialty}</div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {appointment.date} at {appointment.time}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedDoctor ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-white">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedDoctor.avatarUrl} alt={selectedDoctor.name} />
                  <AvatarFallback>{selectedDoctor.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{selectedDoctor.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedDoctor.status === "online" ? (
                      <span className="text-green-500">● Online</span>
                    ) : (
                      <span>Last seen {selectedDoctor.lastSeen}</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {(messages[selectedDoctor.id] || []).map((message) => (
                  <div
                    key={message.id}
                    className={cn("flex", message.sender === "patient" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[70%] rounded-lg px-4 py-2",
                        message.sender === "patient"
                          ? "bg-primary text-primary-foreground"
                          : "bg-gray-100 text-gray-900",
                      )}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs mt-1 opacity-70">
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t bg-white">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSendMessage()
                }}
                className="flex items-center gap-2"
              >
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1"
                />
                <Button type="submit" size="icon">
                  <Send className="h-4 w-4" />
                  <span className="sr-only">Send message</span>
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <h3 className="font-semibold mb-2">Select a conversation</h3>
              <p className="text-sm">Choose a doctor from the list to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

