import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { indexCaseForLearning } from "@/lib/rag";

async function verifyAccess(caseId: string, userId: string, role: string) {
  const case_ = await prisma.case.findUnique({
    where: { id: caseId },
    include: { clients: { where: { clientId: userId } } },
  });
  if (!case_) return null;

  if (role === "ADMIN") return case_;
  if (role === "LAWYER" && case_.lawyerId === userId) return case_;
  if (role === "CLIENT" && case_.clients.length > 0) return case_;
  return null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  const case_ = await verifyAccess(id, session.user.id!, role);
  if (!case_) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const fullCase = await prisma.case.findUnique({
    where: { id: id },
    include: {
      documents: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      hearings: {
        orderBy: { hearingDate: "desc" },
        take: 10,
      },
      timeline: {
        orderBy: { eventDate: "desc" },
        take: 20,
      },
      clients: {
        include: { client: { select: { id: true, name: true, email: true } } },
      },
      _count: { select: { documents: true, hearings: true } },
    },
  });

  // Audit log for CLIENT views
  if (role === "CLIENT") {
    await prisma.auditLog.create({
      data: {
        userId: session.user.id!,
        action: "case_viewed",
        resource: "case",
        resourceId: id,
      },
    });
  }

  return NextResponse.json(fullCase);
}

const updateCaseSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  caseNumber: z.string().optional().nullable(),
  cnrNumber: z.string().optional().nullable(),
  firNumber: z.string().optional().nullable(),
  policeStation: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "DISPOSED", "ARCHIVED", "TRANSFERRED", "STAYED"]).optional(),
  courtName: z.string().optional().nullable(),
  courtDistrict: z.string().optional().nullable(),
  courtState: z.string().optional().nullable(),
  benchJudge: z.string().optional().nullable(),
  petitionerNames: z.array(z.string()).optional(),
  respondentNames: z.array(z.string()).optional(),
  bnsSections: z.array(z.string()).optional(),
  ipcSections: z.array(z.string()).optional(),
  nextHearingDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  priority: z.number().int().min(0).max(2).optional(),
  aiSummary: z.string().optional().nullable(),
}).strict();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role === "CLIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const case_ = await verifyAccess(id, session.user.id!, role);
  if (!case_) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = await req.json();
    const data = updateCaseSchema.parse(body);

    const updated = await prisma.case.update({
      where: { id: id },
      data: {
        ...data,
        nextHearingDate: data.nextHearingDate ? new Date(data.nextHearingDate) : data.nextHearingDate,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id!,
        action: "case_updated",
        resource: "case",
        resourceId: id,
        metadata: { changes: Object.keys(data) },
      },
    });

    // Fire-and-forget RAG re-indexing when case notes/sections change (non-blocking)
    const ragTriggerFields = ["notes", "bnsSections", "ipcSections", "title", "petitionerNames", "respondentNames"];
    if (Object.keys(data).some((k) => ragTriggerFields.includes(k))) {
      indexCaseForLearning({
        lawyerId: session.user.id!,
        caseId: updated.id,
        caseTitle: updated.title,
        caseType: updated.caseType,
        cnrNumber: updated.cnrNumber ?? undefined,
        parties: [...(updated.petitionerNames ?? []), ...(updated.respondentNames ?? [])].join(", "),
        actsSections: [...(updated.bnsSections ?? []), ...(updated.ipcSections ?? [])].join(", "),
        notes: updated.notes ?? undefined,
        outcome: updated.status,
      }).catch(() => {}); // Non-blocking
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role === "CLIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const case_ = await verifyAccess(id, session.user.id!, role);
  if (!case_) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Soft delete — archive instead of hard delete
  await prisma.case.update({
    where: { id: id },
    data: { status: "ARCHIVED" },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id!,
      action: "case_archived",
      resource: "case",
      resourceId: id,
    },
  });

  return NextResponse.json({ message: "Case archived" });
}
