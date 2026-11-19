"use client";

/**
 * 💌 INTEREST REQUEST COACH (WAVE 43)
 * Before a credit is spent: can you send, what will the owner receive, what
 * happens next, and opening lines built only from facts the members entered.
 * No promise of a reply, no guaranteed delivery.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet } from "@/lib/api";
import { Mail } from "lucide-react";
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
  refreshKey = "",
  onDuplicate,
}: {
  fromId: string;
  toId: string;
  onPickNote?: (note: string) => void;
  /** Changes after a send so credits and the duplicate state are re-read from the server. */
  refreshKey?: string;
  onDuplicate?: (duplicate: boolean) => void;
}) {
  const { lang } = useLang();
  const te = lang === "te";
  const [data, setData] = useState<Coach | null>(null);
  const [readState, setReadState] = useState<"loading" | "ready" | "error">("loading");
  const epoch = useRef(0);

  const load = useCallback(async () => {
    if (!fromId || !toId || fromId === toId) return;
    const current = ++epoch.current;
    setReadState("loading"); setData(null);
    try {
      const { ok, data: d } = await apiGet<Coach>(
        `/api/interest/coach?from_id=${encodeURIComponent(fromId)}&to_id=${encodeURIComponent(toId)}`,
      );
      if (current !== epoch.current) return;
      const bilingual = (row: unknown) => Boolean(row && typeof row === "object" &&
        typeof (row as Record<string, unknown>).en === "string" && String((row as Record<string, unknown>).en).trim() &&
        typeof (row as Record<string, unknown>).te === "string" && String((row as Record<string, unknown>).te).trim());
      if (!ok || !d || typeof d.can_send !== "boolean" || !Array.isArray(d.blockers) ||
          !d.blockers.every(x => typeof x === "string") || d.can_send !== (d.blockers.length === 0) ||
          (d.suggested_notes !== undefined && (!Array.isArray(d.suggested_notes) || !d.suggested_notes.every(n => bilingual(n) && typeof n.id === "string"))) ||
          !Number.isInteger(d.credits) || Number(d.credits) < 0 ||
          !Array.isArray(d.what_owner_receives) || !d.what_owner_receives.length || !d.what_owner_receives.every(bilingual) ||
          !Array.isArray(d.next_steps) || !d.next_steps.length || !d.next_steps.every(bilingual)) throw new Error("Guidance unavailable");
      setData(d); setReadState("ready"); onDuplicate?.(Boolean(d.duplicate_request));
    } catch {
      if (current !== epoch.current) return;
      setData(null); setReadState("error");
    }
  }, [fromId, toId, onDuplicate]);

  useEffect(() => {
    void load();
    return () => { epoch.current++; };
  }, [load, refreshKey]);

  if (!fromId || !toId || fromId === toId) return null;
  if (!data || readState !== "ready") return <section className="mv-surface mv-surface__body mt-4" aria-label={te ? "Request గైడెన్స్" : "Request guidance"}>
    <p role={readState === "error" ? "alert" : "status"}>{readState === "error" ? (te ? "Request వివరాలు లోడ్ కాలేదు. మళ్లీ ప్రయత్నించండి." : "Request guidance could not be loaded. Please retry.") : (te ? "Request వివరాలు లోడ్ అవుతున్నాయి…" : "Loading request guidance…")}</p>
    {readState === "error" && <button type="button" onClick={() => void load()} className="mt-2 min-h-11 rounded-xl border px-4 font-bold">{te ? "మళ్లీ ప్రయత్నించండి" : "Retry guidance"}</button>}
  </section>;

  const blockers = data.blockers || [];

  return (
    <section
      className="mx-auto mt-4 max-w-3xl px-4"
      aria-label={te ? "Request గైడెన్స్" : "Request guidance"}
    >
      <div className="mv-surface mv-surface__body sm:!p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="mv-surface__title mv-surface__title--ink">
            <Mail aria-hidden="true" className="mr-1 inline-block h-4 w-4" />{te ? "Request పంపే ముందు" : "Before you send"}
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
                <li key={reason} className="mv-note">
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
          <p className="mv-note mv-note--cool mt-2 text-[12px] font-semibold">
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
                  className="mv-rowblock"
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

        <p className="mt-4 rounded-xl bg-[#fffaf3] p-3 text-[11px] leading-relaxed text-slate-600">
          {te ? data.delivery_note_te : data.delivery_note_en}
        </p>
      </div>
    </section>
  );
}
