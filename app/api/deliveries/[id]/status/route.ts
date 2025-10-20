import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-utils"
import { z } from "zod"

const statusSchema = z.object({
  status: z.enum(["CREATED", "PICKED_UP", "DELIVERED", "PAID", "POSTPONED", "CANCELED"]),
})

const VALID_TRANSITIONS: Record<string, string[]> = {
  CREATED: ["PICKED_UP", "CANCELED"],
  PICKED_UP: ["DELIVERED", "CANCELED"],
  DELIVERED: ["PAID"],
  PAID: [],
  POSTPONED: ["PICKED_UP", "CANCELED"],
  CANCELED: [],
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const { status } = statusSchema.parse(body)

    // Get current delivery
    const delivery = await prisma.delivery.findUnique({
      where: { id },
    })

    if (!delivery) {
      return NextResponse.json({ error: "Livraison non trouvée" }, { status: 404 })
    }

    // Check ownership for couriers
    if (session.user.role === "COURIER" && delivery.courierId !== session.user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }

    // Validate transition only for couriers (admins can change to any status)
    if (session.user.role === "COURIER") {
      const allowedTransitions = VALID_TRANSITIONS[delivery.status]
      if (!allowedTransitions.includes(status)) {
        return NextResponse.json({ error: `Transition invalide de ${delivery.status} vers ${status}` }, { status: 400 })
      }
    }

    // Update status
    const updatedDelivery = await prisma.delivery.update({
      where: { id },
      data: { status },
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
