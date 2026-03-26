import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

// Helper: verify the requesting lawyer has access to this client
async function verifyClientAccess(clientId: string, lawyerId: string) {
  const link = await prisma.caseClient.findFirst({
    where: {
      clientId,
      case: { lawyerId },
    },
  });
  return !!link;
}

// ── GET /api/clients/[id] ───────────────────────────────────────
export async function GET(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as string;
  if (role !== "LAWYER" && role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    // Check the client exists and is accessible
    const hasAccess = await verifyClientAccess(id, session.user.id!);
    if (!hasAccess) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const client = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        clientProfile: true,
        clientCases: {
          where: {
            case: { lawyerId: session.user.id! },
          },
          select: {
            role: true,
            addedAt: true,
            case: {
              select: {
                id: true,
                title: true,
                caseNumber: true,
                status: true,
              },
            },
          },
          orderBy: { addedAt: "desc" },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Fetch invoices where clientEmail matches
    const invoices = await prisma.invoice.findMany({
      where: {
        lawyerId: session.user.id!,
        clientEmail: client.email,
      },
      select: {
        id: true,
        invoiceNumber: true,
        description: true,
        totalPaise: true,
        status: true,
        dueDate: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ...client, invoices });
  } catch (error) {
    console.error("GET /api/clients/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch client" }, { status: 500 });
  }
}

// ── PATCH /api/clients/[id] ─────────────────────────────────────
const updateClientSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Invalid Indian mobile number")
    .optional()
    .or(z.literal(""))
    .or(z.null()),
  organization: z.string().max(200).optional().or(z.literal("")).or(z.null()),
  gstNumber: z.string().max(20).optional().or(z.literal("")).or(z.null()),
  panNumber: z.string().max(20).optional().or(z.literal("")).or(z.null()),
  address: z.string().max(500).optional().or(z.literal("")).or(z.null()),
  notes: z.string().max(2000).optional().or(z.literal("")).or(z.null()),
});

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as string;
  if (role !== "LAWYER" && role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const hasAccess = await verifyClientAccess(id, session.user.id!);
    if (!hasAccess) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const body = await req.json();
    const data = updateClientSchema.parse(body);

    // Separate User fields from ClientProfile fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userUpdate: any = {};
    if (data.name !== undefined) userUpdate.name = data.name;
    if (data.email !== undefined) userUpdate.email = data.email;
    if (data.phone !== undefined) userUpdate.phone = data.phone || null;
    if (data.address !== undefined) userUpdate.address = data.address || null;

    // Check email uniqueness if changing
    if (data.email) {
      const emailTaken = await prisma.user.findFirst({
        where: { email: data.email, id: { not: id } },
      });
      if (emailTaken) {
        return NextResponse.json(
          { error: "Email is already in use by another user" },
          { status: 409 }
        );
      }
    }

    // Update User
    if (Object.keys(userUpdate).length > 0) {
      await prisma.user.update({
        where: { id },
        data: userUpdate,
      });
    }

    // Upsert ClientProfile
    const profileFields = {
      organization: data.organization ?? undefined,
      gstNumber: data.gstNumber ?? undefined,
      panNumber: data.panNumber ?? undefined,
      notes: data.notes ?? undefined,
    };

    // Only touch profile if any profile field was provided
    const hasProfileUpdate =
      data.organization !== undefined ||
      data.gstNumber !== undefined ||
      data.panNumber !== undefined ||
      data.notes !== undefined;

    if (hasProfileUpdate) {
      await prisma.clientProfile.upsert({
        where: { userId: id },
        update: {
          organization: data.organization !== undefined ? (data.organization || null) : undefined,
          gstNumber: data.gstNumber !== undefined ? (data.gstNumber || null) : undefined,
          panNumber: data.panNumber !== undefined ? (data.panNumber || null) : undefined,
          notes: data.notes !== undefined ? (data.notes || null) : undefined,
        },
        create: {
          userId: id,
          ...profileFields,
        },
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id!,
        action: "client_updated",
        resource: "user",
        resourceId: id,
        metadata: { updatedFields: Object.keys(data).filter((k) => (data as any)[k] !== undefined) },
      },
    });

    return NextResponse.json({ success: true, message: "Client updated successfully." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("PATCH /api/clients/[id] error:", error);
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}

// ── DELETE /api/clients/[id] ────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as string;
  if (role !== "LAWYER" && role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const hasAccess = await verifyClientAccess(id, session.user.id!);
    if (!hasAccess) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Soft-delete: deactivate
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id!,
        action: "client_deactivated",
        resource: "user",
        resourceId: id,
        metadata: { clientId: id },
      },
    });

    return NextResponse.json({ success: true, message: "Client deactivated successfully." });
  } catch (error) {
    console.error("DELETE /api/clients/[id] error:", error);
    return NextResponse.json({ error: "Failed to deactivate client" }, { status: 500 });
  }
}
