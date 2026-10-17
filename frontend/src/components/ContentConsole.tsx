"use client";
/**
 * 📝 WAVE 15 — ADMIN CONTENT CONSOLE (CMS: pages + stories + banners).
 * Code marchakunda website customize: kotha pages, success stories + photos, banners.
 * ADMIN ONLY.
 */
import { useEffect, useState } from "react";
import { authHeaders, readApiJson} from "@/lib/api";
import ProtectedImage from "@/components/ProtectedImage";
import { useLang } from "@/lib/lang";

type Row = Record<string, any>;
const adminToken = () => { try { return localStorage.getItem("tsap_admin_token") || ""; } catch { return ""; } };
const withToken = (url: string) => {
  const tk = adminToken();
  return tk ? `${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(tk)}` : url;
};
const H = () => ({ ...authHeaders(true), "Content-Type": "application/json" });

export default function ContentConsole() {
  const { lang } = useLang();
  const te = lang === "te";
  const [data, setData] = useState<Row | null>(null);
  const [flash, setFlash] = useState("");
  const [sub, setSub] = useState("pages");
  const [pg, setPg] = useState<Row>({ slug: "", title_en: "", title_te: "", body_en: "", body_te: "", photos: "", tags: "", published: false });
  const [st, setSt] = useState<Row>({ groom: "", bride: "", photo: "", story_en: "", story_te: "", district: "", wedding_date: "", tags: "", published: false });
  const [bn, setBn] = useState<Row>({ text_en: "", text_te: "", link: "", pages: "all", active: false });
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    try {
      const d = await fetch(withToken("/api/admin/cms"), { headers: authHeaders(true) }).then((r) => readApiJson(r));
      if (d?.success) setData(d);
      else setFlash(d.detail || "Load fail");
    } catch { setFlash("Network problem"); }
  };
  useEffect(() => { void load(); }, []);

  const post = async (url: string, body: Row) => {
    const r = await fetch(withToken(url), { method: "POST", headers: H(), body: JSON.stringify(body) });
    const d = await readApiJson(r);
    setFlash(d.message_telugu || d.detail || "done");
    if (r.ok) void load();
    return r.ok;
  };

  const uploadPhoto = async (file: File | undefined, cb: (url: string) => void) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const headers = authHeaders(true);
      delete headers["Content-Type"];
      const r = await fetch(withToken("/api/photo/upload"), { method: "POST", headers, body: fd });
      const d = await readApiJson(r);
      if (d?.photo_url || d?.url) { cb(d.photo_url || d.url); setFlash(te ? "📸 Photo upload అయ్యింది" : "📸 Photo uploaded"); }
      else setFlash((d?.detail?.te || d?.detail?.message_telugu || d?.detail) || (te ? "Upload fail — URL paste చెయ్యండి" : "Upload failed — paste URL"));
    } catch { setFlash(te ? "Upload fail — URL paste చెయ్యండి" : "Upload failed — paste URL"); }
    setUploading(false);
  };

  const pages: Row[] = data?.pages || [];
  const stories: Row[] = data?.stories || [];
  const banners: Row[] = data?.banners || [];
  const stats: Row = data?.stats || {};

  return (
    <div>
      <p className="telugu mt-2 text-xs text-gray-500">
{te ? <>Website content ఇక్కడే — <b>pages</b> (/p/slug), <b>success stories</b> (photo + tags), <b>banners</b> (announcements).
        Publish ON చేస్తే site లో live.</> : <>Website content here — <b>pages</b> (/p/slug), <b>success stories</b> (photo + tags), <b>banners</b> (announcements).
        Publish ON = live on site.</>}
      </p>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 my-2">
        {[["Pages", `${stats.pages_live ?? 0}/${stats.pages ?? 0}`], ["Stories", `${stats.stories_live ?? 0}/${stats.stories ?? 0}`],
          ["Banners", `${stats.banners_live ?? 0}/${stats.banners ?? 0}`], ["Tags", stats.tags ?? 0]].map(([l, v]) => (
          <div key={l as string} className="rounded-xl bg-rose-50 border border-rose-100 p-2 text-center">
            <div className="text-lg font-extrabold text-[#7A0C2E]">{String(v)}</div>
            <div className="text-[11px] text-gray-500">{l}</div>
          </div>
        ))}
        <button type="button" onClick={() => void load()} className="rounded-xl bg-gray-100 text-xs font-bold p-2">↻ Refresh</button>
      </div>
      {flash && <div className="mb-2 rounded-xl bg-[#0F1F3C] text-white text-xs p-2">{flash}</div>}
      <div className="flex gap-2 my-2">
        {[["pages", "📄 Pages"], ["stories", "💑 Stories"], ["banners", "📣 Banners"]].map(([v, l]) => (
          <button type="button" key={v} onClick={() => setSub(v)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold ${sub === v ? "maroon-gradient text-white" : "bg-gray-100"}`}>{l}</button>
        ))}
      </div>

      {sub === "pages" && (
        <div className="space-y-2">
          <div className="rounded-xl border p-3 text-xs space-y-2 bg-rose-50/40">
            <div className="font-bold text-[#7A0C2E]">➕ {te ? "పేజీ సృష్టించండి లేదా నవీకరించండి (ఇప్పటికే ఉన్న slug‌ను నవీకరిస్తుంది)" : "Create or update a page (an existing slug updates that page)"}</div>
            <div className="grid md:grid-cols-2 gap-2">
              <input value={pg.slug} onChange={(e) => setPg({ ...pg, slug: e.target.value.toLowerCase() })} placeholder="slug (about-us)" className="rounded-lg border px-2 py-1.5 font-mono" aria-label="Slug" />
              <input value={pg.tags} onChange={(e) => setPg({ ...pg, tags: e.target.value })} placeholder="tags (csv: info, trust)" className="rounded-lg border px-2 py-1.5" aria-label="Tags" />
              <input value={pg.title_en} onChange={(e) => setPg({ ...pg, title_en: e.target.value })} placeholder="Title (English)" className="rounded-lg border px-2 py-1.5" aria-label="Title EN" />
              <input value={pg.title_te} onChange={(e) => setPg({ ...pg, title_te: e.target.value })} placeholder="Title (తెలుగు)" className="rounded-lg border px-2 py-1.5" aria-label="Title TE" />
            </div>
            <textarea value={pg.body_en} onChange={(e) => setPg({ ...pg, body_en: e.target.value })} placeholder="Body (English) — paragraphs" rows={3} className="w-full rounded-lg border px-2 py-1.5" aria-label="Body EN" />
            <textarea value={pg.body_te} onChange={(e) => setPg({ ...pg, body_te: e.target.value })} placeholder="Body (తెలుగు)" rows={3} className="w-full rounded-lg border px-2 py-1.5" aria-label="Body TE" />
            <input value={pg.photos} onChange={(e) => setPg({ ...pg, photos: e.target.value })} placeholder={te ? "ఫోటో URLs (కామాలతో వేరు చేయండి)" : "Photo URLs (comma-separated)"} className="w-full rounded-lg border px-2 py-1.5" aria-label="Photos" />
            <label className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-slate-700">
              <input type="checkbox" checked={!!pg.published} onChange={(e) => setPg({ ...pg, published: e.target.checked })} />
              Publish immediately (unchecked saves a draft)
            </label>
            <button type="button" onClick={() => void post("/api/admin/cms/pages", { ...pg, photos: pg.photos.split(",").map((x: string) => x.trim()).filter(Boolean) })}
              className="rounded-lg bg-green-700 text-white px-4 py-1.5 text-xs font-bold">💾 Save page</button>
          </div>
          {pages.map((p) => (
            <div key={p.slug} className="rounded-xl border p-2.5 text-xs flex flex-wrap items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full font-bold ${p.published ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-500"}`}>{p.published ? "LIVE" : "DRAFT"}</span>
              <span className="font-mono font-bold">/p/{p.slug}</span>
              <span>{p.title_en} • {p.title_te}</span>
              <span className="text-gray-400">{(p.tags || []).map((t: string) => `#${t}`).join(" ")}</span>
              <span className="ml-auto flex gap-1">
                <button type="button" aria-label={te ? "పేజీని సవరించండి" : "Edit page"} onClick={() => setPg({ slug: p.slug, title_en: p.title_en, title_te: p.title_te, body_en: p.body_en, body_te: p.body_te, photos: (p.photos || []).join(","), tags: (p.tags || []).join(","), published: !!p.published })} className="rounded-lg bg-blue-600 text-white px-3 py-1 text-[11px] font-bold">✏️</button>
                <button type="button" onClick={() => void post("/api/admin/cms/pages", { ...p, published: !p.published })} className="rounded-lg bg-gray-800 text-white px-3 py-1 text-[11px] font-bold">ON/OFF</button>
                <button type="button" aria-label={te ? "పేజీని తొలగించండి" : "Delete page"} onClick={() => void post("/api/admin/cms/delete", { kind: "page", id: p.slug })} className="rounded-lg bg-red-600 text-white px-3 py-1 text-[11px] font-bold">🗑️</button>
              </span>
            </div>
          ))}
        </div>
      )}

      {sub === "stories" && (
        <div className="space-y-2">
          <div className="rounded-xl border p-3 text-xs space-y-2 bg-rose-50/40">
            <div className="font-bold text-[#7A0C2E]">➕ Success story (couple photo best!)</div>
            <div className="grid md:grid-cols-3 gap-2">
              <input value={st.groom} onChange={(e) => setSt({ ...st, groom: e.target.value })} placeholder="Groom name" className="rounded-lg border px-2 py-1.5" aria-label="Groom" />
              <input value={st.bride} onChange={(e) => setSt({ ...st, bride: e.target.value })} placeholder="Bride name" className="rounded-lg border px-2 py-1.5" aria-label="Bride" />
              <input value={st.district} onChange={(e) => setSt({ ...st, district: e.target.value })} placeholder="District" className="rounded-lg border px-2 py-1.5" aria-label="District" />
              <input value={st.wedding_date} onChange={(e) => setSt({ ...st, wedding_date: e.target.value })} placeholder="Date YYYY-MM-DD" className="rounded-lg border px-2 py-1.5" aria-label="Date" />
              <input value={st.tags} onChange={(e) => setSt({ ...st, tags: e.target.value })} placeholder="tags (csv)" className="rounded-lg border px-2 py-1.5" aria-label="Tags" />
              <label className="rounded-lg bg-blue-600 text-white px-3 py-1.5 text-center font-bold cursor-pointer">
                {uploading ? "⏳…" : "📸 Photo upload"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => void uploadPhoto(e.target.files?.[0], (u) => setSt({ ...st, photo: u }))} />
              </label>
            </div>
            <input value={st.photo} onChange={(e) => setSt({ ...st, photo: e.target.value })} placeholder={te ? "ఫోటో URL (upload చేయండి లేదా paste చేయండి)" : "Photo URL (upload or paste)"} className="w-full rounded-lg border px-2 py-1.5" aria-label="Photo" />
            {st.photo ? <ProtectedImage src={st.photo} alt="Photo preview unavailable" admin className="h-20 rounded-lg object-cover" /> : null}
            <textarea value={st.story_te} onChange={(e) => setSt({ ...st, story_te: e.target.value })} placeholder="Story (తెలుగు) — 2-3 lines" rows={2} className="w-full rounded-lg border px-2 py-1.5" aria-label="Story TE" />
            <textarea value={st.story_en} onChange={(e) => setSt({ ...st, story_en: e.target.value })} placeholder="Story (English)" rows={2} className="w-full rounded-lg border px-2 py-1.5" aria-label="Story EN" />
            <label className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-slate-700">
              <input type="checkbox" checked={!!st.published} onChange={(e) => setSt({ ...st, published: e.target.checked })} />
              Publish immediately (unchecked saves a draft)
            </label>
            <button type="button" onClick={() => void post("/api/admin/cms/stories", st)} className="rounded-lg bg-green-700 text-white px-4 py-1.5 text-xs font-bold">💾 Save story</button>
          </div>
          {stories.map((s) => (
            <div key={s.id} className="rounded-xl border p-2.5 text-xs flex flex-wrap items-center gap-2">
              {s.photo ? <ProtectedImage src={s.photo} alt="Story photo unavailable" admin className="h-10 w-10 rounded-lg object-cover" /> : <span>🖼️</span>}
              <span className="font-mono text-gray-500">{s.id}</span>
              <span className="font-bold">💑 {s.groom} ♥ {s.bride}</span>
              <span className="text-gray-500">{s.district} {(s.tags || []).map((t: string) => `#${t}`).join(" ")}</span>
              <span className="ml-auto flex gap-1">
                <button type="button" onClick={() => void post("/api/admin/cms/stories", { ...s, tags: (s.tags || []).join(","), published: !s.published })} className="rounded-lg bg-gray-800 text-white px-3 py-1 text-[11px] font-bold">{s.published ? "ON" : "OFF"}</button>
                <button type="button" aria-label={te ? "స్టోరీని తొలగించండి" : "Delete story"} onClick={() => void post("/api/admin/cms/delete", { kind: "story", id: s.id })} className="rounded-lg bg-red-600 text-white px-3 py-1 text-[11px] font-bold">🗑️</button>
              </span>
            </div>
          ))}
        </div>
      )}

      {sub === "banners" && (
        <div className="space-y-2">
          <div className="rounded-xl border p-3 text-xs space-y-2 bg-rose-50/40">
            <div className="font-bold text-[#7A0C2E]">➕ Banner (announcement strip)</div>
            <div className="grid md:grid-cols-2 gap-2">
              <input value={bn.text_en} onChange={(e) => setBn({ ...bn, text_en: e.target.value })} placeholder="Text (English)" className="rounded-lg border px-2 py-1.5" aria-label="Text EN" />
              <input value={bn.text_te} onChange={(e) => setBn({ ...bn, text_te: e.target.value })} placeholder="Text (తెలుగు)" className="rounded-lg border px-2 py-1.5" aria-label="Text TE" />
              <input value={bn.link} onChange={(e) => setBn({ ...bn, link: e.target.value })} placeholder="Link (/pricing …)" className="rounded-lg border px-2 py-1.5" aria-label="Link" />
              <input value={bn.pages} onChange={(e) => setBn({ ...bn, pages: e.target.value })} placeholder="pages (all / home,pricing)" className="rounded-lg border px-2 py-1.5" aria-label="Pages" />
            </div>
            <label className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-slate-700">
              <input type="checkbox" checked={!!bn.active} onChange={(e) => setBn({ ...bn, active: e.target.checked })} />
              Show this banner immediately (unchecked saves it hidden)
            </label>
            <button type="button" onClick={() => void post("/api/admin/cms/banners", { ...bn, pages: bn.pages.split(",").map((x: string) => x.trim()).filter(Boolean) })} className="rounded-lg bg-green-700 text-white px-4 py-1.5 text-xs font-bold">💾 Save banner</button>
          </div>
          {banners.map((b) => (
            <div key={b.id} className="rounded-xl border p-2.5 text-xs flex flex-wrap items-center gap-2">
              <span className="font-mono text-gray-500">{b.id}</span>
              <span className="font-bold">{b.text_en} • {b.text_te}</span>
              <span className="text-gray-500">{(b.pages || []).join(",")} {b.link ? `→ ${b.link}` : ""}</span>
              <span className="ml-auto flex gap-1">
                <button type="button" onClick={() => void post("/api/admin/cms/banners", { ...b, active: !b.active })} className="rounded-lg bg-gray-800 text-white px-3 py-1 text-[11px] font-bold">{b.active ? "ON" : "OFF"}</button>
                <button type="button" aria-label={te ? "బ్యానర్‌ను తొలగించండి" : "Delete banner"} onClick={() => void post("/api/admin/cms/delete", { kind: "banner", id: b.id })} className="rounded-lg bg-red-600 text-white px-3 py-1 text-[11px] font-bold">🗑️</button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
