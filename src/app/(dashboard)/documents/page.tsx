export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatDate, getStatusColor } from "@/lib/utils";
import { FileText, Upload } from "lucide-react";
import DocumentUploadForm from "./DocumentUploadForm";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: { caseId?: string; type?: string; page?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id!;
  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const limit = 25;
  const skip = (page - 1) * limit;

  const where: any = { uploadedById: userId };
  if (searchParams.caseId) where.caseId = searchParams.caseId;
  if (searchParams.type) where.type = searchParams.type;

  // Get cases for upload form
  const cases = await prisma.case.findMany({
    where: { lawyerId: userId, status: "ACTIVE" },
    select: { id: true, title: true, caseNumber: true },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      include: { case: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.document.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  // Pre-select case if caseId given
  const selectedCase = searchParams.caseId
    ? cases.find((c) => c.id === searchParams.caseId)
    : null;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Documents</h1>
          <p className="text-gray-500 text-sm">{total} documents</p>
        </div>
      </div>

      {/* Upload form */}
      <DocumentUploadForm
        cases={cases}
        defaultCaseId={searchParams.caseId ?? ""}
      />

      {/* Doc type filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-3 mb-4 flex gap-2 flex-wrap">
        {[
          "ALL",
          "FIR",
          "JUDGMENT",
          "ORDER",
          "PETITION",
          "BAIL_APPLICATION",
          "CHARGESHEET",
          "OTHER",
        ].map((t) => (
          <a
            key={t}
            href={`/documents${t === "ALL" ? "" : `?type=${t}`}${searchParams.caseId ? `${t === "ALL" ? "?" : "&"}caseId=${searchParams.caseId}` : ""}`}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              (searchParams.type ?? "ALL") === t
                ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {t.replace(/_/g, " ")}
          </a>
        ))}
      </div>

      {/* Documents grid */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {documents.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No documents found</p>
            <p className="text-gray-400 text-sm mt-1">
              Upload documents using the form above
            </p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 uppercase">
                    Document
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 uppercase">
                    Type
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 uppercase hidden md:table-cell">
                    Case
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 uppercase hidden md:table-cell">
                    Size
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 uppercase">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate max-w-xs">
                            {doc.title}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{doc.fileName}</p>
                          {doc.aiSummary && (
                            <p className="text-xs text-blue-600 mt-0.5 line-clamp-1">
                              {doc.aiSummary}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(doc.type)}`}
                      >
                        {doc.type.replace(/_/g, " ")}
                      </span>
                      {doc.ocrStatus === "completed" && (
                        <span className="block text-xs text-green-600 mt-0.5">
                          ✓ Text extracted
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {doc.case ? (
                        <a
                          href={`/cases/${doc.case.id}`}
                          className="text-sm text-[#1e3a5f] hover:underline truncate max-w-[150px] block"
                        >
                          {doc.case.title}
                        </a>
                      ) : (
                        <span className="text-xs text-gray-600 bg-gray-50 px-2 py-0.5 rounded-full">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-gray-500">
                        {(doc.fileSize / 1024).toFixed(0)} KB
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500">
                        {formatDate(doc.createdAt)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 p-4 border-t border-gray-100">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <a
                    key={p}
                    href={`/documents?page=${p}${searchParams.type ? `&type=${searchParams.type}` : ""}${searchParams.caseId ? `&caseId=${searchParams.caseId}` : ""}`}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm ${
                      p === page
                        ? "bg-[#1e3a5f] text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                    }`}
                  >
                    {p}
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
