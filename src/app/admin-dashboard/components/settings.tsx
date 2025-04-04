"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Shield, Mail, SettingsIcon } from "lucide-react"

export function Settings() {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const [profileForm, setProfileForm] = useState({
    name: "Admin User",
    email: "g22.rajan.vinod@gnkhalsa.edu.in",
    phone: "+1234567890",
  })
  const [emailSettings, setEmailSettings] = useState({
    notifyOnNewDoctor: true,
    notifyOnNewPatient: false,
    notifyOnComplaints: true,
    emailFrequency: "instant",
  })

  // Update the handleProfileUpdate function
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("http://localhost:4000/api/admin/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileForm),
      })

      if (!response.ok) {
        throw new Error("Failed to update profile")
      }

      const data = await response.json()
      if (data.success) {
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully.",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Update the handlePasswordChange function
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const formData = new FormData(e.target as HTMLFormElement)
      const currentPassword = formData.get("current-password")
      const newPassword = formData.get("new-password")
      const confirmPassword = formData.get("confirm-password")

      if (newPassword !== confirmPassword) {
        throw new Error("New passwords do not match")
      }

      const token = localStorage.getItem("token")
      const response = await fetch("http://localhost:4000/api/admin/change-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      if (!response.ok) {
        throw new Error("Failed to change password")
      }

      const data = await response.json()
      if (data.success) {
        toast({
          title: "Password Updated",
          description: "Your password has been changed successfully.",
        })
        // Clear password fields
        ;(e.target as HTMLFormElement).reset()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to change password",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Update the handleEmailSettingChange function
  const handleEmailSettingChange = async (key: keyof typeof emailSettings, value: boolean | string) => {
    try {
      const token = localStorage.getItem("token")
      const newSettings = { ...emailSettings, [key]: value }

      const response = await fetch("http://localhost:4000/api/admin/email-preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newSettings),
      })

      if (!response.ok) {
        throw new Error("Failed to update email preferences")
      }

      const data = await response.json()
      if (data.success) {
        setEmailSettings(newSettings)
        toast({
          title: "Email Settings Updated",
          description: "Your email preferences have been saved.",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update email preferences",
        variant: "destructive",
      })
    }
  }

  // Add useEffect to fetch initial settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem("token")
        const response = await fetch("http://localhost:4000/api/admin/settings", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch settings")
        }

        const data = await response.json()
        if (data.success) {
          setProfileForm(data.data.profile)
          setEmailSettings(data.data.emailPreferences)
        }
      } catch (error) {
        console.error("Error fetching settings:", error)
      }
    }

    fetchSettings()
  }, [])

  // Update the test email button click handler
  const handleTestEmail = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("http://localhost:4000/api/admin/send-test-email", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to send test email")
      }

      const data = await response.json()
      if (data.success) {
        toast({
          title: "Test Email Sent",
          description: "A test email has been sent to your inbox.",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send test email",
        variant: "destructive",
      })
    }
  }

  return (
    <Tabs defaultValue="profile" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3 gap-4">
        <TabsTrigger value="profile" className="flex items-center gap-2">
          <SettingsIcon className="h-4 w-4" />
          Profile
        </TabsTrigger>
        <TabsTrigger value="security" className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Security
        </TabsTrigger>
        <TabsTrigger value="email" className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Email
        </TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>Manage your admin account details and preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="security">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Password Change</CardTitle>
              <CardDescription>Update your admin account password</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input id="current-password" type="password" name="current-password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input id="new-password" type="password" name="new-password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input id="confirm-password" type="password" name="confirm-password" />
                </div>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="email">
        <Card>
          <CardHeader>
            <CardTitle>Email Notifications</CardTitle>
            <CardDescription>Manage your email notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>New Doctor Registrations</Label>
                <p className="text-sm text-muted-foreground">Get notified when a new doctor registers</p>
              </div>
              <Switch
                checked={emailSettings.notifyOnNewDoctor}
                onCheckedChange={(checked) => handleEmailSettingChange("notifyOnNewDoctor", checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>New Patient Registrations</Label>
                <p className="text-sm text-muted-foreground">Get notified when a new patient registers</p>
              </div>
              <Switch
                checked={emailSettings.notifyOnNewPatient}
                onCheckedChange={(checked) => handleEmailSettingChange("notifyOnNewPatient", checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Complaints</Label>
                <p className="text-sm text-muted-foreground">Get notified when new complaints are filed</p>
              </div>
              <Switch
                checked={emailSettings.notifyOnComplaints}
                onCheckedChange={(checked) => handleEmailSettingChange("notifyOnComplaints", checked)}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Email Frequency</Label>
              <Select
                value={emailSettings.emailFrequency}
                onValueChange={(value) => handleEmailSettingChange("emailFrequency", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select email frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instant">Instant</SelectItem>
                  <SelectItem value="daily">Daily Digest</SelectItem>
                  <SelectItem value="weekly">Weekly Summary</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">Choose how often you want to receive email notifications</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleTestEmail}>Send Test Email</Button>
          </CardFooter>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

