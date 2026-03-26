import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCaseByCNR, ECourtCase, ECourtAPIError, getOrderDocument } from "@/lib/ecourts";
import { uploadFile, generateStorageKey } from "@/lib/storage";

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
        benchJudge: eCase.judge || dbCase.benchJudge || undefined,
        nextHearingDate: eCase.nextHearingDate ? parseDate(eCase.nextHearingDate) : dbCase.nextHearingDate,
        ecourtsLastSync: new Date(),
        ecourtsData: JSON.stringify(eCase),
      },
    });

    // Upsert ALL hearing records from eCourts hearing history
    if (eCase.hearingHistory?.length) {
      for (const h of eCase.hearingHistory) {
        const hearingDate = parseDate(h.hearingDate || h.businessDate);
        if (!hearingDate) continue;

        const existingHearing = await prisma.hearing.findFirst({
          where: { caseId, hearingDate },
        });

        if (existingHearing) {
          await prisma.hearing.update({
            where: { id: existingHearing.id },
            data: {
              purpose: h.purpose || existingHearing.purpose,
              court: eCase.courtName || existingHearing.court,
              judge: eCase.judge || existingHearing.judge,
              status: hearingDate < new Date() ? "COMPLETED" : "SCHEDULED",
            },
          });
        } else {
          await prisma.hearing.create({
            data: {
              caseId,
              lawyerId: dbCase.lawyerId,
              hearingDate,
              purpose: h.purpose || "Hearing",
              court: eCase.courtName,
              judge: eCase.judge,
              status: hearingDate < new Date() ? "COMPLETED" : "SCHEDULED",
            },
          });
        }
      }
    }

    // Also create a hearing for the next hearing date if not already covered
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

    // Upsert orders — attach order details to matching hearings and download PDFs
    if (eCase.orders?.length) {
      for (const o of eCase.orders) {
        const orderDate = parseDate(o.orderDate);
        if (!orderDate) continue;

        const hearing = await prisma.hearing.findFirst({
          where: { caseId, hearingDate: orderDate },
        });

        if (hearing && o.orderDetails) {
          await prisma.hearing.update({
            where: { id: hearing.id },
            data: { orderSummary: o.orderDetails },
          });
        }

        // Download order PDF if a link is available and we haven't stored it yet
        if (o.orderLink) {
          const dateStr = orderDate.toISOString().slice(0, 10);
          const orderFileName = `order_${dateStr}.pdf`;

          // Check if we already have this order document stored
          const existingDoc = await prisma.document.findFirst({
            where: {
              caseId,
              type: "ORDER",
              fileName: orderFileName,
            },
          });

          if (!existingDoc) {
            try {
              const pdfBuffer = await getOrderDocument(
                dbCase.cnrNumber!,
                o.orderDate,
                o.orderLink
              );

              if (pdfBuffer) {
                const storageKey = generateStorageKey(
                  dbCase.lawyerId,
                  caseId,
                  orderFileName
                );

                const stored = await uploadFile(pdfBuffer, storageKey, "application/pdf");

                await prisma.document.create({
                  data: {
                    caseId,
                    uploadedById: dbCase.lawyerId,
                    type: "ORDER",
                    title: `Court Order — ${dateStr}`,
                    fileName: orderFileName,
                    fileSize: stored.size,
                    mimeType: "application/pdf",
                    storagePath: stored.key,
                    storageBucket: "local",
                  },
                });
              }
            } catch (err) {
              // Non-critical — log and continue syncing
              console.warn(`Failed to download order PDF for ${o.orderDate}:`, err);
            }
          }
        }
      }
    }

    // Update lastHearingDate from hearing history
    if (eCase.hearingHistory?.length) {
      const pastHearings = eCase.hearingHistory
        .map(h => parseDate(h.hearingDate || h.businessDate))
        .filter((d): d is Date => d !== null && d < new Date())
        .sort((a, b) => b.getTime() - a.getTime());

      if (pastHearings[0]) {
        await prisma.case.update({
          where: { id: caseId },
          data: { lastHearingDate: pastHearings[0] },
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

function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  // Try DD-MM-YYYY or DD/MM/YYYY
  const parts = dateStr.split(/[-\/]/);
  if (parts.length === 3 && parts[0].length <= 2) {
    const d = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
    if (!isNaN(d.getTime())) return d;
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}
