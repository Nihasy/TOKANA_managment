import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🗑️  Suppression des anciennes données...")
  
  // Supprimer toutes les données existantes dans l'ordre correct
  await prisma.delivery.deleteMany({})
  await prisma.client.deleteMany({})
  await prisma.user.deleteMany({})
  
  console.log("✅ Anciennes données supprimées")
  console.log("")
  console.log("🌱 Création du compte administrateur...")
  console.log("")

  // ====================================
  // ADMINISTRATEUR
  // ====================================
  
  const adminPassword = await bcrypt.hash("admin123", 10)

  const admin = await prisma.user.create({
    data: {
      email: "admin@tokana.mg",
      password: adminPassword,
      name: "Admin Principal",
      role: "ADMIN",
    },
  })

  console.log("✅ Administrateur créé avec succès")
  console.log("")
  console.log("📋 INFORMATIONS DE CONNEXION")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("")
  console.log("👤 ADMINISTRATEUR")
  console.log("   Email:        admin@tokana.mg")
  console.log("   Mot de passe: admin123")
  console.log("")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("")
  console.log("⚠️  IMPORTANT:")
  console.log("   - Changez le mot de passe admin dès la première connexion")
  console.log("   - Ce compte a accès complet à toutes les fonctionnalités")
  console.log("")
  console.log("🚀 Seed terminé avec succès !")
}

main()
  .catch((e) => {
    console.error("❌ Erreur lors du seed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
