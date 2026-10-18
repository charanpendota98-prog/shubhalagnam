"use client";

/**
 * Evidence-safe compatibility component.
 *
 * A member-entered star/rasi pair is not enough to draw a horoscope chart.
 * The backend deliberately returns no houses until a separate, appropriately
 * reviewed real chart is available, so this component must fail closed even if
 * a legacy caller passes stale house data.
 */
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

export default function RasiChart(_props: Props) {
  const { lang } = useLang();
  const te = lang === "te";
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center text-[12px] leading-5 text-amber-950">
      <p className="font-extrabold">{te ? "రాశి chart అందుబాటులో లేదు" : "Rasi chart unavailable"}</p>
      <p className="mt-1">
        {te
          ? "సభ్యుడు నమోదు చేసిన star/rasi వివరాలతో chart గీయము. అసలైన పత్రం మరియు తగిన professional review లేకుండా లగ్నం, houses లేదా గ్రహస్థానాలను ఊహించము."
          : "A chart is not drawn from member-entered star/rasi fields. Without an appropriate real document and professional review, lagna, houses, and planetary placements are never guessed."}
      </p>
    </div>
  );
}
