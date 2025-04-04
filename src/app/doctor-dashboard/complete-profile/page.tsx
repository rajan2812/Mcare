"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Upload } from "lucide-react"

const LICENSE_FORMATS = {
  NMC: /^NMC-\d{4}-\d{6}$/,
  SMC_NEW: /^[A-Z]{2,4}\/\d{6}\/\d{4}$/,
  SMC_OLD: /^[A-Z]{2,4}\/R\/\d{5}$/,
}

const LICENSE_FORMAT_EXAMPLES = {
  NMC: "NMC-2023-567890",
  SMC_NEW: "MMC/123456/2022",
  SMC_OLD: "DMC/R/09876",
}

export default function CompleteProfilePage() {
  const router = useRouter()
  const { toast } = useToast() // Updated useToast hook

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}")
    console.log("Complete profile - Current user data:", user)

    // Convert to boolean to ensure consistent type
    const isProfileCompleted = Boolean(user.isProfileCompleted)

    if (isProfileCompleted) {
      console.log("Profile is already completed, redirecting to dashboard")
      router.push("/doctor-dashboard")
    } else {
      setVerificationStatus(user.verificationStatus || null)
      if (user.profile) {
        setProfile(user.profile)
      }
    }
  }, [router])
  const [profile, setProfile] = useState({
    specializations: [] as string[],
    qualifications: "",
    experience: "",
    licenseNumber: "",
    about: "",
    clinicAddress: {
      street: "",
      city: "",
      state: "",
      pincode: "",
    },
  })
  const [files, setFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<"pending" | "approved" | "rejected" | null>(null)

  const [documents, setDocuments] = useState({
    degreeCertificate: null as File | null,
    medicalRegistration: null as File | null,
    practiceProof: null as File | null,
  })

  const [documentErrors, setDocumentErrors] = useState({
    degreeCertificate: "",
    medicalRegistration: "",
    practiceProof: "",
  })

  const [licenseError, setLicenseError] = useState("")

  const validateLicenseNumber = (license: string) => {
    if (!license) return false
    return Object.values(LICENSE_FORMATS).some((format) => format.test(license))
  }

  const handleLicenseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const license = e.target.value
    setProfile((prev) => ({ ...prev, licenseNumber: license }))

    if (license && !validateLicenseNumber(license)) {
      setLicenseError(
        "Invalid license number format. Please use one of these formats:\n" +
          "• NMC Format: NMC-YYYY-XXXXXX (e.g., NMC-2023-567890)\n" +
          "• SMC Format: XXX/XXXXXX/YYYY (e.g., MMC/123456/2022)\n" +
          "• Old SMC Format: XXX/R/XXXXX (e.g., DMC/R/09876)",
      )
    } else {
      setLicenseError("")
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    if (name.startsWith("clinicAddress.")) {
      const addressField = name.split(".")[1]
      setProfile((prev) => ({
        ...prev,
        clinicAddress: {
          ...prev.clinicAddress,
          [addressField]: value,
        },
      }))
      return
    }

    // Prevent negative numbers for experience field
    if (name === "experience" && Number(value) < 0) {
      return
    }

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, documentType: keyof typeof documents) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ["application/pdf", "image/jpeg", "image/png"]
      if (!allowedTypes.includes(file.type)) {
        setDocumentErrors((prev) => ({
          ...prev,
          [documentType]: "Only PDF, JPG, and PNG files are allowed",
        }))
        return
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setDocumentErrors((prev) => ({
          ...prev,
          [documentType]: "File size must be less than 10MB",
        }))
        return
      }

      setDocuments((prev) => ({
        ...prev,
        [documentType]: file,
      }))
      setDocumentErrors((prev) => ({
        ...prev,
        [documentType]: "",
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate license number format
    if (!validateLicenseNumber(profile.licenseNumber)) {
      toast({
        title: "Invalid License Number",
        description: "Please provide a valid license number in the correct format.",
        variant: "destructive",
      })
      return
    }

    // Validate clinic address - ensure all fields are filled and trimmed
    const clinicAddress = {
      street: profile.clinicAddress.street?.trim(),
      city: profile.clinicAddress.city?.trim(),
      state: profile.clinicAddress.state?.trim(),
      pincode: profile.clinicAddress.pincode?.trim(),
    }

    if (!clinicAddress.street || !clinicAddress.city || !clinicAddress.state || !clinicAddress.pincode) {
      toast({
        title: "Missing Address Information",
        description: "Please fill in all clinic address fields.",
        variant: "destructive",
      })
      return
    }

    // Validate pincode format
    if (!/^\d{6}$/.test(clinicAddress.pincode)) {
      toast({
        title: "Invalid Pincode",
        description: "Please enter a valid 6-digit pincode.",
        variant: "destructive",
      })
      return
    }

    // Validate required documents
    const missingDocuments = []
    if (!documents.degreeCertificate) missingDocuments.push("Degree Certificate")
    if (!documents.medicalRegistration) missingDocuments.push("Medical Registration Certificate")
    if (!documents.practiceProof) missingDocuments.push("Hospital Affiliation/Practice Proof")

    if (missingDocuments.length > 0) {
      toast({
        title: "Missing Documents",
        description: `Please upload the following required documents: ${missingDocuments.join(", ")}`,
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const formData = new FormData()

      // Create a complete profile object with validated clinic address
      const profileData = {
        ...profile,
        clinicAddress, // Use the validated and trimmed address
      }

      formData.append("profile", JSON.stringify(profileData))

      // Append documents with their types
      const documentTypes: string[] = []

      if (documents.degreeCertificate) {
        formData.append("documents", documents.degreeCertificate)
        documentTypes.push("degreeCertificate")
      }
      if (documents.medicalRegistration) {
        formData.append("documents", documents.medicalRegistration)
        documentTypes.push("medicalRegistration")
      }
      if (documents.practiceProof) {
        formData.append("documents", documents.practiceProof)
        documentTypes.push("practiceProof")
      }

      formData.append("documentTypes", JSON.stringify(documentTypes))

      const token = localStorage.getItem("token")
      const response = await fetch("http://localhost:4000/api/user/complete-profile", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to complete profile")
      }

      if (data.success) {
        const currentUser = JSON.parse(localStorage.getItem("user") || "{}")
        const updatedUser = {
          ...currentUser,
          ...data.user,
        }
        localStorage.setItem("user", JSON.stringify(updatedUser))

        toast({
          title: "Profile Submitted Successfully",
          description: `Hello Dr. ${updatedUser.firstName}, your documents are under verification process. We will notify you once the verification is complete.`,
        })

        router.push("/doctor-dashboard")
      }
    } catch (error) {
      console.error("Error completing profile:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to complete profile. Please try again."

      // Check if error message contains license number already registered
      if (errorMessage.includes("license number is already registered")) {
        setLicenseError(
          "This license number is already registered with another doctor. Please provide a different license number.",
        )
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } finally {
      setIsSubmitting(false)
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
          <CardDescription className="text-center">
            Please provide your professional details for verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          {verificationStatus === "rejected" && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Profile Verification Failed</AlertTitle>
              <AlertDescription>
                Your profile verification was rejected. Please update your information and documents, then resubmit.
              </AlertDescription>
            </Alert>
          )}

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
                min="0"
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
                onChange={handleLicenseChange}
                placeholder="Enter your license number (e.g., NMC-2023-567890)"
                required
                className={licenseError ? "border-red-500" : ""}
              />
              {licenseError && <div className="text-sm text-red-500 whitespace-pre-line mt-1">{licenseError}</div>}
              <div className="mt-2 text-sm text-muted-foreground">
                <p className="font-medium">Accepted formats:</p>
                <ul className="list-disc list-inside space-y-1 mt-1">
                  <li>NMC Format: {LICENSE_FORMAT_EXAMPLES.NMC}</li>
                  <li>SMC Format: {LICENSE_FORMAT_EXAMPLES.SMC_NEW}</li>
                  <li>Old SMC Format: {LICENSE_FORMAT_EXAMPLES.SMC_OLD}</li>
                </ul>
              </div>
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
            <div className="space-y-4">
              <Label className="text-base font-semibold">Required Documents</Label>
              <div className="grid gap-6">
                {/* Degree Certificate Upload */}
                <div>
                  <Label htmlFor="degreeCertificate" className="text-sm font-medium">
                    Degree Certificate
                  </Label>
                  <div className="mt-1">
                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
                      <Input
                        id="degreeCertificate"
                        type="file"
                        onChange={(e) => handleFileChange(e, "degreeCertificate")}
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                      />
                      <Label
                        htmlFor="degreeCertificate"
                        className="flex flex-col items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground"
                      >
                        <Upload className="h-8 w-8" />
                        <span>Upload Degree Certificate</span>
                        <span className="text-xs">PDF, JPG, PNG (max 10MB)</span>
                      </Label>
                      {documents.degreeCertificate && (
                        <p className="mt-2 text-sm text-green-600">✓ {documents.degreeCertificate.name}</p>
                      )}
                      {documentErrors.degreeCertificate && (
                        <p className="mt-2 text-sm text-red-600">{documentErrors.degreeCertificate}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Medical Registration Certificate Upload */}
                <div>
                  <Label htmlFor="medicalRegistration" className="text-sm font-medium">
                    Medical Registration Certificate
                  </Label>
                  <div className="mt-1">
                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
                      <Input
                        id="medicalRegistration"
                        type="file"
                        onChange={(e) => handleFileChange(e, "medicalRegistration")}
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                      />
                      <Label
                        htmlFor="medicalRegistration"
                        className="flex flex-col items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground"
                      >
                        <Upload className="h-8 w-8" />
                        <span>Upload Medical Registration Certificate</span>
                        <span className="text-xs">PDF, JPG, PNG (max 10MB)</span>
                      </Label>
                      {documents.medicalRegistration && (
                        <p className="mt-2 text-sm text-green-600">✓ {documents.medicalRegistration.name}</p>
                      )}
                      {documentErrors.medicalRegistration && (
                        <p className="mt-2 text-sm text-red-600">{documentErrors.medicalRegistration}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Practice Proof Upload */}
                <div>
                  <Label htmlFor="practiceProof" className="text-sm font-medium">
                    Hospital Affiliation or Practice Proof
                  </Label>
                  <div className="mt-1">
                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
                      <Input
                        id="practiceProof"
                        type="file"
                        onChange={(e) => handleFileChange(e, "practiceProof")}
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                      />
                      <Label
                        htmlFor="practiceProof"
                        className="flex flex-col items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground"
                      >
                        <Upload className="h-8 w-8" />
                        <span>Upload Practice Proof</span>
                        <span className="text-xs">PDF, JPG, PNG (max 10MB)</span>
                      </Label>
                      {documents.practiceProof && (
                        <p className="mt-2 text-sm text-green-600">✓ {documents.practiceProof.name}</p>
                      )}
                      {documentErrors.practiceProof && (
                        <p className="mt-2 text-sm text-red-600">{documentErrors.practiceProof}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Add Clinic/Hospital Address Section */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Clinic/Hospital Address</Label>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clinicAddress.street">Street Address</Label>
                  <Input
                    id="clinicAddress.street"
                    name="clinicAddress.street"
                    value={profile.clinicAddress.street}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter street address"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clinicAddress.city">City</Label>
                    <Input
                      id="clinicAddress.city"
                      name="clinicAddress.city"
                      value={profile.clinicAddress.city}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter city"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clinicAddress.state">State</Label>
                    <Input
                      id="clinicAddress.state"
                      name="clinicAddress.state"
                      value={profile.clinicAddress.state}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter state"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinicAddress.pincode">Pincode</Label>
                  <Input
                    id="clinicAddress.pincode"
                    name="clinicAddress.pincode"
                    value={profile.clinicAddress.pincode}
                    onChange={handleInputChange}
                    required
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="Enter 6-digit pincode"
                  />
                </div>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting
                ? "Submitting..."
                : verificationStatus === "rejected"
                  ? "Resubmit Profile"
                  : "Submit Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

