import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFile } from "@/lib/storage";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await prisma.document.findUnique({
    where: { id: id },
    include: { case: { include: { clients: true } } },
  });

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const role = (session.user as any).role;
  const userId = session.user.id!;

  // Access control
  if (role === "LAWYER" && doc.case.lawyerId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (role === "CLIENT") {
    const isClient = doc.case.clients.some((c) => c.clientId === userId);
    if (!isClient) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const buffer = await getFile(doc.storagePath);
  if (!buffer) return NextResponse.json({ error: "File not found" }, { status: 404 });

  // Audit
  await prisma.auditLog.create({
    data: {
      userId,
      action: "document_downloaded",
      resource: "document",
      resourceId: id,
    },
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.fileName)}"`,
      "Content-Length": buffer.length.toString(),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-cache",
    },
  });
}
