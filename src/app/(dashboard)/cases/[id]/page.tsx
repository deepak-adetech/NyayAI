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
  Plus,
  Gavel,
  BookOpen,
  Users,
  Briefcase,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle2,
  FileCheck,
  Download,
} from "lucide-react";
import CaseDetailClient from "./CaseDetailClient";
import CaseAISummary from "./CaseAISummary";
import JudgeAssessment from "./JudgeAssessment";

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

  // Build all sections list
  const allSections = [
    ...(case_.bnsSections ?? []).map((s) => ({ code: `BNS ${s}`, color: "blue" })),
    ...(case_.ipcSections ?? []).map((s) => ({ code: `IPC ${s}`, color: "purple" })),
    ...(case_.otherSections ?? []).map((s) => ({ code: s, color: "gray" })),
  ];

  // Build a map from hearing date (YYYY-MM-DD) to ORDER documents for download links
  const orderDocsByDate = new Map<string, { id: string; fileName: string }>();
  for (const doc of case_.documents) {
    if (doc.type === "ORDER") {
      // Match by fileName pattern: order_YYYY-MM-DD.pdf
      const match = doc.fileName.match(/order_(\d{4}-\d{2}-\d{2})\.pdf/);
      if (match) {
        orderDocsByDate.set(match[1], { id: doc.id, fileName: doc.fileName });
      }
    }
  }

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
              {case_.cnrNumber && (
                <span className="flex items-center gap-1 font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                  CNR: {case_.cnrNumber}
                </span>
              )}
              {case_.courtName && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {case_.courtName}
                  {case_.courtDistrict && `, ${case_.courtDistrict}`}
                  {case_.courtState && `, ${case_.courtState}`}
                </span>
              )}
              {case_.nextHearingDate && (
                <span className="flex items-center gap-1 text-amber-600 font-medium">
                  <Calendar className="h-4 w-4" />
                  Next: {formatDate(case_.nextHearingDate)}
                </span>
              )}
            </div>
          </div>
        </div>

        {(isLawyer || isAdmin) && (
          <div className="flex gap-2">
            <CaseDetailClient
              caseId={case_.id}
              clients={case_.clients.map((cc) => ({
                id: cc.client.id,
                name: cc.client.name ?? "",
                email: cc.client.email,
                phone: cc.client.phone ?? undefined,
              }))}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Main details */}
        <div className="lg:col-span-2 space-y-4">

          {/* Parties & Advocates */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-500" />
              Parties &amp; Advocates
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Petitioners */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Petitioners / Complainants
                </p>
                {case_.petitionerNames.length > 0 ? (
                  <ul className="space-y-1">
                    {case_.petitionerNames.map((name, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-800">
                        <User className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                        {name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400">Not specified</p>
                )}
                {(case_.petitionerAdvocates ?? []).length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-400 mb-1.5">Advocates:</p>
                    {(case_.petitionerAdvocates ?? []).map((adv, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-sm text-blue-700 bg-blue-50 rounded px-2 py-1 mb-1">
                        <Briefcase className="h-3.5 w-3.5 flex-shrink-0" />
                        {adv}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Respondents */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Respondents / Accused
                </p>
                {case_.respondentNames.length > 0 ? (
                  <ul className="space-y-1">
                    {case_.respondentNames.map((name, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-800">
                        <User className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                        {name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400">Not specified</p>
                )}
                {(case_.respondentAdvocates ?? []).length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-400 mb-1.5">Advocates:</p>
                    {(case_.respondentAdvocates ?? []).map((adv, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-sm text-red-700 bg-red-50 rounded px-2 py-1 mb-1">
                        <Briefcase className="h-3.5 w-3.5 flex-shrink-0" />
                        {adv}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Acts & Charges */}
          {allSections.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-gray-500" />
                Acts &amp; Charges
              </h2>
              <div className="flex flex-wrap gap-2">
                {(case_.bnsSections ?? []).map((s) => (
                  <span
                    key={`bns-${s}`}
                    className="bg-blue-100 text-blue-800 text-xs px-3 py-1.5 rounded-full font-semibold"
                    title="Bharatiya Nyaya Sanhita 2023"
                  >
                    BNS {s}
                  </span>
                ))}
                {(case_.ipcSections ?? []).map((s) => (
                  <span
                    key={`ipc-${s}`}
                    className="bg-purple-100 text-purple-800 text-xs px-3 py-1.5 rounded-full font-semibold"
                    title="Indian Penal Code 1860"
                  >
                    IPC {s}
                  </span>
                ))}
                {(case_.otherSections ?? []).map((s, i) => (
                  <span
                    key={`other-${i}`}
                    className="bg-gray-100 text-gray-700 text-xs px-3 py-1.5 rounded-full font-semibold"
                  >
                    {s}
                  </span>
                ))}
              </div>
              {(case_.bnsSections ?? []).length > 0 && (
                <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  BNS 2023 applies to offences on/after 01-Jul-2024
                </p>
              )}
              {(case_.ipcSections ?? []).length > 0 && (
                <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  IPC 1860 applies to offences before 01-Jul-2024
                </p>
              )}
            </div>
          )}

          {/* AI Case Analysis */}
          <CaseAISummary
            caseId={case_.id}
            existingSummary={case_.aiSummary ?? null}
            riskAssessment={case_.aiRiskAssessment ?? null}
            causeOfAction={case_.aiCauseOfAction ?? null}
            supportingFacts={case_.aiSupportingFacts ?? null}
            paraByParaResponse={case_.aiParaByParaResponse ?? null}
            generatedAt={case_.aiSummaryGeneratedAt?.toISOString() ?? null}
          />

          {/* Notes */}
          {case_.notes && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-3">Internal Notes</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {case_.notes}
              </p>
            </div>
          )}

          {/* Case History — complete hearing records */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Gavel className="h-5 w-5 text-gray-500" />
                Case History &amp; Hearing Orders ({case_._count.hearings})
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
                {case_.hearings.map((h, idx) => (
                  <div key={h.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start gap-3">
                      {/* Timeline indicator */}
                      <div className="flex flex-col items-center pt-1">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          h.status === "COMPLETED" ? "bg-green-400" :
                          h.status === "ADJOURNED" ? "bg-amber-400" :
                          h.status === "SCHEDULED" ? "bg-blue-400" :
                          "bg-gray-300"
                        }`} />
                        {idx < case_.hearings.length - 1 && (
                          <div className="w-px bg-gray-200 flex-1 mt-1 min-h-[20px]" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">
                              {formatDate(h.hearingDate)}
                              {h.hearingTime && (
                                <span className="text-gray-500 font-normal ml-2">
                                  at {h.hearingTime}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                              {h.purpose && <span className="font-medium text-gray-600">{h.purpose}</span>}
                              {h.courtRoom && <span>Room: {h.courtRoom}</span>}
                              {h.judge && (
                                <span className="flex items-center gap-1">
                                  <Gavel className="h-3 w-3" />
                                  {h.judge}
                                </span>
                              )}
                            </p>
                          </div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${getStatusColor(h.status)}`}
                          >
                            {h.status}
                          </span>
                        </div>

                        {/* Order / outcome */}
                        {h.orderSummary && (
                          <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg p-2.5">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                                <FileCheck className="h-3 w-3" />
                                Court Order / Outcome
                              </p>
                              {(() => {
                                const dateKey = h.hearingDate.toISOString().slice(0, 10);
                                const orderDoc = orderDocsByDate.get(dateKey);
                                return orderDoc ? (
                                  <a
                                    href={`/api/documents/${orderDoc.id}/download`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                  >
                                    <Download className="h-3 w-3" />
                                    Download Order
                                  </a>
                                ) : null;
                              })()}
                            </div>
                            <p className="text-xs text-blue-800 whitespace-pre-wrap leading-relaxed">
                              {h.orderSummary}
                            </p>
                          </div>
                        )}

                        {h.aiNotes && (
                          <p className="text-xs text-gray-500 mt-1.5 italic">{h.aiNotes}</p>
                        )}
                      </div>
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
          {/* Judicial & Court Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Scale className="h-5 w-5 text-gray-500" />
              Court &amp; Judicial Info
            </h2>
            <dl className="space-y-3">
              {case_.cnrNumber && (
                <div>
                  <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">CNR Number</dt>
                  <dd className="text-sm text-gray-800 font-mono mt-0.5">{case_.cnrNumber}</dd>
                </div>
              )}
              {case_.caseNumber && (
                <div>
                  <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Case Number</dt>
                  <dd className="text-sm text-gray-800 mt-0.5">{case_.caseNumber}</dd>
                </div>
              )}
              {case_.courtName && (
                <div>
                  <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Court</dt>
                  <dd className="text-sm text-gray-800 mt-0.5">{case_.courtName}</dd>
                </div>
              )}
              {(case_.courtDistrict || case_.courtState) && (
                <div>
                  <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Location</dt>
                  <dd className="text-sm text-gray-800 mt-0.5">
                    {[case_.courtDistrict, case_.courtState].filter(Boolean).join(", ")}
                  </dd>
                </div>
              )}
              {case_.benchJudge && (
                <div>
                  <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Presiding Judge</dt>
                  <dd className="text-sm text-gray-800 mt-0.5 flex items-center gap-1.5">
                    <Gavel className="h-3.5 w-3.5 text-gray-400" />
                    {case_.benchJudge}
                  </dd>
                </div>
              )}
              {case_.firNumber && (
                <div>
                  <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">FIR Number</dt>
                  <dd className="text-sm text-gray-800 mt-0.5">{case_.firNumber}</dd>
                </div>
              )}
              {case_.policeStation && (
                <div>
                  <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Police Station</dt>
                  <dd className="text-sm text-gray-800 mt-0.5">{case_.policeStation}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* AI Judge Assessment */}
          {case_.benchJudge && (
            <JudgeAssessment caseId={case_.id} judgeName={case_.benchJudge} courtName={case_.courtName ?? ""} />
          )}

          {/* Key Dates */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-500" />
              Key Dates
            </h2>
            <dl className="space-y-3">
              {case_.filingDate && (
                <div>
                  <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Filing Date</dt>
                  <dd className="text-sm text-gray-800 mt-0.5">{formatDate(case_.filingDate)}</dd>
                </div>
              )}
              {case_.lastHearingDate && (
                <div>
                  <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Last Hearing</dt>
                  <dd className="text-sm text-gray-800 mt-0.5">{formatDate(case_.lastHearingDate)}</dd>
                </div>
              )}
              {case_.nextHearingDate && (
                <div>
                  <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Next Hearing</dt>
                  <dd className="text-sm font-semibold text-amber-600 mt-0.5">
                    {formatDate(case_.nextHearingDate)}
                  </dd>
                </div>
              )}
              {case_.disposalDate && (
                <div>
                  <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Disposal Date</dt>
                  <dd className="text-sm text-green-700 font-semibold mt-0.5">{formatDate(case_.disposalDate)}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Created In System</dt>
                <dd className="text-sm text-gray-800 mt-0.5">{formatDate(case_.createdAt)}</dd>
              </div>
            </dl>
          </div>

          {/* Clients */}
          {(isLawyer || isAdmin) && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <User className="h-5 w-5 text-gray-500" />
                Clients ({case_.clients.length})
              </h2>
              {case_.clients.length === 0 ? (
                <p className="text-sm text-gray-400 mb-3">No clients linked yet</p>
              ) : (
                <ul className="space-y-3 mb-3">
                  {case_.clients.map((cc) => (
                    <li key={cc.id} className="flex items-start gap-3">
                      <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">
                          {cc.client.name}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Mail className="h-3 w-3" />
                          {cc.client.email}
                        </p>
                        {cc.client.phone && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Phone className="h-3 w-3" />
                            {cc.client.phone}
                          </p>
                        )}
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
              Activity Timeline
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
