"use client";

import { apiDisplayMessage, readApiJson } from "@/lib/api";
/**
 * 🎊 WEEKLY SHOWCASE STRIP (WAVE 41) — వారానికి ఒక కులం
 * Public homepage strip: ఈ వారం caste + ఆ caste best profiles. Empty → render avvadu.
 */
import { useEffect, useState } from "react";
import { useLang } from "@/lib/lang";

type Row = Record<string, any>;

export default function ShowcaseStrip() {
  const { lang } = useLang();
  const te = lang === "te";
  const [caste, setCaste] = useState("");
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    fetch("/api/showcase").then((r) => readApiJson(r)).then((d) => {
      if (d?.success && d.count > 0) { setCaste(d.caste || ""); setRows(d.matches || []); }
    }).catch(() => { });
  }, []);

  const displayCaste = te ? caste : apiDisplayMessage({ message_en: caste }, false, "");
  if (!rows.length || (!te && !displayCaste)) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 pt-6">
      <div className="rounded-[1.75rem] border border-[#7A0C2E]/15 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className={`text-lg font-extrabold text-[#7A0C2E] ${te ? "telugu" : ""}`} lang={te ? "te-IN" : "en-IN"}>
            🎊 {te ? `ఈ వారం ${caste} కులస్తుల showcase` : `This week: ${displayCaste} showcase`}
          </h2>
          <span className={`${te ? "telugu" : ""} rounded-full bg-[#7A0C2E]/8 px-3 py-1 text-[11px] font-bold text-[#7A0C2E]`} lang={te ? "te-IN" : "en-IN"}>
            {te ? "వారానికి ఒక కులం — రోజూ కొత్త profiles" : "One caste a week"}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {rows.slice(0, 6).map((x) => {
            const district = te ? x.district : apiDisplayMessage({ message_en: x.district }, false, "");
            const work = te ? (x.job || x.education || "") : apiDisplayMessage({ message_en: x.job || x.education }, false, "");
            return (
            <a key={x.tsap_id} href={`/search/${x.tsap_id}`}
              className="group rounded-2xl border border-[#7A0C2E]/10 bg-gradient-to-br from-white to-[#FFF8E7] p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="mx-auto flex h-[70px] w-[70px] items-center justify-center rounded-full bg-gradient-to-br from-[#7A0C2E]/12 to-[#B8860B]/15 text-3xl">
                {x.gender === "Bride" ? "👰" : "🤵"}
              </div>
              <div className="mt-2 truncate text-[13px] font-bold text-[#7A0C2E]">{x.full_name}</div>
              <div className={`truncate text-[11px] text-gray-600 ${te ? "telugu" : ""}`}>{x.age}y · {district}</div>
              <div className={`truncate text-[11px] text-gray-500 ${te ? "telugu" : ""}`}>{work}</div>
            </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
