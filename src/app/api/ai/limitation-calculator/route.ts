import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { calculateLimitationPeriod } from "@/lib/ai/limitationCalculator";

const schema = z.object({
  orderText: z.string().min(20, "Order text must be at least 20 characters").max(15000),
  caseType: z.string().min(1),
  orderDate: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { orderText, caseType, orderDate } = schema.parse(body);

    const result = await calculateLimitationPeriod(orderText, caseType, orderDate);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("[limitation-calculator] Error:", error);
    return NextResponse.json({ error: "Calculation failed" }, { status: 500 });
  }
}
