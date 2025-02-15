"use client"

import { UserManagement } from "../components/users"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"

export default function UserManagementPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin-dashboard">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">User Management</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <UserManagement />
      </div>
    </div>
  )
}

