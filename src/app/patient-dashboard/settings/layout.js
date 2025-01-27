import { Sidebar, Header } from "@/components/PatientDashboard/Layout/LayoutComponents"

export default function SettingsLayout({ children }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-6">Settings</h1>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

