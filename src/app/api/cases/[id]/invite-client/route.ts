import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Invalid Indian mobile")
    .optional()
    .or(z.literal("")),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as string;
  if (role === "CLIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Verify case belongs to lawyer
  const case_ = await prisma.case.findFirst({
    where: { id: id, lawyerId: session.user.id! },
  });
  if (!case_) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  try {
    const body = await req.json();
    const { email, name, phone } = inviteSchema.parse(body);

    // Check if user already exists
    let clientUser = await prisma.user.findUnique({ where: { email } });

    if (clientUser) {
      // Ensure the user is a CLIENT role or can be connected
      if (clientUser.role !== "CLIENT" && clientUser.role !== "LAWYER") {
        return NextResponse.json(
          { error: "User already exists with a different role" },
          { status: 409 }
        );
      }
    } else {
      // Create a new CLIENT user with a temporary password
      const tempPassword = uuidv4().replace(/-/g, "").slice(0, 12) + "A1!";
      const passwordHash = await bcrypt.hash(tempPassword, 12);

      // Find starter plan
      const starterPlan = await prisma.plan.findFirst({
        where: { tier: "STARTER" },
      });

      clientUser = await prisma.user.create({
        data: {
          email,
          name,
          phone: phone || undefined,
          passwordHash,
          role: "CLIENT",
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
    }

    // Check if already linked
    const existingLink = await prisma.caseClient.findFirst({
      where: { caseId: id, clientId: clientUser.id },
    });

    if (existingLink) {
      return NextResponse.json(
        { error: "Client already linked to this case" },
        { status: 409 }
      );
    }

    // Link client to case
    await prisma.caseClient.create({
      data: {
        caseId: id,
        clientId: clientUser.id,
        role: "client",
      },
    });

    // Create invite record
    const token = uuidv4();
    await prisma.clientInvite.create({
      data: {
        caseId: id,
        lawyerId: session.user.id!,
        email,
        name,
        phone: phone || undefined,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id!,
        action: "client_invited",
        resource: "case",
        resourceId: id,
        metadata: { clientEmail: email, clientName: name },
      },
    });

    // Timeline
    await prisma.caseTimeline.create({
      data: {
        caseId: id,
        eventType: "client_added",
        title: `Client added: ${name}`,
        description: `${name} (${email}) was granted portal access`,
        eventDate: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      clientId: clientUser.id,
      message: `Client ${name} has been invited. They can log in at /portal/login`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Invite client error:", error);
    return NextResponse.json({ error: "Invite failed" }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as string;
  if (role === "CLIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Verify case access
  const case_ = await prisma.case.findFirst({
    where: { id: id, lawyerId: session.user.id! },
    include: {
      clients: {
        include: {
          client: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
        },
      },
    },
  });

  if (!case_) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ clients: case_.clients });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as string;
  if (role === "CLIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");

  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  const case_ = await prisma.case.findFirst({
    where: { id: id, lawyerId: session.user.id! },
  });
  if (!case_) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.caseClient.deleteMany({
    where: { caseId: id, clientId },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id!,
      action: "client_removed",
      resource: "case",
      resourceId: id,
      metadata: { clientId },
    },
  });

  return NextResponse.json({ message: "Client access revoked" });
}
