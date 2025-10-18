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
      pickupZone: "PERIPHERIE",
    },
  })

  // Dates pour les tests J+1
  const today = new Date()
  today.setHours(10, 0, 0, 0)

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(10, 0, 0, 0)

  const twoDaysAgo = new Date()
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
  twoDaysAgo.setHours(14, 0, 0, 0)

  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
  threeDaysAgo.setHours(9, 0, 0, 0)

  // ==============================================
  // LIVRAISONS POUR TESTER RÈGLEMENTS J+1
  // ==============================================

  // CLIENT A - Cas normal : 3 livraisons non prépayées, frais non payés
  // À remettre : (50000 - 5000) + (30000 - 4000) + (75000 - 6000) = 140 000 Ar
  await prisma.delivery.upsert({
    where: { id: "delivery-j1-a1" },
    update: {},
    create: {
      id: "delivery-j1-a1",
      senderId: clientA.id,
      courierId: courier1.id,
      plannedDate: yesterday,
      receiverName: "Récepteur A1",
      receiverPhone: "0341234567",
      receiverAddress: "Antanimena, Antananarivo",
      parcelCount: 2,
      weightKg: 3.0,
      description: "Vêtements",
      collectAmount: 50000,
      deliveryPrice: 5000,
      autoPrice: 5000,
      totalDue: 45000,
      isPrepaid: false,
      deliveryFeePrepaid: false,
      status: "PAID",
      courierSettled: true, // Argent déjà reçu du livreur
      courierSettledAt: yesterday,
      courierSettledBy: admin.id,
      zone: "TANA",
      isExpress: false,
    },
  })

  await prisma.delivery.upsert({
    where: { id: "delivery-j1-a2" },
    update: {},
    create: {
      id: "delivery-j1-a2",
      senderId: clientA.id,
      courierId: courier1.id,
      plannedDate: yesterday,
      receiverName: "Récepteur A2",
      receiverPhone: "0331234567",
      receiverAddress: "Tsaralalana, Antananarivo",
      parcelCount: 1,
      weightKg: 1.5,
      description: "Documents",
      collectAmount: 30000,
      deliveryPrice: 4000,
      autoPrice: 4000,
      totalDue: 26000,
      isPrepaid: false,
      deliveryFeePrepaid: false,
      status: "PAID",
      courierSettled: true,
      courierSettledAt: yesterday,
      courierSettledBy: admin.id,
      zone: "TANA",
      isExpress: false,
    },
  })

  await prisma.delivery.upsert({
    where: { id: "delivery-j1-a3" },
    update: {},
    create: {
      id: "delivery-j1-a3",
      senderId: clientA.id,
      courierId: courier2.id,
      plannedDate: twoDaysAgo,
      receiverName: "Récepteur A3",
      receiverPhone: "0321234567",
      receiverAddress: "Ankorondrano, Antananarivo",
      parcelCount: 3,
      weightKg: 4.0,
      description: "Électronique",
      collectAmount: 75000,
      deliveryPrice: 6000,
      autoPrice: 6000,
      totalDue: 69000,
      isPrepaid: false,
      deliveryFeePrepaid: false,
      status: "PAID",
      courierSettled: true,
      courierSettledAt: twoDaysAgo,
      courierSettledBy: admin.id,
      zone: "TANA",
      isExpress: false,
    },
  })

  // CLIENT B - Cas avec frais prépayés : 2 livraisons
  // À remettre : 40000 + 60000 = 100 000 Ar (tout remettre, frais déjà payés)
  await prisma.delivery.upsert({
    where: { id: "delivery-j1-b1" },
    update: {},
    create: {
      id: "delivery-j1-b1",
      senderId: clientB.id,
      courierId: courier1.id,
      plannedDate: yesterday,
      receiverName: "Récepteur B1",
      receiverPhone: "0341111222",
      receiverAddress: "Ivato, Antananarivo",
      parcelCount: 1,
      weightKg: 2.0,
      description: "Livres",
      collectAmount: 40000,
      deliveryPrice: 7000,
      autoPrice: 7000,
      totalDue: 40000, // Frais payés d'avance
      isPrepaid: false,
      deliveryFeePrepaid: true, // ⭐ Frais déjà payés
      status: "PAID",
      courierSettled: true,
      courierSettledAt: yesterday,
      courierSettledBy: admin.id,
      zone: "PERI",
      isExpress: false,
    },
  })

  await prisma.delivery.upsert({
    where: { id: "delivery-j1-b2" },
    update: {},
    create: {
      id: "delivery-j1-b2",
      senderId: clientB.id,
      courierId: courier2.id,
      plannedDate: twoDaysAgo,
      receiverName: "Récepteur B2",
      receiverPhone: "0331111222",
      receiverAddress: "Ambohimanarina, Antananarivo",
      parcelCount: 2,
      weightKg: 3.5,
      description: "Accessoires",
      collectAmount: 60000,
      deliveryPrice: 8000,
      autoPrice: 8000,
      totalDue: 60000, // Frais payés d'avance
      isPrepaid: false,
      deliveryFeePrepaid: true, // ⭐ Frais déjà payés
      status: "PAID",
      courierSettled: true,
      courierSettledAt: twoDaysAgo,
      courierSettledBy: admin.id,
      zone: "PERI",
      isExpress: false,
    },
  })

  // CLIENT C - Cas DÉBIT : Livraisons prépayées mais frais non payés
  // Débit : -5000 - 6000 = -11 000 Ar (client doit payer)
  await prisma.delivery.upsert({
    where: { id: "delivery-j1-c1" },
    update: {},
    create: {
      id: "delivery-j1-c1",
      senderId: clientC.id,
      courierId: courier1.id,
      plannedDate: yesterday,
      receiverName: "Récepteur C1",
      receiverPhone: "0342222333",
      receiverAddress: "Ambatobe, Antananarivo",
      parcelCount: 1,
      weightKg: 1.0,
      description: "Petit colis",
      collectAmount: 0, // Prépayé
      deliveryPrice: 5000,
      autoPrice: 5000,
      totalDue: -5000, // ⭐ DÉBIT
      isPrepaid: true, // ⭐ Livraison prépayée
      deliveryFeePrepaid: false, // ⭐ Mais frais non payés
      status: "PAID",
      courierSettled: true,
      courierSettledAt: yesterday,
      courierSettledBy: admin.id,
      zone: "PERI",
      isExpress: false,
    },
  })

  await prisma.delivery.upsert({
    where: { id: "delivery-j1-c2" },
    update: {},
    create: {
      id: "delivery-j1-c2",
      senderId: clientC.id,
      courierId: courier2.id,
      plannedDate: twoDaysAgo,
      receiverName: "Récepteur C2",
      receiverPhone: "0332222333",
      receiverAddress: "Ankadifotsy, Antananarivo",
      parcelCount: 2,
      weightKg: 2.5,
      description: "Documents importants",
      collectAmount: 0, // Prépayé
      deliveryPrice: 6000,
      autoPrice: 6000,
      totalDue: -6000, // ⭐ DÉBIT
      isPrepaid: true, // ⭐ Livraison prépayée
      deliveryFeePrepaid: false, // ⭐ Mais frais non payés
      status: "PAID",
      courierSettled: true,
      courierSettledAt: twoDaysAgo,
      courierSettledBy: admin.id,
      zone: "PERI",
      isExpress: false,
    },
  })

  // CLIENT D - Cas tout payé : Rien à régler
  const clientD = await prisma.client.upsert({
    where: { id: "client-d-seed" },
    update: {},
    create: {
      id: "client-d-seed",
      name: "Client D (Tout payé)",
      phone: "0324444444",
      pickupAddress: "67 Ha, Antananarivo",
      pickupZone: "TANA_VILLE",
    },
  })

  await prisma.delivery.upsert({
    where: { id: "delivery-j1-d1" },
    update: {},
    create: {
      id: "delivery-j1-d1",
      senderId: clientD.id,
      courierId: courier1.id,
      plannedDate: yesterday,
      receiverName: "Récepteur D1",
      receiverPhone: "0343333444",
      receiverAddress: "Behoririka, Antananarivo",
      parcelCount: 1,
      weightKg: 1.0,
      description: "Colis express",
      collectAmount: 0, // Prépayé
      deliveryPrice: 4000,
      autoPrice: 4000,
      totalDue: 0, // ⭐ Rien à régler
      isPrepaid: true, // ⭐ Livraison prépayée
      deliveryFeePrepaid: true, // ⭐ ET frais payés
      status: "PAID",
      courierSettled: true,
      courierSettledAt: yesterday,
      courierSettledBy: admin.id,
      zone: "TANA",
      isExpress: true,
    },
  })

  // ==============================================
  // LIVRAISONS SUPPLÉMENTAIRES POUR TESTER LES FILTRES DE DATE
  // ==============================================

  // AUJOURD'HUI - Pour tester le règlement du soir (pas encore éligible J+1)
  await prisma.delivery.upsert({
    where: { id: "delivery-today-1" },
    update: {},
    create: {
      id: "delivery-today-1",
      senderId: clientA.id,
      courierId: courier1.id,
      plannedDate: today,
      receiverName: "Récepteur Today 1",
      receiverPhone: "0345678901",
      receiverAddress: "Analakely, Antananarivo",
      parcelCount: 1,
      weightKg: 2.0,
      description: "Livraison du jour",
      collectAmount: 45000,
      deliveryPrice: 4500,
      autoPrice: 4500,
      totalDue: 40500,
      isPrepaid: false,
      deliveryFeePrepaid: false,
      status: "PAID",
      courierSettled: false, // Pas encore réglé avec le livreur
      zone: "TANA",
      isExpress: false,
    },
  })

  // IL Y A 3 JOURS - Livraison plus ancienne
  await prisma.delivery.upsert({
    where: { id: "delivery-3days-1" },
    update: {},
    create: {
      id: "delivery-3days-1",
      senderId: clientB.id,
      courierId: courier2.id,
      plannedDate: threeDaysAgo,
      receiverName: "Récepteur 3 jours",
      receiverPhone: "0346789012",
      receiverAddress: "Ambohijatovo, Antananarivo",
      parcelCount: 2,
      weightKg: 3.0,
      description: "Livraison ancienne",
      collectAmount: 55000,
      deliveryPrice: 6000,
      autoPrice: 6000,
      totalDue: 49000,
      isPrepaid: false,
      deliveryFeePrepaid: false,
      status: "PAID",
      courierSettled: true,
      courierSettledAt: threeDaysAgo,
      courierSettledBy: admin.id,
      zone: "TANA",
      isExpress: false,
    },
  })

  // RÈGLEMENT DU SOIR QUI SERA FAIT LE LENDEMAIN
  await prisma.delivery.upsert({
    where: { id: "delivery-late-settlement-1" },
    update: {},
    create: {
      id: "delivery-late-settlement-1",
      senderId: clientA.id,
      courierId: courier1.id,
      plannedDate: yesterday,
      receiverName: "Récepteur Règlement Tardif",
      receiverPhone: "0347890123",
      receiverAddress: "Anosibe, Antananarivo",
      parcelCount: 1,
      weightKg: 1.5,
      description: "Règlement du soir fait le lendemain",
      collectAmount: 35000,
      deliveryPrice: 4000,
      autoPrice: 4000,
      totalDue: 31000,
      isPrepaid: false,
      deliveryFeePrepaid: false,
      status: "PAID",
      courierSettled: false, // Pas encore réglé - simule un règlement tardif
      zone: "TANA",
      isExpress: false,
    },
  })

  console.log("✅ Database seeded successfully!")
  console.log("")
  console.log("📊 Données de test créées pour Règlements J+1:")
  console.log("")
  console.log("👥 Clients:")
  console.log("  - Client A: 3 livraisons J+1 → À remettre: +140 000 Ar")
  console.log("  - Client B: 2 livraisons J+1 → À remettre: +100 000 Ar (frais prépayés)")
  console.log("  - Client C: 2 livraisons J+1 → DÉBIT: -11 000 Ar (frais non payés)")
  console.log("  - Client D: 1 livraison J+1  → Rien: 0 Ar (tout payé)")
  console.log("")
  console.log("📅 Livraisons supplémentaires pour tester les filtres:")
  console.log("  - Aujourd'hui: 1 livraison (pas encore éligible J+1)")
  console.log("  - Il y a 3 jours: 1 livraison")
  console.log("  - Hier (règlement tardif): 1 livraison non réglée avec livreur")
  console.log("")
  console.log("🚚 Livreurs:")
  console.log("  - Livreur One: Livraisons aujourd'hui + hier")
  console.log("  - Livreur Two: Livraisons anciennes")
  console.log("")
  console.log("💡 Testez maintenant:")
  console.log("  1. Règlement du soir → Filtrer par date (aujourd'hui ou hier)")
  console.log("  2. Règlements J+1 → Changer la date max pour voir différentes livraisons")
  console.log("  3. Sélectionner un client → Voir détails et débits/crédits")
  console.log("  4. Confirmer règlement → Choisir type de remise")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
