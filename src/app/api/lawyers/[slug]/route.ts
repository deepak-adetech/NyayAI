import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toPublicLawyer } from "@/lib/lawyers";

// GET /api/lawyers/[slug] — public lawyer profile + recent reviews.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const profile = await prisma.lawyerProfile.findUnique({
    where: { slug },
    include: {
      reviews: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });

  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    lawyer: {
      ...toPublicLawyer(profile),
      phone: profile.phone,
      publicEmail: profile.publicEmail,
      website: profile.website,
      barCouncilNumber: profile.barCouncilNumber,
      barCouncilState: profile.barCouncilState,
      consultationFeePaise: profile.consultationFeePaise,
    },
    reviews: profile.reviews.map((r) => ({
      id: r.id,
      authorName: r.authorName,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
