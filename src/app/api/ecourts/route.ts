import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCaseByCNR, ECourtAPIError, ECourtCase } from "@/lib/ecourts";

/**
 * Map ECourtCase (rich internal type) → flat shape expected by the CnrLookup component.
 * Keeps backward compat with any existing consumers.
 */
function mapToDisplay(c: ECourtCase) {
  const petitioner = c.petitioners.map((p) => p.name).filter(Boolean).join(", ");
  const respondent = c.respondents.map((r) => r.name).filter(Boolean).join(", ");
  const acts = c.acts.map((a) => `${a.act} — S.${a.sections}`).filter(Boolean);

  return {
    // Display fields for the front-end widget
    caseNumber: c.registrationNumber || c.cnrNumber,
    caseType: c.caseType,
    filingDate: c.filingDate ? new Date(c.filingDate).toLocaleDateString("en-IN") : undefined,
    registrationDate: c.registrationDate ? new Date(c.registrationDate).toLocaleDateString("en-IN") : undefined,
    caseStatus: c.caseStatus,
    courtName: c.courtName,
    judgeName: c.judge,
    petitioner: petitioner || undefined,
    respondent: respondent || undefined,
    nextHearingDate: c.nextHearingDate ? new Date(c.nextHearingDate).toLocaleDateString("en-IN") : undefined,
    acts: acts.length ? acts : undefined,
    underActs: acts.length ? acts.join("; ") : undefined,
    hearingHistory: c.hearingHistory.map((h) => ({
      date: h.businessDate || h.hearingDate,
      purpose: h.purpose,
      nextDate: h.hearingDate !== h.businessDate ? h.hearingDate : undefined,
    })),
    // Pass through rich data too for future use
    _raw: c,
  };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { cnr } = body;

    if (!cnr || typeof cnr !== "string" || cnr.trim().length < 10) {
      return NextResponse.json(
        { error: "Invalid CNR number. CNR should be at least 10 characters (e.g., MHNS010012342024)" },
        { status: 400 }
      );
    }

    const caseData = await getCaseByCNR(cnr.trim());
    return NextResponse.json({ case: mapToDisplay(caseData) });
  } catch (err) {
    if (err instanceof ECourtAPIError) {
      // Friendly message for CAPTCHA/portal-unavailable
      if (err.statusCode === 503 || err.message.includes("CAPTCHA")) {
        return NextResponse.json(
          {
            error:
              "eCourts portal requires CAPTCHA verification and cannot be accessed automatically. " +
              "Please look up the case directly at services.ecourts.gov.in using the CNR number.",
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: err.message }, { status: err.statusCode ?? 422 });
    }
    console.error("eCourts lookup error:", err);
    return NextResponse.json({ error: "Failed to fetch case from eCourts" }, { status: 500 });
  }
}
