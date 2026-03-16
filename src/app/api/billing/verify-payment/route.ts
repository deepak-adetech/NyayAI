import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = body;

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
    }

    // Verify signature
    const expectedSig = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
      .digest("hex");

    if (
      !crypto.timingSafeEqual(
        Buffer.from(razorpay_signature),
        Buffer.from(expectedSig)
      )
    ) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Find subscription in DB
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: session.user.id!,
        razorpaySubscriptionId: razorpay_subscription_id,
      },
    });

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    // Activate subscription
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: "ACTIVE",
        razorpaySubscriptionId: razorpay_subscription_id,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Record payment
    await prisma.payment.create({
      data: {
        subscriptionId: subscription.id,
        razorpayPaymentId: razorpay_payment_id,
        amountPaise: 0, // Will be updated by webhook
        currency: "INR",
        status: "captured",
        paidAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id!,
        action: "payment_verified",
        resource: "subscription",
        resourceId: subscription.id,
        metadata: { razorpay_payment_id },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
