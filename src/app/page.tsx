import Link from "next/link";
import {
  Scale,
  FileText,
  Bell,
  Brain,
  Shield,
  CheckCircle,
  ArrowRight,
  Briefcase,
  Calendar,
  FolderSync,
  Search,
  Users,
  Clock,
  Gavel,
  ScanText,
  MessageSquare,
  RefreshCw,
  Star,
  ChevronDown,
  Zap,
  Globe,
  Award,
  TrendingUp,
  Receipt,
  Languages,
  BookOpen,
  Monitor,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI Case Analysis with Risk Assessment",
    description:
      "Identify applicable BNS 2023 or IPC 1860 sections from case facts with AI-powered risk scoring. Get bail assessment, cognizability analysis, and sentencing range instantly.",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    icon: Gavel,
    title: "AI Judge Assessment & Bench Analysis",
    description:
      "Analyse judge disposition patterns, past rulings, and bench tendencies. Understand how specific judges rule on similar matters to build stronger courtroom strategy.",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: ScanText,
    title: "Smart Legal Tools",
    description:
      "Section Mapper for BNS/IPC cross-referencing, AI Notice Generator, Bail Application Drafter, and Draft Generator. All powered by Indian law-trained AI models.",
    color: "text-[#1e3a5f]",
    bg: "bg-slate-50",
  },
  {
    icon: RefreshCw,
    title: "eCourts Live Sync",
    description:
      "Automatic hearing capture from eCourts India via CNR number. Case status, hearing dates, orders, and judgments update in real time. No manual checking required.",
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    icon: Users,
    title: "Client Portal with Secure Login",
    description:
      "Give clients their own secure portal to track case progress, view documents, and check upcoming hearing dates. Reduce repetitive phone calls by over 60%.",
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    icon: FileText,
    title: "Document Management with AI Classification",
    description:
      "Upload FIRs, chargesheets, orders, and judgments. AI automatically classifies, indexes, and matches documents to the correct case. Hindi and regional language OCR built in.",
    color: "text-yellow-600",
    bg: "bg-yellow-50",
  },
  {
    icon: Receipt,
    title: "Invoice & Billing Management",
    description:
      "Generate GST-compliant invoices, track payments, and send payment reminders via email and WhatsApp. Integrated with Razorpay for seamless online collection.",
    color: "text-teal-600",
    bg: "bg-teal-50",
  },
  {
    icon: Languages,
    title: "Hindi/English Language Support",
    description:
      "Full bilingual support across the platform. Hindi and regional language OCR for FIRs and court documents. RAG-powered legal research across Indian statutes and precedents.",
    color: "text-red-600",
    bg: "bg-red-50",
  },
  {
    icon: BookOpen,
    title: "RAG-Powered Legal Research",
    description:
      "Retrieval-augmented generation trained on BNS, BNSS, BSA, IPC, CrPC, and Indian Evidence Act. Ask questions in natural language and get grounded, citation-backed answers.",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  {
    icon: Monitor,
    title: "Desktop Sync Agent",
    description:
      "Install the NyayAI desktop agent on Windows or Mac. It watches your local folders and automatically uploads documents to the correct case in the cloud.",
    color: "text-cyan-600",
    bg: "bg-cyan-50",
  },
];

