import { prisma } from "@/lib/prisma";
import { CreditCard, TrendingUp } from "lucide-react";

export default async function AdminSubscriptionsPage() {
  const [subscriptions, planStats] = await Promise.all([
    prisma.subscription.findMany({
      include: {
        user: { select: { name: true, email: true } },
        plan: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    prisma.subscription.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const statusColors: Record<string, string> = {
    TRIAL: "bg-blue-100 text-blue-700",
    ACTIVE: "bg-green-100 text-green-700",
    EXPIRED: "bg-red-100 text-red-700",
    CANCELLED: "bg-gray-100 text-gray-600",
    PAST_DUE: "bg-yellow-100 text-yellow-700",
  };

  const stats = Object.fromEntries(planStats.map(s => [s.status, s._count._all]));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-gray-400" />
          Subscriptions
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">Overview of all subscription statuses</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Object.entries(stats).map(([status, count]) => (
          <div key={status} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="text-2xl font-bold text-gray-900">{count}</div>
            <div className={`text-sm inline-flex px-2 py-0.5 rounded-full mt-1 ${statusColors[status] ?? "bg-gray-100 text-gray-600"}`}>
              {status}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Trial Ends / Period End</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {subscriptions.map((sub) => (
              <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-4">
                  <div className="font-medium text-gray-900 text-sm">{sub.user.name}</div>
                  <div className="text-gray-400 text-xs">{sub.user.email}</div>
                </td>
                <td className="px-5 py-4 text-sm text-gray-700">{sub.plan?.name ?? "N/A"}</td>
                <td className="px-5 py-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[sub.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {sub.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-xs text-gray-500">
                  {sub.trialEndsAt
                    ? new Date(sub.trialEndsAt).toLocaleDateString("en-IN")
                    : sub.currentPeriodEnd
                    ? new Date(sub.currentPeriodEnd).toLocaleDateString("en-IN")
                    : "N/A"}
                </td>
                <td className="px-5 py-4 text-xs text-gray-500">
                  {new Date(sub.updatedAt).toLocaleDateString("en-IN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
