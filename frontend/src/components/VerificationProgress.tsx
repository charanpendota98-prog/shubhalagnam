"use client";

/**
 * 🧾 VERIFICATION PROGRESS CENTRE (WAVE 43)
 * Every recorded check, what it records, what it does NOT prove, and the next
 * step. Verification is described as recorded checks — never as trust.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { useLang } from "@/lib/lang";

type Check = {
  key: string;
  label_en: string;
  label_te: string;
  icon: string;
  records_en: string;
  records_te: string;
  does_not_en: string;
  does_not_te: string;
  next_step_en: string;
  next_step_te: string;
  href: string;
  state: "recorded" | "not_recorded";
  recorded: boolean;
};

type Section = {
  key: string;
  label_en: string;
  label_te: string;
  icon: string;
  provided: number;
  total: number;
};

type Progress = {
  tsap_id?: string;
  level?: string;
  checks?: Check[];
  sections?: Section[];
  provided_fields?: number;
  total_fields?: number;
  detail_note_en?: string;
  detail_note_te?: string;
};

export default function VerificationProgress({ tsapId }: { tsapId: string }) {
  const { lang } = useLang();
  const te = lang === "te";
  const [data, setData] = useState<Progress | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!tsapId) return;
    setError("");
    const { ok, data: d } = await apiGet<Progress>(`/api/verification/${encodeURIComponent(tsapId)}/progress`);
    if (ok && d) setData(d);
    else setError(te ? "స్థితి లోడ్ కాలేదు — లాగిన్ చేసి మళ్లీ ప్రయత్నించండి." : "Could not load your status — sign in and try again.");
  }, [tsapId, te]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!tsapId) return null;
  if (error) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-4" aria-label={te ? "ధృవీకరణ పురోగతి" : "Verification progress"}>
        <p className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600">{error}</p>
      </section>
    );
  }
  if (!data) return null;

  const checks = data.checks || [];
  const sections = data.sections || [];

  return (
    <section
      className="mx-auto max-w-3xl px-4 py-5"
      aria-label={te ? "ధృవీకరణ పురోగతి" : "Verification progress"}
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-base font-black text-[#7A0C2E]">
          {te ? "🧾 రికార్డ్ చేసిన తనిఖీలు" : "🧾 Recorded checks"}
        </h2>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
          {te
            ? "ప్రతి తనిఖీ ఏమి నమోదు చేస్తుంది, ఏమి నిర్ధారించదు — రెండూ ఇక్కడ చూడండి."
            : "See exactly what each check records — and what it does not confirm."}
        </p>

        <ul className="mt-4 space-y-3">
          {checks.map((check) => (
            <li
              key={check.key}
              className={`rounded-2xl border p-3 ${check.recorded ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-slate-50/70"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-extrabold text-slate-900">
                  <span aria-hidden="true">{check.icon}</span> {te ? check.label_te : check.label_en}
                </p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${
                    check.recorded ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {check.recorded
                    ? te ? "నమోదైంది" : "Recorded"
                    : te ? "ఇంకా లేదు" : "Not recorded"}
                </span>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-700">
                <span className="font-bold">{te ? "నమోదు చేసేది: " : "Records: "}</span>
                {te ? check.records_te : check.records_en}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-rose-800">
                <span className="font-bold">{te ? "నిర్ధారించదు: " : "Does not: "}</span>
                {te ? check.does_not_te : check.does_not_en}
              </p>
              {!check.recorded && (
                <Link
                  href={check.href || "/verify"}
                  className="mt-2 inline-flex min-h-11 items-center rounded-xl border border-[#7A0C2E]/30 px-3 py-2 text-[11px] font-bold text-[#7A0C2E] transition hover:bg-[#7A0C2E]/5"
                >
                  {te ? check.next_step_te : check.next_step_en} →
                </Link>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-5 border-t border-slate-200 pt-4">
          <h3 className="text-xs font-black text-slate-900">
            {te ? "నమోదు చేసిన వివరాలు" : "Details provided"}
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {sections.map((section) => (
              <span
                key={section.key}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700"
              >
                <span aria-hidden="true">{section.icon}</span> {te ? section.label_te : section.label_en}{" "}
                <span className="font-black text-[#7A0C2E]">
                  {section.provided}/{section.total}
                </span>
              </span>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
            {te ? data.detail_note_te : data.detail_note_en}
          </p>
        </div>
      </div>
    </section>
  );
}
