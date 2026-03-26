export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate, getStatusColor } from "@/lib/utils";
import { Plus, Search, Briefcase } from "lucide-react";
import { CnrLookup } from "@/components/ecourts/CnrLookup";

export default async function CasesPage({
  searchParams,
}: {
  searchParams: { status?: string; type?: string; search?: string; page?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const limit = 20;
  const skip = (page - 1) * limit;

  const where: any = {
    lawyerId: session.user.id!,
  };

  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.type) where.caseType = searchParams.type;
  if (searchParams.search) {
    where.OR = [
      { title: { contains: searchParams.search, mode: "insensitive" } },
      { caseNumber: { contains: searchParams.search, mode: "insensitive" } },
      { firNumber: { contains: searchParams.search, mode: "insensitive" } },
    ];
  }

  const [cases, total] = await Promise.all([
    prisma.case.findMany({
      where,
      include: {
        _count: { select: { documents: true, hearings: true } },
        clients: {
          include: { client: { select: { name: true } } },
          take: 2,
        },
      },
      orderBy: [{ priority: "desc" }, { nextHearingDate: "asc" }, { updatedAt: "desc" }],
      skip,
      take: limit,
    }),
    prisma.case.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Cases</h1>
          <p className="text-gray-500 text-sm">{total} cases</p>
        </div>
        <Link
          href="/cases/new"
          className="flex items-center gap-2 bg-[#1e3a5f] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#162d4a] transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Case
        </Link>
      </div>

      {/* eCourts CNR Lookup */}
      <CnrLookup />

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <form className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-48 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              name="search"
              defaultValue={searchParams.search}
              placeholder="Search cases, FIR number..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none"
            />
          </div>
          <select
            name="status"
            defaultValue={searchParams.status}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Status</option>
            {["ACTIVE", "DISPOSED", "ARCHIVED", "TRANSFERRED", "STAYED"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            name="type"
            defaultValue={searchParams.type}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Types</option>
            {["CRIMINAL", "CIVIL", "FAMILY", "CONSUMER", "LABOUR", "TAX", "WRIT", "ARBITRATION"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button type="submit" className="bg-[#1e3a5f] text-white px-4 py-2 rounded-lg text-sm font-medium">
            Filter
          </button>
        </form>
      </div>

      {/* Cases table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {cases.length === 0 ? (
          <div className="p-12 text-center">
            <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No cases found</p>
            <Link
              href="/cases/new"
              className="inline-block mt-3 text-[#1e3a5f] font-medium hover:underline"
            >
              Add your first case
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 uppercase">Case</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 uppercase">Client</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 uppercase">Type</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 uppercase">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 uppercase">Next Hearing</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 uppercase">Docs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cases.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/cases/${c.id}`} className="block">
                      <p className="text-sm font-medium text-gray-800 hover:text-[#1e3a5f]">
                        {c.priority === 2 && <span className="text-red-500 mr-1">🔴</span>}
                        {c.priority === 1 && <span className="text-yellow-500 mr-1">🟡</span>}
                        {c.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {c.caseNumber && `${c.caseNumber} • `}
                        {c.courtName ?? c.courtDistrict ?? ""}
                      </p>
                      {(c.bnsSections?.length > 0 || c.ipcSections?.length > 0) && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {c.bnsSections?.map((s: string) => (
                            <span key={`bns-${s}`} className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.5 rounded font-medium">
                              BNS {s}
                            </span>
                          ))}
                          {c.ipcSections?.map((s: string) => (
                            <span key={`ipc-${s}`} className="bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0.5 rounded font-medium">
                              IPC {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">
                      {c.clients?.length > 0
                        ? c.clients.map((cc: any) => cc.client.name).join(", ")
                        : <span className="text-gray-400">—</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-600">{c.caseType}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(c.status)}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">
                      {c.nextHearingDate ? formatDate(c.nextHearingDate) : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500">{c._count.documents}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/cases?page=${p}${searchParams.status ? `&status=${searchParams.status}` : ""}`}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm ${
                p === page ? "bg-[#1e3a5f] text-white" : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
