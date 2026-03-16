import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/zepto";
import { hearingReminderEmail } from "@/lib/email/templates";

/**
 * GET /api/cron/hearing-reminders
 * Sends hearing reminder emails for upcoming hearings.
 * Sends at: 3 days before, 1 day before, and morning of hearing.
 * Protected by CRON_SECRET header.
 * Schedule: Run daily at 07:00 IST
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appUrl = process.env.NEXTAUTH_URL ?? "https://case.ade-technologies.com";
  const results = { sent: 0, errors: [] as string[] };

  try {
    const now = new Date();

    // Find hearings at 0 days (today), 1 day, and 3 days from now
    for (const daysUntil of [0, 1, 3]) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + daysUntil);
      const start = new Date(targetDate); start.setHours(0, 0, 0, 0);
      const end = new Date(targetDate); end.setHours(23, 59, 59, 999);

      const hearings = await prisma.hearing.findMany({
        where: {
          hearingDate: { gte: start, lte: end },
          reminderSent: false,
          status: "SCHEDULED",
        },
        include: {
          case: {
            include: {
              lawyer: { select: { name: true, email: true } },
            },
          },
        },
      });

      for (const hearing of hearings) {
        const advocate = hearing.case.lawyer;
        try {
          const hearingDateStr = hearing.hearingDate.toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "Asia/Kolkata",
          });

          const html = hearingReminderEmail(
            advocate.name,
            hearing.case.title,
            hearing.case.caseNumber ?? "N/A",
            hearing.court ?? hearing.case.courtName ?? "Court",
            hearingDateStr,
            hearing.purpose ?? "Hearing",
            daysUntil,
            `${appUrl}/dashboard/cases/${hearing.case.id}`
          );

          const subjectMap: Record<number, string> = {
            0: `Today: Hearing in ${hearing.case.title}`,
            1: `Tomorrow: Hearing in ${hearing.case.title}`,
            3: `In 3 days: Hearing in ${hearing.case.title}`,
          };

          await sendEmail({
            to: advocate.email,
            toName: advocate.name,
            subject: subjectMap[daysUntil] ?? `Hearing reminder: ${hearing.case.title}`,
            html,
          });

          // Mark reminder as sent
          await prisma.hearing.update({
            where: { id: hearing.id },
            data: { reminderSent: true },
          });

          results.sent++;
        } catch (err) {
          results.errors.push(`Hearing ${hearing.id} for ${advocate.email}: ${err}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      processedAt: now.toISOString(),
    });
  } catch (err) {
    console.error("Hearing reminders cron error:", err);
    return NextResponse.json({ error: "Cron job failed", details: String(err) }, { status: 500 });
  }
}
