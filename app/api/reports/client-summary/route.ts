import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth-utils"

export async function GET(request: Request) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const startDateStr = searchParams.get("startDate")
    const endDateStr = searchParams.get("endDate")
    const clientId = searchParams.get("clientId")

    if (!startDateStr || !endDateStr || !clientId) {
      return NextResponse.json(
        { error: "startDate, endDate and clientId are required" },
        { status: 400 }
      )
    }

    const startDate = new Date(startDateStr)
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(endDateStr)
    endDate.setHours(23, 59, 59, 999)

    // Get client info
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        phone: true,
      },
    })

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    // Get all deliveries for this client in the date range
    // Inclure les livraisons dont plannedDate OU originalPlannedDate est dans la période
    const deliveries = await prisma.delivery.findMany({
      where: {
        senderId: clientId,
        OR: [
          {
            plannedDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            originalPlannedDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        ],
      },
      select: {
        id: true,
        receiverName: true,
        receiverPhone: true,
        receiverAddress: true,
        status: true,
        plannedDate: true,
        originalPlannedDate: true,
        postponedTo: true,
        courierRemarks: true,
        collectAmount: true,
        deliveryPrice: true,
        totalDue: true,
        isPrepaid: true,
        deliveryFeePrepaid: true,
      },
      orderBy: { plannedDate: "desc" },
    })

    // Calculate statistics and amounts
    let totalToRemit = 0
    
    // Filtrer uniquement les livraisons effectuées (DELIVERED ou PAID)
    const deliveredDeliveries = deliveries.filter(
      (d) => d.status === "DELIVERED" || d.status === "PAID"
    )
    
    deliveredDeliveries.forEach((d) => {
      // Calculer le montant à remettre selon la logique de règlement J+1
      if (!d.isPrepaid) {
        // Cas normal : on collecte l'argent
        if (d.deliveryFeePrepaid) {
          // Les frais sont déjà payés, on rend tout
          totalToRemit += d.collectAmount || 0
        } else {
          // On déduit les frais de livraison
          totalToRemit += (d.collectAmount || 0) - d.deliveryPrice
        }
      } else {
        // Livraison prépayée
        if (!d.deliveryFeePrepaid) {
          // Le client doit payer les frais (montant négatif)
          totalToRemit -= d.deliveryPrice
        }
        // Si deliveryFeePrepaid = true, rien à régler
      }
    })

    const stats = {
      totalDeliveries: deliveries.length,
      delivered: deliveries.filter(
        (d) => d.status === "DELIVERED" || d.status === "PAID"
      ).length,
      postponed: deliveries.filter((d) => d.status === "POSTPONED").length,
      canceled: deliveries.filter((d) => d.status === "CANCELED").length,
      pending: deliveries.filter(
        (d) => d.status === "CREATED" || d.status === "PICKED_UP"
      ).length,
      totalToRemit, // Montant total à remettre au client
    }

    return NextResponse.json({
      client,
      stats,
      deliveries,
    })
  } catch (error) {
    console.error("Error fetching client summary:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

