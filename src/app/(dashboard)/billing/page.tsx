export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatDate, formatCurrency, getStatusColor } from "@/lib/utils";
import { CreditCard, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import BillingActions from "./BillingActions";

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id!;

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    include: {
      plan: true,
      payments: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { priceMonthlyPaise: "asc" },
  });

  const isTrialActive =
    subscription?.status === "TRIAL" &&
    subscription.trialEndsAt &&
    subscription.trialEndsAt > new Date();

  const trialDaysLeft = isTrialActive
    ? Math.ceil(
        (subscription!.trialEndsAt!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : 0;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="h-7 w-7 text-[#1e3a5f]" />
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Billing & Subscription</h1>
          <p className="text-gray-500 text-sm">Manage your NyayaSahayak subscription</p>
        </div>
      </div>

      {/* Current Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">Current Plan</h2>

        {subscription ? (
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl font-bold text-[#1e3a5f]">
                  {subscription.plan.name}
                </span>
                <span
                  className={`text-sm px-3 py-1 rounded-full font-medium ${getStatusColor(subscription.status)}`}
                >
                  {subscription.status}
                </span>
              </div>

              {isTrialActive && (
                <div className="flex items-center gap-2 text-gray-700 bg-gray-50 rounded-lg px-3 py-2 text-sm mb-3">
                  <Clock className="h-4 w-4" />
                  <span>
                    Free trial: <strong>{trialDaysLeft} days remaining</strong>
                    {subscription.trialEndsAt && (
                      <span className="text-gray-500">
                        {" "}
                        (ends {formatDate(subscription.trialEndsAt)})
                      </span>
                    )}
                  </span>
                </div>
              )}

              {subscription.status === "ACTIVE" && (
                <p className="text-sm text-gray-600">
                  Next billing:{" "}
                  {subscription.currentPeriodEnd
                    ? formatDate(subscription.currentPeriodEnd)
                    : "—"}
                  {" · "}
                  {formatCurrency(subscription.plan.priceMonthlyPaise)}/month
                </p>
              )}

              {subscription.status === "EXPIRED" && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  Your subscription has expired. Please renew to continue.
                </div>
              )}

              {subscription.status === "PAYMENT_FAILED" && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  Payment failed {subscription.failedPaymentCount} time
                  {subscription.failedPaymentCount !== 1 ? "s" : ""}. Please update payment.
                </div>
              )}

              {/* Plan features */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  { label: `Up to ${subscription.plan.maxCases} cases`, active: true },
                  {
                    label: "Client Portal",
                    active: subscription.plan.hasClientPortal,
                  },
                  { label: "AI Features", active: true },
                  {
                    label: "Word Add-in",
                    active: subscription.plan.hasWordAddin,
                  },
                  {
                    label: "Priority Support",
                    active: subscription.plan.hasPrioritySupport,
                  },
                  {
                    label: "Advanced AI",
                    active: subscription.plan.hasAdvancedAI,
                  },
                ].map((f) => (
                  <div key={f.label} className="flex items-center gap-2 text-sm">
                    <CheckCircle
                      className={`h-4 w-4 ${f.active ? "text-green-500" : "text-gray-300"}`}
                    />
                    <span className={f.active ? "text-gray-700" : "text-gray-400"}>
                      {f.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <BillingActions
              subscriptionId={subscription.id}
              status={subscription.status}
              razorpaySubId={subscription.razorpaySubscriptionId}
              plans={plans}
              currentPlanId={subscription.planId}
            />
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-gray-500 mb-4">No active subscription found.</p>
          </div>
        )}
      </div>

      {/* Upgrade plans */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrent = subscription?.planId === plan.id;
            return (
              <div
                key={plan.id}
                className={`rounded-xl p-5 border-2 ${
                  isCurrent
                    ? "border-[#1e3a5f] bg-blue-50/60"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-800">{plan.name}</h3>
                    <p className="text-xs text-gray-500">{plan.description}</p>
                  </div>
                  {isCurrent && (
                    <span className="bg-[#1e3a5f] text-white text-xs px-2 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                </div>
                <div className="text-2xl font-bold text-gray-800 mb-1">
                  {formatCurrency(plan.priceMonthlyPaise)}
                  <span className="text-sm font-normal text-gray-500">/mo</span>
                </div>
                <ul className="space-y-1 mt-3">
                  {[
                    `${plan.maxCases} cases`,
                    plan.hasClientPortal ? "Client portal" : null,
                    plan.hasWordAddin ? "Word Add-in" : null,
                    plan.hasAdvancedAI ? "Advanced AI" : null,
                    plan.hasPrioritySupport ? "Priority support" : null,
                  ]
                    .filter(Boolean)
                    .map((f) => (
                      <li
                        key={f as string}
                        className="text-xs text-gray-600 flex items-center gap-1.5"
                      >
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                        {f}
                      </li>
                    ))}
                </ul>
              </div>
            );
          })}
        </div>
        <p className="text-sm text-gray-500 mt-4 text-center">
          To upgrade or change plan, contact{" "}
          <a
            href="mailto:support@nyayasahayak.com"
            className="text-[#1e3a5f] hover:underline"
          >
            support@nyayasahayak.com
          </a>{" "}
          or use Razorpay checkout below.
        </p>
      </div>

      {/* Payment History */}
      {subscription?.payments && subscription.payments.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">Payment History</h2>
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                <th className="pb-2">Date</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Method</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {subscription.payments.map((p) => (
                <tr key={p.id}>
                  <td className="py-3 text-sm text-gray-700">
                    {p.paidAt ? formatDate(p.paidAt) : formatDate(p.createdAt)}
                  </td>
                  <td className="py-3 text-sm font-medium text-gray-800">
                    {formatCurrency(p.amountPaise)}
                  </td>
                  <td className="py-3 text-sm text-gray-600 capitalize">
                    {p.method ?? "—"}
                  </td>
                  <td className="py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        p.status === "captured"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
