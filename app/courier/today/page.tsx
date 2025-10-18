"use client";

import { useState } from "react";
import * as Accordion from "@radix-ui/react-accordion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, MapPin, Package, ChevronDown, UserRoundPlus, MessageSquare, MoreVertical, Check, Calendar, ArrowRightLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  courierRemarks?: string;
  totalDue: number;
  sender: {
    name: string;
    pickupAddress: string;
    phone: string;
  };
}

interface Courier {
  id: string;
  name: string;
  email: string;
  phone?: string;
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
  const { data: session } = useSession();

  const [postponeDialog, setPostponeDialog] = useState<{
    open: boolean;
    deliveryId: string | null;
  }>({
    open: false,
    deliveryId: null,
  });
  const [postponeDate, setPostponeDate] = useState("");

  const [transferDialog, setTransferDialog] = useState<{
    open: boolean;
    deliveryId: string | null;
  }>({
    open: false,
    deliveryId: null,
  });
  const [selectedCourierId, setSelectedCourierId] = useState("");

  const [remarksDialog, setRemarksDialog] = useState<{
    open: boolean;
    deliveryId: string | null;
  }>({
    open: false,
    deliveryId: null,
  });
  const [remarksText, setRemarksText] = useState("");

  // Date du jour (YYYY-MM-DD)
  const today = new Date().toISOString().split("T")[0];

  // --- Query : livraisons assignées au livreur pour aujourd'hui
  const { data: deliveries = [], isLoading, error } = useQuery<Delivery[]>({
    queryKey: ["courier-deliveries", today],
    queryFn: async () => {
      const res = await fetch(
        `/api/deliveries?date=${today}&assignedToMe=true`
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erreur lors du chargement des livraisons");
      }
      return res.json() as Promise<Delivery[]>;
    },
    retry: 2,
  });

  // Afficher toast d'erreur si erreur
  if (error) {
    toast({
      title: "Erreur de chargement",
      description: error.message,
      variant: "destructive",
    });
  }

