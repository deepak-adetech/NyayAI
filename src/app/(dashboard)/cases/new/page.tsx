"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Plus, X } from "lucide-react";

const CASE_TYPES = ["CRIMINAL", "CIVIL", "FAMILY", "CONSUMER", "LABOUR", "TAX", "WRIT", "ARBITRATION", "OTHER"];

export default function NewCasePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    caseNumber: "",
    cnrNumber: searchParams.get("cnr") ?? "",
    firNumber: "",
    policeStation: "",
    caseType: "CRIMINAL",
    courtName: "",
    courtDistrict: "",
    courtState: "",
    notes: "",
    nextHearingDate: "",
    filingDate: "",
  });

  const [petitioners, setPetitioners] = useState<string[]>([""]);
  const [respondents, setRespondents] = useState<string[]>([""]);
  const [bnsSections, setBnsSections] = useState<string[]>([]);
  const [ipcSections, setIpcSections] = useState<string[]>([]);
  const [sectionInput, setSectionInput] = useState({ bns: "", ipc: "" });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function addSection(type: "bns" | "ipc") {
    const value = sectionInput[type].trim();
    if (!value) return;
    if (type === "bns") setBnsSections((prev) => [...prev, value]);
    else setIpcSections((prev) => [...prev, value]);
    setSectionInput((prev) => ({ ...prev, [type]: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          petitionerNames: petitioners.filter(Boolean),
          respondentNames: respondents.filter(Boolean),
          bnsSections,
          ipcSections,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create case");
        setLoading(false);
        return;
      }

      router.push(`/cases/${data.id}`);
    } catch {
      setError("Request failed");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/cases" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">New Case</h1>
          <p className="text-gray-500 text-sm">Add a new case to your workspace</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Case Title *</label>
              <input
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#1e3a5f] outline-none text-sm"
                placeholder="e.g., State vs. Ramesh Kumar or Sharma vs. Building Society"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Case Type</label>
                <select
                  name="caseType"
                  value={formData.caseType}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  {CASE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Case Number</label>
                <input
                  name="caseNumber"
                  value={formData.caseNumber}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none"
                  placeholder="SC/1234/2025"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CNR Number</label>
                <input
                  name="cnrNumber"
                  value={formData.cnrNumber}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none"
                  placeholder="MHAU010012342025"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">FIR Number</label>
                <input
                  name="firNumber"
                  value={formData.firNumber}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none"
                  placeholder="FIR/123/2025"
                />
              </div>
            </div>

            {formData.caseType === "CRIMINAL" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Police Station</label>
                <input
                  name="policeStation"
                  value={formData.policeStation}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none"
                  placeholder="Shivajinagar Police Station, Pune"
                />
              </div>
            )}
          </div>
        </div>

        {/* Court details */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">Court Details</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Court Name</label>
              <input
                name="courtName"
                value={formData.courtName}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none"
                placeholder="Sessions Court, Pune"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
              <input
                name="courtDistrict"
                value={formData.courtDistrict}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none"
                placeholder="Pune"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                name="courtState"
                value={formData.courtState}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none"
                placeholder="Maharashtra"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filing Date</label>
              <input
                type="date"
                name="filingDate"
                value={formData.filingDate}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Next Hearing</label>
              <input
                type="datetime-local"
                name="nextHearingDate"
                value={formData.nextHearingDate}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Parties */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">Parties</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Petitioners / Complainants</label>
              {petitioners.map((p, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input
                    value={p}
                    onChange={(e) => {
                      const updated = [...petitioners];
                      updated[i] = e.target.value;
                      setPetitioners(updated);
                    }}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none"
                    placeholder={`Petitioner ${i + 1}`}
                  />
                  {petitioners.length > 1 && (
                    <button type="button" onClick={() => setPetitioners(prev => prev.filter((_, j) => j !== i))}>
                      <X className="h-4 w-4 text-gray-400" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setPetitioners(prev => [...prev, ""])}
                className="text-sm text-blue-600 flex items-center gap-1 hover:underline"
              >
                <Plus className="h-3 w-3" /> Add Petitioner
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Respondents / Accused</label>
              {respondents.map((r, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input
                    value={r}
                    onChange={(e) => {
                      const updated = [...respondents];
                      updated[i] = e.target.value;
                      setRespondents(updated);
                    }}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none"
                    placeholder={`Respondent ${i + 1}`}
                  />
                  {respondents.length > 1 && (
                    <button type="button" onClick={() => setRespondents(prev => prev.filter((_, j) => j !== i))}>
                      <X className="h-4 w-4 text-gray-400" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setRespondents(prev => [...prev, ""])}
                className="text-sm text-blue-600 flex items-center gap-1 hover:underline"
              >
                <Plus className="h-3 w-3" /> Add Respondent
              </button>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">Legal Sections</h2>
          <div className="grid grid-cols-2 gap-6">
            {(["bns", "ipc"] as const).map((type) => (
              <div key={type}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {type.toUpperCase()} Sections
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    value={sectionInput[type]}
                    onChange={(e) => setSectionInput(prev => ({ ...prev, [type]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSection(type))}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none"
                    placeholder={type === "bns" ? "e.g., 103(1)" : "e.g., 302"}
                  />
                  <button
                    type="button"
                    onClick={() => addSection(type)}
                    className="bg-gray-100 hover:bg-gray-200 px-3 rounded-lg text-sm"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(type === "bns" ? bnsSections : ipcSections).map((s) => (
                    <span
                      key={s}
                      className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                    >
                      {type.toUpperCase()} {s}
                      <button
                        type="button"
                        onClick={() =>
                          type === "bns"
                            ? setBnsSections(prev => prev.filter((x) => x !== s))
                            : setIpcSections(prev => prev.filter((x) => x !== s))
                        }
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">Internal Notes</h2>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none resize-none"
            placeholder="Internal notes, strategy, reminders..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-[#1e3a5f] text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-[#162d4a] disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</>
            ) : (
              <><Save className="h-4 w-4" /> Create Case</>
            )}
          </button>
          <Link
            href="/cases"
            className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
