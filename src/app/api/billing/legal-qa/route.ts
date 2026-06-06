import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Razorpay from "razorpay";
import crypto from "crypto";
import { z } from "zod";

const PLANS = {
  weekly: { amountPaise: 9900, days: 7, label: "7-day pass" },
  monthly: { amountPaise: 29900, days: 30, label: "30-day pass" },
} as const;

type PlanKey = keyof typeof PLANS;

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// POST /api/billing/legal-qa — create Razorpay order
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const plan = (body.plan ?? "monthly") as PlanKey;

  if (!PLANS[plan]) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const { amountPaise, label } = PLANS[plan];

  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt: `lqa_${session.user.id}_${Date.now()}`,
    notes: {
      userId: session.user.id!,
      plan,
      product: "legal_qa_access",
    },
  });

  return NextResponse.json({
    orderId: order.id,
    amount: amountPaise,
    currency: "INR",
    key: process.env.RAZORPAY_KEY_ID,
    plan,
    label,
  });
}

// PUT /api/billing/legal-qa — verify payment & activate access
const verifySchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
  plan: z.enum(["weekly", "monthly"]),
});

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: z.infer<typeof verifySchema>;
  try {
    body = verifySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = body;

  // Verify Razorpay signature
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(razorpay_signature), Buffer.from(expected))) {
    return NextResponse.json({ error: "Invalid payment signature" }, { status: 401 });
  }

  const { days, amountPaise } = PLANS[plan];
  const now = new Date();
  const validUntil = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  // Upsert: extend existing access if already has one
  const existing = await prisma.legalQaAccess.findUnique({
    where: { userId: session.user.id! },
  });

  const baseDate = existing && existing.validUntil > now ? existing.validUntil : now;
  const newExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

  await prisma.legalQaAccess.upsert({
    where: { userId: session.user.id! },
    create: {
      userId: session.user.id!,
      plan,
      validUntil: newExpiry,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      amountPaise,
    },
    update: {
      plan,
      validUntil: newExpiry,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      amountPaise,
      updatedAt: now,
    },
  });

  return NextResponse.json({
    success: true,
    validUntil: newExpiry.toISOString(),
    plan,
  });
}
