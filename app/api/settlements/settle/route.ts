import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth-utils"
import { z } from "zod"

const settleSchema = z.object({
  deliveryIds: z.array(z.string()).min(1, "Au moins une livraison doit être sélectionnée"),
})

export async function POST(request: Request) {
  try {
    const session = await requireAdmin()
    const body = await request.json()
    const { deliveryIds } = settleSchema.parse(body)

    // Marquer les livraisons comme réglées
    await prisma.delivery.updateMany({
      where: {
        id: { in: deliveryIds },
        status: "PAID",
        isSettled: false,
      },
      data: {
        isSettled: true,
        settledAt: new Date(),
        settledBy: session.user.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: `${deliveryIds.length} livraison(s) marquée(s) comme réglée(s)`,
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

