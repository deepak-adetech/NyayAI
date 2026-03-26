/**
 * POST /api/sync/ingest-rag
 *
 * Called by the desktop sync agent after a file is uploaded.
 * Reads the document's OCR/extracted text and ingests it into
 * the Supabase vector database for RAG-powered case analysis.
 *
 * Body: { documentId: string }
 * Auth: Bearer agent token
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addLegalDocument } from "@/lib/rag";
import crypto from "crypto";
import path from "path";

const MAX_CHUNK_CHARS = 4000;
const CHUNK_OVERLAP = 200;

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

  await prisma.agentToken.update({
    where: { id: agentToken.id },
    data: { lastUsedAt: new Date() },
  });

  return { userId: agentToken.userId };
}

function chunkText(text: string, maxChars = MAX_CHUNK_CHARS, overlap = CHUNK_OVERLAP): string[] {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (cleaned.length <= maxChars) return [cleaned];

  const chunks: string[] = [];
  let start = 0;
  while (start < cleaned.length) {
    let end = Math.min(start + maxChars, cleaned.length);
    if (end < cleaned.length) {
      const paraBreak = cleaned.lastIndexOf("\n\n", end);
      if (paraBreak > start + maxChars / 2) end = paraBreak;
      else {
        const sentBreak = cleaned.lastIndexOf(". ", end);
        if (sentBreak > start + maxChars / 2) end = sentBreak + 1;
      }
    }
    chunks.push(cleaned.slice(start, end).trim());
    start = end - overlap;
    if (start < 0) start = 0;
  }
  return chunks.filter((c) => c.length > 50);
}

export async function POST(req: NextRequest) {
  const auth = await verifyAgentToken(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { userId: lawyerId } = auth;

  let documentId: string;
  try {
    const body = await req.json();
    documentId = body.documentId;
    if (!documentId) throw new Error("missing documentId");
  } catch {
    return NextResponse.json({ error: "documentId required" }, { status: 400 });
  }

  // Load document
  const doc = await prisma.document.findFirst({
    where: { id: documentId, uploadedById: lawyerId },
    include: { case: { select: { id: true, title: true } } },
  });

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const text = doc.ocrText ?? "";
  if (!text || text.trim().length < 50) {
    return NextResponse.json({
      status: "skipped",
      message: "Document has no extractable text for RAG ingestion",
      documentId,
    });
  }

  const chunks = chunkText(text);
  const titleBase = path.basename(doc.fileName, path.extname(doc.fileName));
  const caseName = doc.case?.title ?? "Unassigned";

  let ingested = 0;
  const errors: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunkTitle = chunks.length === 1
      ? `${titleBase} [${caseName}]`
      : `${titleBase} — Part ${i + 1}/${chunks.length} [${caseName}]`;

    try {
      const result = await addLegalDocument({
        title: chunkTitle,
        content: chunks[i],
        category: "case_note",
        source: doc.fileName,
        metadata: {
          lawyerId,
          documentId: doc.id,
          caseId: doc.caseId ?? null,
          caseName,
          fileName: doc.fileName,
          chunkIndex: i,
          totalChunks: chunks.length,
          ingestedAt: new Date().toISOString(),
        },
      });
      if (result) ingested++;
    } catch (err) {
      errors.push(`Chunk ${i}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({
    status: ingested > 0 ? "ingested" : "failed",
    documentId,
    chunksTotal: chunks.length,
    chunksIngested: ingested,
    errors,
    message: `Ingested ${ingested}/${chunks.length} chunks into RAG knowledge base`,
  });
}
