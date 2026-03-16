import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { identifySections } from "@/lib/ai/sectionIdentifier";
import { z } from "zod";

const schema = z.object({
  caseFacts: z.string().min(20).max(10000),
  offenceDate: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { caseFacts, offenceDate } = schema.parse(body);

    const result = await identifySections(caseFacts, offenceDate);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("Section identification error:", error);
    return NextResponse.json({ error: "AI analysis failed" }, { status: 500 });
  }
}
