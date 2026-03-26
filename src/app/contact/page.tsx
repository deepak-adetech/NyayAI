import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

export const metadata = {
  title: "Contact Us — NyayAI",
  description: "Get in touch with the NyayAI team.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-[#1e3a5f]">⚖ NyayAI</Link>
        <Link href="/login" className="text-sm text-[#1e3a5f] hover:underline font-medium">Sign In →</Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Contact Us</h1>
        <p className="text-gray-500 mb-10">We&apos;re here to help. Reach out for support, feedback, or partnership enquiries.</p>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">Email Support</p>
                <p className="text-sm text-gray-500">We respond within 24 hours</p>
              </div>
            </div>
            <a href="mailto:support@nyayasahayak.com" className="text-blue-600 hover:underline text-sm font-medium">
              support@nyayasahayak.com
            </a>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Phone className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">WhatsApp Support</p>
                <p className="text-sm text-gray-500">Mon–Sat, 10am–6pm IST</p>
              </div>
            </div>
            <a href="https://wa.me/919999999999" className="text-green-600 hover:underline text-sm font-medium">
              +91 99999 99999
            </a>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <MapPin className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">Registered Office</p>
                <p className="text-sm text-gray-500">ADE Technologies</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">India</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Mail className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">Enterprise / Partnerships</p>
                <p className="text-sm text-gray-500">For law firms and enterprises</p>
              </div>
            </div>
            <a href="mailto:enterprise@nyayasahayak.com" className="text-orange-600 hover:underline text-sm font-medium">
              enterprise@nyayasahayak.com
            </a>
          </div>
        </div>

        <div className="bg-[#1e3a5f] text-white rounded-xl p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Ready to get started?</h2>
          <p className="text-blue-200 mb-4 text-sm">Try NyayAI free for 14 days. No credit card required.</p>
          <Link href="/signup" className="inline-block bg-white text-[#1e3a5f] font-semibold px-6 py-2.5 rounded-lg hover:bg-blue-50 transition-colors text-sm">
            Start Free Trial →
          </Link>
        </div>
      </div>

      <footer className="border-t border-gray-200 py-6 text-center text-sm text-gray-400">
        <p>© {new Date().getFullYear()} NyayAI · <Link href="/privacy" className="hover:text-gray-600">Privacy</Link> · <Link href="/terms" className="hover:text-gray-600">Terms</Link></p>
      </footer>
    </div>
  );
}
