/**
 * POST /api/documents/ingest
 *
 * Scans a local folder (with optional case-name subfolders) and ingests
 * all documents into the RAG vector database.
 *
 * Body: { folderPath: string, caseId?: string, matchSubfolders?: boolean }
 *
 * - If `matchSubfolders` is true (default), subfolders are treated as case names
 *   and documents are tagged with the subfolder name.
 * - Supports: PDF, DOCX, TXT files.
 * - Extracts text, chunks it, embeds it, and upserts into Supabase vector DB.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addLegalDocument } from "@/lib/rag";
import fs from "fs/promises";
import path from "path";
import { z } from "zod";

const schema = z.object({
  folderPath: z.string().min(1),
  caseId: z.string().optional(),
  caseName: z.string().optional(),
  matchSubfolders: z.boolean().default(true),
});

const SUPPORTED_EXTS = new Set([".pdf", ".docx", ".doc", ".txt", ".md"]);
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_CHUNK_CHARS = 4000;
const CHUNK_OVERLAP = 200;

// ─── Text extraction ──────────────────────────────────────────────────────────

async function extractTextFromFile(filePath: string, mimeHint?: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".txt" || ext === ".md") {
    return fs.readFile(filePath, "utf8");
  }

  if (ext === ".pdf") {
    try {
      const buffer = await fs.readFile(filePath);
      const pdfParse = (await import("pdf-parse")).default;
      const data = await pdfParse(buffer);
      return data.text ?? "";
    } catch {
      return "";
    }
  }

  if (ext === ".docx" || ext === ".doc") {
    try {
      // mammoth is optional — gracefully skip if not installed
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mammoth = require("mammoth") as any;
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value ?? "";
    } catch {
      return "";
    }
  }

  return "";
}

// ─── Chunking ─────────────────────────────────────────────────────────────────

function chunkText(text: string, maxChars = MAX_CHUNK_CHARS, overlap = CHUNK_OVERLAP): string[] {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (cleaned.length <= maxChars) return [cleaned];

  const chunks: string[] = [];
  let start = 0;
  while (start < cleaned.length) {
    let end = Math.min(start + maxChars, cleaned.length);
    // Try to break at paragraph boundary
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

// ─── Scan folder recursively ──────────────────────────────────────────────────

interface ScannedFile {
  filePath: string;
  fileName: string;
  folderName: string; // parent folder name = case name
  relativePath: string;
}

async function scanFolder(rootPath: string, matchSubfolders: boolean): Promise<ScannedFile[]> {
  const results: ScannedFile[] = [];

  async function walk(dir: string, depth: number) {
    if (depth > 5) return; // max 5 levels deep
    let entries: string[] = [];
    try {
      entries = await fs.readdir(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      let stat;
      try {
        stat = await fs.stat(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        if (matchSubfolders && depth === 0) {
          // First level dirs = case name folders
          await walk(fullPath, depth + 1);
        } else if (depth > 0) {
          await walk(fullPath, depth + 1);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(entry).toLowerCase();
        if (!SUPPORTED_EXTS.has(ext)) continue;
        if (stat.size > MAX_FILE_SIZE) continue;
        if (entry.startsWith(".")) continue;

        // Case name = immediate parent folder name (or root folder name if at root)
        const parentDir = path.dirname(fullPath);
        const folderName = parentDir === rootPath
          ? path.basename(rootPath)
          : path.relative(rootPath, parentDir).split(path.sep)[0];

        results.push({
          filePath: fullPath,
          fileName: entry,
          folderName,
          relativePath: path.relative(rootPath, fullPath),
        });
      }
    }
  }

  await walk(rootPath, 0);
  return results;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subscriptionStatus = (session.user as Record<string, unknown>).subscriptionStatus as string | undefined;
  if (subscriptionStatus === "EXPIRED" || subscriptionStatus === "CANCELLED") {
    return NextResponse.json({ error: "Subscription required" }, { status: 402 });
  }

  let body;
  try {
    body = schema.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0]?.message ?? "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { folderPath, caseId, caseName: overrideCaseName, matchSubfolders } = body;

  // Resolve and validate path
  const resolvedPath = path.resolve(folderPath);
  const systemDirs = ["/etc", "/usr", "/bin", "/sbin", "/boot", "/proc", "/sys"];
  if (systemDirs.some((d) => resolvedPath.startsWith(d))) {
    return NextResponse.json({ error: "Cannot scan system directories" }, { status: 400 });
  }

  try {
    const stat = await fs.stat(resolvedPath);
    if (!stat.isDirectory()) {
      return NextResponse.json({ error: "Path is not a directory" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Folder not found or not accessible" }, { status: 400 });
  }

  // Scan
  const files = await scanFolder(resolvedPath, matchSubfolders);

  if (files.length === 0) {
    return NextResponse.json({
      message: "No supported documents found in folder",
      scanned: 0,
      ingested: 0,
      errors: [],
    });
  }

  const results = {
    scanned: files.length,
    ingested: 0,
    skipped: 0,
    errors: [] as string[],
    fileDetails: [] as { file: string; chunks: number; status: string }[],
  };

  const lawyerId = (session.user as { id: string }).id;

  for (const file of files) {
    try {
      const text = await extractTextFromFile(file.filePath);
      if (!text || text.trim().length < 50) {
        results.skipped++;
        results.fileDetails.push({ file: file.relativePath, chunks: 0, status: "skipped (no text)" });
        continue;
      }

      const chunks = chunkText(text);
      const effectiveCaseName = overrideCaseName || file.folderName;
      const titleBase = path.basename(file.fileName, path.extname(file.fileName));

      let chunkSuccess = 0;
      for (let i = 0; i < chunks.length; i++) {
        const chunkTitle = chunks.length === 1
          ? `${titleBase} [${effectiveCaseName}]`
          : `${titleBase} — Part ${i + 1}/${chunks.length} [${effectiveCaseName}]`;

        const result = await addLegalDocument({
          title: chunkTitle,
          content: chunks[i],
          category: "case_note",
          source: file.relativePath,
          metadata: {
            lawyerId,
            caseId: caseId ?? null,
            caseName: effectiveCaseName,
            fileName: file.fileName,
            folderPath: resolvedPath,
            chunkIndex: i,
            totalChunks: chunks.length,
            ingestedAt: new Date().toISOString(),
          },
        });

        if (result) chunkSuccess++;
      }

      if (chunkSuccess > 0) {
        results.ingested++;
        results.fileDetails.push({
          file: file.relativePath,
          chunks: chunkSuccess,
          status: "ingested",
        });
      } else {
        results.skipped++;
        results.fileDetails.push({ file: file.relativePath, chunks: 0, status: "failed (embedding error)" });
      }
    } catch (err) {
      results.errors.push(`${file.relativePath}: ${err instanceof Error ? err.message : String(err)}`);
      results.fileDetails.push({ file: file.relativePath, chunks: 0, status: "error" });
    }
  }

  return NextResponse.json({
    message: `Scanned ${results.scanned} files. Ingested ${results.ingested} into RAG knowledge base.`,
    ...results,
  });
}

// GET — preview what files would be scanned without ingesting
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const folderPath = searchParams.get("folderPath");
  const matchSubfolders = searchParams.get("matchSubfolders") !== "false";

  if (!folderPath) {
    return NextResponse.json({ error: "folderPath query param required" }, { status: 400 });
  }

  const resolvedPath = path.resolve(folderPath);
  try {
    const stat = await fs.stat(resolvedPath);
    if (!stat.isDirectory()) {
      return NextResponse.json({ error: "Path is not a directory" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Folder not found" }, { status: 400 });
  }

  const files = await scanFolder(resolvedPath, matchSubfolders);

  // Group by case folder
  const byFolder: Record<string, string[]> = {};
  for (const f of files) {
    if (!byFolder[f.folderName]) byFolder[f.folderName] = [];
    byFolder[f.folderName].push(f.relativePath);
  }

  return NextResponse.json({
    folderPath: resolvedPath,
    totalFiles: files.length,
    byFolder,
    files: files.map((f) => ({ path: f.relativePath, name: f.fileName, folder: f.folderName })),
  });
}
