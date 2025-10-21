"use client";

import { useState } from "react";
import * as Accordion from "@radix-ui/react-accordion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, MapPin, Package, ChevronDown, MessageSquare, Check, Calendar, ArrowRightLeft, CalendarDays, Filter, Navigation, PhoneCall } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  CREATED: "bg-slate-100 text-slate-700",
  PICKED_UP: "bg-yellow-100 text-yellow-800",
  DELIVERED: "bg-green-100 text-green-800",
  PAID: "bg-emerald-100 text-emerald-800",
  POSTPONED: "bg-purple-100 text-purple-800",
  CANCELED: "bg-red-100 text-red-800",
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
  const todayDate = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayDate);

  // État du filtre
  type FilterType = "all" | "to_pickup" | "in_delivery" | "delivered" | "completed";
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  // --- Query : livraisons assignées au livreur pour la date sélectionnée
  const { data: deliveries = [], isLoading, error } = useQuery<Delivery[]>({
    queryKey: ["courier-deliveries", selectedDate],
    queryFn: async () => {
      const res = await fetch(
        `/api/deliveries?date=${selectedDate}&assignedToMe=true`
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
      return { postponedTo }; // Retourner la nouvelle date
    },
    onSuccess: (data) => {
      // Invalider toutes les queries de livraisons
      queryClient.invalidateQueries({ queryKey: ["courier-deliveries"] });
      
      // Fermer le dialogue
      setPostponeDialog({ open: false, deliveryId: null });
      setPostponeDate("");
      
      // NE PAS changer de date - rester sur la date actuelle
      // La livraison apparaîtra maintenant dans "Terminées" avec le badge "Reportée"
      
      // Afficher un toast avec la nouvelle date
      const newDate = new Date(data.postponedTo);
      const formattedDate = newDate.toLocaleDateString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      
      toast({ 
        title: "✅ Livraison reportée", 
        description: `Reportée au ${formattedDate}. Elle apparaît maintenant dans "Terminées".`,
      });
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

  // Fonctions helper pour les dates rapides
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

  const getDateLabel = (date: string) => {
    const selected = new Date(date + 'T00:00:00');
    
    if (date === todayDate) {
      return "Aujourd'hui";
    } else if (date === getTomorrowDate()) {
      return "Demain";
    } else {
      return selected.toLocaleDateString("fr-FR", { 
        weekday: 'long',
        day: 'numeric', 
        month: 'long',
        year: 'numeric' 
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
            <h1 className="text-2xl font-bold text-white">
              Mes livraisons
            </h1>
            <p className="text-blue-100 mt-1">
              {getDateLabel(selectedDate)}
            </p>
              </div>
            </div>
            
            {/* Filtre de dates */}
            <div className="mt-4 space-y-3">
              {/* Boutons rapides */}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={selectedDate === todayDate ? "secondary" : "outline"}
                  onClick={() => setSelectedDate(todayDate)}
                  className={`${
                    selectedDate === todayDate
                      ? "bg-white text-blue-700 hover:bg-blue-50 font-semibold"
                      : "bg-blue-500/20 text-white border-white/30 hover:bg-white/30 hover:text-white"
                  } cursor-pointer`}
                >
                  <CalendarDays className="h-4 w-4 mr-1.5" />
                  Aujourd&apos;hui
                </Button>
                <Button
                  size="sm"
                  variant={selectedDate === getTomorrowDate() ? "secondary" : "outline"}
                  onClick={() => setSelectedDate(getTomorrowDate())}
                  className={`${
                    selectedDate === getTomorrowDate()
                      ? "bg-white text-blue-700 hover:bg-blue-50 font-semibold"
                      : "bg-blue-500/20 text-white border-white/30 hover:bg-white/30 hover:text-white"
                  } cursor-pointer`}
                >
                  <Calendar className="h-4 w-4 mr-1.5" />
                  Demain
                </Button>
              </div>

              {/* Sélecteur de date personnalisé */}
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-white/95 backdrop-blur-sm border-white/50 text-slate-800 font-medium cursor-pointer focus:ring-2 focus:ring-white/50"
                  />
                </div>
              </div>
            </div>
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

  // Séparer les livraisons actives des terminées
  // Note : Les livraisons POSTPONED ne sont affichées que dans "Terminées" 
  // si on consulte leur ancienne date, sinon elles sont actives sur leur nouvelle date
  const activeDeliveries = deliveries.filter(
    (d) => !["PAID", "CANCELED"].includes(d.status)
  );
  const completedDeliveries = deliveries.filter((d) =>
    ["PAID", "CANCELED", "POSTPONED"].includes(d.status)
  );

  // Calcul du total des montants reçus (uniquement livraisons PAID)
  // DELIVERED = livré mais pas encore payé, donc on ne compte que PAID
  const totalCollected = deliveries
    .filter((d) => d.status === "PAID")
    .reduce((sum, d) => sum + d.totalDue, 0);

  // Regrouper les livraisons par expéditeur pour les livraisons à récupérer (CREATED)
  const toPickupDeliveries = activeDeliveries.filter(d => d.status === "CREATED");
  const pickedUpDeliveries = activeDeliveries.filter(d => d.status === "PICKED_UP");
  const deliveredDeliveries = activeDeliveries.filter(d => d.status === "DELIVERED");

  // Compteurs pour les filtres
  const toPickupCount = toPickupDeliveries.length;
  const inDeliveryCount = pickedUpDeliveries.length;
  const deliveredCount = deliveredDeliveries.length;
  const completedCount = completedDeliveries.length;

  // Appliquer le filtre
  const shouldShowToPickup = activeFilter === "all" || activeFilter === "to_pickup";
  const shouldShowInDelivery = activeFilter === "all" || activeFilter === "in_delivery";
  const shouldShowDelivered = activeFilter === "all" || activeFilter === "delivered";
  const shouldShowCompleted = activeFilter === "all" || activeFilter === "completed";

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-3 sm:p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
      {/* EN-TÊTE OPTIMISÉ ET COMPACT */}
      <div className="mb-3 sm:mb-4 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-xl sm:rounded-2xl shadow-xl overflow-hidden">
        {/* Ligne 1 : Titre + Total reçu */}
        <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2 sm:pb-3">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            {/* Titre et date */}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-white leading-tight">
                📦 Mes livraisons
              </h1>
              <p className="text-blue-100 text-xs sm:text-sm mt-0.5 font-medium truncate">
                {getDateLabel(selectedDate)}
              </p>
            </div>
            
            {/* Total des montants reçus - Compact */}
            {totalCollected > 0 && (
              <div className="bg-white/15 backdrop-blur-md border-2 border-white/30 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 shrink-0">
                <div className="text-[9px] sm:text-[10px] font-bold text-blue-100 uppercase tracking-wider mb-0.5">
                  Total reçu
                </div>
                <div className="text-xl sm:text-2xl font-black text-white leading-none mb-0.5">
                  {totalCollected.toLocaleString()}
                </div>
                <div className="text-[9px] sm:text-[10px] text-blue-200 font-semibold">
                  {deliveries.filter((d) => d.status === "PAID").length} payée(s) • Ar
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Ligne 2 : Sélecteur de date + Boutons rapides - Sur fond légèrement différent */}
        <div className="bg-white/10 backdrop-blur-sm px-3 sm:px-4 py-2 sm:py-3 border-t border-white/20">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Sélecteur de date - Compact */}
            <div className="flex-1 relative">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-8 sm:h-9 bg-white/95 backdrop-blur-sm border-white/50 text-slate-800 text-xs sm:text-sm font-semibold cursor-pointer focus:ring-2 focus:ring-white/60 transition-all hover:bg-white"
              />
            </div>
            
            {/* Boutons rapides - Compacts */}
            <Button
              size="sm"
              onClick={() => setSelectedDate(todayDate)}
              className={`h-8 sm:h-9 px-2 sm:px-3 ${
                selectedDate === todayDate
                  ? "bg-white text-blue-700 hover:bg-blue-50 font-bold shadow-md"
                  : "bg-white/20 text-white border border-white/40 hover:bg-white/30 font-medium"
              } cursor-pointer transition-all text-xs sm:text-sm`}
            >
              <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1" />
              <span className="hidden sm:inline">Auj.</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setSelectedDate(getTomorrowDate())}
              className={`h-8 sm:h-9 px-2 sm:px-3 ${
                selectedDate === getTomorrowDate()
                  ? "bg-white text-blue-700 hover:bg-blue-50 font-bold shadow-md"
                  : "bg-white/20 text-white border border-white/40 hover:bg-white/30 font-medium"
              } cursor-pointer transition-all text-xs sm:text-sm`}
            >
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1" />
              <span className="hidden sm:inline">Dem.</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Boutons de filtrage - Design amélioré */}
      {(toPickupCount > 0 || inDeliveryCount > 0 || deliveredCount > 0 || completedCount > 0) && (
        <div className="mb-3 sm:mb-4">
          <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-lg sm:rounded-xl shadow-lg border border-slate-100 p-2 sm:p-3">
            <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center">
              <Button
                size="sm"
                onClick={() => setActiveFilter("all")}
                className={`h-8 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm font-bold rounded-full ${
                  activeFilter === "all"
                    ? "bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-700 text-white shadow-lg scale-105"
                    : "bg-white border-2 border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                } cursor-pointer transition-all duration-200 active:scale-95`}
              >
                <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Tout</span>
                <Badge className={`ml-1 sm:ml-2 text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-extrabold ${
                  activeFilter === "all"
                    ? "bg-white/30 text-white border-0"
                    : "bg-blue-100 text-blue-700 border-0"
                }`}>
                  {deliveries.length}
                </Badge>
              </Button>
              
              {toPickupCount > 0 && (
                <Button
                  size="sm"
                  onClick={() => setActiveFilter("to_pickup")}
                  className={`h-8 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm font-bold rounded-full ${
                    activeFilter === "to_pickup"
                      ? "bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 hover:from-slate-700 hover:via-slate-800 hover:to-slate-900 text-white shadow-lg scale-105"
                      : "bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                  } cursor-pointer transition-all duration-200 active:scale-95`}
                >
                  <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Récupérer</span>
                  <Badge className={`ml-1 sm:ml-2 text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-extrabold ${
                    activeFilter === "to_pickup" 
                      ? "bg-white/30 text-white border-0" 
                      : "bg-slate-100 text-slate-700 border-0"
                  }`}>
                    {toPickupCount}
                  </Badge>
                </Button>
              )}
              
              {inDeliveryCount > 0 && (
                <Button
                  size="sm"
                  onClick={() => setActiveFilter("in_delivery")}
                  className={`h-8 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm font-bold rounded-full ${
                    activeFilter === "in_delivery"
                      ? "bg-gradient-to-r from-yellow-500 via-yellow-600 to-orange-500 hover:from-yellow-600 hover:via-yellow-700 hover:to-orange-600 text-white shadow-lg scale-105"
                      : "bg-white border-2 border-yellow-200 text-yellow-700 hover:border-yellow-400 hover:bg-yellow-50"
                  } cursor-pointer transition-all duration-200 active:scale-95`}
                >
                  <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">En cours</span>
                  <Badge className={`ml-1 sm:ml-2 text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-extrabold ${
                    activeFilter === "in_delivery" 
                      ? "bg-white/30 text-white border-0" 
                      : "bg-yellow-100 text-yellow-700 border-0"
                  }`}>
                    {inDeliveryCount}
                  </Badge>
                </Button>
              )}
              
              {deliveredCount > 0 && (
                <Button
                  size="sm"
                  onClick={() => setActiveFilter("delivered")}
                  className={`h-8 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm font-bold rounded-full ${
                    activeFilter === "delivered"
                      ? "bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 hover:from-green-600 hover:via-green-700 hover:to-emerald-700 text-white shadow-lg scale-105"
                      : "bg-white border-2 border-green-200 text-green-700 hover:border-green-400 hover:bg-green-50"
                  } cursor-pointer transition-all duration-200 active:scale-95`}
                >
                  <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Livrées</span>
                  <Badge className={`ml-1 sm:ml-2 text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-extrabold ${
                    activeFilter === "delivered" 
                      ? "bg-white/30 text-white border-0" 
                      : "bg-green-100 text-green-700 border-0"
                  }`}>
                    {deliveredCount}
                  </Badge>
                </Button>
              )}
              
              {completedCount > 0 && (
                <Button
                  size="sm"
                  onClick={() => setActiveFilter("completed")}
                  className={`h-8 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm font-bold rounded-full ${
                    activeFilter === "completed"
                      ? "bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600 hover:from-purple-600 hover:via-purple-700 hover:to-indigo-700 text-white shadow-lg scale-105"
                      : "bg-white border-2 border-purple-200 text-purple-700 hover:border-purple-400 hover:bg-purple-50"
                  } cursor-pointer transition-all duration-all active:scale-95`}
                >
                  <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Terminées</span>
                  <Badge className={`ml-1 sm:ml-2 text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-extrabold ${
                    activeFilter === "completed" 
                      ? "bg-white/30 text-white border-0" 
                      : "bg-purple-100 text-purple-700 border-0"
                  }`}>
                    {completedCount}
                  </Badge>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {activeDeliveries.length === 0 && completedDeliveries.length === 0 ? (
        <Card className="border-2 border-dashed border-slate-200">
          <CardContent className="py-12 text-center text-slate-500">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <Package className="h-10 w-10 text-blue-400" />
            </div>
            <p className="text-slate-600 font-medium">
              Aucune livraison assignée pour {selectedDate === todayDate ? "aujourd'hui" : "cette date"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Message si aucune livraison ne correspond au filtre */}
          {!shouldShowToPickup && !shouldShowInDelivery && !shouldShowDelivered && !shouldShowCompleted && (
            <Card className="border-2 border-dashed border-slate-200">
              <CardContent className="py-12 text-center text-slate-500">
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <Filter className="h-10 w-10 text-slate-400" />
                </div>
                <p className="text-slate-600 font-medium">
                  Aucune livraison ne correspond à ce filtre
                </p>
              </CardContent>
            </Card>
          )}
          
          {/* Message si le filtre ne retourne aucun résultat */}
          {(shouldShowToPickup || shouldShowInDelivery || shouldShowDelivered || shouldShowCompleted) && 
           pickupGroupsArray.length === 0 && 
           (!shouldShowToPickup || toPickupCount === 0) &&
           (!shouldShowInDelivery || inDeliveryCount === 0) &&
           (!shouldShowDelivered || deliveredCount === 0) &&
           (!shouldShowCompleted || completedCount === 0) &&
           deliveries.length > 0 && (
            <Card className="border-2 border-dashed border-slate-200">
              <CardContent className="py-12 text-center text-slate-500">
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <Filter className="h-10 w-10 text-slate-400" />
                </div>
                <p className="text-slate-600 font-medium mb-2">
                  Aucune livraison pour ce filtre
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveFilter("all")}
                  className="cursor-pointer"
                >
                  Afficher tout
                </Button>
              </CardContent>
            </Card>
          )}

          {/* --- À RÉCUPÉRER (GROUPÉES PAR EXPÉDITEUR) --- */}
          {shouldShowToPickup && pickupGroupsArray.length > 0 && (
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-2">
                <div className="h-8 w-1 bg-gradient-to-b from-slate-500 to-slate-600 rounded-full"></div>
                <h2 className="text-lg font-bold bg-gradient-to-r from-slate-600 to-slate-700 bg-clip-text text-transparent">
                  À récupérer ({toPickupDeliveries.length} livraison{toPickupDeliveries.length > 1 ? 's' : ''} - {pickupGroupsArray.length} adresse{pickupGroupsArray.length > 1 ? 's' : ''})
              </h2>
              </div>

              <Accordion.Root type="single" collapsible className="space-y-2">
                {pickupGroupsArray.map((group, groupIndex) => {
                  const firstDelivery = group[0];
                  const groupValue = `pickup-group-${groupIndex}`;

                  return (
                    <Accordion.Item
                      key={groupValue}
                      value={groupValue}
                      className="rounded-xl border-l-4 border-l-slate-500 bg-white shadow-md hover:shadow-lg transition-shadow"
                    >
                      {/* EN-TÊTE DU GROUPE - Simplifié et centré */}
                      <Accordion.Header asChild>
                        <div className="px-4 py-3 cursor-pointer select-none">
                          {/* Ligne 1 : Badge centré + Chevron */}
                          <div className="flex items-center justify-center gap-3 mb-3 relative">
                            <Badge className="bg-slate-600 text-white font-semibold shadow-sm px-4 py-1.5 text-sm">
                              {group.length} livraison{group.length > 1 ? 's' : ''} à récupérer
                            </Badge>
                            
                            <Accordion.Trigger asChild>
                              <button
                                aria-label="Afficher les détails"
                                className="absolute right-0 inline-flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 hover:from-blue-100 hover:to-indigo-100 transition
                       data-[state=open]:rotate-180 data-[state=open]:bg-blue-100"
                              >
                                <ChevronDown className="h-4 w-4 text-blue-600 transition-transform" />
                              </button>
                            </Accordion.Trigger>
                          </div>

                          {/* Ligne 2 : Info expéditeur - Bien structuré */}
                          <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 p-3 rounded-lg border-2 border-slate-200">
                            <div className="flex items-start gap-3">
                              <div className="bg-slate-600 p-2 rounded-lg shadow-sm shrink-0">
                                <MapPin className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">📍 Récupération</span>
                                  <Badge variant="outline" className="text-[10px] bg-white border-slate-300">
                                    {group.length} destination{group.length > 1 ? 's' : ''}
                                  </Badge>
                                </div>
                                <div className="font-bold text-base text-slate-900 mb-1">
                                  {firstDelivery.sender.name}
                                </div>
                                <div className="text-sm text-slate-700 mb-2">
                                  {firstDelivery.sender.pickupAddress}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <a
                                    href={`tel:${firstDelivery.sender.phone}`}
                                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold shadow-sm transition-all hover:shadow-md active:scale-95"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <PhoneCall className="h-4 w-4 shrink-0" />
                                    <span className="truncate">{firstDelivery.sender.phone}</span>
                                  </a>
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(firstDelivery.sender.pickupAddress)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm transition-all hover:shadow-md active:scale-95"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Navigation className="h-4 w-4 shrink-0" />
                                    GPS
                                  </a>
                                </div>
                              </div>
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

                            {/* Liste des destinataires - Rendu optimisé et ordonné */}
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="h-6 w-1 bg-gradient-to-b from-emerald-500 to-green-600 rounded-full"></div>
                                <span className="text-sm font-bold text-slate-800">📍 Destinations ({group.length})</span>
                              </div>
                              {group.map((delivery, index) => (
                                <div key={delivery.id} className="bg-white p-4 rounded-xl border-2 border-emerald-200 hover:border-emerald-300 transition-all shadow-sm hover:shadow-md">
                                  {/* En-tête : Numéro, Badges et Montant */}
                                  <div className="flex items-center justify-between gap-3 mb-3 pb-3 border-b-2 border-emerald-100">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <div className="bg-gradient-to-br from-emerald-600 to-green-600 text-white rounded-lg px-2.5 py-1 text-sm font-bold shadow-sm">
                                        #{index + 1}
                                      </div>
                                      {delivery.isExpress && (
                                        <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 text-xs font-bold shadow-sm">⚡ EXPRESS</Badge>
                                      )}
                                      {delivery.zone && (
                                        <Badge className="bg-purple-600 text-white border-0 text-xs font-semibold shadow-sm">
                                          📍 {delivery.zone}
                                        </Badge>
                                      )}
                                      <Badge variant="outline" className="text-xs bg-slate-50 border-slate-300">
                                        <Package className="h-3 w-3 mr-1" />
                                        {delivery.parcelCount} colis • {delivery.weightKg} kg
                                      </Badge>
                                    </div>
                                    <div className="text-right bg-gradient-to-br from-emerald-50 to-green-50 px-3 py-2 rounded-lg border-2 border-emerald-300 shadow-sm shrink-0">
                                      <div className="text-[9px] uppercase tracking-wide text-emerald-700 font-bold leading-tight">
                                        À remettre
                                      </div>
                                      <div className="text-xl font-black text-emerald-700 leading-tight">
                                        {delivery.totalDue.toLocaleString()}
                                      </div>
                                      <div className="text-[9px] text-emerald-600 font-semibold">Ar</div>
                                    </div>
                                  </div>

                                  {/* Infos destinataire - Bien structuré */}
                                  <div className="space-y-2 mb-3">
                                    <div className="flex items-start gap-2">
                                      <div className="bg-emerald-100 p-1.5 rounded-lg mt-0.5">
                                        <MapPin className="h-4 w-4 text-emerald-700 shrink-0" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="font-bold text-base text-slate-900 mb-1">
                                          {delivery.receiverName}
                                        </div>
                                        <div className="text-sm text-slate-700 leading-snug">
                                          {delivery.receiverAddress}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Boutons d'action - Numéro visible */}
                                  <div className="grid grid-cols-2 gap-2">
                                    <a
                                      href={`tel:${delivery.receiverPhone}`}
                                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm shadow-md transition-all hover:shadow-lg active:scale-95"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <PhoneCall className="h-4 w-4 shrink-0" />
                                      <span className="truncate">{delivery.receiverPhone}</span>
                                    </a>
                                    <a
                                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(delivery.receiverAddress)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-md transition-all hover:shadow-lg active:scale-95"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Navigation className="h-4 w-4 shrink-0" />
                                      GPS
                                    </a>
                                  </div>

                                  {/* Alertes admin */}
                                  {(delivery.note || delivery.description) && (
                                    <div className="mt-3 p-3 bg-red-50 border-2 border-red-300 rounded-lg">
                                      <div className="flex items-start gap-2">
                                        <span className="text-red-600 text-lg shrink-0">⚠️</span>
                                        <div className="text-sm text-red-900 font-medium min-w-0">
                                          {delivery.note && <div className="mb-1"><strong>📝 Note:</strong> {delivery.note}</div>}
                                          {delivery.description && <div><strong>📦 Description:</strong> {delivery.description}</div>}
                                        </div>
                                      </div>
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

          {/* --- EN LIVRAISON (PICKED_UP) --- */}
          {shouldShowInDelivery && pickedUpDeliveries.length > 0 && (
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-2">
                <div className="h-8 w-1 bg-gradient-to-b from-yellow-500 to-yellow-600 rounded-full"></div>
                <h2 className="text-lg font-bold bg-gradient-to-r from-yellow-600 to-yellow-700 bg-clip-text text-transparent">
                  En livraison ({pickedUpDeliveries.length})
                </h2>
              </div>

              <Accordion.Root type="single" collapsible className="space-y-2">
                {pickedUpDeliveries.map((delivery) => {
                  const next = getNextStatus(delivery.status);
                  const itemValue = delivery.id;

                  // Couleur de bordure selon le statut
                  const borderColor = delivery.status === "CREATED" 
                    ? "border-l-slate-500" 
                    : delivery.status === "PICKED_UP" 
                    ? "border-l-yellow-500" 
                    : "border-l-green-500";

                  return (
                    <Accordion.Item
                      key={delivery.id}
                      value={itemValue}
                      className={`rounded-xl border-l-4 ${borderColor} bg-white shadow-md hover:shadow-lg transition-shadow`}
                    >
                      {/* EN-TÊTE OPTIMISÉ */}
                      <Accordion.Header asChild>
                        <div className="px-4 py-3 cursor-pointer select-none">
                          {/* Ligne 1 : Badges + Montant + Chevron */}
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={STATUS_COLORS[delivery.status]}>
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

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-right bg-gradient-to-br from-emerald-50 to-green-50 px-3 py-2 rounded-lg border-2 border-emerald-300 shadow-sm">
                                <div className="text-[9px] uppercase tracking-wide text-emerald-700 font-bold leading-tight">
                                  À remettre
                                </div>
                                <div className="text-xl font-black text-emerald-700 leading-tight">
                                  {delivery.totalDue.toLocaleString()}
                                </div>
                                <div className="text-[9px] text-emerald-600 font-semibold">Ar</div>
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

                            {/* LIVRAISON - Optimisé pour l'efficacité */}
                            <div className="flex flex-col gap-2 min-w-0 bg-gradient-to-br from-emerald-50 to-green-50/50 p-3 rounded-lg border-2 border-emerald-200">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="bg-emerald-600 p-1.5 rounded-lg shadow-sm">
                                  <MapPin className="h-4 w-4 text-white shrink-0" />
                                </div>
                                <div className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold">
                                  🎯 Destination
                                </div>
                                <Badge variant="outline" className="ml-auto text-[10px] bg-white border-emerald-300">
                                  <Package className="h-3 w-3 mr-1" />
                                  {delivery.parcelCount} colis
                                </Badge>
                              </div>
                              <div className="font-bold text-sm text-slate-900 leading-tight">
                                {delivery.receiverName}
                              </div>
                              <div className="text-xs text-slate-700 font-medium leading-snug">
                                {delivery.receiverAddress}
                              </div>
                              <div className="flex gap-1.5 mt-1">
                                <a
                                  href={`tel:${delivery.receiverPhone}`}
                                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-xs font-bold shadow-sm transition-all hover:shadow-md active:scale-95"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <PhoneCall className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{delivery.receiverPhone}</span>
                                </a>
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(delivery.receiverAddress)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold shadow-sm transition-all hover:shadow-md active:scale-95"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Navigation className="h-3.5 w-3.5" />
                                  GPS
                                </a>
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
                            {/* Boutons d'actions rapides - Layout optimisé */}
                            <div className="mt-2 mb-3 space-y-2">
                              {/* Bouton principal centré pour PICKED_UP */}
                              {delivery.status === "PICKED_UP" && (
                                <>
                                  {/* Bouton Livré & Payé - Centré */}
                                  <Button
                                    onClick={() =>
                                      updateStatusMutation.mutate({
                                        id: delivery.id,
                                        status: "PAID",
                                      })
                                    }
                                    disabled={updateStatusMutation.isPending}
                                    className="w-full h-9 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-md cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 font-bold transition-all hover:shadow-lg active:scale-[0.98]"
                                  >
                                    {updateStatusMutation.isPending ? (
                                      <>
                                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                      </>
                                    ) : (
                                      <>
                                        <Check className="h-4 w-4 mr-1.5" />
                                        Livré & Payé
                                      </>
                                    )}
                                  </Button>
                                  
                                  {/* Grille 2x2 des autres actions */}
                                  <div className="grid grid-cols-2 gap-2">
                                    {/* Livrer */}
                                    <Button
                                      onClick={() =>
                                        updateStatusMutation.mutate({
                                          id: delivery.id,
                                          status: "DELIVERED",
                                        })
                                      }
                                      disabled={updateStatusMutation.isPending}
                                      variant="outline"
                                      className="h-9 border-2 border-green-200 bg-green-50/50 hover:bg-green-100 text-green-700 hover:text-green-900 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 font-medium transition-all hover:shadow-md active:scale-[0.98]"
                                    >
                                      <Check className="h-3.5 w-3.5 mr-1" />
                                      Livrer
                                    </Button>
                                    
                                    {/* Remarque */}
                                    <Button
                                      onClick={() => handleRemarks(delivery.id, delivery.courierRemarks)}
                                      disabled={remarksMutation.isPending}
                                      variant="outline"
                                      className="h-9 border-2 border-blue-200 bg-blue-50/50 hover:bg-blue-100 text-blue-700 hover:text-blue-900 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 font-medium transition-all hover:shadow-md active:scale-[0.98]"
                                    >
                                      <MessageSquare className="h-3.5 w-3.5 mr-1" />
                                      Remarque
                                    </Button>

                                    {/* Reporter */}
                                    <Button
                                      onClick={() => handlePostpone(delivery.id)}
                                      disabled={postponeMutation.isPending}
                                      variant="outline"
                                      className="h-9 border-2 border-orange-200 bg-orange-50/50 hover:bg-orange-100 text-orange-700 hover:text-orange-900 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 font-medium transition-all hover:shadow-md active:scale-[0.98]"
                                    >
                                      <Calendar className="h-3.5 w-3.5 mr-1" />
                                      Reporter
                                    </Button>

                                    {/* Transférer */}
                                    <Button
                                      onClick={() => handleTransfer(delivery.id)}
                                      disabled={transferMutation.isPending || couriers.length === 0}
                                      variant="outline"
                                      className="h-9 border-2 border-purple-200 bg-purple-50/50 hover:bg-purple-100 text-purple-700 hover:text-purple-900 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 font-medium transition-all hover:shadow-md active:scale-[0.98]"
                                    >
                                      <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
                                      Transférer
                                    </Button>
                                  </div>
                                </>
                              )}
                              
                              {/* Action principale pour autres statuts */}
                              {next && delivery.status !== "PICKED_UP" && (
                                <>
                                  <Button
                                    onClick={() =>
                                      updateStatusMutation.mutate({
                                        id: delivery.id,
                                        status: next,
                                      })
                                    }
                                    disabled={updateStatusMutation.isPending}
                                    className="w-full h-9 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 font-semibold transition-all hover:shadow-lg active:scale-[0.98]"
                                  >
                                    {updateStatusMutation.isPending ? (
                                      <>
                                        <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Traitement...
                                      </>
                                    ) : (
                                      <>
                                        <Check className="h-4 w-4 mr-1.5" />
                                        {getStatusButtonLabel(delivery.status)}
                                      </>
                                    )}
                                  </Button>
                                  
                                  {/* Actions secondaires en grille 2x2 */}
                                  <div className="grid grid-cols-2 gap-2">
                                    <Button
                                      onClick={() => handleRemarks(delivery.id, delivery.courierRemarks)}
                                      disabled={remarksMutation.isPending}
                                      variant="outline"
                                      className="h-9 border-2 border-blue-200 bg-blue-50/50 hover:bg-blue-100 text-blue-700 hover:text-blue-900 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 font-medium transition-all hover:shadow-md active:scale-[0.98]"
                                    >
                                      <MessageSquare className="h-3.5 w-3.5 mr-1" />
                                      Remarque
                                    </Button>

                                    {["CREATED", "PICKED_UP"].includes(delivery.status) && (
                                      <>
                                        <Button
                                          onClick={() => handlePostpone(delivery.id)}
                                          disabled={postponeMutation.isPending}
                                          variant="outline"
                                          className="h-9 border-2 border-orange-200 bg-orange-50/50 hover:bg-orange-100 text-orange-700 hover:text-orange-900 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 font-medium transition-all hover:shadow-md active:scale-[0.98]"
                                        >
                                          <Calendar className="h-3.5 w-3.5 mr-1" />
                                          Reporter
                                        </Button>

                                        <Button
                                          onClick={() => handleTransfer(delivery.id)}
                                          disabled={transferMutation.isPending || couriers.length === 0}
                                          variant="outline"
                                          className="h-9 border-2 border-purple-200 bg-purple-50/50 hover:bg-purple-100 text-purple-700 hover:text-purple-900 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 font-medium transition-all hover:shadow-md active:scale-[0.98]"
                                        >
                                          <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
                                          Transférer
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </>
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
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                  <div className="text-sm font-medium text-red-900 mb-1">
                                    ⚠️ Remarque admin
                                  </div>
                                  <div className="text-sm text-red-800">
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

          {/* --- LIVRÉES (DELIVERED) --- */}
          {shouldShowDelivered && deliveredDeliveries.length > 0 && (
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-2">
                <div className="h-8 w-1 bg-gradient-to-b from-green-500 to-green-600 rounded-full"></div>
                <h2 className="text-lg font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
                  Livrées ({deliveredDeliveries.length})
                </h2>
              </div>

              <Accordion.Root type="single" collapsible className="space-y-2">
                {deliveredDeliveries.map((delivery) => {
                  const next = getNextStatus(delivery.status);
                  const itemValue = `delivered-${delivery.id}`;

                  return (
                    <Accordion.Item
                      key={delivery.id}
                      value={itemValue}
                      className="rounded-xl border-l-4 border-l-green-500 bg-white shadow-md hover:shadow-lg transition-shadow"
                    >
                      {/* EN-TÊTE OPTIMISÉ */}
                      <Accordion.Header asChild>
                        <div className="px-4 py-3 cursor-pointer select-none">
                          {/* Ligne 1 : Badges + Montant + Chevron */}
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={STATUS_COLORS[delivery.status]}>
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

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-right bg-gradient-to-br from-emerald-50 to-green-50 px-3 py-2 rounded-lg border-2 border-emerald-300 shadow-sm">
                                <div className="text-[9px] uppercase tracking-wide text-emerald-700 font-bold leading-tight">
                                  Reçu
                                </div>
                                <div className="text-xl font-black text-emerald-700 leading-tight">
                                  {delivery.totalDue.toLocaleString()}
                                </div>
                                <div className="text-[9px] text-emerald-600 font-semibold">Ar</div>
                              </div>

                              <Accordion.Trigger asChild>
                                <button
                                  aria-label="Afficher les détails"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 hover:from-green-100 hover:to-emerald-100 transition
                       data-[state=open]:rotate-180 data-[state=open]:bg-green-100"
                                >
                                  <ChevronDown className="h-4 w-4 text-green-600 transition-transform" />
                                </button>
                              </Accordion.Trigger>
                            </div>
                          </div>

                          {/* Info Destination - Optimisé pour l'efficacité */}
                          <div className="mt-3">
                            <div className="flex flex-col gap-2 bg-gradient-to-br from-green-50 to-emerald-50/50 p-3 rounded-lg border-2 border-green-200">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="bg-green-600 p-1.5 rounded-lg shadow-sm">
                                  <MapPin className="h-4 w-4 text-white shrink-0" />
                                </div>
                                <div className="text-[10px] uppercase tracking-wider text-green-700 font-bold">
                                  ✅ Livré à
                                </div>
                                <Badge variant="outline" className="ml-auto text-[10px] bg-white border-green-300">
                                  <Package className="h-3 w-3 mr-1" />
                                  {delivery.parcelCount} colis
                                </Badge>
                              </div>
                              <div className="font-bold text-sm text-slate-900 leading-tight">
                                {delivery.receiverName}
                              </div>
                              <div className="text-xs text-slate-700 font-medium leading-snug">
                                {delivery.receiverAddress}
                              </div>
                              <div className="flex gap-1.5 mt-1">
                                <a
                                  href={`tel:${delivery.receiverPhone}`}
                                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-xs font-bold shadow-sm transition-all hover:shadow-md active:scale-95"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <PhoneCall className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{delivery.receiverPhone}</span>
                                </a>
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(delivery.receiverAddress)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold shadow-sm transition-all hover:shadow-md active:scale-95"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Navigation className="h-3.5 w-3.5" />
                                  GPS
                                </a>
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
                            {/* Boutons d'actions - Layout optimisé */}
                            <div className="mt-2 mb-3 space-y-2">
                              {/* Bouton Marquer Payée - Centré */}
                              {next && (
                                <Button
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      id: delivery.id,
                                      status: next,
                                    })
                                  }
                                  disabled={updateStatusMutation.isPending}
                                  className="w-full h-9 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 font-semibold transition-all hover:shadow-lg active:scale-[0.98]"
                                >
                                  {updateStatusMutation.isPending ? (
                                    <>
                                      <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                      Traitement...
                                    </>
                                  ) : (
                                    <>
                                      <Check className="h-4 w-4 mr-1.5" />
                                      {getStatusButtonLabel(delivery.status)}
                                    </>
                                  )}
                                </Button>
                              )}
                              
                              {/* Action remarque seule en bas */}
                              <Button
                                onClick={() => handleRemarks(delivery.id, delivery.courierRemarks)}
                                disabled={remarksMutation.isPending}
                                variant="outline"
                                className="w-full h-9 border-2 border-blue-200 bg-blue-50/50 hover:bg-blue-100 text-blue-700 hover:text-blue-900 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 font-medium transition-all hover:shadow-md active:scale-[0.98]"
                              >
                                <MessageSquare className="h-3.5 w-3.5 mr-1" />
                                Remarque
                              </Button>
                            </div>

                            {/* Détails */}
                            <div className="space-y-3">
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
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                  <div className="text-sm font-medium text-red-900 mb-1">
                                    ⚠️ Remarque admin
                                  </div>
                                  <div className="text-sm text-red-800">
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
          {shouldShowCompleted && completedDeliveries.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-1 bg-gradient-to-b from-slate-400 to-slate-500 rounded-full"></div>
                <h2 className="text-lg font-bold bg-gradient-to-r from-slate-600 to-slate-700 bg-clip-text text-transparent">
                Terminées ({completedDeliveries.length})
              </h2>
              </div>

              <Accordion.Root type="single" collapsible className="space-y-2">
                {completedDeliveries.map((delivery) => {
                  const itemValue = `completed-${delivery.id}`;

                  // Couleur de bordure selon le statut
                  const borderColor = delivery.status === "PAID" 
                    ? "border-l-emerald-500" 
                    : delivery.status === "POSTPONED"
                    ? "border-l-purple-500"
                    : "border-l-red-500";

                  return (
                    <Accordion.Item
                      key={delivery.id}
                      value={itemValue}
                      className={`rounded-xl border-l-4 ${borderColor} bg-white shadow-md hover:shadow-lg transition-shadow opacity-90`}
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
                              <div className="text-right bg-gradient-to-br from-slate-50 to-slate-100 px-3 py-2 rounded-lg border border-slate-200">
                                <div className="text-[11px] leading-none text-slate-600 font-medium">
                                  Montant
                                </div>
                                <div className="text-base font-bold text-slate-700">
                                  {delivery.totalDue.toLocaleString()} Ar
                                </div>
                              </div>

                              <Accordion.Trigger asChild>
                                <button
                                  aria-label="Afficher les détails"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 hover:from-slate-100 hover:to-slate-200 transition
                       data-[state=open]:rotate-180 data-[state=open]:bg-slate-100"
                                >
                                  <ChevronDown className="h-4 w-4 text-slate-600 transition-transform" />
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
                                  Expéditeur
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

                            {/* LIVRAISON - Optimisé */}
                            <div className="flex flex-col gap-2 bg-gradient-to-br from-slate-50 to-slate-100/50 p-3 rounded-lg border-2 border-slate-200">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="bg-slate-500 p-1.5 rounded-lg shadow-sm">
                                  <MapPin className="h-4 w-4 text-white shrink-0" />
                                </div>
                                <div className="text-[10px] uppercase tracking-wider text-slate-600 font-bold">
                                  📍 Destinataire
                                </div>
                                <Badge variant="outline" className="ml-auto text-[10px] bg-white border-slate-300">
                                  <Package className="h-3 w-3 mr-1" />
                                  {delivery.parcelCount} colis
                                </Badge>
                              </div>
                              <div className="font-bold text-sm text-slate-900 leading-tight">
                                {delivery.receiverName}
                              </div>
                              <div className="text-xs text-slate-700 font-medium leading-snug">
                                {delivery.receiverAddress}
                              </div>
                              <a
                                href={`tel:${delivery.receiverPhone}`}
                                className="flex items-center justify-center gap-1 px-2 py-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded-md text-xs font-bold shadow-sm transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <PhoneCall className="h-3.5 w-3.5" />
                                {delivery.receiverPhone}
                              </a>
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
                            {/* Détails */}
                            <div className="space-y-3">
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
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                  <div className="text-sm font-medium text-red-900 mb-1">
                                    ⚠️ Remarque admin
                                  </div>
                                  <div className="text-sm text-red-800">
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
