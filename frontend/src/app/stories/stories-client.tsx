"use client";

/**
 * 💑 WAVE 11 — Success Stories (trust + viral).
 * Public list + logged-in users story submit + like.
 */
import { useEffect, useState } from "react";
import { Duo, duo } from "@/lib/duo";
import { useLang } from "@/lib/lang";
import Link from "next/link";
import { apiGet, apiPost, TSAP_KEY } from "@/lib/api";
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
    const r = await apiPost<{ message_telugu?: string }>("/api/stories/submit", { tsap_id: tid, ...form });
    setSending(false);
    setMsg(r.ok ? (r.data?.message_telugu || (te ? "✅ Story వచ్చింది!" : "✅ Story received!")) : (r.errorTelugu || (te ? "⚠️ మళ్లీ try" : "⚠️ Retry")));
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
      <h1 className="text-3xl font-extrabold text-rose-900">💑 <Duo en="Success Stories" te="విజయగాథలు" /></h1>
      <div className="mt-4"><FeaturedStories limit={6} /></div>
      <h2 className="mt-8 text-xl font-extrabold text-rose-900">💬 <Duo en="Community stories" te="మీ కథలు" /></h2>
      <p className="mt-1 text-gray-600">
{te ? <>మన వివాహ ద్వారా కలిసిన జంటలు 🎉 — మీకు కూడా ఇలాంటి సంబంధం కావాలంటే{" "}
        <Link href="/register" className="font-semibold text-rose-700 underline">3 min లో register</Link> (మొదటి 3 FREE).</> : <>Couples united through మన వివాహ 🎉 — if you want such a match too{" "}
        <Link href="/register" className="font-semibold text-rose-700 underline">register in 3 min</Link> (first 3 FREE).</>}
      </p>

      {loading && <p className="mt-6 text-gray-500">⏳ Stories loading…</p>}
      {!loading && stories.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-rose-300 bg-rose-50 p-6 text-center">
          <p className="text-lg font-semibold text-rose-900">{te ? "🆕 మొదటి story మీరు అవ్వండి!" : "🆕 Be the first story!"}</p>
          <p className="mt-1 text-sm text-gray-600">{te ? "పెళ్లి అయిన జంటలు కింద form లో story పంపండి — approve అయ్యాక ఇక్కడ + channels లో కనిపిస్తుంది." : "Married couples, send your story in the form below — after approval it shows here + in channels."}</p>
        </div>
      )}
      <div className="mt-6 space-y-4">
        {stories.map((s) => (
          <article key={s.story_id} className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
            <p className="font-bold text-rose-900">💑 {s.couple_names || "మన వివాహ జంట"}{s.district ? ` · ${s.district}` : ""}</p>
            <p className="mt-2 whitespace-pre-wrap text-gray-700">“{s.text}”</p>
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
        <p className="text-sm text-gray-600">{te ? "పెళ్లి అయిందా? జంట పేరు + 2 lines + photo link (optional) — admin approve (24h) తర్వాత public." : "Married? Couple names + 2 lines + photo link (optional) — public after admin approval (24h)."}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input value={form.couple_names} onChange={(e) => setForm({ ...form, couple_names: e.target.value })}
            placeholder={te ? "జంట పేరు (Ex: Raju ❤️ Lakshmi)" : "Couple names (Ex: Raju ❤️ Lakshmi)"} aria-label={te ? "జంట పేరు" : "Couple names"}
            className="rounded-xl border px-3 py-2 text-sm outline-none focus:border-emerald-500" />
          <input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })}
            placeholder="District (Ex: Nalgonda)" aria-label="District"
            className="rounded-xl border px-3 py-2 text-sm outline-none focus:border-emerald-500" />
        </div>
        <textarea value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })}
          placeholder={te ? "మీ story (20+ letters) — ఎలా కలిశారు, ఎప్పుడు పెళ్లి…" : "Your story (20+ letters) — how you met, when married…"} aria-label={te ? "మీ story" : "Your story"}
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
