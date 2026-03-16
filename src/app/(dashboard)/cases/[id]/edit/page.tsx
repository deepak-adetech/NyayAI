"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Plus, X } from "lucide-react";

const CASE_TYPES = ["CRIMINAL", "CIVIL", "FAMILY", "CONSUMER", "LABOUR", "TAX", "WRIT", "ARBITRATION", "OTHER"];
const CASE_STATUSES = ["ACTIVE", "DISPOSED", "ARCHIVED", "TRANSFERRED", "STAYED"];

export default function EditCasePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const caseId = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    caseNumber: "",
    cnrNumber: "",
    firNumber: "",
    policeStation: "",
    status: "ACTIVE",
    courtName: "",
    courtDistrict: "",
    courtState: "",
    benchJudge: "",
    notes: "",
    nextHearingDate: "",
  });

  const [petitioners, setPetitioners] = useState<string[]>([""]);
  const [respondents, setRespondents] = useState<string[]>([""]);
  const [bnsSections, setBnsSections] = useState<string[]>([]);
  const [ipcSections, setIpcSections] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [sectionInput, setSectionInput] = useState({ bns: "", ipc: "" });
  const [tagInput, setTagInput] = useState("");

  // Load existing case data
  useEffect(() => {
    async function loadCase() {
      try {
        const res = await fetch(`/api/cases/${caseId}`);
        if (!res.ok) {
          setError("Case not found");
          setLoading(false);
          return;
        }
        const data = await res.json();

        setFormData({
          title: data.title ?? "",
          caseNumber: data.caseNumber ?? "",
          cnrNumber: data.cnrNumber ?? "",
          firNumber: data.firNumber ?? "",
          policeStation: data.policeStation ?? "",
          status: data.status ?? "ACTIVE",
          courtName: data.courtName ?? "",
          courtDistrict: data.courtDistrict ?? "",
          courtState: data.courtState ?? "",
          benchJudge: data.benchJudge ?? "",
          notes: data.notes ?? "",
          nextHearingDate: data.nextHearingDate
            ? new Date(data.nextHearingDate).toISOString().slice(0, 16)
            : "",
        });

        setPetitioners(
          data.petitionerNames && data.petitionerNames.length > 0
            ? data.petitionerNames
            : [""]
        );
        setRespondents(
          data.respondentNames && data.respondentNames.length > 0
            ? data.respondentNames
            : [""]
        );
        setBnsSections(data.bnsSections ?? []);
        setIpcSections(data.ipcSections ?? []);
        setTags(data.tags ?? []);
      } catch {
        setError("Failed to load case");
      } finally {
        setLoading(false);
      }
    }
    loadCase();
  }, [caseId]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function addSection(type: "bns" | "ipc") {
    const value = sectionInput[type].trim();
    if (!value) return;
    if (type === "bns") setBnsSections((prev) => [...prev, value]);
    else setIpcSections((prev) => [...prev, value]);
    setSectionInput((prev) => ({ ...prev, [type]: "" }));
  }

  function addTag() {
    const value = tagInput.trim().toLowerCase();
    if (!value || tags.includes(value)) return;
    setTags((prev) => [...prev, value]);
    setTagInput("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          caseNumber: formData.caseNumber || null,
          cnrNumber: formData.cnrNumber || null,
          firNumber: formData.firNumber || null,
          policeStation: formData.policeStation || null,
          courtName: formData.courtName || null,
          courtDistrict: formData.courtDistrict || null,
          courtState: formData.courtState || null,
          benchJudge: formData.benchJudge || null,
          notes: formData.notes || null,
          nextHearingDate: formData.nextHearingDate || null,
          petitionerNames: petitioners.filter(Boolean),
          respondentNames: respondents.filter(Boolean),
          bnsSections,
          ipcSections,
          tags,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to update case");
        setSaving(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push(`/cases/${caseId}`), 1200);
    } catch {
      setError("Request failed");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/cases/${caseId}`} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Edit Case</h1>
          <p className="text-gray-500 text-sm">Update case details</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 text-green-700 text-sm">
          ✓ Case updated successfully. Redirecting...
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Case Title *
              </label>
              <input
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#1e3a5f] outline-none text-sm"
                placeholder="e.g., State vs. Ramesh Kumar"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none"
                >
                  {CASE_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Bench / Judge</label>
              <input
                name="benchJudge"
                value={formData.benchJudge}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none"
                placeholder="Hon. Justice A.K. Sharma"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Next Hearing</label>
              <input
                type="datetime-local"
                name="nextHearingDate"
                value={formData.nextHearingDate}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none"
              />
            </div>
          </div>
        </div>

        {/* Parties */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">Parties</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Petitioners / Complainants
              </label>
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
                    <button
                      type="button"
                      onClick={() => setPetitioners((prev) => prev.filter((_, j) => j !== i))}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setPetitioners((prev) => [...prev, ""])}
                className="text-sm text-blue-600 flex items-center gap-1 hover:underline"
              >
                <Plus className="h-3 w-3" /> Add Petitioner
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Respondents / Accused
              </label>
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
                    <button
                      type="button"
                      onClick={() => setRespondents((prev) => prev.filter((_, j) => j !== i))}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setRespondents((prev) => [...prev, ""])}
                className="text-sm text-blue-600 flex items-center gap-1 hover:underline"
              >
                <Plus className="h-3 w-3" /> Add Respondent
              </button>
            </div>
          </div>
        </div>

        {/* Legal Sections */}
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
                    onChange={(e) =>
                      setSectionInput((prev) => ({ ...prev, [type]: e.target.value }))
                    }
                    onKeyDown={(e) =>
                      e.key === "Enter" && (e.preventDefault(), addSection(type))
                    }
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
                            ? setBnsSections((prev) => prev.filter((x) => x !== s))
                            : setIpcSections((prev) => prev.filter((x) => x !== s))
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

        {/* Tags */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">Tags</h2>
          <div className="flex gap-2 mb-3">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none"
              placeholder="e.g., bail, high-priority, property"
            />
            <button
              type="button"
              onClick={addTag}
              className="bg-gray-100 hover:bg-gray-200 px-3 rounded-lg text-sm"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full flex items-center gap-1"
              >
                #{tag}
                <button type="button" onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}>
                  <X className="h-3 w-3" />
                </button>
              </span>
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
            rows={5}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none resize-none"
            placeholder="Internal notes, strategy, reminders..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-[#1e3a5f] text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-[#162d4a] disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save Changes
              </>
            )}
          </button>
          <Link
            href={`/cases/${caseId}`}
            className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
