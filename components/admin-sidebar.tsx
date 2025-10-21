"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Users, Package, Truck, FileText, LayoutDashboard, DollarSign, Calculator, Menu, X, ChevronLeft, ChevronRight } from "lucide-react"
import { LogoutButton } from "./logout-button"
import { useState, useEffect } from "react"

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Clients", href: "/admin/clients", icon: Users },
  { name: "Livraisons", href: "/admin/deliveries", icon: Package },
  { name: "Règlement du soir", href: "/admin/reports/settlement", icon: Calculator },
  { name: "Compte Rendu Client", href: "/admin/reports/client-summary", icon: FileText },
  { name: "Règlements J+1", href: "/admin/settlements", icon: DollarSign },
  { name: "Livreurs", href: "/admin/couriers", icon: Truck },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false)

  // Sauvegarder l'état du collapse dans localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed")
    if (saved !== null) {
      setIsDesktopCollapsed(saved === "true")
    }
  }, [])

  const toggleDesktopSidebar = () => {
    const newState = !isDesktopCollapsed
    setIsDesktopCollapsed(newState)
    localStorage.setItem("sidebar-collapsed", String(newState))
  }

  return (
    <>
      {/* Header Mobile avec menu hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between bg-slate-900 px-4 text-white border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6" />
          <span className="text-lg font-semibold">Gestion</span>
        </div>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Toggle menu"
        >
          {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Overlay Mobile */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 pt-16"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 flex h-screen flex-col bg-slate-900 text-white transition-all duration-300 ease-in-out",
          "lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:pt-0 pt-16",
          // Largeur responsive selon l'état collapsed
          isDesktopCollapsed ? "lg:w-20" : "lg:w-64",
          "w-64" // Mobile toujours pleine largeur
        )}
      >
        {/* Header Desktop */}
        <div className="hidden lg:flex h-16 items-center justify-center border-b border-slate-800 relative">
          {!isDesktopCollapsed ? (
            <>
              <Package className="h-6 w-6 mr-2" />
              <span className="text-lg font-semibold">Gestion Livraison</span>
            </>
          ) : (
            <Package className="h-6 w-6" />
          )}
          
          {/* Bouton Toggle Desktop */}
          <button
            onClick={toggleDesktopSidebar}
            className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 items-center justify-center w-6 h-6 bg-slate-800 rounded-full border-2 border-slate-700 hover:bg-slate-700 transition-colors shadow-lg"
            aria-label={isDesktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isDesktopCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors group relative",
                  isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white",
                  isDesktopCollapsed && "lg:justify-center lg:px-2"
                )}
                title={isDesktopCollapsed ? item.name : undefined}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", isDesktopCollapsed && "lg:h-6 lg:w-6")} />
                <span className={cn("whitespace-nowrap", isDesktopCollapsed && "lg:hidden")}>
                  {item.name}
                </span>
                
                {/* Tooltip pour mode collapsed */}
                {isDesktopCollapsed && (
                  <div className="hidden lg:group-hover:block absolute left-full ml-2 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg shadow-lg whitespace-nowrap z-50 border border-slate-700">
                    {item.name}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800"></div>
                  </div>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Logout Button */}
        <div className={cn("border-t border-slate-800 p-4", isDesktopCollapsed && "lg:p-2")}>
          <LogoutButton collapsed={isDesktopCollapsed} />
        </div>
      </div>
    </>
  )
}
