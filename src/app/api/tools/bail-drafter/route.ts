import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { generateBailApplication } from "@/lib/ai/bailDrafter";

const schema = z.object({
  bailType: z.enum(["REGULAR", "ANTICIPATORY"]),
  courtName: z.string().min(2),
  courtType: z.enum(["SESSIONS", "HIGH_COURT", "MAGISTRATE"]),
  caseNumber: z.string().optional(),
  firNumber: z.string().min(1),
  policeStation: z.string().min(2),
  district: z.string().min(2),
  state: z.string().min(2),
  offenceDate: z.string().min(1),
  sectionsCharged: z.array(z.string()).min(1),
  accusedName: z.string().min(2),
  accusedFatherName: z.string().min(2),
  accusedAge: z.string().min(1),
  accusedOccupation: z.string().optional(),
  accusedAddress: z.string().min(5),
  arrestDate: z.string().optional(),
  custodyDuration: z.string().optional(),
  coAccusedBailStatus: z.string().optional(),
  groundsForBail: z.array(z.string()).min(1),
  additionalFacts: z.string().optional(),
  advocateName: z.string().min(2),
  advocateBarCouncil: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const params = schema.parse(body);
    const application = await generateBailApplication(params);
    return NextResponse.json({ application });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    console.error("[bail-drafter] Error:", error);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
