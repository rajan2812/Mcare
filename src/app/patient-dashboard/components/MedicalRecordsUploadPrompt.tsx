"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FileUp } from "lucide-react"
import Link from "next/link"

export function MedicalRecordsUploadPrompt() {
  return (
    <Alert className="border-2 border-blue-500 bg-blue-50 mb-6">
      <FileUp className="h-5 w-5 text-blue-500" />
      <AlertTitle className="text-lg font-bold text-blue-700">Upload Your Medical Records</AlertTitle>
      <AlertDescription className="text-blue-600 mt-2">
        Please upload your previous medical records and files for better consultation with your doctor.
      </AlertDescription>
      <div className="mt-4">
        <Link href="/patient-dashboard/records">
          <Button className="bg-blue-500 hover:bg-blue-600 text-white">Upload Medical Records</Button>
        </Link>
      </div>
    </Alert>
  )
}

