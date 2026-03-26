import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { generateLegalDraft } from "@/lib/ai/draftGenerator";

const schema = z.object({
  draftType: z.enum(["plaint", "written_statement", "petition", "reply"]),
  courtName: z.string().min(2),
  jurisdiction: z.string().min(2),
  caseType: z.string().min(1),
  caseNumber: z.string().optional(),
  plaintiffName: z.string().min(2),
  plaintiffAddress: z.string().min(5),
  plaintiffFatherName: z.string().optional(),
  defendantName: z.string().min(2),
  defendantAddress: z.string().min(5),
  defendantFatherName: z.string().optional(),
  advocateName: z.string().min(2),
  advocateBarCouncil: z.string().optional(),
  causeOfAction: z.string().optional(),
  dateOfCauseOfAction: z.string().optional(),
  reliefSought: z.string().optional(),
  suitValuation: z.string().optional(),
  courtFees: z.string().optional(),
  supportingFacts: z.string().optional(),
  paraByParaResponse: z.string().optional(),
  preliminaryObjections: z.string().optional(),
  additionalPleas: z.string().optional(),
  counterClaim: z.string().optional(),
  petitionType: z.string().optional(),
  petitionGrounds: z.string().optional(),
  petitionPrayer: z.string().optional(),
  urgencyGrounds: z.string().optional(),
  replyToApplication: z.string().optional(),
  replyPoints: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const params = schema.parse(body);
    const draft = await generateLegalDraft(params);
    return NextResponse.json({ draft });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    console.error("[draft-generator] Error:", error);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
