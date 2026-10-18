"use client";

/**
 * 🔍 EXPLAINABLE PROFILE INSIGHTS (WAVE 43)
 * Why this profile appears: shared facts, differences, and what is still
 * unknown. No compatibility percentage, no ranking score, no recommendation —
 * the server sends facts and the reader decides.
 */
import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { useLang } from "@/lib/lang";

type Row = { key?: string; label?: string; telugu?: string; state?: string; note?: string };
type Insights = {
  shared?: string[];
  different?: string[];
  unknown?: Row[];
  saved_searches?: {
    search_id: string;
    name: string;
    matches: boolean;
    filter_detail?: { key: string; value: string; matched: boolean }[];
  }[];
  matching_searches?: string[];
  profile_details?: { provided: number; total: number; missing_fields?: string[] };
  next_steps?: { en: string; te: string }[];
  compatibility_score_calculated?: boolean;
  disclaimer_en?: string;
  disclaimer_te?: string;
};

export default function ProfileInsights({ viewerId, profileId }: { viewerId: string; profileId: string }) {
  const { lang } = useLang();
  const te = lang === "te";
  const [data, setData] = useState<Insights | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!viewerId || !profileId || viewerId === profileId) return;
    const { ok, data: d } = await apiGet<Insights>(
      `/api/matches/${encodeURIComponent(viewerId)}/insights/${encodeURIComponent(profileId)}`,
    );
    if (ok && d) setData(d);
  }, [viewerId, profileId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!viewerId || !profileId || viewerId === profileId || !data) return null;

  const shared = data.shared || [];
  const different = data.different || [];
  const unknown = data.unknown || [];
  const matching = data.matching_searches || [];
  const details = data.profile_details || { provided: 0, total: 0 };

  return (
    <section
      className="mx-auto mt-4 max-w-3xl px-4"
      aria-label={te ? "ఈ ప్రొఫైల్ ఎందుకు కనిపిస్తుంది" : "Why this profile appears"}
    >
      <div className="rounded-3xl border border-amber-200 bg-gradient-to-b from-white to-amber-50/60 p-4 shadow-sm sm:p-5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-h-11 w-full items-center justify-between gap-3 text-left"
        >
          <span>
            <span className="block text-base font-black text-[#7A0C2E]">
              {te ? "🔍 ఈ ప్రొఫైల్ ఎందుకు కనిపిస్తుంది" : "🔍 Why this profile appears"}
            </span>
            <span className="mt-0.5 block text-[11px] text-slate-600">
              {te
                ? "ఇద్దరూ నమోదు చేసిన వివరాల ఆధారంగా — ఎటువంటి score లేదు."
                : "Based on details both members entered — never a score."}
            </span>
          </span>
          <span aria-hidden="true" className="text-lg font-black text-[#7A0C2E]">
            {open ? "−" : "+"}
          </span>
        </button>

        {open && (
          <div className="mt-4 space-y-4">
            {shared.length > 0 && (
              <div>
                <h3 className="text-xs font-black text-slate-900">
                  {te ? "ఇద్దరూ నమోదు చేసినవి" : "Entered by both profiles"}
                </h3>
                <ul className="mt-1.5 space-y-1">
                  {shared.map((line) => (
                    <li key={line} className="text-[12px] leading-relaxed text-slate-700">
                      • {line}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {different.length > 0 && (
              <div>
                <h3 className="text-xs font-black text-slate-900">
                  {te ? "వేరుగా ఉన్న వివరాలు" : "Where the profiles differ"}
                </h3>
                <ul className="mt-1.5 space-y-1">
                  {different.map((line) => (
                    <li key={line} className="text-[12px] leading-relaxed text-slate-700">
                      • {line}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {unknown.length > 0 && (
              <div>
                <h3 className="text-xs font-black text-slate-900">
                  {te ? "ఇంకా తెలియనివి (ఊహించము)" : "Still unknown (never guessed)"}
                </h3>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {unknown.slice(0, 8).map((row) => (
                    <span
                      key={String(row.key || row.label)}
                      className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600"
                    >
                      {te ? row.telugu || row.label : row.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {matching.length > 0 && (
              <div>
                <p className="text-[12px] font-semibold text-[#7A0C2E]">
                  {te ? "మీ saved searches: " : "Matches your saved searches: "}
                  {matching.join(", ")}
                </p>
                {(data.saved_searches || [])
                  .filter((search) => search.matches && (search.filter_detail || []).length > 0)
                  .map((search) => (
                    <div key={search.search_id} className="mt-1.5">
                      <p className="text-[11px] font-bold text-slate-700">
                        {search.name || search.search_id} —{" "}
                        {te ? "ఏ ఫిల్టర్ సరిపోయింది" : "which filter fitted"}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(search.filter_detail || []).map((row) => (
                          <span
                            key={`${search.search_id}-${row.key}`}
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                              row.matched
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "border-slate-200 bg-white text-slate-500"
                            }`}
                          >
                            <span aria-hidden="true">{row.matched ? "✓" : "·"}</span> {row.key}: {row.value}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            <p className="text-[11px] text-slate-600">
              {te ? "ఈ ప్రొఫైల్‌లో నమోదైన వివరాలు: " : "Details provided on this profile: "}
              <span className="font-black text-[#7A0C2E]">
                {details.provided}/{details.total}
              </span>
            </p>

            <ul className="space-y-1">
              {(data.next_steps || []).map((step) => (
                <li key={step.en} className="text-[11px] leading-relaxed text-slate-700">
                  ✓ {te ? step.te : step.en}
                </li>
              ))}
            </ul>

            <p className="rounded-2xl bg-white/80 p-3 text-[11px] leading-relaxed text-slate-600">
              {te ? data.disclaimer_te : data.disclaimer_en}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
