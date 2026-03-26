export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { formatDate, getStatusColor } from "@/lib/utils";
import { User, Mail, Phone, Building2, Edit, Briefcase, ArrowLeft } from "lucide-react";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const client = await prisma.user.findUnique({
    where: { id },
    include: {
      clientProfile: true,
      clientCases: {
        include: {
          case: {
            select: {
              id: true,
              title: true,
              caseNumber: true,
              status: true,
              caseType: true,
            },
          },
        },
      },
    },
  });

  if (!client || client.role !== "CLIENT") notFound();

  // Verify access: the client must be linked to at least one of this lawyer's cases
  const hasAccess = client.clientCases.some(
    (cc) => cc.case !== null
  );

  // Double-check by querying lawyer's cases
  const lawyerCaseIds = await prisma.case.findMany({
    where: { lawyerId: session.user.id! },
    select: { id: true },
  });
  const lawyerCaseIdSet = new Set(lawyerCaseIds.map((c) => c.id));
  const linkedCases = client.clientCases.filter((cc) =>
    lawyerCaseIdSet.has(cc.caseId)
  );

  if (linkedCases.length === 0) notFound();

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/clients" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">{client.name}</h1>
          <p className="text-gray-500 text-sm">Client details</p>
        </div>
        <Link
          href={`/clients/${client.id}/edit`}
          className="flex items-center gap-2 bg-[#1e3a5f] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#162d4a] transition-colors"
        >
          <Edit className="h-4 w-4" />
          Edit Client
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Client info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Contact info card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-[#1e3a5f]" />
              Contact Information
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                <a href={`mailto:${client.email}`} className="text-[#1e3a5f] hover:underline">
                  {client.email}
                </a>
              </div>
              {client.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-700">{client.phone}</span>
                </div>
              )}
              {client.address && (
                <div className="text-sm text-gray-600 mt-2">
                  <p className="font-medium text-gray-700 mb-1">Address</p>
                  <p className="whitespace-pre-line">{client.address}</p>
                </div>
              )}
            </div>
          </div>

          {/* Organization card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#1e3a5f]" />
              Organization Details
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500">Organization</p>
                <p className="text-gray-800 font-medium">
                  {client.clientProfile?.organization || "--"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">GST Number</p>
                <p className="text-gray-800 font-medium">
                  {client.clientProfile?.gstNumber || "--"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">PAN Number</p>
                <p className="text-gray-800 font-medium">
                  {client.clientProfile?.panNumber || "--"}
                </p>
              </div>
            </div>
          </div>

          {/* Notes card */}
          {client.clientProfile?.notes && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-3">Notes</h2>
              <p className="text-sm text-gray-600 whitespace-pre-line">
                {client.clientProfile.notes}
              </p>
            </div>
          )}

          {/* Meta */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="text-xs text-gray-500 space-y-1">
              <p>Created: {formatDate(client.createdAt)}</p>
              <p>Last updated: {formatDate(client.updatedAt)}</p>
            </div>
          </div>
        </div>

        {/* Right column: Linked cases */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-[#1e3a5f]" />
              <h2 className="font-semibold text-gray-800">
                Linked Cases ({linkedCases.length})
              </h2>
            </div>
            {linkedCases.length === 0 ? (
              <div className="p-12 text-center">
                <Briefcase className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No linked cases</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 uppercase">
                      Case
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 uppercase">
                      Type
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {linkedCases.map((cc) => (
                    <tr key={cc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/cases/${cc.case.id}`} className="block">
                          <p className="text-sm font-medium text-gray-800 hover:text-[#1e3a5f]">
                            {cc.case.title}
                          </p>
                          {cc.case.caseNumber && (
                            <p className="text-xs text-gray-500">{cc.case.caseNumber}</p>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-600">{cc.case.caseType}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(
                            cc.case.status
                          )}`}
                        >
                          {cc.case.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
