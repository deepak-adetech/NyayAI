"use client";
import { useState, useEffect } from "react";
import { Brain, Search, Scale, AlertCircle, Loader2, ChevronRight, FileText, ChevronDown, Clock } from "lucide-react";

interface SectionResult {
  law: string;
  sectionNumber: string;
  title: string;
  punishment: string | null;
  isBailable: boolean | null;
  isCognizable: boolean | null;
  applicabilityReason: string;
}

interface IdentificationResult {
  applicableLaw: string;
  primarySections: SectionResult[];
  additionalSections: SectionResult[];
  bailAssessment: string;
  custodyStatus: string;
  recommendedActions: string[];
  disclaimer: string;
}

interface CaseOption {
  id: string;
  title: string;
  caseNumber: string | null;
  cnrNumber: string | null;
  caseType: string;
  status: string;
}

export default function AIAssistantPage() {
  const [activeTab, setActiveTab] = useState<"sections" | "research" | "summary" | "limitation">("sections");

  // Limitation Calculator state
  const [limitationText, setLimitationText] = useState("");
  const [limitationCaseType, setLimitationCaseType] = useState("CIVIL");
  const [limitationOrderDate, setLimitationOrderDate] = useState("");
  const [limitationResult, setLimitationResult] = useState<{
    orderType?: string;
    applicableArticle?: string;
    articleTitle?: string;
    limitationPeriodDays?: number;
    computationBreakdown?: string;
    filingDeadline?: string;
    startDate?: string;
    specialConditions?: string[];
    condonationPossible?: boolean;
    condonationNotes?: string;
    disclaimer?: string;
  } | null>(null);
  const [limitationLoading, setLimitationLoading] = useState(false);
  const [limitationError, setLimitationError] = useState("");

  // Section identification
  const [caseFacts, setCaseFacts] = useState("");
  const [offenceDate, setOffenceDate] = useState("");
  const [sectionResult, setSectionResult] = useState<IdentificationResult | null>(null);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [sectionError, setSectionError] = useState("");

  // Legal research
  const [researchQuery, setResearchQuery] = useState("");
  const [researchResult, setResearchResult] = useState("");
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchError, setResearchError] = useState("");

  // Case summary
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [summaryResult, setSummaryResult] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [summaryMeta, setSummaryMeta] = useState<{ ragUsed?: boolean; sectionsAnalysed?: string[] } | null>(null);

  // Load cases when summary tab is active
  useEffect(() => {
    if (activeTab === "summary" && cases.length === 0) {
      setCasesLoading(true);
      fetch("/api/cases?limit=100")
        .then(r => r.json())
        .then(data => {
          setCases(data.cases ?? data ?? []);
        })
        .catch(() => {})
        .finally(() => setCasesLoading(false));
    }
  }, [activeTab]);

  async function handleIdentifySections(e: React.FormEvent) {
    e.preventDefault();
    setSectionError("");
    setSectionResult(null);
    setSectionLoading(true);
    try {
      const res = await fetch("/api/ai/identify-sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseFacts, offenceDate: offenceDate || undefined }),
      });
      const data = await res.json();
      if (!res.ok) setSectionError(data.error ?? "Analysis failed");
      else setSectionResult(data);
    } catch {
      setSectionError("Request failed");
    } finally {
      setSectionLoading(false);
    }
  }

  async function handleResearch(e: React.FormEvent) {
    e.preventDefault();
    setResearchError("");
    setResearchResult("");
    setResearchLoading(true);
    try {
      const res = await fetch("/api/ai/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: researchQuery }),
      });
      const data = await res.json();
      if (!res.ok) setResearchError(data.error ?? "Research failed");
      else setResearchResult(data.response);
    } catch {
      setResearchError("Request failed");
    } finally {
      setResearchLoading(false);
    }
  }

  async function handleCaseSummary(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCaseId) return;
    setSummaryError("");
    setSummaryResult("");
    setSummaryMeta(null);
    setSummaryLoading(true);
    try {
      const res = await fetch("/api/ai/case-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: selectedCaseId }),
      });
      const data = await res.json();
      if (!res.ok) setSummaryError(data.error ?? "Summary failed");
      else {
        setSummaryResult(data.summary);
        setSummaryMeta({ ragUsed: data.ragUsed, sectionsAnalysed: data.sectionsAnalysed });
      }
    } catch {
      setSummaryError("Request failed");
    } finally {
      setSummaryLoading(false);
    }
  }

  const selectedCase = cases.find(c => c.id === selectedCaseId);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Brain className="h-8 w-8 text-purple-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-800">AI Legal Assistant</h1>
          <p className="text-gray-500 text-sm">Powered by Claude AI · BNS 2023 &amp; IPC Expert</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {[
          { id: "sections", label: "BNS/IPC Section Finder", icon: Scale },
          { id: "research", label: "Legal Research", icon: Search },
          { id: "summary", label: "Case Summary", icon: FileText },
          { id: "limitation", label: "Limitation Calculator", icon: Clock },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as "sections" | "research" | "summary" | "limitation")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-white text-[#1e3a5f] shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Section Identifier */}
      {activeTab === "sections" && (
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700">
            <strong>BNS Transition:</strong> Crimes before July 1, 2024 → IPC applies. Crimes from July 1, 2024 → BNS applies.
            Always specify the offence date for accurate section identification.
          </div>

          <form onSubmit={handleIdentifySections} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Offence Date (optional)
              </label>
              <input
                type="date"
                value={offenceDate}
                onChange={(e) => setOffenceDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Case Facts / FIR Summary *
              </label>
              <textarea
                value={caseFacts}
                onChange={(e) => setCaseFacts(e.target.value)}
                required
                minLength={20}
                rows={6}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                placeholder="Describe what happened: The accused allegedly entered the complainant's house by force on the night of... and...

Include: nature of offence, weapon used, injuries caused, property damage, motive, parties involved..."
              />
            </div>

            {sectionError && (
              <div className="flex items-center gap-2 text-red-600 text-sm mb-3">
                <AlertCircle className="h-4 w-4" />
                {sectionError}
              </div>
            )}

            <button
              type="submit"
              disabled={sectionLoading}
              className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {sectionLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</>
              ) : (
                <><Scale className="h-4 w-4" /> Identify Sections</>
              )}
            </button>
          </form>

          {sectionResult && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">Analysis Result</h2>
                <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                  sectionResult.custodyStatus === "non-bailable"
                    ? "bg-red-100 text-red-700"
                    : sectionResult.custodyStatus === "bailable"
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}>
                  {sectionResult.custodyStatus?.toUpperCase()}
                </span>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Applicable Law</p>
                <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                  {sectionResult.applicableLaw}
                </span>
              </div>

              {sectionResult.primarySections?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Primary Sections</p>
                  <div className="space-y-2">
                    {sectionResult.primarySections.map((s, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-gray-800">
                            {s.law} Section {s.sectionNumber}
                          </span>
                          <div className="flex gap-1">
                            {s.isBailable === false && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Non-Bailable</span>
                            )}
                            {s.isBailable === true && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Bailable</span>
                            )}
                            {s.isCognizable === true && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Cognizable</span>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 font-medium">{s.title}</p>
                        {s.punishment && (
                          <p className="text-xs text-gray-500 mt-1">Punishment: {s.punishment}</p>
                        )}
                        <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                          <ChevronRight className="h-3 w-3" />
                          {s.applicabilityReason}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sectionResult.bailAssessment && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm font-medium text-blue-800">Bail Assessment</p>
                  <p className="text-sm text-blue-700 mt-1">{sectionResult.bailAssessment}</p>
                </div>
              )}

              {sectionResult.recommendedActions?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Recommended Actions</p>
                  <ul className="space-y-1">
                    {sectionResult.recommendedActions.map((action, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-green-600 font-bold">→</span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-xs text-gray-400 border-t border-gray-100 pt-3">
                {sectionResult.disclaimer}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Legal Research */}
      {activeTab === "research" && (
        <div className="space-y-4">
          <form onSubmit={handleResearch} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Legal Research Query
            </label>
            <textarea
              value={researchQuery}
              onChange={(e) => setResearchQuery(e.target.value)}
              required
              minLength={10}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none"
              placeholder="e.g., What are the bail provisions for murder under BNS Section 103?
Or: Difference between Section 85 BNS and Section 120B IPC.
Or: Supreme Court guidelines on anticipatory bail under Section 482 BNSS."
            />

            {researchError && (
              <div className="flex items-center gap-2 text-red-600 text-sm mt-2 mb-2">
                <AlertCircle className="h-4 w-4" />
                {researchError}
              </div>
            )}

            <button
              type="submit"
              disabled={researchLoading}
              className="mt-3 flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {researchLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Researching...</>
              ) : (
                <><Search className="h-4 w-4" /> Research</>
              )}
            </button>
          </form>

          {researchResult && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-3">Research Result</h2>
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                {researchResult}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Case Summary */}
      {activeTab === "summary" && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            <strong>Complete Case Report:</strong> Select a case to get a full AI-powered report — charges analysis, applicable penal code (BNS/IPC), hearing history, risk assessment, expert advice, and strategic recommendations.
          </div>

          <form onSubmit={handleCaseSummary} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Case *
            </label>

            {casesLoading ? (
              <div className="flex items-center gap-2 text-gray-500 text-sm py-3">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading your cases...
              </div>
            ) : cases.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">No cases found. <a href="/cases/new" className="text-purple-600 hover:underline">Create a case first.</a></p>
            ) : (
              <div className="relative">
                <select
                  value={selectedCaseId}
                  onChange={(e) => {
                    setSelectedCaseId(e.target.value);
                    setSummaryResult("");
                    setSummaryError("");
                  }}
                  required
                  className="w-full appearance-none border border-gray-300 rounded-lg px-3 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                >
                  <option value="">— Choose a case —</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                      {c.caseNumber ? ` · ${c.caseNumber}` : ""}
                      {c.cnrNumber ? ` · CNR: ${c.cnrNumber}` : ""}
                      {` · ${c.status}`}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            )}

            {selectedCase && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-600 space-y-1">
                <p><span className="font-medium">Type:</span> {selectedCase.caseType}</p>
                {selectedCase.cnrNumber && <p><span className="font-medium">CNR:</span> {selectedCase.cnrNumber}</p>}
                {selectedCase.caseNumber && <p><span className="font-medium">Case No:</span> {selectedCase.caseNumber}</p>}
                <p><span className="font-medium">Status:</span> {selectedCase.status}</p>
              </div>
            )}

            {summaryError && (
              <div className="flex items-center gap-2 text-red-600 text-sm mt-3">
                <AlertCircle className="h-4 w-4" />
                {summaryError}
              </div>
            )}

            <button
              type="submit"
              disabled={summaryLoading || !selectedCaseId}
              className="mt-4 flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {summaryLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Generating Expert Report...</>
              ) : (
                <><FileText className="h-4 w-4" /> Generate Complete Case Report</>
              )}
            </button>
            {summaryLoading && (
              <p className="text-xs text-gray-400 mt-2">This may take 15-30 seconds — Claude is analysing charges, reviewing legal knowledge base, and preparing expert advice...</p>
            )}
          </form>

          {summaryResult && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-purple-50">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  <h2 className="font-semibold text-gray-800">
                    Expert Case Report — {selectedCase?.title}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {summaryMeta?.ragUsed && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">RAG Enhanced</span>
                  )}
                  {summaryMeta?.sectionsAnalysed && summaryMeta.sectionsAnalysed.length > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      {summaryMeta.sectionsAnalysed.length} section{summaryMeta.sectionsAnalysed.length !== 1 ? "s" : ""} analysed
                    </span>
                  )}
                </div>
              </div>
              <div className="p-5">
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                  {summaryResult}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Limitation Calculator Tab */}
      {activeTab === "limitation" && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-700">
                <p className="font-semibold mb-1">Limitation Act 1963</p>
                <p>Paste your court order text below. The AI will identify the order type, applicable limitation article, and compute your exact filing deadline — including S.12 (certified copy time) and S.5 (condonation) applicability.</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order / Judgment Text</label>
                <textarea
                  value={limitationText}
                  onChange={(e) => setLimitationText(e.target.value)}
                  rows={8}
                  placeholder="Paste the full text of the court order or judgment here..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Case Type</label>
                  <select
                    value={limitationCaseType}
                    onChange={(e) => setLimitationCaseType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="CIVIL">Civil</option>
                    <option value="CRIMINAL">Criminal</option>
                    <option value="FAMILY">Family</option>
                    <option value="CONSUMER">Consumer</option>
                    <option value="LABOUR">Labour</option>
                    <option value="TAX">Tax</option>
                    <option value="WRIT">Writ</option>
                    <option value="ARBITRATION">Arbitration</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order Date (optional)</label>
                  <input
                    type="date"
                    value={limitationOrderDate}
                    onChange={(e) => setLimitationOrderDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <button
                onClick={async () => {
                  if (limitationText.length < 20) return;
                  setLimitationLoading(true);
                  setLimitationError("");
                  setLimitationResult(null);
                  try {
                    const res = await fetch("/api/ai/limitation-calculator", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        orderText: limitationText,
                        caseType: limitationCaseType,
                        orderDate: limitationOrderDate || undefined,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error ?? "Failed");
                    setLimitationResult(data);
                  } catch (err) {
                    setLimitationError(err instanceof Error ? err.message : "Calculation failed");
                  } finally {
                    setLimitationLoading(false);
                  }
                }}
                disabled={limitationLoading || limitationText.length < 20}
                className="w-full py-2.5 bg-[#1e3a5f] text-white rounded-lg text-sm font-semibold hover:bg-[#152d4a] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {limitationLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Computing limitation period...</>
                ) : (
                  <><Clock className="h-4 w-4" /> Calculate Limitation Period</>
                )}
              </button>
            </div>
          </div>

          {limitationError && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">{limitationError}</p>
            </div>
          )}

          {limitationResult && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-amber-50 p-4 border-b border-amber-100">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-semibold text-gray-800">
                    {limitationResult.applicableArticle ?? ""}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    limitationResult.orderType === "final" ? "bg-red-100 text-red-700" :
                    limitationResult.orderType === "interim" ? "bg-amber-100 text-amber-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {limitationResult.orderType?.toUpperCase() ?? ""} ORDER
                  </span>
                  {Boolean(limitationResult.condonationPossible) && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                      S.5 Condonation Available
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-1">{limitationResult.articleTitle ?? ""}</p>
              </div>

              <div className="p-5 space-y-4">
                {/* Deadline Highlight */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <p className="text-xs text-red-600 font-medium mb-1">FILING DEADLINE</p>
                  <p className="text-2xl font-bold text-red-800">{limitationResult.filingDeadline ?? ""}</p>
                  <p className="text-sm text-red-600 mt-1">{limitationResult.limitationPeriodDays ?? 0} days from {limitationResult.startDate ?? "order date"}</p>
                </div>

                {/* Computation */}
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">Computation Breakdown</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{limitationResult.computationBreakdown ?? ""}</p>
                </div>

                {/* Special Conditions */}
                {(limitationResult.specialConditions?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">Special Conditions & Notes</p>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      {(limitationResult.specialConditions ?? []).map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Condonation */}
                {limitationResult.condonationNotes && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-green-700 mb-1">Condonation of Delay (S.5)</p>
                    <p className="text-xs text-green-800">{limitationResult.condonationNotes}</p>
                  </div>
                )}

                {/* Disclaimer */}
                <p className="text-xs text-gray-400 italic">{limitationResult.disclaimer ?? ""}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
