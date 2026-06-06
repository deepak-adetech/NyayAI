import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { answerLegalQuestion } from "@/lib/ai/legal-llm";
import { z } from "zod";

const FREE_DAILY_LIMIT = 5;

const schema = z.object({
  question: z.string().min(5).max(2000),
});

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

async function countTodayQueries(userId: string | null, ip: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  if (userId) {
    return prisma.legalQuery.count({
      where: { userId, createdAt: { gte: startOfDay } },
    });
  }
  return prisma.legalQuery.count({
    where: { ipAddress: ip, userId: null, createdAt: { gte: startOfDay } },
  });
}

async function hasUnlimitedAccess(userId: string | null): Promise<boolean> {
  if (!userId) return false;

  // Check dedicated Q&A access pass
  const qaAccess = await prisma.legalQaAccess.findUnique({
    where: { userId },
  });
  if (qaAccess && qaAccess.validUntil > new Date()) return true;

  // Active lawyer subscription also grants unlimited Q&A
  const sub = await prisma.subscription.findUnique({
    where: { userId },
  });
  if (sub && (sub.status === "ACTIVE" || sub.status === "TRIAL")) return true;

  return false;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const ip = getIp(req);

  let body: { question: string };
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { question } = body;

  // Check if the user has unlimited access
  const unlimited = await hasUnlimitedAccess(userId);

  if (!unlimited) {
    const used = await countTodayQueries(userId, ip);
    if (used >= FREE_DAILY_LIMIT) {
      return NextResponse.json(
        {
          error: "daily_limit_reached",
          used,
          limit: FREE_DAILY_LIMIT,
          message: `You've used all ${FREE_DAILY_LIMIT} free questions for today. Upgrade to ask unlimited questions.`,
        },
        { status: 429 }
      );
    }
  }

  // Save the query record (answer filled in after)
  const record = await prisma.legalQuery.create({
    data: {
      userId,
      ipAddress: ip,
      question,
    },
  });

  try {
    const { answer, modelUsed, tokensUsed } = await answerLegalQuestion(question);

    // Update record with answer
    await prisma.legalQuery.update({
      where: { id: record.id },
      data: { answer, modelUsed, tokensUsed },
    });

    const used = await countTodayQueries(userId, ip);

    return NextResponse.json({
      answer,
      modelUsed,
      questionsUsedToday: unlimited ? null : used,
      questionsRemainingToday: unlimited ? null : Math.max(0, FREE_DAILY_LIMIT - used),
      unlimited,
    });
  } catch (err) {
    // Clean up the pending record on failure
    await prisma.legalQuery.delete({ where: { id: record.id } }).catch(() => {});
    console.error("[legal-query] LLM error:", err);
    return NextResponse.json({ error: "AI service unavailable. Please try again." }, { status: 503 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const ip = getIp(req);

  const unlimited = await hasUnlimitedAccess(userId);
  const used = unlimited ? 0 : await countTodayQueries(userId, ip);

  return NextResponse.json({
    unlimited,
    questionsUsedToday: unlimited ? null : used,
    questionsRemainingToday: unlimited ? null : Math.max(0, FREE_DAILY_LIMIT - used),
    dailyLimit: FREE_DAILY_LIMIT,
  });
}
