import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1500).optional(),
  authorName: z.string().min(2).max(80).optional(),
});

// POST /api/lawyers/[slug]/reviews — leave a rating + review.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const session = await auth();

  let data: z.infer<typeof schema>;
  try {
    data = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid review" }, { status: 400 });
  }

  const profile = await prisma.lawyerProfile.findUnique({ where: { slug } });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const authorName = data.authorName?.trim() || session?.user?.name || "Anonymous";

  // Create the review and recompute the aggregate rating atomically.
  await prisma.$transaction(async (tx) => {
    await tx.lawyerReview.create({
      data: {
        lawyerProfileId: profile.id,
        authorUserId: session?.user?.id ?? null,
        authorName,
        rating: data.rating,
        comment: data.comment?.trim() || null,
      },
    });

    const agg = await tx.lawyerReview.aggregate({
      where: { lawyerProfileId: profile.id },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await tx.lawyerProfile.update({
      where: { id: profile.id },
      data: {
        ratingAvg: agg._avg.rating ?? 0,
        ratingCount: agg._count.rating ?? 0,
      },
    });
  });

  return NextResponse.json({ success: true });
}
