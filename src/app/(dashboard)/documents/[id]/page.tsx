export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Download, ExternalLink, CalendarDays } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id!;
  const role = (session.user as any).role as string;

  const { id } = await params;

  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      case: {
        select: {
          id: true,
          title: true,
          lawyerId: true,
          clients: { where: { clientId: userId } },
        },
      },
      uploadedBy: { select: { id: true, name: true } },
    },
  });

  if (!doc) notFound();

  // Access control
  const canAccess =
    role === "ADMIN" ||
    doc.uploadedById === userId ||
    (doc.case?.lawyerId === userId) ||
    (role === "CLIENT" && doc.case?.clients && doc.case.clients.length > 0);

  if (!canAccess) notFound();

  const typeColors: Record<string, string> = {
    FIR: "bg-red-100 text-red-700",
    JUDGMENT: "bg-purple-100 text-purple-700",
    ORDER: "bg-blue-100 text-blue-700",
    PETITION: "bg-indigo-100 text-indigo-700",
    BAIL_APPLICATION: "bg-gray-100 text-gray-700",
    CHARGESHEET: "bg-gray-100 text-gray-700",
    VAKALATNAMA: "bg-teal-100 text-teal-700",
    AFFIDAVIT: "bg-cyan-100 text-cyan-700",
    AGREEMENT: "bg-green-100 text-green-700",
    OTHER: "bg-gray-100 text-gray-700",
  };

  const typeColor = typeColors[doc.type] ?? "bg-gray-100 text-gray-700";

  // Safely extract from JSON extractedEntities field
  const entities = (doc.extractedEntities as any) ?? {};
  const partiesFromEntities: string[] = Array.isArray(entities?.parties) ? entities.parties : [];
  const sectionsFromDoc: string[] = Array.isArray(doc.extractedSections) ? doc.extractedSections : [];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={doc.case ? `/cases/${doc.case.id}` : "/documents"}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-800 truncate">{doc.title}</h1>
          <p className="text-gray-500 text-sm truncate">{doc.fileName}</p>
        </div>
        <a
          href={`/api/documents/${doc.id}/download`}
          className="flex items-center gap-2 bg-[#1e3a5f] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#162d4a] transition-colors"
        >
          <Download className="h-4 w-4" />
          Download
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* AI Summary */}
          {doc.aiSummary && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-5">
              <h2 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <span className="text-lg">🤖</span> AI Summary
              </h2>
              <p className="text-sm text-blue-900 leading-relaxed">{doc.aiSummary}</p>
            </div>
          )}

          {/* Extracted Text (OCR) */}
          {doc.ocrText && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" />
                Extracted Text
                <span className="ml-auto text-xs text-gray-400 font-normal">
                  {doc.ocrText.length.toLocaleString()} chars
                </span>
              </h2>
              <div className="bg-gray-50 rounded-lg p-4 max-h-80 overflow-y-auto">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                  {doc.ocrText.slice(0, 3000)}
                  {doc.ocrText.length > 3000 && (
                    <span className="text-gray-400 italic">
                      {"\n"}... [{(doc.ocrText.length - 3000).toLocaleString()} more characters]
                    </span>
                  )}
                </pre>
              </div>
            </div>
          )}

          {/* AI-Extracted parties and sections */}
          {(partiesFromEntities.length > 0 || sectionsFromDoc.length > 0) && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-3">AI-Extracted Info</h2>
              <div className="grid grid-cols-2 gap-4">
                {partiesFromEntities.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">Parties</p>
                    <div className="flex flex-wrap gap-1">
                      {partiesFromEntities.map((p) => (
                        <span
                          key={p}
                          className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {sectionsFromDoc.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">Sections</p>
                    <div className="flex flex-wrap gap-1">
                      {sectionsFromDoc.map((s) => (
                        <span
                          key={s}
                          className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Document metadata */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-4">Details</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Type</dt>
                <dd className="mt-1">
                  <span className={`text-xs px-2 py-1 rounded-full ${typeColor}`}>
                    {doc.type.replace(/_/g, " ")}
                  </span>
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">OCR Status</dt>
                <dd className="mt-1 text-sm text-gray-700">
                  {doc.ocrStatus === "completed" ? (
                    <span className="text-green-600">✓ Text Extracted</span>
                  ) : doc.ocrStatus === "processing" ? (
                    <span className="text-gray-600">⏳ Processing</span>
                  ) : doc.ocrStatus === "failed" ? (
                    <span className="text-red-600">✗ Failed</span>
                  ) : (
                    <span className="text-gray-400">Pending</span>
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">File Size</dt>
                <dd className="mt-1 text-sm text-gray-700">
                  {doc.fileSize > 1024 * 1024
                    ? `${(doc.fileSize / (1024 * 1024)).toFixed(1)} MB`
                    : `${(doc.fileSize / 1024).toFixed(0)} KB`}
                </dd>
              </div>

              {doc.ocrLanguage && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Language</dt>
                  <dd className="mt-1 text-sm text-gray-700 capitalize">{doc.ocrLanguage}</dd>
                </div>
              )}

              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" /> Uploaded
                </dt>
                <dd className="mt-1 text-sm text-gray-700">{formatDate(doc.createdAt)}</dd>
              </div>

              {doc.uploadedBy && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Uploaded By</dt>
                  <dd className="mt-1 text-sm text-gray-700">{doc.uploadedBy.name}</dd>
                </div>
              )}

              {doc.checksum && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Checksum</dt>
                  <dd className="mt-1 text-xs text-gray-400 font-mono break-all">
                    {doc.checksum.slice(0, 16)}...
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Linked case */}
          {doc.case && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-3">Linked Case</h2>
              <Link
                href={`/cases/${doc.case.id}`}
                className="flex items-center gap-2 text-[#1e3a5f] hover:underline text-sm"
              >
                <ExternalLink className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{doc.case.title}</span>
              </Link>
            </div>
          )}

          {/* Sync source info */}
          {doc.localFilePath && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-3">Sync Source</h2>
              <p className="text-xs text-gray-500 font-mono break-all">{doc.localFilePath}</p>
              {doc.syncedAt && (
                <p className="text-xs text-gray-400 mt-1">
                  Synced {formatDate(doc.syncedAt)}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-3">Actions</h2>
            <div className="space-y-2">
              <a
                href={`/api/documents/${doc.id}/download`}
                className="flex items-center gap-2 w-full bg-[#1e3a5f] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#162d4a] transition-colors"
              >
                <Download className="h-4 w-4" />
                Download File
              </a>
              {doc.case && (
                <Link
                  href={`/documents?caseId=${doc.case.id}`}
                  className="flex items-center gap-2 w-full border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  All Case Documents
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
