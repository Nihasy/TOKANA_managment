"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  Package,
  CheckCircle2,
  Phone,
  MapPin,
  Calendar,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ClientSettlement {
  client: {
    id: string;
    name: string;
    phone: string;
    pickupAddress: string;
  };
  deliveries: Array<{
    id: string;
    receiverName: string;
    receiverPhone: string;
    plannedDate: string;
    collectAmount: number | null;
    deliveryPrice: number;
    isPrepaid: boolean;
    isSettled: boolean;
    courier: {
      name: string;
    } | null;
  }>;
  totalToSettle: number;
  totalDeliveryFees: number;
}

interface SettlementsData {
  clients: ClientSettlement[];
  summary: {
    totalDeliveries: number;
    totalToSettle: number;
    totalDeliveryFees: number;
  };
}

export default function SettlementsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "settled" | "all">("pending");
  const [settleDialog, setSettleDialog] = useState<{
    open: boolean;
    client: ClientSettlement | null;
  }>({
    open: false,
    client: null,
  });

  // Fetch settlements data
  const { data, isLoading } = useQuery<SettlementsData>({
    queryKey: ["settlements", filter],
    queryFn: async () => {
      const res = await fetch(`/api/settlements?filter=${filter}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erreur lors du chargement des règlements");
      }
      return res.json();
    },
    retry: 2,
  });

  // Settle mutation
  const settleMutation = useMutation({
    mutationFn: async (deliveryIds: string[]) => {
      const res = await fetch("/api/settlements/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryIds }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to settle deliveries");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
      toast({
        title: "Règlement effectué",
        description: "Les livraisons ont été marquées comme réglées",
      });
      setSettleDialog({ open: false, client: null });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSettle = () => {
    if (settleDialog.client) {
      const deliveryIds = settleDialog.client.deliveries
        .filter((d) => !d.isSettled)
        .map((d) => d.id);
      settleMutation.mutate(deliveryIds);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 shadow-lg">
            <h1 className="text-2xl font-bold text-white">Règlements clients</h1>
            <p className="text-purple-100 mt-1">
              Gestion des versements aux expéditeurs (J+1)
            </p>
          </div>
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin"></div>
                  <DollarSign className="h-8 w-8 text-purple-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="text-slate-600 font-medium">Chargement des règlements...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 shadow-lg">
          <h1 className="text-2xl font-bold text-white">Règlements clients</h1>
          <p className="text-purple-100 mt-1">
            Gestion des versements aux expéditeurs (J+1)
          </p>
        </div>

        {/* Summary Cards */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Total à remettre</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {data.summary.totalToSettle.toLocaleString()} Ar
                    </p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <DollarSign className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Frais de livraison</p>
                    <p className="text-2xl font-bold text-green-600">
                      {data.summary.totalDeliveryFees.toLocaleString()} Ar
                    </p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Livraisons</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {data.summary.totalDeliveries}
                    </p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Package className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={filter === "pending" ? "default" : "outline"}
            onClick={() => setFilter("pending")}
            className={`cursor-pointer ${filter === "pending" ? "bg-gradient-to-r from-purple-600 to-pink-600" : ""}`}
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            En attente
          </Button>
          <Button
            variant={filter === "settled" ? "default" : "outline"}
            onClick={() => setFilter("settled")}
            className={`cursor-pointer ${filter === "settled" ? "bg-gradient-to-r from-green-600 to-emerald-600" : ""}`}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Réglées
          </Button>
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
            className="cursor-pointer"
          >
            Toutes
          </Button>
        </div>

        {/* Client Settlements List */}
        {data && data.clients.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>Aucun règlement {filter === "pending" ? "en attente" : "trouvé"}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {data?.clients.map((clientData) => (
              <Card
                key={clientData.client.id}
                className="border-l-4 border-l-purple-500 shadow-md hover:shadow-lg transition-shadow"
              >
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span className="font-bold text-purple-900">
                          {clientData.client.name}
                        </span>
                        <Badge
                          className={
                            clientData.deliveries.some((d) => !d.isSettled)
                              ? "bg-orange-100 text-orange-800"
                              : "bg-green-100 text-green-800"
                          }
                        >
                          {clientData.deliveries.filter((d) => !d.isSettled).length > 0
                            ? `${clientData.deliveries.filter((d) => !d.isSettled).length} à régler`
                            : "Réglé"}
                        </Badge>
                      </CardTitle>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {clientData.client.phone}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {clientData.client.pickupAddress}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate-600">À remettre</div>
                      <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        {clientData.totalToSettle.toLocaleString()} Ar
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Frais: {clientData.totalDeliveryFees.toLocaleString()} Ar
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {/* Deliveries List */}
                  <div className="space-y-2 mb-4">
                    {clientData.deliveries.map((delivery) => (
                      <div
                        key={delivery.id}
                        className={`p-3 rounded-lg border ${
                          delivery.isSettled
                            ? "bg-green-50 border-green-200"
                            : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm">
                                {delivery.receiverName}
                              </span>
                              {delivery.isPrepaid && (
                                <Badge variant="outline" className="text-xs">
                                  Prépayé
                                </Badge>
                              )}
                              {delivery.isSettled && (
                                <Badge className="bg-green-100 text-green-800 text-xs">
                                  ✓ Réglé
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-slate-600">
                              <div className="flex items-center gap-1 mb-0.5">
                                <Phone className="h-3 w-3" />
                                {delivery.receiverPhone}
                              </div>
                              <div className="flex items-center gap-1 mb-0.5">
                                <Calendar className="h-3 w-3" />
                                {new Date(delivery.plannedDate).toLocaleDateString("fr-FR")}
                              </div>
                              {delivery.courier && (
                                <div className="text-xs text-slate-500">
                                  Livreur: {delivery.courier.name}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            {delivery.isPrepaid ? (
                              <div className="text-sm text-slate-600">
                                <div className="text-xs">Frais uniquement</div>
                                <div className="font-semibold">
                                  {delivery.deliveryPrice.toLocaleString()} Ar
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm">
                                <div className="text-xs text-slate-600">Collecté</div>
                                <div className="font-semibold text-purple-700">
                                  {delivery.collectAmount?.toLocaleString() || 0} Ar
                                </div>
                                <div className="text-xs text-slate-500">
                                  - {delivery.deliveryPrice.toLocaleString()} Ar frais
                                </div>
                                <div className="text-xs font-semibold text-green-700 mt-1">
                                  = {((delivery.collectAmount || 0) - delivery.deliveryPrice).toLocaleString()} Ar
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Settle Button */}
                  {clientData.deliveries.some((d) => !d.isSettled) && (
                    <Button
                      onClick={() =>
                        setSettleDialog({ open: true, client: clientData })
                      }
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Marquer comme réglé ({clientData.totalToSettle.toLocaleString()} Ar)
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Settle Confirmation Dialog */}
      <Dialog
        open={settleDialog.open}
        onOpenChange={(open) =>
          setSettleDialog({ open, client: settleDialog.client })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer le règlement</DialogTitle>
            <DialogDescription>
              Confirmez que vous avez remis les fonds au client
            </DialogDescription>
          </DialogHeader>
          {settleDialog.client && (
            <div className="py-4">
              <div className="bg-purple-50 p-4 rounded-lg mb-4">
                <div className="font-semibold text-purple-900 mb-2">
                  {settleDialog.client.client.name}
                </div>
                <div className="text-sm text-slate-600 mb-3">
                  {settleDialog.client.deliveries.filter((d) => !d.isSettled).length} livraison(s)
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-slate-600">Montant à remettre:</span>
                  <span className="text-2xl font-bold text-purple-600">
                    {settleDialog.client.totalToSettle.toLocaleString()} Ar
                  </span>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    Cette action marquera toutes les livraisons de ce client comme réglées.
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSettleDialog({ open: false, client: null })}
              className="cursor-pointer"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSettle}
              disabled={settleMutation.isPending}
              className="bg-gradient-to-r from-purple-600 to-pink-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              {settleMutation.isPending ? (
                <>
                  <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Traitement...
                </>
              ) : (
                "Confirmer le règlement"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

