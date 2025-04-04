"use client"

import React, { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/components/ui/use-toast"
import { Camera, Edit2, Save, Lock, Shield, UserX, Bell, MessageSquare, Calendar, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// Profile Settings Component
function ProfileSettings() {
  const [profile, setProfile] = useState({
    doctorId: "",
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    email: "",
    phone: "",
    address: "",
    specializations: [] as string[],
    qualifications: "",
    experience: "",
    consultationFee: "",
    languages: "",
    about: "",
    clinicAddress: {
      street: "",
      city: "",
      state: "",
      pincode: "",
    },
    isVerified: false,
    licenseNumber: "",
  })

  const [avatarUrl, setAvatarUrl] = useState("/placeholder.svg")
  const [isEditing, setIsEditing] = useState(false)
  const [specializations, setSpecializations] = useState<string[]>([])
  const [isVerified, setIsVerified] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // Load user data from localStorage
    const user = JSON.parse(localStorage.getItem("user") || "{}")
    if (user) {
      setProfile((prevProfile) => ({
        ...prevProfile,
        doctorId: user.id || `DR${Math.floor(1000 + Math.random() * 9000)}`,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        specializations: user.specializations || [],
        isVerified: user.isVerified || false,
      }))
      setAvatarUrl(user.avatarUrl || "/placeholder.svg")
      setSpecializations(user.specializations || [])
      setIsVerified(user.isVerified || false)
    }

    // Fetch complete profile data from API
    const fetchProfileData = async () => {
      try {
        const token = localStorage.getItem("token")
        const user = JSON.parse(localStorage.getItem("user") || "{}")

        console.log("Fetching profile for user:", user.id) // Debug log

        const response = await fetch(`http://localhost:4000/api/doctor/profile/${user.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch profile data")
        }

        const data = await response.json()
        console.log("Received profile data:", data) // Debug log

        if (data.success && data.data) {
          const profileData = data.data

          // Update the profile state with all the data
          setProfile((prev) => ({
            ...prev,
            doctorId: profileData._id || user.id,
            firstName: profileData.firstName || "",
            lastName: profileData.lastName || "",
            email: profileData.email || "",
            phone: profileData.phone || "",
            specializations: profileData.specializations || [],
            qualifications: profileData.qualifications || "",
            experience: profileData.experience || "",
            consultationFee: profileData.consultationFee || "",
            languages: profileData.languages || "",
            about: profileData.about || "",
            clinicAddress: {
              street: profileData.clinicAddress?.street || "",
              city: profileData.clinicAddress?.city || "",
              state: profileData.clinicAddress?.state || "",
              pincode: profileData.clinicAddress?.pincode || "",
            },
            isVerified: profileData.verificationStatus === "approved",
            licenseNumber: profileData.licenseNumber || "",
          }))

          // Update other state variables
          setAvatarUrl(profileData.avatarUrl || "/placeholder.svg")
          setSpecializations(profileData.specializations || [])
          setIsVerified(profileData.verificationStatus === "approved")

          console.log("Updated profile state:", profileData) // Debug log
        }
      } catch (error) {
        console.error("Error fetching profile:", error)
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        })
      }
    }

    fetchProfileData()
  }, [toast])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    if (name.startsWith("clinicAddress.")) {
      const addressField = name.split(".")[1]
      setProfile((prev) => ({
        ...prev,
        clinicAddress: {
          ...(prev.clinicAddress ?? {}),
          [addressField]: value,
        },
      }))
      return
    }

    setProfile((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("http://localhost:4000/api/doctor/update-profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...profile,
          specializations: profile.specializations,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update profile")
      }

      const data = await response.json()
      if (data.success) {
        toast({
          title: "Success",
          description: "Profile updated successfully",
        })
        setIsEditing(false)
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      })
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        const formData = new FormData()
        formData.append("profilePicture", file)

        const token = localStorage.getItem("token")
        const response = await fetch("http://localhost:4000/api/user/upload-profile-picture", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        })

        if (!response.ok) {
          throw new Error("Failed to upload profile picture")
        }

        const data = await response.json()
        if (data.success) {
          setAvatarUrl(data.avatarUrl)
          toast({
            title: "Profile picture updated",
            description: "Your new profile picture has been set successfully.",
          })
        } else {
          throw new Error(data.message || "Failed to update profile picture")
        }
      } catch (error) {
        console.error("Error uploading profile picture:", error)
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to update profile picture",
          variant: "destructive",
        })
      }
    }
  }

  const handleRemoveImage = () => {
    setAvatarUrl("/placeholder.svg")
    toast({
      title: "Profile picture removed",
      description: "Your profile picture has been removed.",
    })
  }

  const specializations_list = [
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

  const languageOptions = ["English", "Spanish", "French", "German", "Chinese", "Hindi", "Arabic"]

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Profile Settings</h2>
        <Button variant={isEditing ? "default" : "outline"} onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          ) : (
            <>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Profile
            </>
          )}
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Picture & ID Section */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-6">
              <div className="relative group">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={avatarUrl} alt={profile.firstName} />
                  <AvatarFallback>
                    {profile.firstName?.[0]}
                    {profile.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <input
                      type="file"
                      id="profile-picture"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                    <label
                      htmlFor="profile-picture"
                      className="cursor-pointer p-2 rounded-full bg-white/10 hover:bg-white/20"
                    >
                      <Camera className="w-6 h-6 text-white" />
                    </label>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <Label className="text-sm text-gray-500">Doctor ID</Label>
                  <p className="text-lg font-semibold">{profile.doctorId}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <Label className="text-sm text-gray-500">License Number</Label>
                  <p className="text-lg font-semibold">{profile.licenseNumber || "Not provided"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                name="firstName"
                value={profile.firstName}
                onChange={handleInputChange}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                name="lastName"
                value={profile.lastName}
                onChange={handleInputChange}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="specializations" className="text-base">
                Specializations
              </Label>
              <div className="flex flex-wrap gap-2">
                {profile.specializations.map((spec) => (
                  <Badge key={spec} variant="secondary" className="text-sm">
                    {spec}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Specializations cannot be edited here. Please contact support for any changes.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qualifications">Qualifications</Label>
              <Input
                id="qualifications"
                name="qualifications"
                value={profile.qualifications}
                onChange={handleInputChange}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="experience">Years of Experience</Label>
              <Input
                id="experience"
                name="experience"
                type="number"
                value={profile.experience}
                onChange={handleInputChange}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="consultationFee">Consultation Fee</Label>
              <Input
                id="consultationFee"
                name="consultationFee"
                type="number"
                value={profile.consultationFee}
                onChange={handleInputChange}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="languages">Primary Language</Label>
              <Select
                name="languages"
                value={profile.languages}
                onValueChange={(value) => setProfile((prev) => ({ ...prev, languages: value }))}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select primary language" />
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map((language) => (
                    <SelectItem key={language} value={language}>
                      {language}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={profile.email}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-r-0 border-gray-300 rounded-l-md">
                    +91
                  </span>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={profile.phone}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="rounded-l-none"
                  />
                </div>
              </div>
            </div>
            {/* Clinic Address Section */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Clinic Address</Label>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clinicAddress.street">Street Address</Label>
                  <Input
                    id="clinicAddress.street"
                    name="clinicAddress.street"
                    value={profile.clinicAddress?.street ?? ""}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Enter street address"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clinicAddress.city">City</Label>
                    <Input
                      id="clinicAddress.city"
                      name="clinicAddress.city"
                      value={profile.clinicAddress?.city ?? ""}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      placeholder="Enter city"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clinicAddress.state">State</Label>
                    <Input
                      id="clinicAddress.state"
                      name="clinicAddress.state"
                      value={profile.clinicAddress?.state ?? ""}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      placeholder="Enter state"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinicAddress.pincode">Pincode</Label>
                  <Input
                    id="clinicAddress.pincode"
                    name="clinicAddress.pincode"
                    value={profile.clinicAddress?.pincode ?? ""}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="Enter 6-digit pincode"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About Section */}
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
            <CardDescription>Write a brief description about your practice and expertise</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              id="about"
              name="about"
              value={profile.about}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="min-h-[150px]"
            />
          </CardContent>
        </Card>

        {isEditing && (
          <Button type="submit" className="w-full">
            Save All Changes
          </Button>
        )}
      </form>
    </div>
  )
}

// Account Settings Component
function AccountSettings() {
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    loginNotifications: true,
    deviceManagement: true,
  })

  const { toast } = useToast()

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handlePasswordSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      })
      return
    }
    toast({
      title: "Success",
      description: "Password updated successfully",
    })
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    })
  }

  const handleSecurityToggle = (key: keyof typeof securitySettings) => {
    setSecuritySettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
    toast({
      title: "Settings Updated",
      description: `${key} has been ${!securitySettings[key] ? "enabled" : "disabled"}`,
    })
  }

  const handleDeleteAccount = () => {
    localStorage.removeItem("isLoggedIn")
    localStorage.removeItem("doctor")
    window.location.href = "/auth"
  }

  return (
    <div className="space-y-6">
      {/* Password Change Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-500" />
            Change Password
          </CardTitle>
          <CardDescription>Ensure your account is using a strong password for security</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange}
                required
              />
            </div>
            <Button type="submit">Update Password</Button>
          </form>
        </CardContent>
      </Card>

      {/* Security Settings Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            Security Settings
          </CardTitle>
          <CardDescription>Manage your account security preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
            </div>
            <Switch
              checked={securitySettings.twoFactorAuth}
              onCheckedChange={() => handleSecurityToggle("twoFactorAuth")}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Login Notifications</Label>
              <p className="text-sm text-muted-foreground">Get notified when someone logs into your account</p>
            </div>
            <Switch
              checked={securitySettings.loginNotifications}
              onCheckedChange={() => handleSecurityToggle("loginNotifications")}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Device Management</Label>
              <p className="text-sm text-muted-foreground">Track and manage devices that have access to your account</p>
            </div>
            <Switch
              checked={securitySettings.deviceManagement}
              onCheckedChange={() => handleSecurityToggle("deviceManagement")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Delete Account Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2 text-red-500">
            <UserX className="w-5 h-5" />
            Delete Account
          </CardTitle>
          <CardDescription>Permanently delete your account and all associated data</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete Account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account and remove your data from our
                  servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount} className="bg-red-500 hover:bg-red-600">
                  Delete Account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}

// Notification Settings Component
function NotificationSettings() {
  const [preferences, setPreferences] = useState({
    appointments: true,
    patientMessages: true,
    systemUpdates: false,
    preferredMethod: "app",
  })

  const { toast } = useToast()

  const handleToggle = (key: keyof typeof preferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
    toast({
      title: "Notification Preference Updated",
      description: `${key} notifications have been ${!preferences[key] ? "enabled" : "disabled"}`,
    })
  }

  const handleMethodChange = (value: string) => {
    setPreferences((prev) => ({
      ...prev,
      preferredMethod: value,
    }))
    toast({
      title: "Notification Method Updated",
      description: `Your preferred notification method has been updated to ${value}`,
    })
  }

  const notificationTypes = [
    { key: "appointments" as const, label: "Appointment Updates", icon: Calendar },
    {
      key: "patientMessages" as const,
      label: "Patient Messages",
      icon: MessageSquare,
    },
    { key: "systemUpdates" as const, label: "System Updates", icon: RefreshCw },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-500" />
            Notification Types
          </CardTitle>
          <CardDescription>Choose which notifications you would like to receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {notificationTypes.map(({ key, label, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-gray-500" />
                <Label htmlFor={key}>{label}</Label>
              </div>
              <Switch id={key} checked={preferences[key]} onCheckedChange={() => handleToggle(key)} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-500" />
            Notification Method
          </CardTitle>
          <CardDescription>Choose how you would like to receive notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={preferences.preferredMethod} onValueChange={handleMethodChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select notification method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="app">App Notifications</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="all">All Methods</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  )
}

const menuItems = [
  { id: "profile", label: "Profile", component: ProfileSettings },
  { id: "account", label: "Account Management", component: AccountSettings },
  { id: "notifications", label: "Notification Preferences", component: NotificationSettings },
]

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get("section") || "profile")

  useEffect(() => {
    const section = searchParams.get("section")
    if (section && menuItems.some((item) => item.id === section)) {
      setActiveTab(section)
    }
  }, [searchParams])

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto py-8">
            <div className="flex gap-8">
              {/* Settings Navigation */}
              <div className="w-64 flex-shrink-0">
                <nav className="space-y-1 sticky top-8">
                  {menuItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        "w-full px-4 py-2 text-left rounded-lg text-sm font-medium transition-colors",
                        activeTab === item.id ? "bg-black text-white" : "text-gray-600 hover:bg-gray-100",
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Settings Content Area */}
              <div className="flex-1">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  {menuItems.find((item) => item.id === activeTab)?.component &&
                    React.createElement(menuItems.find((item) => item.id === activeTab)!.component)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  )
}

