import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  deviceName: z.string().optional(),
});

// POST /api/sync/agent-auth
// Desktop agent calls this to get a long-lived Bearer token
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, deviceName } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        name: true,
        passwordHash: true,
        subscription: { include: { plan: true } },
      },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Check subscription is active
    const status = user.subscription?.status;
    if (status === "EXPIRED" || status === "CANCELLED") {
      return NextResponse.json(
        { error: "Subscription expired. Please renew at case.ade-technologies.com/billing" },
        { status: 403 }
      );
    }

    // Generate a secure agent token (64 hex chars = 256 bits)
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Store token in DB (upsert by user + device)
    await prisma.agentToken.upsert({
      where: {
        userId_deviceName: {
          userId: user.id,
          deviceName: deviceName ?? "default",
        },
      },
      update: {
        tokenHash,
        lastUsedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        isActive: true,
      },
      create: {
        userId: user.id,
        deviceName: deviceName ?? "default",
        tokenHash,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        isActive: true,
      },
    });

    return NextResponse.json({
      token,
      userId: user.id,
      userName: user.name,
      serverUrl: process.env.NEXTAUTH_URL ?? "https://case.ade-technologies.com",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    console.error("[AgentAuth] Error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}

// GET /api/sync/agent-auth — validate token (used by agent on startup)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const agentToken = await prisma.agentToken.findFirst({
    where: {
      tokenHash,
      isActive: true,
      expiresAt: { gt: new Date() },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          subscription: { include: { plan: true } },
        },
      },
    },
  });

  if (!agentToken) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  // Update last used
  await prisma.agentToken.update({
    where: { id: agentToken.id },
    data: { lastUsedAt: new Date() },
  });

  return NextResponse.json({
    valid: true,
    userId: agentToken.user.id,
    userName: agentToken.user.name,
    email: agentToken.user.email,
    subscriptionStatus: agentToken.user.subscription?.status ?? "TRIAL",
  });
}

// DELETE /api/sync/agent-auth — revoke token (logout from desktop)
export async function DELETE(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  await prisma.agentToken.updateMany({
    where: { tokenHash },
    data: { isActive: false },
  });

  return NextResponse.json({ message: "Token revoked" });
}
