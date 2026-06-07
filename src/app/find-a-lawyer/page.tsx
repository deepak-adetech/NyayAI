"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Scale, Search, MapPin, Loader2, SlidersHorizontal, Users } from "lucide-react";
import LawyerCard, { type LawyerCardData } from "@/components/LawyerCard";
import { SPECIALTIES } from "@/lib/specialty";

// SF Pro-style display stack for the big headline (Apple feel over global Inter)
const displayFont = '-apple-system, "SF Pro Display", system-ui, "Segoe UI", sans-serif';

const PAGE_SIZE = 12;

function DirectoryHeader() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
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
          <Link
            href="/ask"
            className="text-[13px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors hidden sm:block"
          >
            Ask a question
          </Link>
          <Link
            href="/lawyers/join"
            className="text-[13px] font-medium px-3.5 py-1.5 rounded-full bg-[#1e3a5f] text-white hover:bg-[#162d4a] active:scale-95 transition-all"
          >
            Join as a lawyer
          </Link>
        </div>
      </div>
    </header>
  );
}

function DirectoryInner() {
  const searchParams = useSearchParams();
  const initialSpecialty = searchParams.get("specialty") ?? "";

  const [specialty, setSpecialty] = useState(initialSpecialty);
  const [city, setCity] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const [lawyers, setLawyers] = useState<LawyerCardData[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A token to discard out-of-order responses when filters change fast.
  const reqRef = useRef(0);

  const buildParams = useCallback(
    (off: number) => {
      const p = new URLSearchParams();
      if (specialty) p.set("specialty", specialty);
      if (city.trim()) p.set("city", city.trim());
      if (freeOnly) p.set("freeOnly", "1");
      if (coords) {
        p.set("lat", String(coords.lat));
        p.set("lng", String(coords.lng));
      }
      p.set("limit", String(PAGE_SIZE));
      p.set("offset", String(off));
      return p;
    },
    [specialty, city, freeOnly, coords]
  );

  // Fetch from scratch whenever any filter changes (debounced for the city text input).
  useEffect(() => {
    const token = ++reqRef.current;
    setLoading(true);
    setError(null);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/lawyers?${buildParams(0).toString()}`);
        const data = await res.json();
        if (token !== reqRef.current) return; // a newer request superseded this one
        if (!res.ok) {
          setError(data.error ?? "Could not load lawyers. Please try again.");
          setLawyers([]);
          setTotal(0);
          return;
        }
        setLawyers(data.lawyers ?? []);
        setTotal(data.total ?? 0);
        setOffset(data.lawyers?.length ?? 0);
      } catch {
        if (token !== reqRef.current) return;
        setError("Network error. Please check your connection.");
        setLawyers([]);
        setTotal(0);
      } finally {
        if (token === reqRef.current) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [buildParams]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/lawyers?${buildParams(offset).toString()}`);
      const data = await res.json();
      if (res.ok) {
        setLawyers((prev) => [...prev, ...(data.lawyers ?? [])]);
        setOffset((prev) => prev + (data.lawyers?.length ?? 0));
        setTotal(data.total ?? 0);
      }
    } catch {
      /* keep what we have */
    } finally {
      setLoadingMore(false);
    }
  }

  function nearMe() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Location isn't available on this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setError("We couldn't get your location. Allow location access and try again.");
        setLocating(false);
      },
      { timeout: 8000 }
    );
  }

  const hasMore = lawyers.length < total;

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <DirectoryHeader />

      {/* ── HERO ── */}
      <section className="relative -mt-14 pt-14">
        <div className="mx-auto max-w-[1100px] px-5 sm:px-8 pt-8 sm:pt-12 pb-6 sm:pb-8 text-center">
          <h1
            className="font-semibold text-[#1d1d1f] text-[40px] leading-[1.05] sm:text-[60px] sm:leading-[1.04]"
            style={{ fontFamily: displayFont, letterSpacing: "-0.025em" }}
          >
            Find a lawyer.
          </h1>
          <p className="mx-auto mt-4 max-w-[620px] text-[18px] sm:text-[21px] leading-snug text-[#6e6e73]">
            Verified advocates across India, by practice area and city. Some answer your first
            questions free.
          </p>
        </div>
      </section>

      {/* ── Filters ── */}
      <section className="mx-auto max-w-[1100px] px-5 sm:px-8">
        <div className="rounded-2xl border border-[#e0e0e0] bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-4">
            {/* Specialty chips */}
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#9a9aa0]">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Practice area
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSpecialty("")}
                  aria-pressed={specialty === ""}
                  className={
                    specialty === ""
                      ? "rounded-full px-3.5 py-1.5 text-[13px] font-medium bg-[#1e3a5f] text-white active:scale-95 transition-all"
                      : "rounded-full px-3.5 py-1.5 text-[13px] border border-[#e0e0e0] bg-white text-[#424245] hover:border-[#1e3a5f]/50 hover:text-[#1e3a5f] active:scale-[0.97] transition-all"
                  }
                >
                  All
                </button>
                {SPECIALTIES.map((s) => {
                  const active = specialty === s.code;
                  return (
                    <button
                      key={s.code}
                      type="button"
                      onClick={() => setSpecialty(active ? "" : s.code)}
                      aria-pressed={active}
                      className={
                        active
                          ? "rounded-full px-3.5 py-1.5 text-[13px] font-medium bg-[#1e3a5f] text-white active:scale-95 transition-all"
                          : "rounded-full px-3.5 py-1.5 text-[13px] border border-[#e0e0e0] bg-white text-[#424245] hover:border-[#1e3a5f]/50 hover:text-[#1e3a5f] active:scale-[0.97] transition-all"
                      }
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* City + free toggle + near me */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1 min-w-0">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9a9aa0]" />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City — e.g. Mumbai, Delhi, Bengaluru"
                  className="w-full rounded-full border border-[#e0e0e0] bg-white pl-10 pr-4 py-2.5 text-[15px] text-[#1d1d1f] placeholder-[#9a9aa0] focus:outline-none focus:border-[#1e3a5f]/50 transition-colors"
                />
              </div>

              <button
                type="button"
                onClick={() => setFreeOnly((v) => !v)}
                aria-pressed={freeOnly}
                className={
                  freeOnly
                    ? "shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-medium bg-[#e8f6ed] text-[#1e7a3d] border border-[#1e7a3d]/30 active:scale-95 transition-all"
                    : "shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[14px] border border-[#e0e0e0] bg-white text-[#424245] hover:border-[#1e3a5f]/50 hover:text-[#1e3a5f] active:scale-[0.97] transition-all"
                }
              >
                <span
                  className={`inline-block w-3.5 h-3.5 rounded-full border ${
                    freeOnly ? "bg-[#1e7a3d] border-[#1e7a3d]" : "border-[#c7c7cc]"
                  }`}
                />
                Answers free
              </button>

              <button
                type="button"
                onClick={nearMe}
                className={
                  coords
                    ? "shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-medium bg-[#1e3a5f] text-white active:scale-95 transition-all"
                    : "shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[14px] border border-[#e0e0e0] bg-white text-[#424245] hover:border-[#1e3a5f]/50 hover:text-[#1e3a5f] active:scale-[0.97] transition-all"
                }
              >
                {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                {coords ? "Sorted by distance" : "Near me"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Results ── */}
      <section className="mx-auto max-w-[1100px] px-5 sm:px-8 pb-20 pt-6 sm:pt-8">
        {/* result count */}
        {!loading && !error && lawyers.length > 0 && (
          <p className="mb-4 text-[13px] text-[#6e6e73]">
            {total} {total === 1 ? "lawyer" : "lawyers"}
            {specialty && ` · ${SPECIALTIES.find((s) => s.code === specialty)?.label ?? ""}`}
            {city.trim() && ` · ${city.trim()}`}
          </p>
        )}

        {error && (
          <p className="mb-4 text-[14px] text-[#d70015]">{error}</p>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#9a9aa0]" />
          </div>
        ) : lawyers.length === 0 ? (
          // ── Empty state ──
          <div className="rounded-2xl border border-[#e0e0e0] bg-[#f5f5f7] px-6 py-14 text-center">
            <div className="mx-auto mb-4 flex w-12 h-12 items-center justify-center rounded-full bg-white border border-[#e0e0e0]">
              <Search className="w-5 h-5 text-[#9a9aa0]" />
            </div>
            <p className="text-[17px] font-semibold text-[#1d1d1f]">No lawyers match</p>
            <p className="mt-1.5 text-[14px] text-[#6e6e73]">
              Try widening your filters — clear the city, pick &ldquo;All&rdquo; practice areas, or
              turn off &ldquo;Answers free&rdquo;.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSpecialty("");
                  setCity("");
                  setFreeOnly(false);
                }}
                className="inline-flex items-center gap-1.5 text-[14px] font-medium px-4 py-2.5 rounded-full bg-white border border-[#e0e0e0] text-[#1d1d1f] hover:border-[#1e3a5f]/50 active:scale-95 transition-all"
              >
                Clear filters
              </button>
              <Link
                href="/lawyers/join"
                className="inline-flex items-center gap-1.5 text-[14px] font-medium px-4 py-2.5 rounded-full bg-[#1e3a5f] text-white hover:bg-[#162d4a] active:scale-95 transition-all"
              >
                <Users className="w-4 h-4" />
                Are you a lawyer? Join free
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              {lawyers.map((l) => (
                <LawyerCard key={l.id} lawyer={l} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 text-[15px] font-medium px-6 py-3 rounded-full bg-white border border-[#e0e0e0] text-[#1d1d1f] hover:border-[#1e3a5f]/50 active:scale-95 disabled:opacity-50 transition-all"
                >
                  {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </section>

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
            <Link href="/lawyers/join" className="hover:text-[#1d1d1f] transition-colors">Join as a lawyer</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function FindALawyerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#9a9aa0]" />
        </div>
      }
    >
      <DirectoryInner />
    </Suspense>
  );
}
