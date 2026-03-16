import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { indexCaseForLearning } from "@/lib/rag";

const createCaseSchema = z.object({
  title: z.string().min(1).max(500),
  caseNumber: z.string().optional(),
  cnrNumber: z.string().optional(),
  firNumber: z.string().optional(),
  policeStation: z.string().optional(),
  caseType: z
    .enum(["CRIMINAL", "CIVIL", "FAMILY", "CONSUMER", "LABOUR", "TAX", "WRIT", "ARBITRATION", "OTHER"])
    .default("CRIMINAL"),
  courtName: z.string().optional(),
  courtDistrict: z.string().optional(),
  courtState: z.string().optional(),
  petitionerNames: z.array(z.string()).default([]),
  respondentNames: z.array(z.string()).default([]),
  bnsSections: z.array(z.string()).default([]),
  ipcSections: z.array(z.string()).default([]),
  filingDate: z.string().optional(),
  nextHearingDate: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  priority: z.number().int().min(0).max(2).default(0),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const search = searchParams.get("search");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
  const skip = (page - 1) * limit;

  const userId = session.user.id;
  const role = (session.user as any).role;

  let whereClause: any = {};

  if (role === "LAWYER") {
    whereClause.lawyerId = userId;
  } else if (role === "CLIENT") {
    whereClause.clients = { some: { clientId: userId } };
  }

  if (status) whereClause.status = status;
  if (type) whereClause.caseType = type;
  if (search) {
    whereClause.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { caseNumber: { contains: search, mode: "insensitive" } },
      { cnrNumber: { contains: search, mode: "insensitive" } },
      { firNumber: { contains: search, mode: "insensitive" } },
    ];
  }

  const [cases, total] = await Promise.all([
    prisma.case.findMany({
      where: whereClause,
      include: {
        _count: { select: { documents: true, hearings: true } },
      },
      orderBy: [
        { priority: "desc" },
        { nextHearingDate: "asc" },
        { updatedAt: "desc" },
      ],
      skip,
      take: limit,
    }),
    prisma.case.count({ where: whereClause }),
  ]);

  return NextResponse.json({
    cases,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "LAWYER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = createCaseSchema.parse(body);

    const newCase = await prisma.case.create({
      data: {
        lawyerId: session.user.id!,
        title: data.title,
        caseNumber: data.caseNumber,
        cnrNumber: data.cnrNumber,
        firNumber: data.firNumber,
        policeStation: data.policeStation,
        caseType: data.caseType,
        courtName: data.courtName,
        courtDistrict: data.courtDistrict,
        courtState: data.courtState,
        petitionerNames: data.petitionerNames,
        respondentNames: data.respondentNames,
        bnsSections: data.bnsSections,
        ipcSections: data.ipcSections,
        filingDate: data.filingDate ? new Date(data.filingDate) : undefined,
        nextHearingDate: data.nextHearingDate ? new Date(data.nextHearingDate) : undefined,
        notes: data.notes,
        tags: data.tags,
        priority: data.priority,
      },
    });

    // Fire-and-forget RAG indexing for AI learning (non-blocking)
    indexCaseForLearning({
      lawyerId: session.user.id!,
      caseId: newCase.id,
      caseTitle: newCase.title,
      caseType: newCase.caseType,
      cnrNumber: newCase.cnrNumber ?? undefined,
      parties: [...(newCase.petitionerNames ?? []), ...(newCase.respondentNames ?? [])].join(", "),
      actsSections: [...(newCase.bnsSections ?? []), ...(newCase.ipcSections ?? [])].join(", "),
      notes: newCase.notes ?? undefined,
    }).catch(() => {}); // Non-blocking — don't fail case creation if RAG is down

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id!,
        action: "case_created",
        resource: "case",
        resourceId: newCase.id,
        ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0] ?? undefined,
      },
    });

    // Timeline entry
    await prisma.caseTimeline.create({
      data: {
        caseId: newCase.id,
        eventType: "case_created",
        title: "Case Created",
        description: `Case "${newCase.title}" was created`,
        eventDate: new Date(),
      },
    });

    return NextResponse.json(newCase, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("Create case error:", error);
    return NextResponse.json({ error: "Failed to create case" }, { status: 500 });
  }
}
