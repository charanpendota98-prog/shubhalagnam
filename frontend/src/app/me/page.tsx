"use client";
/**
 * 🙋 MANA VIVAHA — MY ACCOUNT & PROFILE DASHBOARD
 * =====================================================
 * • 100% Profile Completion & In-Place Profile Editor
 * • Streak + Unlocks + Boost + Voice + Jathakam + Share + Alerts
 * • Real-time DB sync and instant match ranking upgrade
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import AuthGate from "@/components/AuthGate";
import RasiChart from "@/components/RasiChart";
import PushBell from "@/components/PushBell";
import { apiGet, apiPost, authHeaders } from "@/lib/api";
import { Duo } from "@/lib/duo";
import { useLang } from "@/lib/lang";
import {
  CASTES,
  CASTE_TELUGU,
  EDUCATIONS,
  HEIGHTS,
  NAKSHATRAS,
  RASIS,
  SALARIES,
  DISTRICTS_BY_STATE,
  DISTRICT_TELUGU,
  WORK_TYPES,
  heightLabel,
} from "@/lib/telugu-data";

type Row = Record<string, any>;
type Tab = "edit" | "streak" | "unlocks" | "boost" | "voice" | "jathakam" | "share" | "alerts";

const TABS: [Tab, string, string][] = [
  ["edit", "✏️ Edit Profile", "✏️ ప్రొఫైల్ సవరణ (100%)"],
  ["streak", "🔥 Streak", "🔥 స్ట్రీక్"],
  ["unlocks", "📋 Unlocks", "📋 అన్‌లాక్‌లు"],
  ["boost", "⚡ Boost", "⚡ బూస్ట్"],
  ["voice", "🎙️ Voice", "🎙️ వాయిస్"],
  ["jathakam", "🪐 Jathakam", "🪐 జాతకం"],
  ["share", "📤 Share", "📤 షేర్"],
  ["alerts", "🔔 Alerts", "🔔 అలర్ట్స్"],
];

export default function MePage() {
  const { lang } = useLang();
  const te = lang === "te";
  const [myId, setMyId] = useState("");
  const [tab, setTab] = useState<Tab>("edit");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("tsap_id") || localStorage.getItem("tsap_last_id") || "";
      setMyId(saved);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <div className="flex items-center justify-between border-b border-gold/30 pb-3">
        <div>
          <h1 className="text-2xl font-black text-[#7A0C2E]">
            <Duo en="🙋 My Account & Profile" te="🙋 నా ప్రొఫైల్ & అకౌంట్" />
          </h1>
          {myId && <p className="font-mono text-xs font-bold text-slate-500 mt-0.5">ID: {myId}</p>}
        </div>

        <Link href="/referral" className="px-3.5 py-1.5 rounded-full gold-gradient text-maroon text-xs font-black shadow-xs hover:brightness-105 transition">
          🤝 రెఫరల్ & ₹50 క్యాష్
        </Link>
      </div>

      {myId ? (
        <>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {TABS.map(([v, en, t]) => (
              <button
                key={v}
                onClick={() => setTab(v)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition ${
                  tab === v ? "maroon-gradient text-white shadow-sm" : "border border-slate-200 bg-white text-slate-700 hover:bg-amber-50"
                }`}
              >
                {te ? t : en}
              </button>
            ))}
          </div>

          <div className="mt-5">
            {tab === "edit" && <EditProfilePanel myId={myId} />}
            {tab === "streak" && <StreakPanel myId={myId} />}
            {tab === "unlocks" && <UnlocksPanel myId={myId} />}
            {tab === "boost" && <BoostPanel myId={myId} />}
            {tab === "voice" && <VoicePanel myId={myId} />}
            {tab === "jathakam" && <JathakamPanel myId={myId} />}
            {tab === "share" && <SharePanel myId={myId} />}
            {tab === "alerts" && <AlertsPanel myId={myId} />}
          </div>
        </>
      ) : (
        <div className="mt-6">
          <AuthGate note={te ? "మీ ప్రొఫైల్ వివరాలు ఎడిట్ చేసుకోవడానికి లేదా చూడటానికి లాగిన్ అవ్వండి." : "Please login to view or edit your profile."} />
        </div>
      )}
    </main>
  );
}

function Msg({ m }: { m: { ok: boolean; text: string } | null }) {
  if (!m) return null;
  return (
    <p
      className={`mt-3 rounded-2xl border p-3 text-xs sm:text-sm font-semibold ${
        m.ok ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-amber-300 bg-amber-50 text-amber-900"
      }`}
    >
      {m.text}
    </p>
  );
}

/* ================= ✏️ PROFILE COMPLETION & EDIT PANEL ================= */
function EditProfilePanel({ myId }: { myId: string }) {
  const { lang } = useLang();
  const te = lang === "te";
  const [profile, setProfile] = useState<Row>({});
  const [score, setScore] = useState<number>(65);
  const [missing, setMissing] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/profile/${encodeURIComponent(myId)}`);
      if (res.ok) {
        const d = await res.json();
        setProfile(d.profile || {});
        setScore(d.completeness_score || 70);
        setMissing(d.missing_fields || []);
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [myId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const setField = (k: string, v: any) => {
    setProfile((prev) => ({ ...prev, [k]: v }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tsap_id: myId, ...profile }),
      });
      const d = await res.json();
      if (res.ok && d.success) {
        setScore(d.completeness_score || 100);
        setMissing(d.missing_fields || []);
        setMsg({ ok: true, text: d.message_telugu || "ప్రొఫైల్ వివరాలు విజయవంతంగా అప్‌డేట్ అయ్యాయి! ✅" });
      } else {
        setMsg({ ok: false, text: d.detail || "అప్‌డేట్ విఫలమైంది — మళ్లీ ప్రయత్నించండి" });
      }
    } catch {
      setMsg({ ok: false, text: "నెట్‌వర్క్ సమస్య — దయచేసి మళ్లీ ప్రయత్నించండి" });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-8 text-center border border-gold/30 space-y-2">
        <div className="w-8 h-8 border-4 border-maroon border-t-transparent rounded-full animate-spin mx-auto" />
        <div className="text-xs font-bold text-slate-600">ప్రొఫైల్ వివరాలు లోడ్ అవుతున్నాయి…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Completion Progress Card */}
      <div className="bg-gradient-to-r from-amber-50 to-rose-50 border-2 border-gold/50 rounded-3xl p-5 sm:p-6 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              <h2 className="text-base font-black text-slate-900">
                ప్రొఫైల్ పూర్తి స్థితి (Profile Completion): <span className="text-maroon">{score}%</span>
              </h2>
            </div>
            <p className="text-xs text-slate-600 telugu mt-1">
              100% పూర్తి చేసిన ప్రొఫైల్స్ సెర్చ్‌లో మొదట కనిపిస్తాయి మరియు 10 రెట్లు ఎక్కువ స్పందనలు పొందుతాయి!
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-black ${
                score >= 90 ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-amber-100 text-amber-900 border border-amber-300"
              }`}
            >
              {score >= 90 ? "🌟 సూపర్ ప్రొఫైల్ (100%)" : "⚡ పూర్తి చేయాల్సినవి ఉన్నాయి"}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
          <div
            className="h-3 rounded-full transition-all duration-500 bg-gradient-to-r from-[#D4AF37] via-[#A0143A] to-[#7A0C2E]"
            style={{ width: `${score}%` }}
          />
        </div>

        {missing.length > 0 && (
          <div className="text-xs text-slate-700 bg-white/80 rounded-xl p-2.5 border border-gold/20">
            <span className="font-bold text-maroon">💡 జోడించాల్సిన ముఖ్య వివరాలు: </span>
            <span className="text-slate-600">{missing.slice(0, 4).join(", ")}</span>
          </div>
        )}
      </div>

      <Msg m={msg} />

      {/* Edit Form */}
      <form onSubmit={handleSave} className="bg-white rounded-3xl p-5 sm:p-7 border border-gold/30 shadow-md space-y-6">
        {/* 1. Basic Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-maroon uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
            <span>👤</span> <span>ప్రాథమిక వివరాలు (Basic Info)</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-800 block mb-1">పూర్తి పేరు (Full Name):</label>
              <input
                type="text"
                value={profile.full_name || ""}
                onChange={(e) => setField("full_name", e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-maroon"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">పుట్టిన తేదీ (DOB):</label>
              <input
                type="date"
                value={profile.dob ? String(profile.dob).slice(0, 10) : ""}
                onChange={(e) => setField("dob", e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-maroon"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">ఎత్తు (Height):</label>
              <select
                value={profile.height || ""}
                onChange={(e) => setField("height", e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-maroon"
              >
                <option value="">ఎంచుకోండి</option>
                {HEIGHTS.map((h) => (
                  <option key={h} value={h}>
                    {heightLabel(h)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">వైవాహిక స్థితి (Marital Status):</label>
              <select
                value={profile.marital_status || "Pelli Kaledu"}
                onChange={(e) => setField("marital_status", e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-maroon"
              >
                <option value="Pelli Kaledu">పెళ్లి కాలేదు (Never Married)</option>
                <option value="Divorced">విడాకులు (Divorced)</option>
                <option value="Widow">వితంతువు (Widow)</option>
                <option value="Widower">భార్య చనిపోయారు (Widower)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2. Caste & Horoscope */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-maroon uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
            <span>⭐</span> <span>కులం & జ్యోతిషం (Caste & Astrology)</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-800 block mb-1">కులం (Caste):</label>
              <select
                value={profile.caste || ""}
                onChange={(e) => setField("caste", e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-maroon"
              >
                <option value="">ఎంచుకోండి</option>
                {CASTES.map((c) => (
                  <option key={c} value={c}>
                    {CASTE_TELUGU[c] || c} ({c})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">ఉపకులం (Sub-caste):</label>
              <input
                type="text"
                value={profile.sub_caste || ""}
                onChange={(e) => setField("sub_caste", e.target.value)}
                placeholder="ఉపకులం"
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-maroon"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">గోత్రం (Gothram):</label>
              <input
                type="text"
                value={profile.gothram || ""}
                onChange={(e) => setField("gothram", e.target.value)}
                placeholder="గోత్రం"
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-maroon"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">నక్షత్రం (Nakshatram):</label>
              <select
                value={profile.star || ""}
                onChange={(e) => setField("star", e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-maroon"
              >
                <option value="">నక్షత్రం ఎంచుకోండి</option>
                {NAKSHATRAS.map((st) => (
                  <option key={st.name} value={st.name}>
                    ⭐ {st.te} ({st.name})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">రాశి (Raasi):</label>
              <select
                value={profile.rasi || ""}
                onChange={(e) => setField("rasi", e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-maroon"
              >
                <option value="">రాశి ఎంచుకోండి</option>
                {RASIS.map((r) => (
                  <option key={r.name} value={r.name}>
                    {r.te} ({r.name})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">కుజ దోషం (Dosham):</label>
              <select
                value={profile.dosham || "No"}
                onChange={(e) => setField("dosham", e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-maroon"
              >
                <option value="No">లేదు (No Dosham)</option>
                <option value="Yes">కుజ దోషం కలదు (Manglik)</option>
                <option value="Partial">పాక్షిక దోషం (Partial)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. Education & Career */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-maroon uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
            <span>💼</span> <span>చదువు & ఉద్యోగం (Education & Career)</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-800 block mb-1">విద్యార్హత (Education):</label>
              <select
                value={profile.education || ""}
                onChange={(e) => setField("education", e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-maroon"
              >
                <option value="">ఎంచుకోండి</option>
                {EDUCATIONS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">ఉద్యోగం (Job Designation):</label>
              <input
                type="text"
                value={profile.job || ""}
                onChange={(e) => setField("job", e.target.value)}
                placeholder="ఉదా: Software Engineer"
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-maroon"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">కంపెనీ (Company Name):</label>
              <input
                type="text"
                value={profile.company || ""}
                onChange={(e) => setField("company", e.target.value)}
                placeholder="ఉదా: TCS, Govt, Business"
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-maroon"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">వార్షిక వేతనం (Salary):</label>
              <select
                value={profile.salary || ""}
                onChange={(e) => setField("salary", e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-maroon"
              >
                <option value="">ఎంచుకోండి</option>
                {SALARIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">పని చేసే నగరం (Work Location):</label>
              <input
                type="text"
                value={profile.work_location || ""}
                onChange={(e) => setField("work_location", e.target.value)}
                placeholder="ఉదా: Hyderabad"
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-maroon"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">జిల్లా (District):</label>
              <input
                type="text"
                value={profile.district || ""}
                onChange={(e) => setField("district", e.target.value)}
                placeholder="ఉదా: Warangal, Guntur"
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-maroon"
              />
            </div>
          </div>
        </div>

        {/* 4. Family Details */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-maroon uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
            <span>👨‍👩‍👧</span> <span>కుటుంబ వివరాలు & ఆస్తిపాస్తులు (Family Details)</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-800 block mb-1">తండ్రి పేరు & వృత్తి:</label>
              <input
                type="text"
                value={profile.father_name || ""}
                onChange={(e) => setField("father_name", e.target.value)}
                placeholder="తండ్రి గారి పేరు"
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-maroon"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">తల్లి పేరు & వృత్తి:</label>
              <input
                type="text"
                value={profile.mother_name || ""}
                onChange={(e) => setField("mother_name", e.target.value)}
                placeholder="తల్లి గారి పేరు"
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-maroon"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">సొంత ఊరు (Native Place):</label>
              <input
                type="text"
                value={profile.native_place || ""}
                onChange={(e) => setField("native_place", e.target.value)}
                placeholder="సొంత ఊరు"
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-maroon"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">ఫోటో URL (Photo Link):</label>
              <input
                type="text"
                value={profile.photo_url || ""}
                onChange={(e) => setField("photo_url", e.target.value)}
                placeholder="https://..."
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-maroon"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="font-bold text-slate-800 block mb-1">నా గురించి (About Myself):</label>
              <textarea
                rows={3}
                value={profile.about_myself || ""}
                onChange={(e) => setField("about_myself", e.target.value)}
                placeholder="మీ గురించి క్లుప్తంగా రాయండి…"
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-maroon telugu"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
          <span className="text-xs text-slate-500 font-medium">సేవ్ చేయగానే శోధనలో మీ ప్రొఫైల్ ర్యాంకింగ్ పెరుగుతుంది.</span>
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 rounded-2xl gold-gradient text-maroon text-xs sm:text-sm font-black shadow-md hover:brightness-105 transition flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? "సేవ్ అవుతోంది…" : "💾 మార్పులను భద్రపరచండి (Save Updates)"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------------- 🔥 STREAK ---------------- */
function StreakPanel({ myId }: { myId: string }) {
  const { lang } = useLang();
  const te = lang === "te";
  const [st, setSt] = useState<Row | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const { ok, data } = await apiGet<Row>(`/api/streak/${encodeURIComponent(myId)}`);
    if (ok && data) setSt(data);
  }, [myId]);
  useEffect(() => {
    void load();
  }, [load]);
  const claim = async () => {
    setBusy(true);
    const { ok, data, errorTelugu } = await apiPost<Row>("/api/streak/claim", { tsap_id: myId });
    setBusy(false);
    if (ok && data?.success) {
      setMsg({ ok: true, text: String(data.message_telugu || "Claimed") });
      void load();
    } else setMsg({ ok: false, text: String(data?.message_telugu || errorTelugu) });
  };
  return (
    <section className="rounded-3xl border border-rose-200 bg-white p-5 text-center">
      <p className="text-5xl">🔥</p>
      <p className="mt-2 text-4xl font-extrabold text-[#7A0C2E]">{st?.count ?? "—"}</p>
      <p className="text-[12px] text-slate-500">{te ? "రోజుల streak" : "day streak"}</p>
      <div className="mt-3 flex justify-center gap-3 text-[12px]">
        <span className="rounded-full bg-amber-50 border border-amber-300 px-3 py-1">🏆 Best: {st?.best ?? "—"}</span>
        <span className="rounded-full bg-emerald-50 border border-emerald-300 px-3 py-1">🎁 {te ? "రేపు" : "Next"}: +{st?.next_bonus ?? "?"} credits</span>
      </div>
      <button
        onClick={() => void claim()}
        disabled={busy || !!st?.claimed_today}
        className="mt-4 rounded-2xl bg-[#7A0C2E] px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
      >
        {st?.claimed_today ? (te ? "✅ ఈరోజు తీసుకున్నారు" : "✅ Claimed today") : busy ? "…" : te ? "🎁 Daily bonus claim చెయ్యి" : "🎁 Claim daily bonus"}
      </button>
      <Msg m={msg} />
    </section>
  );
}

/* ---------------- 📋 UNLOCKS ---------------- */
function UnlocksPanel({ myId }: { myId: string }) {
  const { lang } = useLang();
  const te = lang === "te";
  const [list, setList] = useState<Row[]>([]);
  useEffect(() => {
    apiGet<Row[]>(`/api/unlocks/${encodeURIComponent(myId)}`).then((r) => {
      if (r.ok && r.data) setList(r.data);
    });
  }, [myId]);
  return (
    <section className="rounded-3xl border border-amber-200 bg-white p-5">
      <h2 className="text-base font-extrabold text-[#7A0C2E]">{te ? "మీరు అన్‌లాక్ చేసిన profiles" : "Your unlocked profiles"}</h2>
      {list.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{te ? "ఇంకా ఏ profile ని unlock చేయలేదు." : "No unlocked profiles yet."}</p>
      ) : (
        <div className="mt-3 divide-y divide-slate-100">
          {list.map((u, i) => (
            <div key={i} className="flex items-center justify-between py-2 text-sm">
              <span className="font-bold text-slate-800">{u.target_id || u.tsap_id}</span>
              <span className="text-xs text-slate-500">{u.at || u.time || "Recent"}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------------- ⚡ BOOST ---------------- */
function BoostPanel({ myId }: { myId: string }) {
  const { lang } = useLang();
  const te = lang === "te";
  return (
    <section className="rounded-3xl border border-gold/30 bg-white p-5 text-center space-y-3">
      <div className="text-4xl">⚡</div>
      <h2 className="text-base font-extrabold text-[#7A0C2E]">ప్రొఫైల్ బూస్ట్ (Profile Boost)</h2>
      <p className="text-xs text-slate-600 telugu">మీ ప్రొఫైల్‌ను సెర్చ్ రిజల్ట్స్‌లో టాప్ ర్యాంకింగ్‌లో ప్రదర్శించడానికి బూస్ట్ చేయండి.</p>
      <Link href="/pricing" className="inline-block px-6 py-2.5 rounded-2xl gold-gradient text-maroon font-bold text-xs shadow-md">
        బూస్ట్ ప్లాన్స్ చూడండి
      </Link>
    </section>
  );
}

/* ---------------- 🎙️ VOICE ---------------- */
function VoicePanel({ myId }: { myId: string }) {
  return (
    <section className="rounded-3xl border border-indigo-200 bg-white p-5 text-center space-y-3">
      <div className="text-4xl">🎙️</div>
      <h2 className="text-base font-extrabold text-[#7A0C2E]">వాయిస్ బయోడేటా (Voice Bio)</h2>
      <p className="text-xs text-slate-600">మీ స్వరం ద్వారా ఆడియో బయోడేటా రికార్డ్ చేసి ప్రొఫైల్‌కు జోడించండి.</p>
    </section>
  );
}

/* ---------------- 🪐 JATHAKAM ---------------- */
function JathakamPanel({ myId }: { myId: string }) {
  return (
    <section className="rounded-3xl border border-amber-200 bg-white p-5 text-center space-y-3">
      <div className="text-4xl">🪐</div>
      <h2 className="text-base font-extrabold text-[#7A0C2E]">వేద జాతకం & రాశి చక్రం</h2>
      <Link href="/porutham" className="inline-block px-6 py-2.5 rounded-2xl maroon-gradient text-white font-bold text-xs shadow-md">
        ఉచిత గుణమేళనం చెక్ చేయండి
      </Link>
    </section>
  );
}

/* ---------------- 📤 SHARE ---------------- */
function SharePanel({ myId }: { myId: string }) {
  return (
    <section className="rounded-3xl border border-emerald-200 bg-white p-5 text-center space-y-3">
      <div className="text-4xl">📤</div>
      <h2 className="text-base font-extrabold text-[#7A0C2E]">ప్రొఫైల్ షేరింగ్ & బయోడేటా</h2>
      <div className="flex justify-center gap-3">
        <Link href={`/biodata`} className="px-5 py-2.5 rounded-2xl gold-gradient text-maroon font-bold text-xs shadow-md">
          🎴 HD బయోడేటా JPG డౌన్‌లోడ్
        </Link>
        <Link href="/referral" className="px-5 py-2.5 rounded-2xl maroon-gradient text-white font-bold text-xs shadow-md">
          🤝 రెఫరల్ QR కోడ్
        </Link>
      </div>
    </section>
  );
}

/* ---------------- 🔔 ALERTS ---------------- */
function AlertsPanel({ myId }: { myId: string }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 text-center space-y-3">
      <div className="text-4xl">🔔</div>
      <h2 className="text-base font-extrabold text-[#7A0C2E]">స్మార్ట్ మ్యాచ్ అలర్ట్స్</h2>
      <p className="text-xs text-slate-600">మీ కులం మరియు జిల్లాకు సరిపోయే కొత్త సంబంధాలు వచ్చినప్పుడు తక్షణ నోటిఫికేషన్లు పొందండి.</p>
    </section>
  );
}
