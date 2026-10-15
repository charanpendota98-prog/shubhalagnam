"use client";

/**
 * Referral information notice (kept under its legacy component path).
 * No simulated profile activity, testimonials, payout feed, or timestamps.
 */
import Link from "next/link";
import { useLang } from "@/lib/lang";

export default function LiveMatrimonyTicker() {
  const { lang } = useLang();
  const te = lang === "te";

  return (
    <aside className="rounded-2xl border border-amber-200 bg-white/95 p-3 shadow-sm" aria-label={te ? "రెఫరల్ సమాచారం" : "Referral information"}>
      <div className="flex items-start gap-2.5">
        <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50">🤝</span>
        <div className="min-w-0">
          <p className="text-xs font-bold text-[#7A0C2E]">{te ? "రెఫరల్ reward నియమాలు" : "Referral reward terms"}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">
            {te
              ? "అర్హమైన మొదటి consumer-plan payment పై ఒక్కసారి ₹50 మాత్రమే ఉండవచ్చు. మినహాయింపులు, అర్హత మరియు manual payout review వర్తిస్తాయి."
              : "A referrer may qualify for ₹50 once on the first eligible consumer-plan payment. Exclusions, eligibility and manual payout review apply."}
          </p>
          <Link href="/referral" className="mt-1 inline-block text-[11px] font-semibold text-[#7A0C2E] underline underline-offset-2">
            {te ? "పూర్తి terms చూడండి" : "View full terms"}
          </Link>
        </div>
      </div>
    </aside>
  );
}
