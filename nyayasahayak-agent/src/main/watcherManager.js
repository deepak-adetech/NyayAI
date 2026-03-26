/**
 * WatcherManager — manages chokidar file watchers and uploads files to the server
 */

const chokidar = require("chokidar");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const FormData = require("form-data");
const fetch = require("node-fetch");

const SUPPORTED_EXTENSIONS = new Set([
  ".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".tiff", ".tif", ".txt",
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

class WatcherManager {
  constructor(store, callbacks) {
    this.store = store;
    this.callbacks = callbacks; // { onFileProcessed, onError }
    this.watchers = new Map(); // folderPath → FSWatcher
    this.processingFiles = new Set();
    this._running = false;
  }

  isRunning() {
    return this._running && this.watchers.size > 0;
  }

  async startAll() {
    const folders = this.store.get("watchedFolders") ?? [];
    for (const folder of folders) {
      await this.addFolder(folder);
    }
    this._running = true;
  }

  stopAll() {
    for (const [folder, watcher] of this.watchers) {
      try { watcher.close(); } catch { /* ignore */ }
      this.watchers.delete(folder);
    }
    this._running = false;
  }

  async addFolder(folderPath) {
    if (this.watchers.has(folderPath)) return;

    // Verify folder exists
    if (!fs.existsSync(folderPath)) {
      this.callbacks.onError?.({ folder: folderPath, error: "Folder not found" });
      return;
    }

    const watcher = chokidar.watch(folderPath, {
      persistent: true,
      ignoreInitial: true, // Don't re-process existing files on startup
      depth: 5,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 500,
      },
      ignored: [
        /(^|[/\\])\../,  // Hidden files (dot-files)
        /node_modules/,
        /\.tmp$/,
        /~\$/,           // Word temp files
        /\.crdownload$/, // Chrome partial downloads
        /\.part$/,       // Firefox partial downloads
      ],
    });

    watcher
      .on("add", (filePath) => this.handleFile(filePath, folderPath))
      .on("change", (filePath) => this.handleFile(filePath, folderPath))
      .on("error", (error) => {
        console.error(`[Watcher] Error in ${folderPath}:`, error);
        this.callbacks.onError?.({ folder: folderPath, error: error.message });
      });

    this.watchers.set(folderPath, watcher);
    this._running = true;
    console.log(`[Watcher] 👁 Watching: ${folderPath}`);
  }

  removeFolder(folderPath) {
    const watcher = this.watchers.get(folderPath);
    if (watcher) {
      try { watcher.close(); } catch { /* ignore */ }
      this.watchers.delete(folderPath);
    }
    if (this.watchers.size === 0) this._running = false;
  }

  async handleFile(filePath, folderPath) {
    if (this.processingFiles.has(filePath)) return;
    this.processingFiles.add(filePath);

    try {
      const ext = path.extname(filePath).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.has(ext)) return;

      // Wait a bit in case file is still being written
      await sleep(500);

      // Check file exists and size
      let stats;
      try {
        stats = fs.statSync(filePath);
      } catch {
        return; // File was deleted before we could process it
      }

      if (stats.size === 0) return;
      if (stats.size > MAX_FILE_SIZE) {
        this.callbacks.onFileProcessed?.({
          fileName: path.basename(filePath),
          status: "error",
          error: "File too large (max 50MB)",
        });
        return;
      }

      // Compute checksum
      const buffer = fs.readFileSync(filePath);
      const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

      const token = this.store.get("agentToken");
      const serverUrl = this.store.get("serverUrl");

      if (!token || !serverUrl) {
        this.callbacks.onError?.({ error: "Not authenticated" });
        return;
      }

      const fileName = path.basename(filePath);
      console.log(`[Watcher] 📤 Uploading: ${fileName}`);

      // Build multipart form
      const form = new FormData();
      form.append("file", buffer, {
        filename: fileName,
        contentType: getMimeType(fileName),
        knownLength: buffer.length,
      });
      form.append("localFilePath", filePath);
      form.append("localFolderPath", folderPath);
      form.append("checksum", checksum);

      const res = await fetch(`${serverUrl}/api/sync/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          ...form.getHeaders(),
        },
        body: form,
        timeout: 120000, // 2 min timeout for large files
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(`[Watcher] ❌ Upload failed: ${fileName}`, data);
        this.callbacks.onFileProcessed?.({
          fileName,
          status: "error",
          error: data.error ?? "Upload failed",
        });
        return;
      }

      if (data.status === "duplicate") {
        console.log(`[Watcher] ⏭ Duplicate: ${fileName}`);
        return; // Silently skip duplicates
      }

      console.log(`[Watcher] ✅ Synced: ${fileName} → ${data.matched ? "case" : "inbox"}`);
      this.callbacks.onFileProcessed?.({
        fileName,
        status: "success",
        documentId: data.documentId,
        caseId: data.caseId,
        matched: data.matched,
        documentType: data.documentType,
        title: data.title,
        filePath,
      });

      // Ingest document text into RAG vector DB (best-effort, non-blocking)
      if (data.documentId) {
        this._ingestRag(data.documentId, fileName, token, serverUrl);
      }
    } catch (error) {
      console.error(`[Watcher] Error processing ${filePath}:`, error);
      this.callbacks.onFileProcessed?.({
        fileName: path.basename(filePath),
        status: "error",
        error: String(error),
      });
    } finally {
      this.processingFiles.delete(filePath);
    }
  }
  // Best-effort RAG ingestion — called after successful file upload
  async _ingestRag(documentId, fileName, token, serverUrl) {
    try {
      console.log(`[Watcher] 🧠 Ingesting into RAG: ${fileName}`);
      const res = await fetch(`${serverUrl}/api/sync/ingest-rag`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ documentId }),
        timeout: 60000, // 60s — embedding can take time
      });

      if (!res.ok) {
        const err = await res.text();
        console.warn(`[Watcher] ⚠ RAG ingest failed for ${fileName}: ${res.status} ${err}`);
        return;
      }

      const data = await res.json();
      if (data.status === "ingested") {
        console.log(`[Watcher] 🧠 RAG: ${fileName} → ${data.chunksIngested}/${data.chunksTotal} chunks indexed`);
      } else if (data.status === "skipped") {
        console.log(`[Watcher] 🧠 RAG: ${fileName} skipped (no text content)`);
      } else {
        console.warn(`[Watcher] ⚠ RAG ingest result: ${data.status} for ${fileName}`);
      }
    } catch (err) {
      // Non-fatal — file was uploaded successfully, RAG is best-effort
      console.warn(`[Watcher] ⚠ RAG ingest error for ${fileName}:`, err.message ?? err);
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getMimeType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const mimeTypes = {
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

module.exports = WatcherManager;
