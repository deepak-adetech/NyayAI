import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-razorpay-signature");
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // HMAC-SHA256 signature verification
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(body)
    .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    switch (event.event) {
      case "subscription.authenticated":
      case "subscription.activated":
        await handleActivated(event.payload.subscription.entity);
        break;
      case "subscription.charged":
        await handleCharged(event.payload);
        break;
      case "subscription.cancelled":
        await handleCancelled(event.payload.subscription.entity);
        break;
      case "subscription.paused":
        await prisma.subscription.update({
          where: { id: (await prisma.subscription.findFirst({ where: { razorpaySubscriptionId: event.payload.subscription.entity.id } }))?.id ?? "" },
          data: { status: "PAUSED", pausedAt: new Date() },
        });
        break;
      case "subscription.resumed":
        await prisma.subscription.update({
          where: { id: (await prisma.subscription.findFirst({ where: { razorpaySubscriptionId: event.payload.subscription.entity.id } }))?.id ?? "" },
          data: { status: "ACTIVE", pausedAt: null },
        });
        break;
      case "subscription.pending":
        await prisma.subscription.update({
          where: { id: (await prisma.subscription.findFirst({ where: { razorpaySubscriptionId: event.payload.subscription.entity.id } }))?.id ?? "" },
          data: { status: "PAYMENT_FAILED", failedPaymentCount: { increment: 1 } },
        });
        break;
      case "subscription.halted":
        await prisma.subscription.update({
          where: { id: (await prisma.subscription.findFirst({ where: { razorpaySubscriptionId: event.payload.subscription.entity.id } }))?.id ?? "" },
          data: { status: "EXPIRED" },
        });
        break;
    }
  } catch (error) {
    console.error("Webhook handler error:", error);
    // Return 200 to prevent Razorpay retries on handler errors
  }

  return NextResponse.json({ status: "ok" });
}

async function handleActivated(sub: any) {
  const s = await prisma.subscription.findFirst({ where: { razorpaySubscriptionId: sub.id } });
  if (!s) return;
  await prisma.subscription.update({
    where: { id: s.id },
    data: {
      status: "ACTIVE",
      currentPeriodStart: sub.current_start ? new Date(sub.current_start * 1000) : undefined,
      currentPeriodEnd: sub.current_end ? new Date(sub.current_end * 1000) : undefined,
    },
  });
}

async function handleCharged(payload: any) {
  const sub = payload.subscription.entity;
  const payment = payload.payment?.entity;

  const subscription = await prisma.subscription.findFirst({
    where: { razorpaySubscriptionId: sub.id },
  });
  if (!subscription) return;

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: "ACTIVE",
      currentPeriodStart: new Date(sub.current_start * 1000),
      currentPeriodEnd: new Date(sub.current_end * 1000),
      failedPaymentCount: 0,
    },
  });

  if (payment) {
    await prisma.payment.create({
      data: {
        subscriptionId: subscription.id,
        razorpayPaymentId: payment.id,
        amountPaise: payment.amount,
        currency: payment.currency ?? "INR",
        status: "captured",
        method: payment.method,
        paidAt: new Date(payment.created_at * 1000),
      },
    });
  }
}

async function handleCancelled(sub: any) {
  const s = await prisma.subscription.findFirst({ where: { razorpaySubscriptionId: sub.id } });
  if (!s) return;
  await prisma.subscription.update({
    where: { id: s.id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
}
