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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
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
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import {
  Camera,
  Trash2,
  Upload,
  Edit2,
  Save,
  Lock,
  Shield,
  UserX,
  Mail,
  Smartphone,
  Bell,
  MessageSquare,
  Calendar,
  Pill,
  FileText,
  RefreshCw,
} from "lucide-react"
import { ViewRecords } from "@/components/PatientDashboard/Settings/ViewRecords"

// Profile Settings Component
function ProfileSettings() {

  const [profile, setProfile] = useState({
    patientId: "",
    name: "",
    dateOfBirth: "",
    gender: "",
    email: "",
    phone: "",
    address: "",
    height: "",
    weight: "",
    bloodType: "",
    emergencyContact: {
      name: "",
      relationship: "",
      phone: "",
    },
  })

  const [avatarUrl, setAvatarUrl] = useState("/placeholder.svg")
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user"))
    if (userData) {
      setProfile((prevProfile) => ({
        ...prevProfile,
        ...userData,
        patientId: userData.patientId || `PT${Math.floor(1000 + Math.random() * 9000)}`,
      }))
      setAvatarUrl(userData.avatarUrl || "/placeholder.svg")
    }
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    if (name.includes(".")) {
      const [parent, child] = name.split(".")
      setProfile((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }))
    } else {
      setProfile((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSelectChange = (name, value) => {
    if (name.includes(".")) {
      const [parent, child] = name.split(".")
      setProfile((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }))
    } else {
      setProfile((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    localStorage.setItem("user", JSON.stringify({ ...profile, avatarUrl }))
    toast({
      title: "Success",
      description: "Profile updated successfully",
    })
    setIsEditing(false)
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
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

  const genderOptions = ["Male", "Female", "Other", "Prefer not to say"]
  const bloodTypeOptions = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
  const relationshipOptions = ["Spouse", "Parent", "Child", "Sibling", "Friend", "Other"]

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
                      onSelect={() => document.getElementById("picture-upload").click()}
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
                  <Label className="text-sm text-gray-500">Patient ID</Label>
                  <p className="text-lg font-semibold">{profile.patientId}</p>
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
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                value={profile.dateOfBirth}
                onChange={handleInputChange}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select
                name="gender"
                value={profile.gender}
                onValueChange={(value) => handleSelectChange("gender", value)}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  {genderOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bloodType">Blood Type</Label>
              <Select
                name="bloodType"
                value={profile.bloodType}
                onValueChange={(value) => handleSelectChange("bloodType", value)}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select blood type" />
                </SelectTrigger>
                <SelectContent>
                  {bloodTypeOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
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
              <Label htmlFor="address">Address</Label>
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

        {/* Physical Characteristics */}
        <Card>
          <CardHeader>
            <CardTitle>Physical Characteristics</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                name="height"
                type="number"
                value={profile.height}
                onChange={handleInputChange}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                name="weight"
                type="number"
                value={profile.weight}
                onChange={handleInputChange}
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="emergencyContact.name">Contact Name</Label>
              <Input
                id="emergencyContact.name"
                name="emergencyContact.name"
                value={profile.emergencyContact.name}
                onChange={handleInputChange}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyContact.relationship">Relationship</Label>
              <Select
                name="emergencyContact.relationship"
                value={profile.emergencyContact.relationship}
                onValueChange={(value) => handleSelectChange("emergencyContact.relationship", value)}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  {relationshipOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyContact.phone">Contact Phone</Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-r-0 border-gray-300 rounded-l-md">
                  +91
                </span>
                <Input
                  id="emergencyContact.phone"
                  name="emergencyContact.phone"
                  value={profile.emergencyContact.phone}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="rounded-l-none"
                />
              </div>
            </div>
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

  const [verificationDialog, setVerificationDialog] = useState({
    isOpen: false,
    type: null,
    currentValue: "",
  })

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      })
      return
    }
    // Here you would typically make an API call to update the password
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

  const handleSecurityToggle = (key) => {
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
    // Here you would typically make an API call to delete the account
    localStorage.removeItem("isLoggedIn")
    localStorage.removeItem("user")
    window.location.href = "/auth"
  }

  const openVerificationDialog = (type, currentValue) => {
    setVerificationDialog({
      isOpen: true,
      type,
      currentValue,
    })
  }

  const closeVerificationDialog = () => {
    setVerificationDialog({
      isOpen: false,
      type: null,
      currentValue: "",
    })
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

      {/* Verification Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-500" />
            Verification Methods
          </CardTitle>
          <CardDescription>Manage your account verification methods</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Mail className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-medium">Email Verification</p>
                <p className="text-sm text-muted-foreground">user@example.com</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => openVerificationDialog("email", "user@example.com")}>
              Update
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Smartphone className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-medium">Phone Verification</p>
                <p className="text-sm text-muted-foreground">+91 98765XXXXX</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => openVerificationDialog("phone", "98765XXXXX")}>
              Update
            </Button>
          </div>
        </CardContent>
      </Card>

      <VerificationDialog
        isOpen={verificationDialog.isOpen}
        onClose={closeVerificationDialog}
        type={verificationDialog.type}
        currentValue={verificationDialog.currentValue}
      />

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
  const [preferences, setPreferences] = React.useState({
    appointments: true,
    medicationReminders: true,
    labResults: true,
    systemUpdates: false,
    preferredMethod: "app",
  })

  const handleToggle = React.useCallback((key) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }, [])

  const handleMethodChange = React.useCallback((value) => {
    setPreferences((prev) => ({
      ...prev,
      preferredMethod: value,
    }))
  }, [])

  const notificationTypes = [
    { key: "appointments", label: "Appointment Reminders", icon: Calendar },
    { key: "medicationReminders", label: "Medication Reminders", icon: Pill },
    { key: "labResults", label: "Lab Results & Reports", icon: FileText },
    { key: "systemUpdates", label: "System Updates", icon: RefreshCw },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-500" />
            Notification Types
          </CardTitle>
          <CardDescription>Choose which notifications You would like to receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            {notificationTypes.map(({ key, label, icon: Icon }) => (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-gray-500" />
                  <Label htmlFor={key}>{label}</Label>
                </div>
                <Switch id={key} checked={preferences[key]} onCheckedChange={() => handleToggle(key)} />
              </div>
            ))}
          </div>
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

// Verification Dialog Component
function VerificationDialog({ isOpen, onClose, type, currentValue }) {
  const [step, setStep] = React.useState("input") // 'input' or 'otp'
  const [value, setValue] = React.useState(currentValue)
  const [otp, setOtp] = React.useState("")

  const handleSubmit = (e) => {
    e.preventDefault()
    if (step === "input") {
      // Simulate OTP being sent
      toast({
        title: "OTP Sent",
        description: `A verification code has been sent to ${value}`,
      })
      setStep("otp")
    } else {
      // Verify OTP
      if (otp === "123456") {
        // Mock verification
        toast({
          title: "Verification Successful",
          description: `Your ${type} has been updated successfully.`,
        })
        onClose()
      } else {
        toast({
          title: "Invalid OTP",
          description: "Please enter the correct verification code.",
          variant: "destructive",
        })
      }
    }
  }

  const handleClose = () => {
    setStep("input")
    setValue(currentValue)
    setOtp("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update {type === "email" ? "Email Address" : "Phone Number"}</DialogTitle>
          <DialogDescription>
            {step === "input"
              ? `Enter your new ${type === "email" ? "email address" : "phone number"} for verification`
              : "Enter the verification code sent to your contact"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {step === "input" ? (
            <div className="space-y-2">
              <Label htmlFor="contact">{type === "email" ? "New Email Address" : "New Phone Number"}</Label>
              {type === "email" ? (
                <Input
                  id="contact"
                  type="email"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Enter new email address"
                  required
                />
              ) : (
                <div className="flex">
                  <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-r-0 border-gray-300 rounded-l-md">
                    +91
                  </span>
                  <Input
                    id="contact"
                    type="tel"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Enter new phone number"
                    className="rounded-l-none"
                    required
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="otp">Verification Code</Label>
              <Input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
                required
              />
              <p className="text-sm text-muted-foreground">
                Did not receive the code?{" "}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => {
                    toast({
                      title: "OTP Resent",
                      description: `A new verification code has been sent to ${value}`,
                    })
                  }}
                >
                  Resend
                </button>
              </p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">{step === "input" ? "Send Code" : "Verify"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const menuItems = [
  { id: "profile", label: "Profile", component: ProfileSettings },
  { id: "account", label: "Account Management", component: AccountSettings },
  { id: "notifications", label: "Notification Preferences", component: NotificationSettings },
  { id: "records", label: "View Records", component: ViewRecords },
]

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = React.useState(searchParams.get("section") || "profile")

  React.useEffect(() => {
    const section = searchParams.get("section")
    if (section && menuItems.some((item) => item.id === section)) {
      setActiveTab(section)
    }
  }, [searchParams])

  const handleTabChange = React.useCallback((tabId) => {
    setActiveTab(tabId)
  }, [])

  return (
    <div className="flex flex-col gap-8">
      <div className="flex gap-8">
        {/* Settings Navigation */}
        <div className="w-64 flex-shrink-0">
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
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
        <div className="flex-1 min-h-[calc(100vh-12rem)] bg-white border border-gray-200 rounded-lg p-6">
          {React.createElement(menuItems.find((item) => item.id === activeTab)?.component || (() => null))}
        </div>
      </div>
      <Toaster />
    </div>
  )
}

