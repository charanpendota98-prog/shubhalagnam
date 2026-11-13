"use client";

/** 🔒 PRIVACY POLICY — neat Telugu / clean English via toggle. DPDP Act 2023 (India). */
import Link from "next/link";
import { SITE_CONFIG } from "@/lib/site-config";
import { useLang } from "@/lib/lang";

const LAST_UPDATED = "11 Nov 2026";

export default function PrivacyPage() {
  const { lang } = useLang();
  const te = lang === "te";
  return (
    <main className="max-w-3xl mx-auto px-4 py-8 pb-36">
      <h1 className="text-2xl md:text-3xl font-extrabold text-[#7A0C2E] telugu">
        {te ? "🔒 Privacy Policy (గోప్యతా విధానం)" : "🔒 Privacy Policy"}
      </h1>
      <div className="text-xs text-gray-500 mt-1">Last updated: {LAST_UPDATED} • {SITE_CONFIG.legalName} ({SITE_CONFIG.domain})</div>

      <div className="mt-5 rounded-2xl bg-[#FFF8E1] border border-[#B8860B]/30 p-4 text-sm telugu text-[#7A0C2E]">
        {te ? (
          <><b>Short గా:</b> మీ data ని <b>అమ్మము, rent కి ఇవ్వము</b>. Photos private mode తో చూపిస్తాం.
            Numbers <b>రెండు వైపులా ఒప్పుక తర్వాతే</b> share అవుతాయి. ఎప్పుడైనా delete అడగొచ్చు —
            అది మీ profile ని public search నుంచి hide చేస్తుంది; పూర్తి erasure కోసం క్రింద privacy/grievance contact కి erasure request పంపండి.</>
        ) : (
          <><b>In short:</b> we <b>never sell or rent</b> your data. Photos show per your private mode.
            Numbers share only <b>after mutual accept</b>. You can ask to delete anytime —
            this hides your profile from public search; for full erasure, send an erasure request to the privacy or grievance contact below.</>
        )}
      </div>

      <Section title={te ? "1. ఏమి data collect చేస్తాం" : "1. What data we collect"}>
        <ul>
          {te ? (
            <>
              <li><b>Profile:</b> పేరు, gender, DOB/age, height, marital status, caste, religion, district/state, education, job, salary range, gothram, nakshatram/rasi (మీ ఇష్టంతో), about, photo(s).</li>
              <li><b>Contact:</b> mobile number, optional WhatsApp number, guardian contact (optional). Login is by phone number plus the password you set; phone OTP is not used.</li>
              <li><b>Activity:</b> profile views, requests, saves, channel posts, login times, device/browser (basic), IP (security కోసం).</li>
              <li><b>Payments:</b> payment ID, amount, plan — <b>card/UPI details మన దగ్గర store అవ్వవు</b> (Razorpay handle చేస్తుంది).</li>
              <li><b>Support:</b> మీరు పంపిన messages/screenshots (complaints resolve చెయ్యడానికి).</li>
            </>
          ) : (
            <>
              <li><b>Profile:</b> name, gender, DOB/age, height, marital status, caste, religion, district/state, education, job, salary range, gothram, nakshatram/rasi (with your consent), about, photo(s).</li>
              <li><b>Contact:</b> mobile number, optional WhatsApp number, guardian contact (optional). Login is by phone number plus your password; phone OTP is not used.</li>
              <li><b>Activity:</b> profile views, requests, saves, channel posts, login times, device/browser (basic), IP (for security).</li>
              <li><b>Payments:</b> payment ID, amount, plan — <b>card/UPI details are never stored by us</b> (handled by Razorpay).</li>
              <li><b>Support:</b> messages/screenshots you send (to resolve complaints).</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "2. ఎందుకు వాడుతాం (purpose)" : "2. Why we use it (purpose)"}>
        <ul>
          {te ? (
            <>
              <li>మీ profile ని channels/WhatsApp లో post చెయ్యడం + matching profiles చూపించడం.</li>
              <li>Requests deliver చెయ్యడం (మీ profile target కి, వాళ్ల profile మీకు).</li>
              <li>Fraud detection, moderation, block/report handling, safety alerts.</li>
              <li>Payments, receipts, GST invoices, referral payouts.</li>
              <li>Service updates (plan expiry reminder, కొత్త matches) — marketing messages కి <b>opt-out</b> option ఉంది.</li>
            </>
          ) : (
            <>
              <li>Posting your profile in channels/WhatsApp + showing matching profiles.</li>
              <li>Delivering requests (your profile to the target, their profile to you).</li>
              <li>Fraud detection, moderation, block/report handling, safety alerts.</li>
              <li>Payments, receipts, GST invoices, referral payouts.</li>
              <li>Service updates (plan expiry reminders, new matches) — marketing messages have an <b>opt-out</b> option.</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "3. ఎవరితో share చేస్తాం" : "3. Who we share with"}>
        <ul>
          {te ? (
            <>
              <li><b>Other members:</b> మీరు request accept చేసిన తర్వాతే — number/WhatsApp share.</li>
              <li><b>Channels (public):</b> profile card లో పేరు, age, caste, job, district కనిపిస్తుంది — <b>phone number ఎప్పుడూ public గా పెట్టము</b>. Photo మీ privacy setting బట్టి (private mode అయితే channels లో కూడా చూపించము లేదా blur చేసి పెడతాం).</li>
              <li><b>Payment gateway:</b> Razorpay (amount + order details మాత్రమే).</li>
              <li><b>WhatsApp:</b> మన official number నుంచి మీ profile/card share చెయ్యడానికి — message delivery కి అంతే.</li>
              <li><b>Legal:</b> court/police order ఉంటేనే — required minimum data.</li>
              <li>❌ మనం మీ data ని <b>third-party advertisers కి అమ్మము లేదా rent కి ఇవ్వము</b>.</li>
            </>
          ) : (
            <>
              <li><b>Other members:</b> only after you accept a request — number/WhatsApp share.</li>
              <li><b>Channels (public):</b> profile card shows name, age, caste, job, district — <b>phone numbers are never posted publicly</b>. Photos follow your privacy setting (in private mode we don&apos;t show them in channels either, or blur them).</li>
              <li><b>Payment gateway:</b> Razorpay (amount + order details only).</li>
              <li><b>WhatsApp:</b> from our official number to share your profile/card — message delivery only.</li>
              <li><b>Legal:</b> only on court/police order — minimum required data.</li>
              <li>❌ We <b>never sell or rent</b> your data to <b>third-party advertisers</b>.</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "4. Photo & number privacy (matrimony special)" : "4. Photo & number privacy (matrimony special)"}>
        <ul>
          {te ? (
            <>
              <li><b>Photo private mode:</b> channel/WhatsApp posts లో photo చూపించం (మీ request బట్టి) — profile లోనే కనిపిస్తుంది.</li>
              <li><b>Watermark:</b> photos మీద మన watermark ఉంటుంది — misuse ఆపుతుంది.</li>
              <li><b>Numbers:</b> రెండు వైపులా ఒప్పుక తర్వాతే — మన team WhatsApp లో confirm చేసి ఇస్తుంది. Declined profiles numbers ఎప్పుడూ ఇవ్వము.</li>
              <li>Screenshot/share చెయ్యడం బయట వాళ్లకి — <b>term violation</b> (report చేసిన వాళ్ల account ban అవుతుంది).</li>
            </>
          ) : (
            <>
              <li><b>Photo private mode:</b> photos don&apos;t show in channel/WhatsApp posts (per your request) — visible in profile only.</li>
              <li><b>Watermark:</b> our watermark stays on photos — stops misuse.</li>
              <li><b>Numbers:</b> only after mutual accept — our team confirms on WhatsApp and shares. We never give numbers of declined profiles.</li>
              <li>Screenshotting/sharing outside — a <b>term violation</b> (reported accounts get banned).</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "5. Cookies & analytics" : "5. Cookies & analytics"}>
        <ul>
          {te ? (
            <>
              <li>Login session, language preference, saved filters కి <b>cookies</b> వాడుతాం.</li>
              <li><b>Tracking? వద్దు</b> — మీ data ని ad-tech companies కి ఇవ్వము.</li>
              <li>Basic analytics కోసం request path, referrer origin, approved campaign labels మరియు device category నమోదు కావచ్చు — service improve చెయ్యడానికి మాత్రమే. Request IP + browser user-agent నుంచి ఒక process-local HMAC identifier తయారవుతుంది; ఇది pseudonymous, anonymous కాదు. Raw IP మరియు full user-agent analytics events లో store చేయము. ఈ events memory-only — గరిష్ఠంగా 30 రోజులు ఉంటాయి, 10,000 cap ఉంటుంది, process restart తో clear అవుతాయి.</li>
              <li>Browser లో cookies disable చెయ్యొచ్చు (కానీ login/saved features పని చెయ్యవు).</li>
            </>
          ) : (
            <>
              <li>We use <b>cookies</b> for login session, language preference, and saved filters.</li>
              <li><b>Tracking? No</b> — we don&apos;t give your data to ad-tech companies.</li>
              <li>Basic analytics (pages viewed) may record request paths, referrer origins, approved campaign labels, and a coarse device category — only to improve the service. A <b>process-local HMAC identifier</b> derived from request IP and user-agent may link visits while the process runs; it is pseudonymous, not anonymous. Raw IP and full user-agent are not stored in analytics events. These events are memory-only, expire after 30 days, are capped at 10,000, and are cleared on process restart.</li>
              <li>You can disable cookies in the browser (but login/saved features won&apos;t work).</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "6. Data security" : "6. Data security"}>
        <ul>
          {te ? (
            <>
              <li>Password-protected accounts, encrypted transport (HTTPS), access limited to authorized team members.</li>
              <li>Support team members కి కూడా <b>need-to-know</b> access మాత్రమే — logs audit చేస్తాం.</li>
              <li>Security incident జరిగితే — assessment తర్వాత applicable law ప్రకారం అవసరమైన notification/action తీసుకుంటాం; fixed deadline హామీ ఇవ్వము.</li>
            </>
          ) : (
            <>
              <li>Password-protected accounts, encrypted transport (HTTPS), access limited to authorized team members.</li>
              <li>Support team members get <b>need-to-know</b> access only — we audit logs.</li>
              <li>On a security incident — we assess and take any notification/action required by applicable law; this policy does not promise a fixed deadline.</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "7. ఎంత time store చేస్తాం (retention)" : "7. How long we store (retention)"}>
        <ul>
          {te ? (
            <>
              <li><b>Active profile:</b> మీరు account ఉన్న వరకు.</li>
              <li><b>Automated cleanup job:</b> configured retention threshold దాటిన profiles ను archive చేసి active records నుంచి తొలగిస్తుంది. Default threshold 3 సంవత్సరాలు profile create చేసిన తేదీ నుంచి (last login నుంచి కాదు); balance/pending payout/active plan ఉన్న కొన్ని profiles skip అవుతాయి. Archive copy కి ప్రస్తుతం నిర్దిష్ట purge కాలం లేదు.</li>
              <li><b>Visitor analytics:</b> memory-only events 30 రోజుల తర్వాత expire అవుతాయి; 10,000 cap దాటితే oldest entries తొలగిస్తాం; process restart తో clear అవుతాయి.</li>
              <li><b>Payment, consent, support, safety records:</b> service, dispute handling, security లేదా applicable legal/accounting అవసరాల కోసం అవసరమైనంతకాలం ఉంచవచ్చు; ఇక్కడ fixed year-based deadline హామీ ఇవ్వము.</li>
            </>
          ) : (
            <>
              <li><b>Active profile:</b> as long as you hold an account.</li>
              <li><b>Automated cleanup job:</b> profiles beyond the configured retention threshold are archived and removed from active records. The default threshold is 3 years <b>from profile creation</b>, not from last login; some profiles with balances, pending payouts, or active plans are skipped. The archive copy currently has no defined purge period.</li>
              <li><b>Visitor analytics:</b> memory-only events expire after 30 days, drop the oldest entries beyond the 10,000 cap, and are cleared on process restart.</li>
              <li><b>Payment, consent, support, and safety records:</b> may be retained as needed for service operation, dispute handling, security, or applicable legal/accounting duties; this policy does not promise fixed year-based deadlines.</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "8. మీ rights (మీ హక్కులు)" : "8. Your rights"}>
        <ul>
          {te ? (
            <>
              <li><b>చూడటం / correct చెయ్యడం:</b> మీ profile ఎప్పుడైనా edit చెయ్యొచ్చు (support తో లేదా admin తో).</li>
              <li><b>Delete:</b> account delete మీ profile ని public search నుంచి hide చేస్తుంది; అది అన్ని stored records ను erase చేయదు. పూర్తి erasure కోసం క్రింద privacy contact కి <b>erasure request</b> పంపండి — identity verify చేసి process చేస్తాం; fixed completion time హామీ లేదు.</li>
              <li><b>Consent withdraw:</b> channels/WhatsApp sharing ఆపించొచ్చు (కానీ అప్పుడు service reach తక్కువ అవుతుంది).</li>
              <li><b>Marketing opt-out:</b> &quot;STOP&quot; అనే message పంపండి లేదా support కి చెప్పండి.</li>
            </>
          ) : (
            <>
              <li><b>View / correct:</b> you can edit your profile anytime (with support or admin help).</li>
              <li><b>Delete:</b> deleting your account hides the profile from public search; it does not erase all stored records. For full erasure, send an <b>erasure request</b> to the privacy contact below — we verify identity and process it under applicable law; no fixed completion time is promised.</li>
              <li><b>Consent withdraw:</b> you can stop channels/WhatsApp sharing (but service reach drops then).</li>
              <li><b>Marketing opt-out:</b> send a &quot;STOP&quot; message or tell support.</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "9. Children & 3rd party links" : "9. Children & 3rd party links"}>
        <ul>
          {te ? (
            <>
              <li>ఈ service <b>18+</b> కి మాత్రమే (bride 18+, groom 21+).</li>
              <li>Third-party links (payment gateway, vendor offers) కి వాళ్లకి స్వ-privacy policies ఉంటాయి — మనం responsible కాదు.</li>
            </>
          ) : (
            <>
              <li>This service is <b>18+</b> only (bride 18+, groom 21+).</li>
              <li>Third-party links (payment gateway, vendor offers) have their own privacy policies — we are not responsible.</li>
            </>
          )}
        </ul>
      </Section>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 text-xs text-gray-700">
        <div className="font-bold text-[#7A0C2E]">🧑‍⚖️ {te ? "Grievance Officer (DPDP Act 2023)" : "Grievance Officer (DPDP Act 2023)"}</div>
        <div className="mt-2 space-y-1">
          {SITE_CONFIG.owner.name ? <div>Name: <b>{SITE_CONFIG.owner.name}</b> (Grievance Officer & Signatory)</div> : null}
          {SITE_CONFIG.owner.id ? <div>Owner ID: <span className="font-mono font-bold text-[#7A0C2E]">{SITE_CONFIG.owner.id}</span></div> : null}
          {SITE_CONFIG.owner.email ? <div>Email: <b>{SITE_CONFIG.owner.email}</b> • WhatsApp/Phone: <b>{SITE_CONFIG.owner.contactNumber}</b></div> : null}
          {SITE_CONFIG.owner.location ? <div>Address: {SITE_CONFIG.owner.location}</div> : null}
          <div>{te ? "Response: 15 రోజుల్లో (complaint acknowledge 48h లోపు)" : "Response: within 15 days (complaint acknowledged within 48h)"}</div>
          {!SITE_CONFIG.supportConfigured ? <div role="status">{te ? "ఈ deployment లో privacy/grievance contact configure కాలేదు. Public launch కు ముందు operator నిజమైన contact configure చేసి తనిఖీ చేయాలి." : "No privacy or grievance contact is configured for this deployment. The operator must configure and verify a real contact before public launch."}</div> : null}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 text-xs">
        <Link href="/pricing" className="underline text-[#7A0C2E] font-bold">💰 Pricing</Link>
        <Link href="/terms" className="underline text-[#7A0C2E] font-bold">📄 Terms</Link>
        <Link href="/refund" className="underline text-[#7A0C2E] font-bold">💸 Refund</Link>
        <Link href="/safety" className="underline text-[#7A0C2E] font-bold">🛡️ Safety</Link>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="font-bold text-[#7A0C2E] telugu">{title}</h2>
      <div className="mt-2 text-sm text-gray-700 telugu leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5">
        {children}
      </div>
    </section>
  );
}
