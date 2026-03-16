"use client";

import { useState } from "react";
import { Search, X, ExternalLink, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

interface HearingHistory {
  date?: string;
  purpose?: string;
  nextDate?: string;
  judge?: string;
}

interface ECourtCaseData {
  caseNumber?: string;
  caseType?: string;
  filingDate?: string;
  registrationDate?: string;
  caseStatus?: string;
  courtName?: string;
  judgeName?: string;
  petitioner?: string;
  respondent?: string;
  nextHearingDate?: string;
  hearingHistory?: HearingHistory[];
  acts?: string[];
  underActs?: string;
}

export function CnrLookup() {
  const [cnr, setCnr] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ECourtCaseData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [open, setOpen] = useState(false);

  async function lookup() {
    const trimmed = cnr.trim().toUpperCase();
    if (trimmed.length < 10) {
      setError("Enter a valid CNR number (e.g. MHNS010012342024)");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setShowHistory(false);

    try {
      const res = await fetch("/api/ecourts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cnr: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to fetch case details");
      } else {
        setResult(data.case);
        setOpen(true);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function clear() {
    setCnr("");
    setResult(null);
    setError(null);
    setShowHistory(false);
    setOpen(false);
  }

  const statusColor = (s?: string) => {
    if (!s) return "bg-gray-100 text-gray-600";
    const l = s.toLowerCase();
    if (l.includes("disposed") || l.includes("closed")) return "bg-red-100 text-red-700";
    if (l.includes("pending") || l.includes("active")) return "bg-green-100 text-green-700";
    return "bg-blue-100 text-blue-700";
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
      {/* Search bar */}
      <div className="flex items-center gap-2 p-3 border-b border-gray-100">
        <div className="flex items-center gap-2 bg-amber-50 rounded-lg px-3 py-1.5 border border-amber-200 flex-1">
          <span className="text-amber-600 text-sm font-semibold whitespace-nowrap">⚖ CNR Lookup</span>
          <div className="w-px h-4 bg-amber-200" />
          <input
            type="text"
            value={cnr}
            onChange={(e) => setCnr(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && lookup()}
            placeholder="Enter CNR number (e.g. MHNS010012342024)"
            className="flex-1 bg-transparent text-sm font-mono outline-none placeholder:text-amber-400 text-gray-800 min-w-0"
            maxLength={20}
          />
          {cnr && (
            <button onClick={clear} className="text-gray-400 hover:text-gray-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={lookup}
          disabled={loading || cnr.trim().length < 10}
          className="flex items-center gap-1.5 bg-[#1e3a5f] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#162d4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {loading ? "Fetching..." : "Fetch from eCourts"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-100 text-sm text-red-600 flex items-center gap-2">
          <span>⚠</span> {error}
        </div>
      )}

      {/* Result */}
      {result && open && (
        <div className="p-4">
          {/* Case header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-gray-800">
                  {result.caseType ?? "Case"} — {result.caseNumber ?? cnr}
                </h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(result.caseStatus)}`}>
                  {result.caseStatus ?? "Unknown"}
                </span>
              </div>
              {result.courtName && (
                <p className="text-sm text-gray-500 mt-0.5">{result.courtName}</p>
              )}
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            {[
              { label: "Filing Date", value: result.filingDate },
              { label: "Registration Date", value: result.registrationDate },
              { label: "Next Hearing", value: result.nextHearingDate },
              { label: "Judge", value: result.judgeName },
              { label: "Petitioner", value: result.petitioner },
              { label: "Respondent", value: result.respondent },
            ]
              .filter((f) => f.value)
              .map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-xs text-gray-500 font-medium">{label}</p>
                  <p className="text-sm text-gray-800 mt-0.5 truncate" title={value}>
                    {value}
                  </p>
                </div>
              ))}
          </div>

          {/* Acts */}
          {(result.underActs || (result.acts && result.acts.length > 0)) && (
            <div className="bg-blue-50 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-600 font-semibold mb-1">Under Acts</p>
              <p className="text-sm text-blue-800">
                {result.underActs ?? result.acts?.join(", ")}
              </p>
            </div>
          )}

          {/* Hearing history */}
          {result.hearingHistory && result.hearingHistory.length > 0 && (
            <div>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-sm font-medium text-[#1e3a5f] hover:text-[#162d4a] w-full text-left"
              >
                {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Hearing History ({result.hearingHistory.length} entries)
              </button>

              {showHistory && (
                <div className="mt-3 border border-gray-100 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left text-xs text-gray-500 font-medium px-3 py-2">#</th>
                        <th className="text-left text-xs text-gray-500 font-medium px-3 py-2">Date</th>
                        <th className="text-left text-xs text-gray-500 font-medium px-3 py-2">Purpose</th>
                        <th className="text-left text-xs text-gray-500 font-medium px-3 py-2">Next Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {[...result.hearingHistory].reverse().map((h, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-400 text-xs">
                            {result.hearingHistory!.length - i}
                          </td>
                          <td className="px-3 py-2 text-gray-700 font-mono text-xs whitespace-nowrap">
                            {h.date ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-gray-700">{h.purpose ?? "—"}</td>
                          <td className="px-3 py-2 text-gray-500 font-mono text-xs whitespace-nowrap">
                            {h.nextDate ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
            <a
              href={`/cases/new?cnr=${encodeURIComponent(cnr)}`}
              className="flex items-center gap-1.5 bg-[#1e3a5f] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#162d4a] transition-colors"
            >
              + Save as New Case
            </a>
            <a
              href={`https://services.ecourts.gov.in/ecourtindiaHC/?case_no=${cnr}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              View on eCourts
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
