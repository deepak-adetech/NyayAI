import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callClaude, LEGAL_SYSTEM_PROMPT } from "@/lib/ai/anthropic";
import { z } from "zod";

const schema = z.object({
  caseId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { caseId } = schema.parse(await req.json());

    const caseData = await prisma.case.findFirst({
      where: { id: caseId },
      include: {
        hearings: { orderBy: { hearingDate: "asc" } },
      },
    });

    if (!caseData) return NextResponse.json({ error: "Case not found" }, { status: 404 });

    const judgeName = caseData.benchJudge;
    if (!judgeName) {
      return NextResponse.json({ error: "No judge assigned to this case" }, { status: 400 });
    }

    const allSections = [
      ...(caseData.bnsSections ?? []).map(s => `BNS ${s}`),
      ...(caseData.ipcSections ?? []).map(s => `IPC ${s}`),
      ...(caseData.otherSections ?? []),
    ];

    const prompt = `You are a senior Indian legal researcher. Provide a professional assessment of the following judge based on publicly available information and general judicial patterns.

JUDGE NAME: ${judgeName}
COURT: ${caseData.courtName || "Not specified"}
DISTRICT: ${caseData.courtDistrict || "Not specified"}
STATE: ${caseData.courtState || "Not specified"}
CASE TYPE: ${caseData.caseType}
CHARGES/SECTIONS: ${allSections.join(", ") || "Not specified"}

Provide the following analysis:

## JUDGE PROFILE
- Known judicial position and court
- General judicial temperament and approach (strict/lenient/balanced)
- Known areas of specialisation if any

## BAIL TENDENCY FOR SIMILAR CASES
- General approach to bail in ${caseData.caseType} cases
- Whether this judge is known to be strict or lenient on bail for offences under ${allSections.join(", ") || "similar sections"}
- Any publicly known patterns in bail decisions

## CASE MANAGEMENT STYLE
- Typical approach to adjournments
- Expected pace of proceedings
- Documentation and order-writing style

## STRATEGIC CONSIDERATIONS
- What arguments tend to resonate with this judge
- Preparation tips for appearing before this bench
- Any known preferences regarding evidence presentation

## IMPORTANT DISCLAIMER
This assessment is based on general judicial patterns and publicly available information. Individual case outcomes depend on specific facts and circumstances. This is NOT a guarantee of any outcome and should be used only as a general reference for case preparation.

If you do not have specific information about this judge, provide GENERAL guidance for judges at this court level in this jurisdiction for this type of case. Be honest about what is general guidance vs specific knowledge.`;

    const assessment = await callClaude(prompt, LEGAL_SYSTEM_PROMPT);

    return NextResponse.json({
      judgeName,
      court: caseData.courtName,
      assessment,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }
    console.error("Judge assessment error:", error);
    return NextResponse.json({ error: "Failed to generate assessment" }, { status: 500 });
  }
}
