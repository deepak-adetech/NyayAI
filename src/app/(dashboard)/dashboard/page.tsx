export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate, getStatusColor } from "@/lib/utils";
import {
  Briefcase,
  Calendar,
  FileText,
  AlertTriangle,
  TrendingUp,
  Clock,
  FolderSync,
} from "lucide-react";
import { addDays, startOfDay } from "date-fns";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id!;
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = addDays(todayStart, 1);
  const nextWeek = addDays(now, 7);

  // Fetch all dashboard data in parallel
  const [
    activeCasesCount,
    upcomingHearings,
    recentDocuments,
    unassignedDocCount,
    subscriptionStatus,
  ] = await Promise.all([
    prisma.case.count({ where: { lawyerId: userId, status: "ACTIVE" } }),

    prisma.hearing.findMany({
      where: {
        lawyerId: userId,
        status: "SCHEDULED",
        hearingDate: { gte: now, lte: nextWeek },
      },
      include: {
        case: { select: { id: true, title: true, courtName: true } },
      },
      orderBy: { hearingDate: "asc" },
      take: 10,
    }),

    prisma.document.findMany({
      where: { uploadedById: userId },
      include: { case: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),

    prisma.document.count({
      where: {
        uploadedById: userId,
        case: { tags: { has: "_sync_inbox" } },
      },
    }),

    prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    }),
  ]);

  const todayHearings = upcomingHearings.filter(
    (h) => h.hearingDate >= todayStart && h.hearingDate < tomorrowStart
  );

  const statsCards = [
    {
      label: "Active Cases",
      value: activeCasesCount,
      icon: Briefcase,
      color: "text-blue-600",
      bg: "bg-blue-50",
      href: "/cases",
    },
    {
      label: "Today's Hearings",
      value: todayHearings.length,
      icon: Calendar,
      color: "text-green-600",
      bg: "bg-green-50",
      href: "/hearings",
    },
    {
      label: "This Week",
      value: upcomingHearings.length,
      icon: Clock,
      color: "text-purple-600",
      bg: "bg-purple-50",
      href: "/hearings",
    },
    {
      label: "Unassigned Docs",
      value: unassignedDocCount,
      icon: AlertTriangle,
      color: "text-gray-600",
      bg: "bg-gray-100",
      href: "/documents?filter=unassigned",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statsCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`${card.bg} p-2 rounded-lg`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-800">{card.value}</div>
            <div className="text-sm text-gray-500 mt-1">{card.label}</div>
          </Link>
        ))}
      </div>

      {/* Trial warning */}
      {subscriptionStatus?.status === "TRIAL" && subscriptionStatus.trialEndsAt && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-gray-500 flex-shrink-0" />
          <p className="text-gray-700 text-sm">
            Your free trial ends on <strong>{formatDate(subscriptionStatus.trialEndsAt)}</strong>.{" "}
            <Link href="/billing" className="underline font-medium">
              Upgrade now
            </Link>{" "}
            to continue using NyayaSahayak.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Hearings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Upcoming Hearings (7 days)
            </h2>
            <Link href="/hearings" className="text-sm text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {upcomingHearings.length === 0 ? (
              <div className="p-5 text-center text-gray-400 text-sm">
                No hearings scheduled this week
              </div>
            ) : (
              upcomingHearings.map((hearing) => {
                const isToday =
                  hearing.hearingDate >= todayStart && hearing.hearingDate < tomorrowStart;
                return (
                  <div key={hearing.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {hearing.case.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {hearing.case.courtName ?? "Court"} •{" "}
                          {hearing.purpose ?? "Hearing"}
                        </p>
                      </div>
                      <div className="text-right ml-3">
                        <div
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            isToday
                              ? "bg-red-100 text-red-700"
                              : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {isToday ? "TODAY" : formatDate(hearing.hearingDate)}
                        </div>
                        {hearing.hearingTime && (
                          <p className="text-xs text-gray-400 mt-0.5">{hearing.hearingTime}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Documents */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              Recent Documents
            </h2>
            <Link href="/documents" className="text-sm text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentDocuments.length === 0 ? (
              <div className="p-5 text-center text-gray-400 text-sm">
                No documents yet
              </div>
            ) : (
              recentDocuments.map((doc) => (
                <div key={doc.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{doc.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {doc.case?.title ?? "Unassigned"}
                      </p>
                    </div>
                    <div className="ml-3 text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(doc.type)}`}>
                        {doc.type.replace("_", " ")}
                      </span>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(doc.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/cases/new"
            className="flex items-center gap-2 bg-[#1e3a5f] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#162d4a] transition-colors"
          >
            <Briefcase className="h-4 w-4" />
            Add New Case
          </Link>
          <Link
            href="/ai"
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            <TrendingUp className="h-4 w-4" />
            Identify BNS Sections
          </Link>
          <Link
            href="/sync"
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            <FolderSync className="h-4 w-4" />
            Setup File Sync
          </Link>
        </div>
      </div>
    </div>
  );
}
