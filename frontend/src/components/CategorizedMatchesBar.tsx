"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authHeaders, readApiJson } from "@/lib/api";
import { useLang } from "@/lib/lang";
import { firstName } from "@/lib/names";

const BUCKETS = [
  { key: "strong_preference", en: "🎯 Strong Preference", te: "🎯 మీ ప్రాధాన్యతలకు సరిపోయేవి" },
  { key: "recently_joined", en: "✨ Recently Joined", te: "✨ ఇటీవల చేరినవి" },
  { key: "location_matches", en: "📍 Same Location", te: "📍 మీ ప్రాంత సంబంధాలు" },
  { key: "similar_preferences", en: "🤝 Similar Background", te: "🤝 సమాన విద్య/వృత్తి" },
  { key: "saved_search_matches", en: "🔖 Saved Search", te: "🔖 సేవ్ చేసిన సెర్చ్" },
] as const;

function extractItems(bucket: any): any[] {
  if (Array.isArray(bucket)) return bucket;
  if (bucket && Array.isArray(bucket.items)) return bucket.items;
  return [];
}

export default function CategorizedMatchesBar({ myTsapId }: { myTsapId: string }) {
  const { lang } = useLang();
  const te = lang === "te";
  const [cats, setCats] = useState<Record<string, any> | null>(null);
  const [activeKey, setActiveKey] = useState<string>("strong_preference");

  useEffect(() => {
    if (!myTsapId) {
      setCats(null);
      return;
    }
    let alive = true;
    fetch(`/api/matches/${encodeURIComponent(myTsapId)}/categories`, {
      headers: authHeaders(),
      credentials: "same-origin",
    })
      .then((r) => (r.ok ? readApiJson(r) : null))
      .then((d) => {
        if (alive && d?.categories) setCats(d.categories);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [myTsapId]);

  if (!myTsapId || !cats) return null;
  const totalAny = Object.values(cats).some((b) => extractItems(b).length > 0);
  if (!totalAny) return null;

  const list = extractItems(cats[activeKey]);

  return (
    <section className="mb-5 rounded-3xl border border-gold/35 bg-white p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h2 className="text-sm font-extrabold text-[#7A0C2E]">
            {te ? "🧭 మీ కోసం వర్గీకరించిన సంబంధాలు" : "🧭 Personalized Match Categories"}
          </h2>
          <p className="text-[11px] text-slate-500">
            {te
              ? "మీరు నమోదు చేసిన ప్రాధాన్యతల ఆధారంగా మాత్రమే (కృత్రిమ స్కోర్లు లేవు)."
              : "Grouped strictly by explicit member-entered preferences — no synthetic compatibility scores."}
          </p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {BUCKETS.map((b) => {
          const cnt = extractItems(cats[b.key]).length;
          return (
            <button
              key={b.key}
              type="button"
              onClick={() => setActiveKey(b.key)}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold border transition ${
                activeKey === b.key
                  ? "bg-[#7A0C2E] text-white border-[#7A0C2E]"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:border-[#7A0C2E]"
              }`}
            >
              {te ? b.te : b.en} ({cnt})
            </button>
          );
        })}
      </div>

      {list.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">
          {te ? "ఈ విభాగంలో ప్రస్తుతం ప్రొఫైల్‌లు లేవు." : "No profiles in this category yet — update your Partner Preferences in My Account to refine."}
        </p>
      ) : (
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {list.slice(0, 6).map((entry: any) => {
            const p = entry?.profile || entry || {};
            const reasons: string[] = Array.isArray(entry?.reasons)
              ? entry.reasons
              : Array.isArray(p?.observations)
                ? p.observations
                : [];
            return (
              <Link
                key={p.tsap_id}
                href={`/search/${encodeURIComponent(p.tsap_id)}`}
                className="rounded-2xl border border-slate-200 bg-[#FAF7F2] p-3 hover:border-[#7A0C2E] transition block"
              >
                <div className="flex items-center justify-between text-xs font-extrabold text-[#7A0C2E]">
                  <span>{firstName(p.full_name)}</span>
                  <span className="font-mono text-[11px] text-slate-500">{p.tsap_id}</span>
                </div>
                <div className="mt-1 text-[11px] text-slate-700">
                  {[p.age ? `${p.age} yrs` : "", p.caste, p.district].filter(Boolean).join(" • ")}
                </div>
                {reasons[0] && (
                  <div className="mt-1 text-[10px] text-emerald-800 font-semibold truncate">
                    ✓ {reasons[0]}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
