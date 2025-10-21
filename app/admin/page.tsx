import { requireAdmin } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { DashboardClient } from "./dashboard-client"

export default async function AdminDashboard() {
  await requireAdmin()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Récupérer toutes les livraisons du jour (optimisé avec groupBy)
  const [deliveriesToday, totalClients, totalCouriers] = await Promise.all([
    prisma.delivery.groupBy({
      by: ['status'],
      where: {
        OR: [
          { plannedDate: { gte: today, lt: tomorrow } },
          { originalPlannedDate: { gte: today, lt: tomorrow } },
        ],
      },
      _count: true,
    }),
    prisma.client.count(),
    prisma.user.count({ where: { role: "COURIER" } }),
  ])

  // Calculer les stats du jour à partir du groupBy
  const totalToday = deliveriesToday.reduce((sum, g) => sum + g._count, 0)
  const deliveredToday = deliveriesToday
    .filter(g => g.status === "DELIVERED" || g.status === "PAID")
    .reduce((sum, g) => sum + g._count, 0)
  const postponedToday = deliveriesToday.find(g => g.status === "POSTPONED")?._count || 0
  const canceledToday = deliveriesToday.find(g => g.status === "CANCELED")?._count || 0

  // Pour la semaine et le mois, on charge seulement si nécessaire (côté client)
  // On envoie juste les données du jour par défaut
  const weekTotal = 0
  const weekDelivered = 0
  const weekPostponed = 0
  const weekCanceled = 0
  
  const monthTotal = 0
  const monthDelivered = 0
  const monthPostponed = 0
  const monthCanceled = 0

  const stats = {
    today: {
      total: totalToday,
      delivered: deliveredToday,
      postponed: postponedToday,
      canceled: canceledToday,
      pending: totalToday - deliveredToday - postponedToday - canceledToday,
    },
    week: {
      total: weekTotal,
      delivered: weekDelivered,
      postponed: weekPostponed,
      canceled: weekCanceled,
      pending: weekTotal - weekDelivered - weekPostponed - weekCanceled,
    },
    month: {
      total: monthTotal,
      delivered: monthDelivered,
      postponed: monthPostponed,
      canceled: monthCanceled,
      pending: monthTotal - monthDelivered - monthPostponed - monthCanceled,
    },
    clients: totalClients,
    couriers: totalCouriers,
  }

  return <DashboardClient stats={stats} />
}
