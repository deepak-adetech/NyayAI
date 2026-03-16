import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  planId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { planId } = schema.parse(body);

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    if (!plan.razorpayPlanIdMonthly) {
      return NextResponse.json({ error: "Plan not available for online purchase" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id! },
      select: { email: true, name: true, phone: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Create Razorpay subscription
    const Razorpay = (await import("razorpay")).default;
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const rzpSubscription = await (razorpay.subscriptions as any).create({
      plan_id: plan.razorpayPlanIdMonthly,
      customer_notify: 1,
      quantity: 1,
      total_count: 120, // 10 years max
      addons: [],
      notes: {
        userId: session.user.id!,
        planTier: plan.tier,
      },
    });

    // Save to DB
    await prisma.subscription.upsert({
      where: { userId: session.user.id! },
      update: {
        planId,
        razorpaySubscriptionId: rzpSubscription.id,
        status: "TRIAL",
      },
      create: {
        userId: session.user.id!,
        planId,
        razorpaySubscriptionId: rzpSubscription.id,
        status: "TRIAL",
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({
      subscriptionId: rzpSubscription.id,
      keyId: process.env.RAZORPAY_KEY_ID,
      planName: plan.name,
      email: user.email,
    });
  } catch (error) {
    console.error("Create subscription error:", error);
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
  }
}
