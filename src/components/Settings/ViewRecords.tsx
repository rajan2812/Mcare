import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { FileText, Download, Search } from "lucide-react"

interface Record {
  id: string
  date: string
  type: string
  description: string
  fileUrl: string
}

export function ViewRecords() {
  const [records, setRecords] = useState<Record[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRecords = async () => {
      setIsLoading(true)
      try {
        const response = await fetch("/api/records")
        if (!response.ok) {
          throw new Error("Failed to fetch records")
        }
        const data = await response.json()
        setRecords(data)
      } catch (err) {
        setError("Failed to load records. Please try again later.")
        console.error("Error fetching records:", err)
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
    // Implement the download functionality here
    console.log("Downloading file:", fileUrl)
  }

  if (isLoading) {
    return <div>Loading records...</div>
  }

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-500" />
          View Records
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
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
        </div>
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
        {filteredRecords.length === 0 && <div className="text-center py-4 text-gray-500">No records found</div>}
      </CardContent>
    </Card>
  )
}

