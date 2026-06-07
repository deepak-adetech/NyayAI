"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Scale, ArrowUp, Loader2, AlertTriangle, Unlock, ChevronDown, ChevronUp, Sparkles, LogIn } from "lucide-react";

interface QuotaInfo {
  unlimited: boolean;
  loggedIn: boolean;
  questionsUsedToday: number | null;
  questionsRemainingToday: number | null;
  dailyLimit: number | null;
  memberDailyLimit: number;
}

interface QnaEntry {
  question: string;
  answer: string;
}

// SF Pro-style display stack for the big headline (Apple feel over global Inter)
const displayFont = '-apple-system, "SF Pro Display", system-ui, "Segoe UI", sans-serif';

const POPULAR_QUESTIONS = [
  "What is the punishment for theft under BNS 2023?",
  "How do I file an FIR if police refuses?",
  "What are my rights during police questioning?",
  "How to apply for bail in a non-bailable offence?",
  "What is the process for filing a consumer complaint?",
  "Can a landlord evict a tenant without notice?",
];

export default function AskLegalPage() {
  const { data: session } = useSession();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [history, setHistory] = useState<QnaEntry[]>([]);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function refreshQuota() {
    fetch("/api/ai/legal-query")
      .then((r) => r.json())
      .then((d) => setQuota(d))
      .catch(() => {});
  }

  useEffect(() => {
    refreshQuota();
    // re-check quota when auth state changes (login bumps 5 → 15)
  }, [session?.user?.id]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isLoggedIn = quota?.loggedIn ?? !!session?.user;
  const dailyLimit = quota?.dailyLimit ?? 5;
  const memberLimit = quota?.memberDailyLimit ?? 15;
  const canAsk = !limitReached && (!quota || quota.unlimited || (quota.questionsRemainingToday ?? 1) > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/legal-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });

      const data = await res.json();

      if (res.status === 429) {
        setLimitReached(true);
        setError(data.message ?? "Daily limit reached. Please upgrade for unlimited access.");
        return;
      }

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      const entry: QnaEntry = { question: q, answer: data.answer };
      setHistory((prev) => [entry, ...prev]);
      setExpandedIdx(0);
      setQuestion("");

      setQuota((prev) =>
        prev
          ? {
              ...prev,
              questionsUsedToday: data.questionsUsedToday,
              questionsRemainingToday: data.questionsRemainingToday,
              dailyLimit: data.dailyLimit,
              unlimited: data.unlimited,
            }
          : prev
      );
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  const remainingLabel = quota?.unlimited
    ? "Unlimited"
    : quota
    ? `${quota.questionsRemainingToday ?? dailyLimit} / ${dailyLimit} left today`
    : "";

  // Hero subtitle adapts to the visitor's tier
  const heroSubtitle = quota?.unlimited
    ? "You have unlimited access. Ask anything about Indian law and get a clear, instant answer."
    : isLoggedIn
    ? `Plain-language answers on Indian law, instantly. ${memberLimit} questions a day, free.`
    : "Plain-language answers on Indian law, instantly. No sign-up needed to start.";

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      {/* ── Top chrome: one brand mark only, hairline, translucent on scroll ── */}
      <header
        className={`sticky top-0 z-30 transition-colors duration-300 ${
          scrolled
            ? "bg-white/80 backdrop-blur-xl backdrop-saturate-150 border-b border-[#e0e0e0]"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="mx-auto max-w-[1400px] px-5 sm:px-8 h-14 flex items-center justify-between">
          <Link href="/ask" className="flex items-center gap-2 active:scale-95 transition-transform">
            <Scale className="w-[18px] h-[18px] text-[#1e3a5f]" />
            <span className="font-semibold text-[#1d1d1f] text-[15px] tracking-tight">NyayAI</span>
          </Link>
          <div className="flex items-center gap-4 sm:gap-5">
            {remainingLabel && (
              <span className="text-[13px] text-[#7a7a7a] hidden sm:block tabular-nums">{remainingLabel}</span>
            )}
            <Link
              href="/lawyers"
              className="text-[13px] text-[#7a7a7a] hover:text-[#1d1d1f] transition-colors hidden sm:block"
            >
              For Lawyers
            </Link>
            {isLoggedIn ? (
              <Link href="/dashboard" className="text-[13px] text-[#0066cc] hover:underline">
                Dashboard
              </Link>
            ) : (
              <Link href="/login?callbackUrl=/ask" className="text-[13px] text-[#0066cc] hover:underline">
                Sign in
              </Link>
            )}
            {!quota?.unlimited && (
              <Link
                href="/ask/upgrade"
                className="text-[13px] font-medium px-3.5 py-1.5 rounded-full bg-[#1e3a5f] text-white hover:bg-[#162d4a] active:scale-95 transition-all"
              >
                Upgrade
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── HERO: full-bleed, the search is the centrepiece ── */}
      <section className="relative -mt-14 pt-14">
        <div className="mx-auto max-w-[1100px] px-5 sm:px-8 pt-16 sm:pt-24 pb-14 sm:pb-20">
          {/* small eyebrow */}
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1.5 text-[13px] text-[#6e6e73] rounded-full border border-[#e0e0e0] bg-[#fafafc] px-3.5 py-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#1e3a5f]" />
              Trained on Indian legal texts
            </span>
          </div>

          {/* headline */}
          <h1
            className="mt-7 text-center font-semibold text-[#1d1d1f] text-[44px] leading-[1.05] sm:text-[68px] sm:leading-[1.04]"
            style={{ fontFamily: displayFont, letterSpacing: "-0.025em" }}
          >
            Indian law, answered.
          </h1>
          <p className="mx-auto mt-5 max-w-[640px] text-center text-[18px] sm:text-[21px] leading-snug text-[#6e6e73]">
            {heroSubtitle}
          </p>

          {/* ── The hero search — large, floating, brand focus ring ── */}
          <form onSubmit={handleSubmit} className="mt-10 sm:mt-12 mx-auto max-w-[920px]">
            <div
              className="group relative rounded-[28px] bg-white border border-[#e0e0e0] transition-shadow duration-300 focus-within:border-[#1e3a5f]/40"
              style={{ boxShadow: "rgba(0, 0, 0, 0.10) 0px 14px 44px -12px, rgba(0, 0, 0, 0.04) 0px 2px 8px" }}
            >
              {/* navy focus ring */}
              <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-2 ring-[#1e3a5f]/0 group-focus-within:ring-[#1e3a5f]/15 transition-all duration-300" />
              <textarea
                ref={textareaRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(e as unknown as React.FormEvent);
                }}
                maxLength={2000}
                placeholder="Ask anything about Indian law — your rights, a section, a procedure…"
                className="relative w-full bg-transparent px-6 sm:px-7 pt-6 sm:pt-7 pb-2 text-[18px] sm:text-[19px] leading-relaxed text-[#1d1d1f] placeholder-[#9a9aa0] resize-none focus:outline-none min-h-[112px] sm:min-h-[128px]"
                rows={3}
                disabled={loading || !canAsk}
              />
              <div className="relative flex items-center justify-between gap-3 px-4 sm:px-5 pb-4 pt-1">
                <span className="text-[12px] text-[#9a9aa0] tabular-nums pl-2">
                  {question.length}/2000
                  <span className="hidden sm:inline"> · ⌘↵ to send</span>
                </span>
                <button
                  type="submit"
                  disabled={loading || !question.trim() || !canAsk}
                  aria-label="Ask"
                  className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-[#1e3a5f] text-white text-[15px] font-medium hover:bg-[#162d4a] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100 transition-all"
                >
                  {loading ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : <ArrowUp className="w-[18px] h-[18px]" />}
                  <span>{loading ? "Thinking…" : "Ask"}</span>
                </button>
              </div>
            </div>
            {error && !limitReached && (
              <p className="mt-3 text-[14px] text-[#d70015] text-center">{error}</p>
            )}
          </form>

          {/* Popular questions as elegant chips — only on the empty canvas */}
          {history.length === 0 && (
            <div className="mt-9 sm:mt-10 mx-auto max-w-[920px]">
              <p className="text-center text-[13px] text-[#9a9aa0] mb-4">Try one of these</p>
              <div className="flex flex-wrap justify-center gap-2.5">
                {POPULAR_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      setQuestion(q);
                      textareaRef.current?.focus();
                    }}
                    disabled={!canAsk}
                    className="rounded-full border border-[#e0e0e0] bg-white px-4 py-2 text-[14px] text-[#424245] hover:border-[#1e3a5f]/50 hover:text-[#1e3a5f] hover:bg-[#fafafc] active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[#e0e0e0] disabled:hover:text-[#424245]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Status / quota / answers band on parchment for rhythm ── */}
      {(quota && !quota.unlimited) || limitReached || history.length > 0 ? (
        <section className="bg-[#f5f5f7] border-t border-[#e0e0e0]">
          <div className="mx-auto max-w-[760px] px-5 sm:px-8 py-12 sm:py-16">
            {/* Sign-in incentive for guests */}
            {quota && !quota.unlimited && !isLoggedIn && !limitReached && (
              <div className="mb-6 rounded-2xl bg-white border border-[#e0e0e0] px-5 py-4 flex items-center justify-between gap-4">
                <p className="text-[14px] text-[#1d1d1f] leading-snug">
                  <span className="font-semibold">Sign in free</span> to get {memberLimit} questions a day instead of {dailyLimit}.
                </p>
                <Link
                  href="/login?callbackUrl=/ask"
                  className="shrink-0 inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-full bg-[#1e3a5f] text-white hover:bg-[#162d4a] active:scale-95 transition-all"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign in
                </Link>
              </div>
            )}

            {/* Quota meter */}
            {quota && !quota.unlimited && !limitReached && (
              <div className="mb-8">
                <div className="flex justify-between text-[13px] text-[#6e6e73] mb-2">
                  <span>Daily free questions</span>
                  <span className="tabular-nums">{quota.questionsUsedToday ?? 0} / {dailyLimit} used</span>
                </div>
                <div className="h-1.5 bg-[#e0e0e0] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1e3a5f] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, ((quota.questionsUsedToday ?? 0) / dailyLimit) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Limit reached upsell */}
            {limitReached && (
              <div className="mb-8 rounded-2xl bg-white border border-[#e0e0e0] p-6">
                <div className="flex gap-3 items-start">
                  <AlertTriangle className="w-5 h-5 text-[#bf6a00] mt-0.5 shrink-0" />
                  <div className="w-full">
                    <p className="text-[16px] font-semibold text-[#1d1d1f] mb-1.5">Daily limit reached</p>
                    <p className="text-[14px] text-[#6e6e73] leading-relaxed mb-4">
                      {isLoggedIn
                        ? `You've used all ${dailyLimit} free questions for today. Upgrade for unlimited access.`
                        : `You've used all ${dailyLimit} free questions for today. Sign in for ${memberLimit} a day, or upgrade for unlimited.`}
                    </p>
                    <div className="flex flex-wrap gap-2.5">
                      {!isLoggedIn && (
                        <Link
                          href="/login?callbackUrl=/ask"
                          className="inline-flex items-center gap-1.5 text-[14px] font-medium px-4 py-2.5 rounded-full bg-white border border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#f5f5f7] active:scale-95 transition-all"
                        >
                          <LogIn className="w-4 h-4" />
                          Sign in — {memberLimit}/day free
                        </Link>
                      )}
                      <Link
                        href="/ask/upgrade"
                        className="inline-flex items-center gap-1.5 text-[14px] font-medium px-4 py-2.5 rounded-full bg-[#1e3a5f] text-white hover:bg-[#162d4a] active:scale-95 transition-all"
                      >
                        <Unlock className="w-4 h-4" />
                        Unlock unlimited — from ₹99/week
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Answers */}
            {history.length > 0 && (
              <div>
                <h2 className="text-[12px] font-semibold text-[#9a9aa0] uppercase tracking-[0.08em] mb-4">
                  Your questions
                </h2>
                <div className="space-y-3">
                  {history.map((entry, idx) => (
                    <div key={idx} className="bg-white rounded-2xl border border-[#e0e0e0] overflow-hidden">
                      <button
                        onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                        className="w-full flex items-start justify-between gap-3 p-5 text-left hover:bg-[#fafafc] transition-colors"
                      >
                        <span className="text-[15px] font-medium text-[#1d1d1f] leading-snug">{entry.question}</span>
                        {expandedIdx === idx ? (
                          <ChevronUp className="w-[18px] h-[18px] text-[#9a9aa0] shrink-0 mt-0.5" />
                        ) : (
                          <ChevronDown className="w-[18px] h-[18px] text-[#9a9aa0] shrink-0 mt-0.5" />
                        )}
                      </button>
                      {expandedIdx === idx && (
                        <div className="px-5 pb-5 border-t border-[#f0f0f0]">
                          <div className="pt-4 text-[15px] text-[#1d1d1f] leading-[1.6] whitespace-pre-wrap">
                            {entry.answer}
                          </div>
                          <p className="mt-5 text-[12px] text-[#9a9aa0] leading-relaxed">
                            This is general legal information, not professional legal advice. For your specific situation, consult a qualified advocate.
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {/* ── Bottom upgrade CTA (when not unlimited and not at limit) ── */}
      {!quota?.unlimited && !limitReached && (
        <section className="bg-white border-t border-[#e0e0e0]">
          <div className="mx-auto max-w-[760px] px-5 sm:px-8 py-16 sm:py-20 text-center">
            <h2
              className="text-[28px] sm:text-[34px] font-semibold text-[#1d1d1f] leading-tight"
              style={{ fontFamily: displayFont, letterSpacing: "-0.02em" }}
            >
              Need more than {isLoggedIn ? memberLimit : dailyLimit} a day?
            </h2>
            <p className="mt-3 text-[17px] text-[#6e6e73] leading-relaxed">
              Go unlimited on any Indian law topic — from ₹99/week.
            </p>
            <Link
              href="/ask/upgrade"
              className="mt-7 inline-flex items-center gap-2 text-[15px] font-medium px-6 py-3 rounded-full bg-[#1e3a5f] text-white hover:bg-[#162d4a] active:scale-95 transition-all"
            >
              <Unlock className="w-4 h-4" />
              Unlock unlimited
            </Link>
          </div>
        </section>
      )}

      {/* ── Footer ── */}
      <footer className="bg-[#f5f5f7] border-t border-[#e0e0e0]">
        <div className="mx-auto max-w-[1100px] px-5 sm:px-8 py-10 text-center">
          <p className="text-[12px] text-[#86868b] leading-relaxed">
            NyayAI is powered by AI and does not constitute legal advice.
          </p>
          <div className="mt-2.5 flex items-center justify-center gap-4 text-[12px] text-[#86868b]">
            <Link href="/terms" className="hover:text-[#1d1d1f] transition-colors">Terms</Link>
            <span className="text-[#d2d2d7]">·</span>
            <Link href="/privacy" className="hover:text-[#1d1d1f] transition-colors">Privacy</Link>
            <span className="text-[#d2d2d7]">·</span>
            <Link href="/lawyers" className="hover:text-[#1d1d1f] transition-colors">NyayAI for Lawyers</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
