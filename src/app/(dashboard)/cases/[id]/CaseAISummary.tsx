"use client";
import React, { useState } from "react";
import { Brain, RefreshCw, Loader2, ChevronDown, ChevronUp, Clock, FileText, List, MessageSquare, Sparkles } from "lucide-react";

function highlightSummary(text: string): React.ReactNode[] {
  return text.split('\n').map((line, i) => {
    const highlighted = line
      .replace(/(HIGH\s*RISK|HIGH)/gi, '___MARK___$1___ENDMARK___')
      .replace(/(MEDIUM\s*RISK|MEDIUM)/gi, '___MMARK___$1___ENDMMARK___')
      .replace(/(LOW\s*RISK|LOW(?:\s+risk))/gi, '___GMARK___$1___ENDGMARK___')
      .replace(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/g, '___MARK___$1___ENDMARK___')
      .replace(/((?:BNS|IPC|CrPC|BNSS|CPC)\s*(?:Section\s*)?\d+[\w\(\)\/]*)/gi, '___MARK___$1___ENDMARK___')
      .replace(/((?:Section|S\.)\s*\d+[\w\(\)\/]*)/gi, '___MARK___$1___ENDMARK___')
      .replace(/((?:Rs\.?|₹)\s*[\d,]+(?:\.\d{2})?)/g, '___MARK___$1___ENDMARK___')
      .replace(/(bail\s*(?:granted|rejected|denied|allowed|dismissed))/gi, '___MARK___$1___ENDMARK___')
      .replace(/(next hearing|next date|adjourned to|posted to|listed on)/gi, '___MARK___$1___ENDMARK___');

    const parts = highlighted.split(/(___(?:M?G?MARK|ENDM?G?MARK)___)/);
    let inMark = false;
    let markType = 'yellow';
    const elements: React.ReactNode[] = [];

    for (let j = 0; j < parts.length; j++) {
      const part = parts[j];
      if (part === '___MARK___') { inMark = true; markType = 'yellow'; continue; }
      if (part === '___MMARK___') { inMark = true; markType = 'amber'; continue; }
      if (part === '___GMARK___') { inMark = true; markType = 'green'; continue; }
      if (part === '___ENDMARK___' || part === '___ENDMMARK___' || part === '___ENDGMARK___') { inMark = false; continue; }
      if (!part) continue;

      if (inMark) {
        const bg = markType === 'amber' ? 'bg-amber-200 text-amber-900' : markType === 'green' ? 'bg-green-200 text-green-900' : 'bg-yellow-200 text-yellow-900';
        elements.push(<mark key={`${i}-${j}`} className={`${bg} px-0.5 rounded font-semibold`}>{part}</mark>);
      } else {
        elements.push(part);
      }
    }

    return <span key={i}>{elements}{'\n'}</span>;
  });
}

interface Props {
  caseId: string;
  existingSummary: string | null;
  riskAssessment: string | null;
  causeOfAction: string | null;
  supportingFacts: string | null;
  paraByParaResponse: string | null;
  generatedAt: string | null;
}

type Tab = "summary" | "causeOfAction" | "supportingFacts" | "paraByParaResponse";

export default function CaseAISummary({
  caseId,
  existingSummary,
  riskAssessment,
  causeOfAction,
  supportingFacts,
  paraByParaResponse,
  generatedAt,
}: Props) {
  const [summary, setSummary] = useState(existingSummary);
  const [risk, setRisk] = useState(riskAssessment);
  const [coa, setCoa] = useState(causeOfAction);
  const [sf, setSf] = useState(supportingFacts);
  const [pbp, setPbp] = useState(paraByParaResponse);
  const [genAt, setGenAt] = useState(generatedAt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(!!existingSummary);
  const [activeTab, setActiveTab] = useState<Tab>("summary");

  async function generate(force: boolean) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/case-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, forceRegenerate: force }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      setSummary(data.summary);
      setExpanded(true);
      if (data.causeOfAction) setCoa(data.causeOfAction);
      if (data.supportingFacts) setSf(data.supportingFacts);
      if (data.paraByParaResponse) setPbp(data.paraByParaResponse);
      if (data.generatedAt) setGenAt(data.generatedAt);
      if (data.cached) return;
      const m = data.summary?.match(/risk[^:]*:\s*(HIGH|MEDIUM|LOW)/i);
      if (m) setRisk(m[1].toUpperCase());
    } catch {
      setError("Failed to generate summary");
    } finally {
      setLoading(false);
    }
  }

  const riskColor = risk === "HIGH" ? "bg-red-100 text-red-700" : risk === "MEDIUM" ? "bg-amber-100 text-amber-700" : risk === "LOW" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600";

  const tabs: { key: Tab; label: string; icon: React.ReactNode; content: string | null }[] = [
    { key: "summary", label: "Summary", icon: <Sparkles className="h-3.5 w-3.5" />, content: summary },
    { key: "causeOfAction", label: "Cause of Action", icon: <FileText className="h-3.5 w-3.5" />, content: coa },
    { key: "supportingFacts", label: "Supporting Facts", icon: <List className="h-3.5 w-3.5" />, content: sf },
    { key: "paraByParaResponse", label: "Para-by-Para Response", icon: <MessageSquare className="h-3.5 w-3.5" />, content: pbp },
  ];

  const hasAnyContent = summary || coa || sf || pbp;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-500" />
          AI Case Analysis
          {risk && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-2 ${riskColor}`}>Risk: {risk}</span>}
        </h2>
        <div className="flex items-center gap-2">
          {hasAnyContent && (
            <button onClick={() => setExpanded(!expanded)} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {expanded ? "Collapse" : "Expand"}
            </button>
          )}
          {hasAnyContent ? (
            <button onClick={() => generate(true)} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 border border-purple-300 text-purple-700 bg-purple-50 rounded-lg text-xs font-medium hover:bg-purple-100 disabled:opacity-50">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Re-evaluate
            </button>
          ) : (
            <button onClick={() => generate(false)} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 disabled:opacity-50">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
              {loading ? "Analysing... (15-30s)" : "Generate AI Analysis"}
            </button>
          )}
        </div>
      </div>
      {error && <div className="px-5 py-3 bg-red-50 text-red-600 text-sm">{error}</div>}
      {loading && !hasAnyContent && <div className="px-5 py-8 text-center text-gray-400 text-sm">Analysing case details, documents, hearings, and legal sections... This may take 15-30 seconds.</div>}
      {hasAnyContent && expanded && (
        <>
          {/* Tabs */}
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => tab.content && setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-purple-600 text-purple-700 bg-purple-50/50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                } ${!tab.content ? "opacity-40 cursor-not-allowed" : ""}`}
                disabled={!tab.content}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-5">
            {tabs.map((tab) =>
              activeTab === tab.key && tab.content ? (
                <div key={tab.key} className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed prose prose-sm max-w-none">
                  {highlightSummary(tab.content)}
                </div>
              ) : null
            )}
          </div>

          {/* Generated at footer */}
          {genAt && (
            <div className="px-5 pb-4 flex items-center gap-1.5 text-xs text-gray-400">
              <Clock className="h-3 w-3" />
              Generated at: {new Date(genAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            </div>
          )}
        </>
      )}
      {hasAnyContent && !expanded && (
        <div className="px-5 py-3 text-xs text-gray-400">AI analysis available — click Expand to view</div>
      )}
    </div>
  );
}
