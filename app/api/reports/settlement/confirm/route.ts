import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth-utils"
import { z } from "zod"

const confirmSchema = z.object({
  deliveryIds: z.array(z.string()).min(1, "Au moins une livraison doit être sélectionnée"),
})

export async function POST(request: Request) {
  try {
    const session = await requireAdmin()
    const body = await request.json()
    const { deliveryIds } = confirmSchema.parse(body)

    // Marquer les livraisons comme réglées côté livreur (argent reçu)
    await prisma.delivery.updateMany({
      where: {
        id: { in: deliveryIds },
        status: "PAID",
        courierSettled: false,
      },
      data: {
        courierSettled: true,
        courierSettledAt: new Date(),
        courierSettledBy: session.user.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: `${deliveryIds.length} règlement(s) livreur confirmé(s)`,
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

