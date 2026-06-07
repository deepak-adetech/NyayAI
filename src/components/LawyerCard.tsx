"use client";

import Link from "next/link";
import { Star, MapPin, BadgeCheck, MessageSquare } from "lucide-react";

export interface LawyerCardData {
  id: string;
  slug: string;
  fullName: string;
  photoUrl: string | null;
  bio: string | null;
  specialties: string[];
  specialtyLabels: string[];
  yearsExperience: number;
  city: string | null;
  state: string | null;
  languages: string[];
  willingToAnswerFree: boolean;
  isVerified: boolean;
  questionsAnswered: number;
  ratingAvg: number;
  ratingCount: number;
  distanceKm: number | null;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function LawyerCard({
  lawyer,
  onConnect,
}: {
  lawyer: LawyerCardData;
  onConnect?: (lawyer: LawyerCardData) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#e0e0e0] p-4 sm:p-5 hover:border-[#1e3a5f]/40 transition-colors">
      <div className="flex gap-4">
        {/* Avatar */}
        <Link href={`/find-a-lawyer/${lawyer.slug}`} className="shrink-0">
          {lawyer.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lawyer.photoUrl}
              alt={lawyer.fullName}
              className="w-14 h-14 rounded-full object-cover bg-[#f5f5f7]"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center text-[16px] font-semibold">
              {initials(lawyer.fullName)}
            </div>
          )}
        </Link>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              href={`/find-a-lawyer/${lawyer.slug}`}
              className="text-[15px] font-semibold text-[#1d1d1f] hover:text-[#1e3a5f] transition-colors truncate"
            >
              {lawyer.fullName}
            </Link>
            {lawyer.isVerified && <BadgeCheck className="w-4 h-4 text-[#1e3a5f] shrink-0" />}
          </div>

          {/* Meta row */}
          <div className="mt-0.5 flex items-center gap-x-3 gap-y-1 flex-wrap text-[13px] text-[#6e6e73]">
            {lawyer.ratingCount > 0 && (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Star className="w-3.5 h-3.5 fill-[#f5a623] text-[#f5a623]" />
                {lawyer.ratingAvg.toFixed(1)}
                <span className="text-[#9a9aa0]">({lawyer.ratingCount})</span>
              </span>
            )}
            {lawyer.yearsExperience > 0 && <span>{lawyer.yearsExperience} yrs exp</span>}
            {(lawyer.city || lawyer.distanceKm != null) && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {lawyer.city ?? "—"}
                {lawyer.distanceKm != null && (
                  <span className="text-[#9a9aa0]">· {lawyer.distanceKm} km</span>
                )}
              </span>
            )}
          </div>

          {/* Specialties */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {lawyer.specialtyLabels.slice(0, 3).map((label) => (
              <span
                key={label}
                className="text-[12px] text-[#424245] bg-[#f5f5f7] rounded-full px-2.5 py-0.5"
              >
                {label}
              </span>
            ))}
            {lawyer.willingToAnswerFree && (
              <span className="text-[12px] font-medium text-[#1e7a3d] bg-[#e8f6ed] rounded-full px-2.5 py-0.5">
                Answers free
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="mt-3 flex items-center gap-2">
            {onConnect ? (
              <button
                type="button"
                onClick={() => onConnect(lawyer)}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-1.5 rounded-full bg-[#1e3a5f] text-white hover:bg-[#162d4a] active:scale-95 transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Connect
              </button>
            ) : (
              <Link
                href={`/find-a-lawyer/${lawyer.slug}`}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-1.5 rounded-full bg-[#1e3a5f] text-white hover:bg-[#162d4a] active:scale-95 transition-all"
              >
                View profile
              </Link>
            )}
            <Link
              href={`/find-a-lawyer/${lawyer.slug}`}
              className="text-[13px] text-[#0066cc] hover:underline"
            >
              Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
