import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

export async function requireAuth() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/login")
  }
  return session
}

export async function requireAdmin() {
  const session = await requireAuth()
  if (session.user.role !== "ADMIN") {
    redirect("/login")
  }
  return session
}

export async function requireCourier() {
  const session = await requireAuth()
  if (session.user.role !== "COURIER") {
    redirect("/login")
  }
  return session
}
