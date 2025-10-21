import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth-utils"

export async function GET(request: Request) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const startDateStr = searchParams.get("startDate")
    const endDateStr = searchParams.get("endDate")
    const courierId = searchParams.get("courierId")

    if (!startDateStr || !endDateStr || !courierId) {
      return NextResponse.json({ error: "startDate, endDate and courierId are required" }, { status: 400 })
    }

    const startDate = new Date(startDateStr)
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(endDateStr)
    endDate.setHours(23, 59, 59, 999)

    // Get all PAID deliveries for the courier on the specified date
    const deliveries = await prisma.delivery.findMany({
      where: {
        courierId,
        plannedDate: {
          gte: startDate,
          lte: endDate,
        },
        status: "PAID",
      },
      include: {
        sender: true,
        courier: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    })
    
    // Check if all deliveries are settled with courier
    const allCourierSettled = deliveries.every(d => d.courierSettled)

    // Calculate totals
    const nbLivraisons = deliveries.length
    const totalCollect = deliveries.reduce((sum, d) => sum + (d.collectAmount || 0), 0)
    const totalDeliveryFees = deliveries.reduce((sum, d) => sum + d.deliveryPrice, 0)
    // Total à remettre = totalDue de toutes les livraisons (ce que le livreur a collecté)
    const totalARemettre = deliveries.reduce((sum, d) => sum + d.totalDue, 0)

    return NextResponse.json({
      deliveries,
      summary: {
        nbLivraisons,
        totalCollect,
        totalDeliveryFees,
        totalARemettre,
      },
      allCourierSettled,
    })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
