"use client";

/**
 * Referral partner registration and dashboard. Reward eligibility follows the
 * published one-time qualifying consumer-plan rule; no payment is guaranteed.
 */
import { useState } from "react";
import Link from "next/link";
import { Duo, duo } from "@/lib/duo";
import { useLang } from "@/lib/lang";
import { apiDisplayMessage, readApiJson} from "@/lib/api";
import { DISTRICTS_BY_STATE } from "@/lib/telugu-data";

const STATES = [
  { value: "AP", label: "Andhra Pradesh" },
  { value: "KA", label: "Karnataka" },
  { value: "MH", label: "Maharashtra" },
  { value: "Other", label: "Other" },
  { value: "TS", label: "Telangana" },
];

export default function PartnerRegisterPage() {
  const { lang } = useLang();
  const te = lang === "te";
  const [f, setF] = useState({ name: "", phone: "", address: "", state: "", district: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState<{ partner_id?: string; link?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [lookup, setLookup] = useState("");
  const [dash, setDash] = useState<any>(null);
  const [phoneForAccess, setPhoneForAccess] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [partnerToken, setPartnerToken] = useState("");
  const [privateDash, setPrivateDash] = useState<any>(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutUpi, setPayoutUpi] = useState("");
  const [payoutBusy, setPayoutBusy] = useState(false);
  const [payoutMsg, setPayoutMsg] = useState("");
  const [authMsg, setAuthMsg] = useState("");

  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const dists: string[] = f.state === "Other" ? [] : ((DISTRICTS_BY_STATE as Record<string, string[]>)[f.state] || []);

  const submit = async () => {
    if (!f.name.trim() || !f.phone.trim() || !f.state || !f.district.trim()) {
      setMsg(te ? "పేరు, మొబైల్, రాష్ట్రం మరియు జిల్లా ఇవ్వండి." : "Enter your name, mobile, state and district.");
      return;
    }
    setBusy(true); setMsg(""); setDone(null);
    try {
      const r = await fetch("/api/referral/partner/register", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f),
      });
      const d = await readApiJson(r);
      if (!r.ok) { setMsg(apiDisplayMessage(d, te, te ? "నమోదు విఫలమైంది. మళ్లీ ప్రయత్నించండి." : "Registration failed. Please try again.")); return; }
      setDone(d);
      setLookup(d.partner_id || "");
      setPhoneForAccess(f.phone);
      setPrivateDash(null);
      setPartnerToken("");
      setMsg(apiDisplayMessage(d, te, te ? "నమోదు పూర్తయింది." : "Registration complete."));
      if (d.partner_id) {
        const dashboardResponse = await fetch(`/api/referral/partner/${encodeURIComponent(d.partner_id)}`);
        const dashboardData = await readApiJson(dashboardResponse);
        if (dashboardResponse.ok && dashboardData.success) setDash(dashboardData);
      }
    } catch {
      setMsg(te ? "Network లేదు — మళ్లీ try చెయ్యండి" : "Network error — please retry");
    } finally {
      setBusy(false);
    }
  };

  const copy = async (t: string) => {
    try { await navigator.clipboard.writeText(t); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { /* ignore */ }
  };

  const loadDash = async () => {
    const id = lookup.trim();
    if (!id) return;
    setDash(null); setMsg(""); setPrivateDash(null); setPartnerToken(""); setOtpSent(false); setOtpCode(""); setPayoutMsg("");
    try {
      const r = await fetch(`/api/referral/partner/${encodeURIComponent(id)}`);
      const d = await readApiJson(r);
      if (!r.ok) { setMsg(apiDisplayMessage(d, te, te ? "భాగస్వామి ID దొరకలేదు." : "Partner ID was not found.")); return; }
      setDash(d);
    } catch { setMsg(te ? "Network లేదు" : "No network"); }
  };

  const loadPrivateDash = async (id: string, token: string) => {
    try {
      const r = await fetch(`/api/referral/partner/${encodeURIComponent(id)}/private`, {
        headers: { "X-Partner-Token": token },
      });
      const d = await readApiJson(r);
      if (!r.ok || !d.success) {
        setPrivateDash(null); setPartnerToken("");
        setAuthMsg(apiDisplayMessage(d, te, te ? "Wallet వివరాలు లోడ్ కాలేదు; OTP మళ్లీ verify చేయండి." : "Could not load wallet details. Please verify the OTP again."));
        return false;
      }
      setPrivateDash(d);
      setAuthMsg("");
      return true;
    } catch {
      setAuthMsg(te ? "Network లేదు — wallet వివరాలు లోడ్ కాలేదు." : "Network error while loading wallet details.");
      return false;
    }
  };

  const sendPartnerOtp = async () => {
    const phone = phoneForAccess.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setAuthMsg(te ? "భాగస్వామి నమోదులో ఉన్న 10 అంకెల మొబైల్ ఇవ్వండి." : "Enter the 10-digit mobile number registered to this partner ID.");
      return;
    }
    setAuthBusy(true); setAuthMsg("");
    try {
      const r = await fetch("/api/otp/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, purpose: "login" }),
      });
      const d = await readApiJson(r);
      if (!r.ok || !d.success) { setAuthMsg(apiDisplayMessage(d, te, te ? "OTP పంపలేకపోయాం." : "Could not send the one-time code.")); return; }
      setOtpSent(true);
      setAuthMsg(apiDisplayMessage(d, te, te ? "OTP పంపించాం. 10 నిమిషాల్లో నమోదు చేయండి." : "One-time code sent. Enter it within 10 minutes."));
    } catch {
      setAuthMsg(te ? "Network లేదు — OTP పంపలేకపోయాం." : "Network error while sending OTP.");
    } finally {
      setAuthBusy(false);
    }
  };

  const verifyPartnerOtp = async () => {
    const id = String(dash?.partner_id || lookup.trim());
    const phone = phoneForAccess.replace(/\D/g, "");
    const code = otpCode.trim();
    if (!id || !/^[6-9]\d{9}$/.test(phone) || !/^\d{4}$/.test(code)) {
      setAuthMsg(te ? "భాగస్వామి ID, నమోదు చేసిన మొబైల్ మరియు 4 అంకెల OTP ఇవ్వండి." : "Enter the partner ID, registered mobile and 4-digit OTP.");
      return;
    }
    setAuthBusy(true); setAuthMsg("");
    try {
      const verifyResponse = await fetch("/api/otp/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const verifyData = await readApiJson(verifyResponse);
      if (!verifyResponse.ok || !verifyData.success) {
        setAuthMsg(apiDisplayMessage(verifyData, te, te ? "OTP సరిపోలలేదు." : "One-time code verification failed."));
        return;
      }
      const authResponse = await fetch(`/api/referral/partner/${encodeURIComponent(id)}/auth`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const authData = await readApiJson(authResponse);
      if (!authResponse.ok || !authData.success || !authData.partner_token) {
        setAuthMsg(apiDisplayMessage(authData, te, te ? "ఈ మొబైల్ ఈ partner ID కి సరిపోలలేదు." : "That mobile number does not match this partner ID."));
        return;
      }
      setPartnerToken(authData.partner_token);
      await loadPrivateDash(id, authData.partner_token);
    } catch {
      setAuthMsg(te ? "Network సమస్య — మళ్లీ ప్రయత్నించండి." : "Network error — please retry.");
    } finally {
      setAuthBusy(false);
    }
  };

  const requestPartnerPayout = async () => {
    const id = String(privateDash?.partner_id || dash?.partner_id || "");
    const amount = Number(payoutAmount);
    if (!partnerToken || !id) {
      setPayoutMsg(te ? "ముందుగా OTP verify చేయండి." : "Verify the registered mobile first.");
      return;
    }
    if (!Number.isInteger(amount) || amount < 50 || amount > Number(privateDash?.wallet || 0)) {
      setPayoutMsg(te ? "మొత్తం ₹50 కనీస పరిమితి మరియు wallet balance మధ్యలో ఉండాలి." : "Enter a whole-rupee amount from ₹50 up to your available wallet balance.");
      return;
    }
    if (!payoutUpi.trim()) {
      setPayoutMsg(te ? "మీ UPI ID ఇవ్వండి." : "Enter your UPI ID.");
      return;
    }
    setPayoutBusy(true); setPayoutMsg("");
    try {
      const r = await fetch("/api/referral/partner/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Partner-Token": partnerToken },
        body: JSON.stringify({ partner_id: id, amount, method: "upi", upi_id: payoutUpi.trim() }),
      });
      const d = await readApiJson(r);
      if (!r.ok || !d.success) {
        setPayoutMsg(apiDisplayMessage(d, te, te ? "Payout అభ్యర్థన విఫలమైంది." : "Payout request failed."));
        return;
      }
      setPayoutAmount("");
      setPayoutMsg(apiDisplayMessage(d, te, te ? "అభ్యర్థన సమీక్ష కోసం పంపబడింది." : "Request submitted for review."));
      await loadPrivateDash(id, partnerToken);
    } catch {
      setPayoutMsg(te ? "Network సమస్య — మళ్లీ ప్రయత్నించండి." : "Network error — please retry.");
    } finally {
      setPayoutBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-extrabold text-maroon">🤝 <Duo en="Become a Referral Partner" te="రిఫరల్ భాగస్వామి అవండి" /></h1>
      <p className="mt-1 text-sm text-emerald-800 font-bold telugu">
        {duo("Anyone can request a referral partner ID. Credits and any cash reward follow separate eligibility terms.",
             "ఎవరైనా referral partner ID కోసం నమోదు చేసుకోవచ్చు. Credits మరియు cash reward కు వేర్వేరు అర్హత నియమాలు వర్తిస్తాయి.")}
      </p>
      <p className="mt-1 text-sm text-slate-600 telugu">
        {duo("Create your ID and link. A valid referral attachment grants +2 interest-request credits to you and +1 to the new user (not cash). You may qualify for ₹50 once only if the referred user's first S_99/S_199/S_299/S_499 consumer-plan payment is at least ₹99. Exclusions apply; payout requests receive manual review.",
             "మీ ID మరియు link సృష్టించండి. Valid referral attach పై మీకు +2, కొత్త user కు +1 interest-request credits వస్తాయి (cash కాదు). Referred user మొదటి S_99/S_199/S_299/S_499 consumer-plan payment కనీసం ₹99 అయితే మాత్రమే మీకు ఒక్కసారి ₹50 అర్హత ఉండవచ్చు. మినహాయింపులు, manual payout review వర్తిస్తాయి.")}
      </p>

      <section className="mt-4 rounded-2xl border border-gold/40 bg-gradient-to-br from-cream to-white p-4 card-shadow">
        <div className="text-[13px] font-bold text-maroon">
          {duo("👥 Who can join?", "👥 ఎవరు చేరవచ్చు?")}
        </div>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
          {[
            { i: "🎓", en: "Students", te: "విద్యార్థులు" },
            { i: "🏠", en: "Homemakers", te: "గృహిణులు" },
            { i: "💼", en: "Working pros", te: "ఉద్యోగస్తులు" },
            { i: "🧑‍🌾", en: "Anyone with a phone", te: "ఫోన్ ఉన్న ఎవరైనా" },
          ].map((c) => (
            <div key={c.en} className="rounded-xl bg-white border border-gold/25 p-2.5">
              <div className="text-lg">{c.i}</div>
              <div className="mt-1 font-semibold text-ink telugu">{duo(c.en, c.te)}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-[12px] text-slate-600 font-medium telugu text-center">
          {duo("A registration or general payment alone does not earn a cash reward. See the referral terms for qualifying plans and exclusions.",
               "నమోదు లేదా ఏ payment అయినా cash reward ఇవ్వదు. అర్హమైన plans మరియు మినహాయింపుల కోసం referral terms చూడండి.")}
        </div>
      </section>

      {!done ? (
        <section className="mt-4 rounded-2xl border border-gold/30 bg-white p-4 card-shadow space-y-3">
          <div>
            <label className="text-[13px] font-bold">👤 {duo("Your name", "మీ పేరు")} *</label>
            <input aria-label={te ? "మీ పేరు" : "Your name"} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder={te ? "మీ పేరు" : "Your name"}
              autoComplete="name" className="input-mobile mt-1" />
          </div>
          <div>
            <label className="text-[13px] font-bold">📞 {duo("Mobile", "మొబైల్")} *</label>
            <input aria-label={te ? "10 అంకెల మొబైల్ నంబర్" : "10-digit mobile number"} value={f.phone} onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
              inputMode="numeric" autoComplete="tel" placeholder={te ? "10 అంకెల మొబైల్ నంబర్" : "10-digit mobile number"} className="input-mobile mt-1" />
          </div>
          <div>
            <label className="text-[13px] font-bold">🏠 {duo("Address", "చిరునామా")}</label>
            <input aria-label="Village/Town, Mandal" value={f.address} onChange={(e) => set("address", e.target.value)} placeholder="Village/Town, Mandal"
              className="input-mobile mt-1" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[13px] font-bold">🗺️ {duo("State", "రాష్ట్రం")} *</label>
              <select aria-label={te ? "రాష్ట్రం" : "State"} value={f.state} onChange={(e) => { set("state", e.target.value); set("district", ""); }}
                className="input-mobile mt-1" required>
                <option value="">{te ? "రాష్ట్రం ఎంచుకోండి" : "Select a state"}</option>
                {STATES.map((state) => <option key={state.value} value={state.value}>{state.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[13px] font-bold">📍 {duo("District", "జిల్లా")} *</label>
              {dists.length ? (
                <select aria-label={te ? "జిల్లా" : "District"} value={f.district} onChange={(e) => set("district", e.target.value)} className="input-mobile mt-1" required>
                  <option value="">{te ? "జిల్లా ఎంచుకోండి" : "Select a district"}</option>
                  {dists.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              ) : (
                <input aria-label={te ? "మీ జిల్లా" : "Your district"} value={f.district} onChange={(e) => set("district", e.target.value)} placeholder={te ? "మీ జిల్లా" : "Your district"}
                  required className="input-mobile mt-1" />
              )}
            </div>
          </div>
          {msg ? <p className="text-[13px] font-medium text-maroon">{msg}</p> : null}
          <button type="button" onClick={submit} disabled={busy}
            className="w-full rounded-2xl maroon-gradient text-white font-bold py-3 disabled:opacity-50">
            {busy ? "…" : <>🚀 <Duo en="Create my Partner ID" te="నా భాగస్వామి ID సృష్టించండి" /></>}
          </button>
        </section>
      ) : (
        <section className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-center">
          <div className="text-4xl">🎉</div>
          <div className="font-bold text-emerald-900 text-lg mt-1">ID: <span className="font-mono">{done.partner_id}</span></div>
          <div className="mt-2 rounded-xl bg-white border border-emerald-200 p-3 text-[12px] font-mono break-all">{done.link}</div>
          <div className="mt-3 flex gap-2 justify-center">
            <button type="button" onClick={() => void copy(String(done.link || ""))}
              className="rounded-full bg-[#7A0C2E] text-white px-5 py-2.5 text-sm font-bold">
              {copied ? "copied ✓" : (te ? "🔗 Link copy" : "🔗 Copy link")}
            </button>
            <button type="button" onClick={() => { setDone(null); setMsg(""); }}
              className="rounded-full border border-emerald-400 px-5 py-2.5 text-sm font-bold text-emerald-800">
              + {duo("New partner", "కొత్త భాగస్వామి")}
            </button>
          </div>
          <p className="mt-3 text-[12px] text-emerald-900 telugu">
            {duo("This link is for registration. A ₹50 reward is possible only once on a qualifying first consumer-plan payment (minimum ₹99); exclusions apply and payout requests are manually reviewed.",
                 "ఈ link నమోదు కోసం. అర్హమైన మొదటి consumer-plan payment కనీసం ₹99 అయితే మాత్రమే ఒక్కసారి ₹50 reward ఉండవచ్చు; మినహాయింపులు మరియు manual review వర్తిస్తాయి.")}
          </p>
        </section>
      )}

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold">📊 <Duo en="My partner dashboard" te="నా భాగస్వామి డాష్‌బోర్డ్" /></h2>
        <div className="mt-2 flex gap-2">
          <input aria-label={te ? "Partner ID" : "Partner ID"} value={lookup} onChange={(e) => setLookup(e.target.value.toUpperCase())} placeholder={te ? "Partner ID" : "Partner ID"}
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <button type="button" onClick={loadDash} className="rounded-xl border border-[#7A0C2E] px-4 py-2 text-sm font-bold text-maroon">
            {te ? "చూడు" : "View"}
          </button>
        </div>
        {msg ? <p className="mt-2 text-sm font-medium text-maroon" role="status">{msg}</p> : null}
        {dash?.success ? (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-1 gap-2 text-center text-[12px] sm:grid-cols-3">
              <div className="rounded-xl bg-cream p-3"><b>{dash.clicks ?? 0}</b><br />👆 {duo("Link clicks", "లింక్ క్లిక్‌లు")}</div>
              <div className="rounded-xl bg-cream p-3"><b>{dash.registrations ?? 0}</b><br />{duo("Registrations", "నమోదులు")}</div>
              <div className="rounded-xl bg-cream p-3"><b>{dash.paid_count ?? 0}</b><br />{duo("Qualifying first-plan payments", "అర్హమైన first-plan payments")}</div>
              {dash.link ? (
                <div className="col-span-1 flex flex-wrap gap-2 justify-center sm:col-span-3">
                  <button type="button" onClick={() => void copy(String(dash.link))}
                    className="min-h-10 rounded-full bg-[#7A0C2E] text-white px-4 py-2 text-[12px] font-bold">
                    {copied ? "copied ✓" : (te ? "🔗 Link copy" : "🔗 Copy link")}
                  </button>
                  <a href={`https://wa.me/?text=${encodeURIComponent(te ? `Mana Vivaha • మన వివాహ లో నమోదు చేసుకోండి. Valid referral attach పై కొత్త user కు +1, referrer కు +2 interest-request credits (cash కాదు). ₹50 reward కు first qualifying S_99/S_199/S_299/S_499 consumer-plan payment కనీసం ₹99 కావాలి; exclusions వర్తిస్తాయి. నియమాలు: https://manavivaha.in/referral ${dash.link}` : `Register on Mana Vivaha • మన వివాహ. A valid referral attachment gives +1 request credit to the new user and +2 to the referrer (not cash). A one-time ₹50 reward may qualify only on the first eligible S_99/S_199/S_299/S_499 consumer-plan payment of at least ₹99; exclusions apply. Terms: https://manavivaha.in/referral ${dash.link}`)}`}
                    target="_blank" rel="noreferrer"
                    className="min-h-10 rounded-full bg-[#25D366] text-white px-4 py-2 text-[12px] font-bold">
                    📲 WhatsApp share
                  </a>
                </div>
              ) : null}
            </div>
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[12px] leading-relaxed text-slate-600">
              {duo("Public dashboard shows aggregate counts only. Wallet balance and payout details require verification of the mobile number registered to this partner ID.",
                   "Public dashboard లో మొత్తం లెక్కలే కనిపిస్తాయి. Wallet balance మరియు payout వివరాల కోసం ఈ partner ID కు నమోదైన మొబైల్ verify చేయాలి.")}
            </p>
            {Array.isArray(dash.joins) && dash.joins.length ? (
              <div className="rounded-xl border border-slate-200 bg-white p-2 text-left space-y-1" aria-label={te ? "గుర్తింపు వివరాలు లేని referral activity" : "Anonymous referral activity"}>
                <div className="px-1 pb-1 text-[11px] font-bold text-slate-500">{duo("Recent activity (anonymous)", "ఇటీవలి activity (గుర్తింపు వివరాలు లేకుండా)")}</div>
                {dash.joins.map((j: any) => (
                  <div key={String(j.join_no)} className="flex items-center justify-between gap-2 rounded-lg bg-cream/60 px-2 py-1.5 text-[12px]">
                    <div className="min-w-0 font-semibold text-slate-700">Referral #{j.join_no}</div>
                    <span className={`shrink-0 text-right font-bold ${j.paid ? "text-emerald-700" : "text-amber-600"}`}>
                      {j.paid ? "✅ Eligible reward recorded" : j.reward_reversed ? "↩️ Reward reversed" : "No eligible reward recorded"}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
            {!privateDash?.success ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-3">
                <h3 className="text-sm font-bold text-maroon">🔐 {duo("Verify partner mobile to view wallet", "Wallet చూడటానికి partner మొబైల్ verify చేయండి")}</h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                  <input aria-label={te ? "నమోదైన 10 అంకెల మొబైల్" : "Registered 10-digit mobile"} type="tel" inputMode="numeric" autoComplete="tel" value={phoneForAccess}
                    onChange={(e) => setPhoneForAccess(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder={te ? "నమోదైన 10 అంకెల మొబైల్" : "Registered 10-digit mobile"}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                  <button type="button" onClick={sendPartnerOtp} disabled={authBusy}
                    className="min-h-10 rounded-xl bg-[#7A0C2E] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                    {authBusy ? "…" : duo("Send OTP", "OTP పంపండి")}
                  </button>
                </div>
                {otpSent ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                    <input aria-label={te ? "4 అంకెల OTP" : "4-digit OTP"} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={4} value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder={te ? "4 అంకెల OTP" : "4-digit OTP"}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                    <button type="button" onClick={verifyPartnerOtp} disabled={authBusy}
                      className="min-h-10 rounded-xl border border-[#7A0C2E] px-4 py-2 text-sm font-bold text-maroon disabled:opacity-50">
                      {authBusy ? "…" : duo("Verify & continue", "Verify చేసి కొనసాగండి")}
                    </button>
                  </div>
                ) : null}
                {authMsg ? <p className="text-xs font-medium text-maroon" role="status">{authMsg}</p> : null}
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                <h3 className="text-sm font-bold text-emerald-900">👛 {duo("Private wallet & payout request", "వ్యక్తిగత wallet మరియు payout అభ్యర్థన")}</h3>
                <div className="grid grid-cols-1 gap-2 text-center text-[12px] sm:grid-cols-3">
                  <div className="rounded-xl bg-white p-3"><b>₹{privateDash.wallet ?? 0}</b><br />{duo("Available wallet", "అందుబాటులో ఉన్న wallet")}</div>
                  <div className="rounded-xl bg-white p-3"><b>₹{privateDash.pending_payout ?? 0}</b><br />{duo("Under review", "Review లో ఉంది")}</div>
                  <div className="rounded-xl bg-white p-3"><b>₹{privateDash.qualifying_rewards_total ?? 0}</b><br />{duo("Recorded qualifying rewards", "నమోదైన అర్హమైన rewards")}</div>
                </div>
                <p className="text-[12px] leading-relaxed text-slate-600">
                  {duo("A payout request is not a transfer. Requests receive manual review; processing time is not guaranteed.",
                       "Payout request పంపడం transfer కాదు. అభ్యర్థనలకు manual review ఉంటుంది; processing time హామీ లేదు.")}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="text-[11px] font-semibold text-slate-700">{duo("Amount (₹50 minimum)", "మొత్తం (కనీసం ₹50)")}
                    <input type="number" inputMode="numeric" min={50} max={Number(privateDash.wallet || 0)} step={1}
                      value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                  </label>
                  <label className="text-[11px] font-semibold text-slate-700">{duo("Your UPI ID", "మీ UPI ID")}
                    <input type="text" autoComplete="off" value={payoutUpi} onChange={(e) => setPayoutUpi(e.target.value)}
                      placeholder={te ? "మీ UPI ID" : "Enter your UPI ID"}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                  </label>
                </div>
                <button type="button" onClick={requestPartnerPayout} disabled={payoutBusy || Number(privateDash.wallet || 0) < 50}
                  className="min-h-11 w-full rounded-xl bg-[#7A0C2E] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                  {payoutBusy ? "…" : duo("Submit payout request", "Payout అభ్యర్థన పంపండి")}
                </button>
                {payoutMsg ? <p className="text-xs font-medium text-emerald-900" role="status">{payoutMsg}</p> : null}
                {authMsg ? <p className="text-xs font-medium text-emerald-900" role="status">{authMsg}</p> : null}
              </div>
            )}
          </div>
        ) : null}
      </section>

      <p className="mt-4 text-center text-sm text-slate-600">
        <Link href="/referral" className="font-semibold text-maroon underline">← Referral home</Link>
      </p>
    </div>
  );
}
