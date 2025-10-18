"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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

interface Client {
  id: string
  name: string
  phone: string
  pickupAddress: string
  pickupZone: "TANA_VILLE" | "PERIPHERIE" | "SUPER_PERIPHERIE"
  note?: string
}

const zoneLabels = {
  TANA_VILLE: "Tana-Ville",
  PERIPHERIE: "Périphérie",
  SUPER_PERIPHERIE: "Super-Périphérie",
}

const zoneColors = {
  TANA_VILLE: "bg-blue-100 text-blue-800",
  PERIPHERIE: "bg-orange-100 text-orange-800",
  SUPER_PERIPHERIE: "bg-purple-100 text-purple-800",
}

export default function ClientsPage() {
  const [search, setSearch] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["clients", search],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      const res = await fetch(`/api/clients?${params}`)
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Erreur lors du chargement des clients")
      }
      return res.json() as Promise<Client[]>
    },
    retry: 2,
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Erreur lors de la suppression")
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] })
      toast({ title: "Client supprimé avec succès" })
      setDeleteId(null)
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erreur lors de la suppression", 
        description: error.message,
        variant: "destructive" 
      })
    },
  })

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Clients</h1>
          <p className="text-slate-600 mt-1">Gérez vos clients expéditeurs</p>
        </div>
        <Link href="/admin/clients/new">
          <Button className="cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau client
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Rechercher par nom, téléphone ou adresse..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="h-12 w-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
              <p className="text-slate-500">Chargement des clients...</p>
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-8 text-slate-500">Aucun client trouvé</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Adresse de récupération</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.phone}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${zoneColors[client.pickupZone]}`}>
                        {zoneLabels[client.pickupZone]}
                      </span>
                    </TableCell>
                    <TableCell>{client.pickupAddress}</TableCell>
                    <TableCell className="text-slate-500">{client.note || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/clients/${client.id}/edit`}>
                          <Button variant="ghost" size="sm" className="cursor-pointer">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(client.id)} className="cursor-pointer">
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
              Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible.
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
