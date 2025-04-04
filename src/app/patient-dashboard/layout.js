import "../../styles/global.css"
import { Inter } from "next/font/google"
import { AppointmentNotificationListener } from "./components/AppointmentNotificationListener"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Mcare - Patient Dashboard",
  description: "Integrated Patient & Doctor Healthcare Management System",
}

export default function PatientDashboardLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <AppointmentNotificationListener />
      </body>
    </html>
  )
}

