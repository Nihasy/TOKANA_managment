"use client";

import { useState } from "react";
import * as Accordion from "@radix-ui/react-accordion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, MapPin, Package, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Delivery {
  id: string;
  plannedDate: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  status:
    | "CREATED"
    | "PICKED_UP"
    | "DELIVERED"
    | "PAID"
    | "POSTPONED"
    | "CANCELED";
  zone: string | null;
  isExpress: boolean;
  parcelCount: number;
  weightKg: number;
  description?: string;
  note?: string;
  totalDue: number;
  sender: {
    name: string;
    pickupAddress: string;
    phone: string;
  };
}

const STATUS_COLORS: Record<Delivery["status"], string> = {
  CREATED: "bg-blue-100 text-blue-800",
  PICKED_UP: "bg-yellow-100 text-yellow-800",
  DELIVERED: "bg-green-100 text-green-800",
  PAID: "bg-emerald-100 text-emerald-800",
  POSTPONED: "bg-orange-100 text-orange-800",
  CANCELED: "bg-slate-200 text-slate-600",
};

const STATUS_LABELS: Record<Delivery["status"], string> = {
  CREATED: "À récupérer",
  PICKED_UP: "Récupérée",
  DELIVERED: "Livrée",
  PAID: "Payée",
  POSTPONED: "Reportée",
  CANCELED: "Annulée",
};

