import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChatSection } from "../components/ChatSection"

export default function DoctorChatPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Patient Chats</CardTitle>
        </CardHeader>
        <CardContent>
          <ChatSection />
        </CardContent>
      </Card>
    </div>
  )
}

