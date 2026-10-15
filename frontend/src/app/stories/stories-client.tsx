"use client";

/**
 * 💑 WAVE 11 — Success Stories (trust + viral).
 * Public list + logged-in users story submit + like.
 */
import { useEffect, useState } from "react";
import { Duo, duo } from "@/lib/duo";
import { useLang } from "@/lib/lang";
import { apiDisplayMessage, apiGet, apiPost, TSAP_KEY } from "@/lib/api";
import FeaturedStories from "@/components/FeaturedStories";

type Story = {
  story_id: string;
  couple_names: string;
  text: string;
  district: string;
  photo_url: string;
  likes: number;
  created_at: string;
};

function myId(): string {
  if (typeof window === "undefined") return "";
  try { return localStorage.getItem(TSAP_KEY) || ""; } catch { return ""; }
}

export default function StoriesClient() {
  const { lang } = useLang();
  const te = lang === "te";
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ text: "", couple_names: "", partner_id: "", district: "" });
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [liked, setLiked] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    const r = await apiGet<{ stories?: Story[] }>("/api/stories?limit=20");
    setLoading(false);
    if (r.ok && r.data) setStories(r.data.stories || []);
  }
  useEffect(() => { load(); }, []);

  async function submit() {
    const tid = myId();
    if (!tid) { setMsg(te ? "🔒 ముందు login/register చెయ్యండి — అప్పుడు story పంపొచ్చు" : "🔒 Login/register first — then you can send a story"); return; }
    if (form.text.trim().length < 20) { setMsg(te ? "⚠️ Story కొంచెం పెద్దగా రాయండి (20+ letters)" : "⚠️ Write a slightly longer story (20+ letters)"); return; }
    setSending(true);
    const r = await apiPost<{ message_telugu?: string; message_en?: string }>("/api/stories/submit", { tsap_id: tid, ...form });
    setSending(false);
    setMsg(apiDisplayMessage(r.data, te, r.ok
      ? (te ? "✅ మీ కథనం అందింది!" : "✅ Your story was received.")
      : (te ? "⚠️ కథనాన్ని పంపలేకపోయాం. మళ్లీ ప్రయత్నించండి." : "⚠️ The story could not be submitted. Please try again.")));
    if (r.ok) setForm({ text: "", couple_names: "", partner_id: "", district: "" });
  }

  async function like(id: string) {
    if (liked.has(id)) return;
    const r = await apiPost<{ likes?: number }>(`/api/stories/${id}/like`, {});
    if (r.ok) {
      setLiked(new Set(liked).add(id));
      setStories((s) => s.map((x) => (x.story_id === id ? { ...x, likes: r.data?.likes ?? x.likes + 1 } : x)));
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-36">
      <h1 className="text-3xl font-extrabold text-rose-900">💑 <Duo en="Member Stories" te="సభ్యుల కథలు" /></h1>
      <div className="mt-4"><FeaturedStories limit={6} /></div>
      <h2 className="mt-8 text-xl font-extrabold text-rose-900">💬 <Duo en="Community stories" te="మీ కథలు" /></h2>
      <p className="mt-1 text-gray-600">
        {te ? "సభ్యులు పంపిన కథలు పరిశీలన తర్వాత, అందుబాటులో ఉన్నప్పుడు ఇక్కడ కనిపిస్తాయి. నమోదు తర్వాత మొదటి 3 interest requests FREE." : "Member-submitted stories appear here after review, when available. The first 3 interest requests are free after registration."}
      </p>

      {loading && <p className="mt-6 text-gray-500">⏳ Stories loading…</p>}
      {!loading && stories.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-rose-300 bg-rose-50 p-6 text-center">
          <p className="text-lg font-semibold text-rose-900">{te ? "🆕 మీ కథనాన్ని పంచుకోండి" : "🆕 Share a story if you wish"}</p>
          <p className="mt-1 text-sm text-gray-600">{te ? "పంపిన కథనం moderation తర్వాత ప్రచురణకు ఎంపిక కావచ్చు; ప్రచురణ సమయం లేదా ఇతర channels లో post హామీ కాదు." : "A submitted story may be selected for publication after moderation; timing and cross-channel posting are not guaranteed."}</p>
        </div>
      )}
      <div className="mt-6 space-y-4">
        {stories.map((s) => (
          <article key={s.story_id} className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
            <p className="break-words font-bold text-rose-900">💬 {s.couple_names || (te ? "సభ్యుల కథనం" : "Member story")}{s.district ? ` · ${te ? s.district : apiDisplayMessage({ message_en: s.district }, false, "")}` : ""}</p>
            {s.couple_names ? <p className="mt-0.5 text-[11px] text-gray-500">{te ? "సభ్యులు తెలిపిన పేరు" : "Name supplied with the story"}</p> : null}
            <p lang={te ? "te-IN" : "en-IN"} className={`mt-2 whitespace-pre-wrap text-gray-700 ${te ? "telugu" : ""}`}>
              “{te ? s.text : apiDisplayMessage({ message_en: s.text }, false, "This story was submitted in another language. Switch to Telugu to read the original.")}”
            </p>
            <div className="mt-3 flex items-center justify-between">
              <button
                onClick={() => like(s.story_id)}
                disabled={liked.has(s.story_id)}
                aria-label={te ? `${s.likes} likes, like చెయ్యండి` : `${s.likes} likes, like it`}
                className="rounded-full bg-rose-50 px-3 py-1 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
              >
                ❤️ {s.likes} {liked.has(s.story_id) ? "· Thanks!" : ""}
              </button>
              <span className="text-xs text-gray-400">{(s.created_at || "").slice(0, 10)}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
        <h2 className="text-xl font-bold text-emerald-900">{te ? "📝 మీ story పంపండి" : "📝 Send your story"}</h2>
        <p className="text-sm leading-relaxed text-gray-600">{te ? "మీరు పంచుకోవాలనుకునే వివరాలనే ఇవ్వండి. ప్రచురణకు ముందు moderation ఉంటుంది; సమయం హామీ కాదు. Moderation గుర్తింపు, సంబంధం లేదా పెళ్లి వివరాలను స్వతంత్రంగా నిర్ధారించదు." : "Share only details you are comfortable publishing. Stories are moderated before possible publication; no review time is guaranteed. Moderation does not independently verify identity, relationship, or wedding details."}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input value={form.couple_names} onChange={(e) => setForm({ ...form, couple_names: e.target.value })}
            placeholder={te ? "ప్రచురించడానికి జంట పేర్లు (ఐచ్ఛికం; సమ్మతితో)" : "Names to publish (optional; with consent)"} aria-label={te ? "ప్రచురించడానికి జంట పేర్లు" : "Names to publish"}
            className="rounded-xl border px-3 py-2 text-sm outline-none focus:border-emerald-500" />
          <input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })}
            placeholder={te ? "జిల్లా" : "District"} aria-label={te ? "జిల్లా" : "District"}
            className="rounded-xl border px-3 py-2 text-sm outline-none focus:border-emerald-500" />
        </div>
        <textarea value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })}
          placeholder={te ? "మీరు పంచుకోవడానికి అంగీకరించే వివరాలను రాయండి" : "Write the details you consent to share"} aria-label={te ? "మీ కథనం" : "Your story"}
          rows={3} className="mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-emerald-500" />
        <input value={form.partner_id} onChange={(e) => setForm({ ...form, partner_id: e.target.value })}
          placeholder="Partner Profile ID (optional)" aria-label="Partner Profile ID"
          className="mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-emerald-500" />
        <button onClick={submit} disabled={sending}
          className="mt-3 rounded-xl bg-emerald-700 px-5 py-2 font-bold text-white hover:bg-emerald-800 disabled:opacity-60">
          {sending ? (te ? "⏳ పంపిస్తున్నా…" : "⏳ Sending…") : te ? "💑 Story పంపు" : "💑 Send story"}
        </button>
        {msg && <p className="mt-2 text-sm font-semibold text-gray-700">{msg}</p>}
      </div>
    </div>
  );
}
