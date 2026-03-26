"use client";
import { useState } from "react";
import { Gavel, Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  caseId: string;
  judgeName: string;
  courtName: string;
}

export default function JudgeAssessment({ caseId, judgeName, courtName }: Props) {
  const [assessment, setAssessment] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/judge-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      setAssessment(data.assessment);
      setExpanded(true);
    } catch { setError("Failed to generate"); }
    finally { setLoading(false); }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
          <Gavel className="h-4 w-4 text-amber-500" />
          AI Judge Assessment
        </h2>
        {assessment ? (
          <button onClick={() => setExpanded(!expanded)} className="text-xs text-gray-500">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        ) : (
          <button onClick={generate} disabled={loading} className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50 flex items-center gap-1">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Gavel className="h-3 w-3" />}
            {loading ? "Analysing..." : "Assess Judge"}
          </button>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-2">{judgeName} • {courtName}</p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {assessment && expanded && (
        <div className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed mt-3 max-h-96 overflow-y-auto">{assessment}</div>
      )}
    </div>
  );
}
