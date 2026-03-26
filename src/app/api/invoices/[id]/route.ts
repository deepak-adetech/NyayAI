import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: { id, lawyerId: session.user.id! },
    include: {
      case: { select: { id: true, title: true, caseNumber: true } },
      lineItems: true,
      lawyer: { select: { name: true, email: true, phone: true } },
    },
  });

  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(invoice);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: { id, lawyerId: session.user.id! },
  });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (invoice.status !== "draft")
    return NextResponse.json({ error: "Only draft invoices can be edited" }, { status: 400 });

  const body = await req.json();

  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      clientName: body.clientName ?? invoice.clientName,
      clientEmail: body.clientEmail ?? invoice.clientEmail,
      clientPhone: body.clientPhone ?? invoice.clientPhone,
      description: body.description ?? invoice.description,
      taxPaise: body.taxPaise ?? invoice.taxPaise,
      dueDate: body.dueDate ? new Date(body.dueDate) : invoice.dueDate,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: { id, lawyerId: session.user.id! },
  });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (invoice.status !== "draft")
    return NextResponse.json({ error: "Only draft invoices can be deleted" }, { status: 400 });

  await prisma.invoice.delete({ where: { id } });
  return NextResponse.json({ message: "Invoice deleted" });
}
