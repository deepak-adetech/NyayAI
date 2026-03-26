import Link from "next/link";

export const metadata = {
  title: "Terms of Service — NyayAI",
  description: "NyayAI terms of service and usage conditions.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-[#1e3a5f]">⚖ NyayAI</Link>
        <Link href="/login" className="text-sm text-[#1e3a5f] hover:underline font-medium">Sign In →</Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: March 2025</p>

        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm space-y-8 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using NyayAI (&quot;the Platform&quot;), operated by ADE Technologies, you agree to be bound by these Terms of Service. If you do not agree, you may not use the Platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Description of Service</h2>
            <p>NyayAI is an AI-powered legal case management platform designed for practising lawyers in India. The Platform provides:</p>
            <ul className="space-y-1 list-disc pl-5 mt-2">
              <li>Case and document management tools.</li>
              <li>AI-powered BNS/IPC section identification.</li>
              <li>Legal research assistance powered by Claude AI.</li>
              <li>Hearing reminders and calendar management.</li>
              <li>eCourts case status sync.</li>
              <li>Client portal access.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Important Disclaimer — Not Legal Advice</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="font-semibold text-yellow-800 mb-1">⚠ AI outputs are not legal advice.</p>
              <p className="text-yellow-700">The AI features of NyayAI (section identification, legal research, case summaries) are tools to assist qualified lawyers — they do not constitute legal advice and should not be relied upon as such. All AI outputs must be independently verified by a qualified legal professional before use. NyayAI is not responsible for any reliance placed on AI-generated content.</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Eligibility</h2>
            <p>The Platform is intended for use by practising advocates enrolled with the Bar Council of India or relevant State Bar Council. By registering, you represent that you are a qualified legal professional or an authorised staff member of a law firm.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Account Responsibilities</h2>
            <ul className="space-y-2 list-disc pl-5">
              <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
              <li>You must not share your account with others or allow unauthorised access.</li>
              <li>You are responsible for all activity under your account.</li>
              <li>You must notify us immediately of any unauthorised use at <a href="mailto:support@nyayasahayak.com" className="text-blue-600 hover:underline">support@nyayasahayak.com</a>.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="space-y-1 list-disc pl-5 mt-2">
              <li>Use the Platform for any unlawful purpose.</li>
              <li>Upload false, misleading, or fraudulent case information.</li>
              <li>Attempt to reverse-engineer, scrape, or exploit the Platform.</li>
              <li>Use AI features to generate content that is misleading to clients or courts.</li>
              <li>Violate any applicable law, including the Bar Council of India Rules on professional conduct.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Subscription and Payment</h2>
            <ul className="space-y-2 list-disc pl-5">
              <li>NyayAI offers a 14-day free trial followed by paid subscription plans.</li>
              <li>Payments are processed via Razorpay. All prices are in Indian Rupees (INR) inclusive of applicable taxes.</li>
              <li>Subscriptions auto-renew unless cancelled before the renewal date.</li>
              <li>Refunds are subject to our refund policy communicated at the time of purchase.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Intellectual Property</h2>
            <p>You retain ownership of all case data and documents you upload. By using the Platform, you grant us a limited licence to process your data to provide the service. The Platform software, AI models, design, and content are the intellectual property of ADE Technologies.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, ADE Technologies shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Platform, including but not limited to reliance on AI-generated legal analysis. Our total liability shall not exceed the subscription fees paid by you in the preceding 3 months.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Termination</h2>
            <p>We reserve the right to suspend or terminate your account if you violate these Terms. You may delete your account at any time from the Settings page. Upon termination, your data will be deleted within 30 days as per our Privacy Policy.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">11. Governing Law</h2>
            <p>These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in India.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">12. Contact</h2>
            <p>For questions about these Terms, contact us at:</p>
            <p className="mt-2"><a href="mailto:legal@nyayasahayak.com" className="text-blue-600 hover:underline">legal@nyayasahayak.com</a></p>
          </section>

        </div>
      </div>

      <footer className="border-t border-gray-200 py-6 text-center text-sm text-gray-400">
        <p>© {new Date().getFullYear()} NyayAI · <Link href="/contact" className="hover:text-gray-600">Contact</Link> · <Link href="/privacy" className="hover:text-gray-600">Privacy</Link></p>
      </footer>
    </div>
  );
}
