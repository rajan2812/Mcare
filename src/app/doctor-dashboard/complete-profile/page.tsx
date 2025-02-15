"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function CompleteProfilePage() {
  const [profile, setProfile] = useState({
    specializations: [] as string[],
    qualifications: "",
    experience: "",
    licenseNumber: "",
    about: "",
  })
  const [files, setFiles] = useState<File[]>([])
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const doctorInfo = JSON.parse(localStorage.getItem("user") || "{}")
    if (doctorInfo.isProfileCompleted) {
      router.push("/doctor-dashboard")
    }
  }, [router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setProfile((prev) => ({ ...prev, [name]: value }))
  }

  const handleSpecializationChange = (specialization: string) => {
    setProfile((prev) => {
      const updatedSpecializations = prev.specializations.includes(specialization)
        ? prev.specializations.filter((s) => s !== specialization)
        : [...prev.specializations, specialization]
      return { ...prev, specializations: updatedSpecializations }
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (files.length === 0) {
      toast({
        title: "Error",
        description: "Please upload at least one medical document.",
        variant: "destructive",
      })
      return
    }

    if (profile.specializations.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one specialization.",
        variant: "destructive",
      })
      return
    }

    try {
      const token = localStorage.getItem("token")
      const response = await fetch("http://localhost:4000/api/user/complete-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profile),
      })

      if (!response.ok) {
        throw new Error("Failed to complete profile")
      }

      const data = await response.json()

      if (data.success) {
        const updatedUser = { ...JSON.parse(localStorage.getItem("user") || "{}"), isProfileCompleted: true }
        localStorage.setItem("user", JSON.stringify(updatedUser))

        toast({
          title: "Profile Completed",
          description: "Your profile has been successfully updated.",
        })

        router.push("/doctor-dashboard")
      } else {
        throw new Error(data.message || "Failed to complete profile")
      }
    } catch (error) {
      console.error("Error completing profile:", error)
      toast({
        title: "Error",
        description: "Failed to complete profile. Please try again.",
        variant: "destructive",
      })
    }
  }

  const specializations = [
    "General Physician (GP)",
    "Cardiologist",
    "Endocrinologist",
    "Gastroenterologist",
    "Nephrologist",
    "Pulmonologist",
    "Hematologist",
    "General Surgeon",
    "Orthopedic Surgeon",
    "Neurosurgeon",
    "Plastic Surgeon",
    "Gynecologist & Obstetrician (OB-GYN)",
    "Pediatrician",
    "Dermatologist",
    "Ophthalmologist",
    "ENT Specialist (Otorhinolaryngologist)",
    "Neurologist",
    "Psychiatrist",
    "Urologist",
    "Oncologist",
    "Rheumatologist",
    "Radiologist",
    "Anesthesiologist",
  ]

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Complete Your Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="specializations" className="text-base">
                Specializations (Select all that apply)
              </Label>
              <ScrollArea className="h-72 border rounded-md p-4">
                {specializations.map((spec) => (
                  <div key={spec} className="flex items-center space-x-2 py-1">
                    <Checkbox
                      id={spec}
                      checked={profile.specializations.includes(spec)}
                      onCheckedChange={() => handleSpecializationChange(spec)}
                    />
                    <Label htmlFor={spec}>{spec}</Label>
                  </div>
                ))}
              </ScrollArea>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qualifications" className="text-base">
                Qualifications
              </Label>
              <Input
                id="qualifications"
                name="qualifications"
                value={profile.qualifications}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="experience" className="text-base">
                Years of Experience
              </Label>
              <Input
                id="experience"
                name="experience"
                type="number"
                value={profile.experience}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="licenseNumber" className="text-base">
                Medical License Number
              </Label>
              <Input
                id="licenseNumber"
                name="licenseNumber"
                value={profile.licenseNumber}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="about" className="text-base">
                About
              </Label>
              <Textarea
                id="about"
                name="about"
                value={profile.about}
                onChange={handleInputChange}
                required
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="files" className="text-base">
                Upload Medical Documents (Certificates, Licenses, etc.)
              </Label>
              <Input id="files" type="file" onChange={handleFileChange} multiple required />
              {files.length > 0 && (
                <ul className="mt-2 text-sm text-gray-500">
                  {files.map((file, index) => (
                    <li key={index}>{file.name}</li>
                  ))}
                </ul>
              )}
            </div>
            <Button type="submit" className="w-full">
              Complete Profile
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