export default function CourierTodayPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [postponeDialog, setPostponeDialog] = useState<{
    open: boolean;
    deliveryId: string | null;
  }>({
    open: false,
    deliveryId: null,
  });
  const [postponeDate, setPostponeDate] = useState("");

  // Date du jour (YYYY-MM-DD)
  const today = new Date().toISOString().split("T")[0];

  // --- Query : livraisons assignées au livreur pour aujourd'hui
  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ["courier-deliveries", today],
    queryFn: async () => {
      const res = await fetch(
        `/api/deliveries?date=${today}&assignedToMe=true`
      );
      if (!res.ok) throw new Error("Failed to fetch deliveries");
      return res.json() as Promise<Delivery[]>;
    },
  });

  // --- Mutation : mise à jour de statut
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: Delivery["status"];
    }) => {
      const res = await fetch(`/api/deliveries/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update status");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courier-deliveries"] });
      toast({ title: "Statut mis à jour" });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  // --- Mutation : report
  const postponeMutation = useMutation({
    mutationFn: async ({
      id,
      postponedTo,
    }: {
      id: string;
      postponedTo: string;
    }) => {
      const res = await fetch(`/api/deliveries/${id}/postpone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postponedTo }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to postpone delivery");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courier-deliveries"] });
      toast({ title: "Livraison reportée" });
      setPostponeDialog({ open: false, deliveryId: null });
      setPostponeDate("");
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  // --- Helpers statut
  const getNextStatus = (
    currentStatus: Delivery["status"]
  ): Delivery["status"] | null => {
    const transitions: Partial<Record<Delivery["status"], Delivery["status"]>> =
      {
        CREATED: "PICKED_UP",
        PICKED_UP: "DELIVERED",
        DELIVERED: "PAID",
      };
    return transitions[currentStatus] ?? null;
  };

  const getStatusButtonLabel = (status: Delivery["status"]): string => {
    const labels: Partial<Record<Delivery["status"], string>> = {
      CREATED: "Marquer récupérée",
      PICKED_UP: "Marquer livrée",
      DELIVERED: "Marquer payée",
    };
    return labels[status] || "";
  };

  const handlePostpone = (deliveryId: string) => {
    setPostponeDialog({ open: true, deliveryId });
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setPostponeDate(tomorrow.toISOString().split("T")[0]);
  };

  const confirmPostpone = () => {
    if (postponeDialog.deliveryId && postponeDate) {
      postponeMutation.mutate({
        id: postponeDialog.deliveryId,
        postponedTo: postponeDate,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-slate-500">Chargement...</div>
      </div>
    );
  }

  const activeDeliveries = deliveries.filter(
    (d) => !["PAID", "CANCELED", "POSTPONED"].includes(d.status)
  );
  const completedDeliveries = deliveries.filter((d) =>
    ["PAID", "CANCELED", "POSTPONED"].includes(d.status)
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Mes livraisons du jour
        </h1>
        <p className="text-slate-600 mt-1">
          {new Date().toLocaleDateString("fr-FR", { dateStyle: "full" })}
        </p>
      </div>

      {activeDeliveries.length === 0 && completedDeliveries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            <Package className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p>Aucune livraison assignée pour aujourd'hui</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* --- EN COURS --- */}
          {activeDeliveries.length > 0 && (
            <div className="space-y-4 mb-8">
              <h2 className="text-base font-semibold text-slate-900">
                En cours ({activeDeliveries.length})
              </h2>

              <Accordion.Root type="single" collapsible className="space-y-2">
                {activeDeliveries.map((delivery) => {
                  const next = getNextStatus(delivery.status);
                  const itemValue = delivery.id;

                  return (
                    <Accordion.Item
                      key={delivery.id}
                      value={itemValue}
                      className="rounded-xl border bg-white shadow-sm"
                    >
                      {/* EN-TÊTE COMPACT */}
                      <Accordion.Header asChild>
                        <div className="px-4 py-3 cursor-pointer select-none">
                          {/* Ligne 1 : Statuts / tags à gauche — Montant + chevron à droite */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge
                                  className={STATUS_COLORS[delivery.status]}
                                >
                                  {STATUS_LABELS[delivery.status]}
                                </Badge>
                                {delivery.isExpress && (
                                  <Badge variant="secondary">Express</Badge>
                                )}
                                {!!delivery.zone && (
                                  <Badge variant="outline">
                                    {delivery.zone}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                <div className="text-[11px] leading-none text-slate-500">
                                  À remettre
                                </div>
                                <div className="text-base font-bold text-primary">
                                  {delivery.totalDue.toLocaleString()} Ar
                                </div>
                              </div>

                              <Accordion.Trigger asChild>
                                <button
                                  aria-label="Afficher les détails"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border hover:bg-slate-50 transition
                       data-[state=open]:rotate-180"
                                >
                                  <ChevronDown className="h-4 w-4 transition-transform" />
                                </button>
                              </Accordion.Trigger>
                            </div>
                          </div>

                          {/* Ligne 2 : Récupération (sender) + Livraison (receiver) visibles en mode replié */}
                          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* RÉCUPÉRATION */}
                            <div className="flex items-start gap-2 min-w-0">
                              <MapPin className="h-4 w-4 mt-[2px] text-blue-600 shrink-0" />
                              <div className="min-w-0">
                                <div className="text-[12px] uppercase tracking-wide text-blue-700/80 font-medium">
                                  Récupération (Expéditeur)
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-800 min-w-0">
                                  <span className="font-medium truncate">
                                    {delivery.sender.name}
                                  </span>
                                  <span className="text-slate-300">•</span>
                                  <a
                                    href={`tel:${delivery.sender.phone}`}
                                    className="text-primary hover:underline shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {delivery.sender.phone}
                                  </a>
                                </div>
                                <div className="text-[12px] text-slate-600 truncate">
                                  {delivery.sender.pickupAddress}
                                </div>
                              </div>
                            </div>

                            {/* LIVRAISON */}
                            <div className="flex items-start gap-2 min-w-0">
                              <MapPin className="h-4 w-4 mt-[2px] text-slate-600 shrink-0" />
                              <div className="min-w-0">
                                <div className="text-[12px] uppercase tracking-wide text-slate-700/80 font-medium">
                                  Livraison (Destinataire)
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-800 min-w-0">
                                  <span className="font-medium truncate">
                                    {delivery.receiverName}
                                  </span>
                                  <span className="text-slate-300">•</span>
                                  <a
                                    href={`tel:${delivery.receiverPhone}`}
                                    className="text-primary hover:underline shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {delivery.receiverPhone}
                                  </a>
                                </div>
                                <div className="text-[12px] text-slate-600 truncate">
                                  {delivery.receiverAddress}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Accordion.Header>

                      {/* CONTENU REPLIABLE */}
                      <Accordion.Content className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 overflow-hidden">
                        <Card className="border-0 shadow-none">
                          <CardContent className="pt-0 px-4 pb-4">
                            {/* Actions principales compactes */}
                            <div className="mt-2 mb-3 flex gap-2">
                              {next && (
                                <Button
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      id: delivery.id,
                                      status: next,
                                    })
                                  }
                                  disabled={updateStatusMutation.isPending}
                                  className="h-8 px-3 text-sm"
                                >
                                  {getStatusButtonLabel(delivery.status)}
                                </Button>
                              )}
                              {["CREATED", "PICKED_UP"].includes(
                                delivery.status
                              ) && (
                                <Button
                                  variant="outline"
                                  onClick={() => handlePostpone(delivery.id)}
                                  disabled={postponeMutation.isPending}
                                  className="h-8 px-3 text-sm"
                                >
                                  Reporter
                                </Button>
                              )}
                            </div>

                            {/* Détails */}
                            <div className="space-y-3">
                              {delivery.status === "CREATED" && (
                                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                                  <MapPin className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                                  <div className="text-sm">
                                    <div className="font-medium text-blue-900">
                                      Récupération
                                    </div>
                                    <div className="text-blue-700">
                                      {delivery.sender.name}
                                    </div>
                                    <div className="text-blue-700">
                                      {delivery.sender.phone}
                                    </div>
                                    <div className="text-blue-600">
                                      {delivery.sender.pickupAddress}
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                                <MapPin className="h-5 w-5 text-slate-600 mt-0.5 shrink-0" />
                                <div className="text-sm">
                                  <div className="font-medium text-slate-900">
                                    Livraison
                                  </div>
                                  <div className="font-medium text-slate-700">
                                    {delivery.receiverName}
                                  </div>
                                  <div className="text-slate-600">
                                    {delivery.receiverAddress}
                                  </div>
                                  <a
                                    href={`tel:${delivery.receiverPhone}`}
                                    className="text-sm font-medium text-primary hover:underline"
                                  >
                                    {delivery.receiverPhone}
                                  </a>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                <Package className="h-5 w-5 text-slate-600 shrink-0" />
                                <div className="text-sm text-slate-700">
                                  {delivery.parcelCount} colis •{" "}
                                  {delivery.weightKg} kg
                                  {delivery.description &&
                                    ` • ${delivery.description}`}
                                </div>
                              </div>

                              {delivery.note && (
                                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                  <div className="text-sm font-medium text-yellow-900 mb-1">
                                    Remarque
                                  </div>
                                  <div className="text-sm text-yellow-800">
                                    {delivery.note}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </Accordion.Content>
                    </Accordion.Item>
                  );
                })}
              </Accordion.Root>
            </div>
          )}

          {/* --- TERMINÉES --- */}
          {completedDeliveries.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Terminées ({completedDeliveries.length})
              </h2>
              {completedDeliveries.map((delivery) => (
                <Card key={delivery.id} className="opacity-60">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-900">
                          {delivery.receiverName}
                        </div>
                        <div className="text-sm text-slate-600">
                          {delivery.receiverAddress}
                        </div>
                      </div>
                      <Badge className={STATUS_COLORS[delivery.status]}>
                        {STATUS_LABELS[delivery.status]}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* --- DIALOG REPORT --- */}
      <Dialog
        open={postponeDialog.open}
        onOpenChange={(open) => setPostponeDialog({ open, deliveryId: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reporter la livraison</DialogTitle>
            <DialogDescription>
              Sélectionnez une nouvelle date (minimum J+1)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="postponeDate">Nouvelle date</Label>
              <Input
                id="postponeDate"
                type="date"
                value={postponeDate}
                onChange={(e) => setPostponeDate(e.target.value)}
                min={
                  new Date(Date.now() + 86400000).toISOString().split("T")[0]
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setPostponeDialog({ open: false, deliveryId: null })
              }
            >
              Annuler
            </Button>
            <Button
              onClick={confirmPostpone}
              disabled={!postponeDate || postponeMutation.isPending}
            >
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
