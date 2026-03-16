"use client";
import { useState, useEffect, useCallback } from "react";
import { Search, Users, UserCheck, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  barCouncilNumber?: string;
  firmName?: string;
  subscription?: {
    status: string;
    trialEndsAt?: string;
    plan?: { name: string; priceMonthlyPaise: number };
  };
  _count: { cases: number };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), search, status });
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function handleAction(userId: string, action: string) {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action }),
    });
    fetchUsers();
  }

  const statusColors: Record<string, string> = {
    TRIAL: "bg-blue-100 text-blue-700",
    ACTIVE: "bg-green-100 text-green-700",
    EXPIRED: "bg-red-100 text-red-700",
    CANCELLED: "bg-gray-100 text-gray-600",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-gray-400" />
            Users
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} total registered users</p>
        </div>
        <button onClick={fetchUsers} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#1e3a5f]"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(0); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1e3a5f]"
        >
          <option value="">All Status</option>
          <option value="trial">Trial</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Subscription</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cases</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Joined</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400 text-sm">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400 text-sm">No users found</td></tr>
            ) : users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#1e3a5f] rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {user.name[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm flex items-center gap-1.5">
                        {user.name}
                        {user.role === "ADMIN" && (
                          <span className="bg-purple-100 text-purple-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">Admin</span>
                        )}
                      </div>
                      <div className="text-gray-400 text-xs">{user.email}</div>
                      {user.firmName && <div className="text-gray-400 text-xs">{user.firmName}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[user.subscription?.status ?? ""] ?? "bg-gray-100 text-gray-600"}`}>
                    {user.subscription?.status ?? "No plan"}
                  </span>
                  {user.subscription?.plan && (
                    <div className="text-gray-400 text-xs mt-0.5">{user.subscription.plan.name}</div>
                  )}
                </td>
                <td className="px-5 py-4 text-sm text-gray-700">{user._count.cases}</td>
                <td className="px-5 py-4 text-xs text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString("en-IN")}
                </td>
                <td className="px-5 py-4">
                  <div className="flex gap-2">
                    {user.subscription?.status === "TRIAL" && (
                      <button
                        onClick={() => handleAction(user.id, "extend-trial")}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Extend Trial
                      </button>
                    )}
                    {user.role !== "ADMIN" && (
                      <button
                        onClick={() => handleAction(user.id, "make-admin")}
                        className="text-xs text-purple-600 hover:underline"
                      >
                        Make Admin
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="px-5 py-4 border-t border-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {page * 25 + 1}–{Math.min((page + 1) * 25, total)} of {total}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={(page + 1) * 25 >= total}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
