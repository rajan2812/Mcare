export interface AppointmentRequest {
    id: string
    patientName: string
    patientId: string
    requestedDate: string
    requestedTime: string
    type: "video" | "inPerson"
    status: "pending" | "accepted" | "rejected" | "rescheduled"
    note?: string
    createdAt: string
  }
  
  export interface DoctorAvailability {
    [date: string]: Array<{
      start: string
      end: string
    }>
  }
  
  