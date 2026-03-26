import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cnr = req.nextUrl.searchParams.get("cnr")?.trim();
  if (!cnr) return NextResponse.json({ exists: false });

  const existing = await prisma.case.findFirst({
    where: { cnrNumber: cnr },
    select: { id: true, title: true, lawyerId: true },
  });

  if (!existing) return NextResponse.json({ exists: false });

  return NextResponse.json({
    exists: true,
    caseId: existing.id,
    caseTitle: existing.title,
    ownCase: existing.lawyerId === session.user.id,
  });
}
