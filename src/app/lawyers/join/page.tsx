"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Scale,
  Loader2,
  LogIn,
  Camera,
  MapPin,
  CheckCircle2,
  ExternalLink,
  AlertTriangle,
  X,
} from "lucide-react";
import { SPECIALTIES } from "@/lib/specialty";

// SF Pro-style display stack for the big headline (Apple feel over global Inter)
const displayFont = '-apple-system, "SF Pro Display", system-ui, "Segoe UI", sans-serif';

const LANGUAGES = [
  "English",
  "Hindi",
  "Tamil",
  "Telugu",
  "Bengali",
  "Marathi",
  "Gujarati",
  "Kannada",
  "Malayalam",
  "Punjabi",
  "Odia",
  "Urdu",
  "Assamese",
];

// Shape of the profile returned by GET /api/lawyers/profile (or null).
interface ProfileShape {
  fullName: string;
  bio: string | null;
  specialties: string[];
  yearsExperience: number;
  barCouncilNumber: string | null;
  barCouncilState: string | null;
  languages: string[];
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  publicEmail: string | null;
  website: string | null;
  willingToAnswerFree: boolean;
  photoUrl: string | null;
  isListed: boolean;
  slug: string;
}

interface ValidationDetail {
  path?: (string | number)[];
  message?: string;
}

function JoinHeader() {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl backdrop-saturate-150 border-b border-[#e0e0e0]">
      <div className="mx-auto max-w-[760px] px-5 sm:px-8 h-14 flex items-center justify-between">
        <Link href="/ask" className="flex items-center gap-2 active:scale-95 transition-transform">
          <Scale className="w-[18px] h-[18px] text-[#1e3a5f]" />
          <span className="font-semibold text-[#1d1d1f] text-[15px] tracking-tight">NyayAI</span>
        </Link>
        <Link
          href="/find-a-lawyer"
          className="text-[13px] text-[#0066cc] hover:underline"
        >
          Browse directory
        </Link>
      </div>
    </header>
  );
}

