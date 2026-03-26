"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { User, Search, X, Plus, Loader2 } from "lucide-react";

export interface ClientSelectorClient {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  organization?: string | null;
}

interface ClientSelectorProps {
  onClientSelected: (client: ClientSelectorClient | null) => void;
  className?: string;
  label?: string;
}

interface ClientListItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  organization?: string | null;
}

export default function ClientSelector({
  onClientSelected,
  className = "",
  label = "Select Client",
}: ClientSelectorProps) {
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientSelectorClient | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch clients on mount
  useEffect(() => {
    let cancelled = false;
    async function fetchClients() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/clients?limit=100");
        if (!res.ok) throw new Error("Failed to load clients");
        const data = await res.json();
        if (!cancelled) {
          const items: ClientListItem[] = (data.clients ?? []).map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (c: any) => ({
              id: c.id,
              name: c.name,
              email: c.email,
              phone: c.phone ?? null,
              organization: c.clientProfile?.organization ?? null,
            })
          );
          setClients(items);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchClients();
    return () => {
      cancelled = true;
    };
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

  const filtered = clients.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  });

  const handleSelect = useCallback(
    (item: ClientListItem) => {
      setIsOpen(false);
      setSearch("");
      const client: ClientSelectorClient = {
        id: item.id,
        name: item.name,
        email: item.email,
        phone: item.phone,
        organization: item.organization,
      };
      setSelectedClient(client);
      onClientSelected(client);
    },
    [onClientSelected]
  );

  const handleClear = useCallback(() => {
    setSelectedClient(null);
    setSearch("");
    onClientSelected(null);
  }, [onClientSelected]);

  return (
    <div className={className}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      {/* Selected state */}
      {selectedClient ? (
        <div className="flex items-center justify-between gap-2 rounded-md bg-green-50 border border-green-200 px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <User className="h-4 w-4 flex-shrink-0 text-green-600" />
            <div className="min-w-0">
              <span className="text-sm font-medium text-green-800 truncate block">
                {selectedClient.name}
              </span>
              <span className="text-xs text-green-600 truncate block">
                {selectedClient.email}
                {selectedClient.phone ? ` | ${selectedClient.phone}` : ""}
              </span>
            </div>
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
              placeholder={loading ? "Loading clients..." : "Search clients by name or email..."}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              disabled={loading}
              className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] disabled:opacity-50"
            />
            {loading && (
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
                  {clients.length === 0 ? "No clients found" : "No matching clients"}
                </div>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelect(c)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors"
                  >
                    <User className="h-4 w-4 flex-shrink-0 text-gray-400" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900 truncate">{c.name}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {c.email}
                        {c.phone ? ` | ${c.phone}` : ""}
                      </div>
                    </div>
                  </button>
                ))
              )}

              {/* Add New Client link */}
              <a
                href="/clients/new"
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2.5 text-sm font-medium text-[#1e3a5f] hover:bg-blue-50 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add New Client
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
