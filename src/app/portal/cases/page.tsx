export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate, getStatusColor } from "@/lib/utils";
import { Briefcase, Calendar, FileText } from "lucide-react";

export default async function PortalCasesPage() {
  const session = await auth();
  if (!session?.user) redirect("/portal/login");

  const role = (session.user as any).role;
  if (role !== "CLIENT" && role !== "ADMIN") redirect("/dashboard");

  const clientId = session.user.id!;

  const clientCases = await prisma.caseClient.findMany({
    where: { clientId },
    include: {
      case: {
        include: {
          hearings: {
            where: { status: "SCHEDULED", hearingDate: { gte: new Date() } },
            orderBy: { hearingDate: "asc" },
            take: 1,
          },
          _count: { select: { documents: true, hearings: true } },
        },
      },
    },
    orderBy: { addedAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Cases</h1>
        <p className="text-gray-500 text-sm mt-1">
          Welcome, {session.user.name}. Here are your active cases.
        </p>
      </div>

      {clientCases.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No cases assigned to your account yet.</p>
          <p className="text-gray-400 text-sm mt-1">
            Your lawyer will link your cases here once they&apos;re set up.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {clientCases.map(({ case: c }) => (
            <Link
              key={c.id}
              href={`/portal/cases/${c.id}`}
              className="block bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-[#1e3a5f] transition-all"
            >
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold text-gray-800">{c.title}</h2>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(c.status)}`}
                    >
                      {c.status}
                    </span>
                    <span className="text-xs text-gray-500">{c.caseType}</span>
                  </div>
                  {c.caseNumber && (
                    <p className="text-sm text-gray-500 mt-1">
                      Case No: {c.caseNumber}
                    </p>
                  )}
                  {c.courtName && (
                    <p className="text-sm text-gray-500">Court: {c.courtName}</p>
                  )}
                </div>
                <div className="text-right">
                  {c.hearings.length > 0 && (
                    <div className="flex items-center gap-1 text-sm text-gray-600 font-medium mb-1">
                      <Calendar className="h-4 w-4" />
                      Next: {formatDate(c.hearings[0].hearingDate)}
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-400 justify-end">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      {c._count.documents} docs
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {c._count.hearings} hearings
                    </span>
                  </div>
                </div>
              </div>

              {c.aiSummary && (
                <p className="text-sm text-gray-600 mt-3 border-t border-gray-100 pt-3 line-clamp-2">
                  {c.aiSummary}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        <strong>Note:</strong> This portal shows a read-only view of your case
        information. To speak with your lawyer, contact them directly.
      </div>
    </div>
  );
}
