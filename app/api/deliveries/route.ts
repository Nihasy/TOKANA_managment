import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireAuth } from "@/lib/auth-utils";
import { deliverySchema } from "@/lib/validations/delivery";
import { computePrice } from "@/lib/pricing";

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);

    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const status = searchParams.get("status");
    const courierId = searchParams.get("courierId");
    const clientId = searchParams.get("clientId");
    const assignedToMe = searchParams.get("assignedToMe");

    const where: Record<string, unknown> = {};

    // If courier, only show their deliveries
    if (session.user.role === "COURIER") {
      where.courierId = session.user.id;
    } else if (assignedToMe === "true") {
      where.courierId = session.user.id;
    } else if (courierId) {
      if (courierId === "UNASSIGNED") {
        where.courierId = null;
      } else {
        where.courierId = courierId;
      }
    }

    // Filtre par client
    if (clientId) {
      where.senderId = clientId;
    }

    // Filtre par date (ancien système pour compatibilité)
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      // Inclure les livraisons dont plannedDate OU originalPlannedDate correspond à la date
      where.OR = [
        { plannedDate: { gte: start, lte: end } },
        { originalPlannedDate: { gte: start, lte: end } },
      ];
    }
    // Nouveau système : plage de dates (startDate -> endDate)
    else if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      // Inclure les livraisons dont plannedDate OU originalPlannedDate est dans la plage
      where.OR = [
        { plannedDate: { gte: start, lte: end } },
        { originalPlannedDate: { gte: start, lte: end } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const deliveries = await prisma.delivery.findMany({
      where,
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
            phone: true,
          },
        },
      },
      orderBy: { plannedDate: "desc" },
    });

    return NextResponse.json(deliveries);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validatedData = deliverySchema.parse(body);

    // Calculate auto price
    const autoPrice = computePrice({
      zone: validatedData.zone,
      weightKg: validatedData.weightKg,
      isExpress: validatedData.isExpress,
    });

    // Calculate total due (montant que le destinataire doit payer au livreur)
    const deliveryFeePrepaid = validatedData.deliveryFeePrepaid || false;
    const isPrepaid = validatedData.isPrepaid || false;
    
    const totalDue = deliveryFeePrepaid 
      ? (isPrepaid ? 0 : (validatedData.collectAmount || 0))  // Si frais prépayés, seul le montant du produit
      : (isPrepaid 
          ? validatedData.deliveryPrice  // Si isPrepaid, seulement les frais
          : validatedData.deliveryPrice + (validatedData.collectAmount || 0));  // Sinon tout

    const delivery = await prisma.delivery.create({
      data: {
        plannedDate: new Date(validatedData.plannedDate),
        senderId: validatedData.senderId,
        receiverName: validatedData.receiverName,
        receiverPhone: validatedData.receiverPhone,
        receiverAddress: validatedData.receiverAddress,
        parcelCount: validatedData.parcelCount,
        weightKg: validatedData.weightKg,
        description: validatedData.description,
        note: validatedData.note,
        zone: validatedData.zone,
        isExpress: validatedData.isExpress,
        autoPrice,
        deliveryPrice: validatedData.deliveryPrice,
        collectAmount: validatedData.collectAmount,
        isPrepaid,
        deliveryFeePrepaid,
        totalDue,
        courierId: validatedData.courierId,
        status: "CREATED",
      },
      include: {
        sender: true,
        courier: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    return NextResponse.json(delivery, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
