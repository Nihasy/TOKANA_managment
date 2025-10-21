"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { FileDown, FileText, CheckCircle2, XCircle, Clock } from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

interface ClientSummary {
  client: {
    id: string
    name: string
    phone: string
  }
  stats: {
    totalDeliveries: number
    delivered: number
    postponed: number
    canceled: number
    pending: number
    totalToRemit: number
  }
  deliveries: Array<{
    id: string
    receiverName: string
    receiverPhone: string
    receiverAddress: string
    status: string
    plannedDate: string
    postponedTo?: string | null
    courierRemarks?: string
    collectAmount: number | null
    deliveryPrice: number
    totalDue: number
    isPrepaid: boolean
    deliveryFeePrepaid: boolean
  }>
}

// Removed unused PREDEFINED_NOTES and STATUS_COLORS
// Using SIMPLIFIED_STATUS_LABELS and SIMPLIFIED_STATUS_COLORS instead

// Statuts simplifiés pour le compte rendu client
const SIMPLIFIED_STATUS_LABELS: Record<string, string> = {
  DELIVERED: "Livrée",
  PAID: "Livrée",
  POSTPONED: "Reportée",
  CANCELED: "Annulée",
  CREATED: "En cours",
  PICKED_UP: "En cours",
}

// Statuts simplifiés sans accents pour le PDF
const SIMPLIFIED_STATUS_LABELS_PDF: Record<string, string> = {
  DELIVERED: "Livree",
  PAID: "Livree",
  POSTPONED: "Reportee",
  CANCELED: "Annulee",
  CREATED: "En cours",
  PICKED_UP: "En cours",
}

const SIMPLIFIED_STATUS_COLORS: Record<string, string> = {
  DELIVERED: "bg-green-100 text-green-800",
  PAID: "bg-green-100 text-green-800",
  POSTPONED: "bg-purple-100 text-purple-800",
  CANCELED: "bg-red-100 text-red-800",
  CREATED: "bg-slate-100 text-slate-700",
  PICKED_UP: "bg-yellow-100 text-yellow-800",
}

// Fonction helper pour calculer le montant à remettre par livraison
const calculateAmountToRemit = (delivery: ClientSummary['deliveries'][0]) => {
  if (!delivery.isPrepaid) {
    // Cas normal : on collecte l'argent
    if (delivery.deliveryFeePrepaid) {
      // Les frais sont déjà payés, on rend tout
      return delivery.collectAmount || 0
    } else {
      // On déduit les frais de livraison
      return (delivery.collectAmount || 0) - delivery.deliveryPrice
    }
  } else {
    // Livraison prépayée
    if (!delivery.deliveryFeePrepaid) {
      // Le client doit payer les frais (montant négatif = débit)
      return -delivery.deliveryPrice
    }
    // Si deliveryFeePrepaid = true, rien à régler
    return 0
  }
}

