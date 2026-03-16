"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

export default function NewHearingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillCaseId = searchParams.get("caseId") ?? "";

  const [cases, setCases] = useState<{ id: string; title: string; caseNumber: string | null }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    caseId: prefillCaseId,
    hearingDate: "",
    hearingTime: "",
    courtRoom: "",
    purpose: "",
    judge: "",
    boardNumber: "",
  });

  useEffect(() => {
    fetch("/api/cases?limit=200")
      .then((r) => r.json())
      .then((d) => setCases(d.cases ?? []));
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/hearings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: form.caseId,
          hearingDate: form.hearingDate,
          hearingTime: form.hearingTime || undefined,
          courtRoom: form.courtRoom || undefined,
          purpose: form.purpose || undefined,
          judge: form.judge || undefined,
          boardNumber: form.boardNumber ? parseInt(form.boardNumber) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to schedule hearing");
        setLoading(false);
        return;
      }

      router.push(`/cases/${form.caseId}`);
    } catch {
      setError("Request failed");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/hearings" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Schedule Hearing</h1>
          <p className="text-gray-500 text-sm">Add a new hearing date and set reminders</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Case *</label>
            <select
              name="caseId"
              value={form.caseId}
              onChange={handleChange}
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hearing Date *
              </label>
              <input
                type="datetime-local"
                name="hearingDate"
                value={form.hearingDate}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time (e.g. 10:30 AM)
              </label>
              <input
                type="text"
                name="hearingTime"
                value={form.hearingTime}
                onChange={handleChange}
                placeholder="10:30 AM"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Purpose / Type
            </label>
            <select
              name="purpose"
              value={form.purpose}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none"
            >
              <option value="">Select purpose</option>
              {[
                "Arguments",
                "Evidence",
                "Bail Hearing",
                "Framing of Charges",
                "Final Arguments",
                "Judgment",
                "Remand",
                "Mention",
                "Filing",
                "Hearing",
                "Other",
              ].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Court Room / Number
              </label>
              <input
                type="text"
                name="courtRoom"
                value={form.courtRoom}
                onChange={handleChange}
                placeholder="Court No. 5"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Board Number
              </label>
              <input
                type="number"
                name="boardNumber"
                value={form.boardNumber}
                onChange={handleChange}
                placeholder="e.g. 12"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Presiding Judge
            </label>
            <input
              type="text"
              name="judge"
              value={form.judge}
              onChange={handleChange}
              placeholder="Hon. Justice / ADJ..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none"
            />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
          <strong>Auto-Reminders:</strong> Email reminders will be scheduled 3 days before, 1
          day before, and morning of the hearing.
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-[#1e3a5f] text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-[#162d4a] disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Scheduling...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Schedule Hearing
              </>
            )}
          </button>
          <Link
            href="/hearings"
            className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
