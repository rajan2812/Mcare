export interface Doctor {
    id: string
    name: string
    email: string
    phone: string
    address: string
    speciality: string
    licenseNumber: string
    status: "Pending" | "Approved" | "Rejected"
  }
  
  