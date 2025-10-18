"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

export default function EditClientPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    pickupAddress: "",
    note: "",
  })

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/clients?search=${params.id}`)
      if (!res.ok) throw new Error("Failed to fetch client")
      const clients = await res.json()
      return clients.find((c: any) => c.id === params.id)
    },
  })

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        phone: client.phone,
        pickupAddress: client.pickupAddress,
        note: client.note || "",
      })
    }
  }, [client])

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/clients/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error("Failed to update client")
    },
    onSuccess: () => {
      toast({ title: "Client mis à jour avec succès" })
      router.push("/admin/clients")
    },
    onError: () => {
      toast({ title: "Erreur lors de la mise à jour", variant: "destructive" })
    },
  })

  if (isLoading) {
    return <div className="p-8">Chargement...</div>
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
        <h1 className="text-3xl font-bold text-slate-900">Modifier le client</h1>
        <p className="text-slate-600 mt-1">Mettez à jour les informations du client</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Informations du client</CardTitle>
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
              <Label htmlFor="phone">Téléphone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                disabled={updateMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pickupAddress">Adresse de récupération *</Label>
              <Textarea
                id="pickupAddress"
                value={formData.pickupAddress}
                onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
                required
                disabled={updateMutation.isPending}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Note (optionnel)</Label>
              <Textarea
                id="note"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                disabled={updateMutation.isPending}
                rows={2}
              />
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
              <Link href="/admin/clients">
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
