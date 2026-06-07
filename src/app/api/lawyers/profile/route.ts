import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/lawyers";
import { SPECIALTIES } from "@/lib/specialty";
import { z } from "zod";

const VALID_SPECIALTIES = SPECIALTIES.map((s) => s.code);

const profileSchema = z.object({
  fullName: z.string().min(2).max(120),
  bio: z.string().max(3000).optional().nullable(),
  specialties: z.array(z.enum(VALID_SPECIALTIES as [string, ...string[]])).max(8).default([]),
  yearsExperience: z.number().int().min(0).max(70).default(0),
  barCouncilNumber: z.string().max(60).optional().nullable(),
  barCouncilState: z.string().max(60).optional().nullable(),
  languages: z.array(z.string().max(30)).max(12).default([]),
  city: z.string().max(80).optional().nullable(),
  state: z.string().max(80).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  publicEmail: z.string().email().max(120).optional().nullable().or(z.literal("")),
  website: z.string().max(200).optional().nullable().or(z.literal("")),
  willingToAnswerFree: z.boolean().default(false),
  photoUrl: z.string().max(500).optional().nullable(),
  isListed: z.boolean().default(true),
});

// GET — the signed-in user's own lawyer profile (for the edit form).
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.lawyerProfile.findUnique({
    where: { userId: session.user.id },
  });
  return NextResponse.json({ profile });
}

async function uniqueSlug(base: string, userId: string): Promise<string> {
  const root = slugify(base) || "lawyer";
  let candidate = root;
  let n = 1;
  // Keep the slug stable if it already belongs to this user.
  // Otherwise append -2, -3, … until free.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.lawyerProfile.findUnique({ where: { slug: candidate } });
    if (!existing || existing.userId === userId) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
}

// POST — create or update the signed-in user's lawyer profile.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  let data: z.infer<typeof profileSchema>;
  try {
    data = profileSchema.parse(await req.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const existing = await prisma.lawyerProfile.findUnique({ where: { userId } });
  const slug = existing?.slug ?? (await uniqueSlug(data.fullName, userId));

  const fields = {
    fullName: data.fullName,
    bio: data.bio || null,
    specialties: data.specialties,
    yearsExperience: data.yearsExperience,
    barCouncilNumber: data.barCouncilNumber || null,
    barCouncilState: data.barCouncilState || null,
    languages: data.languages,
    city: data.city || null,
    state: data.state || null,
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    phone: data.phone || null,
    publicEmail: data.publicEmail || null,
    website: data.website || null,
    willingToAnswerFree: data.willingToAnswerFree,
    photoUrl: data.photoUrl || null,
    isListed: data.isListed,
    lastActiveAt: new Date(),
  };

  const profile = await prisma.lawyerProfile.upsert({
    where: { userId },
    create: { userId, slug, ...fields },
    update: fields,
  });

  // Make sure the account is flagged as a lawyer.
  await prisma.user.update({ where: { id: userId }, data: { role: "LAWYER" } }).catch(() => {});

  return NextResponse.json({ profile, slug: profile.slug });
}
