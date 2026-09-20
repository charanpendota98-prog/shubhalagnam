"use client";

/**
 * 💬 WAVE 11 — Support widget (prathi page lo floating help).
 * /api/support/faq?q= tho Telugu Q&A search — login avasaram ledu.
 */
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { apiGet } from "@/lib/api";
import { useLang } from "@/lib/lang";
import { SITE_CONFIG } from "@/lib/site-config";

type Faq = { id: string; q: string; a: string };

export default function SupportWidget() {
  const pathname = usePathname();
  const { lang } = useLang();
  const te = lang === "te";
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(false);
  const [human, setHuman] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load(query: string) {
    setLoading(true);
    const r = await apiGet<{ faqs?: Faq[]; human_telugu?: string }>(
      `/api/support/faq?q=${encodeURIComponent(query)}&limit=6`
    );
    setLoading(false);
    if (r.ok && r.data) {
      setFaqs(r.data.faqs || []);
      setHuman(r.data.human_telugu || "");
    }
  }

  useEffect(() => {
    if (!open) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => load(q), q ? 350 : 0);
    return () => { if (timer.current) clearTimeout(timer.current); };
     
  }, [open, q]);


  // 🛡️ R10 — register wizard lo footer buttons tho clash vaddhu (hooks taruvate — rules-of-hooks safe)
  if (pathname?.startsWith("/register")) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2 sm:bottom-6">
      {open && (
        <div className="w-[20rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-2xl">
          <div className="bg-gradient-to-r from-rose-700 to-rose-600 px-4 py-3 text-white">
            <p className="font-bold">{te ? "💬 సహాయం (Help)" : "💬 Help (సహాయం)"}</p>
            <p className="text-xs opacity-90">{te ? "తెలుగులో అడగండి — వెంటనే సమాధానం" : "Ask in Telugu or English — instant answers"}</p>
          </div>
          <div className="p-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={te ? "Ex: ₹99 ఎందుకు? numbers ఎప్పుడు?" : "Ex: why ₹99? when numbers?"}
              aria-label={te ? "సహాయం search" : "Help search"}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-rose-500"
            />
            <div className="mt-2 max-h-72 space-y-2 overflow-y-auto pr-1">
              {loading && <p className="text-sm text-gray-500">{te ? "⏳ వెతుకుతున్నాం…" : "⏳ Searching…"}</p>}
              {!loading && faqs.map((f) => (
                <details key={f.id} className="rounded-xl bg-rose-50/60 p-2.5 text-sm">
                  <summary className="cursor-pointer font-semibold text-rose-900">{f.q}</summary>
                  <p className="mt-1 text-gray-700">{f.a}</p>
                </details>
              ))}
              {!loading && faqs.length === 0 && (
                <p className="text-sm text-gray-500">{te ? "సమాధానం దొరకలేదు — /help try చెయ్యండి 🙏" : "No answer found — try /help 🙏"}</p>
              )}
            </div>
            {human && <p className="mt-2 border-t pt-2 text-xs text-gray-500">{human}</p>}
          </div>
        </div>
      )}
      {SITE_CONFIG.supportWhatsapp ? (
        <a
          href={`https://wa.me/${SITE_CONFIG.supportWhatsapp}?text=${encodeURIComponent("నమస్తే మన వివాహ టీమ్, నాకు సహాయం కావాలి.")}`}
          target="_blank"
          rel="noreferrer"
          aria-label={te ? "WhatsApp సహాయం" : "WhatsApp support"}
          title={te ? "WhatsApp లో సహాయం" : "Get help on WhatsApp"}
          className="group flex h-12 items-center gap-2 rounded-full bg-[#128C7E] px-3 text-white shadow-xl transition hover:bg-[#0d7469] focus-brand"
        >
          <span className="text-xl" aria-hidden="true">◉</span>
          <span className="hidden text-xs font-bold sm:block">WhatsApp</span>
        </a>
      ) : null}
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? (te ? "సహాయం close" : "Close help") : te ? "సహాయం open" : "Open help"}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-700 text-2xl text-white shadow-xl transition hover:bg-rose-800"
      >
        {open ? "✕" : "💬"}
      </button>
    </div>
  );
}
