import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";

async function verifyDocAccess(docId: string, userId: string, role: string) {
  const doc = await prisma.document.findUnique({
    where: { id: docId },
    include: {
      case: {
        select: {
          lawyerId: true,
          clients: { where: { clientId: userId } },
        },
      },
    },
  });
  if (!doc) return null;

  if (role === "ADMIN") return doc;
  if (doc.uploadedById === userId) return doc;
  if (role === "LAWYER" && doc.case?.lawyerId === userId) return doc;
  if (role === "CLIENT" && doc.case?.clients && doc.case.clients.length > 0) return doc;
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as string;
  const doc = await verifyDocAccess(id, session.user.id!, role);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(doc);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as string;
  if (role === "CLIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const doc = await verifyDocAccess(id, session.user.id!, role);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    // Delete from storage
    if (doc.storagePath) {
      try {
        await deleteFile(doc.storagePath);
      } catch (e) {
        console.warn("Storage delete failed:", e);
      }
    }

    // Delete from DB
    await prisma.document.delete({ where: { id: id } });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id!,
        action: "document_deleted",
        resource: "document",
        resourceId: id,
        metadata: { fileName: doc.fileName },
      },
    });

    return NextResponse.json({ message: "Document deleted" });
  } catch (error) {
    console.error("Delete document error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as string;
  if (role === "CLIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const doc = await verifyDocAccess(id, session.user.id!, role);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = await req.json();
    const { title, type, caseId, tags } = body;

    const updated = await prisma.document.update({
      where: { id: id },
      data: {
        ...(title !== undefined && { title }),
        ...(type !== undefined && { type }),
        ...(caseId !== undefined && { caseId }),
        ...(tags !== undefined && { tags }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
