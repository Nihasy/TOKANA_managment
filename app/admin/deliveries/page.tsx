"use client"

import { SelectItem } from "@/components/ui/select"

import { SelectContent } from "@/components/ui/select"

import { SelectValue } from "@/components/ui/select"

import { SelectTrigger } from "@/components/ui/select"

import { Select } from "@/components/ui/select"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Calendar, Pencil } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

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
  note?: string
  courierRemarks?: string
  sender: {
    name: string
  }
  courier?: {
    id: string
    name: string
    email: string
  }
}

interface Courier {
  id: string
  name: string
  email: string
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
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [date, setDate] = useState("")
  const [status, setStatus] = useState("ALL")

  const { data: deliveries = [], isLoading } = useQuery<Delivery[]>({
    queryKey: ["deliveries", date, status],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (date) params.set("date", date)
      if (status !== "ALL") params.set("status", status)
      const res = await fetch(`/api/deliveries?${params}`)
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Erreur lors du chargement des livraisons")
      }
      return res.json() as Promise<Delivery[]>
    },
    retry: 2,
  })

  // Fetch couriers
  const { data: couriers = [] } = useQuery<Courier[]>({
    queryKey: ["couriers"],
    queryFn: async () => {
      const res = await fetch("/api/couriers")
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Erreur lors du chargement des livreurs")
      }
      return res.json()
    },
    retry: 2,
  })

  // Mutation to reassign courier
  const reassignCourierMutation = useMutation({
    mutationFn: async ({ deliveryId, courierId }: { deliveryId: string; courierId: string | null }) => {
      const res = await fetch(`/api/deliveries/${deliveryId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newCourierId: courierId }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Erreur lors de la réassignation")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] })
      toast({ title: "Livreur réassigné avec succès" })
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      })
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
          <Button className="cursor-pointer">
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
                className="cursor-pointer"
              >
                Réinitialiser
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="h-12 w-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
              <p className="text-slate-500">Chargement des livraisons...</p>
            </div>
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
                  <TableHead>Remarques</TableHead>
                  <TableHead className="text-right">Prix</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                    <TableCell>
                      <Select
                        value={delivery.courier?.id || "UNASSIGNED"}
                        onValueChange={(value) => {
                          reassignCourierMutation.mutate({
                            deliveryId: delivery.id,
                            courierId: value === "UNASSIGNED" ? null : value,
                          })
                        }}
                        disabled={reassignCourierMutation.isPending}
                      >
                        <SelectTrigger className="w-[180px] cursor-pointer">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UNASSIGNED" className="cursor-pointer">
                            <span className="text-slate-500 italic">Non assigné</span>
                          </SelectItem>
                          {couriers.map((courier) => (
                            <SelectItem key={courier.id} value={courier.id} className="cursor-pointer">
                              {courier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[delivery.status]}>{STATUS_LABELS[delivery.status]}</Badge>
                    </TableCell>
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
                    <TableCell className="text-right font-medium">{delivery.totalDue.toLocaleString()} Ar</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/deliveries/${delivery.id}/edit`}>
                        <Button variant="ghost" size="sm" className="cursor-pointer">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
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
