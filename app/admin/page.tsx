import { requireAdmin } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, Clock, Calendar, CheckCircle } from "lucide-react"

export default async function AdminDashboard() {
  await requireAdmin()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [todayDeliveries, postponedDeliveries, deliveredToday, totalClients] = await Promise.all([
    prisma.delivery.count({
      where: {
        plannedDate: {
          gte: today,
          lt: tomorrow,
        },
        status: {
          in: ["CREATED", "PICKED_UP"],
        },
      },
    }),
    prisma.delivery.count({
      where: {
        status: "POSTPONED",
      },
    }),
    prisma.delivery.count({
      where: {
        plannedDate: {
          gte: today,
          lt: tomorrow,
        },
        status: {
          in: ["DELIVERED", "PAID"],
        },
      },
    }),
    prisma.client.count(),
  ])

  const stats = [
    {
      title: "Livraisons du jour",
      value: todayDeliveries,
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Livrées aujourd'hui",
      value: deliveredToday,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Reportées",
      value: postponedDeliveries,
      icon: Calendar,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Clients actifs",
      value: totalClients,
      icon: Clock,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">Vue d'ensemble de vos livraisons</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">{stat.title}</CardTitle>
              <div className={cn("p-2 rounded-lg", stat.bgColor)}>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ")
}