  // --- Query : liste des livreurs pour le transfert
  const { data: allCouriers = [] } = useQuery<Courier[]>({
    queryKey: ["couriers"],
    queryFn: async () => {
      const res = await fetch("/api/couriers");
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erreur lors du chargement des livreurs");
      }
      return res.json() as Promise<Courier[]>;
    },
    retry: 2,
  });

  // Filter out the current courier from the transfer list
  const couriers = allCouriers.filter(courier => courier.id !== session?.user?.id);

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

  // --- Mutation : mise à jour de statut pour plusieurs livraisons
  const updateMultipleStatusMutation = useMutation({
    mutationFn: async ({
      ids,
      status,
    }: {
      ids: string[];
      status: Delivery["status"];
    }) => {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/deliveries/${id}/status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          }).then((res) => {
            if (!res.ok) throw new Error("Failed to update status");
          })
        )
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["courier-deliveries"] });
      toast({ 
        title: `${variables.ids.length} livraison(s) marquée(s) comme récupérée(s)` 
      });
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

  // --- Mutation : transfert
  const transferMutation = useMutation({
    mutationFn: async ({
      id,
      newCourierId,
    }: {
      id: string;
      newCourierId: string;
    }) => {
      const res = await fetch(`/api/deliveries/${id}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newCourierId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to transfer delivery");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["courier-deliveries"] });
      toast({ 
        title: "Livraison transférée", 
        description: `Transférée à ${data.transferInfo.toCourier.name}` 
      });
      setTransferDialog({ open: false, deliveryId: null });
      setSelectedCourierId("");
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  // --- Mutation : remarques
  const remarksMutation = useMutation({
    mutationFn: async ({
      id,
      courierRemarks,
    }: {
      id: string;
      courierRemarks: string;
    }) => {
      const res = await fetch(`/api/deliveries/${id}/remarks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courierRemarks }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to add remarks");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courier-deliveries"] });
      toast({ title: "Remarques ajoutées avec succès" });
      setRemarksDialog({ open: false, deliveryId: null });
      setRemarksText("");
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

  const handleTransfer = (deliveryId: string) => {
    setTransferDialog({ open: true, deliveryId });
    setSelectedCourierId("");
  };

  const confirmTransfer = () => {
    if (transferDialog.deliveryId && selectedCourierId) {
      transferMutation.mutate({
        id: transferDialog.deliveryId,
        newCourierId: selectedCourierId,
      });
    }
  };

  const handleRemarks = (deliveryId: string, currentRemarks?: string) => {
    setRemarksDialog({ open: true, deliveryId });
    setRemarksText(currentRemarks || "");
  };

  const confirmRemarks = () => {
    if (remarksDialog.deliveryId && remarksText.trim()) {
      remarksMutation.mutate({
        id: remarksDialog.deliveryId,
        courierRemarks: remarksText.trim(),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 shadow-lg">
            <h1 className="text-2xl font-bold text-white">
              Mes livraisons du jour
            </h1>
            <p className="text-blue-100 mt-1">
              {new Date().toLocaleDateString("fr-FR", { dateStyle: "full" })}
            </p>
          </div>
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
                  <Package className="h-8 w-8 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="text-slate-600 font-medium">Chargement de vos livraisons...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const activeDeliveries = deliveries.filter(
    (d) => !["PAID", "CANCELED", "POSTPONED"].includes(d.status)
  );
  const completedDeliveries = deliveries.filter((d) =>
    ["PAID", "CANCELED", "POSTPONED"].includes(d.status)
  );

  // Regrouper les livraisons par expéditeur pour les livraisons à récupérer (CREATED)
  const toPickupDeliveries = activeDeliveries.filter(d => d.status === "CREATED");
  const otherActiveDeliveries = activeDeliveries.filter(d => d.status !== "CREATED");

  // Grouper par expéditeur (même adresse + même nom)
  const pickupGroups = toPickupDeliveries.reduce((groups, delivery) => {
    const key = `${delivery.sender.name}|${delivery.sender.pickupAddress}|${delivery.sender.phone}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(delivery);
    return groups;
  }, {} as Record<string, Delivery[]>);

  const pickupGroupsArray = Object.values(pickupGroups);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-6">
      <div className="max-w-4xl mx-auto">
      <div className="mb-6 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-white">
          Mes livraisons du jour
        </h1>
        <p className="text-blue-100 mt-1">
          {new Date().toLocaleDateString("fr-FR", { dateStyle: "full" })}
        </p>
      </div>

      {activeDeliveries.length === 0 && completedDeliveries.length === 0 ? (
        <Card className="border-2 border-dashed border-slate-200">
          <CardContent className="py-12 text-center text-slate-500">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <Package className="h-10 w-10 text-blue-400" />
            </div>
            <p className="text-slate-600 font-medium">Aucune livraison assignée pour aujourd'hui</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* --- À RÉCUPÉRER (GROUPÉES PAR EXPÉDITEUR) --- */}
          {pickupGroupsArray.length > 0 && (
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-2">
                <div className="h-8 w-1 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
                <h2 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                  À récupérer ({toPickupDeliveries.length} livraison{toPickupDeliveries.length > 1 ? 's' : ''} - {pickupGroupsArray.length} adresse{pickupGroupsArray.length > 1 ? 's' : ''})
              </h2>
              </div>

              <Accordion.Root type="single" collapsible className="space-y-2">
                {pickupGroupsArray.map((group, groupIndex) => {
                  const firstDelivery = group[0];
                  const totalAmount = group.reduce((sum, d) => sum + d.totalDue, 0);
                  const groupValue = `pickup-group-${groupIndex}`;

                  return (
                    <Accordion.Item
                      key={groupValue}
                      value={groupValue}
                      className="rounded-xl border-l-4 border-l-blue-500 bg-white shadow-md hover:shadow-lg transition-shadow"
                    >
                      {/* EN-TÊTE DU GROUPE */}
                      <Accordion.Header asChild>
                        <div className="px-4 py-3 cursor-pointer select-none">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className="bg-blue-100 text-blue-800">
                                  {group.length} livraison{group.length > 1 ? 's' : ''} à récupérer
                                </Badge>
                              </div>
                              
                              {/* Info expéditeur */}
                              <div className="flex items-start gap-2 min-w-0 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                                <div className="bg-blue-100 p-1.5 rounded-lg">
                                  <MapPin className="h-4 w-4 text-blue-600 shrink-0" />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-[12px] uppercase tracking-wide text-blue-700/80 font-bold mb-0.5">
                                    Expéditeur
                                  </div>
                                  <div className="font-semibold text-sm text-slate-800 truncate">
                                    {firstDelivery.sender.name}
                                  </div>
                                  <a
                                    href={`tel:${firstDelivery.sender.phone}`}
                                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium mt-0.5"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Phone className="h-3.5 w-3.5" />
                                    {firstDelivery.sender.phone}
                                  </a>
                                  <div className="text-[12px] text-slate-600 truncate mt-0.5">
                                    {firstDelivery.sender.pickupAddress}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right bg-gradient-to-br from-emerald-50 to-green-50 px-3 py-2 rounded-lg border border-emerald-200">
                                <div className="text-[11px] leading-none text-emerald-700 font-medium">
                                  Total à remettre
                                </div>
                                <div className="text-base font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                                  {totalAmount.toLocaleString()} Ar
                                </div>
                              </div>

                              <Accordion.Trigger asChild>
                                <button
                                  aria-label="Afficher les détails"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 hover:from-blue-100 hover:to-indigo-100 transition
                       data-[state=open]:rotate-180 data-[state=open]:bg-blue-100"
                                >
                                  <ChevronDown className="h-4 w-4 text-blue-600 transition-transform" />
                                </button>
                              </Accordion.Trigger>
                            </div>
                          </div>
                        </div>
                      </Accordion.Header>

                      {/* CONTENU DU GROUPE */}
                      <Accordion.Content className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 overflow-hidden">
                        <Card className="border-0 shadow-none">
                          <CardContent className="pt-0 px-4 pb-4">
                            {/* Bouton pour tout marquer comme récupéré */}
                            <div className="mb-3 flex gap-2">
                              <Button
                                onClick={() =>
                                  updateMultipleStatusMutation.mutate({
                                    ids: group.map(d => d.id),
                                    status: "PICKED_UP",
                                  })
                                }
                                disabled={updateMultipleStatusMutation.isPending}
                                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {updateMultipleStatusMutation.isPending ? (
                                  <>
                                    <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Traitement...
                                  </>
                                ) : (
                                  <>
                                    <Check className="h-4 w-4 mr-2" />
                                    Tout marquer comme récupéré ({group.length})
                                  </>
                                )}
                              </Button>
                            </div>

                            {/* Liste des destinataires */}
                            <div className="space-y-2">
                              <div className="text-sm font-semibold text-slate-700 mb-2">
                                Destinataires :
                              </div>
                              {group.map((delivery) => (
                                <div key={delivery.id} className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-2 min-w-0 flex-1">
                                      <div className="bg-emerald-100 p-1.5 rounded-lg">
                                        <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-sm text-slate-800">
                                            {delivery.receiverName}
                                          </span>
                                          {delivery.isExpress && (
                                            <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 text-xs">⚡</Badge>
                                          )}
                                          {delivery.zone && (
                                            <Badge className="bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 border border-purple-300 text-xs">
                                              📍 {delivery.zone}
                                            </Badge>
                                          )}
                                        </div>
                                        <a
                                          href={`tel:${delivery.receiverPhone}`}
                                          className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium mt-0.5"
                                        >
                                          <Phone className="h-3.5 w-3.5" />
                                          {delivery.receiverPhone}
                                        </a>
                                        <div className="text-[12px] text-slate-600 mt-0.5">
                                          {delivery.receiverAddress}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-600">
                                          <Package className="h-3.5 w-3.5" />
                                          <span><strong>{delivery.parcelCount}</strong> colis • <strong>{delivery.weightKg}</strong> kg</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right bg-gradient-to-br from-emerald-50 to-green-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                                      <div className="text-[10px] leading-none text-emerald-700 font-medium">
                                        À remettre
                                      </div>
                                      <div className="text-sm font-bold text-emerald-700">
                                        {delivery.totalDue.toLocaleString()} Ar
                                      </div>
                                    </div>
                                  </div>

                                  {(delivery.note || delivery.description) && (
                                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                                      {delivery.note && <div>📝 {delivery.note}</div>}
                                      {delivery.description && <div>📦 {delivery.description}</div>}
                                    </div>
                                  )}
                                </div>
                              ))}
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

          {/* --- AUTRES LIVRAISONS ACTIVES --- */}
          {otherActiveDeliveries.length > 0 && (
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-2">
                <div className="h-8 w-1 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full"></div>
                <h2 className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  En livraison ({otherActiveDeliveries.length})
                </h2>
              </div>

              <Accordion.Root type="single" collapsible className="space-y-2">
                {otherActiveDeliveries.map((delivery) => {
                  const next = getNextStatus(delivery.status);
                  const itemValue = delivery.id;

                  // Couleur de bordure selon le statut
                  const borderColor = delivery.status === "CREATED" 
                    ? "border-l-blue-500" 
                    : delivery.status === "PICKED_UP" 
                    ? "border-l-yellow-500" 
                    : "border-l-green-500";

                  return (
                    <Accordion.Item
                      key={delivery.id}
                      value={itemValue}
                      className={`rounded-xl border-l-4 ${borderColor} bg-white shadow-md hover:shadow-lg transition-shadow`}
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
                                  <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 shadow-sm">⚡ Express</Badge>
                                )}
                                {!!delivery.zone && (
                                  <Badge className="bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 border border-purple-300">
                                    📍 {delivery.zone}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right bg-gradient-to-br from-emerald-50 to-green-50 px-3 py-2 rounded-lg border border-emerald-200">
                                <div className="text-[11px] leading-none text-emerald-700 font-medium">
                                  À remettre
                                </div>
                                <div className="text-base font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                                  {delivery.totalDue.toLocaleString()} Ar
                                </div>
                              </div>

                              <Accordion.Trigger asChild>
                                <button
                                  aria-label="Afficher les détails"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 hover:from-blue-100 hover:to-indigo-100 transition
                       data-[state=open]:rotate-180 data-[state=open]:bg-blue-100"
                                >
                                  <ChevronDown className="h-4 w-4 text-blue-600 transition-transform" />
                                </button>
                              </Accordion.Trigger>
                            </div>
                          </div>

                          {/* Ligne 2 : Récupération (sender) + Livraison (receiver) visibles en mode replié */}
                          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* RÉCUPÉRATION */}
                            <div className="flex items-start gap-2 min-w-0 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                              <div className="bg-blue-100 p-1.5 rounded-lg">
                                <MapPin className="h-4 w-4 text-blue-600 shrink-0" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[12px] uppercase tracking-wide text-blue-700/80 font-bold mb-0.5">
                                  Récupération (Expéditeur)
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-800 min-w-0">
                                  <span className="font-semibold truncate">
                                    {delivery.sender.name}
                                  </span>
                                </div>
                                  <a
                                    href={`tel:${delivery.sender.phone}`}
                                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium mt-0.5"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                  <Phone className="h-3.5 w-3.5" />
                                    {delivery.sender.phone}
                                  </a>
                                <div className="text-[12px] text-slate-600 truncate mt-0.5">
                                  {delivery.sender.pickupAddress}
                                </div>
                              </div>
                            </div>

                            {/* LIVRAISON */}
                            <div className="flex items-start gap-2 min-w-0 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                              <div className="bg-emerald-100 p-1.5 rounded-lg">
                                <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[12px] uppercase tracking-wide text-emerald-700/80 font-bold mb-0.5">
                                  Livraison (Destinataire)
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-800 min-w-0">
                                  <span className="font-semibold truncate">
                                    {delivery.receiverName}
                                  </span>
                                </div>
                                  <a
                                    href={`tel:${delivery.receiverPhone}`}
                                  className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium mt-0.5"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                  <Phone className="h-3.5 w-3.5" />
                                    {delivery.receiverPhone}
                                  </a>
                                <div className="text-[12px] text-slate-600 truncate mt-0.5">
                                  {delivery.receiverAddress}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Remarques du livreur */}
                          {delivery.courierRemarks && (
                            <div className="mt-3 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-start gap-2">
                                <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                  <div className="text-[12px] font-medium text-blue-900 mb-0.5">
                                    Mes remarques
                                  </div>
                                  <div className="text-sm text-blue-800">
                                    {delivery.courierRemarks}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </Accordion.Header>

                      {/* CONTENU REPLIABLE */}
                      <Accordion.Content className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 overflow-hidden">
                        <Card className="border-0 shadow-none">
                          <CardContent className="pt-0 px-4 pb-4">
                            {/* Menu d'actions */}
                            <div className="mt-2 mb-3">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button className="w-full h-9 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md cursor-pointer">
                                    <MoreVertical className="h-4 w-4 mr-2" />
                                    Actions
                                    <ChevronDown className="h-4 w-4 ml-auto" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-56">
                              {next && (
                                    <>
                                      <DropdownMenuItem
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      id: delivery.id,
                                      status: next,
                                    })
                                  }
                                  disabled={updateStatusMutation.isPending}
                                        className="cursor-pointer focus:bg-green-50 focus:text-green-900"
                                      >
                                        <Check className="h-4 w-4 mr-2 text-green-600" />
                                        <span className="font-medium">{getStatusButtonLabel(delivery.status)}</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                    </>
                                  )}
                                  
                                  <DropdownMenuItem
                                    onClick={() => handleRemarks(delivery.id, delivery.courierRemarks)}
                                    disabled={remarksMutation.isPending}
                                    className="cursor-pointer focus:bg-blue-50 focus:text-blue-900"
                                  >
                                    <MessageSquare className="h-4 w-4 mr-2 text-blue-600" />
                                    {delivery.courierRemarks ? "Modifier remarques" : "Ajouter remarques"}
                                  </DropdownMenuItem>

                              {["CREATED", "PICKED_UP"].includes(delivery.status) && (
                                    <DropdownMenuItem
                                  onClick={() => handleTransfer(delivery.id)}
                                  disabled={transferMutation.isPending || couriers.length === 0}
                                      className="cursor-pointer focus:bg-purple-50 focus:text-purple-900"
                                >
                                      <ArrowRightLeft className="h-4 w-4 mr-2 text-purple-600" />
                                  Transférer
                                    </DropdownMenuItem>
                                  )}

                                  {["CREATED", "PICKED_UP"].includes(delivery.status) && (
                                    <DropdownMenuItem
                                  onClick={() => handlePostpone(delivery.id)}
                                  disabled={postponeMutation.isPending}
                                      className="cursor-pointer focus:bg-orange-50 focus:text-orange-900"
                                >
                                      <Calendar className="h-4 w-4 mr-2 text-orange-600" />
                                  Reporter
                                    </DropdownMenuItem>
                              )}
                                </DropdownMenuContent>
                              </DropdownMenu>
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

                              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                                <div className="bg-purple-100 p-2 rounded-lg">
                                  <Package className="h-5 w-5 text-purple-600 shrink-0" />
                                </div>
                                <div className="text-sm font-medium text-slate-800">
                                  <span className="text-purple-700 font-bold">{delivery.parcelCount}</span> colis •{" "}
                                  <span className="text-purple-700 font-bold">{delivery.weightKg}</span> kg
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

                              {delivery.courierRemarks && (
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                  <div className="text-sm font-medium text-blue-900 mb-1">
                                    Mes remarques
                                  </div>
                                  <div className="text-sm text-blue-800">
                                    {delivery.courierRemarks}
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
              <div className="flex items-center gap-2">
                <div className="h-8 w-1 bg-gradient-to-b from-slate-400 to-slate-500 rounded-full"></div>
                <h2 className="text-lg font-bold bg-gradient-to-r from-slate-600 to-slate-700 bg-clip-text text-transparent">
                Terminées ({completedDeliveries.length})
              </h2>
              </div>
              {completedDeliveries.map((delivery) => (
                <Card key={delivery.id} className="opacity-75 border-l-4 border-l-slate-400 shadow-sm hover:shadow-md transition-shadow">
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
              className="cursor-pointer"
            >
              Annuler
            </Button>
            <Button
              onClick={confirmPostpone}
              disabled={!postponeDate || postponeMutation.isPending}
              className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              {postponeMutation.isPending ? (
                <>
                  <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Traitement...
                </>
              ) : (
                "Confirmer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- DIALOG TRANSFERT --- */}
      <Dialog
        open={transferDialog.open}
        onOpenChange={(open) => setTransferDialog({ open, deliveryId: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transférer la livraison</DialogTitle>
            <DialogDescription>
              Sélectionnez le livreur qui prendra en charge cette livraison
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="courierSelect">Nouveau livreur</Label>
              <Select
                value={selectedCourierId}
                onValueChange={setSelectedCourierId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un livreur" />
                </SelectTrigger>
                <SelectContent>
                  {couriers.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-slate-500">
                      Aucun autre livreur disponible
                    </div>
                  ) : (
                    couriers.map((courier) => (
                      <SelectItem key={courier.id} value={courier.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{courier.name}</span>
                          <span className="text-sm text-slate-500">
                            {courier.email}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setTransferDialog({ open: false, deliveryId: null })
              }
              className="cursor-pointer"
            >
              Annuler
            </Button>
            <Button
              onClick={confirmTransfer}
              disabled={!selectedCourierId || transferMutation.isPending}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              {transferMutation.isPending ? (
                <>
                  <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Transfert...
                </>
              ) : (
                "Transférer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- DIALOG REMARQUES --- */}
      <Dialog
        open={remarksDialog.open}
        onOpenChange={(open) => setRemarksDialog({ open, deliveryId: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter des remarques</DialogTitle>
            <DialogDescription>
              Ajoutez vos remarques sur cette livraison
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="remarksText">Remarques</Label>
              <textarea
                id="remarksText"
                value={remarksText}
                onChange={(e) => setRemarksText(e.target.value)}
                placeholder="Ajoutez vos remarques sur cette livraison..."
                className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                maxLength={1000}
              />
              <div className="text-xs text-gray-500 text-right">
                {remarksText.length}/1000 caractères
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setRemarksDialog({ open: false, deliveryId: null })
              }
              className="cursor-pointer"
            >
              Annuler
            </Button>
            <Button
              onClick={confirmRemarks}
              disabled={!remarksText.trim() || remarksMutation.isPending}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              {remarksMutation.isPending ? (
                <>
                  <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enregistrement...
                </>
              ) : (
                "Enregistrer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
