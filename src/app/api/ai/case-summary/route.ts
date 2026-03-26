import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callClaude, LEGAL_SYSTEM_PROMPT } from "@/lib/ai/anthropic";
import { buildRagContext } from "@/lib/rag";
import { z } from "zod";

const schema = z.object({
  caseId: z.string().min(1),
  forceRegenerate: z.boolean().optional(),
});

function extractRiskLevel(summary: string): string {
  const match = summary.match(/risk[^:]*:\s*(HIGH|MEDIUM|LOW)/i);
  return match ? match[1].toUpperCase() : "UNKNOWN";
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subscriptionStatus = (session.user as Record<string, unknown>).subscriptionStatus as string | undefined;
  if (subscriptionStatus === "EXPIRED" || subscriptionStatus === "CANCELLED") {
    return NextResponse.json({ error: "Subscription required" }, { status: 402 });
  }

  try {
    const body = await req.json();
    const { caseId, forceRegenerate } = schema.parse(body);

    // Fetch case with hearings, documents and timeline
    const caseData = await prisma.case.findFirst({
      where: {
        id: caseId,
        lawyerId: (session.user as { id: string }).id,
      },
      include: {
        hearings: {
          orderBy: { hearingDate: "asc" },
        },
        documents: {
          select: { id: true, fileName: true, type: true, createdAt: true, ocrText: true },
        },
        timeline: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Return cached summary if available and not forcing regeneration
    const allSectionsEarly = [
      ...(caseData.bnsSections ?? []).map((s: string) => `BNS ${s}`),
      ...(caseData.ipcSections ?? []).map((s: string) => `IPC ${s}`),
      ...(caseData.otherSections ?? []),
    ];
    if (caseData.aiSummary && !forceRegenerate) {
      return NextResponse.json({
        summary: caseData.aiSummary,
        caseTitle: caseData.title,
        ragUsed: false,
        sectionsAnalysed: allSectionsEarly,
        cached: true,
      });
    }

    // ─── Build case context ───────────────────────────────────────────────────
    const lines: string[] = [];

    lines.push(`CASE TITLE: ${caseData.title}`);
    lines.push(`CASE TYPE: ${caseData.caseType}`);
    lines.push(`STATUS: ${caseData.status}`);
    if (caseData.caseNumber) lines.push(`CASE NUMBER: ${caseData.caseNumber}`);
    if (caseData.cnrNumber) lines.push(`CNR NUMBER: ${caseData.cnrNumber}`);
    if (caseData.firNumber) lines.push(`FIR NUMBER: ${caseData.firNumber}`);
    if (caseData.policeStation) lines.push(`POLICE STATION: ${caseData.policeStation}`);
    if (caseData.courtName) lines.push(`COURT: ${caseData.courtName}`);
    if (caseData.courtDistrict) lines.push(`DISTRICT: ${caseData.courtDistrict}`);
    if (caseData.courtState) lines.push(`STATE: ${caseData.courtState}`);
    if (caseData.benchJudge) lines.push(`JUDGE: ${caseData.benchJudge}`);

    if (caseData.petitionerNames?.length) lines.push(`PETITIONERS: ${caseData.petitionerNames.join(", ")}`);
    if (caseData.respondentNames?.length) lines.push(`RESPONDENTS: ${caseData.respondentNames.join(", ")}`);
    if (caseData.petitionerAdvocates?.length) lines.push(`PETITIONER ADVOCATES: ${caseData.petitionerAdvocates.join(", ")}`);
    if (caseData.respondentAdvocates?.length) lines.push(`RESPONDENT ADVOCATES: ${caseData.respondentAdvocates.join(", ")}`);

    const allSections = [
      ...(caseData.bnsSections ?? []).map((s) => `BNS ${s}`),
      ...(caseData.ipcSections ?? []).map((s) => `IPC ${s}`),
      ...(caseData.otherSections ?? []),
    ];
    if (allSections.length) lines.push(`CHARGES / SECTIONS: ${allSections.join(", ")}`);

    if (caseData.filingDate) lines.push(`FILING DATE: ${new Date(caseData.filingDate).toLocaleDateString("en-IN")}`);
    if (caseData.nextHearingDate) lines.push(`NEXT HEARING: ${new Date(caseData.nextHearingDate).toLocaleDateString("en-IN")}`);
    if (caseData.lastHearingDate) lines.push(`LAST HEARING: ${new Date(caseData.lastHearingDate).toLocaleDateString("en-IN")}`);
    if (caseData.disposalDate) lines.push(`DISPOSAL DATE: ${new Date(caseData.disposalDate).toLocaleDateString("en-IN")}`);

    if (caseData.hearings?.length) {
      lines.push(`\nHEARING HISTORY (${caseData.hearings.length} hearings):`);
      for (const h of caseData.hearings) {
        const d = new Date(h.hearingDate).toLocaleDateString("en-IN");
        lines.push(`  • ${d} — ${h.purpose ?? "Hearing"}${h.orderSummary ? ` — ${h.orderSummary}` : ""}${h.judge ? ` (Judge: ${h.judge})` : ""}`);
      }
    }

    if (caseData.documents?.length) {
      lines.push(`\nDOCUMENTS ON FILE: ${caseData.documents.length} document(s)`);
      for (const d of caseData.documents.slice(0, 15)) {
        lines.push(`  • ${d.fileName} (${d.type ?? "document"})`);
      }
      // Include OCR text snippets from documents for deeper analysis
      const docsWithText = caseData.documents.filter((d) => d.ocrText && d.ocrText.length > 50);
      if (docsWithText.length) {
        lines.push(`\nKEY DOCUMENT EXCERPTS:`);
        for (const d of docsWithText.slice(0, 5)) {
          lines.push(`  [${d.fileName}]: ${d.ocrText!.slice(0, 500)}...`);
        }
      }
    }

    if (caseData.notes) {
      lines.push(`\nLAWYER NOTES:\n${caseData.notes}`);
    }

    if (caseData.aiRiskAssessment) {
      lines.push(`\nPREVIOUS AI RISK ASSESSMENT:\n${caseData.aiRiskAssessment}`);
    }

    if (caseData.tags?.length) lines.push(`TAGS: ${caseData.tags.join(", ")}`);

    const caseContext = lines.join("\n");

    // ─── Fetch RAG context ────────────────────────────────────────────────────
    // Build a query from the case's charges and key facts for RAG search
    const ragQuery = [
      allSections.join(" "),
      caseData.caseType,
      caseData.title,
      caseData.notes?.slice(0, 200) ?? "",
    ].filter(Boolean).join(" ");

    let ragContext = "";
    try {
      ragContext = await buildRagContext(ragQuery, (session.user as { id: string }).id);
    } catch {
      // RAG is best-effort — continue without it
    }

    // ─── Generate comprehensive case summary ──────────────────────────────────
    const summaryPrompt = `You are a senior Indian legal expert with 25+ years of experience in criminal and civil law. Analyse the following case thoroughly and provide a complete professional report.

CASE DETAILS:
${caseContext}

${ragContext ? `RELEVANT LEGAL KNOWLEDGE BASE:\n${ragContext}\n` : ""}

Generate a comprehensive, structured case report with ALL of the following sections:

## 1. CASE OVERVIEW
Summarise the case — type, parties involved, court, current status, and filing date.

## 2. CHARGES & LEGAL FRAMEWORK
- List each charge/section with its full description (e.g., "BNS 103(1) — Murder")
- State whether each offence is cognizable/non-cognizable, bailable/non-bailable, compoundable/non-compoundable
- Specify which law applies (BNS 2023 for offences after 01-Jul-2024; IPC 1860 for earlier)
- Maximum punishment for each charge

## 3. APPLICABLE PENAL CODE — EXPERT ANALYSIS
- Deep analysis of each section charged: elements of the offence, what prosecution must prove
- Any defences available under the same act
- Landmark Supreme Court / High Court judgments relevant to these sections
- Whether charges appear prima facie sustainable based on facts presented
- Potential lesser offences or alternative charges (e.g., IPC 304 vs 302)
- Bail prospects — whether the court is likely to grant bail and under what conditions

## 4. HEARING HISTORY ANALYSIS
Chronological summary of proceedings. Note any important orders, adjournments, or directions by the court.

## 5. KEY DATES & DEADLINES
Filing date, all hearings held, next hearing, any statutory deadlines or limitation issues.

## 6. DOCUMENTS & EVIDENCE ASSESSMENT
Review documents on file. Identify evidentiary gaps. List what additional documents/evidence should be obtained.

## 7. CURRENT POSITION & STAGE OF PROCEEDINGS
Exactly where the case stands in the procedural timeline (chargesheet filed? charges framed? trial commenced? arguments stage?).

## 8. RISK ASSESSMENT
Rate overall risk: HIGH / MEDIUM / LOW. Explain the factors driving this assessment.

## 9. STRATEGIC RECOMMENDATIONS
Concrete, actionable next steps for the lawyer:
- Immediate actions required before next hearing
- Applications/motions that should be filed
- Evidence to be gathered or preserved
- Witnesses to be examined or cross-examined
- Legal arguments to be prepared

## 10. DISCLAIMER
This report is an AI-assisted legal analysis tool for the advocate's reference only. It does not constitute legal advice and should be verified against applicable law and facts before use in court.

Be thorough, precise, and practically useful for an Indian advocate appearing before the court.`;

    const summary = await callClaude(summaryPrompt, LEGAL_SYSTEM_PROMPT);

    // Save AI summary to case
    await prisma.case.update({
      where: { id: caseId },
      data: {
        aiSummary: summary,
        aiRiskAssessment: extractRiskLevel(summary),
        aiSuggestedSections: allSections,
      },
    });

    // Generate structured legal analysis fields in parallel
    try {
      const structuredPrompt = `Based on this Indian legal case, generate the following structured analysis. Return ONLY valid JSON with these exact keys.

CASE DETAILS:
${caseContext}

Return a JSON object with:
{
  "causeOfAction": "Detailed cause of action — what legally actionable wrong was committed, by whom, what relief is sought, and on what legal basis. Write in proper legal language suitable for a plaint or petition. 3-5 paragraphs.",
  "supportingFacts": "Numbered list of key supporting facts that establish the cause of action. Include dates, actions, and their legal significance. Each fact should be a complete statement.",
  "paraByParaResponse": "If this is a case where the client is respondent/defendant, generate a paragraph-by-paragraph suggested response to the likely allegations. If petitioner-side, generate anticipated defence arguments and how to counter each one."
}

Be thorough and use proper Indian legal terminology.`;

      const structuredResult = await callClaude(structuredPrompt, LEGAL_SYSTEM_PROMPT);

      // Try to parse JSON from the response
      const jsonMatch = structuredResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          await prisma.case.update({
            where: { id: caseId },
            data: {
              aiCauseOfAction: parsed.causeOfAction ?? null,
              aiSupportingFacts: parsed.supportingFacts ?? null,
              aiParaByParaResponse: parsed.paraByParaResponse ?? null,
              aiSummaryGeneratedAt: new Date(),
            },
          });
        } catch { /* JSON parse failed, skip */ }
      }
    } catch (e) {
      console.warn("Structured AI analysis failed (non-fatal):", e);
    }

    // Re-fetch case to get updated fields
    const updatedCase = await prisma.case.findUnique({
      where: { id: caseId },
      select: { aiCauseOfAction: true, aiSupportingFacts: true, aiParaByParaResponse: true, aiSummaryGeneratedAt: true },
    });

    return NextResponse.json({
      summary,
      caseTitle: caseData.title,
      ragUsed: !!ragContext,
      sectionsAnalysed: allSections,
      causeOfAction: updatedCase?.aiCauseOfAction,
      supportingFacts: updatedCase?.aiSupportingFacts,
      paraByParaResponse: updatedCase?.aiParaByParaResponse,
      generatedAt: updatedCase?.aiSummaryGeneratedAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }
    console.error("Case summary error:", error);
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}
