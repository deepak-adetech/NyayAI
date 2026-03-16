import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/email/zepto";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  if (!token || !email) {
    return NextResponse.redirect(
      new URL("/verify-email?error=invalid", req.url)
    );
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Find verification token
  const verificationToken = await prisma.verificationToken.findFirst({
    where: {
      token,
      identifier: normalizedEmail,
      type: "email_verification",
      expires: { gt: new Date() },
    },
  });

  if (!verificationToken) {
    return NextResponse.redirect(
      new URL("/verify-email?error=expired", req.url)
    );
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, name: true, email: true, emailVerified: true },
  });

  if (!user) {
    return NextResponse.redirect(
      new URL("/verify-email?error=notfound", req.url)
    );
  }

  if (user.emailVerified) {
    // Already verified — just redirect to login
    return NextResponse.redirect(new URL("/login?verified=1", req.url));
  }

  // Mark email as verified and delete token
  await Promise.all([
    prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
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

  // Send welcome email (fire and forget)
  sendWelcomeEmail(user.email, user.name).catch(() => {});

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "email_verified",
      ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0] ?? undefined,
    },
  }).catch(() => {});

  return NextResponse.redirect(new URL("/login?verified=1", req.url));
}
