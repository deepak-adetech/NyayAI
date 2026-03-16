export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate, getStatusColor } from "@/lib/utils";
import { Calendar, Plus, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { startOfDay, addDays } from "date-fns";
import HearingActions from "./HearingActions";

export default async function HearingsPage({
  searchParams,
}: {
  searchParams: { status?: string; upcoming?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id!;
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = addDays(todayStart, 1);

  const where: any = { lawyerId: userId };
  if (searchParams.status) {
    where.status = searchParams.status;
  } else if (searchParams.upcoming === "false") {
    // all hearings
  } else {
    // default: upcoming and recent
    where.hearingDate = { gte: addDays(now, -30) };
  }

  const hearings = await prisma.hearing.findMany({
    where,
    include: {
      case: {
        select: { id: true, title: true, caseNumber: true, courtName: true, caseType: true },
      },
    },
    orderBy: { hearingDate: "asc" },
    take: 100,
  });

  const upcoming = hearings.filter(
    (h) => h.hearingDate >= now && h.status === "SCHEDULED"
  );
  const todayHearings = hearings.filter(
    (h) => h.hearingDate >= todayStart && h.hearingDate < tomorrowStart
  );
  const past = hearings.filter(
    (h) => h.hearingDate < now || h.status !== "SCHEDULED"
  );

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Hearings</h1>
          <p className="text-gray-500 text-sm">
            {upcoming.length} upcoming · {todayHearings.length} today
          </p>
        </div>
        <Link
          href="/hearings/new"
          className="flex items-center gap-2 bg-[#1e3a5f] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#162d4a] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Schedule Hearing
        </Link>
      </div>

      {/* Today's hearings */}
      {todayHearings.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <h2 className="font-semibold text-red-800 flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5" />
            Today&apos;s Hearings ({todayHearings.length})
          </h2>
          <div className="space-y-2">
            {todayHearings.map((h) => (
              <div
                key={h.id}
                className="bg-white rounded-lg p-3 flex items-center justify-between"
              >
                <div>
                  <Link
                    href={`/cases/${h.case.id}`}
                    className="text-sm font-medium text-gray-800 hover:text-[#1e3a5f]"
                  >
                    {h.case.title}
                  </Link>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {h.case.courtName ?? "Court"} ·{" "}
                    {h.hearingTime ?? "Time TBD"} ·{" "}
                    {h.purpose ?? "Hearing"}
                  </p>
                </div>
                <HearingActions hearingId={h.id} caseId={h.case.id} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 flex gap-3 flex-wrap">
        {[
          { label: "Upcoming", href: "/hearings" },
          { label: "All", href: "/hearings?upcoming=false" },
          { label: "Completed", href: "/hearings?status=COMPLETED" },
          { label: "Adjourned", href: "/hearings?status=ADJOURNED" },
        ].map((f) => (
          <Link
            key={f.label}
            href={f.href}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-gray-100 bg-blue-50">
            <Clock className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-blue-800">
              Upcoming ({upcoming.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {upcoming.map((h) => (
              <div key={h.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/cases/${h.case.id}`}
                      className="text-sm font-medium text-gray-800 hover:text-[#1e3a5f]"
                    >
                      {h.case.title}
                    </Link>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      {h.case.caseNumber && <span>{h.case.caseNumber}</span>}
                      {h.case.courtName && <span>{h.case.courtName}</span>}
                      {h.purpose && <span>{h.purpose}</span>}
                      {h.courtRoom && <span>Room: {h.courtRoom}</span>}
                      {h.judge && <span>Judge: {h.judge}</span>}
                    </div>
                  </div>
                  <div className="ml-4 text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-[#1e3a5f]">
                      {formatDate(h.hearingDate)}
                    </p>
                    {h.hearingTime && (
                      <p className="text-xs text-gray-500">{h.hearingTime}</p>
                    )}
                    <HearingActions hearingId={h.id} caseId={h.case.id} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-gray-100 bg-gray-50">
            <CheckCircle className="h-5 w-5 text-gray-500" />
            <h2 className="font-semibold text-gray-700">Past Hearings</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {past.map((h) => (
              <div key={h.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/cases/${h.case.id}`}
                      className="text-sm font-medium text-gray-700 hover:text-[#1e3a5f]"
                    >
                      {h.case.title}
                    </Link>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      {h.case.courtName && <span>{h.case.courtName}</span>}
                      {h.purpose && <span>{h.purpose}</span>}
                      {h.orderSummary && (
                        <span className="text-blue-600 truncate max-w-xs">
                          {h.orderSummary}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 text-right flex-shrink-0">
                    <p className="text-sm text-gray-600">
                      {formatDate(h.hearingDate)}
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${getStatusColor(h.status)}`}
                    >
                      {h.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hearings.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-sm">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No hearings found</p>
          <Link
            href="/hearings/new"
            className="inline-block mt-3 text-[#1e3a5f] font-medium hover:underline"
          >
            Schedule your first hearing
          </Link>
        </div>
      )}
    </div>
  );
}
