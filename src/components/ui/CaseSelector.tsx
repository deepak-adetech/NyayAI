"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Scale, Search, X, CheckCircle, Loader2 } from "lucide-react";

export interface CaseSelectorCase {
  id: string;
  title: string;
  caseNumber: string | null;
  cnrNumber: string | null;
  firNumber: string | null;
  policeStation: string | null;
  caseType: string;
  status: string;
  courtName: string | null;
  courtComplex: string | null;
  courtDistrict: string | null;
  courtState: string | null;
  benchJudge: string | null;
  petitionerNames: string[];
  respondentNames: string[];
  petitionerAdvocates: string[];
  respondentAdvocates: string[];
  bnsSections: string[];
  ipcSections: string[];
  otherSections: string[];
  filingDate: string | null;
  nextHearingDate: string | null;
  notes: string | null;
  clients: Array<{
    client: { id: string; name: string | null; email: string; phone: string | null };
  }>;
}

interface CaseSelectorProps {
  onCaseSelected: (caseData: CaseSelectorCase | null) => void;
  className?: string;
}

interface CaseListItem {
  id: string;
  title: string;
  caseNumber: string | null;
  cnrNumber: string | null;
  status: string;
}

export default function CaseSelector({ onCaseSelected, className = "" }: CaseSelectorProps) {
  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingDetail, setFetchingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<CaseSelectorCase | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch case list on mount
  useEffect(() => {
    let cancelled = false;
    async function fetchCases() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/cases?limit=100");
        if (!res.ok) throw new Error("Failed to load cases");
        const data = await res.json();
        if (!cancelled) {
          const items: CaseListItem[] = (data.cases ?? data ?? []).map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (c: any) => ({
              id: c.id,
              title: c.title,
              caseNumber: c.caseNumber ?? null,
              cnrNumber: c.cnrNumber ?? null,
              status: c.status ?? "PENDING",
            })
          );
          setCases(items);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchCases();
    return () => { cancelled = true; };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = cases.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      (c.caseNumber ?? "").toLowerCase().includes(q) ||
      (c.cnrNumber ?? "").toLowerCase().includes(q)
    );
  });

  const handleSelect = useCallback(
    async (item: CaseListItem) => {
      setIsOpen(false);
      setSearch("");
      setFetchingDetail(true);
      try {
        const res = await fetch(`/api/cases/${item.id}`);
        if (!res.ok) throw new Error("Failed to load case details");
        const data = await res.json();
        const fullCase: CaseSelectorCase = {
          id: data.id,
          title: data.title,
          caseNumber: data.caseNumber ?? null,
          cnrNumber: data.cnrNumber ?? null,
          firNumber: data.firNumber ?? null,
          policeStation: data.policeStation ?? null,
          caseType: data.caseType ?? "OTHER",
          status: data.status ?? "PENDING",
          courtName: data.courtName ?? null,
          courtComplex: data.courtComplex ?? null,
          courtDistrict: data.courtDistrict ?? null,
          courtState: data.courtState ?? null,
          benchJudge: data.benchJudge ?? null,
          petitionerNames: data.petitionerNames ?? [],
          respondentNames: data.respondentNames ?? [],
          petitionerAdvocates: data.petitionerAdvocates ?? [],
          respondentAdvocates: data.respondentAdvocates ?? [],
          bnsSections: data.bnsSections ?? [],
          ipcSections: data.ipcSections ?? [],
          otherSections: data.otherSections ?? [],
          filingDate: data.filingDate ?? null,
          nextHearingDate: data.nextHearingDate ?? null,
          notes: data.notes ?? null,
          clients: data.clients ?? [],
        };
        setSelectedCase(fullCase);
        onCaseSelected(fullCase);
      } catch {
        setError("Failed to load case details");
      } finally {
        setFetchingDetail(false);
      }
    },
    [onCaseSelected]
  );

  const handleClear = useCallback(() => {
    setSelectedCase(null);
    setSearch("");
    onCaseSelected(null);
  }, [onCaseSelected]);

  const statusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "CLOSED":
        return "bg-gray-100 text-gray-600";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  return (
    <div className={`rounded-lg border border-[#1e3a5f]/20 bg-blue-50/50 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1e3a5f]/10">
        <Scale className="h-5 w-5 text-[#1e3a5f]" />
        <h3 className="text-sm font-semibold text-[#1e3a5f]">Auto-fill from Case</h3>
      </div>

      <div className="p-4">
        {/* Selected state */}
        {selectedCase ? (
          <div className="flex items-center justify-between gap-2 rounded-md bg-green-50 border border-green-200 px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600" />
              <span className="text-sm font-medium text-green-800 truncate">
                {selectedCase.title}
              </span>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="flex-shrink-0 rounded p-1 text-green-600 hover:bg-green-100 transition-colors"
              aria-label="Clear selection"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          /* Search / dropdown */
          <div ref={dropdownRef} className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={loading ? "Loading cases..." : "Search cases by title, case number, or CNR..."}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                disabled={loading}
                className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] disabled:opacity-50"
              />
              {fetchingDetail && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[#1e3a5f]" />
              )}
            </div>

            {isOpen && !loading && (
              <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
                {error && (
                  <div className="px-3 py-2 text-sm text-red-600">{error}</div>
                )}
                {filtered.length === 0 ? (
                  <div className="px-3 py-4 text-center text-sm text-gray-500">
                    {cases.length === 0 ? "No cases found" : "No matching cases"}
                  </div>
                ) : (
                  filtered.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelect(c)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">{c.title}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {c.caseNumber ?? c.cnrNumber ?? "No number"}
                        </div>
                      </div>
                      <span
                        className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(c.status)}`}
                      >
                        {c.status}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-[#1e3a5f]" />
            <span className="text-xs text-gray-500">Loading cases...</span>
          </div>
        )}
      </div>
    </div>
  );
}