const plans = [
  {
    name: "Starter",
    price: "999",
    yearlyPrice: "9,999",
    description: "For solo practitioners and junior advocates",
    color: "border-gray-200",
    badgeBg: "",
    badge: "",
    features: [
      "1 user account",
      "50 active cases",
      "500 documents per case",
      "AI section finder (BNS/IPC)",
      "eCourts auto-sync",
      "Hearing reminders (email)",
      "Document OCR",
      "Desktop file sync agent",
      "7-day document history",
      "Email support",
    ],
    notIncluded: ["Client portal", "Team access", "Priority support", "White-label"],
    cta: "Start Free Trial",
    ctaStyle: "border-2 border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white",
  },
  {
    name: "Professional",
    price: "1,999",
    yearlyPrice: "19,999",
    description: "For established advocates and small law firms",
    color: "border-[#1e3a5f]",
    badgeBg: "bg-[#1e3a5f]",
    badge: "Most Popular",
    features: [
      "3 user accounts",
      "Unlimited active cases",
      "Unlimited documents",
      "Full AI legal research suite",
      "eCourts auto-sync",
      "Hearing reminders (SMS + email + WhatsApp)",
      "Client portal (secure read-only access)",
      "Advanced Hindi/regional OCR",
      "Desktop file sync agent",
      "AI document drafting",
      "Full document history",
      "Priority email support",
    ],
    notIncluded: ["White-label", "Custom integrations"],
    cta: "Start Free Trial",
    ctaStyle: "bg-[#1e3a5f] text-white hover:bg-[#162d4a]",
  },
  {
    name: "Enterprise",
    price: "4,999",
    yearlyPrice: "49,999",
    description: "For large firms and legal departments",
    color: "border-gray-200",
    badgeBg: "",
    badge: "",
    features: [
      "10 user accounts",
      "Unlimited everything",
      "All Professional features",
      "White-label option",
      "Custom integrations",
      "Dedicated account manager",
      "SLA-backed uptime guarantee",
      "On-premise deployment option",
      "Custom AI training on firm data",
      "Phone and priority support",
    ],
    notIncluded: [],
    cta: "Contact Sales",
    ctaStyle: "border-2 border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white",
  },
];

const testimonials = [
  {
    name: "Adv. Ramesh Bhosale",
    location: "Pune District Court",
    practice: "Criminal Law",
    text: "I handle over 80 criminal cases simultaneously. Before NyayAI I was using a mix of WhatsApp groups, Excel sheets, and sticky notes. Now everything is centralized. The eCourts sync alone saves me 2 hours every day.",
    rating: 5,
    initials: "RB",
  },
  {
    name: "Adv. Priya Krishnamurthy",
    location: "Madras High Court",
    practice: "Constitutional and Civil Law",
    text: "The BNS section finder is remarkably accurate. I tested it against my own analysis for 15 cases and it matched perfectly on 14 of them. The AI understands the post-July 2024 transition better than some junior advocates I have worked with.",
    rating: 5,
    initials: "PK",
  },
  {
    name: "Adv. Sukhbir Singh Dhaliwal",
    location: "Punjab and Haryana High Court",
    practice: "Family and Property Law",
    text: "My clients were constantly calling to ask about case dates and status. Since I set up the client portal, those calls have dropped by 80 percent. Clients check the portal themselves and are actually more satisfied. The pricing is very reasonable for what you get.",
    rating: 5,
    initials: "SD",
  },
];

