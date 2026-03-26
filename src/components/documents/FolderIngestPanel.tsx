"use client";
import { useState } from "react";
import { FolderSearch, Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronRight, Database, FileText } from "lucide-react";

interface FileDetail {
  file: string;
  chunks: number;
  status: string;
}

interface IngestResult {
  message: string;
  scanned: number;
  ingested: number;
  skipped: number;
  errors: string[];
  fileDetails: FileDetail[];
}

interface PreviewResult {
  folderPath: string;
  totalFiles: number;
  byFolder: Record<string, string[]>;
}

export default function FolderIngestPanel() {
  const [folderPath, setFolderPath] = useState("");
  const [caseName, setCaseName] = useState("");
  const [matchSubfolders, setMatchSubfolders] = useState(true);
  const [phase, setPhase] = useState<"idle" | "previewing" | "ingesting" | "done" | "error">("idle");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<IngestResult | null>(null);
  const [error, setError] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  async function handlePreview() {
    if (!folderPath.trim()) { setError("Please enter a folder path"); return; }
    setError("");
    setPreview(null);
    setPhase("previewing");
    try {
      const params = new URLSearchParams({
        folderPath: folderPath.trim(),
        matchSubfolders: String(matchSubfolders),
      });
      const res = await fetch(`/api/documents/ingest?${params}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Preview failed"); setPhase("error"); return; }
      setPreview(data);
      setPhase("idle");
    } catch {
      setError("Failed to preview folder");
      setPhase("error");
    }
  }

  async function handleIngest() {
    if (!folderPath.trim()) { setError("Please enter a folder path"); return; }
    setError("");
    setResult(null);
    setPhase("ingesting");
    try {
      const res = await fetch("/api/documents/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderPath: folderPath.trim(),
          caseName: caseName.trim() || undefined,
          matchSubfolders,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Ingestion failed"); setPhase("error"); return; }
      setResult(data);
      setPhase("done");
    } catch {
      setError("Ingestion request failed");
      setPhase("error");
    }
  }

  const isBusy = phase === "previewing" || phase === "ingesting";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mt-5">
      <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
        <Database className="h-5 w-5 text-purple-600" />
        RAG Document Ingestion — Scan Local Folder
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Point to a local folder containing case documents. Subfolders are treated as case names.
        Documents are read, chunked, and ingested into the AI knowledge base for richer case analysis.
      </p>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Folder Path *
          </label>
          <input
            value={folderPath}
            onChange={(e) => { setFolderPath(e.target.value); setPreview(null); setResult(null); }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-purple-500 outline-none"
            placeholder="/home/lawyer/cases  or  /mnt/documents/cases"
            disabled={isBusy}
          />
          <p className="text-xs text-gray-400 mt-1">
            This is the path on the server where your case files are stored (e.g., a mounted NFS share or a mapped folder).
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Override Case Name (optional)
            </label>
            <input
              value={caseName}
              onChange={(e) => setCaseName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              placeholder="e.g., State vs. Ramesh Kumar"
              disabled={isBusy}
            />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={matchSubfolders}
                onChange={(e) => setMatchSubfolders(e.target.checked)}
                disabled={isBusy}
                className="w-4 h-4 accent-purple-600"
              />
              <span className="text-sm text-gray-700">Use subfolders as case names</span>
            </label>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Preview result */}
        {preview && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-purple-800 mb-2">
              Preview: {preview.totalFiles} file{preview.totalFiles !== 1 ? "s" : ""} found in {Object.keys(preview.byFolder).length} folder{Object.keys(preview.byFolder).length !== 1 ? "s" : ""}
            </p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {Object.entries(preview.byFolder).map(([folder, files]) => (
                <div key={folder}>
                  <p className="text-xs font-semibold text-purple-700">{folder}/ ({files.length} file{files.length !== 1 ? "s" : ""})</p>
                  {files.slice(0, 5).map((f) => (
                    <p key={f} className="text-xs text-gray-500 ml-3">• {f}</p>
                  ))}
                  {files.length > 5 && <p className="text-xs text-gray-400 ml-3">...and {files.length - 5} more</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ingestion result */}
        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <p className="text-sm font-semibold text-green-800">{result.message}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-center mb-2">
              <div className="bg-white rounded-lg p-2 border border-green-200">
                <p className="font-bold text-lg text-green-700">{result.scanned}</p>
                <p className="text-gray-500">Scanned</p>
              </div>
              <div className="bg-white rounded-lg p-2 border border-green-200">
                <p className="font-bold text-lg text-purple-700">{result.ingested}</p>
                <p className="text-gray-500">Ingested</p>
              </div>
              <div className="bg-white rounded-lg p-2 border border-green-200">
                <p className="font-bold text-lg text-gray-500">{result.skipped}</p>
                <p className="text-gray-500">Skipped</p>
              </div>
            </div>

            {result.fileDetails.length > 0 && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-1 text-xs text-green-700 hover:underline"
              >
                {showDetails ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                {showDetails ? "Hide" : "Show"} file details
              </button>
            )}

            {showDetails && (
              <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                {result.fileDetails.map((d, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <FileText className="h-3 w-3 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600 flex-1 truncate">{d.file}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      d.status === "ingested" ? "bg-green-100 text-green-700" :
                      d.status.startsWith("skipped") ? "bg-gray-100 text-gray-500" :
                      "bg-red-100 text-red-600"
                    }`}>
                      {d.status === "ingested" ? `${d.chunks} chunk${d.chunks !== 1 ? "s" : ""}` : d.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="mt-2 bg-red-50 rounded p-2">
                <p className="text-xs font-semibold text-red-700 mb-1">Errors ({result.errors.length}):</p>
                {result.errors.slice(0, 5).map((e, i) => (
                  <p key={i} className="text-xs text-red-600">• {e}</p>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={handlePreview}
            disabled={isBusy || !folderPath.trim()}
            className="flex items-center gap-2 border border-purple-300 text-purple-700 bg-purple-50 px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-100 disabled:opacity-50 transition-colors"
          >
            {phase === "previewing" ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Scanning...</>
            ) : (
              <><FolderSearch className="h-4 w-4" /> Preview Files</>
            )}
          </button>

          <button
            type="button"
            onClick={handleIngest}
            disabled={isBusy || !folderPath.trim()}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {phase === "ingesting" ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Ingesting into RAG...</>
            ) : (
              <><Database className="h-4 w-4" /> Ingest into AI Knowledge Base</>
            )}
          </button>
        </div>

        {phase === "ingesting" && (
          <p className="text-xs text-gray-400">
            Reading documents, extracting text, and embedding into the vector database. This may take a few minutes for large folders...
          </p>
        )}
      </div>
    </div>
  );
}
