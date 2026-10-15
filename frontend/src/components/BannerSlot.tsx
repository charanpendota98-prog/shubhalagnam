"use client";

import { apiDisplayMessage, readApiJson } from "@/lib/api";
/**
 * 📣 WAVE 15 — CMS announcement banners (admin-managed, per-page).
 * Usage: <BannerSlot page="home" /> — page: home/pricing/matches/all…
 */
import { useEffect, useState } from "react";
import { useLang } from "@/lib/lang";

type Banner = { id: string; text_en: string; text_te: string; link: string };

export default function BannerSlot({ page }: { page: string }) {
  const { lang } = useLang();
  const te = lang === "te";
  const [items, setItems] = useState<Banner[]>([]);
  useEffect(() => {
    fetch(`/api/cms/banners?page=${encodeURIComponent(page)}`)
      .then((r) => readApiJson(r)).then((d) => {
        if (d?.success) setItems(d.banners || []);
      }).catch(() => {});
  }, [page]);
  if (!items.length) return null;
  return (
    <div className="space-y-2">
      {items.map((b) => {
        const text = te
          ? (b.text_te || b.text_en)
          : apiDisplayMessage({ message_en: b.text_en }, false, "This announcement is available in Telugu only.");
        const body = (
          <span className="text-xs font-bold">📣 {text}</span>
        );
        const cls = "block rounded-xl bg-gradient-to-r from-amber-100 to-rose-100 border border-amber-200 text-amber-900 px-4 py-2.5";
        return b.link ? (
          <a key={b.id} href={b.link} className={`${cls} hover:shadow`}>{body} <span className="underline">→</span></a>
        ) : (
          <div key={b.id} className={cls}>{body}</div>
        );
      })}
    </div>
  );
}
