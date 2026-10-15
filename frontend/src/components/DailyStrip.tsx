"use client";

import { apiDisplayMessage, readApiJson } from "@/lib/api";
/** Public strip for admin-curated featured profiles, not compatibility matches. */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/lang";
import { CASTE_TELUGU, DISTRICT_TELUGU } from "@/lib/telugu-data";

type Row = {
  tsap_id: string;
  full_name?: string;
  gender?: string;
  age?: number | string;
  caste?: string;
  district?: string;
  job?: string;
  education?: string;
  boosted?: boolean;
  placement_label?: string;
};

export default function DailyStrip() {
  const { lang } = useLang();
  const te = lang === "te";
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/daily-matches", { signal: controller.signal, cache: "no-store" })
      .then((response) => response.ok ? readApiJson(response) : null)
      .then((data) => {
        if (data?.success && Array.isArray(data.featured_profiles)) setRows(data.featured_profiles);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  if (!rows.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pt-6" aria-labelledby="daily-featured-public-title">
      <div className="rounded-[1.75rem] border border-[#B8860B]/30 bg-gradient-to-br from-[#FFF8E7] to-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 id="daily-featured-public-title" className="telugu text-lg font-extrabold text-[#7A0C2E]">
              {te ? "ఈ రోజు featured profiles" : "Today’s featured profiles"}
            </h2>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-gray-600">
              {te
                ? "ఇవి admin ఎంపిక చేసిన profiles మాత్రమే; compatibility లేదా identity verdict కాదు. Active paid boost ఉన్న profile కి sponsored placement అని స్పష్టంగా చూపిస్తాం."
                : "Admin-selected profiles—not compatibility matches or identity checks. An active paid boost is disclosed as sponsored placement."}
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2" role="list" aria-label={te ? "Featured profiles" : "Featured profiles"}>
          {rows.map((row) => {
            const displayField = (value?: string) => te
              ? String(value || "")
              : apiDisplayMessage({ message_en: value }, false, "");
            const caste = te ? (CASTE_TELUGU[row.caste || ""] || row.caste || "") : displayField(row.caste);
            const district = te ? (DISTRICT_TELUGU[row.district || ""] || row.district || "") : displayField(row.district);
            const work = displayField(row.job) || displayField(row.education);
            return (
              <Link key={row.tsap_id} href={`/search/${encodeURIComponent(row.tsap_id)}`} role="listitem"
                className="group w-[168px] flex-shrink-0 rounded-2xl border border-[#7A0C2E]/10 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7A0C2E]">
                <div className="flex h-[86px] items-center justify-center rounded-xl bg-gradient-to-br from-[#7A0C2E]/10 to-[#B8860B]/10 text-3xl" aria-hidden="true">
                  {row.gender === "Bride" ? "👰" : row.gender === "Groom" ? "🤵" : "👤"}
                </div>
                <div className="mt-2 break-words text-sm font-bold text-[#7A0C2E]">{row.full_name || row.tsap_id}</div>
                <div className={`break-words text-[11px] text-gray-600 ${te ? "telugu" : ""}`}>
                  {[row.age ? `${row.age} ${te ? "సం." : "years"}` : "", caste].filter(Boolean).join(" · ")}
                </div>
                <div className={`break-words text-[11px] text-gray-500 ${te ? "telugu" : ""}`}>
                  {[district, work].filter(Boolean).join(" · ")}
                </div>
                <span className={`mt-2 inline-flex max-w-full rounded-full px-2 py-1 text-[10px] font-semibold ${row.boosted ? "bg-amber-100 text-amber-900" : "bg-rose-50 text-rose-800"}`}>
                  {row.boosted ? (te ? "Sponsored placement" : "Sponsored placement") : (te ? "Featured" : "Featured")}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
