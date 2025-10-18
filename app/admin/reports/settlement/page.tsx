"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileDown, Calculator } from "lucide-react"

interface Delivery {
  id: string
  receiverName: string
  receiverAddress: string
  deliveryPrice: number
  collectAmount: number
  totalDue: number
  courierRemarks?: string
  courier?: {
    name: string
  }
  sender: {
    name: string
  }
}

interface SettlementData {
  deliveries: Delivery[]
  summary: {
    nbLivraisons: number
    totalCollect: number
    totalDeliveryFees: number
    totalARemettre: number
  }
}

export default function SettlementReportPage() {
  const today = new Date().toISOString().split("T")[0]
  const [date, setDate] = useState(today)
  const [courierId, setCourierId] = useState("")

  // Fetch couriers
  const { data: couriers = [] } = useQuery({
    queryKey: ["couriers"],
    queryFn: async () => {
      const res = await fetch("/api/couriers")
      if (!res.ok) throw new Error("Failed to fetch couriers")
      return res.json()
    },
  })

  // Fetch settlement data
  const { data: settlementData, isLoading } = useQuery<SettlementData>({
    queryKey: ["settlement", date, courierId],
    queryFn: async () => {
      if (!courierId) return null
      const params = new URLSearchParams({ date, courierId })
      const res = await fetch(`/api/reports/settlement?${params}`)
      if (!res.ok) throw new Error("Failed to fetch settlement data")
      return res.json()
    },
    enabled: !!courierId,
  })

  const exportToCSV = () => {
    if (!settlementData) return

    const courier = couriers.find((c: any) => c.id === courierId)
    const courierName = courier?.name || "Unknown"

    // CSV headers
    const headers = ["Expéditeur", "Récepteur", "Adresse", "Frais de livraison", "Montant collecté", "Total"]

    // CSV rows
    const rows = settlementData.deliveries.map((d) => [
      d.sender.name,
      d.receiverName,
      d.receiverAddress,
      d.deliveryPrice,
      d.collectAmount || 0,
      d.totalDue,
    ])

    // Add summary row
    rows.push([])
    rows.push([
      "",
      "",
      "TOTAL",
      settlementData.summary.totalDeliveryFees,
      settlementData.summary.totalCollect,
      settlementData.summary.totalARemettre,
    ])

    // Convert to CSV string
    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n")

    // Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `reglement_${courierName}_${date}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Règlement du soir</h1>
        <p className="text-slate-600 mt-1">Calculez les sommes à remettre par livreur</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="courier">Livreur</Label>
              <Select value={courierId} onValueChange={setCourierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un livreur" />
                </SelectTrigger>
                <SelectContent>
                  {couriers.map((courier: any) => (
                    <SelectItem key={courier.id} value={courier.id}>
                      {courier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!courierId ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            <Calculator className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p>Sélectionnez une date et un livreur pour voir le règlement</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">Chargement...</CardContent>
        </Card>
      ) : !settlementData || settlementData.deliveries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            <p>Aucune livraison payée trouvée pour cette date et ce livreur</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Nombre de livraisons</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{settlementData.summary.nbLivraisons}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Montants collectés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {settlementData.summary.totalCollect.toLocaleString()} Ar
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Frais de livraison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {settlementData.summary.totalDeliveryFees.toLocaleString()} Ar
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary text-primary-foreground">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total à remettre</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{settlementData.summary.totalARemettre.toLocaleString()} Ar</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Détail des livraisons</CardTitle>
              <Button onClick={exportToCSV} variant="outline" size="sm">
                <FileDown className="h-4 w-4 mr-2" />
                Exporter CSV
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Expéditeur</TableHead>
                    <TableHead>Récepteur</TableHead>
                    <TableHead>Adresse</TableHead>
                    <TableHead>Remarques livreur</TableHead>
                    <TableHead className="text-right">Frais livraison</TableHead>
                    <TableHead className="text-right">Montant collecté</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settlementData.deliveries.map((delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell className="font-medium">{delivery.sender.name}</TableCell>
                      <TableCell>{delivery.receiverName}</TableCell>
                      <TableCell className="text-slate-600">{delivery.receiverAddress}</TableCell>
                      <TableCell>
                        {delivery.courierRemarks ? (
                          <div className="max-w-xs">
                            <div className="text-xs text-slate-500 mb-1">
                              {delivery.courier?.name ? `Livreur ${delivery.courier.name}:` : "Remarques:"}
                            </div>
                            <div className="text-sm text-slate-700 bg-blue-50 p-2 rounded border-l-2 border-blue-200">
                              {delivery.courierRemarks}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{delivery.deliveryPrice.toLocaleString()} Ar</TableCell>
                      <TableCell className="text-right">{(delivery.collectAmount || 0).toLocaleString()} Ar</TableCell>
                      <TableCell className="text-right font-medium">{delivery.totalDue.toLocaleString()} Ar</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-slate-50 font-semibold">
                    <TableCell colSpan={4}>TOTAL</TableCell>
                    <TableCell className="text-right">
                      {settlementData.summary.totalDeliveryFees.toLocaleString()} Ar
                    </TableCell>
                    <TableCell className="text-right">
                      {settlementData.summary.totalCollect.toLocaleString()} Ar
                    </TableCell>
                    <TableCell className="text-right text-primary">
                      {settlementData.summary.totalARemettre.toLocaleString()} Ar
                    </TableCell>
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
