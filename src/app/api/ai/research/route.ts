import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { callClaude, LEGAL_SYSTEM_PROMPT } from "@/lib/ai/anthropic";
import { buildRagContext } from "@/lib/rag";
import { z } from "zod";

const schema = z.object({
  query: z.string().min(10).max(5000),
  caseContext: z.string().optional(),
  stream: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subscriptionStatus = (session.user as Record<string, unknown>).subscriptionStatus as string | undefined;

  if (subscriptionStatus === "EXPIRED" || subscriptionStatus === "CANCELLED") {
    return NextResponse.json({ error: "Subscription required" }, { status: 402 });
  }

  try {
    const body = await req.json();
    const { query, caseContext } = schema.parse(body);

    // ── RAG: retrieve relevant legal knowledge ────────────────────────────────
    const lawyerId = session.user.id ?? undefined;
    const ragContext = await buildRagContext(query, lawyerId).catch((err: unknown) => {
      const msg = String(err);
      // Only warn if it's a real failure, not just "Supabase not configured"
      if (!msg.includes("not configured")) console.warn("[research] RAG lookup failed:", msg);
      return "";
    });

    const contextSection = caseContext
      ? `\n\nCase Context:\n${caseContext.substring(0, 2000)}`
      : "";

    const prompt = `${query}${contextSection}${ragContext}

Provide a comprehensive legal research response including:
1. Applicable laws and sections (BNS/BNSS/BSA or IPC/CrPC/IEA as per offence date)
2. Key legal principles
3. Relevant Supreme Court and High Court precedents (cite actual cases if known)
4. Practical recommendations for the lawyer
5. Any important caveats or exceptions

Format response with clear headings and section references.`;

    const response = await callClaude(prompt, LEGAL_SYSTEM_PROMPT);

    return NextResponse.json({
      response,
      query,
      ragUsed: ragContext.length > 0,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("Legal research error:", error);
    return NextResponse.json({ error: "Research failed" }, { status: 500 });
  }
}
