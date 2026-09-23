"use client";

/** 💸 REFUND & CANCELLATION POLICY — neat Telugu / clean English via toggle. */
import Link from "next/link";
import { SITE_CONFIG } from "@/lib/site-config";
import { useLang } from "@/lib/lang";

const LAST_UPDATED = "14 Sep 2026";

export default function RefundPage() {
  const { lang } = useLang();
  const te = lang === "te";
  return (
    <main className="max-w-3xl mx-auto px-4 py-8 pb-36">
      <h1 className="text-2xl md:text-3xl font-extrabold text-[#7A0C2E] telugu">
        {te ? "💸 Refund & Cancellation Policy (వాపసు విధానం)" : "💸 Refund & Cancellation Policy"}
      </h1>
      <div className="text-xs text-gray-500 mt-1">Last updated: {LAST_UPDATED} • {SITE_CONFIG.legalName} ({SITE_CONFIG.domain})</div>

      <div className="mt-5 rounded-2xl bg-[#FFF8E1] border border-[#B8860B]/30 p-4 text-sm telugu text-[#7A0C2E]">
        {te ? (
          <><b>Short గా:</b> మీరు pay చేసిన amount కి <b>profile credits</b> వస్తాయి. ఈ credits
            వాడలేదు అంటే — 7 రోజుల్లో full refund అడగొచ్చు. వాడిన తర్వాత మిగిలిన credits కి refund ఇవ్వము
            (కానీ decline అయితే ఆ request credit మళ్లీ వస్తుంది). Auto-renewal లేదు, hidden charges లేవు.</>
        ) : (
          <><b>In short:</b> your payment buys <b>profile credits</b>. If you haven&apos;t used them —
            full refund within 7 days. No refund on leftover credits after use
            (but a declined request&apos;s credit comes back). No auto-renewal, no hidden charges.</>
        )}
      </div>

      <Section title={te ? "1. ఏమి refund అవుతుంది ✅" : "1. What gets refunded ✅"}>
        <ul>
          {te ? (
            <>
              <li><b>Zero usage (7 days):</b> Register అయి ₹ pay చేసి, <b>ఒక్క request కూడా</b> పంపకపోతే —
                payment date నుంచి <b>7 రోజుల</b> లోపు అడిగితే <b>100% refund</b> (same payment method కి).</li>
              <li><b>Decline / no response:</b> మీ request ని target వాళ్లు decline చేస్తే లేదా{" "}
                <b>7 రోజుల</b> లో respond అవ్వకపోతే — ఆ <b>1 credit మళ్లీ మీ account కి</b> refund అవుతుంది
                (ఇది automatic గా జరుగుతుంది).</li>
              <li><b>Duplicate / wrong payment:</b> ఒకటే order రెండు సార్లు pay అయితే, verify చేసి 3–5 working days లో refund.</li>
              <li><b>Technical failure:</b> మీ payment success అయింది కానీ credits add అవ్వకపోతే — screenshot పంపండి, 24h లో fix లేదా refund.</li>
            </>
          ) : (
            <>
              <li><b>Zero usage (7 days):</b> registered and paid ₹ but sent <b>not even one request</b> —
                ask within <b>7 days</b> of payment date for <b>100% refund</b> (to the same payment method).</li>
              <li><b>Decline / no response:</b> if the target declines your request or doesn&apos;t
                respond within <b>7 days</b> — that <b>1 credit is refunded to your account</b>
                (this happens automatically).</li>
              <li><b>Duplicate / wrong payment:</b> if one order gets paid twice, we verify and refund in 3–5 working days.</li>
              <li><b>Technical failure:</b> payment succeeded but credits weren&apos;t added — send a screenshot, fixed or refunded in 24h.</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "2. ఏమి refund అవ్వదు ❌" : "2. What is NOT refunded ❌"}>
        <ul>
          {te ? (
            <>
              <li>Credits <b>వాడిన తర్వాత</b> (request పంపిన తర్వాత) — service deliver అయ్యింది కాబట్టి.</li>
              <li>Numbers share అయిన తర్వాత లేదా match finalize అయ్యాక.</li>
              <li>Fake / wrong details ఇచ్చి account block అయిన cases.</li>
              <li>Terms violate చేసి ban అయిన accounts (fraud, advance money అడగడం, harassment).</li>
              <li><b>Bureau / B2B plans</b> — monthly service కాబట్టి cycle start అయిన తర్వాత refund లేదు (cycle start అవ్వకపోతే 7 రోజుల లోపు adjust/refund).</li>
              <li>Add-on services (boost / who-viewed / porutham report) — activate అయ్యాక refund లేదు.</li>
            </>
          ) : (
            <>
              <li>Credits <b>after use</b> (after sending a request) — the service was delivered.</li>
              <li>After numbers are shared or a match is finalized.</li>
              <li>Cases where the account was blocked for fake / wrong details.</li>
              <li>Accounts banned for violating terms (fraud, asking advance money, harassment).</li>
              <li><b>Bureau / B2B plans</b> — a monthly service, so no refund after the cycle starts (adjust/refund within 7 days if the cycle hasn&apos;t started).</li>
              <li>Add-on services (boost / who-viewed / porutham report) — no refund after activation.</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "3. Refund ఎలా అడగాలి (process)" : "3. How to ask for a refund (process)"}>
        <ol>
          {te ? (
            <>
              <li>WhatsApp/Phone: <b>{SITE_CONFIG.supportPhoneDisplay}</b> లేదా email: <b>{SITE_CONFIG.supportEmail}</b></li>
              <li>పంపాల్సినవి: Profile ID • payment date • amount • Razorpay payment ID • reason (1 line)</li>
              <li>Verify చేసి <b>2 working days</b> లో approve/decline తెలియజేస్తాం.</li>
              <li>Approve అయితే <b>5–7 working days</b> లో మీ bank/UPI కి credited అవుతుంది (bank timing బట్టి).</li>
              <li>Refund confirmation email మీకు పంపిస్తాం.</li>
            </>
          ) : (
            <>
              <li>WhatsApp/Phone: <b>{SITE_CONFIG.supportPhoneDisplay}</b> or email: <b>{SITE_CONFIG.supportEmail}</b></li>
              <li>Send: Profile ID • payment date • amount • Razorpay payment ID • reason (1 line)</li>
              <li>We verify and inform approve/decline within <b>2 working days</b>.</li>
              <li>On approval, credited to your bank/UPI in <b>5–7 working days</b> (depends on bank timing).</li>
              <li>Refund confirmation email is sent to you.</li>
            </>
          )}
        </ol>
      </Section>

      <Section title={te ? "4. Cancellation" : "4. Cancellation"}>
        <ul>
          {te ? (
            <>
              <li>Plan cancel చెయ్యాలంటే — support కి చెప్పండి. మిగిలిన credits <b>validity వరకు</b> వాడుకోవచ్చు.</li>
              <li><b>Auto-renewal లేదు</b> — మీ plan automatic గా renew అవ్వదు, reminder messages మాత్రమే వస్తాయి.</li>
              <li>Account delete చెయ్యాలంటే — /privacy లో చెప్పిన privacy section లో process ఉంది (data delete + credits forfeit).</li>
            </>
          ) : (
            <>
              <li>To cancel a plan — tell support. Remaining credits can be used till <b>validity</b>.</li>
              <li><b>No auto-renewal</b> — your plan never renews automatically; only reminder messages come.</li>
              <li>To delete your account — process is in the privacy section of /privacy (data delete + credits forfeit).</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "5. GST, invoices & receipts" : "5. GST, invoices & receipts"}>
        <ul>
          {te ? (
            <>
              <li>ప్రతి payment కి receipt email/WhatsApp లో వస్తుంది.</li>
              <li><b>GST invoice</b> కావాలంటే payment తర్వాత 24 గంటల్లో అడగండి (GSTIN ఉంటే పంపండి) — మన team పంపిస్తుంది.</li>
              <li>Prices అన్నీ INR లో, taxes తో సహా (చూపించిన price final).</li>
            </>
          ) : (
            <>
              <li>Receipt for every payment comes on email/WhatsApp.</li>
              <li>Need a <b>GST invoice</b>? Ask within 24 hours of payment (send GSTIN if you have one) — our team sends it.</li>
              <li>All prices in INR, inclusive of taxes (shown price is final).</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "6. Chargebacks / disputes" : "6. Chargebacks / disputes"}>
        <ul>
          {te ? (
            <>
              <li>ముందు మన support కి చెప్పండి — 90% cases 48h లో resolve అవుతాయి.</li>
              <li>Bank chargeback initiate చేస్తే, మన records (payment ID + service usage) పంపిస్తాం.</li>
              <li>Fraudulent chargebacks అయితే account temporary suspend అవ్వచ్చు.</li>
            </>
          ) : (
            <>
              <li>Tell our support first — 90% of cases resolve in 48h.</li>
              <li>If you initiate a bank chargeback, we submit our records (payment ID + service usage).</li>
              <li>Fraudulent chargebacks may lead to temporary account suspension.</li>
            </>
          )}
        </ul>
      </Section>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 text-xs text-gray-700">
        <div className="font-bold text-[#7A0C2E]">📞 {te ? "Contact (refunds & payments)" : "Contact (refunds & payments)"}</div>
        <div className="mt-2 space-y-1">
          <div>WhatsApp / Phone: <b>{SITE_CONFIG.supportPhoneDisplay}</b></div>
          <div>Email: <b>{SITE_CONFIG.supportEmail}</b></div>
          <div>Website: <b>https://{SITE_CONFIG.domain}</b> • Telegram: {SITE_CONFIG.officialChannel}</div>
          <div>Business: {SITE_CONFIG.legalName}, Hyderabad, Telangana, India</div>
          <div>{te ? "Working hours: Mon–Sat, 9 AM – 8 PM IST (response 24h లోపు)" : "Working hours: Mon–Sat, 9 AM – 8 PM IST (response within 24h)"}</div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 text-xs">
        <Link href="/pricing" className="underline text-[#7A0C2E] font-bold">💰 Pricing</Link>
        <Link href="/terms" className="underline text-[#7A0C2E] font-bold">📄 Terms</Link>
        <Link href="/privacy" className="underline text-[#7A0C2E] font-bold">🔒 Privacy</Link>
        <Link href="/safety" className="underline text-[#7A0C2E] font-bold">🛡️ Safety</Link>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="font-bold text-[#7A0C2E] telugu">{title}</h2>
      <div className="mt-2 text-sm text-gray-700 telugu leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5">
        {children}
      </div>
    </section>
  );
}
