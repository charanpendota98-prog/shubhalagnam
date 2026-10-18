"use client";

/**
 * 💌 INTEREST REQUEST COACH (WAVE 43)
 * Before a credit is spent: can you send, what will the owner receive, what
 * happens next, and opening lines built only from facts the members entered.
 * No promise of a reply, no guaranteed delivery.
 */
import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { useLang } from "@/lib/lang";

type Note = { id: string; en: string; te: string };
type Coach = {
  can_send: boolean;
  blockers?: string[];
  fix_href?: string;
  credits?: number;
  credits_needed?: number;
  sent_today?: number;
  daily_limit?: number;
  duplicate_request?: { request_id: string; status: string; created_at: string } | null;
  blocked?: boolean;
  what_owner_receives?: { en: string; te: string }[];
  next_steps?: { step: string; en: string; te: string }[];
  suggested_notes?: Note[];
  delivery_note_en?: string;
  delivery_note_te?: string;
  disclaimer_en?: string;
  disclaimer_te?: string;
};

const BLOCKER_COPY: Record<string, { en: string; te: string; href?: string }> = {
  profile_missing: { en: "Sign in with your own profile ID first.", te: "ముందు మీ స్వంత ప్రొఫైల్ ID తో లాగిన్ చేయండి.", href: "/login" },
  self_request: { en: "You cannot send a request to your own profile.", te: "మీ ప్రొఫైల్‌కు మీరు request పంపలేరు." },
  same_gender: { en: "Interest requests are for the opposite gender on this service.", te: "ఈ సేవలో వ్యతిరేక లింగానికి మాత్రమే requests పంపాలి." },
  duplicate_request: { en: "You already sent a request to this profile — wait for the reply.", te: "ఈ ప్రొఫైల్‌కు ఇప్పటికే request పంపారు — సమాధానం కోసం వేచి ఉండండి." },
  no_credits: { en: "You have no request credits left on this plan.", te: "ఈ ప్లాన్‌లో request credits లేవు.", href: "/requests#plans" },
  blocked: { en: "Contact is blocked between these profiles.", te: "ఈ ప్రొఫైల్‌ల మధ్య contact block అయ్యింది." },
};

export default function RequestCoach({
  fromId,
  toId,
  onPickNote,
}: {
  fromId: string;
  toId: string;
  onPickNote?: (note: string) => void;
}) {
  const { lang } = useLang();
  const te = lang === "te";
  const [data, setData] = useState<Coach | null>(null);

  const load = useCallback(async () => {
    if (!fromId || !toId || fromId === toId) return;
    const { ok, data: d } = await apiGet<Coach>(
      `/api/interest/coach?from_id=${encodeURIComponent(fromId)}&to_id=${encodeURIComponent(toId)}`,
    );
    if (ok && d) setData(d);
  }, [fromId, toId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!fromId || !toId || fromId === toId || !data) return null;

  const blockers = data.blockers || [];

  return (
    <section
      className="mx-auto mt-4 max-w-3xl px-4"
      aria-label={te ? "Request గైడెన్స్" : "Request guidance"}
    >
      <div className="rounded-3xl border border-gold/40 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-black text-[#7A0C2E]">
            {te ? "💌 Request పంపే ముందు" : "💌 Before you send"}
          </h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
            {te ? "Credits: " : "Credits: "}
            <span className="text-[#7A0C2E]">{data.credits ?? 0}</span>
            {typeof data.daily_limit === "number" && data.daily_limit > 0 && (
              <>
                {" · "}
                {te ? "ఈ రోజు: " : "Today: "}
                <span className="text-[#7A0C2E]">
                  {data.sent_today ?? 0}/{data.daily_limit}
                </span>
              </>
            )}
          </span>
        </div>

        {blockers.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {blockers.map((reason) => {
              const copy = BLOCKER_COPY[reason] || { en: reason, te: reason };
              return (
                <li key={reason} className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-[12px] font-semibold text-amber-900">{te ? copy.te : copy.en}</p>
                  {copy.href && (
                    <a
                      href={copy.href}
                      className="mt-1 inline-flex min-h-11 items-center text-[11px] font-bold text-[#7A0C2E] underline underline-offset-2"
                    >
                      {te ? "ఇక్కడ కొనసాగించండి" : "Continue here"} →
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-[12px] font-semibold text-emerald-900">
            {te
              ? "ఈ request పంపడానికి మీరు అర్హులు — ఒక credit ఖర్చవుతుంది."
              : "You can send this request — it uses one request credit."}
          </p>
        )}

        <div className="mt-4">
          <h3 className="text-xs font-black text-slate-900">
            {te ? "ఆ ప్రొఫైల్ యజమానికి ఏమి వెళ్తుంది" : "What the profile owner receives"}
          </h3>
          <ul className="mt-1.5 space-y-1">
            {(data.what_owner_receives || []).map((item) => (
              <li key={item.en} className="text-[12px] leading-relaxed text-slate-700">
                • {te ? item.te : item.en}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4">
          <h3 className="text-xs font-black text-slate-900">
            {te ? "తర్వాత ఏమి జరుగుతుంది" : "What happens next"}
          </h3>
          <ol className="mt-1.5 space-y-1">
            {(data.next_steps || []).map((step, index) => (
              <li key={step.step} className="text-[12px] leading-relaxed text-slate-700">
                {index + 1}. {te ? step.te : step.en}
              </li>
            ))}
          </ol>
        </div>

        {blockers.length === 0 && (data.suggested_notes || []).length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-black text-slate-900">
              {te ? "మీరు రాయగలిగే ఓపెనింగ్ లైన్లు" : "Opening lines you can use"}
            </h3>
            <div className="mt-2 space-y-2">
              {(data.suggested_notes || []).map((note) => (
                <div
                  key={note.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3"
                >
                  <p className="text-[12px] leading-relaxed text-slate-700">{te ? note.te : note.en}</p>
                  {onPickNote && (
                    <button
                      type="button"
                      onClick={() => onPickNote(te ? note.te : note.en)}
                      className="mt-2 inline-flex min-h-11 items-center rounded-xl border border-[#7A0C2E]/30 px-3 py-2 text-[11px] font-bold text-[#7A0C2E] transition hover:bg-[#7A0C2E]/5"
                    >
                      {te ? "ఈ సందేశం వాడండి" : "Use this message"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
          {te ? data.delivery_note_te : data.delivery_note_en}
        </p>
      </div>
    </section>
  );
}
