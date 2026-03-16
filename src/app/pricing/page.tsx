import Link from "next/link";
import { CheckCircle, ArrowRight, Shield, Clock, Users, Zap, Star, Phone } from "lucide-react";

const plans = [
  {
    name: "Starter",
    tagline: "For solo practitioners",
    monthlyPrice: 999,
    yearlyPrice: 9999,
    monthlySaving: 0,
    yearlySaving: 1989,
    color: "border-gray-200",
    badgeBg: "",
    badge: "",
    ctaHref: "/signup",
    ctaText: "Start Free Trial",
    ctaStyle: "border-2 border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white",
    features: {
      "Users": "1",
      "Active cases": "50",
      "Documents per case": "500",
      "Document storage": "5 GB",
      "AI section finder (BNS/IPC)": true,
      "eCourts auto-sync": true,
      "Hearing reminders (email)": true,
      "Hearing reminders (SMS/WhatsApp)": false,
      "Document OCR": true,
      "Hindi / regional OCR": "Basic",
      "Desktop file sync agent": true,
      "Client portal": false,
      "AI document drafting": "5/month",
      "Legal research queries": "50/month",
      "Document history": "7 days",
      "API access": false,
      "White-label": false,
      "Custom integrations": false,
      "Priority support": false,
      "Dedicated account manager": false,
      "Support channel": "Email",
    },
  },
  {
    name: "Professional",
    tagline: "For established advocates and small firms",
    monthlyPrice: 1999,
    yearlyPrice: 19999,
    monthlySaving: 0,
    yearlySaving: 3989,
    color: "border-[#1e3a5f]",
    badgeBg: "bg-[#1e3a5f]",
    badge: "Most Popular",
    ctaHref: "/signup",
    ctaText: "Start Free Trial",
    ctaStyle: "bg-[#1e3a5f] text-white hover:bg-[#162d4a]",
    features: {
      "Users": "3",
      "Active cases": "Unlimited",
      "Documents per case": "Unlimited",
      "Document storage": "50 GB",
      "AI section finder (BNS/IPC)": true,
      "eCourts auto-sync": true,
      "Hearing reminders (email)": true,
      "Hearing reminders (SMS/WhatsApp)": true,
      "Document OCR": true,
      "Hindi / regional OCR": "Full",
      "Desktop file sync agent": true,
      "Client portal": true,
      "AI document drafting": "Unlimited",
      "Legal research queries": "Unlimited",
      "Document history": "Unlimited",
      "API access": false,
      "White-label": false,
      "Custom integrations": false,
      "Priority support": true,
      "Dedicated account manager": false,
      "Support channel": "Email + priority",
    },
  },
  {
    name: "Enterprise",
    tagline: "For large firms and legal departments",
    monthlyPrice: 4999,
    yearlyPrice: 49999,
    monthlySaving: 0,
    yearlySaving: 9989,
    color: "border-gray-200",
    badgeBg: "",
    badge: "",
    ctaHref: "/contact",
    ctaText: "Contact Sales",
    ctaStyle: "border-2 border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white",
    features: {
      "Users": "10",
      "Active cases": "Unlimited",
      "Documents per case": "Unlimited",
      "Document storage": "500 GB",
      "AI section finder (BNS/IPC)": true,
      "eCourts auto-sync": true,
      "Hearing reminders (email)": true,
      "Hearing reminders (SMS/WhatsApp)": true,
      "Document OCR": true,
      "Hindi / regional OCR": "Full",
      "Desktop file sync agent": true,
      "Client portal": true,
      "AI document drafting": "Unlimited",
      "Legal research queries": "Unlimited",
      "Document history": "Unlimited",
      "API access": true,
      "White-label": true,
      "Custom integrations": true,
      "Priority support": true,
      "Dedicated account manager": true,
      "Support channel": "Phone + priority email",
    },
  },
];

const featureGroups = [
  {
    group: "Account",
    features: ["Users", "Active cases", "Documents per case", "Document storage"],
  },
  {
    group: "eCourts and Sync",
    features: ["eCourts auto-sync", "Desktop file sync agent"],
  },
  {
    group: "AI Features",
    features: [
      "AI section finder (BNS/IPC)",
      "AI document drafting",
      "Legal research queries",
      "Hindi / regional OCR",
      "Document OCR",
    ],
  },
  {
    group: "Communication and Reminders",
    features: [
      "Hearing reminders (email)",
      "Hearing reminders (SMS/WhatsApp)",
      "Client portal",
    ],
  },
  {
    group: "Advanced",
    features: [
      "Document history",
      "API access",
      "White-label",
      "Custom integrations",
      "Priority support",
      "Dedicated account manager",
      "Support channel",
    ],
  },
];

