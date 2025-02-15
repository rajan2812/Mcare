"use client"

import { HomePage } from "../dashboard-components/Home"
import ProtectedRoute from "@/components/protected-route"

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <HomePage />
    </ProtectedRoute>
  )
}

