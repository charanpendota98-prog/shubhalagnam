"use client";

/**
 * Read-only referral summary for the member dashboard.
 * Display only: it reads the owner's existing wallet statement, shows what is
 * already recorded, and links to /referral. It has no share button (sharing
 * stays on the referral page), promises no amount or timing, and renders
 * nothing when the read fails or the payload is not the expected shape.
 */
import { useEffect, useState } from "react";
import Link from "@/components/LocaleLink";
import { apiGet } from "@/lib/api";
import { validStatement } from "@/lib/referral-payload";
import { useLang } from "@/lib/lang";

type Row = Record<string, unknown>;
type Summary = { wallet: number; pending: number; paid: number; minPayout: number };

// Same rounding as the /referral page (ReferralPro): 2 decimals, none for whole rupees.
const rupees = (n: number) => {
  const v = Math.round(Number(n || 0) * 100) / 100;
  return Number.isInteger(v) ? `₹${v}` : `₹${v.toFixed(2)}`;
};

export default function ReferralHighlightStrip({ myId }: { myId: string }) {
  const { lang } = useLang();
  const te = lang === "te";
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    let live = true;
    apiGet<Row>(`/api/referral/${encodeURIComponent(myId)}/wallet?limit=1`).then(({ ok, data }) => {
      if (!live || !ok || !validStatement(data)) return;
      const d = data as Row;
      const totals = d.totals as Row;
      setSummary({
        wallet: Number(d.wallet),
        pending: Number(totals.pending_payout),
        paid: Number(totals.paid_out),
        minPayout: Number(d.min_payout),
      });
    });
    return () => { live = false; };
  }, [myId]);

  if (!summary) return null;
  const empty = summary.wallet <= 0 && summary.pending <= 0 && summary.paid <= 0;

  return (
    <section data-testid="referral-highlight" aria-label={te ? "రెఫరల్ సారాంశం" : "Referral summary"}
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold/40 bg-white p-3">
      <div className="min-w-0 text-[12px] text-gray-700">
        <div className="font-bold text-maroon">{te ? "రెఫరల్ బ్యాలెన్స్" : "Referral balance"}</div>
        {empty ? (
          <div className={te ? "telugu" : undefined}>
            {te
              ? `ఇంకా రెఫరల్ రివార్డులు లేవు. రిక్వెస్ట్‌కు కనీసం ${rupees(summary.minPayout)} కావాలి.`
              : `No referral rewards yet. ${rupees(summary.minPayout)} is the minimum to request a payout.`}
          </div>
        ) : (
          <div className={te ? "telugu" : undefined}>
            {te
              ? `అందుబాటులో ${rupees(summary.wallet)} • సమీక్షలో ${rupees(summary.pending)} • చెల్లించినవి ${rupees(summary.paid)} • రిక్వెస్ట్‌కు కనీసం ${rupees(summary.minPayout)}`
              : `Available ${rupees(summary.wallet)} • In review ${rupees(summary.pending)} • Paid out ${rupees(summary.paid)} • ${rupees(summary.minPayout)} minimum to request`}
          </div>
        )}
      </div>
      <Link href="/referral" className="min-h-11 inline-flex items-center rounded-xl px-3 text-[12px] font-bold text-maroon underline">
        {te ? "రెఫరల్ చూడండి" : "View referral"}
      </Link>
    </section>
  );
}
