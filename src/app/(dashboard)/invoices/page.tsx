export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Receipt, Plus } from "lucide-react";

const statusBadge: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default async function InvoicesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const invoices = await prisma.invoice.findMany({
    where: { lawyerId: session.user.id! },
    include: {
      case: { select: { id: true, title: true } },
      lineItems: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const draftCount = invoices.filter((i) => i.status === "draft").length;
  const sentCount = invoices.filter((i) => i.status === "sent").length;
  const paidCount = invoices.filter((i) => i.status === "paid").length;
  const overdueCount = invoices.filter((i) => i.status === "overdue").length;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Receipt className="h-7 w-7 text-[#1e3a5f]" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Invoices</h1>
            <p className="text-gray-500 text-sm">
              {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Link
          href="/invoices/new"
          className="flex items-center gap-2 bg-[#1e3a5f] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#162d4a] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Invoice
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Draft", count: draftCount, color: "text-gray-600", bg: "bg-gray-50" },
          { label: "Sent", count: sentCount, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Paid", count: paidCount, color: "text-green-600", bg: "bg-green-50" },
          { label: "Overdue", count: overdueCount, color: "text-red-600", bg: "bg-red-50" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
          >
            <p className="text-xs font-medium text-gray-500 uppercase">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {invoices.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No invoices yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Create your first invoice to start billing clients.
            </p>
            <Link
              href="/invoices/new"
              className="inline-block mt-4 text-[#1e3a5f] font-medium hover:underline"
            >
              Create your first invoice
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 uppercase">
                  Invoice #
                </th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 uppercase">
                  Client
                </th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 uppercase">
                  Case
                </th>
                <th className="text-right text-xs font-medium text-gray-500 px-4 py-3 uppercase">
                  Amount
                </th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 uppercase">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 uppercase">
                  Date
                </th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-800">
                      {invoice.invoiceNumber}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-700">{invoice.clientName}</span>
                  </td>
                  <td className="px-4 py-3">
                    {invoice.case ? (
                      <Link
                        href={`/cases/${invoice.case.id}`}
                        className="text-sm text-[#1e3a5f] hover:underline"
                      >
                        {invoice.case.title}
                      </Link>
                    ) : (
                      <span className="text-sm text-gray-400">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-medium text-gray-800">
                      Rs.{" "}
                      {(invoice.totalPaise / 100).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                        statusBadge[invoice.status] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">
                      {formatDate(invoice.createdAt)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/invoices/${invoice.id}`}
                      className="text-sm text-[#1e3a5f] font-medium hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
