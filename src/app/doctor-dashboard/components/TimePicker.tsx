"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Clock } from "lucide-react"

interface TimePickerProps {
  value: string
  onChange: (value: string) => void
  label?: string
}

export function TimePicker({ value, onChange, label }: TimePickerProps) {
  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="flex items-center">
        <div className="relative w-full">
          <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input type="time" value={value} onChange={(e) => onChange(e.target.value)} className="pl-10" />
        </div>
      </div>
    </div>
  )
}

