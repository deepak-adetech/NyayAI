import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain uppercase, lowercase, and a number"
    ),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, email, password } = schema.parse(body);
    const normalizedEmail = email.toLowerCase().trim();

    // Find the reset token
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        token,
        identifier: normalizedEmail,
        type: "password_reset",
        expires: { gt: new Date() },
      },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: "Invalid or expired reset link. Please request a new one." },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 12);

    // Update password + delete used token
    await Promise.all([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: normalizedEmail,
            token,
          },
        },
      }),
    ]);

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "password_reset",
        ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0] ?? undefined,
      },
    });

    return NextResponse.json({ message: "Password updated successfully. You can now sign in." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const msg = error.errors[0]?.message ?? "Invalid input";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error("[ResetPassword] Error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
