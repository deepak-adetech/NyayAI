import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/zepto";
import {
  trialEndingEmail,
  subscriptionExpiredEmail,
  subscriptionRenewingEmail,
  retentionOfferEmail,
} from "@/lib/email/templates";

/**
 * GET /api/cron/subscription-reminders
 * Sends subscription lifecycle emails:
 * - Trial ending in 7, 3, 1 days
 * - Trial expired (with discount offer)
 * - Subscription renewing in 3 days
 * - Retention offer for inactive subscriptions (30% off)
 * 
 * Protected by CRON_SECRET header.
 * Schedule: Run daily at 09:00 IST
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appUrl = process.env.NEXTAUTH_URL ?? "https://case.ade-technologies.com";
  const results = { trialReminders: 0, expiryEmails: 0, renewalReminders: 0, retentionOffers: 0, errors: [] as string[] };

  const now = new Date();

  try {
    // 1. Trial ending reminders (7 days, 3 days, 1 day)
    for (const daysLeft of [7, 3, 1]) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + daysLeft);
      const start = new Date(targetDate); start.setHours(0, 0, 0, 0);
      const end = new Date(targetDate); end.setHours(23, 59, 59, 999);

      const trialing = await prisma.subscription.findMany({
        where: {
          status: "TRIAL",
          trialEndsAt: { gte: start, lte: end },
        },
        include: { user: { select: { name: true, email: true } } },
      });

      for (const sub of trialing) {
        try {
          const discountCode = daysLeft === 1 ? generateDiscountCode(sub.userId) : undefined;
          const html = trialEndingEmail(sub.user.name, daysLeft, `${appUrl}/pricing`, discountCode);
          await sendEmail({
            to: sub.user.email,
            toName: sub.user.name,
            subject: `Your NyayaSahayak trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
            html,
          });
          results.trialReminders++;
        } catch (err) {
          results.errors.push(`Trial reminder for ${sub.user.email}: ${err}`);
        }
      }
    }

    // 2. Trial expired yesterday (send expiry email with welcome-back discount)
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yStart = new Date(yesterday); yStart.setHours(0, 0, 0, 0);
    const yEnd = new Date(yesterday); yEnd.setHours(23, 59, 59, 999);

    const expired = await prisma.subscription.findMany({
      where: {
        status: "TRIAL",
        trialEndsAt: { gte: yStart, lte: yEnd },
      },
      include: { user: { select: { name: true, email: true, id: true } } },
    });

    for (const sub of expired) {
      try {
        // Update status to EXPIRED
        await prisma.subscription.update({ where: { id: sub.id }, data: { status: "EXPIRED" } });
        const discountCode = generateDiscountCode(sub.user.id);
        const html = subscriptionExpiredEmail(sub.user.name, `${appUrl}/pricing`, discountCode);
        await sendEmail({
          to: sub.user.email,
          toName: sub.user.name,
          subject: "Your NyayaSahayak trial has ended. Reactivate with 20% off.",
          html,
        });
        results.expiryEmails++;
      } catch (err) {
        results.errors.push(`Expiry email for ${sub.user.email}: ${err}`);
      }
    }

    // 3. Subscription renewing in 3 days
    const in3Days = new Date(now);
    in3Days.setDate(in3Days.getDate() + 3);
    const r3Start = new Date(in3Days); r3Start.setHours(0, 0, 0, 0);
    const r3End = new Date(in3Days); r3End.setHours(23, 59, 59, 999);

    const renewing = await prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        currentPeriodEnd: { gte: r3Start, lte: r3End },
      },
      include: {
        user: { select: { name: true, email: true } },
        plan: { select: { name: true, priceMonthlyPaise: true } },
      },
    });

    for (const sub of renewing) {
      try {
        const amount = `Rs ${(sub.plan.priceMonthlyPaise / 100).toLocaleString("en-IN")}`;
        const html = subscriptionRenewingEmail(sub.user.name, sub.plan.name, amount, sub.currentPeriodEnd!);
        await sendEmail({
          to: sub.user.email,
          toName: sub.user.name,
          subject: `Your NyayaSahayak subscription renews in 3 days`,
          html,
        });
        results.renewalReminders++;
      } catch (err) {
        results.errors.push(`Renewal reminder for ${sub.user.email}: ${err}`);
      }
    }

    // 4. Retention offers: expired 14+ days ago, no new subscription
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const threeWeeksAgo = new Date(now);
    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);

    const churned = await prisma.subscription.findMany({
      where: {
        status: "EXPIRED",
        updatedAt: { gte: threeWeeksAgo, lte: twoWeeksAgo },
      },
      include: { user: { select: { name: true, email: true, id: true } } },
      take: 50, // Limit per run
    });

    const expiryDate = new Date(now);
    expiryDate.setDate(expiryDate.getDate() + 7);

    for (const sub of churned) {
      try {
        const discountCode = generateDiscountCode(sub.user.id, "WINBACK");
        const html = retentionOfferEmail(sub.user.name, discountCode, 30, expiryDate);
        await sendEmail({
          to: sub.user.email,
          toName: sub.user.name,
          subject: `${sub.user.name}, here is 30% off to come back to NyayaSahayak`,
          html,
        });
        results.retentionOffers++;
      } catch (err) {
        results.errors.push(`Retention offer for ${sub.user.email}: ${err}`);
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      processedAt: now.toISOString(),
    });
  } catch (err) {
    console.error("Subscription reminders cron error:", err);
    return NextResponse.json({ error: "Cron job failed", details: String(err) }, { status: 500 });
  }
}

function generateDiscountCode(userId: string, prefix = "TRIAL"): string {
  const suffix = userId.slice(-4).toUpperCase();
  return `${prefix}${suffix}20`;
}
