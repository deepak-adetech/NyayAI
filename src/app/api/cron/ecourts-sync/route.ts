/**
 * eCourts Auto-Sync Cron — NyayAI
 *
 * GET /api/cron/ecourts-sync
 * Syncs all cases with CNR numbers against eCourts India API.
 * Updates: next hearing date, last hearing date, hearing records, case status.
 * Recommended: daily at 06:00 IST via external cron trigger.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCaseByCNR } from "@/lib/ecourts";
import { sendTextMessage } from "@/lib/whatsapp/client";
import { formatDate } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cases = await prisma.case.findMany({
    where: {
      cnrNumber: { not: null },
      status: { in: ["ACTIVE", "STAYED"] },
    },
    select: {
      id: true,
      cnrNumber: true,
      title: true,
      nextHearingDate: true,
      lastHearingDate: true,
      lawyerId: true,
      courtName: true,
      clients: {
        include: {
          client: { select: { phone: true, name: true } },
        },
      },
    },
  });

  const stats = { total: cases.length, synced: 0, errors: 0, hearingsUpserted: 0, dateChanges: 0 };
  const errors: { caseId: string; cnr: string; error: string }[] = [];

  for (const c of cases) {
    if (!c.cnrNumber) continue;

    try {
      const eCase = await getCaseByCNR(c.cnrNumber);
      const now = new Date();

      // Determine next hearing date
      let newNextHearing: Date | null = null;
      if (eCase.nextHearingDate) {
        newNextHearing = new Date(eCase.nextHearingDate);
      }

      // Determine last hearing from history
      let newLastHearing: Date | null = null;
      const hearingHistory = eCase.hearingHistory ?? [];
      for (const h of hearingHistory) {
        const hDate = parseFlexDate(h.hearingDate ?? h.businessDate);
        if (hDate && hDate <= now) {
          if (!newLastHearing || hDate > newLastHearing) {
            newLastHearing = hDate;
          }
        }
      }

      // Check if next hearing date changed
      const oldNextStr = c.nextHearingDate ? c.nextHearingDate.toISOString().slice(0, 10) : null;
      const newNextStr = newNextHearing ? newNextHearing.toISOString().slice(0, 10) : null;
      const dateChanged = oldNextStr !== newNextStr && newNextStr !== null;

      // Update case
      await prisma.case.update({
        where: { id: c.id },
        data: {
          ...(newNextHearing ? { nextHearingDate: newNextHearing } : {}),
          ...(newLastHearing ? { lastHearingDate: newLastHearing } : {}),
          ecourtsLastSync: now,
          ecourtsData: eCase as unknown as Record<string, unknown>,
          ...(eCase.caseStatus === "Disposed" ? { status: "DISPOSED" } : {}),
        },
      });

      // Upsert hearing records from history
      for (const h of hearingHistory) {
        const hDate = parseFlexDate(h.hearingDate ?? h.businessDate);
        if (!hDate) continue;

        try {
          await prisma.hearing.upsert({
            where: {
              caseId_hearingDate: { caseId: c.id, hearingDate: hDate },
            },
            update: {
              purpose: h.purpose ?? undefined,
            },
            create: {
              caseId: c.id,
              lawyerId: c.lawyerId,
              hearingDate: hDate,
              purpose: h.purpose ?? "Hearing",
              court: c.courtName ?? "",
              status: hDate < now ? "COMPLETED" : "SCHEDULED",
            },
          });
          stats.hearingsUpserted++;
        } catch {
          // Ignore individual hearing upsert errors (e.g., unique constraint issues)
        }
      }

      // Send WhatsApp notification if next hearing date changed
      if (dateChanged && newNextHearing) {
        stats.dateChanges++;

        // Notify lawyer
        const lawyer = await prisma.user.findUnique({
          where: { id: c.lawyerId },
          select: { phone: true, name: true },
        });

        if (lawyer?.phone) {
          await sendTextMessage(
            lawyer.phone,
            `[NyayAI] Next hearing for "${c.title}" updated to ${formatDate(newNextHearing)}. Previous: ${oldNextStr ?? "not set"}.`
          ).catch(() => {});
        }

        // Notify clients
        for (const cc of c.clients) {
          if (cc.client.phone) {
            await sendTextMessage(
              cc.client.phone,
              `Dear ${cc.client.name ?? "Client"}, your case "${c.title}" next hearing is now on ${formatDate(newNextHearing)}. — NyayAI`
            ).catch(() => {});
          }
        }

        // Timeline entry
        await prisma.caseTimeline.create({
          data: {
            caseId: c.id,
            eventType: "ecourts_sync",
            title: "Next hearing date updated via eCourts",
            description: `Changed from ${oldNextStr ?? "unset"} to ${newNextStr}`,
            eventDate: now,
          },
        });
      }

      stats.synced++;

      // Throttle to avoid eCourts rate limiting
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      stats.errors++;
      errors.push({
        caseId: c.id,
        cnr: c.cnrNumber,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ stats, errors: errors.slice(0, 20) });
}

function parseFlexDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  // Try dd-mm-yyyy or dd/mm/yyyy
  const ddmmyyyy = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    const date = new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T00:00:00Z`);
    if (!isNaN(date.getTime())) return date;
  }
  // Try ISO
  const iso = new Date(dateStr);
  if (!isNaN(iso.getTime())) return iso;
  return null;
}
