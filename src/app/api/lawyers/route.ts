import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toPublicLawyer, rankLawyers, haversineKm } from "@/lib/lawyers";
import type { Prisma } from "@prisma/client";

// GET /api/lawyers — public directory with filters + relevance ranking.
// Query: specialty, city, q (name search), freeOnly=1, lat, lng, limit, offset
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const specialty = searchParams.get("specialty");
  const city = searchParams.get("city");
  const q = searchParams.get("q");
  const freeOnly = searchParams.get("freeOnly") === "1";
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const hasLocation = Number.isFinite(lat) && Number.isFinite(lng);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20));
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);

  const where: Prisma.LawyerProfileWhereInput = { isListed: true };
  if (freeOnly) where.willingToAnswerFree = true;
  if (city) where.city = { contains: city, mode: "insensitive" };
  if (q) where.fullName = { contains: q, mode: "insensitive" };

  // Fetch a generous slice, then rank in JS (directory is small).
  const profiles = await prisma.lawyerProfile.findMany({
    where,
    take: 300,
  });

  const mapped = profiles.map((p) => {
    const distance =
      hasLocation && p.latitude != null && p.longitude != null
        ? haversineKm(lat, lng, p.latitude, p.longitude)
        : null;
    return toPublicLawyer(p, distance);
  });

  const ranked = rankLawyers(mapped, { specialty, hasLocation });
  const page = ranked.slice(offset, offset + limit);

  return NextResponse.json({
    lawyers: page,
    total: ranked.length,
    specialty: specialty ?? null,
  });
}
