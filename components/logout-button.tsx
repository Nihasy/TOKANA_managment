"use client"

import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { cn } from "@/lib/utils"

interface LogoutButtonProps {
  collapsed?: boolean
}

export function LogoutButton({ collapsed = false }: LogoutButtonProps) {
  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={cn(
        "w-full justify-start group relative",
        collapsed && "lg:justify-center lg:px-2"
      )}
      title={collapsed ? "Déconnexion" : undefined}
    >
      <LogOut className={cn("h-4 w-4", !collapsed && "mr-2", collapsed && "lg:h-5 lg:w-5")} />
      <span className={cn(collapsed && "lg:hidden")}>Déconnexion</span>
      
      {/* Tooltip pour mode collapsed */}
      {collapsed && (
        <div className="hidden lg:group-hover:block absolute left-full ml-2 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg shadow-lg whitespace-nowrap z-50 border border-slate-700">
          Déconnexion
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800"></div>
        </div>
      )}
    </Button>
  )
}
