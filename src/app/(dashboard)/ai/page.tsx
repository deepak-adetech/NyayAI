"use client";
import { useState } from "react";
import { Brain, Search, Scale, AlertCircle, Loader2, ChevronRight } from "lucide-react";

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

export default function AIAssistantPage() {
  const [activeTab, setActiveTab] = useState<"sections" | "research">("sections");

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
      if (!res.ok) {
        setSectionError(data.error ?? "Analysis failed");
      } else {
        setSectionResult(data);
      }
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
      if (!res.ok) {
        setResearchError(data.error ?? "Research failed");
      } else {
        setResearchResult(data.response);
      }
    } catch {
      setResearchError("Request failed");
    } finally {
      setResearchLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Brain className="h-8 w-8 text-purple-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-800">AI Legal Assistant</h1>
          <p className="text-gray-500 text-sm">Powered by AI. BNS 2023 &amp; IPC Expert</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id: "sections", label: "BNS/IPC Section Finder", icon: Scale },
          { id: "research", label: "Legal Research", icon: Search },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
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
    </div>
  );
}