// Small reusable toggle row.
function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className="w-full flex items-start justify-between gap-4 rounded-2xl border border-[#e0e0e0] bg-white px-4 py-3.5 text-left hover:border-[#1e3a5f]/40 transition-colors"
    >
      <span className="min-w-0">
        <span className="block text-[15px] font-medium text-[#1d1d1f]">{label}</span>
        <span className="mt-0.5 block text-[13px] text-[#6e6e73] leading-snug">{hint}</span>
      </span>
      <span
        className={`mt-0.5 shrink-0 relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${
          checked ? "bg-[#1e3a5f]" : "bg-[#d2d2d7]"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}

export default function LawyerJoinPage() {
  const { data: session, status } = useSession();

  // ── form state ──
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [hasExisting, setHasExisting] = useState(false);

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [yearsExperience, setYearsExperience] = useState<string>("0");
  const [barCouncilNumber, setBarCouncilNumber] = useState("");
  const [barCouncilState, setBarCouncilState] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [phone, setPhone] = useState("");
  const [publicEmail, setPublicEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [willingToAnswerFree, setWillingToAnswerFree] = useState(true);
  const [isListed, setIsListed] = useState(true);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // ── ui state ──
  const [uploading, setUploading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const [successSlug, setSuccessSlug] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isAuthed = status === "authenticated" && !!session?.user;

  // Prefill from existing profile once authenticated.
  useEffect(() => {
    if (status === "loading") return;
    if (!isAuthed) {
      setLoadingProfile(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/lawyers/profile");
        const data = await res.json();
        if (!active) return;
        const p: ProfileShape | null = data.profile ?? null;
        if (p) {
          setHasExisting(true);
          setFullName(p.fullName ?? "");
          setBio(p.bio ?? "");
          setSpecialties(p.specialties ?? []);
          setYearsExperience(String(p.yearsExperience ?? 0));
          setBarCouncilNumber(p.barCouncilNumber ?? "");
          setBarCouncilState(p.barCouncilState ?? "");
          setLanguages(p.languages ?? []);
          setCity(p.city ?? "");
          setStateName(p.state ?? "");
          setLatitude(p.latitude ?? null);
          setLongitude(p.longitude ?? null);
          setPhone(p.phone ?? "");
          setPublicEmail(p.publicEmail ?? "");
          setWebsite(p.website ?? "");
          setWillingToAnswerFree(p.willingToAnswerFree ?? true);
          setIsListed(p.isListed ?? true);
          setPhotoUrl(p.photoUrl ?? null);
        } else {
          // Seed name from the signed-in account.
          setFullName(session?.user?.name ?? "");
        }
      } catch {
        /* leave blank — the user can still fill the form */
      } finally {
        if (active) setLoadingProfile(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [status, isAuthed, session?.user?.name]);

  function toggleIn(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  async function onPhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch("/api/lawyers/profile/photo", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not upload the photo. Use a JPG, PNG, or WebP under 5MB.");
        return;
      }
      setPhotoUrl(data.url);
    } catch {
      setError("Could not upload the photo. Please try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function useMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Location isn't available on this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setLocating(false);
      },
      () => {
        setError("We couldn't get your location. Allow location access and try again.");
        setLocating(false);
      },
      { timeout: 8000 }
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setFieldErrors([]);

    if (fullName.trim().length < 2) {
      setError("Please enter your full name (at least 2 characters).");
      return;
    }

    const years = Math.min(70, Math.max(0, parseInt(yearsExperience || "0", 10) || 0));

    setSubmitting(true);
    try {
      const res = await fetch("/api/lawyers/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          bio: bio.trim() || undefined,
          specialties,
          yearsExperience: years,
          barCouncilNumber: barCouncilNumber.trim() || undefined,
          barCouncilState: barCouncilState.trim() || undefined,
          languages,
          city: city.trim() || undefined,
          state: stateName.trim() || undefined,
          latitude: latitude ?? undefined,
          longitude: longitude ?? undefined,
          phone: phone.trim() || undefined,
          publicEmail: publicEmail.trim(),
          website: website.trim(),
          willingToAnswerFree,
          photoUrl: photoUrl ?? undefined,
          isListed,
        }),
      });
      const data = await res.json();

      if (res.status === 401) {
        setError("Your session expired. Please sign in again.");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Could not save your profile. Please check the fields and try again.");
        if (Array.isArray(data.details)) {
          setFieldErrors(
            (data.details as ValidationDetail[]).map((d) =>
              `${d.path?.join(".") ?? "field"}: ${d.message ?? "invalid"}`
            )
          );
        }
        return;
      }
      setSuccessSlug(data.slug);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading session / profile ──
  if (status === "loading" || (isAuthed && loadingProfile)) {
    return (
      <div className="min-h-screen bg-white">
        <JoinHeader />
        <div className="flex justify-center py-32">
          <Loader2 className="w-6 h-6 animate-spin text-[#9a9aa0]" />
        </div>
      </div>
    );
  }

  // ── Auth gate ──
  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-white text-[#1d1d1f]">
        <JoinHeader />
        <div className="mx-auto max-w-[520px] px-5 sm:px-8 py-24 sm:py-28 text-center">
          <h1
            className="text-[30px] sm:text-[40px] font-semibold text-[#1d1d1f] leading-[1.06]"
            style={{ fontFamily: displayFont, letterSpacing: "-0.025em" }}
          >
            Sign in to create your lawyer profile
          </h1>
          <p className="mt-4 text-[17px] text-[#6e6e73] leading-relaxed">
            List your practice on NyayAI, get found by people asking legal questions near you, and
            answer your first questions free.
          </p>
          <Link
            href="/login?callbackUrl=/lawyers/join"
            className="mt-8 inline-flex items-center gap-2 text-[15px] font-medium px-6 py-3 rounded-full bg-[#1e3a5f] text-white hover:bg-[#162d4a] active:scale-95 transition-all"
          >
            <LogIn className="w-4 h-4" />
            Sign in
          </Link>
          <p className="mt-4 text-[13px] text-[#9a9aa0]">
            New here?{" "}
            <Link href="/signup" className="text-[#0066cc] hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // ── Success panel ──
  if (successSlug) {
    return (
      <div className="min-h-screen bg-white text-[#1d1d1f]">
        <JoinHeader />
        <div className="mx-auto max-w-[560px] px-5 sm:px-8 py-24 sm:py-28 text-center">
          <CheckCircle2 className="mx-auto w-14 h-14 text-[#1e7a3d]" />
          <h1
            className="mt-5 text-[30px] sm:text-[40px] font-semibold text-[#1d1d1f] leading-[1.06]"
            style={{ fontFamily: displayFont, letterSpacing: "-0.025em" }}
          >
            Your profile is live
          </h1>
          <p className="mt-4 text-[17px] text-[#6e6e73] leading-relaxed">
            {isListed
              ? "People can now find you in the NyayAI lawyer directory."
              : "Your profile is saved. Turn on “List my profile publicly” anytime to appear in the directory."}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/find-a-lawyer/${successSlug}`}
              className="inline-flex items-center gap-2 text-[15px] font-medium px-6 py-3 rounded-full bg-[#1e3a5f] text-white hover:bg-[#162d4a] active:scale-95 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              View my profile
            </Link>
            <button
              type="button"
              onClick={() => setSuccessSlug(null)}
              className="inline-flex items-center gap-2 text-[15px] font-medium px-6 py-3 rounded-full bg-white border border-[#e0e0e0] text-[#1d1d1f] hover:border-[#1e3a5f]/50 active:scale-95 transition-all"
            >
              Edit profile
            </button>
          </div>
          <p className="mt-5 text-[13px] text-[#9a9aa0]">
            You can edit your profile anytime from this page.
          </p>
        </div>
      </div>
    );
  }

  // ── The form ──
  const labelCls = "block text-[13px] font-medium text-[#1d1d1f] mb-1.5";
  const inputCls =
    "w-full rounded-xl border border-[#e0e0e0] bg-white px-4 py-2.5 text-[15px] text-[#1d1d1f] placeholder-[#9a9aa0] focus:outline-none focus:border-[#1e3a5f]/50 transition-colors";

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <JoinHeader />

      <div className="mx-auto max-w-[760px] px-5 sm:px-8 pt-8 sm:pt-12 pb-20">
        {/* Heading */}
        <h1
          className="text-[34px] sm:text-[44px] font-semibold text-[#1d1d1f] leading-[1.05]"
          style={{ fontFamily: displayFont, letterSpacing: "-0.025em" }}
        >
          {hasExisting ? "Edit your profile" : "Create your profile"}
        </h1>
        <p className="mt-3 text-[17px] text-[#6e6e73] leading-relaxed">
          {hasExisting
            ? "Update your details — changes go live instantly."
            : "Tell people about your practice. Listing is free."}
        </p>

        <form onSubmit={submit} className="mt-9 space-y-9">
          {/* ── Photo ── */}
          <section>
            <div className="flex items-center gap-5">
              <div className="shrink-0">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoUrl}
                    alt="Profile preview"
                    className="w-20 h-20 rounded-full object-cover bg-[#f5f5f7]"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-[#f5f5f7] border border-[#e0e0e0] flex items-center justify-center">
                    <Camera className="w-6 h-6 text-[#9a9aa0]" />
                  </div>
                )}
              </div>
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={onPhotoSelected}
                  className="hidden"
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex items-center gap-2 text-[14px] font-medium px-4 py-2 rounded-full bg-white border border-[#e0e0e0] text-[#1d1d1f] hover:border-[#1e3a5f]/50 active:scale-95 disabled:opacity-50 transition-all"
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    {uploading ? "Uploading…" : photoUrl ? "Change photo" : "Upload photo"}
                  </button>
                  {photoUrl && !uploading && (
                    <button
                      type="button"
                      onClick={() => setPhotoUrl(null)}
                      className="inline-flex items-center gap-1 text-[13px] text-[#6e6e73] hover:text-[#d70015] transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                </div>
                <p className="mt-2 text-[12px] text-[#9a9aa0]">JPG, PNG, or WebP · up to 5MB</p>
              </div>
            </div>
          </section>

          {/* ── Name + bio ── */}
          <section className="space-y-4">
            <div>
              <label htmlFor="fullName" className={labelCls}>
                Full name <span className="text-[#d70015]">*</span>
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Adv. Priya Sharma"
                required
                maxLength={120}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="bio" className={labelCls}>
                Bio
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A short introduction — your background, how you help clients, areas you focus on…"
                rows={4}
                maxLength={3000}
                className={`${inputCls} resize-none`}
              />
            </div>
          </section>

          {/* ── Specialties ── */}
          <section>
            <span className={labelCls}>Practice areas</span>
            <p className="-mt-1 mb-2.5 text-[12px] text-[#9a9aa0]">Pick all that apply (up to 8).</p>
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.map((s) => {
                const active = specialties.includes(s.code);
                return (
                  <button
                    key={s.code}
                    type="button"
                    onClick={() => setSpecialties((prev) => toggleIn(prev, s.code))}
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
          </section>

          {/* ── Experience + bar council ── */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="years" className={labelCls}>
                Years of experience
              </label>
              <input
                id="years"
                type="number"
                min={0}
                max={70}
                value={yearsExperience}
                onChange={(e) => setYearsExperience(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="barNo" className={labelCls}>
                Bar Council No.
              </label>
              <input
                id="barNo"
                type="text"
                value={barCouncilNumber}
                onChange={(e) => setBarCouncilNumber(e.target.value)}
                placeholder="e.g. D/1234/2015"
                maxLength={60}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="barState" className={labelCls}>
                Bar Council State
              </label>
              <input
                id="barState"
                type="text"
                value={barCouncilState}
                onChange={(e) => setBarCouncilState(e.target.value)}
                placeholder="e.g. Delhi"
                maxLength={60}
                className={inputCls}
              />
            </div>
          </section>

          {/* ── Languages ── */}
          <section>
            <span className={labelCls}>Languages</span>
            <p className="-mt-1 mb-2.5 text-[12px] text-[#9a9aa0]">Languages you can advise in.</p>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => {
                const active = languages.includes(lang);
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguages((prev) => toggleIn(prev, lang))}
                    aria-pressed={active}
                    className={
                      active
                        ? "rounded-full px-3.5 py-1.5 text-[13px] font-medium bg-[#1e3a5f] text-white active:scale-95 transition-all"
                        : "rounded-full px-3.5 py-1.5 text-[13px] border border-[#e0e0e0] bg-white text-[#424245] hover:border-[#1e3a5f]/50 hover:text-[#1e3a5f] active:scale-[0.97] transition-all"
                    }
                  >
                    {lang}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Location ── */}
          <section className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="city" className={labelCls}>
                  City
                </label>
                <input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Mumbai"
                  maxLength={80}
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="state" className={labelCls}>
                  State
                </label>
                <input
                  id="state"
                  type="text"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  placeholder="Maharashtra"
                  maxLength={80}
                  className={inputCls}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={useMyLocation}
                className="inline-flex items-center gap-2 text-[14px] font-medium px-4 py-2 rounded-full bg-white border border-[#e0e0e0] text-[#1d1d1f] hover:border-[#1e3a5f]/50 active:scale-95 transition-all"
              >
                {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                Use my current location
              </button>
              {latitude != null && longitude != null && (
                <span className="inline-flex items-center gap-1.5 text-[13px] text-[#1e7a3d]">
                  <CheckCircle2 className="w-4 h-4" />
                  Location captured — you&rsquo;ll appear in &ldquo;near me&rdquo; results
                </span>
              )}
            </div>
          </section>

          {/* ── Contact ── */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="phone" className={labelCls}>
                Phone
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                maxLength={20}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="publicEmail" className={labelCls}>
                Public email
              </label>
              <input
                id="publicEmail"
                type="email"
                value={publicEmail}
                onChange={(e) => setPublicEmail(e.target.value)}
                placeholder="you@example.com"
                maxLength={120}
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="website" className={labelCls}>
                Website
              </label>
              <input
                id="website"
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourfirm.in"
                maxLength={200}
                className={inputCls}
              />
            </div>
          </section>

          {/* ── Visibility toggles ── */}
          <section className="space-y-3">
            <Toggle
              checked={willingToAnswerFree}
              onChange={setWillingToAnswerFree}
              label="Answer questions for free"
              hint="Show me to people asking questions and let them reach me for free."
            />
            <Toggle
              checked={isListed}
              onChange={setIsListed}
              label="List my profile publicly"
              hint="Appear in the public lawyer directory and search results."
            />
          </section>

          {/* ── Errors ── */}
          {error && (
            <div className="rounded-2xl border border-[#f5c2c0] bg-[#fdeeee] px-4 py-3.5 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-[#d70015] mt-0.5 shrink-0" />
              <div className="text-[14px] text-[#9a1b16]">
                <p>{error}</p>
                {fieldErrors.length > 0 && (
                  <ul className="mt-1.5 list-disc pl-4 space-y-0.5 text-[13px]">
                    {fieldErrors.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* ── Submit ── */}
          <div className="flex items-center gap-4 pt-1">
            <button
              type="submit"
              disabled={submitting || uploading}
              className="inline-flex items-center justify-center gap-2 text-[15px] font-medium px-7 py-3 rounded-full bg-[#1e3a5f] text-white hover:bg-[#162d4a] active:scale-95 disabled:opacity-40 disabled:active:scale-100 transition-all"
            >
              {submitting && <Loader2 className="w-[18px] h-[18px] animate-spin" />}
              {submitting ? "Saving…" : hasExisting ? "Save changes" : "Publish my profile"}
            </button>
            {hasExisting && (
              <Link
                href="/find-a-lawyer"
                className="text-[14px] text-[#0066cc] hover:underline"
              >
                Back to directory
              </Link>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
