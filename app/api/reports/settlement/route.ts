import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth-utils"

export async function GET(request: Request) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")
    const courierId = searchParams.get("courierId")

    if (!date || !courierId) {
      return NextResponse.json({ error: "Date and courierId are required" }, { status: 400 })
    }

    const startDate = new Date(date)
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(date)
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

    // Calculate totals
    const nbLivraisons = deliveries.length
    const totalCollect = deliveries.reduce((sum, d) => sum + (d.collectAmount || 0), 0)
    const totalDeliveryFees = deliveries.reduce((sum, d) => sum + d.deliveryPrice, 0)
    const totalARemettre = totalCollect + totalDeliveryFees

    return NextResponse.json({
      deliveries,
      summary: {
        nbLivraisons,
        totalCollect,
        totalDeliveryFees,
        totalARemettre,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
