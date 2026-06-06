"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Scale, CheckCircle, Loader2, Unlock, ArrowLeft, Shield } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

const PLANS = [
  {
    key: "weekly",
    label: "7-Day Pass",
    price: "₹99",
    subtext: "~₹14/day",
    features: ["Unlimited questions for 7 days", "AI trained on Indian law", "Instant answers"],
    popular: false,
  },
  {
    key: "monthly",
    label: "30-Day Pass",
    price: "₹299",
    subtext: "~₹10/day",
    features: ["Unlimited questions for 30 days", "AI trained on Indian law", "Instant answers", "Best value"],
    popular: true,
  },
];

export default function UpgradePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<"weekly" | "monthly">("monthly");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validUntil, setValidUntil] = useState<string | null>(null);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  async function handlePurchase() {
    if (!session?.user) {
      router.push(`/login?callbackUrl=/ask/upgrade`);
      return;
    }

    setLoading(true);
    try {
      // Create Razorpay order
      const orderRes = await fetch("/api/billing/legal-qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan }),
      });

      if (!orderRes.ok) {
        throw new Error("Failed to create payment order");
      }

      const order = await orderRes.json();

      // Open Razorpay checkout
      const rzp = new window.Razorpay({
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: "NyayAI Legal Q&A",
        description: `Unlimited Legal Questions — ${order.label}`,
        order_id: order.orderId,
        prefill: {
          email: session.user.email ?? "",
          name: session.user.name ?? "",
        },
        theme: { color: "#1e3a5f" },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          // Verify payment on server
          const verifyRes = await fetch("/api/billing/legal-qa", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: selectedPlan,
            }),
          });

          const result = await verifyRes.json();
          if (verifyRes.ok && result.success) {
            setValidUntil(result.validUntil);
            setSuccess(true);
          } else {
            alert("Payment verification failed. Please contact support.");
          }
          setLoading(false);
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      });

      rzp.open();
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-sm border border-[#e0e0e0]">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-semibold text-[#1d1d1f] mb-2">You&apos;re all set!</h1>
          <p className="text-[#7a7a7a] text-sm mb-1">Unlimited access activated.</p>
          {validUntil && (
            <p className="text-xs text-[#7a7a7a] mb-6">
              Valid until {new Date(validUntil).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}
          <Link
            href="/ask"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#1e3a5f] text-white text-sm font-medium hover:bg-[#162d4a] transition-colors"
          >
            Start asking questions
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Header */}
      <header className="bg-white border-b border-[#e0e0e0]">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/ask" className="text-[#7a7a7a] hover:text-[#1d1d1f]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Scale className="w-5 h-5 text-[#1e3a5f]" />
          <span className="font-semibold text-[#1d1d1f] text-sm">NyayAI — Upgrade</span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1e3a5f] mb-4">
            <Unlock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-semibold text-[#1d1d1f] tracking-tight mb-2">
            Unlock unlimited questions
          </h1>
          <p className="text-[#7a7a7a] text-base">
            Ask as many Indian law questions as you need, any time.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {PLANS.map((plan) => (
            <button
              key={plan.key}
              onClick={() => setSelectedPlan(plan.key as "weekly" | "monthly")}
              className={`relative text-left p-5 rounded-2xl border-2 transition-all ${
                selectedPlan === plan.key
                  ? "border-[#1e3a5f] bg-white shadow-md"
                  : "border-[#e0e0e0] bg-white hover:border-[#1e3a5f]/40"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-0.5 rounded-full bg-[#1e3a5f] text-white whitespace-nowrap">
                  Best value
                </span>
              )}
              <p className="text-sm font-semibold text-[#1d1d1f] mb-1">{plan.label}</p>
              <p className="text-2xl font-bold text-[#1e3a5f] mb-0.5">{plan.price}</p>
              <p className="text-xs text-[#7a7a7a] mb-3">{plan.subtext}</p>
              <ul className="space-y-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-1.5 text-xs text-[#1d1d1f]">
                    <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              {selectedPlan === plan.key && (
                <div className="absolute top-3 right-3">
                  <div className="w-4 h-4 rounded-full bg-[#1e3a5f] flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* CTA */}
        {!session?.user ? (
          <div className="text-center">
            <p className="text-sm text-[#7a7a7a] mb-4">
              You need to sign in before purchasing.
            </p>
            <Link
              href={`/login?callbackUrl=/ask/upgrade`}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-[#1e3a5f] text-white font-medium hover:bg-[#162d4a] transition-colors"
            >
              Sign in to continue
            </Link>
          </div>
        ) : (
          <button
            onClick={handlePurchase}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#1e3a5f] text-white font-semibold text-base hover:bg-[#162d4a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Unlock className="w-5 h-5" />
            )}
            {loading
              ? "Processing…"
              : selectedPlan === "weekly"
              ? "Pay ₹99 — 7 days unlimited"
              : "Pay ₹299 — 30 days unlimited"}
          </button>
        )}

        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-[#7a7a7a]">
          <Shield className="w-3.5 h-3.5" />
          Secured by Razorpay · UPI, cards, net banking accepted
        </div>

        <p className="text-center text-xs text-[#7a7a7a] mt-6">
          Already a NyayAI lawyer subscriber?{" "}
          <Link href="/login" className="text-[#0066cc] hover:underline">
            Sign in
          </Link>{" "}
          — you already have unlimited access.
        </p>
      </main>
    </div>
  );
}
