import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth-utils"
import { courierUpdateSchema } from "@/lib/validations/courier"
import bcrypt from "bcryptjs"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()

    const { id } = await params
    const body = await request.json()
    const validatedData = courierUpdateSchema.parse(body)

    // Check if email is already used by another user
    if (validatedData.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: validatedData.email,
          NOT: { id },
        },
      })

      if (existingUser) {
        return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 400 })
      }
    }

    const updateData: any = {
      email: validatedData.email,
      name: validatedData.name,
      phone: validatedData.phone,
    }

    // Only update password if provided
    if (validatedData.password) {
      updateData.password = await bcrypt.hash(validatedData.password, 10)
    }

    const courier = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json(courier)
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()

    const { id } = await params

    // Check if courier has deliveries
    const deliveryCount = await prisma.delivery.count({
      where: { courierId: id },
    })

    if (deliveryCount > 0) {
      return NextResponse.json(
        { error: "Impossible de supprimer un livreur avec des livraisons assignées" },
        { status: 400 },
      )
    }

    await prisma.user.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
