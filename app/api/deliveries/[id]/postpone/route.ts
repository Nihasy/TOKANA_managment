import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-utils"
import { z } from "zod"

const postponeSchema = z.object({
  postponedTo: z.string().refine(
    (date) => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      return new Date(date) >= tomorrow
    },
    {
      message: "La date de report doit être au moins demain (J+1)",
    },
  ),
})

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const { postponedTo } = postponeSchema.parse(body)

    // Get current delivery
    const delivery = await prisma.delivery.findUnique({
      where: { id: params.id },
    })

    if (!delivery) {
      return NextResponse.json({ error: "Livraison non trouvée" }, { status: 404 })
    }

    // Check ownership for couriers
    if (session.user.role === "COURIER" && delivery.courierId !== session.user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }

    // Can only postpone CREATED or PICKED_UP deliveries
    if (!["CREATED", "PICKED_UP"].includes(delivery.status)) {
      return NextResponse.json({ error: "Impossible de reporter cette livraison" }, { status: 400 })
    }

    // Update delivery
    const updatedDelivery = await prisma.delivery.update({
      where: { id: params.id },
      data: {
        status: "POSTPONED",
        postponedTo: new Date(postponedTo),
        plannedDate: new Date(postponedTo),
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
    })

    return NextResponse.json(updatedDelivery)
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
