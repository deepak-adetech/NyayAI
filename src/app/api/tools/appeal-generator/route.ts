import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { generateGroundsOfAppeal } from "@/lib/ai/appealGenerator";

const schema = z.object({
  orderText: z.string().min(100, "Order text must be at least 100 characters").max(20000),
  caseType: z.string().min(1),
  appellantName: z.string().min(2),
  respondentName: z.string().min(2),
  courtOfAppeal: z.string().min(2),
  trialCourt: z.string().optional(),
  caseNumber: z.string().optional(),
  advocateName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const params = schema.parse(body);
    const result = await generateGroundsOfAppeal(params.orderText, {
      caseType: params.caseType,
      appellantName: params.appellantName,
      respondentName: params.respondentName,
      courtOfAppeal: params.courtOfAppeal,
      trialCourt: params.trialCourt,
      caseNumber: params.caseNumber,
      advocateName: params.advocateName,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    console.error("[appeal-generator] Error:", error);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
