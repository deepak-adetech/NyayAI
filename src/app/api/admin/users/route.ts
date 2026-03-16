import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  const user = session.user as { role?: string };
  if (user.role !== "ADMIN") return null;
  return session;
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "0");
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { firmName: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status === "trial") {
    where.subscription = { status: "TRIAL" };
  } else if (status === "active") {
    where.subscription = { status: "ACTIVE" };
  } else if (status === "expired") {
    where.subscription = { status: "EXPIRED" };
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        subscription: { include: { plan: true } },
        _count: { select: { cases: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: page * 25,
      take: 25,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ users, total, page });
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId, action } = await req.json();
  if (!userId || !action) return NextResponse.json({ error: "userId and action required" }, { status: 400 });

  if (action === "make-admin") {
    await prisma.user.update({ where: { id: userId }, data: { role: "ADMIN" } });
    return NextResponse.json({ success: true });
  }

  if (action === "make-user") {
    await prisma.user.update({ where: { id: userId }, data: { role: "LAWYER" } });
    return NextResponse.json({ success: true });
  }

  if (action === "extend-trial") {
    const sub = await prisma.subscription.findFirst({ where: { userId } });
    if (!sub) return NextResponse.json({ error: "No subscription found" }, { status: 404 });
    const newTrialEnd = new Date(Math.max(sub.trialEndsAt?.getTime() ?? Date.now(), Date.now()) + 7 * 24 * 60 * 60 * 1000);
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "TRIAL", trialEndsAt: newTrialEnd },
    });
    return NextResponse.json({ success: true, newTrialEnd });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
