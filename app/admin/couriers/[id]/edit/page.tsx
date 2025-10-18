"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

export default function EditCourierPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { toast } = useToast()
  const { id } = use(params)
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    phone: "",
    password: "",
  })

  const { data: courier, isLoading } = useQuery({
    queryKey: ["courier", id],
    queryFn: async () => {
      const res = await fetch(`/api/couriers/${id}`)
      if (!res.ok) throw new Error("Failed to fetch courier")
      return res.json()
    },
  })

  useEffect(() => {
    if (courier) {
      setFormData({
        email: courier.email,
        name: courier.name,
        phone: courier.phone || "",
        password: "",
      })
    }
  }, [courier])

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/couriers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to update courier")
      }
    },
    onSuccess: () => {
      toast({ title: "Livreur mis à jour avec succès" })
      router.push("/admin/couriers")
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" })
    },
  })

  if (isLoading) {
    return <div className="p-8">Chargement...</div>
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
        <h1 className="text-3xl font-bold text-slate-900">Modifier le livreur</h1>
        <p className="text-slate-600 mt-1">Mettez à jour les informations du livreur</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Informations du livreur</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              updateMutation.mutate()
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Nom *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={updateMutation.isPending}
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
                disabled={updateMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone (optionnel)</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={updateMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Nouveau mot de passe (optionnel)</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={updateMutation.isPending}
                minLength={6}
              />
              <p className="text-sm text-slate-500">Laissez vide pour conserver le mot de passe actuel</p>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={updateMutation.isPending} className="cursor-pointer disabled:cursor-not-allowed">
                {updateMutation.isPending ? (
                  <>
                    <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Mise à jour...
                  </>
                ) : (
                  "Mettre à jour"
                )}
              </Button>
              <Link href="/admin/couriers">
                <Button type="button" variant="outline" disabled={updateMutation.isPending} className="cursor-pointer disabled:cursor-not-allowed">
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
