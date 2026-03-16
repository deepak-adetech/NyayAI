/**
 * Local File Sync Service — NyayaSahayak
 *
 * Works like Google Drive sync:
 * 1. Lawyer registers local folders to watch
 * 2. Service monitors those folders for new/changed files
 * 3. New files are automatically:
 *    a. Uploaded to storage (local/S3)
 *    b. Text extracted via OCR
 *    c. AI-classified (document type, case details)
 *    d. Auto-matched to existing case OR flagged for manual assignment
 *    e. Saved to database with timeline entry
 */

import chokidar, { FSWatcher } from "chokidar";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { EventEmitter } from "events";

// Lazy imports for Next.js compatibility
async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

async function getStorage() {
  const storage = await import("@/lib/storage");
  return storage;
}

async function getClassifier() {
  const { classifyDocument, matchDocumentToCase } = await import(
    "@/lib/ai/documentClassifier"
  );
  return { classifyDocument, matchDocumentToCase };
}

interface SyncEvent {
  type: "added" | "changed" | "error";
  filePath: string;
  lawyerId: string;
  documentId?: string;
  caseId?: string;
  error?: string;
}

export const syncEmitter = new EventEmitter();

const SUPPORTED_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".jpg",
  ".jpeg",
  ".png",
  ".tiff",
  ".tif",
  ".txt",
]);

const activeWatchers = new Map<string, FSWatcher>();
const processingFiles = new Set<string>();

