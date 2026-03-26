"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Receipt, Plus, X, Loader2, Users } from "lucide-react";
import ClientSelector, { type ClientSelectorClient } from "@/components/ui/ClientSelector";

interface CaseOption {
  id: string;
  title: string;
  caseNumber: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
}

interface LineItem {
  description: string;
  amount: string; // rupees as string for input
  category: string;
}

const CATEGORIES = [
  { value: "fee", label: "Fee" },
  { value: "stamp_duty", label: "Stamp Duty" },
  { value: "process_fee", label: "Process Fee" },
  { value: "filing_fee", label: "Filing Fee" },
  { value: "court_fee", label: "Court Fee" },
  { value: "other", label: "Other" },
];

export default function NewInvoicePage() {
  const router = useRouter();

  const [cases, setCases] = useState<CaseOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [caseId, setCaseId] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [applyGst, setApplyGst] = useState(false);

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", amount: "", category: "fee" },
  ]);

  useEffect(() => {
    fetch("/api/cases?limit=100")
      .then((r) => r.json())
      .then((d) => setCases(d.cases ?? []))
      .catch(() => {});
  }, []);

  function handleCaseChange(selectedCaseId: string) {
    setCaseId(selectedCaseId);
    if (selectedCaseId) {
      // Fetch full case detail to get linked clients
      fetch(`/api/cases/${selectedCaseId}`)
        .then((r) => r.json())
        .then((data) => {
          const c = data.case ?? data;
          const linkedClient = c.clients?.[0]?.client;
          if (linkedClient) {
            if (linkedClient.name) setClientName(linkedClient.name);
            if (linkedClient.email) setClientEmail(linkedClient.email);
            if (linkedClient.phone) setClientPhone(linkedClient.phone);
          } else {
            // Fallback to flat fields
            const selected = cases.find((cs) => cs.id === selectedCaseId);
            if (selected?.clientName) setClientName(selected.clientName);
            if (selected?.clientEmail) setClientEmail(selected.clientEmail);
            if (selected?.clientPhone) setClientPhone(selected.clientPhone);
          }
        })
        .catch(() => {
          const selected = cases.find((cs) => cs.id === selectedCaseId);
          if (selected?.clientName) setClientName(selected.clientName);
        });
    }
  }

  function handleClientSelected(client: ClientSelectorClient | null) {
    if (!client) return;
    setClientName(client.name);
    setClientEmail(client.email);
    if (client.phone) setClientPhone(client.phone);
  }

  function addLineItem() {
    setLineItems((prev) => [...prev, { description: "", amount: "", category: "fee" }]);
  }

  function removeLineItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLineItem(index: number, field: keyof LineItem, value: string) {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  const subtotalRupees = lineItems.reduce((sum, item) => {
    const val = parseFloat(item.amount) || 0;
    return sum + val;
  }, 0);

  const taxRupees = applyGst ? subtotalRupees * 0.18 : 0;
  const totalRupees = subtotalRupees + taxRupees;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!clientName.trim()) {
      setError("Client name is required.");
      return;
    }

    const validItems = lineItems.filter(
      (item) => item.description.trim() && parseFloat(item.amount) > 0
    );

    if (validItems.length === 0) {
      setError("Add at least one line item with a description and amount.");
      return;
    }

    setLoading(true);

    try {
      const subtotalPaise = Math.round(subtotalRupees * 100);
      const taxPaise = Math.round(taxRupees * 100);
      const totalPaise = Math.round(totalRupees * 100);

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim() || undefined,
          clientPhone: clientPhone.trim() || undefined,
          caseId: caseId || undefined,
          description: description.trim() || "Invoice",
          amountPaise: subtotalPaise,
          taxPaise,
          totalPaise,
          dueDate: dueDate || undefined,
          lineItems: validItems.map((item) => ({
            description: item.description.trim(),
            amountPaise: Math.round(parseFloat(item.amount) * 100),
            category: item.category,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create invoice");
        setLoading(false);
        return;
      }

      router.push("/invoices");
    } catch {
      setError("Request failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Receipt className="h-7 w-7 text-[#1e3a5f]" />
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Create Invoice</h1>
          <p className="text-gray-500 text-sm">Generate a new invoice for your client</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Case Selection */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800 mb-3 uppercase tracking-wide">
            Case Selection
          </h2>
          <select
            value={caseId}
            onChange={(e) => handleCaseChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none"
          >
            <option value="">No case linked (optional)</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} {c.caseNumber ? `(${c.caseNumber})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Client Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
              Client Details
            </h2>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Users className="h-3.5 w-3.5" />
              or pick from master:
            </div>
          </div>
          <ClientSelector onClientSelected={handleClientSelected} label="Select from Client Master" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client Name *
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
              placeholder="Enter client name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Email
              </label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@example.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Phone
              </label>
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none"
              />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
              Line Items
            </h2>
            <button
              type="button"
              onClick={addLineItem}
              className="flex items-center gap-1 text-sm text-[#1e3a5f] font-medium hover:underline"
            >
              <Plus className="h-4 w-4" />
              Add Line Item
            </button>
          </div>

          <div className="space-y-3">
            {lineItems.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
              >
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateLineItem(index, "description", e.target.value)}
                    placeholder="Description (e.g. Consultation fee)"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none bg-white"
                  />
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                          Rs.
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.amount}
                          onChange={(e) => updateLineItem(index, "amount", e.target.value)}
                          placeholder="0.00"
                          className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none bg-white"
                        />
                      </div>
                    </div>
                    <select
                      value={item.category}
                      onChange={(e) => updateLineItem(index, "category", e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none bg-white"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {lineItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLineItem(index)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-1"
                    title="Remove line item"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tax */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={applyGst}
              onChange={(e) => setApplyGst(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#1e3a5f] focus:ring-[#1e3a5f]"
            />
            <div>
              <span className="text-sm font-medium text-gray-800">
                Apply 18% GST (RCM for business entities)
              </span>
              <p className="text-xs text-gray-500 mt-0.5">
                Goods and Services Tax under Reverse Charge Mechanism
              </p>
            </div>
          </label>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800 mb-3 uppercase tracking-wide">
            Summary
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="text-gray-800 font-medium">
                Rs.{" "}
                {subtotalRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            {applyGst && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">GST (18%)</span>
                <span className="text-gray-800 font-medium">
                  Rs.{" "}
                  {taxRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-2 flex justify-between text-base">
              <span className="font-semibold text-gray-800">Total</span>
              <span className="font-bold text-[#1e3a5f]">
                Rs.{" "}
                {totalRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800 mb-3 uppercase tracking-wide">
            Description
          </h2>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Overall invoice description or notes..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none resize-none"
          />
        </div>

        {/* Due Date */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800 mb-3 uppercase tracking-wide">
            Due Date
          </h2>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full md:w-auto border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            Leave empty for no due date.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-[#1e3a5f] text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-[#162d4a] disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Receipt className="h-4 w-4" /> Save as Draft
              </>
            )}
          </button>
          <Link
            href="/invoices"
            className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
