import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateHearingSchema = z.object({
  status: z.enum(["SCHEDULED", "COMPLETED", "ADJOURNED", "CANCELLED"]).optional(),
  orderSummary: z.string().optional().nullable(),
  nextDate: z.string().optional().nullable(),
  aiNotes: z.string().optional().nullable(),
  judge: z.string().optional().nullable(),
  courtRoom: z.string().optional().nullable(),
  boardNumber: z.number().int().optional().nullable(),
}).strict();

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role === "CLIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const hearing = await prisma.hearing.findFirst({
    where: { id: id, lawyerId: session.user.id! },
  });

  if (!hearing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = await req.json();
    const data = updateHearingSchema.parse(body);

    const updated = await prisma.hearing.update({
      where: { id: id },
      data: {
        ...data,
        nextDate: data.nextDate ? new Date(data.nextDate) : data.nextDate,
      },
    });

    // If completed/adjourned and nextDate provided, update case nextHearingDate
    if (data.nextDate && (data.status === "COMPLETED" || data.status === "ADJOURNED")) {
      await prisma.case.update({
        where: { id: hearing.caseId },
        data: { nextHearingDate: new Date(data.nextDate), lastHearingDate: hearing.hearingDate },
      });
    }

    if (data.status === "COMPLETED" || data.status === "ADJOURNED") {
      await prisma.caseTimeline.create({
        data: {
          caseId: hearing.caseId,
          eventType: "hearing_" + data.status.toLowerCase(),
          title: `Hearing ${data.status}: ${hearing.hearingDate.toLocaleDateString("en-IN")}`,
          description: data.orderSummary ?? undefined,
          metadata: { hearingId: hearing.id },
          eventDate: new Date(),
        },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role === "CLIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const hearing = await prisma.hearing.findFirst({
    where: { id: id, lawyerId: session.user.id! },
  });

  if (!hearing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.hearing.update({
    where: { id: id },
    data: { status: "CANCELLED" },
  });

  return NextResponse.json({ message: "Hearing cancelled" });
}
