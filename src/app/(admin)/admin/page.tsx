import { prisma } from "@/lib/prisma";
import { Users, Briefcase, CreditCard, TrendingUp, Activity } from "lucide-react";

async function getAdminStats() {
  const [
    totalUsers,
    trialUsers,
    activeSubscriptions,
    totalCases,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.subscription.count({ where: { status: "TRIAL" } }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.case.count(),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        subscription: { include: { plan: true } },
        _count: { select: { cases: true } },
      },
    }),
  ]);

  // Estimate total revenue from active subscriptions
  const activeSubs = await prisma.subscription.findMany({
    where: { status: "ACTIVE" },
    include: { plan: true },
  });
  const monthlyRevenuePaise = activeSubs.reduce(
    (sum, sub) => sum + (sub.plan?.priceMonthlyPaise ?? 0),
    0
  );

  return {
    totalUsers,
    trialUsers,
    activeSubscriptions,
    totalCases,
    monthlyRevenue: monthlyRevenuePaise / 100,
    recentUsers,
  };
}

export default async function AdminDashboard() {
  const stats = await getAdminStats();

  const statCards = [
    {
      label: "Total Users",
      value: stats.totalUsers.toLocaleString("en-IN"),
      icon: Users,
      color: "bg-blue-50 text-blue-600",
      sub: `${stats.trialUsers} on trial`,
    },
    {
      label: "Active Subscriptions",
      value: stats.activeSubscriptions.toLocaleString("en-IN"),
      icon: CreditCard,
      color: "bg-green-50 text-green-600",
      sub: "Paid plans",
    },
    {
      label: "Total Cases",
      value: stats.totalCases.toLocaleString("en-IN"),
      icon: Briefcase,
      color: "bg-purple-50 text-purple-600",
      sub: "Across all users",
    },
    {
      label: "Est. Monthly Revenue",
      value: `Rs ${stats.monthlyRevenue.toLocaleString("en-IN")}`,
      icon: TrendingUp,
      color: "bg-orange-50 text-orange-600",
      sub: "From active subscriptions",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of NyayAI platform metrics.</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center`}>
                <card.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-0.5">{card.value}</div>
            <div className="text-gray-500 text-sm">{card.label}</div>
            <div className="text-gray-400 text-xs mt-1">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Recent registrations */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-6 border-b border-gray-50">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="h-4 w-4 text-gray-400" />
            Recent Registrations
          </h2>
        </div>
        <div className="divide-y divide-gray-50">
          {stats.recentUsers.map((user) => (
            <div key={user.id} className="px-6 py-4 flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900 text-sm">{user.name}</div>
                <div className="text-gray-400 text-xs">{user.email}</div>
              </div>
              <div className="text-right">
                <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  user.subscription?.status === "ACTIVE"
                    ? "bg-green-100 text-green-700"
                    : user.subscription?.status === "TRIAL"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600"
                }`}>
                  {user.subscription?.status ?? "No subscription"}
                </div>
                <div className="text-gray-400 text-xs mt-1">{user._count.cases} cases</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
