import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email/zepto";

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().toLowerCase(),
  password: z
    .string()
    .min(8)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain uppercase, lowercase, and a number"
    ),
  // Allow empty string (treated as not provided) or valid Indian mobile number
  phone: z
    .string()
    .optional()
    .transform((v) => (v === "" || v === null || v === undefined ? undefined : v))
    .refine(
      (v) => v === undefined || /^[6-9]\d{9}$/.test(v),
      "Invalid Indian mobile number (must be 10 digits starting with 6-9)"
    ),
  barCouncilNumber: z.string().optional().transform((v) => v || undefined),
  barCouncilState: z.string().optional().transform((v) => v || undefined),
  firmName: z.string().optional().transform((v) => v || undefined),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password with bcrypt (12 rounds)
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Get STARTER plan (upsert ensures it exists even if seed hasn't run)
    let starterPlan = await prisma.plan.findUnique({
      where: { tier: "STARTER" },
    });

    // Auto-create the Starter plan if it doesn't exist (seed not yet run)
    if (!starterPlan) {
      starterPlan = await prisma.plan.upsert({
        where: { tier: "STARTER" },
        update: {},
        create: {
          tier: "STARTER",
          name: "Starter Plan",
          description: "For solo practitioners",
          priceMonthlyPaise: 99900,
          priceYearlyPaise: 999900,
          maxCases: 50,
          maxDocumentsPerCase: 100,
          maxUsers: 1,
          hasClientPortal: false,
          hasWordAddin: false,
          hasAdvancedAI: false,
          hasPrioritySupport: false,
        },
      });
    }

    // Create user with subscription
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        phone: data.phone,
        barCouncilNumber: data.barCouncilNumber,
        barCouncilState: data.barCouncilState,
        firmName: data.firmName,
        role: "LAWYER",
        // Create subscription with 14-day trial
        subscription: {
          create: {
            planId: starterPlan.id,
            status: "TRIAL",
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "register",
        ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0] ?? undefined,
      },
    });

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.verificationToken.create({
      data: {
        identifier: user.email,
        token: verificationToken,
        expires: verificationExpires,
        type: "email_verification",
      },
    });

    // Send verification email
    const baseUrl = process.env.NEXTAUTH_URL ?? "https://case.ade-technologies.com";
    const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;
    await sendVerificationEmail(user.email, user.name, verifyUrl);

    return NextResponse.json(
      {
        message: "Account created! Please check your email to verify your account before signing in.",
        requiresEmailVerification: true,
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Return the first meaningful validation error message
      const firstError = error.errors[0];
      const message =
        firstError?.message && firstError.message !== "Invalid"
          ? firstError.message
          : "Please check your details and try again";
      return NextResponse.json(
        { error: message, details: error.errors },
        { status: 400 }
      );
    }
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
