"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileDown, Calculator, CheckCircle2, DollarSign, FileText } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Delivery {
  id: string
  receiverName: string
  receiverAddress: string
  deliveryPrice: number
  collectAmount: number
  totalDue: number
  courierRemarks?: string
  courierSettled: boolean
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
  allCourierSettled: boolean
}

export default function SettlementReportPage() {
  const today = new Date().toISOString().split("T")[0]
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [courierId, setCourierId] = useState("")
  const [confirmDialog, setConfirmDialog] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

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
    queryKey: ["settlement", startDate, endDate, courierId],
    queryFn: async () => {
      if (!courierId) return null
      const params = new URLSearchParams({ startDate, endDate, courierId })
      const res = await fetch(`/api/reports/settlement?${params}`)
      if (!res.ok) throw new Error("Failed to fetch settlement data")
      return res.json()
    },
    enabled: !!courierId,
  })

  // Confirm courier settlement mutation
  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!settlementData) return
      const deliveryIds = settlementData.deliveries
        .filter((d) => !d.courierSettled)
        .map((d) => d.id)
      const res = await fetch("/api/reports/settlement/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryIds }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to confirm settlement")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settlement"] })
      toast({
        title: "✅ Règlement confirmé",
        description: "La réception de l'argent du livreur a été confirmée",
      })
      setConfirmDialog(false)
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const exportToCSV = () => {
    if (!settlementData) return

    const courier = couriers.find((c: { id: string; name: string }) => c.id === courierId)
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
    link.setAttribute("download", `reglement_${courierName}_${startDate}_${endDate}.csv`)
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
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="startDate">Date de début</Label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Date de fin</Label>
              <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="courier">Livreur</Label>
              <Select value={courierId} onValueChange={setCourierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un livreur" />
                </SelectTrigger>
                <SelectContent>
                  {couriers.map((courier: { id: string; name: string }) => (
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

          {/* Confirmation Button */}
          {!settlementData.allCourierSettled && (
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 mb-6">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-6 w-6 text-green-600 mt-1" />
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">
                        Confirmer la réception de l&apos;argent
                      </h3>
                      <p className="text-sm text-slate-600">
                        Le livreur {couriers.find((c: { id: string; name: string }) => c.id === courierId)?.name} doit vous remettre{" "}
                        <span className="font-bold text-green-700">
                          {settlementData.summary.totalARemettre.toLocaleString()} Ar
                        </span>
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setConfirmDialog(true)}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Confirmer réception
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {settlementData.allCourierSettled && (
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 mb-6">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <div>
                    <h3 className="font-semibold text-green-900">
                      ✅ Règlement confirmé
                    </h3>
                    <p className="text-sm text-green-700">
                      L&apos;argent a été reçu du livreur et enregistré
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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

          {/* Client Report Button */}
          <Card className="mt-6 bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
            <CardContent className="py-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <FileText className="h-6 w-6 text-indigo-600 mt-1 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">Compte Rendu Client</h3>
                    <p className="text-sm text-slate-600">
                      Générez des comptes rendus détaillés pour informer vos clients de l&apos;état de leurs livraisons
                    </p>
                  </div>
                </div>
                <Link href="/admin/reports/client-summary" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 cursor-pointer">
                    <FileText className="h-4 w-4 mr-2" />
                    Accéder aux comptes rendus
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la réception de l&apos;argent</DialogTitle>
            <DialogDescription>
              Confirmez que vous avez reçu l&apos;argent du livreur
            </DialogDescription>
          </DialogHeader>
          {settlementData && (
            <div className="py-4">
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <DollarSign className="h-8 w-8 text-green-600" />
                  <div>
                    <div className="font-semibold text-slate-900">
                      {couriers.find((c: { id: string; name: string }) => c.id === courierId)?.name}
                    </div>
                    <div className="text-sm text-slate-600">
                      {settlementData.summary.nbLivraisons} livraison(s) - Du {new Date(startDate).toLocaleDateString("fr-FR")} au {new Date(endDate).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Montants collectés:</span>
                    <span className="font-semibold">{settlementData.summary.totalCollect.toLocaleString()} Ar</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Frais de livraison:</span>
                    <span className="font-semibold">{settlementData.summary.totalDeliveryFees.toLocaleString()} Ar</span>
                  </div>
                  <div className="border-t border-green-200 pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-700 font-semibold">Total à recevoir:</span>
                      <span className="text-2xl font-bold text-green-700">
                        {settlementData.summary.totalARemettre.toLocaleString()} Ar
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    Cette action enregistrera que vous avez reçu l&apos;argent du livreur. Cette opération est irréversible.
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog(false)}
              className="cursor-pointer"
            >
              Annuler
            </Button>
            <Button
              onClick={() => confirmMutation.mutate()}
              disabled={confirmMutation.isPending}
              className="bg-gradient-to-r from-green-600 to-emerald-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              {confirmMutation.isPending ? (
                <>
                  <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Confirmation...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirmer la réception
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
