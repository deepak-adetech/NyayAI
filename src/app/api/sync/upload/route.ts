import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import path from "path";

const SUPPORTED_EXTENSIONS = new Set([
  ".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".tiff", ".tif", ".txt",
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".tiff": "image/tiff",
    ".tif": "image/tiff",
    ".txt": "text/plain",
  };
  return mimeTypes[ext] ?? "application/octet-stream";
}

async function verifyAgentToken(req: NextRequest): Promise<{ userId: string } | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const agentToken = await prisma.agentToken.findFirst({
    where: {
      tokenHash,
      isActive: true,
      expiresAt: { gt: new Date() },
    },
  });

  if (!agentToken) return null;

  // Update last used
  await prisma.agentToken.update({
    where: { id: agentToken.id },
    data: { lastUsedAt: new Date() },
  });

  return { userId: agentToken.userId };
}

// POST /api/sync/upload
// Desktop agent uploads a file with metadata
export async function POST(req: NextRequest) {
  // Verify agent token
  const auth = await verifyAgentToken(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { userId: lawyerId } = auth;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const localFilePath = formData.get("localFilePath") as string ?? "";
    const localFolderPath = formData.get("localFolderPath") as string ?? "";
    const checksumFromAgent = formData.get("checksum") as string ?? "";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileName = file.name;
    const ext = path.extname(fileName).toLowerCase();

    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    const fileSize = file.size;
    if (fileSize === 0) {
      return NextResponse.json({ error: "Empty file" }, { status: 400 });
    }
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = getMimeType(fileName);

    // Compute checksum
    const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

    // Verify checksum matches what agent sent (if provided)
    if (checksumFromAgent && checksumFromAgent !== checksum) {
      return NextResponse.json({ error: "Checksum mismatch — file corrupted in transit" }, { status: 400 });
    }

    // Check duplicate
    const existing = await prisma.document.findFirst({
      where: { checksum, uploadedById: lawyerId },
    });
    if (existing) {
      return NextResponse.json({
        status: "duplicate",
        message: "File already synced",
        documentId: existing.id,
        caseId: existing.caseId,
      });
    }

    // Extract text for PDF/txt
    let extractedText = "";
    if (ext === ".pdf") {
      try {
        const pdfParse = (await import("pdf-parse")).default;
        const data = await pdfParse(buffer);
        extractedText = data.text;
      } catch {
        extractedText = "";
      }
    } else if (ext === ".txt") {
      extractedText = buffer.toString("utf-8");
    }

    // AI Classification
    const { classifyDocument, matchDocumentToCase } = await import("@/lib/ai/documentClassifier");
    const classification = await classifyDocument(extractedText, fileName);

    // Match to existing case
    const matchedCaseId = await matchDocumentToCase(classification, lawyerId);

    // Upload to storage
    const { generateStorageKey, uploadFile } = await import("@/lib/storage");
    const storageKey = generateStorageKey(lawyerId, matchedCaseId ?? "unassigned", fileName);
    await uploadFile(buffer, storageKey, mimeType);

    // Find or create inbox case for unmatched docs
    let caseId = matchedCaseId;
    if (!caseId) {
      const inboxCase = await prisma.case.findFirst({
        where: { lawyerId, tags: { has: "_sync_inbox" } },
      });
      if (inboxCase) {
        caseId = inboxCase.id;
      } else {
        const newCase = await prisma.case.create({
          data: {
            lawyerId,
            title: "📥 Sync Inbox — Unassigned Documents",
            tags: ["_sync_inbox"],
            notes: "Documents auto-synced from local folders but not matched to a case.",
          },
        });
        caseId = newCase.id;
      }
    }

    // Create document record
    const document = await prisma.document.create({
      data: {
        caseId,
        uploadedById: lawyerId,
        type: classification.documentType,
        title: classification.suggestedTitle,
        description: classification.summary,
        fileName,
        fileSize,
        mimeType,
        storagePath: storageKey,
        ocrStatus: classification.ocrNeeded ? "pending" : "not_needed",
        ocrText: extractedText || null,
        ocrLanguage: classification.language,
        extractedSections: classification.extractedSections,
        extractedEntities: {
          parties: classification.extractedParties,
          dates: classification.extractedDates,
          caseNumber: classification.extractedCaseNumber,
          firNumber: classification.extractedFIRNumber,
          cnr: classification.extractedCNR,
          court: classification.extractedCourtName,
        },
        localFilePath: localFilePath || null,
        syncedAt: new Date(),
        checksum,
        aiSummary: classification.summary,
      },
    });

    // Timeline entry
    await prisma.caseTimeline.create({
      data: {
        caseId,
        eventType: "document_synced",
        title: `📁 Auto-synced: ${fileName}`,
        description: `${classification.documentType} synced from desktop agent. ${matchedCaseId ? "Matched to this case." : "⚠️ No case match — please assign manually."}`,
        metadata: {
          documentId: document.id,
          sourcePath: localFilePath,
          confidence: classification.confidence,
          autoMatched: !!matchedCaseId,
          syncSource: "desktop_agent",
        },
        eventDate: new Date(),
      },
    });

    // Update sync folder stats
    if (localFolderPath) {
      await prisma.localSyncFolder.updateMany({
        where: { lawyerId, folderPath: localFolderPath },
        data: { lastSyncAt: new Date(), syncCount: { increment: 1 } },
      });
    }

    console.log(`[Agent Upload] ✅ ${fileName} → ${matchedCaseId ? "matched case" : "inbox"} | ${classification.documentType}`);

    return NextResponse.json({
      status: "success",
      documentId: document.id,
      caseId,
      matched: !!matchedCaseId,
      documentType: classification.documentType,
      title: classification.suggestedTitle,
      confidence: classification.confidence,
    });
  } catch (error) {
    console.error("[Agent Upload] Error:", error);
    return NextResponse.json({ error: "Upload failed", details: String(error) }, { status: 500 });
  }
}

// GET /api/sync/upload — get list of synced folders registered by this agent user
export async function GET(req: NextRequest) {
  const auth = await verifyAgentToken(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const folders = await prisma.localSyncFolder.findMany({
    where: { lawyerId: auth.userId, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ folders });
}
