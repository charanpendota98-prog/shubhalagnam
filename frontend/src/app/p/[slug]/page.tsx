"use client";
/**
 * 📄 WAVE 15 — CMS custom page (/p/{slug}) — admin creates, site renders.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLang } from "@/lib/lang";

type Page = { slug: string; title_en: string; title_te: string; body_en: string; body_te: string;
  photos: string[]; tags: string[]; updated_at: string };

export default function CmsPage() {
  const { lang } = useLang();
  const te = lang === "te";
  const { slug } = useParams() as { slug: string };
  const [p, setP] = useState<Page | null>(null);
  const [missing, setMissing] = useState(false);
  const [all, setAll] = useState<Page[]>([]);
  useEffect(() => {
    fetch(`/api/cms/pages/${encodeURIComponent(slug)}`).then((r) => r.json()).then((d) => {
      if (d?.success) setP(d.page);
      else setMissing(true);
    }).catch(() => setMissing(true));
    fetch("/api/cms/pages").then((r) => r.json()).then((d) => {
      if (d?.success) setAll((d.pages || []).filter((x: Page) => x.slug !== slug));
    }).catch(() => {});
  }, [slug]);
  const paras = (t: string) => (t || "").split(/\n+/).map((x) => x.trim()).filter(Boolean);
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/" className="text-xs font-bold text-[#7A0C2E]">← {te ? "హోమ్" : "Home"}</Link>
      {missing && <p className="mt-6 text-center text-gray-500">{te ? "⚠️ Page దొరకలేదు — admin publish చెయ్యలేదు." : "⚠️ Page not found — admin hasn\u2019t published it."}</p>}
      {p && (
        <>
          <h1 className="mt-3 text-3xl font-extrabold text-[#7A0C2E]">{p.title_en}</h1>
          {p.title_te ? <p className="mt-1 text-lg font-bold text-gray-600 telugu">{p.title_te}</p> : null}
          {(p.tags || []).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {p.tags.map((t) => <span key={t} className="text-[11px] bg-rose-50 text-rose-700 rounded-full px-2 py-0.5">#{t}</span>)}
            </div>
          )}
          {(p.photos || []).length > 0 && (
            <div className="mt-4 grid sm:grid-cols-2 gap-2">
              {p.photos.map((u) => <img key={u} src={u} alt={p.title_en} className="w-full rounded-2xl object-cover" loading="lazy" />)}
            </div>
          )}
          {p.body_te ? (
            <div className="mt-4 space-y-2 telugu text-[15px] text-gray-800 leading-relaxed">
              {paras(p.body_te).map((x, i) => <p key={i}>{x}</p>)}
            </div>
          ) : null}
          {p.body_en ? (
            <div className="mt-3 space-y-2 text-sm text-gray-600 leading-relaxed">
              {paras(p.body_en).map((x, i) => <p key={i}>{x}</p>)}
            </div>
          ) : null}
        </>
      )}
      {all.length > 0 && (
        <div className="mt-8 rounded-2xl border p-4">
          <div className="font-bold text-sm text-[#7A0C2E]">{te ? "📄 మరిన్ని పేజీలు" : "📄 More pages"}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {all.map((x) => (
              <Link key={x.slug} href={`/p/${x.slug}`} className="chip !py-1.5 !text-xs">{x.title_en}</Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
