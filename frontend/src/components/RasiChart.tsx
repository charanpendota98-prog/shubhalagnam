"use client";
/**
 * 🗺️ WAVE 36 — RASI KATAM (South-Indian fixed chart, SVG).
 * Backend /api/astro/chart data nunchi: 12 fixed houses + Moon house highlight.
 * Lagna/planets manaki teliyavu kabatti honest Moon-only chart.
 */
import { apiDisplayMessage } from "@/lib/api";
import { RASIS } from "@/lib/telugu-data";
import { useLang } from "@/lib/lang";

type House = { house: number; rasi_en: string; moon?: boolean };
type Props = {
  houses?: House[];
  moonHouse?: number | null;
  star?: string;
  rasi?: string;
  note?: string;
  title?: string;
};

/* house -> [row, col] (South-Indian fixed: Mesha top, counter-clockwise) */
const POS: Record<number, [number, number]> = {
  1: [0, 1], 2: [0, 0], 3: [1, 0], 4: [2, 0], 5: [3, 0], 6: [3, 1],
  7: [3, 2], 8: [3, 3], 9: [2, 3], 10: [1, 3], 11: [0, 3], 12: [0, 2],
};
const S = 300;
const C = S / 4;

export default function RasiChart({ houses, moonHouse, star, rasi, note, title }: Props) {
  const { lang } = useLang();
  const te = lang === "te";
  if (!houses || !houses.length) {
    return (
      <div className="rounded-2xl border border-gold/30 bg-cream p-4 text-center text-[12px] text-gray-600">
        {te ? "రాశి చార్ట్ కోసం data సరిపోలేదు — profile లో రాశి add చెయ్యండి." : "Not enough data for rasi chart — add rasi in profile."}
      </div>
    );
  }
  const teName = (h: number) => RASIS[h - 1]?.te || "";
  const enName = (h: House) => h.rasi_en || RASIS[h.house - 1]?.en || `House ${h.house}`;
  const safeNote = te ? note : apiDisplayMessage({ message_en: note }, false, "");
  const displayStar = te ? star : apiDisplayMessage({ message_en: star }, false, "");
  const displayRasi = te ? rasi : apiDisplayMessage({ message_en: rasi }, false, "");
  return (
    <div className="rounded-2xl border border-gold/30 bg-white p-3">
      {title ? <p className="mb-2 text-center text-[13px] font-bold text-maroon">{title}</p> : null}
      <svg viewBox={`0 0 ${S} ${S}`} className="mx-auto w-full max-w-[300px]" role="img" aria-label={te ? "రాశి చార్ట్" : "Rasi chart"}>
        {houses.map((h) => {
          const [r, c] = POS[h.house] || [0, 0];
          const x = c * C;
          const y = r * C;
          const isMoon = h.moon || h.house === moonHouse;
          return (
            <g key={h.house}>
              <rect x={x} y={y} width={C} height={C}
                fill={isMoon ? "#FFF7E0" : "#FFFFFF"}
                stroke={isMoon ? "#B8860B" : "#7A0C2E"} strokeWidth={isMoon ? 2.5 : 1} />
              <text x={x + 6} y={y + 14} fontSize="9" fill="#999">{h.house}</text>
              <text x={x + C / 2} y={y + C / 2 - 2} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#7A0C2E">
                {te ? teName(h.house) : enName(h)}
              </text>
              {isMoon ? (
                <text x={x + C / 2} y={y + C / 2 + 16} textAnchor="middle" fontSize="13">{te ? "🌙 చం" : "🌙 Moon"}</text>
              ) : null}
            </g>
          );
        })}
        <rect x={C} y={C} width={C * 2} height={C * 2} fill="#7A0C2E" rx="6" />
        <text x={C * 2} y={C + 44} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#EAD08A">
          {te ? "చంద్ర చార్ట్" : "Moon chart"}
        </text>
        <text x={C * 2} y={C + 66} textAnchor="middle" fontSize="11" fill="#FFFFFF">{displayStar || ""}</text>
        <text x={C * 2} y={C + 84} textAnchor="middle" fontSize="11" fill="#FFFFFF">{displayRasi || ""}</text>
        <text x={C * 2} y={C + 106} textAnchor="middle" fontSize="9" fill="#EAD08A">
          {moonHouse ? (te ? `${moonHouse}వ ఇంట్లో చంద్రుడు` : `Moon in house ${moonHouse}`) : ""}
        </text>
      </svg>
      {safeNote ? <p className="mt-2 text-center text-[11px] text-gray-600">{safeNote}</p> : null}
    </div>
  );
}
