"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Scale, Send, Loader2, AlertTriangle, Unlock, ChevronDown, ChevronUp, BookOpen } from "lucide-react";

interface QuotaInfo {
  unlimited: boolean;
  questionsUsedToday: number | null;
  questionsRemainingToday: number | null;
  dailyLimit: number;
}

interface QnaEntry {
  question: string;
  answer: string;
}

export default function AskLegalPage() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [history, setHistory] = useState<QnaEntry[]>([]);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/ai/legal-query")
      .then((r) => r.json())
      .then((d) => setQuota(d))
      .catch(() => {});
  }, []);

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
    ? `${quota.questionsRemainingToday ?? quota.dailyLimit} / ${quota.dailyLimit} remaining today`
    : "";

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Header */}
      <header className="bg-white border-b border-[#e0e0e0] sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-[#1e3a5f]" />
            <span className="font-semibold text-[#1d1d1f] text-sm">NyayAI</span>
          </Link>
          <div className="flex items-center gap-3">
            {remainingLabel && (
              <span className="text-xs text-[#7a7a7a] hidden sm:block">{remainingLabel}</span>
            )}
            <Link
              href="/ask/upgrade"
              className="text-xs font-medium px-3 py-1.5 rounded-full bg-[#1e3a5f] text-white hover:bg-[#162d4a] transition-colors"
            >
              Upgrade
            </Link>
            <Link href="/login" className="text-xs text-[#0066cc] hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1e3a5f] mb-4">
            <Scale className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-semibold text-[#1d1d1f] tracking-tight mb-2">
            Ask a Legal Question
          </h1>
          <p className="text-[#7a7a7a] text-base leading-relaxed">
            Get instant answers on Indian law — free, 5 questions per day.
            <br className="hidden sm:block" />
            Powered by an AI model trained on Indian legal texts.
          </p>
        </div>

        {/* Quota bar */}
        {quota && !quota.unlimited && (
          <div className="mb-5">
            <div className="flex justify-between text-xs text-[#7a7a7a] mb-1.5">
              <span>Daily free questions</span>
              <span>{quota.questionsUsedToday ?? 0} / {quota.dailyLimit} used</span>
            </div>
            <div className="h-1.5 bg-[#e0e0e0] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1e3a5f] rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, ((quota.questionsUsedToday ?? 0) / quota.dailyLimit) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Upgrade prompt when limit reached */}
        {limitReached && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex gap-3 items-start">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-900 mb-1">Daily limit reached</p>
              <p className="text-sm text-amber-800 mb-3">
                You&apos;ve used all 5 free questions for today. Upgrade for unlimited access.
              </p>
              <Link
                href="/ask/upgrade"
                className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full bg-[#1e3a5f] text-white hover:bg-[#162d4a] transition-colors"
              >
                <Unlock className="w-3.5 h-3.5" />
                Unlock unlimited — from ₹99/week
              </Link>
            </div>
          </div>
        )}

        {/* Question form */}
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="bg-white rounded-2xl border border-[#e0e0e0] shadow-sm overflow-hidden">
            <textarea
              ref={textareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(e as unknown as React.FormEvent);
              }}
              placeholder="E.g. What are my rights if I am arrested without a warrant? What is Section 498A BNS? How do I file an RTI?"
              className="w-full p-4 text-sm text-[#1d1d1f] placeholder-[#7a7a7a] resize-none focus:outline-none min-h-[100px]"
              rows={4}
              disabled={loading || !canAsk}
            />
            <div className="flex items-center justify-between px-4 py-2 border-t border-[#f0f0f0]">
              <span className="text-xs text-[#7a7a7a]">
                {question.length}/2000 · Ctrl+Enter to submit
              </span>
              <button
                type="submit"
                disabled={loading || !question.trim() || !canAsk}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1e3a5f] text-white text-sm font-medium hover:bg-[#162d4a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {loading ? "Thinking…" : "Ask"}
              </button>
            </div>
          </div>
          {error && !limitReached && (
            <p className="mt-2 text-sm text-red-600 px-1">{error}</p>
          )}
        </form>

        {/* Answers */}
        {history.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-[#7a7a7a] uppercase tracking-wider">
              Your questions
            </h2>
            {history.map((entry, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-[#e0e0e0] overflow-hidden">
                <button
                  onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                  className="w-full flex items-start justify-between gap-3 p-4 text-left hover:bg-[#f5f5f7] transition-colors"
                >
                  <div className="flex gap-3 items-start">
                    <BookOpen className="w-4 h-4 text-[#1e3a5f] mt-0.5 shrink-0" />
                    <span className="text-sm font-medium text-[#1d1d1f]">{entry.question}</span>
                  </div>
                  {expandedIdx === idx ? (
                    <ChevronUp className="w-4 h-4 text-[#7a7a7a] shrink-0 mt-0.5" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#7a7a7a] shrink-0 mt-0.5" />
                  )}
                </button>
                {expandedIdx === idx && (
                  <div className="px-4 pb-4 border-t border-[#f0f0f0]">
                    <div className="pt-4 text-sm text-[#1d1d1f] leading-relaxed whitespace-pre-wrap">
                      {entry.answer}
                    </div>
                    <p className="mt-4 text-xs text-[#7a7a7a] italic">
                      ⚠ This is general legal information, not professional legal advice. For your specific situation, consult a qualified advocate.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty state suggestions */}
        {history.length === 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-[#7a7a7a] uppercase tracking-wider mb-3">
              Popular questions
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                "What is the punishment for theft under BNS 2023?",
                "How do I file an FIR if police refuses?",
                "What are my rights during police questioning?",
                "How to apply for bail in a non-bailable offence?",
                "What is the process for filing a consumer complaint?",
                "Can a landlord evict a tenant without notice?",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setQuestion(q);
                    textareaRef.current?.focus();
                  }}
                  disabled={!canAsk}
                  className="text-left px-3 py-2.5 rounded-xl bg-white border border-[#e0e0e0] text-sm text-[#1d1d1f] hover:border-[#1e3a5f] hover:bg-[#f5f5f7] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Upgrade CTA (bottom) */}
        {!quota?.unlimited && !limitReached && (
          <div className="mt-10 p-5 rounded-2xl bg-[#1e3a5f] text-white text-center">
            <p className="text-sm font-semibold mb-1">Need more than 5 questions a day?</p>
            <p className="text-xs text-blue-200 mb-4">
              Upgrade for unlimited questions on any Indian law topic.
            </p>
            <Link
              href="/ask/upgrade"
              className="inline-flex items-center gap-1.5 text-sm font-medium px-5 py-2 rounded-full bg-white text-[#1e3a5f] hover:bg-blue-50 transition-colors"
            >
              <Unlock className="w-3.5 h-3.5" />
              Upgrade from ₹99/week
            </Link>
          </div>
        )}
      </main>

      <footer className="text-center py-8 text-xs text-[#7a7a7a]">
        <p>
          NyayAI is powered by AI and does not constitute legal advice.{" "}
          <Link href="/terms" className="underline hover:text-[#1d1d1f]">
            Terms
          </Link>{" "}
          ·{" "}
          <Link href="/privacy" className="underline hover:text-[#1d1d1f]">
            Privacy
          </Link>
        </p>
      </footer>
    </div>
  );
}