async function computeFileChecksum(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function isAlreadyProcessed(
  checksum: string,
  lawyerId: string
): Promise<boolean> {
  const prisma = await getPrisma();
  const existing = await prisma.document.findFirst({
    where: { checksum, uploadedById: lawyerId },
  });
  return !!existing;
}

async function extractTextFromFile(filePath: string, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf" || filePath.endsWith(".pdf")) {
    try {
      const pdfParse = (await import("pdf-parse")).default;
      const buffer = await fs.readFile(filePath);
      const data = await pdfParse(buffer);
      return data.text;
    } catch {
      return "";
    }
  }

  if (mimeType.startsWith("text/")) {
    return fs.readFile(filePath, "utf-8");
  }

  // For images, return empty (will be processed by OCR queue)
  return "";
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
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

export async function processNewFile(
  filePath: string,
  lawyerId: string
): Promise<void> {
  if (processingFiles.has(filePath)) return;
  processingFiles.add(filePath);

  try {
    const ext = path.extname(filePath).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) return;

    // Wait briefly in case file is still being written
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const stats = await fs.stat(filePath);
    if (stats.size === 0) return;
    if (stats.size > 50 * 1024 * 1024) {
      // Skip files > 50MB
      syncEmitter.emit("event", {
        type: "error",
        filePath,
        lawyerId,
        error: "File too large (>50MB)",
      } as SyncEvent);
      return;
    }

    const checksum = await computeFileChecksum(filePath);
    if (await isAlreadyProcessed(checksum, lawyerId)) {
      console.log(`[Sync] Skipping duplicate file: ${path.basename(filePath)}`);
      return;
    }

    const buffer = await fs.readFile(filePath);
    const mimeType = getMimeType(filePath);
    const fileName = path.basename(filePath);

    console.log(`[Sync] Processing: ${fileName}`);

    // Step 1: Extract text for classification
    const text = await extractTextFromFile(filePath, mimeType);

    // Step 2: AI classification
    const { classifyDocument, matchDocumentToCase } = await getClassifier();
    const classification = await classifyDocument(text, fileName);

    // Step 3: Match to existing case
    const matchedCaseId = await matchDocumentToCase(classification, lawyerId);

    // Step 4: Upload to storage
    const storage = await getStorage();
    const storageKey = storage.generateStorageKey(
      lawyerId,
      matchedCaseId ?? "unassigned",
      fileName
    );
    await storage.uploadFile(buffer, storageKey, mimeType);

    const prisma = await getPrisma();

    // Step 5: Find or create a default "Unassigned" case for unmatched docs
    let caseId = matchedCaseId;
    if (!caseId) {
      // Create an inbox/unassigned case if one doesn't exist
      const inboxCase = await prisma.case.findFirst({
        where: {
          lawyerId,
          tags: { has: "_sync_inbox" },
        },
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

    // Step 6: Create Document record
    const document = await prisma.document.create({
      data: {
        caseId,
        uploadedById: lawyerId,
        type: classification.documentType,
        title: classification.suggestedTitle,
        description: classification.summary,
        fileName,
        fileSize: stats.size,
        mimeType,
        storagePath: storageKey,
        ocrStatus: classification.ocrNeeded ? "pending" : "not_needed",
        ocrText: text || null,
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
        localFilePath: filePath,
        syncedAt: new Date(),
        checksum,
        aiSummary: classification.summary,
      },
    });

    // Step 7: Timeline entry
    await prisma.caseTimeline.create({
      data: {
        caseId,
        eventType: "document_synced",
        title: `📁 Auto-synced: ${fileName}`,
        description: `${classification.documentType} document auto-synced from local folder. ${matchedCaseId ? "Matched to this case." : "⚠️ No case match found — please assign manually."}`,
        metadata: {
          documentId: document.id,
          sourcePath: filePath,
          confidence: classification.confidence,
          autoMatched: !!matchedCaseId,
        },
        eventDate: new Date(),
      },
    });

    // Step 8: Update sync folder stats
    await prisma.localSyncFolder.updateMany({
      where: {
        lawyerId,
        folderPath: path.dirname(filePath),
      },
      data: {
        lastSyncAt: new Date(),
        syncCount: { increment: 1 },
      },
    });

    syncEmitter.emit("event", {
      type: "added",
      filePath,
      lawyerId,
      documentId: document.id,
      caseId,
    } as SyncEvent);

    console.log(
      `[Sync] ✅ ${fileName} → Case: ${matchedCaseId ? "matched" : "inbox"} | Type: ${classification.documentType}`
    );
  } catch (error) {
    console.error(`[Sync] Error processing ${filePath}:`, error);
    syncEmitter.emit("event", {
      type: "error",
      filePath,
      lawyerId,
      error: String(error),
    } as SyncEvent);
  } finally {
    processingFiles.delete(filePath);
  }
}

export async function startWatchingFolder(
  lawyerId: string,
  folderPath: string
): Promise<void> {
  const watchKey = `${lawyerId}:${folderPath}`;

  if (activeWatchers.has(watchKey)) {
    console.log(`[Sync] Already watching: ${folderPath}`);
    return;
  }

  // Verify folder exists
  try {
    await fs.access(folderPath);
  } catch {
    throw new Error(`Folder not accessible: ${folderPath}`);
  }

  const watcher = chokidar.watch(folderPath, {
    persistent: true,
    ignoreInitial: false,      // Process existing files too
    depth: 5,                   // Watch subdirectories up to 5 levels
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 500,
    },
    ignored: [
      /(^|[/\\])\../, // Hidden files
      /node_modules/,
      /\.tmp$/,
      /~\$/,          // Word temp files
    ],
  });

  watcher
    .on("add", (filePath) => processNewFile(filePath, lawyerId))
    .on("change", (filePath) => processNewFile(filePath, lawyerId))
    .on("error", (error) => {
      console.error(`[Sync] Watcher error for ${folderPath}:`, error);
    });

  activeWatchers.set(watchKey, watcher);
  console.log(`[Sync] 👁  Watching: ${folderPath} for lawyer ${lawyerId}`);

  // Update DB
  const prisma = await getPrisma();
  await prisma.localSyncFolder.upsert({
    where: { lawyerId_folderPath: { lawyerId, folderPath } },
    update: { isActive: true },
    create: { lawyerId, folderPath, isActive: true },
  });
}

export async function stopWatchingFolder(
  lawyerId: string,
  folderPath: string
): Promise<void> {
  const watchKey = `${lawyerId}:${folderPath}`;
  const watcher = activeWatchers.get(watchKey);

  if (watcher) {
    await watcher.close();
    activeWatchers.delete(watchKey);
  }

  const prisma = await getPrisma();
  await prisma.localSyncFolder.updateMany({
    where: { lawyerId, folderPath },
    data: { isActive: false },
  });

  console.log(`[Sync] Stopped watching: ${folderPath}`);
}

export async function restoreWatchers(): Promise<void> {
  const prisma = await getPrisma();
  const folders = await prisma.localSyncFolder.findMany({
    where: { isActive: true },
  });

  for (const folder of folders) {
    try {
      await startWatchingFolder(folder.lawyerId, folder.folderPath);
    } catch (error) {
      console.error(`[Sync] Could not restore watcher for ${folder.folderPath}:`, error);
    }
  }

  console.log(`[Sync] Restored ${folders.length} folder watchers`);
}

export function getActiveWatchers(): string[] {
  return Array.from(activeWatchers.keys());
}
