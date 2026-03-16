"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, X, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface Case {
  id: string;
  title: string;
  caseNumber: string | null;
}

const DOC_TYPES = [
  "FIR",
  "CHARGESHEET",
  "JUDGMENT",
  "ORDER",
  "PETITION",
  "BAIL_APPLICATION",
  "WRITTEN_STATEMENT",
  "PLAINT",
  "REPLY",
  "AFFIDAVIT",
  "VAKALATNAMA",
  "AGREEMENT",
  "NOTICE",
  "CAUSE_LIST",
  "EVIDENCE",
  "CLIENT_DOCUMENT",
  "OTHER",
];

interface Props {
  cases: Case[];
  defaultCaseId?: string;
}

export default function DocumentUploadForm({ cases, defaultCaseId }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(!!defaultCaseId);
  const [file, setFile] = useState<File | null>(null);
  const [caseId, setCaseId] = useState(defaultCaseId ?? "");
  const [docType, setDocType] = useState("OTHER");
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    if (!caseId) {
      setError("Please select a case");
      return;
    }

    setError("");
    setSuccess("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("caseId", caseId);
      formData.append("type", docType);
      formData.append("title", title || file.name);

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Upload failed");
      } else {
        setSuccess(`✅ "${data.title}" uploaded and classified as ${data.type}`);
        setFile(null);
        setTitle("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        setTimeout(() => {
          setSuccess("");
          router.refresh();
        }, 3000);
      }
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-4 flex items-center gap-2 bg-white border border-dashed border-gray-300 text-gray-600 px-5 py-3 rounded-xl hover:border-[#1e3a5f] hover:text-[#1e3a5f] transition-colors w-full justify-center"
      >
        <Upload className="h-5 w-5" />
        Upload Document
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <Upload className="h-5 w-5 text-gray-500" />
          Upload Document
        </h2>
        <button
          onClick={() => setOpen(false)}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm mb-3 bg-red-50 p-3 rounded-lg">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 text-green-700 text-sm mb-3 bg-green-50 p-3 rounded-lg">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          {success}
        </div>
      )}

      <form onSubmit={handleUpload} className="space-y-4">
        {/* File picker */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            id="file-upload"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.tiff,.txt"
            onChange={handleFileChange}
            className="hidden"
          />
          <label
            htmlFor="file-upload"
            className={`flex items-center justify-center gap-3 w-full border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors ${
              file
                ? "border-green-300 bg-green-50"
                : "border-gray-300 hover:border-[#1e3a5f] hover:bg-blue-50"
            }`}
          >
            {file ? (
              <>
                <FileText className="h-6 w-6 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">{file.name}</p>
                  <p className="text-xs text-green-600">
                    {(file.size / 1024).toFixed(0)} KB
                  </p>
                </div>
              </>
            ) : (
              <>
                <Upload className="h-6 w-6 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">
                    Click to browse or drag & drop
                  </p>
                  <p className="text-xs text-gray-400">
                    PDF, Word, JPEG, PNG (max 50MB)
                  </p>
                </div>
              </>
            )}
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Case *</label>
            <select
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none"
            >
              <option value="">Select a case</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} {c.caseNumber ? `(${c.caseNumber})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Type
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none"
            >
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Document Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., FIR dated 12-Jan-2025"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            AI will auto-classify if left blank
          </p>
        </div>

        <button
          type="submit"
          disabled={uploading || !file}
          className="flex items-center gap-2 bg-[#1e3a5f] text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-[#162d4a] disabled:opacity-50 transition-colors"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Uploading & Classifying...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" /> Upload Document
            </>
          )}
        </button>
      </form>
    </div>
  );
}
