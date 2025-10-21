import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth-utils"

interface ClientSettlement {
  client: {
    id: string
    name: string
    phone: string
  }
  deliveries: Array<{
    id: string
    deliveryPrice: number
    collectAmount: number | null
    isPrepaid: boolean
    deliveryFeePrepaid: boolean
    status: string
  }>
  totalToSettle: number
  totalDeliveryFees: number
}

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

    const where: Record<string, unknown> = {
      status: {
        in: ["DELIVERED", "PAID"], // Livraisons effectuées (livrées ou payées)
      },
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
      // Logique de règlement pour livraisons effectuées (DELIVERED ou PAID) :
      // - DELIVERED : Seulement facturer les frais si prépayé sans frais payés
      // - PAID : Calculer le montant complet selon les flags
      
      let amountToSettle = 0
      
      if (delivery.status === "DELIVERED") {
        // Livraison effectuée mais pas encore payée
        if (delivery.isPrepaid && !delivery.deliveryFeePrepaid) {
          // Prépayée mais frais non payés : client doit les frais
          amountToSettle = -delivery.deliveryPrice
        }
        // Sinon, on attend le paiement (rien à régler pour l'instant)
        
      } else if (delivery.status === "PAID") {
        // Livraison effectuée ET payée
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
      }
      
      acc[delivery.senderId].totalToSettle += amountToSettle
      acc[delivery.senderId].totalDeliveryFees += delivery.deliveryPrice
      
      return acc
    }, {} as Record<string, ClientSettlement>)

    return NextResponse.json({
      clients: Object.values(groupedByClient),
      summary: {
        totalDeliveries: deliveries.length,
        totalToSettle: Object.values(groupedByClient).reduce(
          (sum: number, client: ClientSettlement) => sum + client.totalToSettle,
          0
        ),
        totalDeliveryFees: Object.values(groupedByClient).reduce(
          (sum: number, client: ClientSettlement) => sum + client.totalDeliveryFees,
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

