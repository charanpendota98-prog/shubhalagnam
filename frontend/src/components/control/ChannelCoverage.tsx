"use client";

import { useEffect, useMemo, useState } from "react";
import { useLang } from "@/lib/lang";
import { apiGet } from "@/lib/api";

type Coverage = {
  success?: boolean;
  total?: number;
  routing_eligible?: number;
  with_whatsapp?: number;
  customized?: number;
  by_tier?: Record<string, { routing_eligible?: number; with_whatsapp?: number; pending_keys?: string[] }>;
  critical_gaps?: string[];
  whatsapp_gaps?: string[];
  pending_sample?: string[];
  note?: string;
};

const CARD = "rounded-2xl border border-gold/25 bg-[#FFF7EC] px-4 py-3";
const TE_ROW = "flex items-center justify-between gap-3 border-b border-gold/10 pb-1.5 text-[12px]";

export default function ChannelCoverage() {
  const { lang } = useLang();
  const te = lang === "te";
  const [row, setRow] = useState<Coverage | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    apiGet<Coverage>("/api/control/channels/coverage")
      .then((res) => {
        if (!alive) return;
        if (res.ok && res.data && res.data.success) setRow(res.data);
        else setErr(te ? "కవరేజ్ లోడ్ కాలేదు" : "Coverage unavailable");
      })
      .catch(() => alive && setErr(te ? "కవరేజ్ లోడ్ కాలేదు" : "Coverage unavailable"));
    return () => {
      alive = false;
    };
  }, [te]);

  const tiles = useMemo(() => {
    const r = row;
    return [
      {
        label: te ? "మొత్తం ఛానెల్‌లు" : "Channels",
        value: r?.total ?? 0,
        tone: "text-[#7A0C2E]",
      },
      {
        label: te ? "రూటింగ్ గుర్తు" : "Routed",
        value: r?.routing_eligible ?? 0,
        tone: "text-[#1F7A3D]",
      },
      {
        label: te ? "WhatsApp ఉంది" : "With WhatsApp",
        value: r?.with_whatsapp ?? 0,
        tone: "text-[#7A0C2E]",
      },
      {
        label: te ? "ఖాళీగా ఉన్నవి" : "Blank",
        value: Math.max(0, (r?.total ?? 0) - (r?.routing_eligible ?? 0)),
        tone: "text-[#8A6A1F]",
      },
    ];
  }, [row, te]);

  const tiers = Object.entries(row?.by_tier || {});

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className={CARD}>
            <p className="text-[10px] uppercase tracking-wide text-[#8A6A1F] font-black">{t.label}</p>
            <p className={`text-2xl font-black ${t.tone}`}>{t.value}</p>
          </div>
        ))}
      </div>

      {tiers.length > 0 && (
        <div className="rounded-2xl border border-gold/25 bg-white px-4 py-3">
          <p className="text-[11px] font-black uppercase tracking-wide text-[#8A6A1F]">
            {te ? "విభాగాల వారీగా" : "Split by section"}
          </p>
          <div className="mt-2 space-y-1.5">
            {tiers.map(([name, r2]) => (
              <div key={name} className={TE_ROW}>
                <span className="font-bold text-[#4A3B2A] capitalize">{name}</span>
                <span className="text-[#6B5A46]">
                  {r2.routing_eligible ?? 0} {te ? "రూట్" : "routed"} · {r2.with_whatsapp ?? 0} WhatsApp
                  {r2.pending_keys && r2.pending_keys.length > 0
                    ? ` · ${r2.pending_keys.length} ${te ? "ఖాళీ" : "blank"}`
                    : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(row?.critical_gaps || []).length > 0 && (
        <div className="rounded-2xl border border-[#E0B23A]/60 bg-[#FFF8E6] px-4 py-3">
          <p className="text-[12px] font-black text-[#7A0C2E]">
            {te ? "ముఖ్యమైన ఖాళీలు" : "Important blanks"}
          </p>
          <p className="mt-1 text-[11px] text-[#6B5A46] break-words">
            {(row?.critical_gaps || []).join(", ")}
          </p>
        </div>
      )}

      {(row?.whatsapp_gaps || []).length > 0 && (
        <div className="rounded-2xl border border-[#E0B23A]/60 bg-[#FFF8E6] px-4 py-3">
          <p className="text-[12px] font-black text-[#7A0C2E]">
            {te ? "WhatsApp configuration gaps" : "WhatsApp configuration gaps"}
          </p>
          <p className="mt-1 text-[11px] text-[#6B5A46] break-words">
            {te
              ? "ఇచ్చిన invite లేని destinations ఖాళీగానే ఉంటాయి; guessed URL పెట్టలేదు: "
              : "No supplied invite was invented for these destinations: "}
            {(row?.whatsapp_gaps || []).join(", ")}
          </p>
        </div>
      )}

      {err && <p className="text-[12px] text-[#B3261E]">{err}</p>}
      <p className="text-[11px] leading-relaxed text-[#8A6A1F]">
        {te
          ? "ఇది ఆపరేటర్ సేవ్ చేసిన లింకుల లెక్క మాత్రమే. ఛానెల్ నిజంగా పని చేస్తుందా, బాట్ పోస్ట్ చేయగలదా అన్నది ఇక్కడ తనిఖీ చేయబడదు."
          : "Counts operator-saved links only. Nothing here verifies that a channel is live, public or that the bot can post to it."}
      </p>
    </div>
  );
}
