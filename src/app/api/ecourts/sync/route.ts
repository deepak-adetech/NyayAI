import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCaseByCNR, ECourtCase, ECourtAPIError } from "@/lib/ecourts";

/**
 * POST /api/ecourts/sync
 * Syncs a specific case with eCourts and updates the database.
 * Body: { caseId: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { caseId } = await req.json();
    if (!caseId) {
      return NextResponse.json({ error: "caseId is required" }, { status: 400 });
    }

    // Fetch the case from DB
    const dbCase = await prisma.case.findFirst({
      where: {
        id: caseId,
        lawyerId: (session.user as { id: string }).id,
      },
    });

    if (!dbCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    if (!dbCase.cnrNumber) {
      return NextResponse.json(
        { error: "This case does not have a CNR number. Please add a CNR number to enable eCourts sync." },
        { status: 400 }
      );
    }

    const eCase: ECourtCase = await getCaseByCNR(dbCase.cnrNumber);

    // Get next hearing purpose from last hearing in history
    const lastHearing = eCase.hearingHistory[eCase.hearingHistory.length - 1];
    const nextPurpose = lastHearing?.purpose ?? "Hearing";

    // Update the case with fresh data from eCourts
    const updated = await prisma.case.update({
      where: { id: caseId },
      data: {
        status: mapECourtsStatus(eCase.caseStatus),
        courtName: eCase.courtName || dbCase.courtName,
        nextHearingDate: eCase.nextHearingDate ? parseDate(eCase.nextHearingDate) : dbCase.nextHearingDate,
        ecourtsLastSync: new Date(),
        ecourtsData: JSON.stringify(eCase),
      },
    });

    // Create a hearing for next hearing date if it doesn't exist
    if (eCase.nextHearingDate) {
      const nextDate = parseDate(eCase.nextHearingDate);
      if (nextDate) {
        await prisma.hearing.upsert({
          where: { caseId_hearingDate: { caseId, hearingDate: nextDate } },
          update: { purpose: nextPurpose, court: eCase.courtName ?? undefined },
          create: {
            caseId,
            lawyerId: dbCase.lawyerId,
            hearingDate: nextDate,
            purpose: nextPurpose,
            court: eCase.courtName ?? "",
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      case: updated,
      ecourtsSummary: {
        status: eCase.caseStatus,
        nextHearing: eCase.nextHearingDate,
        courtName: eCase.courtName,
        totalHearings: eCase.hearingHistory.length,
        totalOrders: eCase.orders.length,
      },
    });
  } catch (err) {
    if (err instanceof ECourtAPIError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode ?? 422 });
    }
    console.error("eCourts sync error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}

function mapECourtsStatus(ecStatus: string): "ACTIVE" | "DISPOSED" | "ARCHIVED" | "TRANSFERRED" | "STAYED" {
  const s = ecStatus.toLowerCase();
  if (s.includes("disposed") || s.includes("decided") || s.includes("closed")) return "DISPOSED";
  if (s.includes("transfer")) return "TRANSFERRED";
  if (s.includes("stay")) return "STAYED";
  return "ACTIVE";
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  // Try dd-mm-yyyy
  const match = dateStr.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (match) return new Date(`${match[3]}-${match[2]}-${match[1]}`);
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}