function FeatureValue({ value }: { value: boolean | string }) {
  if (value === true) return <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />;
  if (value === false) return <span className="text-gray-300 text-xl mx-auto block text-center">-</span>;
  return <span className="text-gray-700 text-sm text-center block">{value}</span>;
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-[#1e3a5f] text-xl font-bold tracking-tight">NyayaSahayak</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-gray-600 hover:text-[#1e3a5f] text-sm font-medium transition-colors hidden sm:block">
              Sign In
            </Link>
            <Link href="/signup" className="bg-[#1e3a5f] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#162d4a] transition-colors">
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-16 pb-12 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-extrabold text-[#1e3a5f] mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-gray-600 text-lg mb-6">
            40% below market average. All plans include a 14-day free trial with every feature unlocked. No credit card required.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
            {[
              { icon: Clock, text: "14-day free trial" },
              { icon: Shield, text: "No credit card required" },
              { icon: Zap, text: "All features from day one" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-1.5">
                <item.icon className="h-4 w-4 text-[#1e3a5f]" />
                {item.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plan cards */}
      <section className="px-6 pb-16">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6 items-start">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`bg-white rounded-2xl border-2 ${plan.color} p-8 relative ${
                  plan.badge ? "shadow-xl md:-mt-4 md:mb-0" : ""
                }`}
              >
                {plan.badge && (
                  <div className={`absolute -top-4 left-1/2 -translate-x-1/2 ${plan.badgeBg} text-white text-xs font-bold px-5 py-1.5 rounded-full`}>
                    {plan.badge}
                  </div>
                )}
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900">{plan.name}</h2>
                  <p className="text-gray-500 text-sm mt-1 mb-4">{plan.tagline}</p>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-gray-500 text-sm">Rs</span>
                    <span className="text-4xl font-extrabold text-[#1e3a5f]">{plan.monthlyPrice.toLocaleString("en-IN")}</span>
                    <span className="text-gray-400 text-sm">/month</span>
                  </div>
                  <div className="text-gray-500 text-xs">
                    Rs {plan.yearlyPrice.toLocaleString("en-IN")}/year
                    <span className="ml-2 text-green-600 font-semibold">Save Rs {plan.yearlySaving.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <Link
                  href={plan.ctaHref}
                  className={`w-full block text-center py-3 rounded-xl font-semibold transition-colors mb-6 text-sm ${plan.ctaStyle}`}
                >
                  {plan.ctaText}
                </Link>

                <div className="space-y-2 text-sm">
                  {[
                    { label: "Users", value: plan.features["Users"] },
                    { label: "Cases", value: plan.features["Active cases"] },
                    { label: "Storage", value: plan.features["Document storage"] },
                    { label: "eCourts sync", value: plan.features["eCourts auto-sync"] },
                    { label: "AI drafting", value: plan.features["AI document drafting"] },
                    { label: "Client portal", value: plan.features["Client portal"] },
                    { label: "SMS/WhatsApp reminders", value: plan.features["Hearing reminders (SMS/WhatsApp)"] },
                    { label: "Support", value: plan.features["Support channel"] },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-50">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-medium text-gray-900">
                        {value === true ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : value === false ? (
                          <span className="text-gray-300">No</span>
                        ) : (
                          value
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Full comparison table */}
      <section className="bg-gray-50 py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-[#1e3a5f] mb-2 text-center">Full feature comparison</h2>
          <p className="text-gray-500 text-sm text-center mb-10">Every detail, side by side.</p>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-4 gap-0 border-b border-gray-100">
              <div className="p-5" />
              {plans.map((plan) => (
                <div key={plan.name} className={`p-5 text-center ${plan.badge ? "bg-[#1e3a5f]/5" : ""}`}>
                  <div className="font-bold text-gray-900">{plan.name}</div>
                  <div className="text-[#1e3a5f] font-semibold text-sm mt-1">
                    Rs {plan.monthlyPrice.toLocaleString("en-IN")}/mo
                  </div>
                </div>
              ))}
            </div>

            {/* Table rows by group */}
            {featureGroups.map((group) => (
              <div key={group.group}>
                <div className="bg-gray-50 px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  {group.group}
                </div>
                {group.features.map((featureKey) => (
                  <div key={featureKey} className="grid grid-cols-4 gap-0 border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <div className="p-4 text-sm text-gray-700">{featureKey}</div>
                    {plans.map((plan) => (
                      <div key={plan.name} className={`p-4 flex items-center justify-center ${plan.badge ? "bg-[#1e3a5f]/3" : ""}`}>
                        <FeatureValue value={plan.features[featureKey as keyof typeof plan.features]} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-[#1e3a5f] mb-10 text-center">Pricing FAQ</h2>
          <div className="space-y-6">
            {[
              {
                q: "Is there really no credit card required for the trial?",
                a: "Correct. You sign up with your email address only. No payment information is collected during the 14-day trial. At the end of the trial, you choose whether to subscribe. If you do not, your account enters read-only mode and all your data remains available for 30 days.",
              },
              {
                q: "Can I change plans at any time?",
                a: "Yes. You can upgrade or downgrade your plan at any time from your account settings. Upgrades take effect immediately. Downgrades take effect at the start of the next billing cycle. Unused days from annual plans are prorated on upgrade.",
              },
              {
                q: "What does the annual plan save me?",
                a: "Annual plans are equivalent to 10 months of fees. You effectively get 2 months free compared to monthly billing. The Starter annual plan saves Rs 1,989, Professional saves Rs 3,989, and Enterprise saves Rs 9,989 per year.",
              },
              {
                q: "Do you offer discounts for larger teams?",
                a: "The Enterprise plan supports up to 10 users. For firms with more than 10 advocates or legal professionals, please contact our sales team at sales@nyayasahayak.com for custom pricing.",
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept UPI, net banking, credit cards (Visa, Mastercard, RuPay), and debit cards through our payment gateway. All transactions are in Indian Rupees and include GST.",
              },
            ].map((faq, i) => (
              <div key={i} className="border-b border-gray-100 pb-6">
                <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Competitor comparison */}
      <section className="bg-gray-50 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-[#1e3a5f] mb-3 text-center">How we compare</h2>
          <p className="text-gray-500 text-sm text-center mb-10">NyayaSahayak gives you more features at a lower price than any competitor.</p>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-4 border-b border-gray-100 bg-gray-50">
              <div className="p-4 text-sm font-semibold text-gray-700">Feature</div>
              <div className="p-4 text-sm font-bold text-[#1e3a5f] text-center">NyayaSahayak</div>
              <div className="p-4 text-sm font-semibold text-gray-500 text-center">LawSathi</div>
              <div className="p-4 text-sm font-semibold text-gray-500 text-center">VakilAI</div>
            </div>
            {[
              ["Starting price", "Rs 999/mo", "Not published", "Pay-per-use"],
              ["Full case management", "Yes", "Yes", "No"],
              ["eCourts live sync", "Yes", "Yes", "No"],
              ["Client portal", "Yes", "No", "No"],
              ["Desktop file sync", "Yes", "No", "No"],
              ["BNS 2023 + IPC AI", "Yes", "Partial", "Yes"],
              ["Hindi/regional OCR", "Yes", "No", "No"],
              ["Hearing reminders (SMS/WA)", "Yes", "Partial", "No"],
              ["Transparent pricing", "Yes", "No", "Yes (wallet)"],
              ["Free trial", "14 days", "Demo only", "Rs 100 credit"],
            ].map(([feature, ns, ls, vk], i) => (
              <div key={i} className="grid grid-cols-4 border-b border-gray-50">
                <div className="p-4 text-sm text-gray-600">{feature}</div>
                <div className="p-4 text-sm text-[#1e3a5f] font-semibold text-center">{ns}</div>
                <div className="p-4 text-sm text-gray-500 text-center">{ls}</div>
                <div className="p-4 text-sm text-gray-500 text-center">{vk}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">
            Competitor pricing based on publicly available information as of early 2025. Subject to change.
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-[#1e3a5f] mb-10 text-center">What advocates say about the pricing</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                text: "I was paying Rs 2,500 per month to a competitor and getting fewer features. Switched to NyayaSahayak Professional at Rs 1,999 and have not looked back.",
                name: "Adv. Meena Patil",
                location: "Bombay High Court",
                initials: "MP",
              },
              {
                text: "The Starter plan is genuinely the most affordable complete legal management solution I have found. For a solo advocate just setting up practice, it is excellent value.",
                name: "Adv. Ankit Verma",
                location: "Delhi District Court",
                initials: "AV",
              },
            ].map((t) => (
              <div key={t.name} className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-6">&quot;{t.text}&quot;</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#1e3a5f] rounded-full flex items-center justify-center text-white font-bold text-xs">
                    {t.initials}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{t.name}</div>
                    <div className="text-gray-500 text-xs">{t.location}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#1e3a5f] py-16 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Start your free 14-day trial</h2>
          <p className="text-blue-200 mb-8">No credit card. All features. Cancel anytime.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 bg-white text-[#1e3a5f] px-8 py-4 rounded-xl font-bold hover:bg-gray-50 transition-colors"
            >
              Start Free Trial
              <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href="mailto:sales@nyayasahayak.com"
              className="inline-flex items-center justify-center gap-2 border-2 border-white/30 text-white px-8 py-4 rounded-xl font-semibold hover:border-white transition-colors"
            >
              <Phone className="h-5 w-5" />
              Talk to Sales
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-8 px-6 text-center">
        <p className="text-gray-400 text-sm">&copy; 2025 NyayaSahayak. All rights reserved. Made in India.</p>
      </footer>
    </div>
  );
}
