"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
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

export default function NewDeliveryPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  // Set default date to tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const defaultDate = tomorrow.toISOString().split("T")[0]

  const [formData, setFormData] = useState({
    plannedDate: defaultDate,
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
    deliveryFeePrepaid: false,
    courierId: "UNASSIGNED",
  })

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const res = await fetch("/api/clients")
      if (!res.ok) throw new Error("Failed to fetch clients")
      return res.json()
    },
  })

  // Fetch couriers
  const { data: couriers = [] } = useQuery({
    queryKey: ["couriers"],
    queryFn: async () => {
      const res = await fetch("/api/couriers")
      if (!res.ok) throw new Error("Failed to fetch couriers")
      return res.json()
    },
  })

  // Calculate auto price when zone, weight, or express changes
  useEffect(() => {
    // Only calculate if we have valid data
    if (!formData.zone || !formData.weightKg) {
      return
    }
    
    try {
      const autoPrice = computePrice({
        zone: formData.zone,
        weightKg: formData.weightKg,
        isExpress: formData.isExpress,
      })
      setFormData((prev) => ({ ...prev, deliveryPrice: autoPrice }))
    } catch (error) {
      console.error('❌ Erreur lors du calcul du prix:', error)
    }
  }, [formData.zone, formData.weightKg, formData.isExpress])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch("/api/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          collectAmount: formData.collectAmount || undefined,
          courierId: formData.courierId === "UNASSIGNED" ? undefined : formData.courierId,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to create delivery")
      }

      toast({ title: "Livraison créée avec succès" })
      router.push("/admin/deliveries")
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Erreur lors de la création",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  // Calcul du montant total que le destinataire doit payer au livreur
  const totalDue = formData.deliveryFeePrepaid 
    ? (formData.isPrepaid ? 0 : (formData.collectAmount || 0))  // Si frais prépayés, seul le montant du produit
    : (formData.isPrepaid 
        ? formData.deliveryPrice  // Si isPrepaid, seulement les frais
        : formData.deliveryPrice + (formData.collectAmount || 0))  // Sinon tout
  
  // Calcul du montant à remettre au client (peut être négatif = débit)
  const amountToReturnToClient = formData.deliveryFeePrepaid
    ? (formData.collectAmount || 0) - formData.deliveryPrice  // Si frais prépayés, on déduit les frais
    : (formData.collectAmount || 0)  // Sinon, montant collecté sans les frais

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href="/admin/deliveries">
          <Button variant="ghost" size="sm" className="mb-4 cursor-pointer">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-slate-900">Nouvelle livraison</h1>
        <p className="text-slate-600 mt-1">Créez une livraison pour J-1 ou ultérieur</p>
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
                  disabled={isLoading}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senderId">Client expéditeur *</Label>
                <Select
                  value={formData.senderId}
                  onValueChange={(value) => setFormData({ ...formData, senderId: value })}
                  required
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client: any) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} - {client.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="courierId">Livreur (optionnel)</Label>
                <Select
                  value={formData.courierId}
                  onValueChange={(value) => setFormData({ ...formData, courierId: value })}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Assigner un livreur" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNASSIGNED">Non assigné</SelectItem>
                    {couriers.map((courier: any) => (
                      <SelectItem key={courier.id} value={courier.id}>
                        {courier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Récepteur</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="receiverName">Nom *</Label>
                <Input
                  id="receiverName"
                  value={formData.receiverName}
                  onChange={(e) => setFormData({ ...formData, receiverName: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="receiverPhone">Téléphone *</Label>
                <Input
                  id="receiverPhone"
                  value={formData.receiverPhone}
                  onChange={(e) => setFormData({ ...formData, receiverPhone: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="receiverAddress">Adresse *</Label>
                <Textarea
                  id="receiverAddress"
                  value={formData.receiverAddress}
                  onChange={(e) => setFormData({ ...formData, receiverAddress: e.target.value })}
                  required
                  disabled={isLoading}
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="parcelCount">Nombre de colis *</Label>
                  <Input
                    id="parcelCount"
                    type="number"
                    min="1"
                    value={formData.parcelCount}
                    onChange={(e) => setFormData({ ...formData, parcelCount: Number.parseInt(e.target.value) })}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weightKg">Poids (kg) *</Label>
                  <Input
                    id="weightKg"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={formData.weightKg}
                    onChange={(e) => setFormData({ ...formData, weightKg: Number.parseFloat(e.target.value) })}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optionnel)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={isLoading}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Remarque (optionnel)</Label>
                <Textarea
                  id="note"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  disabled={isLoading}
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
                  onValueChange={(value: Zone) => setFormData({ ...formData, zone: value })}
                  required
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TANA">TANA</SelectItem>
                    <SelectItem value="PERI">PERI</SelectItem>
                    <SelectItem value="SUPER">SUPER</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isExpress"
                  checked={formData.isExpress}
                  onCheckedChange={(checked) => setFormData({ ...formData, isExpress: checked as boolean })}
                  disabled={isLoading}
                />
                <Label htmlFor="isExpress" className="cursor-pointer">
                  Livraison express
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryPrice">Prix de livraison (Ar) *</Label>
                <Input
                  id="deliveryPrice"
                  type="number"
                  min="0"
                  value={formData.deliveryPrice}
                  onChange={(e) => setFormData({ ...formData, deliveryPrice: Number.parseInt(e.target.value) })}
                  required
                  disabled={isLoading}
                />
                <p className="text-sm text-slate-500">Prix calculé automatiquement, modifiable</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="collectAmount">Montant à collecter (Ar, optionnel)</Label>
                <Input
                  id="collectAmount"
                  type="number"
                  min="0"
                  value={formData.collectAmount}
                  onChange={(e) => setFormData({ ...formData, collectAmount: Number.parseInt(e.target.value) || 0 })}
                  disabled={isLoading || formData.isPrepaid}
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
                  disabled={isLoading}
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

              <div className="flex items-center space-x-2 pt-2 mt-2 border-t pt-4">
                <Checkbox
                  id="deliveryFeePrepaid"
                  checked={formData.deliveryFeePrepaid}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, deliveryFeePrepaid: checked === true })
                  }
                  disabled={isLoading}
                />
                <Label 
                  htmlFor="deliveryFeePrepaid" 
                  className="text-sm font-normal cursor-pointer"
                >
                  Frais de livraison déjà payés par le client
                </Label>
              </div>
              <p className="text-xs text-slate-500 ml-6">
                Si coché, les frais ne seront PAS collectés auprès du destinataire et seront déduits du règlement au client
              </p>

              <div className="pt-4 border-t">
                <div className="space-y-3">
                  {/* Affichage du total à collecter auprès du destinataire */}
                  <div className={`p-3 rounded ${formData.deliveryFeePrepaid ? 'bg-purple-50 border border-purple-200' : 'bg-blue-50 border border-blue-200'}`}>
                    <p className="text-sm font-medium mb-1">💰 Total à collecter auprès du destinataire:</p>
                    <p className="text-2xl font-bold text-purple-900">{(totalDue || 0).toLocaleString()} Ar</p>
                    {formData.deliveryFeePrepaid && (
                      <p className="text-xs text-purple-700 mt-1">⚠️ Frais prépayés : uniquement le montant du produit</p>
                    )}
                  </div>

                  {/* Calcul détaillé */}
                  {formData.deliveryFeePrepaid ? (
                    // Cas: Frais de livraison prépayés
                    <div className="bg-slate-50 p-3 rounded space-y-2">
                      <p className="text-sm font-medium text-slate-700">📊 Détail du règlement au client:</p>
                      <div className="flex justify-between text-sm">
                        <span>Montant collecté</span>
                        <span className="font-medium">{(formData.collectAmount || 0).toLocaleString()} Ar</span>
                      </div>
                      <div className="flex justify-between text-sm text-red-600">
                        <span>- Frais de livraison (déjà payés)</span>
                        <span className="font-medium">- {(formData.deliveryPrice || 0).toLocaleString()} Ar</span>
                      </div>
                      <div className={`flex justify-between text-lg font-bold pt-2 border-t ${amountToReturnToClient >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        <span>{amountToReturnToClient >= 0 ? '✅ À remettre au client:' : '⚠️ Débit client (à payer):'}</span>
                        <span>{Math.abs(amountToReturnToClient).toLocaleString()} Ar</span>
                      </div>
                      {amountToReturnToClient < 0 && (
                        <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
                          ⚠️ Le client doit {Math.abs(amountToReturnToClient).toLocaleString()} Ar car les frais dépassent le montant collecté
                        </p>
                      )}
                    </div>
                  ) : (
                    // Cas normal: Frais collectés auprès du destinataire
                    <>
                      {!formData.isPrepaid && formData.collectAmount > 0 && (
                        <div className="bg-green-50 p-3 rounded space-y-2">
                          <p className="text-sm font-medium text-green-700">📊 Détail:</p>
                          <div className="flex justify-between text-sm">
                            <span>Montant collecté total</span>
                            <span className="font-medium">{((formData.collectAmount || 0) + (formData.deliveryPrice || 0)).toLocaleString()} Ar</span>
                          </div>
                          <div className="flex justify-between text-sm text-slate-600">
                            <span>- Frais de livraison</span>
                            <span>- {(formData.deliveryPrice || 0).toLocaleString()} Ar</span>
                          </div>
                          <div className="flex justify-between text-lg font-bold text-green-600 pt-2 border-t">
                            <span>✅ À remettre au client:</span>
                            <span>{(formData.collectAmount || 0).toLocaleString()} Ar</span>
                          </div>
                        </div>
                      )}
                      {formData.isPrepaid && (
                        <div className="bg-amber-50 p-3 rounded">
                          <p className="text-sm text-amber-700">ℹ️ Paiement prépayé : seuls les frais de livraison seront collectés</p>
                          <p className="text-lg font-bold text-amber-900 mt-1">{(formData.deliveryPrice || 0).toLocaleString()} Ar à remettre au client</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-4 mt-6">
          <Button type="submit" disabled={isLoading} className="cursor-pointer disabled:cursor-not-allowed">
            {isLoading ? (
              <>
                <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Création...
              </>
            ) : (
              "Créer la livraison"
            )}
          </Button>
          <Link href="/admin/deliveries">
            <Button type="button" variant="outline" disabled={isLoading} className="cursor-pointer disabled:cursor-not-allowed">
              Annuler
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
