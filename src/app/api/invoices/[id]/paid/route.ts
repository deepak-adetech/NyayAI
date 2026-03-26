import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET/POST /api/invoices/[id]/paid
 * Called by Razorpay callback or manually by lawyer.
 * Marks invoice as paid.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handlePaid(req, await params);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handlePaid(req, await params);
}

async function handlePaid(req: NextRequest, params: { id: string }) {
  const { id } = params;
  const { searchParams } = new URL(req.url);
  const razorpayPaymentId = searchParams.get("razorpay_payment_id");

  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) {
    return NextResponse.redirect(new URL("/invoices?error=not_found", req.url));
  }

  if (invoice.status !== "paid") {
    await prisma.invoice.update({
      where: { id },
      data: {
        status: "paid",
        paidAt: new Date(),
        metadata: {
          ...(invoice.metadata as Record<string, unknown> ?? {}),
          razorpayPaymentId: razorpayPaymentId ?? undefined,
          paidVia: razorpayPaymentId ? "razorpay" : "manual",
        },
      },
    });
  }

  // Redirect to a success page or back to invoices
  const appUrl = (process.env.NEXTAUTH_URL ?? "https://case.ade-technologies.com").replace(/\/$/, "");
  return NextResponse.redirect(`${appUrl}/invoices/${id}?paid=true`);
}
