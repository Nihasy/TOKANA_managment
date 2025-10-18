"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { computePrice, type Zone } from "@/lib/pricing"

interface Client {
  id: string
  name: string
  phone: string
  pickupAddress: string
}

interface Courier {
  id: string
  name: string
  email: string
}

interface Delivery {
  id: string
  plannedDate: string
  senderId: string
  receiverName: string
  receiverPhone: string
  receiverAddress: string
  parcelCount: number
  weightKg: number
  description?: string
  note?: string
  zone: Zone
  isExpress: boolean
  deliveryPrice: number
  collectAmount: number
  isPrepaid: boolean
  courierId?: string
  sender: {
    id: string
    name: string
  }
  courier?: {
    id: string
    name: string
  }
}

export default function EditDeliveryPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const deliveryId = params.id as string

  const [formData, setFormData] = useState({
    plannedDate: "",
    senderId: "",
    receiverName: "",
    receiverPhone: "",
    receiverAddress: "",
    parcelCount: 1,
    weightKg: 1,
    description: "",
    note: "",
    zone: "TANA" as Zone,
    isExpress: false,
    deliveryPrice: 0,
    collectAmount: 0,
    isPrepaid: false,
    courierId: "UNASSIGNED",
  })

  // Fetch delivery data
  const { data: delivery, isLoading: isLoadingDelivery } = useQuery<Delivery>({
    queryKey: ["delivery", deliveryId],
    queryFn: async () => {
      const res = await fetch(`/api/deliveries/${deliveryId}`)
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Erreur lors du chargement de la livraison")
      }
      return res.json()
    },
    retry: 2,
  })

  // Fetch clients
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: async () => {
      const res = await fetch("/api/clients")
      if (!res.ok) throw new Error("Failed to fetch clients")
      return res.json()
    },
  })

  // Fetch couriers
  const { data: couriers = [] } = useQuery<Courier[]>({
    queryKey: ["couriers"],
    queryFn: async () => {
      const res = await fetch("/api/couriers")
      if (!res.ok) throw new Error("Failed to fetch couriers")
      return res.json()
    },
  })

  // Initialize form data when delivery is loaded
  useEffect(() => {
    if (delivery) {
      setFormData({
        plannedDate: delivery.plannedDate.split("T")[0],
        senderId: delivery.senderId,
        receiverName: delivery.receiverName,
        receiverPhone: delivery.receiverPhone,
        receiverAddress: delivery.receiverAddress,
        parcelCount: delivery.parcelCount,
        weightKg: delivery.weightKg,
        description: delivery.description || "",
        note: delivery.note || "",
        zone: delivery.zone,
        isExpress: delivery.isExpress,
        deliveryPrice: delivery.deliveryPrice,
        collectAmount: delivery.collectAmount,
        isPrepaid: delivery.isPrepaid,
        courierId: delivery.courierId || "UNASSIGNED",
      })
    }
  }, [delivery])

  // Calculate auto price when zone, weight, parcelCount, or express changes
  useEffect(() => {
    const pricing = computePrice({
      zone: formData.zone,
      weightKg: formData.weightKg,
      parcelCount: formData.parcelCount,
      isExpress: formData.isExpress,
    })
    setFormData((prev) => ({ ...prev, deliveryPrice: pricing.deliveryPrice }))
  }, [formData.zone, formData.weightKg, formData.parcelCount, formData.isExpress])

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch(`/api/deliveries/${deliveryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          collectAmount: data.collectAmount || undefined,
          courierId: data.courierId === "UNASSIGNED" ? undefined : data.courierId,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Erreur lors de la mise à jour")
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] })
      queryClient.invalidateQueries({ queryKey: ["delivery", deliveryId] })
      toast({ title: "Livraison mise à jour avec succès" })
      router.push("/admin/deliveries")
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate(formData)
  }

  if (isLoadingDelivery) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="h-12 w-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
              <p className="text-slate-500">Chargement de la livraison...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalDue = formData.isPrepaid 
    ? (formData.deliveryPrice || 0)
    : (formData.collectAmount || 0);

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href="/admin/deliveries">
          <Button variant="ghost" size="sm" className="mb-4 cursor-pointer">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-slate-900">Modifier la livraison</h1>
        <p className="text-slate-600 mt-1">Mettez à jour les informations de la livraison</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="plannedDate">Date planifiée *</Label>
                <Input
                  id="plannedDate"
                  type="date"
                  value={formData.plannedDate}
                  onChange={(e) => setFormData({ ...formData, plannedDate: e.target.value })}
                  required
                  disabled={updateMutation.isPending}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senderId">Client expéditeur *</Label>
                <Select
                  value={formData.senderId}
                  onValueChange={(value) => setFormData({ ...formData, senderId: value })}
                  required
                  disabled={updateMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} - {client.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="courierId">Livreur</Label>
                <Select
                  value={formData.courierId}
                  onValueChange={(value) => setFormData({ ...formData, courierId: value })}
                  disabled={updateMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Non assigné" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNASSIGNED">Non assigné</SelectItem>
                    {couriers.map((courier) => (
                      <SelectItem key={courier.id} value={courier.id}>
                        {courier.name} - {courier.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-slate-500">
                  Laissez "Non assigné" pour assigner plus tard
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Destinataire</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="receiverName">Nom du destinataire *</Label>
                <Input
                  id="receiverName"
                  value={formData.receiverName}
                  onChange={(e) => setFormData({ ...formData, receiverName: e.target.value })}
                  required
                  disabled={updateMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="receiverPhone">Téléphone *</Label>
                <Input
                  id="receiverPhone"
                  type="tel"
                  value={formData.receiverPhone}
                  onChange={(e) => setFormData({ ...formData, receiverPhone: e.target.value })}
                  required
                  disabled={updateMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="receiverAddress">Adresse de livraison *</Label>
                <Textarea
                  id="receiverAddress"
                  value={formData.receiverAddress}
                  onChange={(e) => setFormData({ ...formData, receiverAddress: e.target.value })}
                  required
                  disabled={updateMutation.isPending}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Colis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="parcelCount">Nombre de colis *</Label>
                <Input
                  id="parcelCount"
                  type="number"
                  min="1"
                  value={formData.parcelCount}
                  onChange={(e) => setFormData({ ...formData, parcelCount: Number.parseInt(e.target.value) })}
                  required
                  disabled={updateMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weightKg">Poids total (kg) *</Label>
                <Input
                  id="weightKg"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={formData.weightKg}
                  onChange={(e) => setFormData({ ...formData, weightKg: Number.parseFloat(e.target.value) })}
                  required
                  disabled={updateMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description du colis</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={updateMutation.isPending}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Note / Instructions</Label>
                <Textarea
                  id="note"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  disabled={updateMutation.isPending}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tarification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="zone">Zone *</Label>
                <Select
                  value={formData.zone}
                  onValueChange={(value) => setFormData({ ...formData, zone: value as Zone })}
                  disabled={updateMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TANA">Tana (ville)</SelectItem>
                    <SelectItem value="PERIPH">Périphérie (15-30 km)</SelectItem>
                    <SelectItem value="PROVINCE">Province</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isExpress"
                  checked={formData.isExpress}
                  onCheckedChange={(checked) => setFormData({ ...formData, isExpress: checked === true })}
                  disabled={updateMutation.isPending}
                />
                <Label htmlFor="isExpress" className="text-sm font-normal cursor-pointer">
                  Livraison express
                </Label>
              </div>

              <div className="space-y-2">
                <Label>Prix de livraison (calculé automatiquement)</Label>
                <div className="p-3 bg-slate-100 rounded-md">
                  <span className="text-lg font-semibold">{(formData.deliveryPrice || 0).toLocaleString()} Ar</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="collectAmount">Montant à collecter (Ar, optionnel)</Label>
                <Input
                  id="collectAmount"
                  type="number"
                  min="0"
                  value={formData.collectAmount}
                  onChange={(e) => setFormData({ ...formData, collectAmount: Number.parseInt(e.target.value) || 0 })}
                  disabled={updateMutation.isPending || formData.isPrepaid}
                />
                <p className="text-sm text-slate-500">
                  Prix du produit que le destinataire doit remettre au livreur
                </p>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="isPrepaid"
                  checked={formData.isPrepaid}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, isPrepaid: checked === true, collectAmount: checked ? 0 : formData.collectAmount })
                  }
                  disabled={updateMutation.isPending}
                />
                <Label 
                  htmlFor="isPrepaid" 
                  className="text-sm font-normal cursor-pointer"
                >
                  Paiement déjà effectué entre client et destinataire
                </Label>
              </div>
              <p className="text-xs text-slate-500 ml-6">
                Si coché, seuls les frais de livraison seront collectés
              </p>

              {formData.isPrepaid ? (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800 mb-1">
                    <strong>Montant total à remettre au client :</strong>
                  </p>
                  <p className="text-xs text-blue-600">
                    Seulement les frais de livraison seront collectés. Le client a déjà été payé par le destinataire.
                  </p>
                  <p className="text-lg font-bold text-blue-900 mt-2">
                    {(formData.deliveryPrice || 0).toLocaleString()} Ar
                  </p>
                </div>
              ) : formData.collectAmount > 0 ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800 mb-1">
                    <strong>À remettre au client (J+1) :</strong>
                  </p>
                  <div className="text-xs text-green-600 space-y-1">
                    <div>Collecté: {(formData.collectAmount || 0).toLocaleString()} Ar</div>
                    <div>- Frais livraison: {(formData.deliveryPrice || 0).toLocaleString()} Ar</div>
                  </div>
                  <p className="text-lg font-bold text-green-900 mt-2">
                    = {((formData.collectAmount || 0) - (formData.deliveryPrice || 0)).toLocaleString()} Ar
                  </p>
                </div>
              ) : null}

              <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
                <p className="text-sm text-purple-800 mb-1">
                  <strong>Total dû par le destinataire :</strong>
                </p>
                <p className="text-lg font-bold text-purple-900">
                  {(totalDue || 0).toLocaleString()} Ar
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-4 mt-6">
          <Button 
            type="submit" 
            disabled={updateMutation.isPending}
            className="cursor-pointer disabled:cursor-not-allowed"
          >
            {updateMutation.isPending ? (
              <>
                <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Mise à jour...
              </>
            ) : (
              "Mettre à jour"
            )}
          </Button>
          <Link href="/admin/deliveries">
            <Button 
              type="button" 
              variant="outline" 
              disabled={updateMutation.isPending}
              className="cursor-pointer disabled:cursor-not-allowed"
            >
              Annuler
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}

