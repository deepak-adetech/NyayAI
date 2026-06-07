"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Scale,
  BadgeCheck,
  Star,
  MapPin,
  Languages,
  Briefcase,
  MessageSquare,
  Globe,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  ChevronLeft,
} from "lucide-react";
import { type LawyerCardData } from "@/components/LawyerCard";
import { specialtyLabel } from "@/lib/specialty";

// SF Pro-style display stack for the big headline (Apple feel over global Inter)
const displayFont = '-apple-system, "SF Pro Display", system-ui, "Segoe UI", sans-serif';

// The /api/lawyers/[slug] route returns LawyerCardData plus these contact fields.
type LawyerDetail = LawyerCardData & {
  phone: string | null;
  publicEmail: string | null;
  website: string | null;
  barCouncilNumber: string | null;
  barCouncilState: string | null;
  consultationFeePaise: number | null;
};

interface Review {
  id: string;
  authorName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

// Render a row of stars for display.
function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={
            n <= Math.round(value)
              ? "fill-[#f5a623] text-[#f5a623]"
              : "fill-none text-[#d2d2d7]"
          }
          style={{ width: size, height: size }}
        />
      ))}
    </span>
  );
}

function ProfileHeaderBar() {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl backdrop-saturate-150 border-b border-[#e0e0e0]">
      <div className="mx-auto max-w-[920px] px-5 sm:px-8 h-14 flex items-center justify-between">
        <Link href="/ask" className="flex items-center gap-2 active:scale-95 transition-transform">
          <Scale className="w-[18px] h-[18px] text-[#1e3a5f]" />
          <span className="font-semibold text-[#1d1d1f] text-[15px] tracking-tight">NyayAI</span>
        </Link>
        <Link
          href="/find-a-lawyer"
          className="inline-flex items-center gap-1.5 text-[13px] text-[#0066cc] hover:underline"
        >
          <ChevronLeft className="w-4 h-4" />
          All lawyers
        </Link>
      </div>
    </header>
  );
}

