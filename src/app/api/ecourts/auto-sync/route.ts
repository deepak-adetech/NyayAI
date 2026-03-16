import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCaseByCNR } from "@/lib/ecourts";

/**
 * GET /api/ecourts/auto-sync
 * Cron job endpoint: syncs all active cases that have a CNR number.
 * Protected by CRON_SECRET header.
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = { synced: 0, failed: 0, skipped: 0, errors: [] as string[] };

  try {
    // Get all active cases with CNR numbers that haven't been synced in the last 12 hours
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const cases = await prisma.case.findMany({
      where: {
        cnrNumber: { not: null },
        status: "ACTIVE",
        OR: [
          { ecourtsLastSync: null },
          { ecourtsLastSync: { lt: twelveHoursAgo } },
        ],
      },
      select: { id: true, cnrNumber: true, lawyerId: true },
      take: 100, // Process max 100 per run to avoid timeout
    });

    for (const c of cases) {
      if (!c.cnrNumber) {
        results.skipped++;
        continue;
      }

      try {
        const eCase = await getCaseByCNR(c.cnrNumber);
        const lastHearing = eCase.hearingHistory[eCase.hearingHistory.length - 1];
        const nextPurpose = lastHearing?.purpose ?? "Hearing";

        await prisma.case.update({
          where: { id: c.id },
          data: {
            status: eCase.caseStatus?.toLowerCase().includes("disposed") ? "DISPOSED" : "ACTIVE",
            courtName: eCase.courtName || undefined,
            nextHearingDate: eCase.nextHearingDate ? parseDate(eCase.nextHearingDate) : undefined,
            ecourtsLastSync: new Date(),
            ecourtsData: JSON.stringify(eCase),
          },
        });

        // Upsert next hearing
        if (eCase.nextHearingDate) {
          const nextDate = parseDate(eCase.nextHearingDate);
          if (nextDate) {
            await prisma.hearing.upsert({
              where: { caseId_hearingDate: { caseId: c.id, hearingDate: nextDate } },
              update: { purpose: nextPurpose, court: eCase.courtName ?? undefined },
              create: { caseId: c.id, lawyerId: c.lawyerId, hearingDate: nextDate, purpose: nextPurpose, court: eCase.courtName ?? "" },
            }).catch(() => {}); // Ignore unique constraint errors
          }
        }

        results.synced++;
      } catch (err) {
        results.failed++;
        results.errors.push(`${c.cnrNumber}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }

      // Small delay between API calls
      await new Promise(r => setTimeout(r, 300));
    }

    return NextResponse.json({
      success: true,
      ...results,
      processedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("eCourts auto-sync error:", err);
    return NextResponse.json({ error: "Auto-sync failed", details: String(err) }, { status: 500 });
  }
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (match) return new Date(`${match[3]}-${match[2]}-${match[1]}`);
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}
