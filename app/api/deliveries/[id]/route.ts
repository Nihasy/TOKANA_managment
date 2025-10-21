import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-utils";
import { deliverySchema } from "@/lib/validations/delivery";
import { computePrice } from "@/lib/pricing";

// GET single delivery
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            phone: true,
            pickupAddress: true,
          },
        },
        courier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!delivery) {
      return NextResponse.json(
        { error: "Livraison introuvable" },
        { status: 404 }
      );
    }

    return NextResponse.json(delivery);
  } catch (error) {
    console.error("GET /api/deliveries/[id]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

// PATCH update delivery
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    console.log('📥 PATCH /api/deliveries/[id] - Body reçu:', body);

    // Validate input
    const validatedData = deliverySchema.parse(body);
    console.log('✅ Validation réussie:', validatedData);

    // Check if delivery exists
    const existingDelivery = await prisma.delivery.findUnique({
      where: { id },
    });

    if (!existingDelivery) {
      return NextResponse.json(
        { error: "Livraison introuvable" },
        { status: 404 }
      );
    }

    // Compute pricing
    const deliveryPrice = computePrice({
      zone: validatedData.zone,
      weightKg: validatedData.weightKg,
      isExpress: validatedData.isExpress,
    });

    // Calculate totalDue based on isPrepaid and deliveryFeePrepaid
    const deliveryFeePrepaid = validatedData.deliveryFeePrepaid || false;
    const isPrepaid = validatedData.isPrepaid || false;
    
    const totalDue = deliveryFeePrepaid 
      ? (isPrepaid ? 0 : (validatedData.collectAmount || 0))  // Si frais prépayés, seul le montant du produit
      : (isPrepaid 
          ? deliveryPrice  // Si isPrepaid, seulement les frais
          : deliveryPrice + (validatedData.collectAmount || 0));  // Sinon tout

    console.log('🔄 Mise à jour de la livraison:', {
      id,
      deliveryPrice,
      totalDue,
      isPrepaid,
      deliveryFeePrepaid,
      collectAmount: validatedData.collectAmount,
    });

    // Update delivery
    const delivery = await prisma.delivery.update({
      where: { id },
      data: {
        plannedDate: new Date(validatedData.plannedDate),
        senderId: validatedData.senderId,
        receiverName: validatedData.receiverName,
        receiverPhone: validatedData.receiverPhone,
        receiverAddress: validatedData.receiverAddress,
        zone: validatedData.zone,
        parcelCount: validatedData.parcelCount,
        weightKg: validatedData.weightKg,
        isExpress: validatedData.isExpress,
        description: validatedData.description || null,
        note: validatedData.note || null,
        collectAmount: isPrepaid ? 0 : (validatedData.collectAmount || 0),
        isPrepaid,
        deliveryFeePrepaid,
        deliveryPrice,
        autoPrice: deliveryPrice,
        totalDue,
        courierId: validatedData.courierId && validatedData.courierId !== "UNASSIGNED" ? validatedData.courierId : null,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            phone: true,
            pickupAddress: true,
          },
        },
        courier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(delivery);
  } catch (error) {
    console.error("❌ PATCH /api/deliveries/[id] - Erreur:", error);
    
    // Si c'est une erreur Zod, renvoyer les détails
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError' && 'errors' in error) {
      console.error("❌ Erreur de validation Zod:", error.errors);
      const zodErrors = error.errors as Array<{ path: Array<string | number>; message: string }>;
      return NextResponse.json(
        { 
          error: "Erreur de validation", 
          details: error.errors,
          message: zodErrors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la mise à jour" },
      { status: 500 }
    );
  }
}

// DELETE delivery
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    // Check if delivery exists
    const existingDelivery = await prisma.delivery.findUnique({
      where: { id },
    });

    if (!existingDelivery) {
      return NextResponse.json(
        { error: "Livraison introuvable" },
        { status: 404 }
      );
    }

    // Check if delivery can be deleted (only if CREATED or POSTPONED)
    if (!["CREATED", "POSTPONED", "CANCELED"].includes(existingDelivery.status)) {
      return NextResponse.json(
        { error: "Impossible de supprimer une livraison en cours ou terminée" },
        { status: 400 }
      );
    }

    await prisma.delivery.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/deliveries/[id]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la suppression" },
      { status: 500 }
    );
  }
}

