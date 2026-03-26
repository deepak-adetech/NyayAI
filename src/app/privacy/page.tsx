import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — NyayAI",
  description: "NyayAI privacy policy — how we collect, use, and protect your data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-[#1e3a5f]">⚖ NyayAI</Link>
        <Link href="/login" className="text-sm text-[#1e3a5f] hover:underline font-medium">Sign In →</Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: March 2025</p>

        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm space-y-8 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Introduction</h2>
            <p>NyayAI (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is operated by ADE Technologies. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our legal case management platform at <strong>case.ade-technologies.com</strong>.</p>
            <p className="mt-2">By using NyayAI, you agree to the terms of this Privacy Policy.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
            <ul className="space-y-2 list-disc pl-5">
              <li><strong>Account information:</strong> Name, email address, phone number, bar council number, and professional details you provide during registration.</li>
              <li><strong>Case data:</strong> Case details, FIR numbers, CNR numbers, party names, court information, hearing dates, and notes you enter into the platform.</li>
              <li><strong>Documents:</strong> Files you upload for document management (FIRs, chargesheets, orders, etc.).</li>
              <li><strong>Usage data:</strong> How you interact with the platform, features used, and session information.</li>
              <li><strong>Payment information:</strong> Subscription payment records processed via Razorpay. We do not store card numbers.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <ul className="space-y-2 list-disc pl-5">
              <li>To provide, maintain, and improve the NyayAI platform.</li>
              <li>To power AI features including section identification, legal research, and case summarisation.</li>
              <li>To send hearing reminders and important case notifications via email.</li>
              <li>To process subscription payments and manage your account.</li>
              <li>To provide customer support and respond to enquiries.</li>
              <li>To comply with legal obligations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. AI Processing</h2>
            <p>NyayAI uses Claude AI (by Anthropic) to power legal research, section identification, and case summaries. When you use AI features, relevant case details are sent to Anthropic&apos;s API for processing. Anthropic&apos;s privacy policy applies to this data processing. We do not use your case data to train AI models.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Data Security</h2>
            <p>We implement industry-standard security measures including:</p>
            <ul className="space-y-1 list-disc pl-5 mt-2">
              <li>TLS/HTTPS encryption for all data in transit.</li>
              <li>Encrypted storage for sensitive data at rest.</li>
              <li>Access controls limiting data access to authorised personnel only.</li>
              <li>Regular security reviews and updates.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Data Sharing</h2>
            <p>We do not sell, trade, or rent your personal information to third parties. We share data only with:</p>
            <ul className="space-y-1 list-disc pl-5 mt-2">
              <li><strong>Anthropic:</strong> For AI-powered features (case summaries, legal research).</li>
              <li><strong>Razorpay:</strong> For payment processing.</li>
              <li><strong>Supabase:</strong> For vector database (RAG knowledge base).</li>
              <li><strong>Service providers</strong> who assist in operating our platform under confidentiality agreements.</li>
              <li><strong>Law enforcement</strong> when required by applicable law.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="space-y-1 list-disc pl-5 mt-2">
              <li>Access the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your account and associated data.</li>
              <li>Export your case data.</li>
              <li>Withdraw consent for marketing communications.</li>
            </ul>
            <p className="mt-2">To exercise these rights, email us at <a href="mailto:privacy@nyayasahayak.com" className="text-blue-600 hover:underline">privacy@nyayasahayak.com</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Data Retention</h2>
            <p>We retain your data for as long as your account is active. Upon account deletion, your personal data and case data are deleted within 30 days, except where retention is required by law.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Contact</h2>
            <p>For privacy-related queries, contact us at:</p>
            <p className="mt-2"><a href="mailto:privacy@nyayasahayak.com" className="text-blue-600 hover:underline">privacy@nyayasahayak.com</a></p>
          </section>

        </div>
      </div>

      <footer className="border-t border-gray-200 py-6 text-center text-sm text-gray-400">
        <p>© {new Date().getFullYear()} NyayAI · <Link href="/contact" className="hover:text-gray-600">Contact</Link> · <Link href="/terms" className="hover:text-gray-600">Terms</Link></p>
      </footer>
    </div>
  );
}
