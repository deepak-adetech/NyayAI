import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Invalid Indian mobile")
    .optional()
    .or(z.literal("")),
  barCouncilNumber: z.string().max(50).optional(),
  barCouncilState: z.string().optional(),
  firmName: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  pincode: z.string().max(6).optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = updateProfileSchema.parse(body);

    const updated = await prisma.user.update({
      where: { id: session.user.id! },
      data: {
        name: data.name,
        phone: data.phone || null,
        barCouncilNumber: data.barCouncilNumber || null,
        barCouncilState: data.barCouncilState || null,
        firmName: data.firmName || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        pincode: data.pincode || null,
      },
      select: { id: true, name: true, email: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id!,
        action: "profile_updated",
        resource: "user",
        resourceId: session.user.id!,
        metadata: { fields: Object.keys(data) },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id! },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      barCouncilNumber: true,
      barCouncilState: true,
      firmName: true,
      address: true,
      city: true,
      state: true,
      pincode: true,
      role: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  return NextResponse.json(user);
}
