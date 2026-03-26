"use client";
import { useState } from "react";
import { CreditCard, Loader2, AlertTriangle, Mail } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  tier: string;
  priceMonthlyPaise: number;
  razorpayPlanIdMonthly: string | null;
}

interface Props {
  subscriptionId: string;
  status: string;
  razorpaySubId: string | null;
  plans: Plan[];
  currentPlanId: string;
}

export default function BillingActions({
  subscriptionId,
  status,
  razorpaySubId,
  plans,
  currentPlanId,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const otherPlans = plans.filter((p) => p.id !== currentPlanId);

  async function initiatePayment(planId: string) {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/billing/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();

      if (!res.ok) {
        // If Razorpay not configured, show friendly contact message
        if (res.status === 400) {
          setError("Online payment coming soon. Please contact support@nyayasahayak.com to upgrade.");
        } else {
          setError(data.error ?? "Failed to initiate payment. Please contact support.");
        }
        setLoading(false);
        return;
      }

      // Open Razorpay checkout
      const rzp = new (window as any).Razorpay({
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: "NyayAI",
        description: `Subscription — ${data.planName}`,
        prefill: { email: data.email },
        theme: { color: "#1e3a5f" },
        handler: function (response: any) {
          fetch("/api/billing/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          }).then(() => {
            window.location.reload();
          });
        },
      });

      rzp.open();
    } catch {
      setError("Failed to load payment. Please contact support@nyayasahayak.com.");
    } finally {
      setLoading(false);
    }
  }

  if (status === "TRIAL" || status === "EXPIRED" || status === "CANCELLED") {
    return (
      <div className="flex flex-col gap-3">
        {error && (
          <div className="flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm max-w-xs">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {otherPlans.map((plan) => (
          <button
            key={plan.id}
            onClick={() => initiatePayment(plan.id)}
            disabled={loading}
            className="flex items-center gap-2 bg-[#1e3a5f] text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-[#162d4a] transition-colors disabled:opacity-50 text-sm whitespace-nowrap"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            Upgrade to {plan.name}
          </button>
        ))}
        <a
          href="mailto:support@nyayasahayak.com?subject=Upgrade Request"
          className="flex items-center gap-2 text-sm text-[#1e3a5f] hover:underline"
        >
          <Mail className="h-4 w-4" />
          Contact us to upgrade
        </a>
      </div>
    );
  }

  if (status === "ACTIVE") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-gray-500 text-right">
          To change or cancel, contact support
        </p>
        <a
          href="mailto:support@nyayasahayak.com?subject=Subscription Change Request"
          className="text-sm text-[#1e3a5f] hover:underline text-right"
        >
          Contact Support
        </a>
      </div>
    );
  }

  return null;
}
