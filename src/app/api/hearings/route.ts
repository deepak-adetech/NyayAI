import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { addDays, startOfDay, format } from "date-fns";

const createHearingSchema = z.object({
  caseId: z.string().uuid(),
  hearingDate: z.string().refine((d) => !isNaN(Date.parse(d)), "Invalid date"),
  hearingTime: z.string().optional(),
  courtRoom: z.string().optional(),
  purpose: z.string().optional(),
  judge: z.string().optional(),
  boardNumber: z.number().int().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const caseId = searchParams.get("caseId");
  const upcoming = searchParams.get("upcoming") === "true";
  const today = searchParams.get("today") === "true";

  const where: any = { lawyerId: session.user.id! };
  if (caseId) where.caseId = caseId;
  if (upcoming) {
    where.hearingDate = { gte: new Date() };
    where.status = "SCHEDULED";
  }
  if (today) {
    const start = startOfDay(new Date());
    const end = addDays(start, 1);
    where.hearingDate = { gte: start, lt: end };
  }

  const hearings = await prisma.hearing.findMany({
    where,
    include: {
      case: { select: { id: true, title: true, caseNumber: true, courtName: true } },
    },
    orderBy: { hearingDate: "asc" },
    take: upcoming ? 20 : 50,
  });

  return NextResponse.json({ hearings });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role === "CLIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const data = createHearingSchema.parse(body);

    // Verify case belongs to lawyer
    const case_ = await prisma.case.findFirst({
      where: { id: data.caseId, lawyerId: session.user.id! },
    });
    if (!case_) return NextResponse.json({ error: "Case not found" }, { status: 404 });

    const hearingDate = new Date(data.hearingDate);

    const hearing = await prisma.hearing.create({
      data: {
        caseId: data.caseId,
        lawyerId: session.user.id!,
        hearingDate,
        hearingTime: data.hearingTime,
        courtRoom: data.courtRoom,
        purpose: data.purpose ?? "Hearing",
        judge: data.judge,
        boardNumber: data.boardNumber,
      },
    });

    // Update case nextHearingDate
    await prisma.case.update({
      where: { id: data.caseId },
      data: { nextHearingDate: hearingDate },
    });

    // Schedule reminders: 3 days, 1 day, and morning of
    const reminderOffsets = [
      { days: 3, label: "3 days" },
      { days: 1, label: "1 day" },
      { days: 0, label: "morning of" },
    ];

    for (const offset of reminderOffsets) {
      const scheduledFor = new Date(hearingDate);
      if (offset.days > 0) {
        scheduledFor.setDate(scheduledFor.getDate() - offset.days);
        scheduledFor.setHours(9, 0, 0, 0);
      } else {
        scheduledFor.setHours(7, 0, 0, 0);
      }

      if (scheduledFor > new Date()) {
        await prisma.reminder.create({
          data: {
            userId: session.user.id!,
            caseId: data.caseId,
            hearingId: hearing.id,
            channel: "EMAIL",
            scheduledFor,
            subject: `Hearing Reminder (${offset.label} before): ${case_.title}`,
            body: `Reminder: You have a hearing for "${case_.title}" on ${format(hearingDate, "dd MMM yyyy")} at ${data.hearingTime ?? "10:00 AM"}${data.courtRoom ? ` in ${data.courtRoom}` : ""}.`,
          },
        });
      }
    }

    // Timeline
    await prisma.caseTimeline.create({
      data: {
        caseId: data.caseId,
        eventType: "hearing_scheduled",
        title: `Hearing Scheduled: ${format(hearingDate, "dd MMM yyyy")}`,
        description: `${data.purpose ?? "Hearing"} scheduled${data.courtRoom ? ` in ${data.courtRoom}` : ""}`,
        metadata: { hearingId: hearing.id },
        eventDate: new Date(),
      },
    });

    return NextResponse.json(hearing, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create hearing" }, { status: 500 });
  }
}
