import { prisma } from "@/lib/prisma";
import { CreditCard, TrendingUp, IndianRupee } from "lucide-react";

export default async function AdminPaymentsPage() {
  const payments = await prisma.payment.findMany({
    include: {
      subscription: {
        include: {
          user: { select: { name: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const totalRevenuePaise = payments
    .filter(p => p.status === "paid" || p.status === "captured" || p.status === "success")
    .reduce((sum, p) => sum + p.amountPaise, 0);

  const totalRevenue = totalRevenuePaise / 100;

  const statusColors: Record<string, string> = {
    paid: "bg-green-100 text-green-700",
    captured: "bg-green-100 text-green-700",
    success: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
    pending: "bg-yellow-100 text-yellow-700",
    refunded: "bg-gray-100 text-gray-600",
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <IndianRupee className="h-6 w-6 text-gray-400" />
          Payments
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">All payment transactions</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="text-2xl font-bold text-gray-900">Rs {totalRevenue.toLocaleString("en-IN")}</div>
          <div className="text-gray-500 text-sm">Total Revenue Collected</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="text-2xl font-bold text-gray-900">{payments.length}</div>
          <div className="text-gray-500 text-sm">Total Transactions</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="text-2xl font-bold text-gray-900">
            {payments.filter(p => ["paid","captured","success"].includes(p.status)).length}
          </div>
          <div className="text-gray-500 text-sm">Successful Payments</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Method</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {payments.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400 text-sm">No payments recorded yet</td></tr>
            ) : payments.map((payment) => (
              <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-4">
                  <div className="font-medium text-gray-900 text-sm">{payment.subscription.user.name}</div>
                  <div className="text-gray-400 text-xs">{payment.subscription.user.email}</div>
                </td>
                <td className="px-5 py-4 font-semibold text-gray-900 text-sm">
                  Rs {(payment.amountPaise / 100).toLocaleString("en-IN")}
                </td>
                <td className="px-5 py-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[payment.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {payment.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-xs text-gray-500">{payment.method ?? "N/A"}</td>
                <td className="px-5 py-4 text-xs text-gray-500">
                  {new Date(payment.createdAt).toLocaleDateString("en-IN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
