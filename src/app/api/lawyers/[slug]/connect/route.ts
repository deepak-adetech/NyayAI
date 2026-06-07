import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/zepto";
import { specialtyLabel } from "@/lib/specialty";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2).max(80),
  contact: z.string().min(5).max(120), // phone or email
  message: z.string().max(2000).optional(),
  specialty: z.string().max(40).optional(),
  legalQueryId: z.string().uuid().optional(),
});

function getIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

// POST /api/lawyers/[slug]/connect — a user asks to connect with a lawyer.
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
    return NextResponse.json({ error: "Please provide your name and contact" }, { status: 400 });
  }

  const profile = await prisma.lawyerProfile.findUnique({ where: { slug } });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.lawyerConnection.create({
    data: {
      lawyerProfileId: profile.id,
      userId: session?.user?.id ?? null,
      ipAddress: getIp(req),
      legalQueryId: data.legalQueryId ?? null,
      name: data.name,
      contact: data.contact,
      message: data.message ?? null,
      specialty: data.specialty ?? null,
    },
  });

  // Best-effort notify the lawyer (don't fail the request if email is down).
  if (profile.publicEmail) {
    const area = data.specialty ? ` (${specialtyLabel(data.specialty)})` : "";
    sendEmail({
      to: profile.publicEmail,
      toName: profile.fullName,
      subject: `New client enquiry via NyayAI${area}`,
      html: `<p>Hi ${profile.fullName},</p>
        <p>A user found you on the NyayAI lawyer directory and would like to connect${area}.</p>
        <p><strong>Name:</strong> ${data.name}<br/>
        <strong>Contact:</strong> ${data.contact}</p>
        ${data.message ? `<p><strong>Message:</strong><br/>${data.message}</p>` : ""}
        <p>Please reach out to them directly.</p>
        <p>— NyayAI</p>`,
    }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
