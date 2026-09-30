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
  CASTES_DETAILED,
  CASTE_SUBCASTES,
  CASTE_TELUGU,
  EDUCATIONS,
  HEIGHTS,
  JOBS,
  BRIDE_PREFERRED_JOBS,
  GROOM_PREFERRED_JOBS,
  MARITAL_STATUSES,
  NAKSHATRAS,
  RASIS,
  SALARIES,
  TS_DISTRICTS,
  AP_DISTRICTS,
  DISTRICTS_BY_STATE,
  DISTRICT_TELUGU,
  WORK_TYPES,
  heightLabel,
} from "@/lib/telugu-data";

type Row = Record<string, any>;
type Tab = "preferences" | "edit" | "streak" | "unlocks" | "boost" | "voice" | "jathakam" | "share" | "alerts";

const TABS: [Tab, string, string][] = [
  ["preferences", "🎯 Partner Preferences", "🎯 కోరుకునే సంబంధం (ప్రిఫరెన్సెస్)"],
  ["edit", "✏️ Edit Profile", "✏️ నా ప్రొఫైల్ సవరణ (100%)"],
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
  const [tab, setTab] = useState<Tab>("preferences");

  // Account Deletion & Marriage Fixed State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState<string>("married_via_manavivaha");
  const [partnerName, setPartnerName] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [deleteFeedback, setDeleteFeedback] = useState("");
  const [confirmDeleteCheck, setConfirmDeleteCheck] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteSuccessResult, setDeleteSuccessResult] = useState<{
    congratulations: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("tsap_id") || localStorage.getItem("tsap_last_id") || "";
      setMyId(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const handleDeleteAccount = async () => {
    if (!myId || !confirmDeleteCheck) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/user/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tsap_id: myId,
          reason: deleteReason,
          partner_name: partnerName,
          partner_id: partnerId,
          feedback: deleteFeedback,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDeleteSuccessResult({
          congratulations: !!data.congratulations,
          message: data.message_telugu,
        });
        localStorage.removeItem("tsap_id");
        localStorage.removeItem("tsap_token");
        localStorage.removeItem("tsap_last_id");
      } else {
        alert(data.detail || "ప్రొఫైల్ తొలగించడంలో సమస్య ఏర్పడింది");
      }
    } catch {
      alert("నెట్‌వర్క్ సమస్య ఏర్పడింది. దయచేసి మళ్లీ ప్రయత్నించండి.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <div className="flex items-center justify-between border-b border-gold/30 pb-3">
        <div>
          <h1 className="text-2xl font-black text-[#7A0C2E]">
            <Duo en="🙋 My Account & Partner Preferences" te="🙋 నా ప్రొఫైల్ & కోరుకునే సంబంధం" />
          </h1>
          {myId && <p className="font-mono text-xs font-bold text-slate-500 mt-0.5">ID: {myId}</p>}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-3 py-1.5 rounded-full border border-slate-200 hover:border-rose-300 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-bold transition flex items-center gap-1 shadow-xs"
            title="వివాహం కుదిరింది / ప్రొఫైల్ తొలగించండి"
          >
            <span>💍</span>
            <span>వివాహం కుదిరింది / తొలగించు</span>
          </button>
          <Link href="/referral" className="px-3.5 py-1.5 rounded-full gold-gradient text-maroon text-xs font-black shadow-xs hover:brightness-105 transition">
            🤝 రెఫరల్ & ₹50 క్యాష్
          </Link>
        </div>
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
            {tab === "preferences" && <PartnerPreferencesPanel myId={myId} />}
            {tab === "edit" && <EditProfilePanel myId={myId} />}
            {tab === "streak" && <StreakPanel myId={myId} />}
            {tab === "unlocks" && <UnlocksPanel myId={myId} />}
            {tab === "boost" && <BoostPanel myId={myId} />}
            {tab === "voice" && <VoicePanel myId={myId} />}
            {tab === "jathakam" && <JathakamPanel myId={myId} />}
            {tab === "share" && <SharePanel myId={myId} />}
            {tab === "alerts" && <AlertsPanel myId={myId} />}
          </div>

          {/* Account Deletion Footer Trigger */}
          <div className="mt-12 pt-6 border-t border-slate-200 text-center space-y-2">
            <p className="text-xs text-slate-500 font-medium">
              మీకు వివాహం నిశ్చయమైందా లేదా ప్రొఫైల్‌ను శాశ్వతంగా తొలగించాలనుకుంటున్నారా?
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition inline-flex items-center gap-1.5"
            >
              <span>💍 వివాహం నిశ్చయమైంది</span>
              <span>•</span>
              <span>🗑️ ప్రొఫైల్‌ను తొలగించండి (Delete Account)</span>
            </button>
          </div>
        </>
      ) : (
        <div className="mt-6">
          <AuthGate note={te ? "మీ ప్రొఫైల్ వివరాలు ఎడిట్ చేసుకోవడానికి లేదా చూడటానికి లాగిన్ అవ్వండి." : "Please login to view or edit your profile."} />
        </div>
      )}

      {/* 💍 ACCOUNT DELETION & MARRIAGE FIXED MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-gold/40 space-y-4 animate-in fade-in zoom-in duration-200 my-8">
            {deleteSuccessResult ? (
              <div className="text-center py-6 space-y-4">
                <div className="text-5xl animate-bounce">
                  {deleteSuccessResult.congratulations ? "💐 🎉" : "✅"}
                </div>
                <h3 className="text-xl font-black text-[#7A0C2E]">
                  {deleteSuccessResult.congratulations ? "హృదయపూర్వక శుభాకాంక్షలు!" : "ప్రొఫైల్ తొలగించబడింది"}
                </h3>
                <p className="text-xs text-slate-700 leading-relaxed max-w-md mx-auto">
                  {deleteSuccessResult.message}
                </p>
                <div className="pt-2">
                  <Link
                    href="/"
                    className="inline-block px-6 py-2.5 rounded-2xl maroon-gradient text-white font-extrabold text-xs shadow-md hover:brightness-110 transition"
                  >
                    హోమ్‌పేజీకి వెళ్లండి (Go Home)
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">💍</span>
                    <div>
                      <h3 className="font-black text-navy text-base">ప్రొఫైల్ తొలగింపు / వివాహం నిశ్చయం</h3>
                      <p className="text-xs text-slate-500 font-mono">ID: {myId}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    ప్రొఫైల్ తొలగించడానికి గల కారణాన్ని ఎంచుకోండి:
                  </label>

                  <div className="space-y-2 text-xs">
                    {[
                      {
                        id: "married_via_manavivaha",
                        label: "🎉 మన వివాహ (Mana Vivaha) ద్వారా సంబంధం కుదిరింది!",
                        desc: "మాకు వివాహం నిశ్చయమైంది • శుభాకాంక్షలు & సంతోషం",
                        badge: "Success Story",
                      },
                      {
                        id: "married_elsewhere",
                        label: "🤝 బయట ఇతర మార్గాల్లో వివాహం కుదిరింది",
                        desc: "కుటుంబ సభ్యులు లేదా ఇతర మార్గాల ద్వారా సంబంధం ఖాయమైంది",
                      },
                      {
                        id: "pausing_search",
                        label: "⏸️ ప్రస్తుతానికి సంబంధాల అన్వేషణ తాత్కాలికంగా ఆపాము",
                        desc: "తరువాత ఎప్పుడైనా మళ్లీ వెతుకుతాము",
                      },
                      {
                        id: "privacy_other",
                        label: "🔒 వ్యక్తిగత గోప్యత లేదా ఇతర కారణాలు",
                        desc: "ప్రస్తుతం ప్రొఫైల్ తొలగించాలనుకుంటున్నాం",
                      },
                    ].map((opt) => (
                      <label
                        key={opt.id}
                        className={`block p-3 rounded-2xl border cursor-pointer transition ${
                          deleteReason === opt.id
                            ? "bg-amber-50/70 border-maroon/60 ring-1 ring-maroon/30 shadow-xs"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <input
                            type="radio"
                            name="deleteReason"
                            value={opt.id}
                            checked={deleteReason === opt.id}
                            onChange={(e) => setDeleteReason(e.target.value)}
                            className="mt-0.5 accent-[#7A0C2E]"
                          />
                          <div className="space-y-0.5 flex-1">
                            <div className="font-bold text-slate-900 flex items-center justify-between">
                              <span>{opt.label}</span>
                              {opt.badge && (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-md">
                                  {opt.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500">{opt.desc}</p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* If married via Mana Vivaha: Congratulations & Partner details */}
                {deleteReason === "married_via_manavivaha" && (
                  <div className="bg-emerald-50 rounded-2xl p-3.5 border border-emerald-200 space-y-2 text-xs">
                    <div className="font-black text-emerald-900 flex items-center gap-1.5">
                      <span>💐</span>
                      <span>మన వివాహ కుటుంబం తరఫున హృదయపూర్వక శుభాకాంక్షలు!</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-0.5">భాగస్వామి పేరు (Partner Name - Optional):</label>
                        <input
                          type="text"
                          value={partnerName}
                          onChange={(e) => setPartnerName(e.target.value)}
                          placeholder="ఉదా: శ్రీనివాస్ లేదా మౌనిక"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:border-emerald-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-0.5">భాగస్వామి ప్రొఫైల్ ID (Optional):</label>
                        <input
                          type="text"
                          value={partnerId}
                          onChange={(e) => setPartnerId(e.target.value)}
                          placeholder="ఉదా: MV1042"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-medium focus:border-emerald-600 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Feedback notes */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    మీ అనుభవం లేదా అభిప్రాయం (Feedback / Review - Optional):
                  </label>
                  <textarea
                    rows={2}
                    value={deleteFeedback}
                    onChange={(e) => setDeleteFeedback(e.target.value)}
                    placeholder="మన వివాహ సేవలు మీకు ఎలా అనిపించాయి? ఇతర వధూవరులకు మీ సందేశం..."
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:border-maroon focus:outline-none"
                  />
                </div>

                {/* Confirmation Checkbox */}
                <div className="bg-rose-50/70 p-3 rounded-2xl border border-rose-200 text-xs text-rose-950 flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="confirmDelete"
                    checked={confirmDeleteCheck}
                    onChange={(e) => setConfirmDeleteCheck(e.target.checked)}
                    className="mt-0.5 accent-rose-700 cursor-pointer"
                  />
                  <label htmlFor="confirmDelete" className="cursor-pointer font-medium leading-relaxed">
                    నేను నా ప్రొఫైల్‌ను శాశ్వతంగా తొలగించడానికి మరియు శోధన ఫలితాల నుండి తీసివేయడానికి అంగీకరిస్తున్నాను.
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 py-2.5 rounded-2xl border border-slate-300 font-bold text-xs text-slate-600 hover:bg-slate-100 transition"
                  >
                    ప్రొఫైల్ ఉంచుకోండి (Cancel)
                  </button>
                  <button
                    type="button"
                    disabled={!confirmDeleteCheck || deleting}
                    onClick={handleDeleteAccount}
                    className="flex-1 py-2.5 rounded-2xl bg-rose-700 hover:bg-rose-800 text-white font-extrabold text-xs shadow-md transition disabled:opacity-50"
                  >
                    {deleting ? "తొలగించబడుతోంది..." : "🗑️ ప్రొఫైల్ తొలగించండి"}
                  </button>
                </div>
              </>
            )}
          </div>
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

/* ---------------- 🎯 PARTNER PREFERENCES (కోరుకునే సంబంధం) ---------------- */
function PartnerPreferencesPanel({ myId }: { myId: string }) {
  const { lang } = useLang();
  const te = lang === "te";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Preference State
  const [ageMin, setAgeMin] = useState(21);
  const [ageMax, setAgeMax] = useState(30);
  const [heightMin, setHeightMin] = useState("5'0\"");
  const [heightMax, setHeightMax] = useState("5'10\"");
  const [castes, setCastes] = useState<string[]>([]);
  const [subCastes, setSubCastes] = useState<string[]>([]);
  const [casteNoBar, setCasteNoBar] = useState(false);
  const [educations, setEducations] = useState<string[]>([]);
  const [jobs, setJobs] = useState<string[]>([]);
  const [minSalary, setMinSalary] = useState("Any");
  const [districts, setDistricts] = useState<string[]>([]);
  const [maritalStatuses, setMaritalStatuses] = useState<string[]>(["Never Married"]);
  const [diet, setDiet] = useState("Any");
  const [notes, setNotes] = useState("");

  // Filters & Counts
  const [casteSearch, setCasteSearch] = useState("");
  const [districtSearch, setDistrictSearch] = useState("");
  const [matchingCount, setMatchingCount] = useState<number>(0);
  const [previewMatches, setPreviewMatches] = useState<any[]>([]);
  const [myProfile, setMyProfile] = useState<Row | null>(null);

  const loadPreferences = useCallback(async () => {
    setLoading(true);
    const { ok, data } = await apiGet<Row>(`/api/profile/preferences?tsap_id=${encodeURIComponent(myId)}`);
    if (ok && data?.preferences) {
      const p = data.preferences;
      setAgeMin(p.age_min || 21);
      setAgeMax(p.age_max || 30);
      setHeightMin(p.height_min || "5'0\"");
      setHeightMax(p.height_max || "5'10\"");
      setCastes(p.castes || []);
      setSubCastes(p.sub_castes || []);
      setCasteNoBar(Boolean(p.caste_no_bar));
      setEducations(p.educations || []);
      setJobs(p.jobs || []);
      setMinSalary(p.min_salary || "Any");
      setDistricts(p.districts || []);
      setMaritalStatuses(p.marital_statuses || ["Never Married"]);
      setDiet(p.diet || "Any");
      setNotes(p.notes || "");
      setMatchingCount(data.matching_count || 0);
      setPreviewMatches(data.preview_matches || []);
    }
    const profRes = await apiGet<Row>(`/api/profile/${encodeURIComponent(myId)}`);
    if (profRes.ok && profRes.data?.profile) {
      setMyProfile(profRes.data.profile);
    }
    setLoading(false);
  }, [myId]);

  useEffect(() => {
    void loadPreferences();
  }, [loadPreferences]);

  const isGroom = myProfile?.gender === "Groom" || myProfile?.gender === "Male" || myProfile?.gender === "అబ్బాయి";
  const displayJobs = isGroom ? BRIDE_PREFERRED_JOBS : GROOM_PREFERRED_JOBS;

  const toggleCaste = (c: string) => {
    setCastes((prev) =>
      prev.includes(c) ? prev.filter((item) => item !== c) : [...prev, c]
    );
  };

  const toggleSubCaste = (s: string) => {
    setSubCastes((prev) =>
      prev.includes(s) ? prev.filter((item) => item !== s) : [...prev, s]
    );
  };

  const toggleEducation = (e: string) => {
    setEducations((prev) =>
      prev.includes(e) ? prev.filter((item) => item !== e) : [...prev, e]
    );
  };

  const toggleJob = (j: string) => {
    setJobs((prev) =>
      prev.includes(j) ? prev.filter((item) => item !== j) : [...prev, j]
    );
  };

  const toggleDistrict = (d: string) => {
    setDistricts((prev) =>
      prev.includes(d) ? prev.filter((item) => item !== d) : [...prev, d]
    );
  };

  const toggleMarital = (m: string) => {
    setMaritalStatuses((prev) =>
      prev.includes(m) ? prev.filter((item) => item !== m) : [...prev, m]
    );
  };

  // Dynamically aggregated subcastes based on selected castes
  const availableSubCastes = Array.from(
    new Set(
      castes.flatMap((c) => CASTE_SUBCASTES[c] || [])
    )
  );

  const filteredCastes = CASTES_DETAILED.filter((c) => {
    if (!casteSearch.trim()) return true;
    const q = casteSearch.toLowerCase();
    return c.en.toLowerCase().includes(q) || c.te.includes(q);
  });

  const allDistricts = Array.from(
    new Set([...TS_DISTRICTS, ...AP_DISTRICTS, "USA / NRI", "Other"])
  );

  const filteredDistricts = allDistricts.filter((d) => {
    if (!districtSearch.trim()) return true;
    const q = districtSearch.toLowerCase();
    const teName = DISTRICT_TELUGU[d] || "";
    return d.toLowerCase().includes(q) || teName.includes(q);
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const payload = {
      tsap_id: myId,
      age_min: ageMin,
      age_max: ageMax,
      height_min: heightMin,
      height_max: heightMax,
      castes,
      sub_castes: subCastes,
      caste_no_bar: casteNoBar,
      educations,
      jobs,
      min_salary: minSalary,
      districts,
      marital_statuses: maritalStatuses,
      diet,
      notes,
    };

    const { ok, data } = await apiPost<Row>("/api/profile/preferences", payload);
    setSaving(false);
    if (ok && data?.success) {
      setMsg({ ok: true, text: data.message_telugu || "మీ ప్రిఫరెన్సెస్ భద్రపరచబడ్డాయి! ✅" });
      setMatchingCount(data.matching_count || 0);
      setPreviewMatches(data.preview_matches || []);
    } else {
      setMsg({ ok: false, text: "ప్రిఫరెన్సెస్ సేవ్ చేయడంలో లోపం జరిగింది. దయచేసి మళ్లీ ప్రయత్నించండి." });
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-gold/30 bg-white p-8 text-center text-sm font-bold text-slate-500">
        మీ పార్టనర్ ప్రిఫరెన్సెస్ లోడ్ అవుతున్నాయి…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner with Match Count */}
      <div className="rounded-3xl bg-gradient-to-r from-amber-500 via-rose-600 to-[#7A0C2E] p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <span className="inline-block bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2">
              🎯 స్మార్ట్ మ్యాచింగ్ ఫిల్టర్స్
            </span>
            <h2 className="text-xl sm:text-2xl font-black">
              మీకు ఎలాంటి సంబంధం కావాలి? (Partner Preferences)
            </h2>
            <p className="text-xs sm:text-sm text-amber-100 mt-1 max-w-xl">
              మీరు కోరుకునే వయస్సు, కులాలు, చదువు, ఉద్యోగం & జిల్లాలను ఇక్కడ సేవ్ చేసుకోండి. వీటికి సరిపోయే సంబంధాలు మాత్రమే మీకు నేరుగా సూచించబడతాయి.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-center shrink-0 min-w-[160px]">
            <span className="text-xs text-amber-200 block font-bold">లభించిన సంబంధాలు</span>
            <span className="text-3xl font-black text-amber-300 block">{matchingCount}</span>
            <span className="text-[11px] text-white/90">మీ కోరికకు తగినవి</span>
          </div>
        </div>

        {/* Quick View Matches Button */}
        {matchingCount > 0 && (
          <div className="mt-4 pt-4 border-t border-white/20 flex flex-wrap items-center justify-between gap-3">
            <div className="flex -space-x-2 overflow-hidden">
              {previewMatches.slice(0, 4).map((pm, idx) => (
                <div key={idx} className="w-8 h-8 rounded-full border-2 border-white bg-amber-100 flex items-center justify-center text-xs font-bold text-maroon overflow-hidden">
                  {pm.photo_url ? (
                    <img src={pm.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{pm.gender === "Bride" ? "👰" : "🤵"}</span>
                  )}
                </div>
              ))}
            </div>
            <Link
              href="/matches"
              className="px-4 py-2 rounded-xl bg-white text-[#7A0C2E] font-black text-xs hover:bg-amber-100 transition shadow"
            >
              👉 ఈ {matchingCount} సంబంధాలను ఇప్పుడే చూడండి
            </Link>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="rounded-3xl border border-gold/40 bg-white p-6 shadow-sm space-y-6">
        <Msg m={msg} />

        {/* ⚡ SMART 1-CLICK MATCH PRESETS (త్వరిత ఎంపికలు) */}
        <div className="rounded-2xl bg-gradient-to-r from-amber-50 via-rose-50 to-amber-50 border border-gold/40 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-maroon flex items-center gap-1.5 uppercase tracking-wide">
              <span>⚡</span> <span>స్మార్ట్ 1-క్లిక్ ప్రిసెట్స్ (Quick 1-Click Setup)</span>
            </span>
            <span className="text-[10px] text-slate-500 font-bold">ఒక్క క్లిక్‌తో మీ ప్రిఫరెన్సెస్ సెట్ చేయండి</span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {myProfile?.caste && (
              <button
                type="button"
                onClick={() => {
                  setCasteNoBar(false);
                  setCastes([myProfile.caste]);
                  setDistricts(["Hyderabad", "Ranga Reddy", "Medchal-Malkajgiri"]);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-black bg-white border border-amber-300 text-maroon shadow-xs hover:bg-amber-100 transition flex items-center gap-1"
              >
                <span>💍</span>
                <span>సొంత కులం ({myProfile.caste}) + హైదరాబాద్</span>
              </button>
            )}

            {/* Housewife / Homemaker Preset for Grooms */}
            {isGroom && (
              <button
                type="button"
                onClick={() => {
                  setJobs(["Housewife / Homemaker (గృహిణి)", "Not Working / Looking for Job"]);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-black bg-white border border-rose-300 text-rose-800 shadow-xs hover:bg-rose-50 transition flex items-center gap-1"
              >
                <span>🏡</span>
                <span>గృహిణి మాత్రమే (Housewife / Homemaker)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setEducations(["B.Tech / B.E.", "M.Tech / M.E.", "MS (USA / Abroad)", "MBA / PGDM"]);
                setJobs(["Software / IT Professional"]);
                setDistricts(["Hyderabad", "Ranga Reddy", "Medchal-Malkajgiri"]);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-black bg-white border border-blue-300 text-blue-800 shadow-xs hover:bg-blue-50 transition flex items-center gap-1"
            >
              <span>💻</span>
              <span>సాఫ్ట్‌వేర్ / IT ప్రొఫెషనల్స్</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setJobs(["Govt Employee / PSU", "Govt Employee (Central / State)", "Bank Officer / PO / Manager", "IAS / IPS / Civil Services / Group 1"]);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-black bg-white border border-emerald-300 text-emerald-800 shadow-xs hover:bg-emerald-50 transition flex items-center gap-1"
            >
              <span>🏛️</span>
              <span>గవర్నమెంట్ ఉద్యోగులు</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setDistricts(["USA / NRI", "Other"]);
                setEducations(["MS (USA / Abroad)", "B.Tech / B.E.", "M.Tech / M.E."]);
                setJobs(["NRI / Working Abroad", "Software / IT Professional"]);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-black bg-white border border-indigo-300 text-indigo-800 shadow-xs hover:bg-indigo-50 transition flex items-center gap-1"
            >
              <span>🌍</span>
              <span>NRI సంబంధాలు (USA / Abroad)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCasteNoBar(true);
                setCastes([]);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-black bg-white border border-purple-300 text-purple-800 shadow-xs hover:bg-purple-50 transition flex items-center gap-1"
            >
              <span>💖</span>
              <span>Caste No Bar (ఏ కులమైనా పర్వాలేదు)</span>
            </button>
          </div>
        </div>

        {/* 1. Age & Height Compatibility */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-black text-maroon uppercase tracking-wider flex items-center gap-2">
              <span>🎂</span> <span>వయస్సు & ఎత్తు పరిధి (Age & Height Range)</span>
            </h3>
            <span className="text-xs font-bold text-[#7A0C2E] bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              {ageMin} నుండి {ageMax} సం. • {heightMin} నుండి {heightMax}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-800 block mb-1">కనీస వయస్సు (Min Age):</label>
              <select
                value={ageMin}
                onChange={(e) => setAgeMin(Number(e.target.value))}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-bold text-slate-800 focus:outline-none focus:border-maroon"
              >
                {[18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 32, 35, 40].map((a) => (
                  <option key={a} value={a}>
                    {a} సంవత్సరాలు
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">గరిష్ట వయస్సు (Max Age):</label>
              <select
                value={ageMax}
                onChange={(e) => setAgeMax(Number(e.target.value))}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-bold text-slate-800 focus:outline-none focus:border-maroon"
              >
                {[22, 23, 24, 25, 26, 27, 28, 29, 30, 32, 34, 36, 38, 40, 45, 50, 55, 60].map((a) => (
                  <option key={a} value={a}>
                    {a} సంవత్సరాలు
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">కనీస ఎత్తు (Min Height):</label>
              <select
                value={heightMin}
                onChange={(e) => setHeightMin(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-bold text-slate-800 focus:outline-none focus:border-maroon"
              >
                {HEIGHTS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">గరిష్ట ఎత్తు (Max Height):</label>
              <select
                value={heightMax}
                onChange={(e) => setHeightMax(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-bold text-slate-800 focus:outline-none focus:border-maroon"
              >
                {HEIGHTS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 2. Castes Multi-Select */}
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <h3 className="text-sm font-black text-maroon uppercase tracking-wider flex items-center gap-2">
              <span>🏛️</span> <span>కోరుకునే కులాలు (Castes Preference - Multi-Select)</span>
            </h3>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={casteNoBar}
                  onChange={(e) => {
                    setCasteNoBar(e.target.checked);
                    if (e.target.checked) setCastes([]);
                  }}
                  className="rounded accent-maroon"
                />
                <span>అన్ని కులాలు పర్వాలేదు (Caste No Bar)</span>
              </label>

              {myProfile?.caste && (
                <button
                  type="button"
                  onClick={() => {
                    setCasteNoBar(false);
                    setCastes([myProfile.caste]);
                  }}
                  className="text-[11px] font-bold text-maroon underline hover:text-amber-800"
                >
                  నా కులం ({myProfile.caste}) మాత్రమే
                </button>
              )}
            </div>
          </div>

          {!casteNoBar && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={casteSearch}
                  onChange={(e) => setCasteSearch(e.target.value)}
                  placeholder="🔍 కులాన్ని వెతకండి (ఉదా: Reddy, Kamma, Arya Vysya, Yadava, Padmashali)..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-maroon"
                />
                {castes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCastes([])}
                    className="shrink-0 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                  >
                    క్లియర్ ({castes.length})
                  </button>
                )}
              </div>

              {/* Caste Chips */}
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-2 border border-slate-100 rounded-2xl bg-slate-50/50">
                {filteredCastes.map((c) => {
                  const isSel = castes.includes(c.en);
                  return (
                    <button
                      type="button"
                      key={c.en}
                      onClick={() => toggleCaste(c.en)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        isSel
                          ? "bg-[#7A0C2E] text-white shadow-xs"
                          : "bg-white border border-slate-200 text-slate-700 hover:border-gold hover:bg-amber-50"
                      }`}
                    >
                      <span>{isSel ? "✓" : "+"}</span>
                      <span>{c.display}</span>
                    </button>
                  );
                })}
              </div>

              {/* Selected Sub-castes if available */}
              {availableSubCastes.length > 0 && (
                <div className="pt-2 space-y-1.5">
                  <span className="text-xs font-bold text-slate-700 block">
                    ఉపకులాలు (Sub-castes - ఐచ్ఛికం):
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 border border-slate-100 rounded-2xl bg-amber-50/40">
                    {availableSubCastes.map((sub) => {
                      const isSubSel = subCastes.includes(sub);
                      return (
                        <button
                          type="button"
                          key={sub}
                          onClick={() => toggleSubCaste(sub)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                            isSubSel
                              ? "bg-amber-600 text-white shadow-xs"
                              : "bg-white border border-amber-200 text-slate-700 hover:bg-amber-100"
                          }`}
                        >
                          <span>{isSubSel ? "✓" : "+"}</span>
                          <span>{sub}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Education Multi-Select */}
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <h3 className="text-sm font-black text-maroon uppercase tracking-wider flex items-center gap-2">
              <span>🎓</span> <span>కోరుకునే విద్యార్హతలు (Education - Multi-Select)</span>
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setEducations([
                    "B.Tech / B.E.",
                    "M.Tech / M.E.",
                    "MS (USA / Abroad)",
                    "MBBS / MD / MS",
                    "MBA / PGDM",
                    "MCA",
                  ])
                }
                className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 hover:bg-emerald-100"
              >
                + ప్రొఫెషనల్ / IT డిగ్రీలు అన్నీ
              </button>
              {educations.length > 0 && (
                <button
                  type="button"
                  onClick={() => setEducations([])}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800"
                >
                  క్లియర్ ({educations.length})
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 p-2 border border-slate-100 rounded-2xl bg-slate-50/50">
            {[
              "B.Tech / B.E.",
              "M.Tech / M.E.",
              "MS (USA / Abroad)",
              "MBBS / MD / MS",
              "B.Pharm / M.Pharm",
              "MBA / PGDM",
              "MCA",
              "CA / CS / ICWA",
              "Degree (B.Sc / B.Com / B.A)",
              "Post Graduate (M.Sc / M.Com / M.A)",
              "Ph.D / Doctorate",
              "Polytechnic / Diploma",
              "Inter / 12th",
            ].map((e) => {
              const isSel = educations.includes(e);
              return (
                <button
                  type="button"
                  key={e}
                  onClick={() => toggleEducation(e)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    isSel
                      ? "bg-[#7A0C2E] text-white shadow-xs"
                      : "bg-white border border-slate-200 text-slate-700 hover:border-gold hover:bg-amber-50"
                  }`}
                >
                  <span>{isSel ? "✓" : "+"}</span>
                  <span>{e}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Profession / Jobs Multi-Select */}
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <h3 className="text-sm font-black text-maroon uppercase tracking-wider flex items-center gap-2">
              <span>💼</span> <span>కోరుకునే ఉద్యోగం / వృత్తి (Job / Profession - Multi-Select)</span>
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              {isGroom ? (
                <>
                  <button
                    type="button"
                    onClick={() => setJobs(["Housewife / Homemaker (గృహిణి)", "Not Working / Looking for Job"])}
                    className="text-[11px] font-black text-rose-800 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200 hover:bg-rose-100"
                  >
                    🏡 గృహిణి మాత్రమే (Housewife)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setJobs([
                        "Software / IT Professional",
                        "Govt Employee / PSU / Bank",
                        "Doctor / Medical / Healthcare",
                        "Teacher / Lecturer / Professor",
                      ])
                    }
                    className="text-[11px] font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 hover:bg-emerald-100"
                  >
                    💼 ఉద్యోగం చేసే అమ్మాయిలు (Working)
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setJobs([
                      "Software / IT Professional",
                      "Govt Employee / PSU (Central / State)",
                      "Doctor / Surgeon / Medical Specialist",
                      "Bank Officer / PO / Manager",
                      "Business Owner / Industrialist / Builder",
                    ])
                  }
                  className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 hover:bg-amber-100"
                >
                  + టాప్ ప్రొఫెషన్స్ అన్నీ
                </button>
              )}
              {jobs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setJobs([])}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800"
                >
                  క్లియర్ ({jobs.length})
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 p-2 border border-slate-100 rounded-2xl bg-slate-50/50">
            {displayJobs.map((j) => {
              const isSel = jobs.includes(j);
              const isHousewife = j.includes("Housewife") || j.includes("Homemaker") || j.includes("గృహిణి");
              return (
                <button
                  type="button"
                  key={j}
                  onClick={() => toggleJob(j)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    isSel
                      ? isHousewife
                        ? "bg-rose-700 text-white shadow-xs"
                        : "bg-[#7A0C2E] text-white shadow-xs"
                      : isHousewife
                      ? "bg-rose-50 border border-rose-300 text-rose-900 hover:bg-rose-100"
                      : "bg-white border border-slate-200 text-slate-700 hover:border-gold hover:bg-amber-50"
                  }`}
                >
                  <span>{isSel ? "✓" : "+"}</span>
                  <span>{j}</span>
                </button>
              );
            })}
          </div>

          {/* Minimum Income Bracket */}
          <div className="pt-2">
            <label className="font-bold text-slate-800 block text-xs mb-1">
              కనీస వార్షిక ఆదాయం (Minimum Annual Income):
            </label>
            <select
              value={minSalary}
              onChange={(e) => setMinSalary(e.target.value)}
              className="w-full sm:w-72 p-2.5 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-800 focus:outline-none focus:border-maroon"
            >
              <option value="Any">ఏదైనా ఆదాయం (Any Salary)</option>
              <option value="₹3 - 5 Lakhs / year">₹3 - 5 లక్షలు / సం. పైన</option>
              <option value="₹5 - 7 Lakhs / year">₹5 - 7 లక్షలు / సం. పైన</option>
              <option value="₹7 - 10 Lakhs / year">₹7 - 10 లక్షలు / సం. పైన</option>
              <option value="₹10 - 15 Lakhs / year">₹10 - 15 లక్షలు / సం. పైన</option>
              <option value="₹15 - 25 Lakhs / year">₹15 - 25 లక్షలు / సం. పైన</option>
              <option value="₹25 - 50 Lakhs / year">₹25 - 50 లక్షలు / సం. పైన</option>
              <option value="₹50+ Lakhs (NRI / High Networth)">₹50+ లక్షలు (NRI / High Networth)</option>
            </select>
          </div>
        </div>

        {/* 5. Districts Multi-Select */}
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <h3 className="text-sm font-black text-maroon uppercase tracking-wider flex items-center gap-2">
              <span>📍</span> <span>కోరుకునే జిల్లాలు & ప్రాంతాలు (Districts - Multi-Select)</span>
            </h3>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setDistricts(["Hyderabad", "Ranga Reddy", "Medchal-Malkajgiri", "Sangareddy"])
                }
                className="text-[11px] font-bold text-slate-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 hover:bg-amber-100"
              >
                హైదరాబాద్ మెట్రో
              </button>
              <button
                type="button"
                onClick={() => setDistricts([...TS_DISTRICTS])}
                className="text-[11px] font-bold text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200 hover:bg-indigo-100"
              >
                తెలంగాణ అన్నీ
              </button>
              <button
                type="button"
                onClick={() => setDistricts([...AP_DISTRICTS])}
                className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 hover:bg-emerald-100"
              >
                ఆంధ్రప్రదేశ్ అన్నీ
              </button>
              {districts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDistricts([])}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800"
                >
                  క్లియర్ ({districts.length})
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              value={districtSearch}
              onChange={(e) => setDistrictSearch(e.target.value)}
              placeholder="🔍 జిల్లాను వెతకండి (ఉదా: Hyderabad, Warangal, Guntur, Krishna, Visakhapatnam)..."
              className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-maroon"
            />

            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-2 border border-slate-100 rounded-2xl bg-slate-50/50">
              {filteredDistricts.map((d) => {
                const isSel = districts.includes(d);
                const teName = DISTRICT_TELUGU[d] || "";
                return (
                  <button
                    type="button"
                    key={d}
                    onClick={() => toggleDistrict(d)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      isSel
                        ? "bg-[#7A0C2E] text-white shadow-xs"
                        : "bg-white border border-slate-200 text-slate-700 hover:border-gold hover:bg-amber-50"
                    }`}
                  >
                    <span>{isSel ? "✓" : "+"}</span>
                    <span>{d} {teName ? `(${teName})` : ""}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 6. Marital Status & Diet */}
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-black text-maroon uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
            <span>💍</span> <span>వైవాహిక స్థితి & ఇతర అలవాట్లు (Marital & Lifestyle)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-800 block mb-1.5">వైవాహిక స్థితి (Marital Status):</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { v: "Never Married", l: "మొదటి వివాహం (Never Married)" },
                  { v: "Divorced", l: "విడాకులు (Divorced)" },
                  { v: "Widowed", l: "వితంతువు (Widowed)" },
                ].map((m) => {
                  const isSel = maritalStatuses.includes(m.v);
                  return (
                    <button
                      type="button"
                      key={m.v}
                      onClick={() => toggleMarital(m.v)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        isSel
                          ? "bg-[#7A0C2E] text-white shadow-xs"
                          : "bg-white border border-slate-200 text-slate-700 hover:border-gold hover:bg-amber-50"
                      }`}
                    >
                      <span>{isSel ? "✓" : "+"}</span>
                      <span>{m.l}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1.5">ఆహారపు అలవాటు (Diet):</label>
              <select
                value={diet}
                onChange={(e) => setDiet(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-bold text-slate-800 focus:outline-none focus:border-maroon"
              >
                <option value="Any">ఏదైనా (Any Diet)</option>
                <option value="Vegetarian">శాఖాహారం మాత్రమే (Vegetarian Only)</option>
                <option value="Non-Vegetarian">మాంసాహారం (Non-Vegetarian)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 7. Save Action Bar */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600 font-medium text-center sm:text-left">
            💾 సేవ్ చేయగానే మీ కోసం ప్రత్యేకంగా సరిపోయే సంబంధాల జాబితా ఆటోమేటిక్‌గా అప్‌డేట్ అవుతుంది.
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl gold-gradient text-maroon text-sm font-black shadow-md hover:brightness-105 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? "సేవ్ అవుతోంది…" : "💾 నా ప్రిఫరెన్సెస్ సేవ్ చేయండి (Save Preferences)"}
          </button>
        </div>
      </form>
    </div>
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
                  <option key={st.en} value={st.en}>
                    ⭐ {st.te} ({st.en})
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
                  <option key={r.en} value={r.en}>
                    {r.te} ({r.en})
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

        {/* 4. Family & Physical Details */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-maroon uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
            <span>👨‍👩‍👧</span> <span>కుటుంబ వివరాలు & శారీరక లక్షణాలు (Family & Physical)</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
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
              <label className="font-bold text-slate-800 block mb-1">అన్నదమ్ములు (Brothers):</label>
              <input
                type="text"
                value={profile.brothers ?? "0"}
                onChange={(e) => setField("brothers", e.target.value)}
                placeholder="ఉదా: 1 (పెళ్లి అయింది)"
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-maroon"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">అక్కచెల్లెళ్లు (Sisters):</label>
              <input
                type="text"
                value={profile.sisters ?? "0"}
                onChange={(e) => setField("sisters", e.target.value)}
                placeholder="ఉదా: 1"
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-maroon"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">వర్ణం (Complexion):</label>
              <select
                value={profile.complexion || "Fair"}
                onChange={(e) => setField("complexion", e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-maroon"
              >
                <option value="Very Fair">చాలా చామనచాయ (Very Fair)</option>
                <option value="Fair">ఎరుపు / తెల్లని (Fair)</option>
                <option value="Wheatish">గోధుమ రంగు (Wheatish)</option>
                <option value="Dark">నలుపు / చామనచాయ</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">కుటుంబ రకం (Family Type):</label>
              <select
                value={profile.family_type || "Nuclear"}
                onChange={(e) => setField("family_type", e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-maroon"
              >
                <option value="Nuclear">చిన్న కుటుంబం (Nuclear Family)</option>
                <option value="Joint">ఉమ్మడి కుటుంబం (Joint Family)</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">కుటుంబ స్థాయి (Family Status):</label>
              <select
                value={profile.family_status || "Middle Class"}
                onChange={(e) => setField("family_status", e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-maroon"
              >
                <option value="Middle Class">మధ్యతరగతి (Middle Class)</option>
                <option value="Upper Middle Class">ఎగువ మధ్యతరగతి (Upper Middle Class)</option>
                <option value="Rich / Affluent">శ్రీమంతులు / ఉన్నత వర్గం (Rich / Affluent)</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">మాతృభాష (Mother Tongue):</label>
              <input
                type="text"
                value={profile.mother_tongue || "Telugu"}
                onChange={(e) => setField("mother_tongue", e.target.value)}
                placeholder="ఉదా: Telugu"
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-maroon"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="font-bold text-slate-800 block mb-1">భాగస్వామి నుంచి కోరుకునేవి (Partner Expectations):</label>
              <textarea
                rows={2}
                value={profile.expectations || ""}
                onChange={(e) => setField("expectations", e.target.value)}
                placeholder="మీరు కోరుకునే భాగస్వామి చదువు, ఉద్యోగం, వ్యక్తిత్వం మరియు అలవాట్ల గురించి రాయండి…"
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-maroon telugu"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="font-bold text-slate-800 block mb-1">ఫోటో URL (Photo Link):</label>
              <input
                type="text"
                value={profile.photo_url || ""}
                onChange={(e) => setField("photo_url", e.target.value)}
                placeholder="https://..."
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-maroon"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="font-bold text-slate-800 block mb-1">నా గురించి (About Myself):</label>
              <textarea
                rows={3}
                value={profile.about_myself || ""}
                onChange={(e) => setField("about_myself", e.target.value)}
                placeholder="మీ కుటుంబం, వ్యక్తిత్వం మరియు అంచనాల గురించి క్లుప్తంగా రాయండి…"
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
  const [packs, setPacks] = useState<Row[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiGet<Row[]>("/api/boost/packs").then((r) => {
      if (r.ok && r.data) setPacks(r.data);
    });
  }, []);

  const buy = async (packId: string) => {
    setBusy(true);
    const { ok, data } = await apiPost<Row>("/api/boost/buy", { tsap_id: myId, pack_id: packId });
    setBusy(false);
    if (ok && data?.success) setMsg({ ok: true, text: String(data.message_telugu || "Boost activated!") });
    else setMsg({ ok: false, text: String(data?.message_telugu || "Boost purchase failed") });
  };

  return (
    <section className="rounded-3xl border border-gold/30 bg-white p-5 text-center space-y-3">
      <div className="text-4xl">⚡</div>
      <h2 className="text-base font-extrabold text-[#7A0C2E]">ప్రొఫైల్ బూస్ట్ (Profile Boost)</h2>
      <p className="text-xs text-slate-600 telugu">మీ ప్రొఫైల్‌ను సెర్చ్ రిజల్ట్స్‌లో టాప్ ర్యాంకింగ్‌లో ప్రదర్శించడానికి బూస్ట్ చేయండి.</p>
      {packs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {packs.map((p, i) => (
            <div key={i} className="border border-gold/40 rounded-2xl p-3 text-xs flex items-center justify-between">
              <div className="text-left">
                <div className="font-bold text-maroon">{p.name || p.title}</div>
                <div className="text-slate-500 font-mono">₹{p.price}</div>
              </div>
              <button
                type="button"
                onClick={() => buy(p.id)}
                disabled={busy}
                className="px-3 py-1.5 rounded-xl gold-gradient text-maroon font-bold text-xs shadow-xs"
              >
                బూస్ట్ చేయండి
              </button>
            </div>
          ))}
        </div>
      )}
      <Msg m={msg} />
    </section>
  );
}

/* ---------------- 🎙️ VOICE ---------------- */
function VoicePanel({ myId }: { myId: string }) {
  const [voiceData, setVoiceData] = useState<Row | null>(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    apiGet<Row>(`/api/voice/${encodeURIComponent(myId)}`).then((r) => {
      if (r.ok && r.data) setVoiceData(r.data);
    });
  }, [myId]);

  const handleVoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("tsap_id", myId);
    fd.append("file", file);
    try {
      const res = await fetch("/api/voice/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (res.ok && d.success) setMsg({ ok: true, text: "వాయిస్ బయోడేటా అప్‌లోడ్ అయింది! ✅" });
      else setMsg({ ok: false, text: d.detail || "అప్‌లోడ్ విఫలమైంది" });
    } catch {
      setMsg({ ok: false, text: "నెట్‌వర్క్ సమస్య" });
    }
    setUploading(false);
  };

  return (
    <section className="rounded-3xl border border-indigo-200 bg-white p-5 text-center space-y-3">
      <div className="text-4xl">🎙️</div>
      <h2 className="text-base font-extrabold text-[#7A0C2E]">వాయిస్ బయోడేటా (Voice Bio)</h2>
      <p className="text-xs text-slate-600">మీ స్వరం ద్వారా ఆడియో బయోడేటా రికార్డ్ చేసి ప్రొఫైల్‌కు జోడించండి.</p>
      <input type="file" accept="audio/*" onChange={handleVoiceUpload} className="text-xs mx-auto block pt-2" />
      {uploading && <div className="text-xs text-slate-500">అప్‌లోడ్ అవుతోంది…</div>}
      <Msg m={msg} />
    </section>
  );
}

/* ---------------- 🪐 JATHAKAM ---------------- */
function JathakamPanel({ myId }: { myId: string }) {
  const [dosha, setDosha] = useState<Row | null>(null);
  const [chart, setChart] = useState<Row | null>(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    apiGet<Row>(`/api/astro/dosha/${encodeURIComponent(myId)}`).then((r) => {
      if (r.ok && r.data) setDosha(r.data);
    });
    apiGet<Row>(`/api/astro/chart/${encodeURIComponent(myId)}`).then((r) => {
      if (r.ok && r.data?.success) setChart(r.data);
    });
  }, [myId]);

  const handleJathakamUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("tsap_id", myId);
    fd.append("file", file);
    try {
      const res = await fetch("/api/astro/jathakam/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (res.ok && d.success) setMsg({ ok: true, text: "జాతక పత్రం అప్‌లోడ్ అయింది! ✅" });
      else setMsg({ ok: false, text: d.detail || "అప్‌లోడ్ విఫలమైంది" });
    } catch {
      setMsg({ ok: false, text: "నెట్‌వర్క్ సమస్య" });
    }
    setUploading(false);
  };

  return (
    <section className="rounded-3xl border border-amber-200 bg-white p-5 text-center space-y-3">
      <div className="text-4xl">🪐</div>
      <h2 className="text-base font-extrabold text-[#7A0C2E]">వేద జాతకం & రాశి చక్రం</h2>
      {chart ? (
        <RasiChart houses={chart.houses} moonHouse={chart.moon_house} star={chart.star} rasi={chart.rasi} title="నా రాశి చక్రం" />
      ) : (
        <RasiChart star="Rohini" rasi="Vrishabha" title="రాశి చక్రం" />
      )}
      <div className="pt-2">
        <label className="text-xs font-bold text-slate-700 block mb-1">జాతక పత్రం అప్‌లోడ్ (Kundli / Jathakam Image):</label>
        <input type="file" accept="image/*,application/pdf" onChange={handleJathakamUpload} className="text-xs mx-auto block" />
        {uploading && <div className="text-xs text-slate-500 mt-1">అప్‌లోడ్ అవుతోంది…</div>}
        <Msg m={msg} />
      </div>
      <div className="flex justify-center gap-2 pt-2">
        <Link href="/porutham" className="px-5 py-2.5 rounded-2xl maroon-gradient text-white font-bold text-xs shadow-md">
          ఉచిత గుణమేళనం చెక్ చేయండి
        </Link>
      </div>
    </section>
  );
}

/* ---------------- 📤 SHARE ---------------- */
function SharePanel({ myId }: { myId: string }) {
  const [kit, setKit] = useState<Row | null>(null);
  useEffect(() => {
    apiGet<Row>(`/api/share/kit/${encodeURIComponent(myId)}`).then((r) => {
      if (r.ok && r.data) setKit(r.data);
    });
  }, [myId]);

  return (
    <section className="rounded-3xl border border-emerald-200 bg-white p-5 text-center space-y-3">
      <div className="text-4xl">📤</div>
      <h2 className="text-base font-extrabold text-[#7A0C2E]">ప్రొఫైల్ షేరింగ్ & బయోడేటా</h2>
      <div className="flex flex-wrap justify-center gap-3">
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
