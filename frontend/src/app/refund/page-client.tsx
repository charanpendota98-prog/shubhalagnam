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
    <div className="max-w-3xl mx-auto px-4 py-8 pb-36">
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
              <li><b>Decline / no response:</b> target decline చేస్తే లేదా <b>7 రోజుల</b> లో స్పందన లేక request expire అయితే,
                ఖర్చయిన <b>1 request credit</b> account‌కు ఒకసారి తిరిగి వస్తుంది. ఇది payment amount cash refund కాదు.</li>
              <li><b>Duplicate / wrong payment:</b> ఒకే order‌కు రెండుసార్లు చెల్లిస్తే, order/payment IDs‌తో support‌ను సంప్రదించండి; review తర్వాత పరిష్కారం తెలియజేస్తాం.</li>
              <li><b>Technical failure:</b> payment success అయినా credits రాకపోతే, payment/order ID‌తో support‌ను సంప్రదించండి; resolution సమయం మారవచ్చు.</li>
            </>
          ) : (
            <>
              <li><b>Zero usage (7 days):</b> registered and paid ₹ but sent <b>not even one request</b> —
                ask within <b>7 days</b> of payment date for <b>100% refund</b> (to the same payment method).</li>
              <li><b>Decline / no response:</b> if the target declines or the request expires after <b>7 days</b> without a response,
                the spent <b>request credit is returned to your account once</b>. This is not a cash refund of the payment.</li>
              <li><b>Duplicate / wrong payment:</b> if you paid twice for one order, contact support with both payment/order IDs; we will review and share the outcome.</li>
              <li><b>Technical failure:</b> if payment succeeded but credits were not added, share your payment/order ID with support so it can be reviewed; resolution time may vary.</li>
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
              <li>Add-on services (boost / who-viewed / వేద గుణమేళనం report) — activate అయ్యాక refund లేదు.</li>
            </>
          ) : (
            <>
              <li>Credits <b>after use</b> (after sending a request) — the service was delivered.</li>
              <li>After numbers are shared or a match is finalized.</li>
              <li>Cases where the account was blocked for fake / wrong details.</li>
              <li>Accounts banned for violating terms (fraud, asking advance money, harassment).</li>
              <li><b>Bureau / B2B plans</b> — a monthly service, so no refund after the cycle starts (adjust/refund within 7 days if the cycle hasn&apos;t started).</li>
              <li>Add-on services (boost / who-viewed / Vedic Gunamelanam report) — no refund after activation.</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "3. Refund ఎలా అడగాలి (process)" : "3. How to ask for a refund (process)"}>
        <ol>
          {te ? (
            <>
              <li>{SITE_CONFIG.supportLink ? <>WhatsApp: <a href={SITE_CONFIG.supportLink} target="_blank" rel="noopener noreferrer" className="underline">configured support contact</a> • </> : null}{SITE_CONFIG.supportPhoneDisplay ? <>Phone: <b>{SITE_CONFIG.supportPhoneDisplay}</b> • </> : null}Email: <b>{SITE_CONFIG.supportEmail}</b></li>
              <li>పంపాల్సినవి: Profile ID • payment date • amount • Razorpay payment ID • reason (1 line)</li>
              <li>మీ అభ్యర్థనను సమీక్షించి, అందుబాటులో ఉన్న contact channel ద్వారా నిర్ణయాన్ని తెలియజేస్తాం; response సమయం మారవచ్చు.</li>
              <li>Approve అయితే, refund processing మరియు bank/UPI credit సమయం payment provider‌పై ఆధారపడుతుంది.</li>
              <li>మీ payment/order ID‌ను భద్రపరచుకోండి; receipt లేదా refund status అందుబాటులో లేకపోతే support‌ను సంప్రదించండి.</li>
            </>
          ) : (
            <>
              <li>{SITE_CONFIG.supportLink ? <>WhatsApp: <a href={SITE_CONFIG.supportLink} target="_blank" rel="noopener noreferrer" className="underline">configured support contact</a> • </> : null}{SITE_CONFIG.supportPhoneDisplay ? <>Phone: <b>{SITE_CONFIG.supportPhoneDisplay}</b> • </> : null}Email: <b>{SITE_CONFIG.supportEmail}</b></li>
              <li>Send: Profile ID • payment date • amount • Razorpay payment ID • reason (1 line)</li>
              <li>We review the request and share an outcome through an available contact channel; response time may vary.</li>
              <li>If approved, refund processing and bank/UPI credit timing depend on the payment provider.</li>
              <li>Keep your payment/order ID. If a receipt or refund status is unavailable, contact support.</li>
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
              <li>మీ order/payment ID‌ను భద్రపరచుకోండి. Receipt అందుబాటు payment method‌పై ఆధారపడుతుంది; receipt కనిపించకపోతే configured support contact‌ను సంప్రదించండి.</li>
              <li><b>GST invoice</b> అవసరమైతే, GSTIN మరియు payment వివరాలతో support‌ను సంప్రదించండి; జారీ అర్హత/సమయం నిర్ధారించిన తర్వాత తెలియజేస్తాం.</li>
              <li>ధరలు INR‌లో చూపిస్తాం. చెల్లించే ముందు checkout లో కనిపించే final amount‌ను పరిశీలించండి.</li>
            </>
          ) : (
            <>
              <li>Keep your order/payment ID. Receipt availability depends on the payment method; contact the configured support channel if it is missing.</li>
              <li>For a <b>GST invoice</b> request, provide your GSTIN and payment details to support; eligibility and timing will be confirmed.</li>
              <li>Prices are shown in INR. Review the final amount shown at checkout before paying.</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "6. Chargebacks / disputes" : "6. Chargebacks / disputes"}>
        <ul>
          {te ? (
            <>
              <li>Dispute ఉంటే, order/payment ID మరియు సమస్య వివరాలతో support‌ను సంప్రదించండి; review సమయం మారవచ్చు.</li>
              <li>Bank chargeback initiate చేస్తే, మన records (payment ID + service usage) పంపిస్తాం.</li>
              <li>Fraudulent chargebacks అయితే account temporary suspend అవ్వచ్చు.</li>
            </>
          ) : (
            <>
              <li>For a dispute, contact support with your order/payment ID and a short description; review time may vary.</li>
              <li>If you initiate a bank chargeback, we submit our records (payment ID + service usage).</li>
              <li>Fraudulent chargebacks may lead to temporary account suspension.</li>
            </>
          )}
        </ul>
      </Section>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 text-xs text-gray-700">
        <div className="font-bold text-[#7A0C2E]">📞 {te ? "Contact (refunds & payments)" : "Contact (refunds & payments)"}</div>
        <div className="mt-2 space-y-1">
          <div>Authorized Signatory: <b>{SITE_CONFIG.owner.name}</b> (Owner ID: <span className="font-mono text-[#7A0C2E] font-bold">{SITE_CONFIG.owner.id}</span>)</div>
          {SITE_CONFIG.supportLink ? <div>WhatsApp: <a href={SITE_CONFIG.supportLink} target="_blank" rel="noopener noreferrer" className="font-bold text-emerald-700 hover:underline">Open configured support contact</a></div> : null}
          {SITE_CONFIG.supportPhoneDisplay ? <div>Phone: <a href={`tel:${SITE_CONFIG.supportPhoneDisplay}`} className="font-bold text-emerald-700 hover:underline">{SITE_CONFIG.supportPhoneDisplay}</a></div> : null}
          <div>Email: <a href={`mailto:${SITE_CONFIG.owner.email}`} className="font-bold text-emerald-700 hover:underline">{SITE_CONFIG.owner.email}</a></div>
          <div>Website: <b>https://{SITE_CONFIG.domain}</b> • Telegram: {SITE_CONFIG.officialChannel}</div>
          <div>Business: {SITE_CONFIG.legalName}, Hyderabad, Telangana, India</div>
          <div>{te ? "సహాయం కోసం అందుబాటులో ఉన్న configured contact details ఉపయోగించండి; response సమయం మారవచ్చు." : "Use the configured contact details above for assistance; response time may vary."}</div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 text-xs">
        <Link href="/pricing" className="underline text-[#7A0C2E] font-bold">💰 Pricing</Link>
        <Link href="/terms" className="underline text-[#7A0C2E] font-bold">📄 Terms</Link>
        <Link href="/privacy" className="underline text-[#7A0C2E] font-bold">🔒 Privacy</Link>
        <Link href="/safety" className="underline text-[#7A0C2E] font-bold">🛡️ Safety</Link>
      </div>
    </div>
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
