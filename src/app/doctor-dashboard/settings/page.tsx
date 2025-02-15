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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
import {
  Camera,
  Trash2,
  Upload,
  Edit2,
  Save,
  Lock,
  Shield,
  UserX,
  Bell,
  MessageSquare,
  Calendar,
  RefreshCw,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

// Profile Settings Component
function ProfileSettings() {
  const [profile, setProfile] = useState({
    doctorId: "",
    name: "",
    dateOfBirth: "",
    gender: "",
    email: "",
    phone: "",
    address: "",
    specializations: [] as string[],
    qualifications: "",
    experience: "",
    consultationFee: "",
    languages: "", // Changed to string
    about: "",
    isVerified: false,
  })

  const [avatarUrl, setAvatarUrl] = useState("/placeholder.svg")
  const [isEditing, setIsEditing] = useState(false)
  const [specializations, setSpecializations] = useState<string[]>([])
  const [isVerified, setIsVerified] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const doctorData = JSON.parse(localStorage.getItem("doctor") || "{}")
    if (doctorData) {
      setProfile((prevProfile) => ({
        ...prevProfile,
        ...doctorData,
        doctorId: doctorData.doctorId || `DR${Math.floor(1000 + Math.random() * 9000)}`,
        isVerified: doctorData.isVerified || false,
      }))
      setAvatarUrl(doctorData.avatarUrl || "/placeholder.svg")
      setSpecializations(doctorData.specializations || [])
      setIsVerified(doctorData.isVerified || false)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setProfile((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const updatedProfile = {
      ...profile,
      avatarUrl,
      specializations,
      isVerified, // Preserve the verified status
    }
    localStorage.setItem("doctor", JSON.stringify(updatedProfile))
    toast({
      title: "Success",
      description: "Profile updated successfully",
    })
    setIsEditing(false)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const imageUrl = URL.createObjectURL(file)
      setAvatarUrl(imageUrl)
      toast({
        title: "Profile picture updated",
        description: "Your new profile picture has been set successfully.",
      })
    }
  }

  const handleRemoveImage = () => {
    setAvatarUrl("/placeholder.svg")
    toast({
      title: "Profile picture removed",
      description: "Your profile picture has been removed.",
    })
  }

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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="relative cursor-pointer group">
                      <Avatar className="w-24 h-24 transition-opacity group-hover:opacity-90">
                        <AvatarImage src={avatarUrl} alt={profile.name} />
                        <AvatarFallback>
                          {profile.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={() => document.getElementById("picture-upload")?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Picture
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer text-red-600" onSelect={handleRemoveImage}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove Picture
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Input
                  id="picture-upload"
                  type="file"
                  className="hidden"
                  onChange={handleImageUpload}
                  accept="image/*"
                />
              </div>
              <div className="flex-1">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <Label className="text-sm text-gray-500">Doctor ID</Label>
                  <p className="text-lg font-semibold">{profile.doctorId}</p>
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
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" name="name" value={profile.name} onChange={handleInputChange} disabled={!isEditing} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specializations" className="text-base flex items-center gap-2">
                Specializations
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  Set during registration
                </span>
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {specializations.map((spec) => (
                  <div key={spec} className="flex items-center space-x-2">
                    <Badge variant="secondary">{spec}</Badge>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Specializations are set during profile completion and cannot be modified. Please contact support if you
                need to update your specializations.
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
            <div className="space-y-2">
              <Label htmlFor="address">Clinic Address</Label>
              <Textarea
                id="address"
                name="address"
                value={profile.address}
                onChange={handleInputChange}
                disabled={!isEditing}
              />
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
    { key: "patientMessages" as const, label: "Patient Messages", icon: MessageSquare },
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
          <CardDescription>Choose which notifications you had like to receive</CardDescription>
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
          <CardDescription>Choose how you had like to receive notifications</CardDescription>
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

