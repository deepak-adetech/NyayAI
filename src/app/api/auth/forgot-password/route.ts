import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { z } from "zod";
import { sendPasswordResetEmail } from "@/lib/email/zepto";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = schema.parse(body);

    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, name: true, email: true },
    });

    // Always return 200 — don't leak whether email exists
    if (!user) {
      return NextResponse.json({
        message: "If this email is registered, you'll receive a reset link shortly.",
      });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Delete any existing reset tokens for this user
    await prisma.verificationToken.deleteMany({
      where: { identifier: normalizedEmail, type: "password_reset" },
    });

    // Store token
    await prisma.verificationToken.create({
      data: {
        identifier: normalizedEmail,
        token,
        expires,
        type: "password_reset",
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? "https://case.ade-technologies.com";
    const resetUrl = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;

    await sendPasswordResetEmail(user.email, user.name, resetUrl);

    return NextResponse.json({
      message: "If this email is registered, you'll receive a reset link shortly.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    console.error("[ForgotPassword] Error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
