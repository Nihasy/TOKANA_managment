import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth-utils"
import { clientSchema } from "@/lib/validations/client"

export async function GET(request: Request) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""

    const clients = await prisma.client.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { phone: { contains: search } },
              { pickupAddress: { contains: search, mode: "insensitive" } },
            ],
          }
        : {},
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(clients)
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin()

    const body = await request.json()
    const validatedData = clientSchema.parse(body)

    const client = await prisma.client.create({
      data: validatedData,
    })

    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
