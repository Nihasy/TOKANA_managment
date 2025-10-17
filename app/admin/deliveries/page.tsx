"use client"

import { SelectItem } from "@/components/ui/select"

import { SelectContent } from "@/components/ui/select"

import { SelectValue } from "@/components/ui/select"

import { SelectTrigger } from "@/components/ui/select"

import { Select } from "@/components/ui/select"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Calendar } from "lucide-react"

interface Delivery {
  id: string
  plannedDate: string
  receiverName: string
  receiverPhone: string
  receiverAddress: string
  status: string
  zone: string
  isExpress: boolean
  deliveryPrice: number
  totalDue: number
  sender: {
    name: string
  }
  courier?: {
    name: string
  }
}

const STATUS_COLORS: Record<string, string> = {
  CREATED: "bg-blue-100 text-blue-800",
  PICKED_UP: "bg-yellow-100 text-yellow-800",
  DELIVERED: "bg-green-100 text-green-800",
  PAID: "bg-emerald-100 text-emerald-800",
  POSTPONED: "bg-orange-100 text-orange-800",
  CANCELED: "bg-red-100 text-red-800",
}

const STATUS_LABELS: Record<string, string> = {
  CREATED: "Créée",
  PICKED_UP: "Récupérée",
  DELIVERED: "Livrée",
  PAID: "Payée",
  POSTPONED: "Reportée",
  CANCELED: "Annulée",
}

export default function DeliveriesPage() {
  const [date, setDate] = useState("")
  const [status, setStatus] = useState("ALL")

  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ["deliveries", date, status],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (date) params.set("date", date)
      if (status !== "ALL") params.set("status", status)
      const res = await fetch(`/api/deliveries?${params}`)
      if (!res.ok) throw new Error("Failed to fetch deliveries")
      return res.json() as Promise<Delivery[]>
    },
  })

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Livraisons</h1>
          <p className="text-slate-600 mt-1">Gérez toutes les livraisons</p>
        </div>
        <Link href="/admin/deliveries/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle livraison
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                <SelectItem value="CREATED">Créée</SelectItem>
                <SelectItem value="PICKED_UP">Récupérée</SelectItem>
                <SelectItem value="DELIVERED">Livrée</SelectItem>
                <SelectItem value="PAID">Payée</SelectItem>
                <SelectItem value="POSTPONED">Reportée</SelectItem>
                <SelectItem value="CANCELED">Annulée</SelectItem>
              </SelectContent>
            </Select>
            {(date || status !== "ALL") && (
              <Button
                variant="outline"
                onClick={() => {
                  setDate("")
                  setStatus("ALL")
                }}
              >
                Réinitialiser
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Chargement...</div>
          ) : deliveries.length === 0 ? (
            <div className="text-center py-8 text-slate-500">Aucune livraison trouvée</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Expéditeur</TableHead>
                  <TableHead>Récepteur</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Livreur</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Prix</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.map((delivery) => (
                  <TableRow key={delivery.id}>
                    <TableCell>{new Date(delivery.plannedDate).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="font-medium">{delivery.sender.name}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{delivery.receiverName}</div>
                        <div className="text-sm text-slate-500">{delivery.receiverPhone}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{delivery.zone}</Badge>
                        {delivery.isExpress && <Badge variant="secondary">Express</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>{delivery.courier?.name || "-"}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[delivery.status]}>{STATUS_LABELS[delivery.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{delivery.totalDue.toLocaleString()} Ar</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
