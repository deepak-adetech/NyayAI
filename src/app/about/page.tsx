import Link from "next/link";
import { Scale, Shield, Brain, Users, ArrowRight, CheckCircle } from "lucide-react";

export const metadata = {
  title: "About Us — NyayaSahayak",
  description: "Learn about NyayaSahayak, India's AI-powered legal workspace built for the modern Indian lawyer.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto border-b border-gray-100">
        <Link href="/" className="flex items-center gap-2">
          <Scale className="h-7 w-7 text-black" />
          <span className="text-black text-xl font-bold tracking-tight">NyayaSahayak</span>
          <span className="text-gray-400 text-sm ml-1">न्यायसहायक</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-gray-600 hover:text-black text-sm font-medium transition-colors">
            Sign In
          </Link>
          <Link
            href="/signup"
            className="bg-[#1e3a5f] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#162d4a] transition-colors"
          >
            Start Free Trial
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6">
        {/* Hero */}
        <div className="pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-600 px-4 py-1.5 rounded-full text-sm font-medium mb-8">
            <span className="h-1.5 w-1.5 bg-[#1e3a5f] rounded-full"></span>
            About NyayaSahayak
          </div>
          <h1 className="text-5xl font-bold text-black mb-6 leading-tight tracking-tight">
            Built for the Indian Lawyer.
            <br />
            <span className="text-gray-400">By People Who Understand Indian Law.</span>
          </h1>
          <p className="text-gray-500 text-xl leading-relaxed max-w-2xl mx-auto">
            NyayaSahayak (न्यायसहायक) — meaning <em>"Justice Helper"</em> — is an AI-powered
            legal workspace designed specifically for Indian advocates, from solo practitioners
            to mid-size law firms.
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 mb-16" />

        {/* Our Story */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-black mb-6">Our Story</h2>
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 text-lg leading-relaxed mb-4">
              India&apos;s legal landscape changed fundamentally in 2023 when the Bharatiya Nyaya
              Sanhita (BNS) replaced the Indian Penal Code (IPC). Overnight, every practising
              advocate had to navigate a new 358-section statute while still handling cases filed
              under the old IPC. Dual-statute litigation — citing both BNS and IPC sections in the
              same brief — became the new normal.
            </p>
            <p className="text-gray-600 text-lg leading-relaxed mb-4">
              At the same time, Indian advocates still rely on WhatsApp groups, physical case
              registers, and scattered hard drives to manage their practices. A senior advocate
              juggling 80 active cases across three different courts has no reliable system to
              track hearings, store documents, or keep clients informed.
            </p>
            <p className="text-gray-600 text-lg leading-relaxed">
              NyayaSahayak was built to solve exactly these problems. We combined deep knowledge
              of Indian procedural law with modern AI to create the workspace that Indian lawyers
              have always needed but never had.
            </p>
          </div>
        </section>

        {/* Mission */}
        <section className="mb-16 bg-[#1e3a5f] text-white rounded-2xl p-10">
          <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
          <p className="text-gray-300 text-xl leading-relaxed">
            To democratise access to legal technology in India — giving every advocate, regardless
            of firm size or city, the same quality of practice management tools that were once
            available only to large corporate law firms.
          </p>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: "Accuracy First", desc: "Every AI output is grounded in official BNS/IPC text. We never hallucinate legal sections." },
              { label: "India-Native", desc: "Hindi OCR, Devanagari support, Indian court systems, GST invoicing — built in from day one." },
              { label: "Lawyer Privacy", desc: "Your client data never leaves Indian servers. DPDP Act 2023 compliant by design." },
            ].map((v) => (
              <div key={v.label} className="border border-white/10 rounded-xl p-5">
                <CheckCircle className="h-5 w-5 text-white mb-3" />
                <h3 className="font-semibold text-white mb-2">{v.label}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* What We Do */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-black mb-8">What NyayaSahayak Does</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                icon: Brain,
                title: "BNS/IPC AI Mapping",
                desc: "Our AI reads case facts and identifies applicable BNS 2023 sections along with their corresponding IPC equivalents — including bail status, cognizability, and sentencing range.",
              },
              {
                icon: Scale,
                title: "Smart Case Management",
                desc: "Manage criminal, civil, family, consumer, labour, tax, writ, and arbitration matters in one place. Unlimited cases, documents, and hearing entries on Enterprise plans.",
              },
              {
                icon: Shield,
                title: "Hindi & Regional Language OCR",
                desc: "Upload scanned Hindi, Marathi, Gujarati, or Tamil FIRs and court documents. Our OCR extracts parties, dates, sections, and case numbers automatically.",
              },
              {
                icon: Users,
                title: "Client Portal",
                desc: "Give clients a secure, read-only portal to check their case status, next hearing date, and AI-generated case summaries — reducing repetitive phone calls by over 60%.",
              },
            ].map((item) => (
              <div key={item.title} className="border border-gray-100 rounded-xl p-6 hover:border-gray-300 transition-all">
                <div className="h-10 w-10 bg-[#1e3a5f] rounded-lg flex items-center justify-center mb-4">
                  <item.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-black font-semibold text-base mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Who We Are */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-black mb-6">Who We Are</h2>
          <p className="text-gray-600 text-lg leading-relaxed mb-4">
            NyayaSahayak is a product of <strong>ADE Technologies</strong>, a technology company
            focused on building AI-powered SaaS solutions for regulated industries in India. Our
            team combines legal domain expertise, enterprise software engineering, and a deep
            understanding of the practical challenges faced by Indian legal professionals.
          </p>
          <p className="text-gray-600 text-lg leading-relaxed mb-4">
            We work closely with practising advocates across Maharashtra, Delhi, Karnataka, and
            Gujarat to continuously improve the product based on real courtroom workflows — not
            theoretical assumptions.
          </p>
          <p className="text-gray-600 text-lg leading-relaxed">
            NyayaSahayak is not a law firm and does not provide legal advice. We build tools
            that help lawyers do their jobs better, faster, and with greater confidence.
          </p>
        </section>

        {/* Compliance & Trust */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-black mb-6">Compliance &amp; Data Trust</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              "DPDP Act 2023 (Digital Personal Data Protection) compliant",
              "All data stored on servers located within India",
              "AES-256 encryption for documents at rest",
              "TLS 1.3 in transit for all client communications",
              "Bar Council of India confidentiality guidelines respected",
              "No data sharing with third parties for advertising purposes",
              "Mandatory audit logs for all data access and changes",
              "Right to erasure — delete your data at any time",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <CheckCircle className="h-4 w-4 text-black flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-700">{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mb-24 text-center py-16 bg-gray-50 rounded-2xl">
          <h2 className="text-3xl font-bold text-black mb-4">Ready to modernise your practice?</h2>
          <p className="text-gray-500 mb-8 max-w-lg mx-auto">
            Join advocates across India who manage their cases smarter with NyayaSahayak.
            14-day free trial. No credit card required.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-[#1e3a5f] text-white px-8 py-3.5 rounded-lg font-semibold text-lg hover:bg-[#162d4a] transition-colors"
          >
            Start Your Free Trial
            <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="text-gray-400 text-sm mt-4">
            Questions?{" "}
            <a href="mailto:support@ade-technologies.com" className="text-black hover:underline">
              Contact us
            </a>
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-black" />
            <span className="font-semibold text-black text-sm">NyayaSahayak</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="/about" className="text-black font-medium">About</Link>
            <Link href="/login" className="hover:text-black transition-colors">Sign In</Link>
            <Link href="/signup" className="hover:text-black transition-colors">Sign Up</Link>
          </div>
          <p className="text-gray-400 text-xs">
            © 2026 NyayaSahayak · ADE Technologies · DPDP Act 2023 Compliant · Data stored in India
          </p>
        </div>
      </footer>
    </div>
  );
}
