import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

// ── GET /api/clients ────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as string;
  if (role !== "LAWYER" && role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 1), 200);
  const page = Math.max(parseInt(searchParams.get("page") ?? "1", 10) || 1, 1);
  const skip = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    role: "CLIENT",
    clientCases: {
      some: {
        case: { lawyerId: session.user.id! },
      },
    },
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  try {
    const [clients, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          isActive: true,
          createdAt: true,
          clientProfile: {
            select: {
              organization: true,
              gstNumber: true,
              panNumber: true,
              notes: true,
            },
          },
          _count: { select: { clientCases: true } },
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      clients,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/clients error:", error);
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}

// ── POST /api/clients ───────────────────────────────────────────
const createClientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Invalid Indian mobile number")
    .optional()
    .or(z.literal("")),
  organization: z.string().max(200).optional().or(z.literal("")),
  gstNumber: z.string().max(20).optional().or(z.literal("")),
  panNumber: z.string().max(20).optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as string;
  if (role !== "LAWYER" && role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const data = createClientSchema.parse(body);

    // Duplicate check
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    // Generate temporary password
    const tempPassword = uuidv4().replace(/-/g, "").slice(0, 12) + "A1!";
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    // Find starter plan
    const starterPlan = await prisma.plan.findFirst({
      where: { tier: "STARTER" },
    });

    // Create user + profile + subscription
    const clientUser = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        phone: data.phone && data.phone.trim().length > 0 ? data.phone.trim() : undefined,
        address: data.address || undefined,
        passwordHash,
        emailVerified: new Date(), // Lawyer-created clients are pre-verified
        role: "CLIENT",
        clientProfile:
          data.organization || data.gstNumber || data.panNumber || data.notes
            ? {
                create: {
                  organization: data.organization || undefined,
                  gstNumber: data.gstNumber || undefined,
                  panNumber: data.panNumber || undefined,
                  notes: data.notes || undefined,
                },
              }
            : undefined,
        subscription: starterPlan
          ? {
              create: {
                planId: starterPlan.id,
                status: "ACTIVE",
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(
                  Date.now() + 365 * 24 * 60 * 60 * 1000
                ),
              },
            }
          : undefined,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id!,
        action: "client_created",
        resource: "user",
        resourceId: clientUser.id,
        metadata: { clientEmail: data.email, clientName: data.name },
      },
    });

    return NextResponse.json(
      {
        success: true,
        clientId: clientUser.id,
        message: `Client ${data.name} created successfully.`,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("POST /api/clients error:", error);
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
