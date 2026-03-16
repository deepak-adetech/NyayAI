import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  let body: {
    action: "toggleActive" | "changeRole" | "extendTrial";
    role?: string;
    days?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action, role, days } = body;

  if (!action) {
    return NextResponse.json({ error: "Missing action" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (action === "toggleActive") {
      const updated = await prisma.user.update({
        where: { id },
        data: { isActive: !user.isActive },
        select: { id: true, isActive: true },
      });

      await prisma.auditLog.create({
        data: {
          userId: (session.user as any).id,
          action: "admin.toggleActive",
          resource: "User",
          resourceId: id,
          metadata: { targetUserId: id, newValue: updated.isActive },
        },
      });

      return NextResponse.json({ success: true, isActive: updated.isActive });
    }

    if (action === "changeRole") {
      const validRoles = ["LAWYER", "CLIENT", "ADMIN"];
      if (!role || !validRoles.includes(role)) {
        return NextResponse.json(
          { error: "Invalid role. Must be LAWYER, CLIENT, or ADMIN" },
          { status: 400 }
        );
      }

      const updated = await prisma.user.update({
        where: { id },
        data: { role: role as any },
        select: { id: true, role: true },
      });

      await prisma.auditLog.create({
        data: {
          userId: (session.user as any).id,
          action: "admin.changeRole",
          resource: "User",
          resourceId: id,
          metadata: {
            targetUserId: id,
            previousRole: user.role,
            newRole: updated.role,
          },
        },
      });

      return NextResponse.json({ success: true, role: updated.role });
    }

    if (action === "extendTrial") {
      if (!days || typeof days !== "number" || days < 1 || days > 365) {
        return NextResponse.json(
          { error: "Invalid days. Must be between 1 and 365" },
          { status: 400 }
        );
      }

      const subscription = await prisma.subscription.findUnique({
        where: { userId: id },
      });

      if (!subscription) {
        return NextResponse.json(
          { error: "No subscription found for this user" },
          { status: 404 }
        );
      }

      const baseDate =
        subscription.trialEndsAt && subscription.trialEndsAt > new Date()
          ? subscription.trialEndsAt
          : new Date();

      const newTrialEnd = new Date(baseDate);
      newTrialEnd.setDate(newTrialEnd.getDate() + days);

      const updated = await prisma.subscription.update({
        where: { userId: id },
        data: {
          trialEndsAt: newTrialEnd,
          status: "TRIAL",
        },
        select: { trialEndsAt: true, status: true },
      });

      await prisma.auditLog.create({
        data: {
          userId: (session.user as any).id,
          action: "admin.extendTrial",
          resource: "Subscription",
          resourceId: subscription.id,
          metadata: {
            targetUserId: id,
            daysAdded: days,
            newTrialEndsAt: newTrialEnd.toISOString(),
          },
        },
      });

      return NextResponse.json({
        success: true,
        trialEndsAt: updated.trialEndsAt,
        status: updated.status,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[admin/users PATCH]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
