import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile, generateStorageKey, computeChecksum } from "@/lib/storage";
import { classifyDocument } from "@/lib/ai/documentClassifier";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "text/plain",
]);

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role === "CLIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const caseId = formData.get("caseId") as string | null;
    const documentType = (formData.get("type") as string) ?? "OTHER";
    const title = formData.get("title") as string | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!caseId) return NextResponse.json({ error: "caseId is required" }, { status: 400 });

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 413 });
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 415 });
    }

    // Verify case belongs to lawyer
    const case_ = await prisma.case.findFirst({
      where: { id: caseId, lawyerId: session.user.id! },
    });
    if (!case_) return NextResponse.json({ error: "Case not found" }, { status: 404 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const checksum = computeChecksum(buffer);

    // Deduplication check
    const existing = await prisma.document.findFirst({
      where: { caseId, checksum },
    });
    if (existing) {
      return NextResponse.json(
        { error: "This file has already been uploaded", existingDocumentId: existing.id },
        { status: 409 }
      );
    }

    // Upload to storage
    const storageKey = generateStorageKey(session.user.id!, caseId, file.name);
    await uploadFile(buffer, storageKey, file.type);

    // Extract text for classification (PDF only for now)
    let extractedText = "";
    if (file.type === "application/pdf") {
      try {
        const pdfParse = (await import("pdf-parse")).default;
        const data = await pdfParse(buffer);
        extractedText = data.text;
      } catch {
        // OCR will handle it
      }
    }

    // AI classification (non-blocking — fire and forget for large files)
    let classification = null;
    try {
      if (extractedText.length > 50 || title) {
        classification = await classifyDocument(
          extractedText || title || file.name,
          file.name
        );
      }
    } catch (e) {
      console.warn("Classification failed, will use defaults:", e);
    }

    const document = await prisma.document.create({
      data: {
        caseId,
        uploadedById: session.user.id!,
        type: (classification?.documentType ?? documentType) as any,
        title: title ?? classification?.suggestedTitle ?? file.name,
        description: classification?.summary,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        storagePath: storageKey,
        ocrStatus: extractedText ? "completed" : "pending",
        ocrText: extractedText || null,
        ocrLanguage: classification?.language,
        extractedSections: classification?.extractedSections ?? [],
        extractedEntities: classification
          ? {
              parties: classification.extractedParties,
              dates: classification.extractedDates,
              caseNumber: classification.extractedCaseNumber,
              court: classification.extractedCourtName,
            }
          : undefined,
        aiSummary: classification?.summary,
        checksum,
      },
    });

    // Timeline
    await prisma.caseTimeline.create({
      data: {
        caseId,
        eventType: "document_uploaded",
        title: `Document uploaded: ${document.title}`,
        description: `${document.type} uploaded by lawyer`,
        metadata: { documentId: document.id, fileSize: file.size },
        eventDate: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id!,
        action: "document_uploaded",
        resource: "document",
        resourceId: document.id,
        metadata: { caseId, fileName: file.name, size: file.size },
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Document upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const caseId = searchParams.get("caseId");
  const role = (session.user as any).role;

  const where: any = {};
  if (caseId) {
    where.caseId = caseId;
    // Verify access
    if (role === "LAWYER") {
      const case_ = await prisma.case.findFirst({
        where: { id: caseId, lawyerId: session.user.id! },
      });
      if (!case_) return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  } else if (role === "LAWYER") {
    where.uploadedById = session.user.id!;
  }

  const documents = await prisma.document.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ documents });
}
