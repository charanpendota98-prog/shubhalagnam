"use client";


import { readApiJson } from "@/lib/api";
/**
 * QUICK LEAD — phone-first entry point (mass adoption + lead capture)
 * ==================================================================
 * Registration-assistance callback request. Contact is attempted only with
 * explicit, purpose-limited consent; timing and delivery are not guaranteed.
 */
import { useEffect, useState } from "react";
import { DISTRICTS_BY_STATE } from "@/lib/telugu-data";
import { useLang } from "@/lib/lang";

const HIDE_KEY = "tsap_quicklead_done";

export default function QuickLead({ source = "site", compact = false }: { source?: string; compact?: boolean }) {
  const { lang } = useLang();
  const te = lang === "te";
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [hidden, setHidden] = useState(false);   // SSR lo kanipisthundi (promo bar); done aithe client hide chestundi
  const [form, setForm] = useState({ name: "", phone: "", gender: "Bride", district: "", state: "TS", caste: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [contactConsent, setContactConsent] = useState(false);

  useEffect(() => {
    setHidden(localStorage.getItem(HIDE_KEY) === "1");
  }, []);

  if (hidden && !done) return null;

  const submit = async () => {
    if (!contactConsent) {
      setMsg({ ok: false, text: te ? "Follow-up కోసం contact consent అవసరం." : "Consent is required for a follow-up request." });
      return;
    }
    if (!/^\d{10}$/.test(form.phone)) {
      setMsg({ ok: false, text: te ? "10 digit mobile number ఇవ్వండి" : "Enter a 10-digit mobile number" });
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/leads/quick", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source, contact_consent: contactConsent }),
      });
      const d = await readApiJson(r);
      if (r.ok && d.success) {
        setMsg({ ok: true, text: (te ? d.message_telugu : d.message_en) || (te ? "మీ అభ్యర్థన నమోదు అయింది." : "Your request was recorded.") });
        setDone(true);
        localStorage.setItem(HIDE_KEY, "1");
      } else {
        setMsg({ ok: false, text: d.detail || (te ? "Save అవ్వలేదు — మళ్లీ try చెయ్యండి" : "Save failed — retry") });
      }
    } catch {
      setMsg({ ok: false, text: te ? "Network problem — మళ్లీ try చెయ్యండి" : "Network problem — retry" });
    }
    setBusy(false);
  };

  if (done) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
        <div className="font-bold text-emerald-900 text-[14px]">{te ? "✅ అభ్యర్థన నమోదు అయింది" : "✅ Request recorded"}</div>
        <div className="text-[12px] text-emerald-800 mt-1 telugu">{msg?.text}</div>
        <div className="text-[11px] text-emerald-700 mt-2">
          {te ? <>మీకు అనుకూలమైనప్పుడు <a href="/register" className="underline font-bold">ఉచిత నమోదు</a> ప్రారంభించండి.</> : <>Register for free whenever you are ready: <a href="/register" className="underline font-bold">Create a profile</a>.</>}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-[#7A0C2E] to-[#A0143A] rounded-2xl p-4 text-white">
      {!open ? (
        <div className="flex items-center gap-3">
          <div className="text-2xl">📱</div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[14px]">{te ? "రిజిస్ట్రేషన్ సహాయం కావాలా?" : "Need help with registration?"}</div>
            <div className="text-[11px] opacity-90 telugu">{te ? "Follow-up అభ్యర్థన పంపండి. సంప్రదింపు/సమయం అందుబాటుపై ఆధారపడుతుంది." : "Request a follow-up. Contact and timing depend on availability."}</div>
          </div>
          <button type="button" onClick={() => setOpen(true)} className="shrink-0 gold-gradient text-maroon font-bold text-[13px] px-4 py-2.5 rounded-xl">
            Start
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="font-bold text-[14px]">{te ? "📱 సంప్రదింపు అభ్యర్థన" : "📱 Contact request"}</div>
            <button type="button" aria-label={te ? "మూసివేయండి" : "Close"} onClick={() => setOpen(false)} className="text-[12px] opacity-80">✕</button>
          </div>
          <input value={form.phone} inputMode="tel" autoComplete="tel" placeholder={te ? "Mobile number (10 అంకెలు) *" : "Mobile number (10 digits) *"}
            onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
            className="input-mobile !bg-white/95" aria-label={te ? "Follow-up కోసం mobile number" : "Mobile number for follow-up"} />
          <input value={form.name} placeholder={te ? "మీ పేరు (optional)" : "Your name (optional)"}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input-mobile !bg-white/95" aria-label={te ? "మీ పేరు" : "Your name"} />
          <div className="flex gap-2">
            {["Bride", "Groom"].map((g) => (
              <button type="button" key={g} onClick={() => setForm({ ...form, gender: g })}
                className={`chip flex-1 justify-center ${form.gender === g ? "chip-on-gold" : "!bg-white/95 !text-maroon"}`}>
                {g === "Bride" ? "👰 Bride" : "🤵 Groom"}
              </button>
            ))}
          </div>
          {!compact && (
            <div className="flex gap-2">
              <select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value, district: "" })}
                className="input-mobile !bg-white/95 !text-maroon" aria-label="Select option">
                <option value="TS">Telangana</option><option value="AP">Andhra Pradesh</option>
              </select>
              <select value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })}
                className="input-mobile !bg-white/95 !text-maroon" aria-label="Select option">
                <option value="">District (optional)</option>
                {(DISTRICTS_BY_STATE[form.state] || []).map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}
          <label htmlFor="quicklead-contact-consent" className="flex items-start gap-2 rounded-xl border border-white/30 bg-white/10 p-3 text-[11px] leading-relaxed">
            <input id="quicklead-contact-consent" type="checkbox" checked={contactConsent}
              onChange={(event) => setContactConsent(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-amber-400" />
            <span>{te ? "ఈ registration సహాయం అభ్యర్థన గురించి phone లేదా WhatsApp ద్వారా సంప్రదించడానికి అంగీకరిస్తున్నాను. ప్రచార సందేశాలకు కాదు; సమయం హామీ కాదు." : "I agree to be contacted by phone or WhatsApp about this registration-assistance request only. No promotional messages; timing is not guaranteed."}</span>
          </label>
          <button type="button" onClick={submit} disabled={busy || !contactConsent}
            className="w-full py-3.5 rounded-2xl gold-gradient text-maroon font-bold text-[15px] disabled:cursor-not-allowed disabled:opacity-60">
            {busy ? (te ? "నమోదు అవుతోంది…" : "Submitting…") : te ? "✅ Follow-up అభ్యర్థన పంపండి" : "✅ Request follow-up"}
          </button>
          {msg && <div className={`text-[12px] ${msg.ok ? "text-emerald-200" : "text-amber-200"}`} role={msg.ok ? "status" : "alert"}>{msg.text}</div>}
          <div className="text-[10px] opacity-80">{te ? "🔒 Number public లో చూపించము; అభ్యర్థించిన సహాయం కోసం మాత్రమే ఉపయోగిస్తాం • 🚫 In-site chat లేదు" : "🔒 Your number is not shown publicly and is used only for requested assistance • 🚫 No in-site chat"}</div>
        </div>
      )}
    </div>
  );
}
