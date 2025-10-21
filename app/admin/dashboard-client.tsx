"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Package, 
  CheckCircle, 
  Calendar, 
  XCircle, 
  Users, 
  Truck,
  TrendingUp,
  ArrowRight,
  Clock
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Stats {
  today: {
    total: number
    delivered: number
    postponed: number
    canceled: number
    pending: number
  }
  week: {
    total: number
    delivered: number
    postponed: number
    canceled: number
    pending: number
  }
  month: {
    total: number
    delivered: number
    postponed: number
    canceled: number
    pending: number
  }
  clients: number
  couriers: number
}

interface DashboardClientProps {
  stats: Stats
}

export function DashboardClient({ stats }: DashboardClientProps) {
  const [period, setPeriod] = useState<"today" | "week" | "month">("today")
  
  const currentStats = stats[period]
  const today = new Date().toISOString().split("T")[0]

  // Calcul du taux de réussite
  const successRate = currentStats.total > 0 
    ? Math.round((currentStats.delivered / currentStats.total) * 100)
    : 0

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">Vue d&#39;ensemble de vos performances</p>
        </div>
        
        {/* Filtres Période */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-white rounded-lg p-0.5 sm:p-1 shadow-sm border border-slate-200 w-full sm:w-auto">
          <Button
            size="sm"
            variant={period === "today" ? "default" : "ghost"}
            onClick={() => setPeriod("today")}
            className={cn(
              "text-xs font-semibold transition-all flex-1 sm:flex-none",
              period === "today" 
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md" 
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Clock className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Aujourd&#39;hui</span>
            <span className="sm:hidden">Jour</span>
          </Button>
          <Button
            size="sm"
            variant={period === "week" ? "default" : "ghost"}
            onClick={() => setPeriod("week")}
            className={cn(
              "text-xs font-semibold transition-all flex-1 sm:flex-none",
              period === "week" 
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md" 
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Calendar className="h-3.5 w-3.5 sm:mr-1.5" />
            Semaine
          </Button>
          <Button
            size="sm"
            variant={period === "month" ? "default" : "ghost"}
            onClick={() => setPeriod("month")}
            className={cn(
              "text-xs font-semibold transition-all flex-1 sm:flex-none",
              period === "month" 
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md" 
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <TrendingUp className="h-3.5 w-3.5 sm:mr-1.5" />
            Mois
          </Button>
        </div>
      </div>

      {/* Barre de Progression Globale */}
      <Card className="border-2 border-blue-200 shadow-lg bg-gradient-to-br from-white to-blue-50">
        <CardHeader className="pb-2 sm:pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <CardTitle className="text-base sm:text-lg font-bold text-slate-900">
              Progression {period === "today" ? "du jour" : period === "week" ? "de la semaine" : "du mois"}
            </CardTitle>
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border-2 border-emerald-200 self-start sm:self-auto">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-sm font-bold text-emerald-700">{successRate}%</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          {/* Barre de progression principale */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 text-sm">
              <span className="font-medium text-slate-700 text-xs sm:text-sm">
                {currentStats.delivered} / {currentStats.total} livraisons
              </span>
              <span className="text-xs text-slate-500">
                {currentStats.pending} en cours
              </span>
            </div>
            <div className="relative h-5 sm:h-6 bg-slate-200 rounded-full overflow-hidden shadow-inner">
              {/* Delivered (vert) */}
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-500 flex items-center justify-end px-2"
                style={{ width: `${currentStats.total > 0 ? (currentStats.delivered / currentStats.total) * 100 : 0}%` }}
              >
                {currentStats.delivered > 0 && (
                  <span className="text-xs font-bold text-white drop-shadow">
                    {currentStats.delivered}
                  </span>
                )}
              </div>
              {/* Postponed (orange) */}
              <div 
                className="absolute top-0 h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500 flex items-center justify-end px-2"
                style={{ 
                  left: `${currentStats.total > 0 ? (currentStats.delivered / currentStats.total) * 100 : 0}%`,
                  width: `${currentStats.total > 0 ? (currentStats.postponed / currentStats.total) * 100 : 0}%` 
                }}
              >
                {currentStats.postponed > 0 && (
                  <span className="text-xs font-bold text-white drop-shadow">
                    {currentStats.postponed}
                  </span>
                )}
              </div>
              {/* Canceled (rouge) */}
              <div 
                className="absolute top-0 h-full bg-gradient-to-r from-red-500 to-rose-500 transition-all duration-500 flex items-center justify-end px-2"
                style={{ 
                  left: `${currentStats.total > 0 ? ((currentStats.delivered + currentStats.postponed) / currentStats.total) * 100 : 0}%`,
                  width: `${currentStats.total > 0 ? (currentStats.canceled / currentStats.total) * 100 : 0}%` 
                }}
              >
                {currentStats.canceled > 0 && (
                  <span className="text-xs font-bold text-white drop-shadow">
                    {currentStats.canceled}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Légende */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="h-3 w-3 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 shrink-0"></div>
              <span className="text-xs text-slate-600 truncate">Livrées ({currentStats.delivered})</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="h-3 w-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 shrink-0"></div>
              <span className="text-xs text-slate-600 truncate">En cours ({currentStats.pending})</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="h-3 w-3 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 shrink-0"></div>
              <span className="text-xs text-slate-600 truncate">Reportées ({currentStats.postponed})</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="h-3 w-3 rounded-full bg-gradient-to-r from-red-500 to-rose-500 shrink-0"></div>
              <span className="text-xs text-slate-600 truncate">Annulées ({currentStats.canceled})</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cartes Statistiques Cliquables */}
      <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {/* Livraisons du jour */}
        <Link href={`/admin/deliveries?startDate=${today}&endDate=${today}`}>
          <Card className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 hover:-translate-y-1 border-2 border-blue-200 hover:border-blue-400 bg-gradient-to-br from-blue-50 to-white">
            <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-semibold text-slate-700 group-hover:text-blue-700 transition-colors">
                Livraisons du jour
              </CardTitle>
              <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg group-hover:shadow-xl transition-shadow shrink-0">
                <Package className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="pb-3 sm:pb-4">
              <div className="flex items-end justify-between">
                <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
                  {stats.today.total}
                </div>
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
              <p className="text-xs text-slate-600 mt-1.5 sm:mt-2">
                Cliquez pour voir les détails
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Livrées */}
        <Link href={`/admin/deliveries?startDate=${today}&endDate=${today}`}>
          <Card className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 hover:-translate-y-1 border-2 border-emerald-200 hover:border-emerald-400 bg-gradient-to-br from-emerald-50 to-white">
            <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-semibold text-slate-700 group-hover:text-emerald-700 transition-colors">
                Livrées {period === "today" ? "aujourd&#39;hui" : period === "week" ? "semaine" : "mois"}
              </CardTitle>
              <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg group-hover:shadow-xl transition-shadow shrink-0">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="pb-3 sm:pb-4">
              <div className="flex items-end justify-between">
                <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-emerald-700 to-green-700 bg-clip-text text-transparent">
                  {currentStats.delivered}
                </div>
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
              <p className="text-xs text-slate-600 mt-1.5 sm:mt-2">
                Taux de réussite : {successRate}%
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Reportées */}
        <Link href={`/admin/deliveries?startDate=${today}&endDate=${today}`}>
          <Card className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 hover:-translate-y-1 border-2 border-orange-200 hover:border-orange-400 bg-gradient-to-br from-orange-50 to-white">
            <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-semibold text-slate-700 group-hover:text-orange-700 transition-colors">
                Reportées
              </CardTitle>
              <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg group-hover:shadow-xl transition-shadow shrink-0">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="pb-3 sm:pb-4">
              <div className="flex items-end justify-between">
                <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-orange-700 to-amber-700 bg-clip-text text-transparent">
                  {currentStats.postponed}
                </div>
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
              <p className="text-xs text-slate-600 mt-1.5 sm:mt-2">
                À replanifier
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Annulées */}
        <Link href={`/admin/deliveries?startDate=${today}&endDate=${today}`}>
          <Card className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 hover:-translate-y-1 border-2 border-red-200 hover:border-red-400 bg-gradient-to-br from-red-50 to-white">
            <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-semibold text-slate-700 group-hover:text-red-700 transition-colors">
                Annulées
              </CardTitle>
              <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg group-hover:shadow-xl transition-shadow shrink-0">
                <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="pb-3 sm:pb-4">
              <div className="flex items-end justify-between">
                <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-red-700 to-rose-700 bg-clip-text text-transparent">
                  {currentStats.canceled}
                </div>
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
              <p className="text-xs text-slate-600 mt-1.5 sm:mt-2">
                Non effectuées
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Clients */}
        <Link href="/admin/clients">
          <Card className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 hover:-translate-y-1 border-2 border-purple-200 hover:border-purple-400 bg-gradient-to-br from-purple-50 to-white">
            <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-semibold text-slate-700 group-hover:text-purple-700 transition-colors">
                Clients actifs
              </CardTitle>
              <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg group-hover:shadow-xl transition-shadow shrink-0">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="pb-3 sm:pb-4">
              <div className="flex items-end justify-between">
                <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-purple-700 to-violet-700 bg-clip-text text-transparent">
                  {stats.clients}
                </div>
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
              <p className="text-xs text-slate-600 mt-1.5 sm:mt-2">
                Gérer les clients
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Livreurs */}
        <Link href="/admin/couriers">
          <Card className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 hover:-translate-y-1 border-2 border-cyan-200 hover:border-cyan-400 bg-gradient-to-br from-cyan-50 to-white">
            <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-semibold text-slate-700 group-hover:text-cyan-700 transition-colors">
                Livreurs actifs
              </CardTitle>
              <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg group-hover:shadow-xl transition-shadow shrink-0">
                <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="pb-3 sm:pb-4">
              <div className="flex items-end justify-between">
                <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-cyan-700 to-blue-700 bg-clip-text text-transparent">
                  {stats.couriers}
                </div>
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
              <p className="text-xs text-slate-600 mt-1.5 sm:mt-2">
                Gérer les livreurs
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Graphique des Performances (Section suivante) */}
      {/* À implémenter dans la prochaine étape */}
    </div>
  )
}

