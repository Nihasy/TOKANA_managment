import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth-utils"

// GET: Récupérer les livraisons à régler
export async function GET(request: Request) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get("filter") || "pending" // pending, settled, all

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)

    const where: any = {
      status: "PAID", // Seulement les livraisons payées
      plannedDate: {
        lte: yesterday, // Livraisons d'hier ou avant (J+1)
      },
    }

    if (filter === "pending") {
      where.isSettled = false
    } else if (filter === "settled") {
      where.isSettled = true
    }

    const deliveries = await prisma.delivery.findMany({
      where,
      include: {
        sender: true,
        courier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        plannedDate: "desc",
      },
    })

    // Grouper par client (expéditeur)
    const groupedByClient = deliveries.reduce((acc, delivery) => {
      if (!acc[delivery.senderId]) {
        acc[delivery.senderId] = {
          client: delivery.sender,
          deliveries: [],
          totalToSettle: 0,
          totalDeliveryFees: 0,
        }
      }
      
      acc[delivery.senderId].deliveries.push(delivery)
      
      // Calculer le montant à remettre
      // Si isPrepaid = false : on doit remettre (collectAmount - deliveryPrice)
      // Si isPrepaid = true : on ne doit rien remettre (collectAmount = 0, seulement deliveryPrice collecté)
      if (!delivery.isPrepaid && delivery.collectAmount) {
        acc[delivery.senderId].totalToSettle += (delivery.collectAmount - delivery.deliveryPrice)
      }
      acc[delivery.senderId].totalDeliveryFees += delivery.deliveryPrice
      
      return acc
    }, {} as Record<string, any>)

    return NextResponse.json({
      clients: Object.values(groupedByClient),
      summary: {
        totalDeliveries: deliveries.length,
        totalToSettle: Object.values(groupedByClient).reduce(
          (sum: number, client: any) => sum + client.totalToSettle,
          0
        ),
        totalDeliveryFees: Object.values(groupedByClient).reduce(
          (sum: number, client: any) => sum + client.totalDeliveryFees,
          0
        ),
      },
    })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

