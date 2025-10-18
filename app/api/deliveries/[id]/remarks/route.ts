import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-utils"
import { z } from "zod"

const remarksSchema = z.object({
  courierRemarks: z.string().min(1, "Les remarques ne peuvent pas être vides").max(1000, "Les remarques ne peuvent pas dépasser 1000 caractères"),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const { courierRemarks } = remarksSchema.parse(body)

    // Get current delivery
    const delivery = await prisma.delivery.findUnique({
      where: { id },
    })

    if (!delivery) {
      return NextResponse.json({ error: "Livraison non trouvée" }, { status: 404 })
    }

    // Check if the current user is the assigned courier
    if (session.user.role === "COURIER" && delivery.courierId !== session.user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }

    // Update the delivery with courier remarks
    const updatedDelivery = await prisma.delivery.update({
      where: { id },
      data: { courierRemarks },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            phone: true,
            pickupAddress: true,
          },
        },
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
