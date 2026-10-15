"use client";


import { readApiJson } from "@/lib/api";
/**
 * 📊 LIVE STATS — honest, backend-derived numbers for hero / trust band.
 * ================================================================
 * Mundu hero + WhyChooseUs lo "10,000+ verified profiles / families" ani
 * hard-code chesaru. Kani backend `/api/stats` lo nijam inventory konni vanda
 * profiles matrame — adi oka LIVE, PAID site lo misleading commercial claim
 * (Consumer Protection Act 2019 + ASCI + payment-gateway KYC risk), and it
 * destroys the one thing a matrimony brand runs on: trust.
 *
 * Ippudu prathi public number backend nunchi vastundi (`/api/meta/home-stats`,
 * which is `real_platform_stats()` server-side). SSR-safe: first paint uses a
 * truthful *coverage* fallback (castes/districts/channels we genuinely serve —
 * these were always real), then hydrates with the live profile count. No number
 * shown here is ever fabricated.
 */
import { useEffect, useState } from "react";
import { COMMUNITIES_BY_RELIGION } from "@/lib/telugu-data";

export type LiveStats = {
  profiles_count: number;
  brides_count: number;
  grooms_count: number;
  profiles_with_recorded_check: number;
  profiles_with_phone_otp: number;
  profiles_with_photo_review: number;
  profiles_with_id_review: number;
  recorded_check_percentage: number;
  districts_with_profiles: number;
  castes_with_profiles: number;
  castes_covered: number;
  channels_routing_eligible: number;
  channels_total: number;
  interests_sent: number;
  stats_are_live: boolean;
};

/**
 * Truthful coverage fallback — used before hydration and if the API is down.
 * These describe the bundled community catalogue and configured channels,
 * never a padded profile count. Community labels are optional and non-exhaustive.
 */
export const STATS_FALLBACK: LiveStats = {
  profiles_count: 0,
  brides_count: 0,
  grooms_count: 0,
  profiles_with_recorded_check: 0,
  profiles_with_phone_otp: 0,
  profiles_with_photo_review: 0,
  profiles_with_id_review: 0,
  recorded_check_percentage: 0,
  districts_with_profiles: 0,
  castes_with_profiles: 0,
  castes_covered: COMMUNITIES_BY_RELIGION.Hindu.length,
  channels_routing_eligible: 0,
  channels_total: 0,
  interests_sent: 0,
  stats_are_live: false,
};

let _cache: LiveStats | null = null;

export function useLiveStats(): LiveStats {
  const [s, setS] = useState<LiveStats>(_cache ?? STATS_FALLBACK);
  useEffect(() => {
    if (_cache) {
      setS(_cache);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/meta/home-stats", { cache: "no-store" });
        if (!r.ok) return;
        const d = await readApiJson(r);
        if (!alive || !d || d.success === false) return;
        const next: LiveStats = {
          profiles_count: Number(d.profiles_count) || 0,
          brides_count: Number(d.brides_count) || 0,
          grooms_count: Number(d.grooms_count) || 0,
          profiles_with_recorded_check: Number(d.profiles_with_recorded_check) || 0,
          profiles_with_phone_otp: Number(d.profiles_with_phone_otp) || 0,
          profiles_with_photo_review: Number(d.profiles_with_photo_review) || 0,
          profiles_with_id_review: Number(d.profiles_with_id_review) || 0,
          recorded_check_percentage: Number(d.recorded_check_percentage) || 0,
          districts_with_profiles: Number(d.districts_with_profiles) || 0,
          castes_with_profiles: Number(d.castes_with_profiles) || 0,
          castes_covered: Number(d.castes_covered) || COMMUNITIES_BY_RELIGION.Hindu.length,
          channels_routing_eligible: Number(d.channels_routing_eligible) || 0,
          channels_total: Number(d.channels_total) || 0,
          interests_sent: Number(d.interests_sent) || 0,
          stats_are_live: d.stats_are_live !== false,
        };
        _cache = next;
        setS(next);
      } catch {
        /* offline / SSR — keep the truthful coverage fallback */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  return s;
}

/** "1,234" style grouping for display. */
export function fmtNum(n: number): string {
  try {
    return (Number(n) || 0).toLocaleString("en-IN");
  } catch {
    return String(Number(n) || 0);
  }
}

/**
 * Honest display helper: if we have a real profile count show it (with a "+"),
 * otherwise fall back to a truthful coverage phrase so the UI never lies and
 * never shows a bare "0".
 */
export function profilesLabel(s: LiveStats, lang: "te" | "en" = "te"): string {
  if (s.profiles_count > 0) return fmtNum(s.profiles_count) + "+";
  return lang === "te" ? "కమ్యూనిటీ ఎంపికలు" : "Community options";
}