export default function LawyerProfilePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const { data: session } = useSession();

  const [lawyer, setLawyer] = useState<LawyerDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!slug) return;
    try {
      const res = await fetch(`/api/lawyers/${slug}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setNotFound(true);
        return;
      }
      setLawyer(data.lawyer);
      setReviews(data.reviews ?? []);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <ProfileHeaderBar />
        <div className="flex justify-center py-32">
          <Loader2 className="w-6 h-6 animate-spin text-[#9a9aa0]" />
        </div>
      </div>
    );
  }

  // ── 404 ──
  if (notFound || !lawyer) {
    return (
      <div className="min-h-screen bg-white">
        <ProfileHeaderBar />
        <div className="mx-auto max-w-[560px] px-5 sm:px-8 py-28 text-center">
          <h1
            className="text-[28px] sm:text-[34px] font-semibold text-[#1d1d1f] leading-tight"
            style={{ fontFamily: displayFont, letterSpacing: "-0.02em" }}
          >
            Lawyer not found
          </h1>
          <p className="mt-3 text-[16px] text-[#6e6e73] leading-relaxed">
            This profile may have been removed or the link is incorrect.
          </p>
          <Link
            href="/find-a-lawyer"
            className="mt-7 inline-flex items-center gap-2 text-[15px] font-medium px-6 py-3 rounded-full bg-[#1e3a5f] text-white hover:bg-[#162d4a] active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to the directory
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <ProfileHeaderBar />

      {/* ── Profile header ── */}
      <section className="mx-auto max-w-[920px] px-5 sm:px-8 pt-8 sm:pt-12">
        <div className="flex flex-col sm:flex-row gap-5 sm:gap-7">
          {/* Avatar */}
          <div className="shrink-0">
            {lawyer.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lawyer.photoUrl}
                alt={lawyer.fullName}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover bg-[#f5f5f7]"
              />
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center text-[30px] font-semibold">
                {initials(lawyer.fullName)}
              </div>
            )}
          </div>

          {/* Identity */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1
                className="text-[28px] sm:text-[34px] font-semibold text-[#1d1d1f] leading-tight"
                style={{ fontFamily: displayFont, letterSpacing: "-0.02em" }}
              >
                {lawyer.fullName}
              </h1>
              {lawyer.isVerified && (
                <span className="inline-flex items-center gap-1 text-[13px] font-medium text-[#1e3a5f]">
                  <BadgeCheck className="w-5 h-5" />
                  Verified
                </span>
              )}
            </div>

            {/* Meta row */}
            <div className="mt-2 flex items-center gap-x-4 gap-y-1.5 flex-wrap text-[14px] text-[#6e6e73]">
              {lawyer.ratingCount > 0 && (
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                  <Stars value={lawyer.ratingAvg} />
                  <span className="font-medium text-[#1d1d1f]">{lawyer.ratingAvg.toFixed(1)}</span>
                  <span className="text-[#9a9aa0]">({lawyer.ratingCount})</span>
                </span>
              )}
              {(lawyer.city || lawyer.state) && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {[lawyer.city, lawyer.state].filter(Boolean).join(", ")}
                  {lawyer.distanceKm != null && (
                    <span className="text-[#9a9aa0]">· {lawyer.distanceKm} km</span>
                  )}
                </span>
              )}
              {lawyer.languages.length > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Languages className="w-4 h-4" />
                  {lawyer.languages.join(", ")}
                </span>
              )}
            </div>

            {/* Specialty chips + free badge */}
            <div className="mt-3 flex flex-wrap gap-2">
              {lawyer.specialties.map((code) => (
                <span
                  key={code}
                  className="text-[13px] text-[#424245] bg-[#f5f5f7] rounded-full px-3 py-1"
                >
                  {specialtyLabel(code)}
                </span>
              ))}
              {lawyer.willingToAnswerFree && (
                <span className="text-[13px] font-medium text-[#1e7a3d] bg-[#e8f6ed] rounded-full px-3 py-1">
                  Answers questions free
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="mt-7 grid grid-cols-3 rounded-2xl border border-[#e0e0e0] bg-[#f5f5f7] divide-x divide-[#e0e0e0] overflow-hidden">
          <div className="px-4 py-4 text-center">
            <div className="text-[22px] font-semibold text-[#1d1d1f] tabular-nums">
              {lawyer.questionsAnswered}
            </div>
            <div className="mt-0.5 text-[12px] text-[#6e6e73]">Questions answered</div>
          </div>
          <div className="px-4 py-4 text-center">
            <div className="text-[22px] font-semibold text-[#1d1d1f] tabular-nums">
              {lawyer.ratingCount > 0 ? lawyer.ratingAvg.toFixed(1) : "—"}
            </div>
            <div className="mt-0.5 text-[12px] text-[#6e6e73]">
              {lawyer.ratingCount > 0 ? `Rating (${lawyer.ratingCount})` : "No ratings yet"}
            </div>
          </div>
          <div className="px-4 py-4 text-center">
            <div className="text-[22px] font-semibold text-[#1d1d1f] tabular-nums">
              {lawyer.yearsExperience > 0 ? lawyer.yearsExperience : "—"}
            </div>
            <div className="mt-0.5 text-[12px] text-[#6e6e73]">Years experience</div>
          </div>
        </div>
      </section>

      {/* ── Bio + sidebar ── */}
      <section className="mx-auto max-w-[920px] px-5 sm:px-8 pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 lg:gap-10">
          {/* Bio + details */}
          <div>
            {lawyer.bio && (
              <div>
                <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#9a9aa0] mb-3">
                  About
                </h2>
                <p className="text-[16px] sm:text-[17px] leading-[1.6] text-[#1d1d1f] whitespace-pre-wrap">
                  {lawyer.bio}
                </p>
              </div>
            )}

            {/* Credentials */}
            <div className={lawyer.bio ? "mt-8" : ""}>
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#9a9aa0] mb-3">
                Practice
              </h2>
              <dl className="space-y-2.5 text-[15px]">
                {lawyer.yearsExperience > 0 && (
                  <div className="flex items-center gap-2.5 text-[#1d1d1f]">
                    <Briefcase className="w-4 h-4 text-[#9a9aa0] shrink-0" />
                    <span>{lawyer.yearsExperience} years of experience</span>
                  </div>
                )}
                {lawyer.barCouncilNumber && (
                  <div className="flex items-center gap-2.5 text-[#1d1d1f]">
                    <BadgeCheck className="w-4 h-4 text-[#9a9aa0] shrink-0" />
                    <span>
                      Bar Council No. {lawyer.barCouncilNumber}
                      {lawyer.barCouncilState ? ` · ${lawyer.barCouncilState}` : ""}
                    </span>
                  </div>
                )}
                {lawyer.website && (
                  <div className="flex items-center gap-2.5">
                    <Globe className="w-4 h-4 text-[#9a9aa0] shrink-0" />
                    <a
                      href={lawyer.website.startsWith("http") ? lawyer.website : `https://${lawyer.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0066cc] hover:underline truncate"
                    >
                      {lawyer.website.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                )}
                {lawyer.consultationFeePaise != null && lawyer.consultationFeePaise > 0 && (
                  <div className="flex items-center gap-2.5 text-[#1d1d1f]">
                    <MessageSquare className="w-4 h-4 text-[#9a9aa0] shrink-0" />
                    <span>
                      Consultation from ₹{(lawyer.consultationFeePaise / 100).toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Connect form (sticky on desktop) */}
          <div className="lg:sticky lg:top-20 self-start">
            <ConnectForm
              slug={lawyer.slug as string}
              lawyerName={lawyer.fullName}
              free={lawyer.willingToAnswerFree}
              specialties={lawyer.specialties}
            />
          </div>
        </div>
      </section>

      {/* ── Reviews ── */}
      <section className="mx-auto max-w-[920px] px-5 sm:px-8 pt-12 pb-20">
        <div className="flex items-end justify-between gap-3 mb-5">
          <h2
            className="text-[24px] sm:text-[28px] font-semibold text-[#1d1d1f] leading-tight"
            style={{ fontFamily: displayFont, letterSpacing: "-0.02em" }}
          >
            Reviews
          </h2>
          {lawyer.ratingCount > 0 && (
            <span className="inline-flex items-center gap-2 text-[14px] text-[#6e6e73] tabular-nums">
              <Stars value={lawyer.ratingAvg} />
              <span className="font-medium text-[#1d1d1f]">{lawyer.ratingAvg.toFixed(1)}</span>
              <span className="text-[#9a9aa0]">({lawyer.ratingCount})</span>
            </span>
          )}
        </div>

        {/* Review list */}
        {reviews.length > 0 ? (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-2xl border border-[#e0e0e0] bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[15px] font-medium text-[#1d1d1f]">{r.authorName}</span>
                  <span className="text-[12px] text-[#9a9aa0]">{formatDate(r.createdAt)}</span>
                </div>
                <div className="mt-1.5">
                  <Stars value={r.rating} />
                </div>
                {r.comment && (
                  <p className="mt-2.5 text-[15px] leading-[1.6] text-[#1d1d1f] whitespace-pre-wrap">
                    {r.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-[#e0e0e0] bg-[#f5f5f7] px-5 py-8 text-center text-[14px] text-[#6e6e73]">
            No reviews yet. Be the first to share your experience.
          </p>
        )}

        {/* Leave a review */}
        <div className="mt-8">
          <ReviewForm
            slug={lawyer.slug as string}
            defaultName={session?.user?.name ?? ""}
            onSubmitted={load}
          />
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#f5f5f7] border-t border-[#e0e0e0]">
        <div className="mx-auto max-w-[920px] px-5 sm:px-8 py-10 text-center">
          <p className="text-[12px] text-[#86868b] leading-relaxed">
            NyayAI is powered by AI and does not constitute legal advice.
          </p>
          <div className="mt-2.5 flex items-center justify-center gap-4 text-[12px] text-[#86868b]">
            <Link href="/find-a-lawyer" className="hover:text-[#1d1d1f] transition-colors">All lawyers</Link>
            <span className="text-[#d2d2d7]">·</span>
            <Link href="/terms" className="hover:text-[#1d1d1f] transition-colors">Terms</Link>
            <span className="text-[#d2d2d7]">·</span>
            <Link href="/privacy" className="hover:text-[#1d1d1f] transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Connect form ──────────────────────────────────────────────
function ConnectForm({
  slug,
  lawyerName,
  free,
  specialties,
}: {
  slug: string;
  lawyerName: string;
  free: boolean;
  specialties: string[];
}) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const firstName = lawyerName.split(/\s+/)[0] ?? lawyerName;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !contact.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/lawyers/${slug}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          contact: contact.trim(),
          message: message.trim() || undefined,
          specialty: specialties[0] || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-[#e0e0e0] bg-white p-6 text-center">
        <CheckCircle2 className="mx-auto w-10 h-10 text-[#1e7a3d]" />
        <p className="mt-3 text-[17px] font-semibold text-[#1d1d1f]">Request sent</p>
        <p className="mt-1.5 text-[14px] text-[#6e6e73] leading-relaxed">
          {firstName} has your details and will reach out to you directly. Thank you.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-[#e0e0e0] bg-white p-5 sm:p-6">
      <h3 className="text-[18px] font-semibold text-[#1d1d1f]">
        {free ? `Ask ${firstName} free` : `Connect with ${firstName}`}
      </h3>
      <p className="mt-1 text-[13px] text-[#6e6e73] leading-relaxed">
        {free
          ? "Share your question and contact — your first questions are free."
          : "Share your contact and a short note. They'll reach out to you directly."}
      </p>

      <div className="mt-4 space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          required
          className="w-full rounded-xl border border-[#e0e0e0] bg-white px-4 py-2.5 text-[15px] text-[#1d1d1f] placeholder-[#9a9aa0] focus:outline-none focus:border-[#1e3a5f]/50 transition-colors"
        />
        <input
          type="text"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Phone or email"
          required
          className="w-full rounded-xl border border-[#e0e0e0] bg-white px-4 py-2.5 text-[15px] text-[#1d1d1f] placeholder-[#9a9aa0] focus:outline-none focus:border-[#1e3a5f]/50 transition-colors"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={free ? "Describe your question…" : "Briefly, what do you need help with? (optional)"}
          rows={3}
          maxLength={2000}
          className="w-full rounded-xl border border-[#e0e0e0] bg-white px-4 py-2.5 text-[15px] text-[#1d1d1f] placeholder-[#9a9aa0] resize-none focus:outline-none focus:border-[#1e3a5f]/50 transition-colors"
        />
      </div>

      {error && <p className="mt-3 text-[13px] text-[#d70015]">{error}</p>}

      <button
        type="submit"
        disabled={submitting || !name.trim() || !contact.trim()}
        className="mt-4 w-full inline-flex items-center justify-center gap-2 text-[15px] font-medium px-5 py-3 rounded-full bg-[#1e3a5f] text-white hover:bg-[#162d4a] active:scale-95 disabled:opacity-40 disabled:active:scale-100 transition-all"
      >
        {submitting ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : <MessageSquare className="w-[18px] h-[18px]" />}
        {submitting ? "Sending…" : free ? "Ask your question" : "Send request"}
      </button>

      <p className="mt-3 text-[11px] text-[#9a9aa0] leading-relaxed text-center">
        By connecting you agree to share your contact details with this lawyer.
      </p>
    </form>
  );
}

// ── Leave-a-review form ───────────────────────────────────────
function ReviewForm({
  slug,
  defaultName,
  onSubmitted,
}: {
  slug: string;
  defaultName: string;
  onSubmitted: () => void | Promise<void>;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [authorName, setAuthorName] = useState(defaultName);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the name in sync if the session resolves after mount.
  useEffect(() => {
    if (defaultName) setAuthorName((prev) => prev || defaultName);
  }, [defaultName]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      setError("Please choose a star rating.");
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/lawyers/${slug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          comment: comment.trim() || undefined,
          authorName: authorName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not submit your review. Please try again.");
        return;
      }
      // Reset and refetch the profile so the new review + rating appear.
      setRating(0);
      setHover(0);
      setComment("");
      await onSubmitted();
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  const shown = hover || rating;

  return (
    <form onSubmit={submit} className="rounded-2xl border border-[#e0e0e0] bg-[#f5f5f7] p-5 sm:p-6">
      <h3 className="text-[17px] font-semibold text-[#1d1d1f]">Leave a review</h3>

      {/* Star selector */}
      <div className="mt-3 flex items-center gap-1.5" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            className="active:scale-90 transition-transform"
          >
            <Star
              className={
                n <= shown ? "fill-[#f5a623] text-[#f5a623]" : "fill-none text-[#c7c7cc]"
              }
              style={{ width: 28, height: 28 }}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-[13px] text-[#6e6e73] tabular-nums">{rating} / 5</span>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <input
          type="text"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="Your name (optional)"
          className="w-full rounded-xl border border-[#e0e0e0] bg-white px-4 py-2.5 text-[15px] text-[#1d1d1f] placeholder-[#9a9aa0] focus:outline-none focus:border-[#1e3a5f]/50 transition-colors"
        />
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience (optional)"
          rows={3}
          maxLength={1500}
          className="w-full rounded-xl border border-[#e0e0e0] bg-white px-4 py-2.5 text-[15px] text-[#1d1d1f] placeholder-[#9a9aa0] resize-none focus:outline-none focus:border-[#1e3a5f]/50 transition-colors"
        />
      </div>

      {error && <p className="mt-3 text-[13px] text-[#d70015]">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="mt-4 inline-flex items-center justify-center gap-2 text-[15px] font-medium px-5 py-2.5 rounded-full bg-[#1e3a5f] text-white hover:bg-[#162d4a] active:scale-95 disabled:opacity-40 disabled:active:scale-100 transition-all"
      >
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        {submitting ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
