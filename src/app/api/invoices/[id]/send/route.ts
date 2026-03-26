/**
 * POST /api/invoices/[id]/send
 *
 * Sends an invoice to the client:
 * 1. Creates Razorpay Payment Link (if configured)
 * 2. Generates UPI deep link
 * 3. Sends email + WhatsApp with payment links
 * 4. Updates invoice status to "sent"
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/zepto";
import { sendTextMessage } from "@/lib/whatsapp/client";
import { invoicePaymentMessage } from "@/lib/whatsapp/templates";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: { id, lawyerId: session.user.id! },
    include: { lineItems: true, lawyer: { select: { name: true, email: true } } },
  });

  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (invoice.status === "paid") return NextResponse.json({ error: "Invoice already paid" }, { status: 400 });

  const amountRupees = (invoice.totalPaise / 100).toFixed(2);
  const appUrl = (process.env.NEXTAUTH_URL ?? "https://case.ade-technologies.com").replace(/\/$/, "");
  const lawyerName = invoice.lawyer?.name ?? "Your Lawyer";

  // Generate UPI deep link
  const upiVpa = process.env.UPI_VPA ?? "";
  let upiDeepLink = "";
  if (upiVpa) {
    upiDeepLink = `upi://pay?pa=${encodeURIComponent(upiVpa)}&pn=${encodeURIComponent(lawyerName)}&am=${amountRupees}&tn=${encodeURIComponent(invoice.invoiceNumber)}&cu=INR`;
  }

  // Try creating Razorpay payment link
  let razorpayPaymentLinkUrl = "";
  let razorpayPaymentLinkId = "";

  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    try {
      const Razorpay = (await import("razorpay")).default;
      const rzp = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const link = await (rzp.paymentLink as any).create({
        amount: invoice.totalPaise,
        currency: "INR",
        description: `${invoice.invoiceNumber} - ${invoice.description}`,
        customer: {
          name: invoice.clientName,
          email: invoice.clientEmail ?? undefined,
          contact: invoice.clientPhone ?? undefined,
        },
        reminder_enable: true,
        notes: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          lawyerId: invoice.lawyerId,
        },
        callback_url: `${appUrl}/api/invoices/${invoice.id}/paid`,
        callback_method: "get",
      });

      razorpayPaymentLinkUrl = (link as Record<string, string>).short_url ?? "";
      razorpayPaymentLinkId = (link as Record<string, string>).id ?? "";
    } catch (err) {
      console.error("[invoice-send] Razorpay link creation failed:", err);
      // Continue without Razorpay link — UPI link still works
    }
  }

  const paymentUrl = razorpayPaymentLinkUrl || `${appUrl}/invoices/${invoice.id}`;

  // Update invoice
  await prisma.invoice.update({
    where: { id },
    data: {
      status: "sent",
      razorpayPaymentLinkId: razorpayPaymentLinkId || undefined,
      razorpayPaymentLinkUrl: razorpayPaymentLinkUrl || undefined,
      upiDeepLink: upiDeepLink || undefined,
    },
  });

  // Send email
  if (invoice.clientEmail) {
    const lineItemsHtml = invoice.lineItems
      .map((li) => `<tr><td style="padding:6px 0;border-bottom:1px solid #f1f5f9;">${li.description}</td><td style="padding:6px 0;border-bottom:1px solid #f1f5f9;text-align:right;">Rs. ${(li.amountPaise / 100).toFixed(2)}</td></tr>`)
      .join("");

    await sendEmail({
      to: invoice.clientEmail,
      toName: invoice.clientName,
      subject: `Invoice ${invoice.invoiceNumber} — Rs. ${amountRupees} from ${lawyerName}`,
      html: `
        <!DOCTYPE html>
        <html><head><meta charset="UTF-8"/></head>
        <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <div style="max-width:560px;margin:0 auto;padding:20px;">
            <div style="text-align:center;padding:16px 0 8px;"><span style="font-size:22px;font-weight:700;color:#1e3a5f;">⚖ NyayAI</span></div>
            <div style="background:white;border-radius:12px;padding:32px;border:1px solid #e2e8f0;margin:16px 0;">
              <h2 style="margin:0 0 4px;font-size:18px;color:#1e293b;">Invoice ${invoice.invoiceNumber}</h2>
              <p style="color:#64748b;font-size:13px;margin:0 0 20px;">From ${lawyerName}</p>
              <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                <thead><tr><th style="text-align:left;padding:6px 0;border-bottom:2px solid #e2e8f0;font-size:13px;color:#64748b;">Description</th><th style="text-align:right;padding:6px 0;border-bottom:2px solid #e2e8f0;font-size:13px;color:#64748b;">Amount</th></tr></thead>
                <tbody>${lineItemsHtml}</tbody>
                ${invoice.taxPaise > 0 ? `<tfoot><tr><td style="padding:6px 0;font-size:13px;color:#64748b;">Tax (GST)</td><td style="padding:6px 0;text-align:right;font-size:13px;">Rs. ${(invoice.taxPaise / 100).toFixed(2)}</td></tr></tfoot>` : ""}
              </table>
              <div style="background:#1e3a5f;color:white;border-radius:8px;padding:16px;text-align:center;margin:20px 0;">
                <p style="margin:0;font-size:13px;opacity:0.8;">Total Amount</p>
                <p style="margin:4px 0 0;font-size:28px;font-weight:700;">Rs. ${amountRupees}</p>
              </div>
              ${invoice.dueDate ? `<p style="color:#64748b;font-size:13px;text-align:center;">Due by: ${invoice.dueDate.toLocaleDateString("en-IN")}</p>` : ""}
              <div style="text-align:center;margin:24px 0;">
                <a href="${paymentUrl}" style="display:inline-block;background:#1e3a5f;color:white;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">Pay Now</a>
              </div>
            </div>
            <div style="text-align:center;color:#94a3b8;font-size:12px;margin-top:24px;">
              <p>NyayAI · AI-Powered Legal Intelligence</p>
            </div>
          </div>
        </body></html>
      `,
    }).catch((err) => console.error("[invoice-send] Email failed:", err));
  }

  // Send WhatsApp
  if (invoice.clientPhone) {
    const msg = invoicePaymentMessage({
      clientName: invoice.clientName,
      invoiceNumber: invoice.invoiceNumber,
      amount: `Rs. ${amountRupees}`,
      dueDate: invoice.dueDate?.toLocaleDateString("en-IN"),
      paymentUrl,
      upiLink: upiDeepLink || undefined,
    });
    await sendTextMessage(invoice.clientPhone, msg).catch(() => {});
  }

  return NextResponse.json({
    success: true,
    paymentUrl,
    upiDeepLink: upiDeepLink || null,
    razorpayPaymentLinkUrl: razorpayPaymentLinkUrl || null,
  });
}
