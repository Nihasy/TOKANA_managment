import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth-utils"
import { clientSchema } from "@/lib/validations/client"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()

    const body = await request.json()
    const validatedData = clientSchema.parse(body)

    const client = await prisma.client.update({
      where: { id: params.id },
      data: validatedData,
    })

    return NextResponse.json(client)
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()

    await prisma.client.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
