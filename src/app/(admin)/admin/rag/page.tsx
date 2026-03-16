"use client";
import { useState, useEffect } from "react";
import { Brain, Plus, Search, RefreshCw, Database, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface Stats {
  total: number;
  byCategory: Record<string, number>;
}

interface Document {
  id: string;
  title: string;
  category: string;
  source?: string;
  created_at: string;
}

const CATEGORIES = [
  { value: "bns_sections", label: "BNS 2023 Sections" },
  { value: "ipc_sections", label: "IPC 1860 Sections" },
  { value: "bnss_sections", label: "BNSS 2023 Sections" },
  { value: "crpc_sections", label: "CrPC Sections" },
  { value: "sc_judgment", label: "Supreme Court Judgments" },
  { value: "hc_judgment", label: "High Court Judgments" },
  { value: "bare_act", label: "Bare Acts" },
  { value: "procedural_guide", label: "Procedural Guides" },
  { value: "legal_article", label: "Legal Articles" },
  { value: "evidence_act", label: "Evidence Act" },
  { value: "other", label: "Other" },
];

export default function AdminRAGPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "add" | "search" | "sync">("overview");

  // Add form
  const [newDoc, setNewDoc] = useState({ title: "", content: "", category: "bns_sections", source: "" });
  const [addLoading, setAddLoading] = useState(false);
  const [addStatus, setAddStatus] = useState("");

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ title: string; content: string; similarity: number; category: string }>>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  async function fetchStats() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/rag");
      const data = await res.json();
      setStats(data);
      // Fetch recent docs
      const docsRes = await fetch("/api/admin/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list" }),
      });
      const docsData = await docsRes.json();
      setDocs(docsData.documents ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchStats(); }, []);

  async function handleSeed() {
    setStatus("Seeding initial data...");
    const res = await fetch("/api/admin/rag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "bulk-seed" }),
    });
    const data = await res.json();
    setStatus(`Seeded ${data.added} documents. Errors: ${data.errors?.length ?? 0}`);
    fetchStats();
  }

  async function handleAutoSync() {
    setStatus("Running auto-sync...");
    const res = await fetch("/api/admin/rag/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "all" }),
    });
    const data = await res.json();
    setStatus(`Sync complete. Added: ${data.added}, Errors: ${data.errors?.length ?? 0}`);
    fetchStats();
  }

  async function handleAddDoc(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true);
    setAddStatus("");
    try {
      const res = await fetch("/api/admin/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", ...newDoc }),
      });
      const data = await res.json();
      if (data.success) {
        setAddStatus("Document added successfully");
        setNewDoc({ title: "", content: "", category: "bns_sections", source: "" });
        fetchStats();
      } else {
        setAddStatus(`Error: ${data.error}`);
      }
    } finally {
      setAddLoading(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchLoading(true);
    try {
      const res = await fetch("/api/admin/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "search", query: searchQuery }),
      });
      const data = await res.json();
      setSearchResults(data.results ?? []);
    } finally {
      setSearchLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-600" />
            AI Knowledge Base
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage the RAG legal knowledge base used by NyayaSahayak AI</p>
        </div>
        <button onClick={fetchStats} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {status && (
        <div className="bg-blue-50 border border-blue-100 text-blue-700 rounded-xl px-4 py-3 text-sm mb-4">
          {status}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="text-2xl font-bold text-gray-900">{stats?.total ?? 0}</div>
          <div className="text-gray-500 text-sm">Total Documents</div>
        </div>
        {Object.entries(stats?.byCategory ?? {}).slice(0, 3).map(([cat, count]) => (
          <div key={cat} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="text-2xl font-bold text-gray-900">{count}</div>
            <div className="text-gray-500 text-sm capitalize">{cat.replace(/_/g, " ")}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {(["overview", "add", "search", "sync"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              activeTab === tab ? "bg-white text-[#1e3a5f] shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === "overview" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Documents</h2>
            <div className="flex gap-2">
              <button
                onClick={handleSeed}
                className="text-xs bg-[#1e3a5f] text-white px-3 py-1.5 rounded-lg hover:bg-[#162d4a] flex items-center gap-1"
              >
                <Database className="h-3.5 w-3.5" />
                Seed Initial Data
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {docs.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-sm">
                No documents yet. Click &quot;Seed Initial Data&quot; to add starter content.
              </div>
            )}
            {docs.map((doc) => (
              <div key={doc.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 text-sm">{doc.title}</div>
                  <div className="text-gray-400 text-xs mt-0.5">{doc.source ?? doc.category}</div>
                </div>
                <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                  {doc.category.replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Document */}
      {activeTab === "add" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm max-w-2xl">
          <h2 className="font-semibold text-gray-900 mb-4">Add Legal Document</h2>
          {addStatus && (
            <div className={`flex items-center gap-2 text-sm mb-4 p-3 rounded-lg ${
              addStatus.startsWith("Error") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
            }`}>
              {addStatus.startsWith("Error") ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
              {addStatus}
            </div>
          )}
          <form onSubmit={handleAddDoc} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                value={newDoc.title}
                onChange={e => setNewDoc(d => ({ ...d, title: e.target.value }))}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                placeholder="e.g., BNS Section 103 - Murder"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={newDoc.category}
                onChange={e => setNewDoc(d => ({ ...d, category: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <input
                value={newDoc.source}
                onChange={e => setNewDoc(d => ({ ...d, source: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                placeholder="e.g., BNS 2023, Supreme Court"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                value={newDoc.content}
                onChange={e => setNewDoc(d => ({ ...d, content: e.target.value }))}
                required
                rows={8}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1e3a5f] resize-none"
                placeholder="Full legal text, section description, judgment summary..."
              />
            </div>
            <button
              type="submit"
              disabled={addLoading}
              className="flex items-center gap-2 bg-[#1e3a5f] text-white px-5 py-2.5 rounded-lg font-medium hover:bg-[#162d4a] disabled:opacity-50"
            >
              {addLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Document
            </button>
          </form>
        </div>
      )}

      {/* Search Test */}
      {activeTab === "search" && (
        <div className="space-y-4 max-w-2xl">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4">Test Semantic Search</h2>
            <form onSubmit={handleSearch} className="flex gap-3">
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                required
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                placeholder="e.g., bail provisions for murder under BNS"
              />
              <button
                type="submit"
                disabled={searchLoading}
                className="flex items-center gap-2 bg-[#1e3a5f] text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-[#162d4a] disabled:opacity-50"
              >
                {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Search
              </button>
            </form>
          </div>
          {searchResults.map((r, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900 text-sm">{r.title}</h3>
                <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                  {(r.similarity * 100).toFixed(0)}% match
                </span>
              </div>
              <p className="text-gray-600 text-xs leading-relaxed line-clamp-4">{r.content}</p>
              <div className="text-gray-400 text-xs mt-2 capitalize">{r.category.replace(/_/g, " ")}</div>
            </div>
          ))}
        </div>
      )}

      {/* Auto Sync */}
      {activeTab === "sync" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm max-w-xl">
          <h2 className="font-semibold text-gray-900 mb-2">Auto-Sync Legal Content</h2>
          <p className="text-gray-500 text-sm mb-6">
            Automatically fetch and add additional BNS, IPC, and procedural content to the knowledge base.
            The auto-sync pulls from curated legal content sources to keep your AI knowledge current.
          </p>
          <div className="space-y-3">
            <button
              onClick={handleAutoSync}
              className="w-full flex items-center justify-center gap-2 bg-[#1e3a5f] text-white px-5 py-3 rounded-xl font-medium hover:bg-[#162d4a]"
            >
              <RefreshCw className="h-4 w-4" />
              Run Auto-Sync Now
            </button>
            <button
              onClick={handleSeed}
              className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-700 px-5 py-3 rounded-xl font-medium hover:bg-gray-50"
            >
              <Database className="h-4 w-4" />
              Re-seed Initial Data
            </button>
          </div>
          <div className="mt-6 bg-gray-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Set up automated sync (recommended)</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              To run this automatically, set up a daily cron job calling:<br/>
              <code className="bg-white px-1 py-0.5 rounded border border-gray-200 text-gray-700 text-xs">
                POST /api/admin/rag/sync
              </code><br/>
              with header <code className="bg-white px-1 py-0.5 rounded border border-gray-200 text-xs">x-cron-secret: [your CRON_SECRET]</code>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
