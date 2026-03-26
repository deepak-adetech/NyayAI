import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  caseId: z.string().uuid().optional(),
  clientName: z.string().min(1),
  clientEmail: z.string().email().optional().or(z.literal("")),
  clientPhone: z.string().optional().or(z.literal("")),
  description: z.string().min(1),
  lineItems: z.array(z.object({
    description: z.string().min(1),
    amountPaise: z.number().int().positive(),
    category: z.string().default("fee"),
  })).min(1),
  taxPaise: z.number().int().min(0).default(0),
  dueDate: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = 25;

  const where: Record<string, unknown> = { lawyerId: session.user.id! };
  if (status && status !== "all") where.status = status;

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        case: { select: { id: true, title: true } },
        lineItems: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.invoice.count({ where }),
  ]);

  return NextResponse.json({ invoices, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const amountPaise = data.lineItems.reduce((sum, item) => sum + item.amountPaise, 0);
    const totalPaise = amountPaise + data.taxPaise;

    // Generate invoice number: INV-YYYYMMDD-NNN
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const count = await prisma.invoice.count({
      where: {
        lawyerId: session.user.id!,
        createdAt: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        },
      },
    });
    const invoiceNumber = `INV-${dateStr}-${String(count + 1).padStart(3, "0")}`;

    const invoice = await prisma.invoice.create({
      data: {
        lawyerId: session.user.id!,
        caseId: data.caseId || undefined,
        clientName: data.clientName,
        clientEmail: data.clientEmail || undefined,
        clientPhone: data.clientPhone || undefined,
        invoiceNumber,
        description: data.description,
        amountPaise,
        taxPaise: data.taxPaise,
        totalPaise,
        status: "draft",
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        lineItems: {
          create: data.lineItems.map((item) => ({
            description: item.description,
            amountPaise: item.amountPaise,
            category: item.category,
          })),
        },
      },
      include: { lineItems: true },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    console.error("[invoices] Create error:", error);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}
