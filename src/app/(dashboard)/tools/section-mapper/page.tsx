"use client";
import { useState, useCallback } from "react";
import {
  GitCompare,
  Search,
  Loader2,
  AlertCircle,
  ArrowRight,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Scale,
  BookOpen,
} from "lucide-react";
import CaseSelector, { type CaseSelectorCase } from "@/components/ui/CaseSelector";

interface MappedSection {
  law: string;
  sectionNumber: string;
  title: string;
  fullText?: string;
  punishment?: string | null;
  isBailable?: boolean | null;
  isCognizable?: boolean | null;
  isCompoundable?: boolean | null;
  isNonBailable?: boolean | null;
  mappedLaw?: string | null;
  mappedSection?: string | null;
  mappedTitle?: string | null;
  mappedPunishment?: string | null;
}

type Direction = "IPC_TO_BNS" | "BNS_TO_IPC" | "SEARCH";

export default function SectionMapperPage() {
  const [query, setQuery] = useState("");
  const [direction, setDirection] = useState<Direction>("SEARCH");
  const [results, setResults] = useState<MappedSection[]>([]);
  const [source, setSource] = useState<"database" | "ai" | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleCaseSelected(c: CaseSelectorCase | null) {
    if (!c) return;
    const sections = [...(c.bnsSections ?? []), ...(c.ipcSections ?? [])];
    if (sections.length > 0) {
      setQuery(sections.join(", "));
      if ((c.bnsSections ?? []).length > 0 && (c.ipcSections ?? []).length === 0) setDirection("BNS_TO_IPC");
      else if ((c.ipcSections ?? []).length > 0 && (c.bnsSections ?? []).length === 0) setDirection("IPC_TO_BNS");
      else setDirection("SEARCH");
    }
  }

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setResults([]);
    setSource("");

    try {
      const res = await fetch("/api/tools/section-mapper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), direction }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Search failed");
        return;
      }
      setResults(data.results ?? []);
      setSource(data.source ?? "");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [query, direction]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <GitCompare className="h-6 w-6 text-[#1e3a5f]" />
          IPC / BNS Section Mapper
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Search any IPC or BNS section to find its equivalent under the new/old law. BNS 2023 replaced IPC 1860 from 1 July 2024.
        </p>
      </div>

      {/* Auto-fill from Case */}
      <CaseSelector onCaseSelected={handleCaseSelected} className="mb-5" />

      {/* Transition Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
        <div className="flex items-start gap-2">
          <BookOpen className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-700">
            <p className="font-semibold mb-1">BNS/IPC Transition Rule</p>
            <p>Offences committed <strong>before 1 July 2024</strong> — IPC 1860, CrPC 1973, Indian Evidence Act 1872 apply.</p>
            <p>Offences committed <strong>on or after 1 July 2024</strong> — BNS 2023, BNSS 2023, BSA 2023 apply.</p>
          </div>
        </div>
      </div>

      {/* Search Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-5">
        {/* Direction Toggle */}
        <div className="flex gap-2 mb-4">
          {([
            { value: "SEARCH", label: "Search All" },
            { value: "IPC_TO_BNS", label: "IPC \u2192 BNS" },
            { value: "BNS_TO_IPC", label: "BNS \u2192 IPC" },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDirection(opt.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                direction === opt.value
                  ? "bg-[#1e3a5f] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Enter section number (e.g., 302, 103) or keyword (e.g., murder, theft, cheating)"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="px-6 py-3 bg-[#1e3a5f] text-white rounded-lg text-sm font-semibold hover:bg-[#152d4a] disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {results.length} result{results.length !== 1 ? "s" : ""} found
            </p>
            {source === "ai" && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                AI-powered results
              </span>
            )}
          </div>

          {results.map((s, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex flex-col lg:flex-row">
                {/* Source Section */}
                <div className="flex-1 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      s.law === "BNS" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                    }`}>
                      {s.law}
                    </span>
                    <span className="text-lg font-bold text-gray-800">
                      Section {s.sectionNumber}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">{s.title}</p>
                  {s.punishment && (
                    <p className="text-xs text-gray-500 mb-2">
                      <span className="font-medium">Punishment:</span> {s.punishment}
                    </p>
                  )}
                  {s.fullText && (
                    <p className="text-xs text-gray-400 line-clamp-3">{s.fullText}</p>
                  )}
                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {s.isBailable === true && (
                      <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        <ShieldCheck className="h-3 w-3" /> Bailable
                      </span>
                    )}
                    {(s.isBailable === false || s.isNonBailable === true) && (
                      <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                        <ShieldAlert className="h-3 w-3" /> Non-Bailable
                      </span>
                    )}
                    {s.isCognizable === true && (
                      <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        <Shield className="h-3 w-3" /> Cognizable
                      </span>
                    )}
                    {s.isCompoundable === true && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        Compoundable
                      </span>
                    )}
                  </div>
                </div>

                {/* Arrow Separator */}
                {(s.mappedLaw && s.mappedSection) && (
                  <>
                    <div className="hidden lg:flex items-center px-4">
                      <div className="flex flex-col items-center">
                        <ArrowRight className="h-6 w-6 text-gray-300" />
                        <span className="text-[10px] text-gray-400 mt-1">maps to</span>
                      </div>
                    </div>
                    <div className="lg:hidden border-t border-gray-100 px-5 py-2 flex items-center gap-2 text-gray-400">
                      <ArrowRight className="h-4 w-4" />
                      <span className="text-xs">Equivalent section</span>
                    </div>

                    {/* Mapped Section */}
                    <div className="flex-1 p-5 bg-gray-50">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          s.mappedLaw === "BNS" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                        }`}>
                          {s.mappedLaw}
                        </span>
                        <span className="text-lg font-bold text-gray-800">
                          Section {s.mappedSection}
                        </span>
                      </div>
                      {s.mappedTitle && (
                        <p className="text-sm font-semibold text-gray-700 mb-2">{s.mappedTitle}</p>
                      )}
                      {s.mappedPunishment && (
                        <p className="text-xs text-gray-500">
                          <span className="font-medium">Punishment:</span> {s.mappedPunishment}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* No mapping available */}
                {!s.mappedLaw && !s.mappedSection && (
                  <div className="flex-1 p-5 bg-gray-50 flex items-center justify-center">
                    <p className="text-sm text-gray-400 italic">
                      <Scale className="h-4 w-4 inline mr-1" />
                      No direct equivalent in {s.law === "BNS" ? "IPC" : "BNS"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && results.length === 0 && source === "" && (
        <div className="text-center py-12 text-gray-400">
          <GitCompare className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Search for an IPC or BNS section to see its equivalent</p>
          <p className="text-xs mt-1">Try: 302, murder, 498A, cheating, theft</p>
        </div>
      )}

      {/* No results found */}
      {!loading && results.length === 0 && source !== "" && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm">No sections found for &ldquo;{query}&rdquo;</p>
        </div>
      )}
    </div>
  );
}
