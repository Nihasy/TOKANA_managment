import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth-utils"

// GET: Récupérer les livraisons à régler
export async function GET(request: Request) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get("filter") || "pending" // pending, settled, all
    const maxDateStr = searchParams.get("maxDate")

    // Date maximale pour les livraisons (par défaut hier)
    let maxDate = new Date()
    maxDate.setDate(maxDate.getDate() - 1)
    maxDate.setHours(23, 59, 59, 999)

    if (maxDateStr) {
      maxDate = new Date(maxDateStr)
      maxDate.setHours(23, 59, 59, 999)
    }

    const where: any = {
      status: "PAID", // Seulement les livraisons payées
      plannedDate: {
        lte: maxDate, // Livraisons jusqu'à la date spécifiée (J+1)
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
      // Logique de règlement :
      // 1. isPrepaid = false, deliveryFeePrepaid = false : remettre (collectAmount - deliveryPrice)
      // 2. isPrepaid = false, deliveryFeePrepaid = true : remettre tout collectAmount (frais déjà payés)
      // 3. isPrepaid = true, deliveryFeePrepaid = false : déduire deliveryPrice (client doit payer frais)
      // 4. isPrepaid = true, deliveryFeePrepaid = true : rien à faire (tout payé)
      
      let amountToSettle = 0
      
      if (!delivery.isPrepaid) {
        // Le livreur a collecté de l'argent
        if (delivery.deliveryFeePrepaid) {
          // Les frais ont déjà été payés, on rend tout au client
          amountToSettle = delivery.collectAmount || 0
        } else {
          // On déduit les frais de livraison
          amountToSettle = (delivery.collectAmount || 0) - delivery.deliveryPrice
        }
      } else {
        // isPrepaid = true (livraison prépayée)
        if (!delivery.deliveryFeePrepaid) {
          // Le client n'a pas payé les frais, on les déduit (montant négatif = débit)
          amountToSettle = -delivery.deliveryPrice
        }
        // Si deliveryFeePrepaid = true, rien à régler (tout est payé)
      }
      
      acc[delivery.senderId].totalToSettle += amountToSettle
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

