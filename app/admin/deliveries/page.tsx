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
import { Plus, Calendar, Pencil, Users, Truck, Filter } from "lucide-react"
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
  CREATED: "bg-slate-100 text-slate-700",
  PICKED_UP: "bg-yellow-100 text-yellow-800",
  DELIVERED: "bg-green-100 text-green-800",
  PAID: "bg-emerald-100 text-emerald-800",
  POSTPONED: "bg-purple-100 text-purple-800",
  CANCELED: "bg-red-100 text-red-800",
}

// Removed unused STATUS_LABELS - using SIMPLIFIED_STATUS_LABELS instead

interface Client {
  id: string
  name: string
  phone: string
}

export default function DeliveriesPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const today = new Date().toISOString().split("T")[0]
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [status, setStatus] = useState("ALL")
  const [selectedClientId, setSelectedClientId] = useState("ALL")
  const [selectedCourierId, setSelectedCourierId] = useState("ALL")

  const { data: deliveries = [], isLoading } = useQuery<Delivery[]>({
    queryKey: ["deliveries", startDate, endDate, status, selectedClientId, selectedCourierId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (startDate) params.set("startDate", startDate)
      if (endDate) params.set("endDate", endDate)
      if (status !== "ALL") params.set("status", status)
      if (selectedClientId !== "ALL") params.set("clientId", selectedClientId)
      if (selectedCourierId !== "ALL") params.set("courierId", selectedCourierId)
      const res = await fetch(`/api/deliveries?${params}`)
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Erreur lors du chargement des livraisons")
      }
      return res.json() as Promise<Delivery[]>
    },
    retry: 2,
  })

  // Fetch clients
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: async () => {
      const res = await fetch("/api/clients")
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Erreur lors du chargement des clients")
      }
      return res.json()
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

  // Mutation to change status
  const changeStatusMutation = useMutation({
    mutationFn: async ({ deliveryId, newStatus }: { deliveryId: string; newStatus: string }) => {
      const res = await fetch(`/api/deliveries/${deliveryId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Erreur lors du changement de statut")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] })
      toast({ title: "Statut mis à jour avec succès" })
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
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Livraisons</h1>
          <p className="text-slate-600 mt-1 text-sm md:text-base">Gérez toutes les livraisons</p>
        </div>
        <Link href="/admin/deliveries/new" className="w-full sm:w-auto">
          <Button className="cursor-pointer w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Nouvelle livraison</span>
            <span className="sm:hidden">Nouvelle</span>
          </Button>
        </Link>
      </div>

      <Card className="border-t-4 border-t-blue-500 shadow-md">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 py-3">
          <div className="space-y-2.5">
            {/* Titre Section Filtres - Compact */}
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-500 rounded-md">
                <Filter className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-none">Filtres</h3>
                <p className="text-xs text-slate-600 mt-0.5">Affinez vos résultats</p>
              </div>
            </div>

            {/* Ligne 1 : Dates avec style compact */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex items-center gap-2 flex-1 bg-white p-2 rounded-lg border-2 border-blue-200 shadow-sm hover:border-blue-400 transition-colors">
                <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-md shrink-0">
                  <Calendar className="h-4 w-4 text-white" />
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-slate-600 block leading-none mb-0.5">Du</label>
                    <Input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)} 
                      className="w-full border-0 p-0 h-6 focus-visible:ring-0 text-sm" 
                    />
                  </div>
                  <span className="text-slate-400 font-bold text-sm">→</span>
                  <div className="flex-1">
                    <label className="text-xs font-medium text-slate-600 block leading-none mb-0.5">Au</label>
                    <Input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)} 
                      className="w-full border-0 p-0 h-6 focus-visible:ring-0 text-sm" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Ligne 2 : Filtres Client, Livreur, Statut - Compact */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Filtre Client - Compact */}
              <div className="bg-white p-2 rounded-lg border-2 border-emerald-200 shadow-sm hover:border-emerald-400 transition-colors">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="p-1 bg-gradient-to-br from-emerald-500 to-green-600 rounded">
                    <Users className="h-3.5 w-3.5 text-white" />
                  </div>
                  <label className="text-xs font-semibold text-emerald-700 leading-none">Client</label>
                </div>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger className="w-full border-0 p-0 h-7 focus:ring-0 text-sm">
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                        Tous les clients
                      </div>
                    </SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                          {client.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtre Livreur - Compact */}
              <div className="bg-white p-2 rounded-lg border-2 border-orange-200 shadow-sm hover:border-orange-400 transition-colors">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="p-1 bg-gradient-to-br from-orange-500 to-amber-600 rounded">
                    <Truck className="h-3.5 w-3.5 text-white" />
                  </div>
                  <label className="text-xs font-semibold text-orange-700 leading-none">Livreur</label>
                </div>
                <Select value={selectedCourierId} onValueChange={setSelectedCourierId}>
                  <SelectTrigger className="w-full border-0 p-0 h-7 focus:ring-0 text-sm">
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                        Tous les livreurs
                      </div>
                    </SelectItem>
                    <SelectItem value="UNASSIGNED">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        Non assigné
                      </div>
                    </SelectItem>
                    {couriers.map((courier) => (
                      <SelectItem key={courier.id} value={courier.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                          {courier.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtre Statut - Compact */}
              <div className="bg-white p-2 rounded-lg border-2 border-purple-200 shadow-sm hover:border-purple-400 transition-colors">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="p-1 bg-gradient-to-br from-purple-500 to-violet-600 rounded">
                    <Filter className="h-3.5 w-3.5 text-white" />
                  </div>
                  <label className="text-xs font-semibold text-purple-700 leading-none">Statut</label>
                </div>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-full border-0 p-0 h-7 focus:ring-0 text-sm">
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                        Tous les statuts
                      </div>
                    </SelectItem>
                    <SelectItem value="CREATED">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                        Créée
                      </div>
                    </SelectItem>
                    <SelectItem value="PICKED_UP">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-600"></div>
                        Récupérée
                      </div>
                    </SelectItem>
                    <SelectItem value="DELIVERED">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-600"></div>
                        Livrée
                      </div>
                    </SelectItem>
                    <SelectItem value="PAID">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
                        Payée
                      </div>
                    </SelectItem>
                    <SelectItem value="POSTPONED">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-600"></div>
                        Reportée
                      </div>
                    </SelectItem>
                    <SelectItem value="CANCELED">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-600"></div>
                        Annulée
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Bouton Réinitialiser - Compact */}
            {(startDate !== today || endDate !== today || status !== "ALL" || selectedClientId !== "ALL" || selectedCourierId !== "ALL") && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStartDate(today)
                    setEndDate(today)
                    setStatus("ALL")
                    setSelectedClientId("ALL")
                    setSelectedCourierId("ALL")
                  }}
                  className="cursor-pointer bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 border-2 border-slate-300 text-slate-700 font-semibold shadow-sm hover:shadow-md transition-all h-7 text-xs px-3"
                >
                  <Filter className="h-3 w-3 mr-1.5" />
                  Réinitialiser
                </Button>
              </div>
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
            <>
              {/* Vue Mobile - Cards */}
              <div className="block md:hidden space-y-4">
                {deliveries.map((delivery) => (
                  <Card key={delivery.id} className="border-l-4" style={{ borderLeftColor: delivery.status === 'CREATED' ? '#64748b' : delivery.status === 'PICKED_UP' ? '#eab308' : delivery.status === 'DELIVERED' ? '#22c55e' : delivery.status === 'PAID' ? '#10b981' : delivery.status === 'POSTPONED' ? '#a855f7' : '#ef4444' }}>
                    <CardContent className="p-4 space-y-3">
                      {/* En-tête avec date et statut */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm text-slate-500">
                          {new Date(delivery.plannedDate).toLocaleDateString("fr-FR")}
                        </div>
                        <Select
                          value={delivery.status}
                          onValueChange={(newStatus) => {
                            changeStatusMutation.mutate({
                              deliveryId: delivery.id,
                              newStatus,
                            })
                          }}
                          disabled={changeStatusMutation.isPending}
                        >
                          <SelectTrigger className={`w-[130px] h-7 text-xs cursor-pointer ${STATUS_COLORS[delivery.status]} border-0`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CREATED" className="cursor-pointer text-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                                Créée
                              </div>
                            </SelectItem>
                            <SelectItem value="PICKED_UP" className="cursor-pointer text-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-yellow-600"></div>
                                Récupérée
                              </div>
                            </SelectItem>
                            <SelectItem value="DELIVERED" className="cursor-pointer text-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-600"></div>
                                Livrée
                              </div>
                            </SelectItem>
                            <SelectItem value="PAID" className="cursor-pointer text-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
                                Payée
                              </div>
                            </SelectItem>
                            <SelectItem value="POSTPONED" className="cursor-pointer text-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-orange-600"></div>
                                Reportée
                              </div>
                            </SelectItem>
                            <SelectItem value="CANCELED" className="cursor-pointer text-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-600"></div>
                                Annulée
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Expéditeur */}
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Expéditeur</div>
                        <div className="font-semibold text-slate-900">{delivery.sender.name}</div>
                      </div>

                      {/* Destinataire */}
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <div className="text-xs text-slate-500 mb-1">Destinataire</div>
                        <div className="font-semibold text-slate-900">{delivery.receiverName}</div>
                        <div className="text-sm text-slate-600 mt-1">{delivery.receiverPhone}</div>
                      </div>

                      {/* Zone et Express */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{delivery.zone}</Badge>
                        {delivery.isExpress && <Badge variant="secondary" className="text-xs">⚡ Express</Badge>}
                      </div>

                      {/* Livreur */}
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Livreur assigné</div>
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
                          <SelectTrigger className="w-full cursor-pointer h-9">
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
                      </div>

                      {/* Remarques livreur */}
                      {delivery.courierRemarks && (
                        <div className="bg-blue-50 p-3 rounded-lg border-l-2 border-blue-400">
                          <div className="text-xs text-blue-700 font-medium mb-1">
                            Remarques - {delivery.courier?.name}
                          </div>
                          <div className="text-sm text-blue-900">{delivery.courierRemarks}</div>
                        </div>
                      )}

                      {/* Prix et actions */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div>
                          <div className="text-xs text-slate-500">Montant</div>
                          <div className="text-lg font-bold text-slate-900">{delivery.totalDue.toLocaleString()} Ar</div>
                        </div>
                        <Link href={`/admin/deliveries/${delivery.id}/edit`}>
                          <Button size="sm" className="cursor-pointer">
                            <Pencil className="h-4 w-4 mr-2" />
                            Modifier
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Vue Desktop - Table */}
              <div className="hidden md:block">
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
                      <Select
                        value={delivery.status}
                        onValueChange={(newStatus) => {
                          changeStatusMutation.mutate({
                            deliveryId: delivery.id,
                            newStatus,
                          })
                        }}
                        disabled={changeStatusMutation.isPending}
                      >
                        <SelectTrigger className={`w-[150px] cursor-pointer ${STATUS_COLORS[delivery.status]} border-0`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CREATED" className="cursor-pointer">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                              Créée
                            </div>
                          </SelectItem>
                          <SelectItem value="PICKED_UP" className="cursor-pointer">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-yellow-600"></div>
                              Récupérée
                            </div>
                          </SelectItem>
                          <SelectItem value="DELIVERED" className="cursor-pointer">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-600"></div>
                              Livrée
                            </div>
                          </SelectItem>
                          <SelectItem value="PAID" className="cursor-pointer">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
                              Payée
                            </div>
                          </SelectItem>
                          <SelectItem value="POSTPONED" className="cursor-pointer">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-orange-600"></div>
                              Reportée
                            </div>
                          </SelectItem>
                          <SelectItem value="CANCELED" className="cursor-pointer">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-red-600"></div>
                              Annulée
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
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
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
