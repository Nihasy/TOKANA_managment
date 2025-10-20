"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Users, Package, Truck, FileText, LayoutDashboard, DollarSign, Calculator, Menu, X } from "lucide-react"
import { LogoutButton } from "./logout-button"
import { useState } from "react"

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Clients", href: "/admin/clients", icon: Users },
  { name: "Livreurs", href: "/admin/couriers", icon: Truck },
  { name: "Livraisons", href: "/admin/deliveries", icon: Package },
  { name: "Règlement du soir", href: "/admin/reports/settlement", icon: Calculator },
  { name: "Règlements J+1", href: "/admin/settlements", icon: DollarSign },
  { name: "Compte Rendu Client", href: "/admin/reports/client-summary", icon: FileText },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Header Mobile avec menu hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between bg-slate-900 px-4 text-white border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6" />
          <span className="text-lg font-semibold">Gestion</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Overlay Mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 pt-16"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 flex h-screen w-64 flex-col bg-slate-900 text-white transition-transform duration-300 ease-in-out",
          "lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "lg:pt-0 pt-16"
        )}
      >
        <div className="hidden lg:flex h-16 items-center justify-center border-b border-slate-800">
          <Package className="h-6 w-6 mr-2" />
          <span className="text-lg font-semibold">Gestion Livraison</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white",
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-slate-800 p-4">
          <LogoutButton />
        </div>
      </div>
    </>
  )
}
