import { Sidebar, Header } from "../dashboard-components/layout-components"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText } from "lucide-react"
import type React from "react" // Added import for React

export default function RecordsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  Medical Records
                </CardTitle>
              </CardHeader>
              <CardContent>{children}</CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

