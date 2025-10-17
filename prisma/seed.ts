import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // Hash passwords
  const adminPassword = await bcrypt.hash("admin123", 10)
  const courierPassword = await bcrypt.hash("tokana123", 10)

  // Create users
  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.local" },
    update: {},
    create: {
      email: "admin@demo.local",
      password: adminPassword,
      name: "Admin",
      role: "ADMIN",
    },
  })

  const courier1 = await prisma.user.upsert({
    where: { email: "livreur1@demo.local" },
    update: {},
    create: {
      email: "livreur1@demo.local",
      password: courierPassword,
      name: "Livreur One",
      role: "COURIER",
      phone: "0320000001",
    },
  })

  const courier2 = await prisma.user.upsert({
    where: { email: "livreur2@demo.local" },
    update: {},
    create: {
      email: "livreur2@demo.local",
      password: courierPassword,
      name: "Livreur Two",
      role: "COURIER",
      phone: "0320000002",
    },
  })

  // Create clients
  const clientA = await prisma.client.upsert({
    where: { id: "client-a-seed" },
    update: {},
    create: {
      id: "client-a-seed",
      name: "Client A",
      phone: "0341111111",
      pickupAddress: "Andravoahangy, Antananarivo",
    },
  })

  const clientB = await prisma.client.upsert({
    where: { id: "client-b-seed" },
    update: {},
    create: {
      id: "client-b-seed",
      name: "Client B",
      phone: "0332222222",
      pickupAddress: "Analakely, Antananarivo",
    },
  })

  const clientC = await prisma.client.upsert({
    where: { id: "client-c-seed" },
    update: {},
    create: {
      id: "client-c-seed",
      name: "Client C",
      phone: "0323333333",
      pickupAddress: "Itaosy, Antananarivo",
    },
  })

  console.log("Database seeded successfully!")
  console.log({ admin, courier1, courier2, clientA, clientB, clientC })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
