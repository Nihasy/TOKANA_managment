"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

export default function NewClientPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    pickupAddress: "",
    pickupZone: "TANA_VILLE" as "TANA_VILLE" | "PERIPHERIE" | "SUPER_PERIPHERIE",
    note: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) throw new Error("Failed to create client")

      toast({ title: "Client créé avec succès" })
      router.push("/admin/clients")
    } catch (error) {
      toast({ title: "Erreur lors de la création", variant: "destructive" })
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href="/admin/clients">
          <Button variant="ghost" size="sm" className="mb-4 cursor-pointer">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-slate-900">Nouveau client</h1>
        <p className="text-slate-600 mt-1">Créez un nouveau client expéditeur</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Informations du client</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pickupAddress">Adresse de récupération *</Label>
              <Textarea
                id="pickupAddress"
                value={formData.pickupAddress}
                onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
                required
                disabled={isLoading}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pickupZone">Zone de récupération *</Label>
              <Select
                value={formData.pickupZone}
                onValueChange={(value) => setFormData({ ...formData, pickupZone: value as "TANA_VILLE" | "PERIPHERIE" | "SUPER_PERIPHERIE" })}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une zone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TANA_VILLE">Tana-Ville</SelectItem>
                  <SelectItem value="PERIPHERIE">Périphérie</SelectItem>
                  <SelectItem value="SUPER_PERIPHERIE">Super-Périphérie</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-slate-500">
                Cette catégorie permet de mieux organiser les récupérations selon la localisation
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Note (optionnel)</Label>
              <Textarea
                id="note"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                disabled={isLoading}
                rows={2}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isLoading} className="cursor-pointer disabled:cursor-not-allowed">
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Création...
                  </>
                ) : (
                  "Créer le client"
                )}
              </Button>
              <Link href="/admin/clients">
                <Button type="button" variant="outline" disabled={isLoading} className="cursor-pointer disabled:cursor-not-allowed">
                  Annuler
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