export default function ClientSummaryPage() {
  const today = new Date().toISOString().split("T")[0]
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [selectedClientId, setSelectedClientId] = useState("")

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const res = await fetch("/api/clients")
      if (!res.ok) throw new Error("Failed to fetch clients")
      return res.json()
    },
  })

  // Fetch client summary
  const { data: clientSummary, isLoading } = useQuery<ClientSummary>({
    queryKey: ["client-summary", startDate, endDate, selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return null
      const params = new URLSearchParams({ startDate, endDate, clientId: selectedClientId })
      const res = await fetch(`/api/reports/client-summary?${params}`)
      if (!res.ok) throw new Error("Failed to fetch client summary")
      return res.json()
    },
    enabled: !!selectedClientId,
  })

  const exportToCSV = () => {
    if (!clientSummary) return

    // CSV headers - Résumé
    const headers = ["Client", "Téléphone", "Total", "Livrées", "Reportées", "Annulées", "Montant Total à Remettre"]

    // CSV rows - Résumé
    const rows = [
      [
        clientSummary.client.name,
        clientSummary.client.phone,
        clientSummary.stats.totalDeliveries,
        clientSummary.stats.delivered,
        clientSummary.stats.postponed,
        clientSummary.stats.canceled,
        `${clientSummary.stats.totalToRemit.toLocaleString()} Ar`,
      ],
    ]

    // Add empty row
    rows.push([])
    rows.push(["Détail des livraisons"])
    rows.push(["Date", "Destinataire", "Téléphone", "Adresse", "Statut", "Montant Collecté", "Frais Livraison", "À Remettre", "Remarques"])

    // Add delivery details
    clientSummary.deliveries.forEach((d) => {
      const amountToRemit = calculateAmountToRemit(d)
      rows.push([
        new Date(d.plannedDate).toLocaleDateString("fr-FR"),
        d.receiverName,
        d.receiverPhone,
        d.receiverAddress,
        SIMPLIFIED_STATUS_LABELS[d.status],
        d.collectAmount || 0,
        d.deliveryPrice,
        amountToRemit,
        d.courierRemarks || "-",
      ])
    })

    // Convert to CSV string
    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n")

    // Download
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `compte_rendu_${clientSummary.client.name}_${startDate}_${endDate}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToPDF = () => {
    if (!clientSummary) return

    // Fonction pour formater les nombres correctement pour le PDF
    const formatAmount = (amount: number): string => {
      return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")
    }

    const doc = new jsPDF()
    
    // En-tête du document avec dégradé
    doc.setFillColor(16, 185, 129) // Emerald-500
    doc.rect(0, 0, 210, 40, "F")
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.setFont("helvetica", "bold")
    doc.text("COMPTE RENDU DE LIVRAISONS", 105, 18, { align: "center" })
    
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text("Tokana Delivery Management", 105, 28, { align: "center" })
    doc.text(new Date().toLocaleDateString("fr-FR"), 105, 34, { align: "center" })

    // Informations du client - Encadré
    let yPos = 50
    doc.setFillColor(239, 246, 255) // Blue-50
    doc.setDrawColor(147, 197, 253) // Blue-300
    doc.rect(15, yPos, 180, 26, "FD")
    
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text("CLIENT:", 20, yPos + 9)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(12)
    doc.text(clientSummary.client.name, 45, yPos + 9)
    
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text("TELEPHONE:", 20, yPos + 18)
    doc.setFont("helvetica", "normal")
    doc.text(clientSummary.client.phone, 52, yPos + 18)
    
    doc.setFont("helvetica", "bold")
    doc.text("PERIODE:", 120, yPos + 13)
    doc.setFont("helvetica", "normal")
    const periodText = `${new Date(startDate).toLocaleDateString("fr-FR")} - ${new Date(endDate).toLocaleDateString("fr-FR")}`
    doc.text(periodText, 148, yPos + 13)

    // Statistiques - 4 cartes
    yPos = 84
    const cardWidth = 42
    const cardHeight = 24
    const gap = 4
    
    const statsData = [
      { label: "TOTAL", value: clientSummary.stats.totalDeliveries, color: [59, 130, 246] },
      { label: "LIVREES", value: clientSummary.stats.delivered, color: [34, 197, 94] },
      { label: "REPORTEES", value: clientSummary.stats.postponed, color: [249, 115, 22] },
      { label: "ANNULEES", value: clientSummary.stats.canceled, color: [239, 68, 68] }
    ]
    
    statsData.forEach((stat, index) => {
      const x = 15 + (cardWidth + gap) * index
      doc.setFillColor(stat.color[0], stat.color[1], stat.color[2])
      doc.rect(x, yPos, cardWidth, cardHeight, "F")
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.text(stat.label, x + cardWidth / 2, yPos + 10, { align: "center" })
      
      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.text(stat.value.toString(), x + cardWidth / 2, yPos + 19, { align: "center" })
    })

    // Montant total à remettre - Grande carte
    yPos = 114
    doc.setFillColor(16, 185, 129)
    doc.rect(15, yPos, 180, 22, "F")
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("MONTANT TOTAL A REMETTRE AU CLIENT:", 20, yPos + 11)
    
    doc.setFontSize(15)
    const amountText = `${formatAmount(clientSummary.stats.totalToRemit)} Ar`
    doc.text(amountText, 190, yPos + 11, { align: "right" })

    // Tableau des livraisons - Format optimisé
    yPos = 144
    doc.setTextColor(0, 0, 0)
    
    // Fonction pour tronquer intelligemment le texte selon la largeur de cellule
    const truncateText = (text: string, maxChars: number): string => {
      if (!text || text.length <= maxChars) return text
      return text.substring(0, maxChars - 3) + '...'
    }
    
    // Fonction pour formater les numéros de téléphone de manière compacte
    const formatPhone = (phone: string): string => {
      // Retirer tous les espaces et caractères non numériques sauf +
      const cleaned = phone.replace(/[^\d+]/g, '')
      // Si commence par +261, format compact
      if (cleaned.startsWith('+261')) {
        return cleaned.substring(4) // Retirer +261
      }
      // Sinon retourner tel quel (tronqué si trop long)
      return truncateText(cleaned, 11)
    }
    
    // Numéroter les livraisons pour référence dans l'annexe
    const tableData = clientSummary.deliveries.map((d, index) => {
      const amountToRemit = calculateAmountToRemit(d)
      
      // Ajouter un numéro si il y a des remarques
      const numRef = d.courierRemarks ? ` [${index + 1}]` : ""
      
      // Calculer l'espace disponible pour le nom (en tenant compte du numéro)
      const nameMaxLength = numRef ? 22 : 28
      
      return [
        new Date(d.plannedDate).toLocaleDateString("fr-FR", { day: '2-digit', month: '2-digit' }),
        truncateText(d.receiverName, nameMaxLength) + numRef,
        formatPhone(d.receiverPhone),
        SIMPLIFIED_STATUS_LABELS_PDF[d.status],
        formatAmount(d.collectAmount || 0),
        formatAmount(d.deliveryPrice),
        formatAmount(amountToRemit)
      ]
    })

    autoTable(doc, {
      startY: yPos,
      head: [["Date", "Destinataire", "Tel.", "Statut", "Collecte", "Frais", "A Rem."]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5,
        halign: "center",
        valign: "middle",
        cellPadding: 1.5,
        minCellHeight: 7,
        lineColor: [59, 130, 246],
        lineWidth: 0.5,
        overflow: 'linebreak'
      },
      bodyStyles: {
        fontSize: 7.5,
        cellPadding: 1.5,
        valign: "middle",
        minCellHeight: 6.5,
        lineColor: [180, 180, 180],
        lineWidth: 0.3,
        overflow: 'linebreak',
        cellWidth: 'wrap'
      },
      columnStyles: {
        0: { cellWidth: 17, halign: "center", overflow: 'linebreak' }, // Date
        1: { cellWidth: 50, halign: "left", overflow: 'linebreak' }, // Destinataire - Élargi
        2: { cellWidth: 23, halign: "center", overflow: 'linebreak' }, // Tel
        3: { cellWidth: 20, halign: "center", overflow: 'linebreak' }, // Statut
        4: { cellWidth: 22, halign: "right", overflow: 'linebreak' }, // Collecte (sans "Ar")
        5: { cellWidth: 20, halign: "right", overflow: 'linebreak' }, // Frais (sans "Ar")
        6: { cellWidth: 22, halign: "right", fontStyle: "bold", overflow: 'linebreak' } // A Rem. (couleur dynamique)
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { left: 10, right: 10 },
      rowPageBreak: 'auto',
      tableLineWidth: 0.3,
      tableLineColor: [180, 180, 180],
      didParseCell: function(data) {
        // Gérer la couleur dynamique de la colonne "A Rem." (colonne 6)
        if (data.column.index === 6 && data.section === 'body') {
          const amountText = data.cell.raw as string
          // Extraire le nombre (retirer les espaces)
          const amount = parseInt(amountText.replace(/\s/g, ''))
          
          if (amount < 0) {
            // Rouge pour les montants négatifs
            data.cell.styles.textColor = [220, 38, 38] // red-600
          } else {
            // Vert pour les montants positifs ou nuls
            data.cell.styles.textColor = [16, 185, 129] // emerald-500
          }
        }
        
        // S'assurer que le texte ne déborde pas
        if (data.cell.raw && typeof data.cell.raw === 'string') {
          data.cell.text = [data.cell.raw]
        }
      }
    })

    // Ligne de total final - Plus compact
    const finalY = (doc as typeof jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 150
    const adjustedY = finalY + 2
    doc.setFillColor(16, 185, 129)
    doc.setDrawColor(16, 185, 129)
    doc.rect(10, adjustedY, 190, 12, "FD")
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text("MONTANT TOTAL A REMETTRE:", 15, adjustedY + 8)
    doc.setFontSize(13)
    const finalAmount = `${formatAmount(clientSummary.stats.totalToRemit)} Ar`
    doc.text(finalAmount, 195, adjustedY + 8, { align: "right" })

    // ANNEXE : REMARQUES
    const deliveriesWithRemarks = clientSummary.deliveries
      .map((d, index) => ({ ...d, index: index + 1 }))
      .filter(d => d.courierRemarks && d.courierRemarks.trim() !== "")
    
    if (deliveriesWithRemarks.length > 0) {
      adjustedY = adjustedY + 20 // Espace après le total
      
      // Vérifier si on a assez d'espace pour l'en-tête de l'annexe
      if (adjustedY > 250) {
        doc.addPage()
        adjustedY = 20
      }
      
      // En-tête de l'annexe
      doc.setFillColor(71, 85, 105) // Slate-600
      doc.rect(10, adjustedY, 190, 10, "F")
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      doc.text("ANNEXE : REMARQUES", 105, adjustedY + 7, { align: "center" })
      
      adjustedY = adjustedY + 15
      
      // Afficher chaque remarque
      deliveriesWithRemarks.forEach((delivery) => {
        // Vérifier si on a assez d'espace (minimum 20mm pour une remarque)
        if (adjustedY > 260) {
          doc.addPage()
          adjustedY = 20
        }
        
        // Encadré pour chaque remarque
        doc.setDrawColor(203, 213, 225) // Slate-300
        doc.setFillColor(248, 250, 252) // Slate-50
        
        // Calculer la hauteur nécessaire pour la remarque
        const maxWidth = 175
        const remarkText = delivery.courierRemarks || ""
        const lines = doc.splitTextToSize(remarkText, maxWidth)
        const boxHeight = Math.max(15, 8 + lines.length * 4)
        
        // Vérifier à nouveau avec la hauteur réelle
        if (adjustedY + boxHeight > 280) {
          doc.addPage()
          adjustedY = 20
        }
        
        doc.rect(10, adjustedY, 190, boxHeight, "FD")
        
        // Numéro et destinataire (avec troncature si nécessaire)
        doc.setTextColor(30, 58, 138) // Blue-900
        doc.setFontSize(9)
        doc.setFont("helvetica", "bold")
        const nameWithRef = `[${delivery.index}] ${delivery.receiverName}`
        // Tronquer le nom si trop long (laisser de l'espace pour la date)
        const truncatedName = nameWithRef.length > 45 
          ? `[${delivery.index}] ${delivery.receiverName.substring(0, 42)}...` 
          : nameWithRef
        doc.text(truncatedName, 15, adjustedY + 6, { maxWidth: 140 })
        
        // Date
        doc.setFont("helvetica", "normal")
        doc.setFontSize(8)
        doc.setTextColor(100, 116, 139) // Slate-500
        const dateText = new Date(delivery.plannedDate).toLocaleDateString("fr-FR")
        doc.text(dateText, 195, adjustedY + 6, { align: "right" })
        
        // Remarque (avec retour à la ligne automatique)
        doc.setTextColor(51, 65, 85) // Slate-700
        doc.setFontSize(8)
        doc.setFont("helvetica", "normal")
        doc.text(lines, 15, adjustedY + 12)
        
        adjustedY = adjustedY + boxHeight + 3 // Espace entre les remarques
      })
    }

    // Pied de page amélioré
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      
      // Ligne de séparation
      doc.setDrawColor(200, 200, 200)
      doc.line(15, 280, 195, 280)
      
      doc.setFontSize(7)
      doc.setTextColor(120, 120, 120)
      doc.setFont("helvetica", "normal")
      doc.text(
        `Document genere le ${new Date().toLocaleDateString("fr-FR")} a ${new Date().toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' })}`,
        105,
        286,
        { align: "center" }
      )
      doc.text(`Page ${i} sur ${pageCount}`, 105, 290, { align: "center" })
    }

    // Télécharger avec nom formaté
    const fileName = `Compte_Rendu_${clientSummary.client.name.replace(/\s/g, '_')}_${startDate}.pdf`
    doc.save(fileName)
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="mb-4 sm:mb-6 md:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">Compte Rendu Client</h1>
        <p className="text-slate-600 mt-1 text-xs sm:text-sm md:text-base">Générez des comptes rendus pour informer vos clients</p>
      </div>

      <Card className="mb-4 sm:mb-6">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="startDate" className="text-xs sm:text-sm">Date de début</Label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-sm" />
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="endDate" className="text-xs sm:text-sm">Date de fin</Label>
              <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-sm" />
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="client" className="text-xs sm:text-sm">Client</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client: { id: string; name: string }) => (
                    <SelectItem key={client.id} value={client.id} className="text-sm">
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedClientId ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p>Sélectionnez une période et un client pour générer le compte rendu</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            <div className="h-12 w-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mx-auto mb-4"></div>
            <p>Chargement...</p>
          </CardContent>
        </Card>
      ) : !clientSummary || clientSummary.stats.totalDeliveries === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            <p>Aucune livraison trouvée pour cette période et ce client</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Client Info et Montant Total - Côte à côte */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
            {/* Client Info */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="py-6">
                <div className="flex flex-col gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{clientSummary.client.name}</h2>
                    <p className="text-slate-600 mt-1">{clientSummary.client.phone}</p>
                    <p className="text-sm text-slate-500 mt-2">
                      Période : {new Date(startDate).toLocaleDateString("fr-FR")} au {new Date(endDate).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={exportToPDF} className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white">
                      <FileText className="h-4 w-4 mr-2" />
                      Exporter PDF
                    </Button>
                    <Button onClick={exportToCSV} variant="outline" className="cursor-pointer">
                      <FileDown className="h-4 w-4 mr-2" />
                      Exporter CSV
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Montant Total à Remettre */}
            <Card className="bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200">
              <CardContent className="py-6">
                <div className="flex items-center justify-between h-full">
                  <div className="flex flex-col justify-center">
                    <h3 className="text-sm font-medium text-emerald-800 mb-2">Montant Total à Remettre</h3>
                    <div className="text-4xl md:text-5xl font-bold text-emerald-700">
                      {clientSummary.stats.totalToRemit.toLocaleString()} Ar
                    </div>
                    <p className="text-sm text-emerald-600 mt-2">
                      {clientSummary.stats.totalToRemit >= 0 
                        ? "Montant à verser au client" 
                        : "Montant dû par le client (débit)"}
                    </p>
                  </div>
                  <div className="text-6xl md:text-7xl">💰</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{clientSummary.stats.totalDeliveries}</div>
                <p className="text-xs text-slate-500 mt-1">livraisons</p>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Livrées
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-700">{clientSummary.stats.delivered}</div>
                <p className="text-xs text-green-600 mt-1">
                  {clientSummary.stats.totalDeliveries > 0 
                    ? Math.round((clientSummary.stats.delivered / clientSummary.stats.totalDeliveries) * 100) 
                    : 0}% du total
                </p>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-800 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Reportées
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-700">{clientSummary.stats.postponed}</div>
                <p className="text-xs text-orange-600 mt-1">
                  {clientSummary.stats.totalDeliveries > 0 
                    ? Math.round((clientSummary.stats.postponed / clientSummary.stats.totalDeliveries) * 100) 
                    : 0}% du total
                </p>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-800 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Annulées
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-700">{clientSummary.stats.canceled}</div>
                <p className="text-xs text-red-600 mt-1">
                  {clientSummary.stats.totalDeliveries > 0 
                    ? Math.round((clientSummary.stats.canceled / clientSummary.stats.totalDeliveries) * 100) 
                    : 0}% du total
                </p>
              </CardContent>
            </Card>

          </div>

          {/* Deliveries Details - Mobile Cards */}
          <div className="block md:hidden space-y-4 mb-6">
            {clientSummary.deliveries.map((delivery) => {
              const amountToRemit = calculateAmountToRemit(delivery)
              return (
                <Card key={delivery.id} className="border-l-4" style={{ borderLeftColor: delivery.status === 'DELIVERED' || delivery.status === 'PAID' ? '#22c55e' : delivery.status === 'POSTPONED' ? '#f97316' : delivery.status === 'CANCELED' ? '#ef4444' : '#3b82f6' }}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm text-slate-500">
                        {new Date(delivery.plannedDate).toLocaleDateString("fr-FR")}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className={SIMPLIFIED_STATUS_COLORS[delivery.status]}>
                          {SIMPLIFIED_STATUS_LABELS[delivery.status]}
                        </Badge>
                        {delivery.status === 'POSTPONED' && delivery.postponedTo && (
                          <span className="text-xs text-purple-600">
                            Reportée au {new Date(delivery.postponedTo).toLocaleDateString("fr-FR")}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <div className="font-semibold text-slate-900">{delivery.receiverName}</div>
                      <div className="text-sm text-slate-600 mt-1">{delivery.receiverPhone}</div>
                      <div className="text-sm text-slate-500 mt-1">{delivery.receiverAddress}</div>
                    </div>

                    {/* Montants */}
                    <div className="bg-slate-50 p-3 rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Montant collecté:</span>
                        <span className="font-semibold">{(delivery.collectAmount || 0).toLocaleString()} Ar</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Frais livraison:</span>
                        <span className="font-semibold">{delivery.deliveryPrice.toLocaleString()} Ar</span>
                      </div>
                      <div className="flex justify-between text-sm border-t pt-2">
                        <span className="text-slate-700 font-medium">À remettre:</span>
                        <span className={`font-bold ${amountToRemit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                          {amountToRemit.toLocaleString()} Ar
                        </span>
                      </div>
                    </div>

                    {delivery.courierRemarks && (
                      <div className="bg-blue-50 p-3 rounded-lg border-l-2 border-blue-400">
                        <div className="text-xs text-blue-700 font-medium mb-1">Remarques</div>
                        <div className="text-sm text-blue-900">{delivery.courierRemarks}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Deliveries Details - Desktop Table */}
          <Card className="hidden md:block">
            <CardHeader>
              <CardTitle>Détail des livraisons</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Destinataire</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Adresse</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Collecté</TableHead>
                    <TableHead className="text-right">Frais</TableHead>
                    <TableHead className="text-right">À Remettre</TableHead>
                    <TableHead>Remarques</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientSummary.deliveries.map((delivery) => {
                    const amountToRemit = calculateAmountToRemit(delivery)
                    return (
                      <TableRow key={delivery.id}>
                        <TableCell>{new Date(delivery.plannedDate).toLocaleDateString("fr-FR")}</TableCell>
                        <TableCell className="font-medium">{delivery.receiverName}</TableCell>
                        <TableCell>{delivery.receiverPhone}</TableCell>
                        <TableCell className="text-slate-600 max-w-xs truncate">{delivery.receiverAddress}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge className={SIMPLIFIED_STATUS_COLORS[delivery.status]}>
                              {SIMPLIFIED_STATUS_LABELS[delivery.status]}
                            </Badge>
                            {delivery.status === 'POSTPONED' && delivery.postponedTo && (
                              <span className="text-xs text-purple-600">
                                Reportée au {new Date(delivery.postponedTo).toLocaleDateString("fr-FR")}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{(delivery.collectAmount || 0).toLocaleString()} Ar</TableCell>
                        <TableCell className="text-right">{delivery.deliveryPrice.toLocaleString()} Ar</TableCell>
                        <TableCell className={`text-right font-bold ${amountToRemit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                          {amountToRemit.toLocaleString()} Ar
                        </TableCell>
                        <TableCell>
                          {delivery.courierRemarks ? (
                            <div className="max-w-xs">
                              <div className="text-sm text-slate-700 bg-blue-50 p-2 rounded border-l-2 border-blue-200">
                                {delivery.courierRemarks}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-sm">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {/* Total Row */}
                  <TableRow className="bg-emerald-50 font-semibold border-t-2">
                    <TableCell colSpan={7} className="text-right">TOTAL À REMETTRE</TableCell>
                    <TableCell className={`text-right font-bold text-lg ${clientSummary.stats.totalToRemit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {clientSummary.stats.totalToRemit.toLocaleString()} Ar
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

