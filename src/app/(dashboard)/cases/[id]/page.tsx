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
  User,
  Scale,
  MapPin,
  Tag,
  Edit,
  Plus,
} from "lucide-react";
import CaseDetailClient from "./CaseDetailClient";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role;
  const userId = session.user.id!;

  const { id } = await params;

  const case_ = await prisma.case.findUnique({
    where: { id },
    include: {
      documents: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      hearings: {
        orderBy: { hearingDate: "desc" },
        take: 20,
      },
      timeline: {
        orderBy: { eventDate: "desc" },
        take: 30,
      },
      clients: {
        include: {
          client: { select: { id: true, name: true, email: true, phone: true } },
        },
      },
      _count: { select: { documents: true, hearings: true } },
    },
  });

  if (!case_) notFound();

  // Access check
  const isLawyer = role === "LAWYER" && case_.lawyerId === userId;
  const isClient =
    role === "CLIENT" && case_.clients.some((c) => c.clientId === userId);
  const isAdmin = role === "ADMIN";

  if (!isLawyer && !isClient && !isAdmin) notFound();

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <Link
            href="/cases"
            className="p-2 hover:bg-gray-100 rounded-lg mt-1"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-800">{case_.title}</h1>
              <span
                className={`text-sm px-3 py-1 rounded-full font-medium ${getStatusColor(case_.status)}`}
              >
                {case_.status}
              </span>
              <span className="text-sm px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                {case_.caseType}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 flex-wrap">
              {case_.caseNumber && (
                <span className="flex items-center gap-1">
                  <Tag className="h-4 w-4" />
                  {case_.caseNumber}
                </span>
              )}
              {case_.courtName && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {case_.courtName}
                  {case_.courtDistrict && `, ${case_.courtDistrict}`}
                </span>
              )}
              {case_.nextHearingDate && (
                <span className="flex items-center gap-1 text-gray-600 font-medium">
                  <Calendar className="h-4 w-4" />
                  Next: {formatDate(case_.nextHearingDate)}
                </span>
              )}
            </div>
          </div>
        </div>

        {(isLawyer || isAdmin) && (
          <div className="flex gap-2">
            <CaseDetailClient caseId={case_.id} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Parties */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-gray-500" />
              Parties
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                  Petitioners / Complainants
                </p>
                {case_.petitionerNames.length > 0 ? (
                  <ul className="space-y-1">
                    {case_.petitionerNames.map((name, i) => (
                      <li key={i} className="text-sm text-gray-800">
                        {name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400">Not specified</p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                  Respondents / Accused
                </p>
                {case_.respondentNames.length > 0 ? (
                  <ul className="space-y-1">
                    {case_.respondentNames.map((name, i) => (
                      <li key={i} className="text-sm text-gray-800">
                        {name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400">Not specified</p>
                )}
              </div>
            </div>
          </div>

          {/* Legal Sections */}
          {(case_.bnsSections.length > 0 || case_.ipcSections.length > 0) && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Scale className="h-5 w-5 text-gray-500" />
                Legal Sections
              </h2>
              <div className="flex flex-wrap gap-2">
                {case_.bnsSections.map((s) => (
                  <span
                    key={s}
                    className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-medium"
                  >
                    BNS {s}
                  </span>
                ))}
                {case_.ipcSections.map((s) => (
                  <span
                    key={s}
                    className="bg-purple-100 text-purple-800 text-xs px-2.5 py-1 rounded-full font-medium"
                  >
                    IPC {s}
                  </span>
                ))}
                {case_.otherSections.map((s) => (
                  <span
                    key={s}
                    className="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI Summary */}
          {case_.aiSummary && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
              <h2 className="font-semibold text-purple-800 mb-2">AI Case Summary</h2>
              <p className="text-sm text-purple-700 whitespace-pre-wrap leading-relaxed">
                {case_.aiSummary}
              </p>
            </div>
          )}

          {/* Notes */}
          {case_.notes && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-3">Internal Notes</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {case_.notes}
              </p>
            </div>
          )}

          {/* Hearings */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-500" />
                Hearings ({case_._count.hearings})
              </h2>
              {(isLawyer || isAdmin) && (
                <Link
                  href={`/hearings/new?caseId=${case_.id}`}
                  className="flex items-center gap-1 text-sm text-[#1e3a5f] hover:underline"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Link>
              )}
            </div>
            {case_.hearings.length === 0 ? (
              <p className="p-5 text-center text-gray-400 text-sm">
                No hearings recorded
              </p>
            ) : (
              <div className="divide-y divide-gray-50">
                {case_.hearings.map((h) => (
                  <div key={h.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {formatDate(h.hearingDate)}
                          {h.hearingTime && (
                            <span className="text-gray-500 font-normal ml-2">
                              at {h.hearingTime}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {h.purpose ?? "Hearing"}
                          {h.courtRoom && ` • ${h.courtRoom}`}
                          {h.judge && ` • ${h.judge}`}
                        </p>
                        {h.orderSummary && (
                          <p className="text-xs text-blue-600 mt-1">
                            {h.orderSummary}
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(h.status)}`}
                      >
                        {h.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Documents */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-500" />
                Documents ({case_._count.documents})
              </h2>
              {(isLawyer || isAdmin) && (
                <Link
                  href={`/documents?caseId=${case_.id}`}
                  className="flex items-center gap-1 text-sm text-[#1e3a5f] hover:underline"
                >
                  <Plus className="h-4 w-4" />
                  Upload
                </Link>
              )}
            </div>
            {case_.documents.length === 0 ? (
              <p className="p-5 text-center text-gray-400 text-sm">
                No documents uploaded
              </p>
            ) : (
              <div className="divide-y divide-gray-50">
                {case_.documents.map((doc) => (
                  <div key={doc.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {doc.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {doc.fileName} •{" "}
                          {(doc.fileSize / 1024).toFixed(0)}KB
                        </p>
                        {doc.aiSummary && (
                          <p className="text-xs text-blue-600 mt-1 line-clamp-2">
                            {doc.aiSummary}
                          </p>
                        )}
                      </div>
                      <div className="ml-3 text-right flex-shrink-0">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(doc.type)}`}
                        >
                          {doc.type.replace(/_/g, " ")}
                        </span>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatDate(doc.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column - Meta + Timeline */}
        <div className="space-y-4">
          {/* Case Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-4">Case Details</h2>
            <dl className="space-y-3">
              {case_.cnrNumber && (
                <div>
                  <dt className="text-xs font-medium text-gray-500">CNR Number</dt>
                  <dd className="text-sm text-gray-800 font-mono">{case_.cnrNumber}</dd>
                </div>
              )}
              {case_.firNumber && (
                <div>
                  <dt className="text-xs font-medium text-gray-500">FIR Number</dt>
                  <dd className="text-sm text-gray-800">{case_.firNumber}</dd>
                </div>
              )}
              {case_.policeStation && (
                <div>
                  <dt className="text-xs font-medium text-gray-500">Police Station</dt>
                  <dd className="text-sm text-gray-800">{case_.policeStation}</dd>
                </div>
              )}
              {case_.benchJudge && (
                <div>
                  <dt className="text-xs font-medium text-gray-500">Judge</dt>
                  <dd className="text-sm text-gray-800">{case_.benchJudge}</dd>
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
              <div>
                <dt className="text-xs font-medium text-gray-500">Created</dt>
                <dd className="text-sm text-gray-800">{formatDate(case_.createdAt)}</dd>
              </div>
            </dl>
          </div>

          {/* Clients */}
          {(isLawyer || isAdmin) && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-3">
                Clients ({case_.clients.length})
              </h2>
              {case_.clients.length === 0 ? (
                <p className="text-sm text-gray-400">No clients linked</p>
              ) : (
                <ul className="space-y-2">
                  {case_.clients.map((cc) => (
                    <li key={cc.id} className="flex items-center gap-2">
                      <div className="h-7 w-7 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {cc.client.name}
                        </p>
                        <p className="text-xs text-gray-500">{cc.client.email}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Tags */}
          {case_.tags.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-3">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {case_.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-500" />
              Timeline
            </h2>
            {case_.timeline.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-2">
                No events recorded
              </p>
            ) : (
              <div className="space-y-3">
                {case_.timeline.map((event) => (
                  <div key={event.id} className="flex gap-3">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {event.title}
                      </p>
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
        </div>
      </div>
    </div>
  );
}
