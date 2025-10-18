"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

export default function NewCourierPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    phone: "",
    password: "",
    role: "COURIER" as const,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch("/api/couriers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to create courier")
      }

      toast({ title: "Livreur créé avec succès" })
      router.push("/admin/couriers")
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Erreur lors de la création",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href="/admin/couriers">
          <Button variant="ghost" size="sm" className="mb-4 cursor-pointer">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-slate-900">Nouveau livreur</h1>
        <p className="text-slate-600 mt-1">Créez un nouveau compte livreur</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Informations du livreur</CardTitle>
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
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone (optionnel)</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={isLoading}
                minLength={6}
              />
              <p className="text-sm text-slate-500">Minimum 6 caractères</p>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isLoading} className="cursor-pointer disabled:cursor-not-allowed">
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Création...
                  </>
                ) : (
                  "Créer le livreur"
                )}
              </Button>
              <Link href="/admin/couriers">
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
