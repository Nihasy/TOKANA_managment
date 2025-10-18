"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Pencil, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Courier {
  id: string
  name: string
  email: string
  phone?: string
  role: string
  createdAt: string
}

export default function CouriersPage() {
  const [search, setSearch] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: couriers = [], isLoading } = useQuery({
    queryKey: ["couriers", search],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      const res = await fetch(`/api/couriers?${params}`)
      if (!res.ok) throw new Error("Failed to fetch couriers")
      return res.json() as Promise<Courier[]>
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/couriers/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to delete courier")
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["couriers"] })
      toast({ title: "Livreur supprimé avec succès" })
      setDeleteId(null)
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" })
    },
  })

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Livreurs</h1>
          <p className="text-slate-600 mt-1">Gérez vos livreurs</p>
        </div>
        <Link href="/admin/couriers/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau livreur
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Rechercher par nom ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Chargement...</div>
          ) : couriers.length === 0 ? (
            <div className="text-center py-8 text-slate-500">Aucun livreur trouvé</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {couriers.map((courier) => (
                  <TableRow key={courier.id}>
                    <TableCell className="font-medium">{courier.name}</TableCell>
                    <TableCell>{courier.email}</TableCell>
                    <TableCell>{courier.phone || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{courier.role}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/couriers/${courier.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(courier.id)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce livreur ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
              className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleteMutation.isPending ? (
                <>
                  <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                  Suppression...
                </>
              ) : (
                "Supprimer"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
