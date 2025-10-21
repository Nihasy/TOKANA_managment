"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DollarSign,
  Package,
  CheckCircle2,
  Phone,
  MapPin,
  Calendar,
  TrendingUp,
  AlertCircle,
  FileText,
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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
    deliveryFeePrepaid: boolean;
    isSettled: boolean;
    settlementType: string | null;
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
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split("T")[0]
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "settled" | "all">("pending");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [maxDate, setMaxDate] = useState<string>(yesterdayStr);
  const [settlementType, setSettlementType] = useState<string>("CASH_COURIER");
  const [settleDialog, setSettleDialog] = useState<{
    open: boolean;
    client: ClientSettlement | null;
  }>({
    open: false,
    client: null,
  });

  // Fetch settlements data
  const { data, isLoading } = useQuery<SettlementsData>({
    queryKey: ["settlements", filter, maxDate],
    queryFn: async () => {
      const res = await fetch(`/api/settlements?filter=${filter}&maxDate=${maxDate}`);
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
    mutationFn: async ({ deliveryIds, settlementType }: { deliveryIds: string[], settlementType: string }) => {
      const res = await fetch("/api/settlements/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryIds, settlementType }),
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
      setSettlementType("CASH_COURIER"); // Reset
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
      settleMutation.mutate({ deliveryIds, settlementType });
    }
  };

  // Generate PDF Invoice
  const generateInvoice = (clientData: ClientSettlement) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header
    doc.setFillColor(71, 85, 105); // slate-600
    doc.rect(0, 0, pageWidth, 40, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("FACTURE DE REGLEMENT", pageWidth / 2, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Tokana Delivery Management", pageWidth / 2, 30, { align: "center" });
    
    // Date
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Date d'emission: ${new Date().toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`, 14, 50);
    doc.text(`Periode: Jusqu'au ${new Date(maxDate).toLocaleDateString("fr-FR")}`, 14, 56);
    
    // Client Info
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("CLIENT", 14, 68);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(clientData.client.name, 14, 75);
    doc.text(`Tel: ${clientData.client.phone}`, 14, 81);
    doc.text(`Adresse: ${clientData.client.pickupAddress}`, 14, 87);
    
    // Deliveries Table
    const tableData = clientData.deliveries.map((delivery) => {
      const collectAmount = delivery.collectAmount || 0;
      const deliveryFee = delivery.deliveryPrice;
      let netAmount = 0;
      
      if (delivery.isPrepaid) {
        netAmount = delivery.deliveryFeePrepaid ? 0 : -deliveryFee;
      } else {
        netAmount = delivery.deliveryFeePrepaid ? collectAmount : collectAmount - deliveryFee;
      }
      
      return [
        delivery.receiverName,
        new Date(delivery.plannedDate).toLocaleDateString("fr-FR"),
        `${collectAmount.toLocaleString("fr-FR").replace(/\s/g, " ")} Ar`,
        `${deliveryFee.toLocaleString("fr-FR").replace(/\s/g, " ")} Ar`,
        delivery.isPrepaid ? "Oui" : "Non",
        delivery.deliveryFeePrepaid ? "Oui" : "Non",
        `${netAmount.toLocaleString("fr-FR").replace(/\s/g, " ")} Ar`,
        delivery.isSettled ? "Regle" : "En attente",
      ];
    });
    
    autoTable(doc, {
      startY: 95,
      head: [["Destinataire", "Date", "Collecte", "Frais", "Prepaye", "Frais payes", "Net", "Statut"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 22 },
        2: { cellWidth: 22, halign: "right" },
        3: { cellWidth: 20, halign: "right" },
        4: { cellWidth: 18, halign: "center" },
        5: { cellWidth: 20, halign: "center" },
        6: { cellWidth: 22, halign: "right" },
        7: { cellWidth: 22, halign: "center" },
      },
    });
    
    // Summary - Get Y position after table
    const finalY = doc.lastAutoTable?.finalY || 150;
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(14, finalY, pageWidth - 28, 35, "F");
    
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.rect(14, finalY, pageWidth - 28, 35, "S");
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("RECAPITULATIF", 20, finalY + 8);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Nombre de livraisons: ${clientData.deliveries.length}`, 20, finalY + 16);
    doc.text(`Total frais collectes: ${clientData.totalDeliveryFees.toLocaleString("fr-FR").replace(/\s/g, " ")} Ar`, 20, finalY + 24);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    const settlementAmount = clientData.totalToSettle.toLocaleString("fr-FR").replace(/\s/g, " ");
    const settlementText = clientData.totalToSettle >= 0 
      ? `Montant a remettre: +${settlementAmount} Ar`
      : `Montant a collecter: ${settlementAmount} Ar`;
    doc.text(settlementText, pageWidth - 16, finalY + 30, { align: "right" });
    
    // Footer
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Document genere automatiquement par Tokana Delivery Management", pageWidth / 2, doc.internal.pageSize.height - 10, { align: "center" });
    
    // Save
    const fileName = `Facture_${clientData.client.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(fileName);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 bg-white border-l-4 border-l-slate-600 rounded-lg p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">Règlements clients J+1</h1>
            <p className="text-slate-600 mt-1">
              Versements aux clients le lendemain de la livraison
            </p>
          </div>
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-4 border-slate-200 border-t-slate-600 animate-spin"></div>
                  <DollarSign className="h-8 w-8 text-slate-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
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
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 bg-white border-l-4 border-l-slate-600 rounded-lg p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Règlements clients J+1</h1>
          <p className="text-slate-600 mt-1">
            Versements aux clients le lendemain de la livraison
          </p>
          <div className="mt-3 flex items-start gap-2 bg-slate-100 rounded-lg p-3 border border-slate-200">
            <AlertCircle className="h-5 w-5 text-slate-600 mt-0.5" />
            <p className="text-sm text-slate-700">
              Seules les livraisons payées (PAID) dont la date prévue est passée sont affichées.
              Les montants positifs sont à remettre au client, les montants négatifs sont des frais à collecter.
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="border-l-4 border-l-slate-600 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 font-medium">Total à remettre</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {data.summary.totalToSettle.toLocaleString()} Ar
                    </p>
                  </div>
                  <div className="bg-slate-100 p-3 rounded-lg">
                    <DollarSign className="h-6 w-6 text-slate-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-600 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 font-medium">Frais de livraison</p>
                    <p className="text-2xl font-bold text-emerald-700">
                      {data.summary.totalDeliveryFees.toLocaleString()} Ar
                    </p>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-600 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 font-medium">Livraisons</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {data.summary.totalDeliveries}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <Package className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filter Tabs and Date */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex gap-2 flex-1">
            <Button
              variant={filter === "pending" ? "default" : "outline"}
              onClick={() => setFilter("pending")}
              className={`cursor-pointer ${filter === "pending" ? "bg-slate-900 hover:bg-slate-800" : ""}`}
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              En attente
            </Button>
            <Button
              variant={filter === "settled" ? "default" : "outline"}
              onClick={() => setFilter("settled")}
              className={`cursor-pointer ${filter === "settled" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
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
          <div className="flex items-center gap-2 md:w-72">
            <label className="text-sm font-medium text-slate-700 whitespace-nowrap">
              <Calendar className="h-4 w-4 inline mr-1" />
              Jusqu&apos;au :
            </label>
            <input
              type="date"
              value={maxDate}
              onChange={(e) => setMaxDate(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>

        {/* Client Selector */}
        {data && data.clients.length > 0 && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Filtrer par client
                  </label>
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les clients" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les clients</SelectItem>
                      {data.clients.map((clientData) => (
                        <SelectItem key={clientData.client.id} value={clientData.client.id}>
                          {clientData.client.name} - {clientData.totalToSettle >= 0 ? "+" : ""}{clientData.totalToSettle.toLocaleString()} Ar
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedClientId && selectedClientId !== "all" && (
                  <Button
                    variant="outline"
                    onClick={() => setSelectedClientId("all")}
                    className="cursor-pointer mt-7"
                  >
                    Afficher tous
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

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
            {data?.clients
              .filter((clientData) => 
                !selectedClientId || selectedClientId === "all" || clientData.client.id === selectedClientId
              )
              .map((clientData) => (
              <Card
                key={clientData.client.id}
                className="border-l-4 border-l-slate-600 shadow-sm hover:shadow-md transition-shadow"
              >
                <CardHeader className="bg-slate-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900">
                          {clientData.client.name}
                        </span>
                        <Badge
                          className={
                            clientData.deliveries.some((d) => !d.isSettled)
                              ? clientData.totalToSettle >= 0
                                ? "bg-amber-100 text-amber-800 border-amber-300"
                                : "bg-red-100 text-red-800 border-red-300"
                              : "bg-emerald-100 text-emerald-800 border-emerald-300"
                          }
                        >
                          {clientData.deliveries.filter((d) => !d.isSettled).length > 0
                            ? clientData.totalToSettle >= 0
                              ? `${clientData.deliveries.filter((d) => !d.isSettled).length} à remettre`
                              : `${clientData.deliveries.filter((d) => !d.isSettled).length} débit(s)`
                            : "Réglé"}
                        </Badge>
                      </CardTitle>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-600 flex-wrap">
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
                      <div className="text-sm text-slate-600 font-medium mb-1">
                        {clientData.totalToSettle >= 0 ? "À remettre" : "Débit client"}
                      </div>
                      <div className={`text-2xl font-bold ${
                        clientData.totalToSettle >= 0 
                          ? "text-slate-900" 
                          : "text-red-700"
                      }`}>
                        {clientData.totalToSettle >= 0 ? "+" : ""}{clientData.totalToSettle.toLocaleString()} Ar
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Frais: {clientData.totalDeliveryFees.toLocaleString()} Ar
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateInvoice(clientData)}
                        className="mt-2 w-full cursor-pointer hover:bg-slate-100"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Facture
                      </Button>
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
                              {delivery.deliveryFeePrepaid && (
                                <Badge className="bg-green-100 text-green-800 text-xs">
                                  Frais payés ✓
                                </Badge>
                              )}
                              {delivery.isSettled && (
                                <>
                                  <Badge className="bg-green-100 text-green-800 text-xs">
                                    ✓ Réglé
                                  </Badge>
                                  {delivery.settlementType && (
                                    <Badge variant="outline" className="text-xs">
                                      {delivery.settlementType === "CASH_COURIER" && "💵 Cash livreur"}
                                      {delivery.settlementType === "MOBILE_MONEY" && "📱 Mobile Money"}
                                      {delivery.settlementType === "OFFICE_PICKUP" && "🏢 Siège"}
                                    </Badge>
                                  )}
                                </>
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
                              // Livraison prépayée
                              delivery.deliveryFeePrepaid ? (
                                // Tout est payé
                                <div className="text-sm text-slate-600">
                                  <div className="text-xs">Tout payé d&apos;avance</div>
                                  <div className="font-semibold text-green-700">
                                    0 Ar
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    Frais: {delivery.deliveryPrice.toLocaleString()} Ar ✓
                                  </div>
                                </div>
                              ) : (
                                // Client doit payer les frais
                                <div className="text-sm text-red-600">
                                  <div className="text-xs">Débit (frais)</div>
                                  <div className="font-semibold">
                                    -{delivery.deliveryPrice.toLocaleString()} Ar
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    Livraison prépayée
                                  </div>
                                </div>
                              )
                            ) : (
                              // Livraison non prépayée
                              delivery.deliveryFeePrepaid ? (
                                // Frais déjà payés, on rend tout
                                <div className="text-sm">
                                  <div className="text-xs text-slate-600">Collecté</div>
                                  <div className="font-semibold text-purple-700">
                                    {delivery.collectAmount?.toLocaleString() || 0} Ar
                                  </div>
                                  <div className="text-xs text-green-600">
                                    Frais: {delivery.deliveryPrice.toLocaleString()} Ar ✓
                                  </div>
                                  <div className="text-xs font-semibold text-green-700 mt-1">
                                    À remettre: {(delivery.collectAmount || 0).toLocaleString()} Ar
                                  </div>
                                </div>
                              ) : (
                                // On déduit les frais
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
                              )
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
                      className={`w-full cursor-pointer ${
                        clientData.totalToSettle >= 0
                          ? "bg-slate-900 hover:bg-slate-800"
                          : "bg-red-600 hover:bg-red-700"
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {clientData.totalToSettle >= 0
                        ? `Remettre ${clientData.totalToSettle.toLocaleString()} Ar au client`
                        : `Collecter ${Math.abs(clientData.totalToSettle).toLocaleString()} Ar du client`}
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
              {settleDialog.client && settleDialog.client.totalToSettle >= 0
                ? "Confirmez que vous avez remis les fonds au client"
                : "Confirmez que vous avez collecté les frais auprès du client"}
            </DialogDescription>
          </DialogHeader>
          {settleDialog.client && (
            <div className="py-4">
              <div className={`${
                settleDialog.client.totalToSettle >= 0 
                  ? "bg-slate-50 border-slate-200" 
                  : "bg-red-50 border-red-200"
              } p-4 rounded-lg mb-4 border`}>
                <div className="font-semibold text-slate-900 mb-2">
                  {settleDialog.client.client.name}
                </div>
                <div className="text-sm text-slate-600 mb-3">
                  {settleDialog.client.deliveries.filter((d) => !d.isSettled).length} livraison(s)
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-slate-600">
                    {settleDialog.client.totalToSettle >= 0 ? "Montant à remettre:" : "Montant à collecter:"}
                  </span>
                  <span className={`text-2xl font-bold ${
                    settleDialog.client.totalToSettle >= 0 ? "text-slate-900" : "text-red-600"
                  }`}>
                    {settleDialog.client.totalToSettle >= 0 ? "+" : ""}
                    {settleDialog.client.totalToSettle.toLocaleString()} Ar
                  </span>
                </div>
              </div>

              {/* Settlement Type Selector */}
              <div className="mb-4">
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Type de remise
                </label>
                <Select value={settlementType} onValueChange={setSettlementType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH_COURIER">💵 Cash livré par livreur</SelectItem>
                    <SelectItem value="MOBILE_MONEY">📱 Mobile Money</SelectItem>
                    <SelectItem value="OFFICE_PICKUP">🏢 Récupéré au siège par le client</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className={`${
                settleDialog.client.totalToSettle >= 0 
                  ? "bg-blue-50 border-blue-200" 
                  : "bg-orange-50 border-orange-200"
              } rounded-lg p-3 border`}>
                <div className="flex items-start gap-2">
                  <AlertCircle className={`h-5 w-5 mt-0.5 ${
                    settleDialog.client.totalToSettle >= 0 ? "text-blue-600" : "text-orange-600"
                  }`} />
                  <div className={`text-sm ${
                    settleDialog.client.totalToSettle >= 0 ? "text-blue-800" : "text-orange-800"
                  }`}>
                    {settleDialog.client.totalToSettle >= 0 
                      ? "Cette action marquera toutes les livraisons de ce client comme réglées."
                      : "Cette action enregistrera le paiement des frais par le client et marquera les livraisons comme réglées."}
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
              className="bg-slate-900 hover:bg-slate-800 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
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

