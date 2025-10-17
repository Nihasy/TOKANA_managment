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
    const status = searchParams.get("status");
    const courierId = searchParams.get("courierId");
    const assignedToMe = searchParams.get("assignedToMe");

    const where: any = {};

    // If courier, only show their deliveries
    if (session.user.role === "COURIER") {
      where.courierId = session.user.id;
    } else if (assignedToMe === "true") {
      where.courierId = session.user.id;
    } else if (courierId) {
      where.courierId = courierId;
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      where.plannedDate = { gte: startDate, lte: endDate };
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
  } catch (error) {
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

    // Calculate total due
    const totalDue =
      validatedData.deliveryPrice + (validatedData.collectAmount || 0);

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
