import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-utils"
import { z } from "zod"

const transferSchema = z.object({
  newCourierId: z.string().nullable(),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const { newCourierId } = transferSchema.parse(body)

    // Get current delivery
    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: {
        courier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!delivery) {
      return NextResponse.json({ error: "Livraison non trouvée" }, { status: 404 })
    }

    // Check if delivery is in CREATED status (not picked up yet) - only for couriers
    // Admins can reassign at any time
    if (session.user.role === "COURIER" && delivery.status !== "CREATED") {
      return NextResponse.json(
        { error: "Seules les livraisons non récupérées peuvent être transférées" },
        { status: 400 }
      )
    }

    // Check if the current user is the assigned courier or an admin
    if (session.user.role === "COURIER" && delivery.courierId !== session.user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }

    // Handle unassigning (setting to null)
    let newCourier = null
    if (newCourierId) {
      // Verify the new courier exists and is actually a courier
      newCourier = await prisma.user.findUnique({
        where: { 
          id: newCourierId,
          role: "COURIER"
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      })

      if (!newCourier) {
        return NextResponse.json({ error: "Livreur de destination invalide" }, { status: 400 })
      }

      // Check if trying to transfer to the same courier
      if (delivery.courierId === newCourierId) {
        return NextResponse.json({ error: "La livraison est déjà assignée à ce livreur" }, { status: 400 })
      }
    } else {
      // Check if already unassigned
      if (!delivery.courierId) {
        return NextResponse.json({ error: "La livraison n'est pas assignée" }, { status: 400 })
      }
    }

    // Update the delivery with the new courier
    const updatedDelivery = await prisma.delivery.update({
      where: { id },
      data: { courierId: newCourierId },
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

    return NextResponse.json({
      ...updatedDelivery,
      transferInfo: {
        fromCourier: delivery.courier,
        toCourier: newCourier,
        transferredAt: new Date().toISOString(),
        action: newCourierId ? "reassigned" : "unassigned",
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
