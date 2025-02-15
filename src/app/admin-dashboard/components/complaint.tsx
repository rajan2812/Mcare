"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function ComplaintManagement() {
  const complaints = [
    {
      id: 1,
      title: "Appointment Delay Complaint",
      description: "Doctor was 30 minutes late for scheduled appointment. Patient requesting partial refund.",
      filer: "John Doe",
      date: "2024-02-12",
      status: "New",
    },
    {
      id: 2,
      title: "Technical Issue Report",
      description: "Video consultation platform experiencing connection issues during peak hours.",
      filer: "Dr. Sarah Smith",
      date: "2024-02-11",
      status: "In Progress",
    },
    {
      id: 3,
      title: "Medication Mix-up",
      description: "Patient received incorrect medication. Urgent review required.",
      filer: "Emma Johnson",
      date: "2024-02-10",
      status: "Urgent",
    },
  ]

  return (
    <div className="grid gap-6">
      {complaints.map((complaint) => (
        <Card
          key={complaint.id}
          className="hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 hover:bg-gradient-to-br hover:from-[#4169E1]/5 hover:to-[#9370DB]/5"
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">{complaint.title}</CardTitle>
                <CardDescription className="text-sm">
                  Filed by: {complaint.filer} - {complaint.date}
                </CardDescription>
              </div>
              <Badge
                variant={
                  complaint.status === "New"
                    ? "default"
                    : complaint.status === "In Progress"
                      ? "secondary"
                      : "destructive"
                }
                className="rounded-full px-2 py-1 text-xs"
              >
                {complaint.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{complaint.description}</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="rounded-full bg-gradient-to-r from-[#4169E1] to-[#9370DB] text-white hover:opacity-90"
              >
                Review
              </Button>
              <Button size="sm" variant="outline" className="rounded-full">
                Mark Resolved
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

