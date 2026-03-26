export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Users, Plus, Mail, Phone, Building2, Briefcase } from "lucide-react";

export default async function ClientsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const clients = await prisma.user.findMany({
    where: {
      role: "CLIENT",
      clientCases: {
        some: {
          case: {
            lawyerId: session.user.id!,
          },
        },
      },
    },
    include: {
      clientProfile: true,
      _count: {
        select: { clientCases: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-[#1e3a5f]" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Clients</h1>
            <p className="text-gray-500 text-sm">{clients.length} clients</p>
          </div>
        </div>
        <Link
          href="/clients/new"
          className="flex items-center gap-2 bg-[#1e3a5f] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#162d4a] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Client
        </Link>
      </div>

      {/* Search bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="relative">
          <input
            placeholder="Search clients by name, email..."
            className="w-full pl-3 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a5f] outline-none"
            disabled
          />
          <p className="text-xs text-gray-400 mt-1">Search functionality coming soon</p>
        </div>
      </div>

      {/* Clients table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {clients.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No clients found</p>
            <Link
              href="/clients/new"
              className="inline-block mt-3 text-[#1e3a5f] font-medium hover:underline"
            >
              Add your first client
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 uppercase">Name</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 uppercase">Contact</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 uppercase">Organization</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 uppercase">Cases</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 uppercase">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/clients/${client.id}`} className="block">
                      <p className="text-sm font-medium text-gray-800 hover:text-[#1e3a5f]">
                        {client.name}
                      </p>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-gray-600 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {client.email}
                      </span>
                      {client.phone && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {client.phone}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {client.clientProfile?.organization ? (
                      <span className="text-xs text-gray-600 flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {client.clientProfile.organization}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <Briefcase className="h-3 w-3" />
                      {client._count.clientCases}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500">{formatDate(client.createdAt)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
