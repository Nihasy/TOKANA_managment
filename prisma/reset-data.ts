import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🗑️  Suppression des données fictives...")
  console.log("")

  // Supprimer toutes les livraisons
  const deletedDeliveries = await prisma.delivery.deleteMany({})
  console.log(`✅ ${deletedDeliveries.count} livraisons supprimées`)

  // Supprimer tous les clients
  const deletedClients = await prisma.client.deleteMany({})
  console.log(`✅ ${deletedClients.count} clients supprimés`)

  // Supprimer les livreurs de démonstration (garde seulement l'admin si vous voulez)
  const deletedCouriers = await prisma.user.deleteMany({
    where: {
      email: {
        in: ["livreur1@demo.local", "livreur2@demo.local"]
      }
    }
  })
  console.log(`✅ ${deletedCouriers.count} livreurs supprimés`)

  // Optionnel: Supprimer aussi l'admin de démo
  // Décommentez si vous voulez aussi supprimer l'admin
  // const deletedAdmin = await prisma.user.deleteMany({
  //   where: {
  //     email: "admin@demo.local"
  //   }
  // })
  // console.log(`✅ ${deletedAdmin.count} admin supprimé`)

  console.log("")
  console.log("✨ Base de données nettoyée avec succès!")
  console.log("")
  console.log("ℹ️  Note: L'utilisateur admin@demo.local a été conservé")
  console.log("   Pour le supprimer aussi, décommentez les lignes dans le script")
}

main()
  .catch((e) => {
    console.error("❌ Erreur lors du nettoyage:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

