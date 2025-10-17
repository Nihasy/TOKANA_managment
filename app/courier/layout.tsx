import type React from "react"
import { LogoutButton } from "@/components/logout-button"
import { Package } from "lucide-react"

export default function CourierLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold">Ma Tournée</span>
          </div>
          <LogoutButton />
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
