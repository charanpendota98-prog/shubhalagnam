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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          title={te ? "WhatsApp లో సహాయం (+919394483300)" : "Get help on WhatsApp (+919394483300)"}
          className="group flex h-12 items-center gap-2 rounded-full bg-[#25D366] hover:bg-[#20ba59] px-4 text-white shadow-xl transition-all duration-300 hover:scale-105 focus-brand border border-white/30"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.971.53 1.905.815 2.796.815 3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.586-5.767-5.768-5.767zm0 10.373c-.886 0-1.745-.251-2.485-.728l-.178-.115-1.579.414.421-1.539-.12-.191c-.516-.821-.789-1.776-.788-2.75 0-2.617 2.13-4.746 4.75-4.746 2.618 0 4.748 2.13 4.748 4.748 0 2.617-2.13 4.747-4.748 4.747zm7.969-4.607c-.04-4.417-3.635-8.01-8.052-8.01-4.437 0-8.046 3.609-8.046 8.046 0 1.417.371 2.799 1.076 4.02l-1.144 4.181 4.277-1.121c1.176.642 2.506.98 3.869.98 4.437 0 8.046-3.609 8.046-8.046 0-.017 0-.033-.001-.05z"/>
          </svg>
          <span className="text-xs font-bold sm:inline">{te ? "WhatsApp సహాయం" : "WhatsApp Support"}</span>
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
