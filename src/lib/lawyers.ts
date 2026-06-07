import type { LawyerProfile } from "@prisma/client";
import { specialtyLabel } from "./specialty";

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

/** Great-circle distance in km between two lat/lng points. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface PublicLawyer {
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
  lastActiveAt: string | null;
  distanceKm: number | null;
}

export function toPublicLawyer(p: LawyerProfile, distanceKm: number | null = null): PublicLawyer {
  return {
    id: p.id,
    slug: p.slug,
    fullName: p.fullName,
    photoUrl: p.photoUrl,
    bio: p.bio,
    specialties: p.specialties,
    specialtyLabels: p.specialties.map(specialtyLabel),
    yearsExperience: p.yearsExperience,
    city: p.city,
    state: p.state,
    languages: p.languages,
    willingToAnswerFree: p.willingToAnswerFree,
    isVerified: p.isVerified,
    questionsAnswered: p.questionsAnswered,
    ratingAvg: Math.round(p.ratingAvg * 10) / 10,
    ratingCount: p.ratingCount,
    lastActiveAt: p.lastActiveAt ? p.lastActiveAt.toISOString() : null,
    distanceKm: distanceKm == null ? null : Math.round(distanceKm * 10) / 10,
  };
}

interface RankOpts {
  specialty?: string | null;
  hasLocation?: boolean;
}

/**
 * Rank lawyers for display: specialty match → free-willing → nearest →
 * higher rating → more answers → more experience.
 */
export function rankLawyers(list: PublicLawyer[], opts: RankOpts): PublicLawyer[] {
  const { specialty, hasLocation } = opts;
  return [...list].sort((a, b) => {
    if (specialty) {
      const am = a.specialties.includes(specialty) ? 1 : 0;
      const bm = b.specialties.includes(specialty) ? 1 : 0;
      if (am !== bm) return bm - am;
    }
    if (a.willingToAnswerFree !== b.willingToAnswerFree) {
      return a.willingToAnswerFree ? -1 : 1;
    }
    if (hasLocation && a.distanceKm != null && b.distanceKm != null) {
      if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
    }
    if (b.ratingAvg !== a.ratingAvg) return b.ratingAvg - a.ratingAvg;
    if (b.ratingCount !== a.ratingCount) return b.ratingCount - a.ratingCount;
    if (b.questionsAnswered !== a.questionsAnswered) return b.questionsAnswered - a.questionsAnswered;
    return b.yearsExperience - a.yearsExperience;
  });
}
