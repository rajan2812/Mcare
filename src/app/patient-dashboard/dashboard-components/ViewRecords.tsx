"use client"
import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Download, Search } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface Record {
  id: string
  date: string
  type: string
  description: string
  fileUrl: string
}

// Mock data for demonstration
const mockRecords: Record[] = [
  {
    id: "1",
    date: "2023-05-15",
    type: "Blood Test",
    description: "Complete Blood Count",
    fileUrl: "/mock-files/blood-test.pdf",
  },
  {
    id: "2",
    date: "2023-06-01",
    type: "X-Ray",
    description: "Chest X-Ray",
    fileUrl: "/mock-files/chest-xray.pdf",
  },
  {
    id: "3",
    date: "2023-06-20",
    type: "MRI",
    description: "Brain MRI",
    fileUrl: "/mock-files/brain-mri.pdf",
  },
]

export function ViewRecords() {
  const [records, setRecords] = useState<Record[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRecords = async () => {
      setIsLoading(true)
      setError(null)
      try {
        // Simulating an API call
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // In a real application, you would fetch data from an API here
        // const response = await fetch("/api/records")
        // if (!response.ok) throw new Error("Failed to fetch records")
        // const data = await response.json()

        // For now, we'll use the mock data
        setRecords(mockRecords)
      } catch (err) {
        console.error("Error fetching records:", err)
        setError("Failed to load records. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecords()
  }, [])

  const filteredRecords = records.filter(
    (record) =>
      record.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleDownload = (fileUrl: string) => {
    // In a real application, this would initiate a file download
    console.log("Downloading file:", fileUrl)
    alert(`Downloading file: ${fileUrl}`)
  }

  if (isLoading) {
    return <div className="text-center py-4">Loading records...</div>
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          placeholder="Search records..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8"
        />
      </div>
      {filteredRecords.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.map((record) => (
              <TableRow key={record.id}>
                <TableCell>{record.date}</TableCell>
                <TableCell>{record.type}</TableCell>
                <TableCell>{record.description}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => handleDownload(record.fileUrl)}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-4 text-gray-500">No records found</div>
      )}
    </div>
  )
}

