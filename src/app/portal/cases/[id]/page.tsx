export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { formatDate, getStatusColor } from "@/lib/utils";
import {
  ArrowLeft,
  Calendar,
  FileText,
  Clock,
  Scale,
  MapPin,
  AlertTriangle,
} from "lucide-react";

export default async function PortalCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/portal/login");

  const role = (session.user as any).role;
  if (role !== "CLIENT" && role !== "ADMIN") redirect("/dashboard");

  const clientId = session.user.id!;

  const { id } = await params;

  // Verify client has access to this case
  const access = await prisma.caseClient.findFirst({
    where: { caseId: id, clientId },
  });

  if (!access && role !== "ADMIN") notFound();

  const case_ = await prisma.case.findUnique({
    where: { id: id },
    include: {
      hearings: {
        orderBy: { hearingDate: "desc" },
        take: 20,
      },
      documents: {
        where: { type: { not: "CLIENT_DOCUMENT" } }, // Show non-sensitive docs
        orderBy: { createdAt: "desc" },
        take: 30,
      },
      timeline: {
        orderBy: { eventDate: "desc" },
        take: 20,
      },
    },
  });

  if (!case_) notFound();

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: clientId,
      action: "case_viewed_portal",
      resource: "case",
      resourceId: id,
    },
  });

  const upcomingHearing = case_.hearings.find(
    (h) => h.hearingDate >= new Date() && h.status === "SCHEDULED"
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <Link href="/portal/cases" className="p-2 hover:bg-gray-100 rounded-lg mt-1">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-800">{case_.title}</h1>
            <span className={`text-sm px-3 py-1 rounded-full font-medium ${getStatusColor(case_.status)}`}>
              {case_.status}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 flex-wrap">
            {case_.caseNumber && <span>{case_.caseNumber}</span>}
            {case_.courtName && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {case_.courtName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Next hearing alert */}
      {upcomingHearing && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-gray-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-gray-800">Next Hearing</p>
            <p className="text-sm text-gray-700">
              {formatDate(upcomingHearing.hearingDate)}
              {upcomingHearing.hearingTime && ` at ${upcomingHearing.hearingTime}`}
              {upcomingHearing.purpose && ` — ${upcomingHearing.purpose}`}
              {upcomingHearing.courtRoom && ` (${upcomingHearing.courtRoom})`}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          {/* AI Summary */}
          {case_.aiSummary && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <Scale className="h-5 w-5 text-purple-600" />
                Case Summary (AI Generated)
              </h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {case_.aiSummary}
              </p>
            </div>
          )}

          {/* Parties */}
          {(case_.petitionerNames.length > 0 || case_.respondentNames.length > 0) && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-4">Parties</h2>
              <div className="grid grid-cols-2 gap-4">
                {case_.petitionerNames.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                      Petitioner(s)
                    </p>
                    {case_.petitionerNames.map((n, i) => (
                      <p key={i} className="text-sm text-gray-800">{n}</p>
                    ))}
                  </div>
                )}
                {case_.respondentNames.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                      Respondent(s)
                    </p>
                    {case_.respondentNames.map((n, i) => (
                      <p key={i} className="text-sm text-gray-800">{n}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Hearings */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-500" />
                Hearing History ({case_.hearings.length})
              </h2>
            </div>
            {case_.hearings.length === 0 ? (
              <p className="p-4 text-gray-400 text-sm text-center">No hearings recorded</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {case_.hearings.map((h) => (
                  <div key={h.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {formatDate(h.hearingDate)}
                          {h.hearingTime && <span className="text-gray-500 font-normal ml-2">at {h.hearingTime}</span>}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {h.purpose ?? "Hearing"}
                          {h.courtRoom && ` · ${h.courtRoom}`}
                        </p>
                        {h.orderSummary && (
                          <p className="text-xs text-blue-700 mt-1 bg-blue-50 rounded px-2 py-1">
                            {h.orderSummary}
                          </p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(h.status)}`}>
                        {h.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Case Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-3">Case Details</h2>
            <dl className="space-y-3">
              {case_.caseType && (
                <div>
                  <dt className="text-xs font-medium text-gray-500">Type</dt>
                  <dd className="text-sm text-gray-800">{case_.caseType}</dd>
                </div>
              )}
              {case_.courtName && (
                <div>
                  <dt className="text-xs font-medium text-gray-500">Court</dt>
                  <dd className="text-sm text-gray-800">{case_.courtName}</dd>
                </div>
              )}
              {case_.courtDistrict && (
                <div>
                  <dt className="text-xs font-medium text-gray-500">District</dt>
                  <dd className="text-sm text-gray-800">{case_.courtDistrict}</dd>
                </div>
              )}
              {case_.filingDate && (
                <div>
                  <dt className="text-xs font-medium text-gray-500">Filing Date</dt>
                  <dd className="text-sm text-gray-800">{formatDate(case_.filingDate)}</dd>
                </div>
              )}
              {case_.nextHearingDate && (
                <div>
                  <dt className="text-xs font-medium text-gray-500">Next Hearing</dt>
                  <dd className="text-sm font-semibold text-gray-600">
                    {formatDate(case_.nextHearingDate)}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-500" />
              Timeline
            </h2>
            {case_.timeline.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-2">No events</p>
            ) : (
              <div className="space-y-3">
                {case_.timeline.map((event) => (
                  <div key={event.id} className="flex gap-3">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{event.title}</p>
                      {event.description && (
                        <p className="text-xs text-gray-500">{event.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDate(event.eventDate)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Documents count */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-500" />
              Documents
            </h2>
            <p className="text-3xl font-bold text-gray-800">{case_.documents.length}</p>
            <p className="text-sm text-gray-500 mt-1">files in this case</p>
            <p className="text-xs text-gray-400 mt-2">
              Ask your lawyer to share specific documents with you.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
