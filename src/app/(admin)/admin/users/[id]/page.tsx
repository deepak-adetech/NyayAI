import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Suspense } from "react";
import UserActionButtons from "@/components/admin/UserActionButtons";
import {
  formatDate,
  formatDateTime,
  subscriptionStatusVariant,
  roleVariant,
  paymentStatusVariant,
  BADGE_CLASSES,
  formatINR,
} from "@/lib/admin-utils";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  CreditCard,
  Briefcase,
  FileText,
  Clock,
} from "lucide-react";

export const dynamic = "force-dynamic";

async function getUserDetail(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      subscription: { include: { plan: true } },
      _count: {
        select: {
          cases: true,
          documents: true,
        },
      },
    },
  });
  return user;
}

async function getUserActivity(id: string) {
  const [auditLogs, payments] = await Promise.all([
    prisma.auditLog.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.payment.findMany({
      where: { subscription: { userId: id } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);
  return { auditLogs, payments };
}

// ----------------------------------------------------------------
// Field row helper
// ----------------------------------------------------------------

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start py-3 border-b border-gray-50 last:border-0">
      <span className="w-44 text-xs font-medium text-gray-500 shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-sm text-gray-800">{value ?? "-"}</span>
    </div>
  );
}

// ----------------------------------------------------------------
// Detail content (async)
// ----------------------------------------------------------------

async function UserDetailContent({ id }: { id: string }) {
  const user = await getUserDetail(id);
  if (!user) notFound();

  const { auditLogs, payments } = await getUserActivity(id);

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center text-[#1e3a5f] font-bold text-lg">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
              <p className="text-gray-500 text-sm">{user.email}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={BADGE_CLASSES[roleVariant(user.role)]}>
            {user.role}
          </span>
          <span
            className={user.isActive ? BADGE_CLASSES.green : BADGE_CLASSES.red}
          >
            {user.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: User info + subscription */}
        <div className="xl:col-span-2 space-y-6">
          {/* Profile card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900 text-sm">
                Profile Information
              </h2>
            </div>
            <div className="px-6 py-2">
              <InfoRow label="Full Name" value={user.name} />
              <InfoRow
                label="Email"
                value={
                  <span className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    {user.email}
                    {user.emailVerified ? (
                      <span className={BADGE_CLASSES.green}>Verified</span>
                    ) : (
                      <span className={BADGE_CLASSES.yellow}>Unverified</span>
                    )}
                  </span>
                }
              />
              <InfoRow
                label="Phone"
                value={
                  user.phone ? (
                    <span className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      {user.phone}
                      {user.phoneVerified && (
                        <span className={BADGE_CLASSES.green}>Verified</span>
                      )}
                    </span>
                  ) : null
                }
              />
              <InfoRow label="Role" value={user.role} />
              <InfoRow label="Firm Name" value={user.firmName} />
              <InfoRow
                label="Bar Council No."
                value={user.barCouncilNumber}
              />
              <InfoRow label="Bar Council State" value={user.barCouncilState} />
              <InfoRow
                label="Location"
                value={
                  user.city || user.state ? (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      {[user.city, user.state, user.pincode]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  ) : null
                }
              />
              <InfoRow label="Timezone" value={user.timezone} />
              <InfoRow
                label="Created At"
                value={
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {formatDateTime(user.createdAt)}
                  </span>
                }
              />
              <InfoRow
                label="Last Login"
                value={
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    {formatDateTime(user.lastLoginAt)}
                  </span>
                }
              />
            </div>
          </div>

          {/* Subscription card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900 text-sm">
                Subscription
              </h2>
            </div>
            <div className="px-6 py-2">
              {user.subscription ? (
                <>
                  <InfoRow
                    label="Plan"
                    value={user.subscription.plan?.name ?? user.subscription.planId}
                  />
                  <InfoRow
                    label="Tier"
                    value={user.subscription.plan?.tier}
                  />
                  <InfoRow
                    label="Status"
                    value={
                      <span
                        className={
                          BADGE_CLASSES[
                            subscriptionStatusVariant(
                              user.subscription.status
                            )
                          ]
                        }
                      >
                        {user.subscription.status}
                      </span>
                    }
                  />
                  <InfoRow
                    label="Billing Cycle"
                    value={user.subscription.billingCycle}
                  />
                  <InfoRow
                    label="Trial Ends At"
                    value={formatDate(user.subscription.trialEndsAt)}
                  />
                  <InfoRow
                    label="Current Period"
                    value={
                      user.subscription.currentPeriodStart &&
                      user.subscription.currentPeriodEnd
                        ? `${formatDate(
                            user.subscription.currentPeriodStart
                          )} to ${formatDate(
                            user.subscription.currentPeriodEnd
                          )}`
                        : null
                    }
                  />
                  <InfoRow
                    label="Cancelled At"
                    value={formatDate(user.subscription.cancelledAt)}
                  />
                  <InfoRow
                    label="Failed Payments"
                    value={
                      user.subscription.failedPaymentCount > 0 ? (
                        <span className={BADGE_CLASSES.red}>
                          {user.subscription.failedPaymentCount}
                        </span>
                      ) : (
                        "0"
                      )
                    }
                  />
                </>
              ) : (
                <p className="text-sm text-gray-400 py-4">
                  No subscription found for this user.
                </p>
              )}
            </div>
          </div>

          {/* Cases and documents counts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Cases</p>
                <p className="text-2xl font-bold text-gray-900">
                  {user._count.cases}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Documents</p>
                <p className="text-2xl font-bold text-gray-900">
                  {user._count.documents}
                </p>
              </div>
            </div>
          </div>

          {/* Recent payments */}
          {payments.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 text-sm">
                  Payment History
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      {["Date", "Amount", "Method", "Status"].map((h) => (
                        <th
                          key={h}
                          className="text-left text-xs font-medium text-gray-500 px-6 py-3"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-gray-50 hover:bg-gray-50"
                      >
                        <td className="px-6 py-3 text-xs text-gray-500">
                          {formatDateTime(p.createdAt)}
                        </td>
                        <td className="px-6 py-3 font-medium text-gray-900">
                          {formatINR(p.amountPaise)}
                        </td>
                        <td className="px-6 py-3 text-xs text-gray-600">
                          {p.method ?? "-"}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={
                              BADGE_CLASSES[paymentStatusVariant(p.status)]
                            }
                          >
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right column: actions + audit */}
        <div className="space-y-6">
          {/* Admin actions (client component) */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <Shield className="w-4 h-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900 text-sm">
                Admin Actions
              </h2>
            </div>
            <div className="p-6">
              <UserActionButtons
                userId={user.id}
                isActive={user.isActive}
                currentRole={user.role}
                hasSubscription={!!user.subscription}
              />
            </div>
          </div>

          {/* Audit log */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm">
                Recent Audit Log
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {auditLogs.length === 0 ? (
                <p className="text-sm text-gray-400 px-6 py-4">
                  No audit events found.
                </p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="px-6 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-medium text-gray-800 break-all">
                        {log.action}
                      </span>
                      <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                        {formatDateTime(log.createdAt)}
                      </span>
                    </div>
                    {log.ipAddress && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        IP: {log.ipAddress}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function AdminUserDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <>
      <div className="mb-4">
        <a
          href="/admin/users"
          className="text-sm text-gray-500 hover:text-[#1e3a5f] transition-colors"
        >
          Users
        </a>
        <span className="text-gray-300 mx-2">/</span>
        <span className="text-sm text-gray-900 font-medium">User Detail</span>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <UserDetailContent id={params.id} />
      </Suspense>
    </>
  );
}