const faqs = [
  {
    q: "How is NyayAI priced compared to other legal software?",
    a: "NyayAI is priced approximately 40% below the market average for Indian legal SaaS platforms. Our Starter plan at Rs 999 per month gives you features that competitors charge Rs 1,500 to Rs 2,000 for. We believe professional legal tools should be accessible to all advocates, not just large firms.",
  },
  {
    q: "How does the eCourts integration work?",
    a: "You enter your case's CNR (Case Number Record) number when creating a case in NyayAI. Our system calls the eCourts India API to auto-populate all case details: parties, acts charged, hearing history, orders, and judgment status. We then poll for updates daily and notify you when anything changes.",
  },
  {
    q: "Does the AI support both BNS 2023 and IPC 1860?",
    a: "Yes. The AI is trained on both the Bharatiya Nyaya Sanhita 2023 and the Indian Penal Code 1860. When you enter case facts and specify the date of offence, the system automatically applies the correct law: IPC for offences before July 1, 2024, and BNS for offences from July 1, 2024 onward.",
  },
  {
    q: "How is my data protected?",
    a: "All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We store data on servers located in India, in compliance with Indian data residency requirements. We do not share your case data with any third party. Each firm's data is logically isolated. We maintain audit logs of all access events.",
  },
  {
    q: "What happens after the 14-day free trial?",
    a: "After the trial ends, you choose a paid plan to continue. All your data, cases, and documents remain intact. You are never charged without consent. If you do not upgrade, your account enters a read-only grace period for 30 days, during which you can export all your data.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <Scale className="h-7 w-7 text-[#1e3a5f]" />
            <span className="text-[#1e3a5f] text-xl font-bold tracking-tight">NyayAI</span>
            <span className="text-gray-400 text-sm ml-1 hidden sm:inline">AI-Powered Legal Intelligence</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <Link href="#features" className="hover:text-[#1e3a5f] transition-colors">Features</Link>
            <Link href="#ecourts" className="hover:text-[#1e3a5f] transition-colors">eCourts</Link>
            <Link href="#pricing" className="hover:text-[#1e3a5f] transition-colors">Pricing</Link>
            <Link href="#faq" className="hover:text-[#1e3a5f] transition-colors">FAQ</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-gray-700 hover:text-[#1e3a5f] text-sm font-medium transition-colors hidden sm:block">
              Sign In
            </Link>
            <Link
              href="/signup"
              className="bg-[#1e3a5f] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#162d4a] transition-colors"
            >
              Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="bg-white pt-16 pb-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Zap className="h-3.5 w-3.5" />
            AI-Powered Legal Intelligence for Indian Advocates
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-[#1e3a5f] tracking-tight leading-tight mb-6">
            NyayAI<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1e3a5f] to-blue-500">
              AI-Powered Legal Intelligence
            </span>
            <br />for Indian Advocates
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
            From case analysis to courtroom strategy &mdash; NyayAI brings artificial intelligence to every aspect
            of legal practice. Manage cases, analyse judges, draft documents, and stay ahead with real-time court data.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 bg-[#1e3a5f] text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[#162d4a] transition-colors shadow-lg shadow-blue-900/20"
            >
              Start Free Trial
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-700 px-8 py-4 rounded-xl font-semibold text-lg hover:border-[#1e3a5f] hover:text-[#1e3a5f] transition-colors"
            >
              See How It Works
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {[
              { icon: Award, label: "BNS 2023 Ready" },
              { icon: Globe, label: "eCourts Integrated" },
              { icon: Clock, label: "14-Day Free Trial" },
              { icon: Shield, label: "Data Stored in India" },
            ].map((badge) => (
              <div key={badge.label} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-700 text-sm px-4 py-2 rounded-full">
                <badge.icon className="h-4 w-4 text-[#1e3a5f]" />
                {badge.label}
              </div>
            ))}
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto pt-8 border-t border-gray-100">
            {[
              { stat: "1,000+", label: "Advocates" },
              { stat: "50,000+", label: "Cases Managed" },
              { stat: "200+", label: "Courts Covered" },
              { stat: "99.9%", label: "Uptime SLA" },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <div className="text-2xl font-bold text-[#1e3a5f]">{item.stat}</div>
                <div className="text-sm text-gray-500 mt-0.5">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROBLEM / SOLUTION */}
      <section className="bg-gray-50 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#1e3a5f] mb-4">
              Indian advocates waste 3+ hours daily on paperwork
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Chasing case status on eCourts, managing files over WhatsApp, manually tracking hearing dates, and drafting repetitive documents by hand. NyayAI eliminates all of it.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-8 border border-red-100">
              <div className="text-red-600 font-semibold text-sm uppercase tracking-wide mb-4">Before NyayAI</div>
              <ul className="space-y-3">
                {[
                  "Manually check eCourts website for each case daily",
                  "Store documents across WhatsApp, email, and USB drives",
                  "Forget hearing dates without a centralized reminder system",
                  "Clients call repeatedly asking for case updates",
                  "Draft every petition from scratch using old templates",
                  "Apply wrong IPC/BNS section due to the 2024 law transition",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-gray-700 text-sm">
                    <span className="text-red-400 mt-0.5 flex-shrink-0">✕</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-2xl p-8 border border-green-100">
              <div className="text-green-600 font-semibold text-sm uppercase tracking-wide mb-4">After NyayAI</div>
              <ul className="space-y-3">
                {[
                  "eCourts syncs automatically. Alerts arrive before you even check",
                  "All documents centralized, searchable, and backed up securely",
                  "SMS, email, and WhatsApp reminders sent 3 days and 1 day before hearings",
                  "Client portal gives clients real-time read-only case access",
                  "AI drafts petitions and applications from case facts in minutes",
                  "AI automatically applies BNS or IPC based on the offence date",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-gray-700 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="bg-white py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-[#1e3a5f] mb-4">
              Everything a modern Indian advocate needs
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Ten powerful modules, fully integrated, working together so you can focus on winning cases rather than managing paperwork.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-shadow group">
                <div className={`w-12 h-12 ${f.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <f.icon className={`h-6 w-6 ${f.color}`} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ECOURTS SPOTLIGHT */}
      <section id="ecourts" className="bg-gray-50 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-3xl border border-blue-100 overflow-hidden">
            <div className="grid md:grid-cols-2 gap-0">
              <div className="p-10 md:p-12">
                <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 uppercase tracking-wide">
                  <Globe className="h-3.5 w-3.5" />
                  Live eCourts Integration
                </div>
                <h2 className="text-3xl font-bold text-[#1e3a5f] mb-4">
                  India&apos;s only legal platform with live eCourts sync
                </h2>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  Stop manually checking the eCourts website for each case. NyayAI connects directly to the eCourts India API, pulling all case data automatically and alerting you the moment anything changes.
                </p>
                <div className="space-y-5">
                  {[
                    {
                      num: "1",
                      title: "Enter the CNR number",
                      desc: "Add your case CNR when creating a new matter in NyayAI.",
                    },
                    {
                      num: "2",
                      title: "Case details auto-populate",
                      desc: "Parties, acts, sections, previous hearing dates, orders, and current status are filled in automatically from eCourts.",
                    },
                    {
                      num: "3",
                      title: "Get alerts automatically",
                      desc: "Receive SMS, email, and WhatsApp reminders for every upcoming hearing. No manual tracking required.",
                    },
                  ].map((step) => (
                    <div key={step.num} className="flex gap-4">
                      <div className="w-8 h-8 bg-[#1e3a5f] text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {step.num}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{step.title}</div>
                        <div className="text-gray-500 text-sm mt-0.5">{step.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 mt-8 bg-[#1e3a5f] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#162d4a] transition-colors"
                >
                  Try eCourts Sync Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="bg-gradient-to-br from-[#1e3a5f] to-blue-800 p-10 md:p-12 flex flex-col justify-center">
                <div className="space-y-4">
                  {[
                    { label: "Courts covered across India", value: "200+" },
                    { label: "Cases synced today", value: "3,847" },
                    { label: "Hearing alerts sent", value: "12,300+" },
                    { label: "Avg. time saved per advocate", value: "2.5 hrs/day" },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-white/10 rounded-xl p-4 border border-white/20">
                      <div className="text-white text-2xl font-bold">{stat.value}</div>
                      <div className="text-blue-200 text-sm mt-0.5">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI SECTION */}
      <section className="bg-[#1e3a5f] py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 text-blue-200 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 uppercase tracking-wide">
                <Brain className="h-3.5 w-3.5" />
                Powered by AI
              </div>
              <h2 className="text-3xl font-bold text-white mb-6">
                AI trained on Indian law.<br />Not generic legal tools.
              </h2>
              <p className="text-blue-200 mb-8 leading-relaxed">
                Generic AI tools know nothing about BNS 2023 or the IPC-to-BNS transition. NyayAI&apos;s AI is built specifically for Indian advocates, trained on Indian statutes, procedural codes, and Supreme Court guidelines.
              </p>
              <ul className="space-y-3">
                {[
                  "Bharatiya Nyaya Sanhita 2023 complete section coverage",
                  "Indian Penal Code 1860 for pre-July 2024 offences",
                  "BNSS and CrPC procedural guidance",
                  "Bail assessment with cognizability analysis",
                  "Supreme Court and High Court precedent awareness",
                  "Regional language FIR interpretation",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-blue-100 text-sm">
                    <CheckCircle className="h-4 w-4 text-blue-300 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-4">
              <div className="bg-white/10 rounded-2xl p-6 border border-white/20">
                <div className="text-blue-200 text-xs font-semibold uppercase tracking-wide mb-3">Sample: Section Identification</div>
                <div className="text-white text-sm mb-3">
                  <span className="text-blue-300">Input:</span> &quot;Accused attacked complainant with iron rod causing grievous hurt, incident on 15 August 2024&quot;
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="text-green-300 text-xs font-semibold mb-1">AI Result: BNS 2023 applies (post July 2024)</div>
                  <div className="text-white text-xs">BNS Section 117 (Voluntarily causing grievous hurt), Non-Bailable, Cognizable. Bail assessment: Bail possible with surety. Recommended: File complaint under Section 117 BNS before the Judicial Magistrate.</div>
                </div>
              </div>
              <div className="bg-white/10 rounded-2xl p-6 border border-white/20">
                <div className="text-blue-200 text-xs font-semibold uppercase tracking-wide mb-3">Research Query</div>
                <div className="text-white text-sm mb-3">
                  &quot;Anticipatory bail provisions under BNSS for financial fraud cases&quot;
                </div>
                <div className="bg-white/10 rounded-lg p-3 text-white text-xs leading-relaxed">
                  Under BNSS Section 484, anticipatory bail may be sought before arrest. For financial fraud matters involving amounts above Rs 1 crore, courts generally require a higher standard of satisfaction...
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-[#1e3a5f] mb-4">Get started in three steps</h2>
          <p className="text-gray-600 mb-14">No lengthy onboarding. No data migration headaches. Be productive within the hour.</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                num: "01",
                icon: Users,
                title: "Create your account",
                desc: "Sign up with your email. No credit card required. Your 14-day trial starts immediately with all features unlocked.",
              },
              {
                num: "02",
                icon: Briefcase,
                title: "Add your cases",
                desc: "Enter a CNR number and let eCourts auto-fill the case, or create a case manually in 60 seconds. Import from existing files.",
              },
              {
                num: "03",
                icon: Zap,
                title: "Let AI and sync do the work",
                desc: "AI monitors hearing dates, syncs eCourts, reminds you and your clients automatically. You focus on advocacy.",
              },
            ].map((step) => (
              <div key={step.num} className="relative">
                <div className="text-6xl font-extrabold text-gray-50 absolute -top-4 left-1/2 -translate-x-1/2 select-none">{step.num}</div>
                <div className="relative z-10 bg-gray-50 rounded-2xl p-8">
                  <div className="w-12 h-12 bg-[#1e3a5f] rounded-xl flex items-center justify-center mx-auto mb-4">
                    <step.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="bg-gray-50 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#1e3a5f] mb-4">
              Transparent pricing, 40% below market average
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              All plans include a 14-day free trial. Annual plans save up to 2 months of fees. No setup fees, no hidden charges.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 items-start">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`bg-white rounded-2xl border-2 ${plan.color} p-8 relative ${
                  plan.badge ? "shadow-xl scale-[1.02]" : ""
                }`}
              >
                {plan.badge && (
                  <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 ${plan.badgeBg} text-white text-xs font-bold px-4 py-1.5 rounded-full`}>
                    {plan.badge}
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                  <p className="text-gray-500 text-sm mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-gray-500 text-sm">Rs</span>
                    <span className="text-4xl font-extrabold text-[#1e3a5f]">{plan.price}</span>
                    <span className="text-gray-400 text-sm">/month</span>
                  </div>
                  <div className="text-gray-400 text-xs mt-1">Rs {plan.yearlyPrice}/year (save 2 months)</div>
                </div>
                <Link
                  href={plan.name === "Enterprise" ? "/contact" : "/signup"}
                  className={`w-full block text-center py-3 rounded-xl font-semibold transition-colors mb-6 ${plan.ctaStyle}`}
                >
                  {plan.cta}
                </Link>
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                  {plan.notIncluded.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-400">
                      <span className="mt-0.5 flex-shrink-0 text-gray-300">✕</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/pricing" className="text-[#1e3a5f] text-sm font-medium hover:underline inline-flex items-center gap-1">
              View full feature comparison
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#1e3a5f] mb-4">Trusted by advocates across India</h2>
            <p className="text-gray-600">From district courts to High Courts, advocates rely on NyayAI every day.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-6">&quot;{t.text}&quot;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#1e3a5f] rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {t.initials}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{t.name}</div>
                    <div className="text-gray-500 text-xs">{t.location} &middot; {t.practice}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-gray-50 py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#1e3a5f] mb-4">Frequently asked questions</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-semibold text-gray-900 text-sm leading-relaxed">{faq.q}</h3>
                  <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mt-3">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-[#1e3a5f] py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Scale className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">
            Start your 14-day free trial today
          </h2>
          <p className="text-blue-200 mb-8 leading-relaxed">
            No credit card required. All features included. Cancel anytime. Join over 1,000 advocates who are already managing their practice smarter with NyayAI.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 bg-white text-[#1e3a5f] px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition-colors"
            >
              Start Free Trial
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 border-2 border-white/30 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:border-white transition-colors"
            >
              Sign In
            </Link>
          </div>
          <p className="text-blue-300 text-sm mt-6">
            Free trial includes all features. No setup fees. 14-day money-back guarantee on paid plans.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white border-t border-gray-100 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <Scale className="h-6 w-6 text-[#1e3a5f]" />
                <span className="font-bold text-[#1e3a5f]">NyayAI</span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">
                AI-Powered Legal Intelligence for Indian advocates.
              </p>
            </div>
            <div>
              <div className="font-semibold text-gray-900 text-sm mb-3">Product</div>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><Link href="#features" className="hover:text-[#1e3a5f] transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-[#1e3a5f] transition-colors">Pricing</Link></li>
                <li><Link href="#ecourts" className="hover:text-[#1e3a5f] transition-colors">eCourts Sync</Link></li>
                <li><Link href="/sync" className="hover:text-[#1e3a5f] transition-colors">Desktop Sync Agent</Link></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-gray-900 text-sm mb-3">Company</div>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><Link href="/about" className="hover:text-[#1e3a5f] transition-colors">About</Link></li>
                <li><Link href="/contact" className="hover:text-[#1e3a5f] transition-colors">Contact</Link></li>
                <li><Link href="/privacy" className="hover:text-[#1e3a5f] transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-[#1e3a5f] transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-gray-900 text-sm mb-3">Support</div>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="mailto:support@nyayasahayak.com" className="hover:text-[#1e3a5f] transition-colors">support@nyayasahayak.com</a></li>
                <li><Link href="/signup" className="hover:text-[#1e3a5f] transition-colors">Start Free Trial</Link></li>
                <li><Link href="/login" className="hover:text-[#1e3a5f] transition-colors">Sign In</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-gray-400 text-sm">&copy; 2025 NyayAI. All rights reserved. Made in India for Indian advocates.</p>
            <div className="flex items-center gap-1 text-gray-400 text-xs">
              <Shield className="h-3.5 w-3.5" />
              Data stored in India. PDPB compliant.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
