"use client";

/** 🔒 PRIVACY POLICY — neat Telugu / clean English via toggle. DPDP Act 2023 (India). */
import Link from "next/link";
import { SITE_CONFIG } from "@/lib/site-config";
import { useLang } from "@/lib/lang";

const LAST_UPDATED = "14 Sep 2026";

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
            Numbers <b>రెండు వైపులా ఒప్పుక తర్వాతే</b> share అవుతాయి. ఎప్పుడైనా మీ data delete అడగొచ్చు —
            30 రోజుల్లో తీస్తాం.</>
        ) : (
          <><b>In short:</b> we <b>never sell or rent</b> your data. Photos show per your private mode.
            Numbers share only <b>after mutual accept</b>. You can ask to delete your data anytime —
            removed within 30 days.</>
        )}
      </div>

      <Section title={te ? "1. ఏమి data collect చేస్తాం" : "1. What data we collect"}>
        <ul>
          {te ? (
            <>
              <li><b>Profile:</b> పేరు, gender, DOB/age, height, marital status, caste, religion, district/state, education, job, salary range, gothram, nakshatram/rasi (మీ ఇష్టంతో), about, photo(s).</li>
              <li><b>Contact:</b> mobile number (OTP verify), optional WhatsApp number, guardian contact (optional).</li>
              <li><b>Activity:</b> profile views, requests, saves, channel posts, login times, device/browser (basic), IP (security కోసం).</li>
              <li><b>Payments:</b> payment ID, amount, plan — <b>card/UPI details మన దగ్గర store అవ్వవు</b> (Razorpay handle చేస్తుంది).</li>
              <li><b>Support:</b> మీరు పంపిన messages/screenshots (complaints resolve చెయ్యడానికి).</li>
            </>
          ) : (
            <>
              <li><b>Profile:</b> name, gender, DOB/age, height, marital status, caste, religion, district/state, education, job, salary range, gothram, nakshatram/rasi (with your consent), about, photo(s).</li>
              <li><b>Contact:</b> mobile number (OTP verified), optional WhatsApp number, guardian contact (optional).</li>
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
              <li>Basic analytics (ఎన్ని pages చూశారు) — service improve చెయ్యడానికి మాత్రమే, personal గా trace చెయ్యము.</li>
              <li>Browser లో cookies disable చెయ్యొచ్చు (కానీ login/saved features పని చెయ్యవు).</li>
            </>
          ) : (
            <>
              <li>We use <b>cookies</b> for login session, language preference, and saved filters.</li>
              <li><b>Tracking? No</b> — we don&apos;t give your data to ad-tech companies.</li>
              <li>Basic analytics (how many pages viewed) — only to improve service; never traced personally.</li>
              <li>You can disable cookies in the browser (but login/saved features won&apos;t work).</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "6. Data security" : "6. Data security"}>
        <ul>
          {te ? (
            <>
              <li>OTP verification, encrypted transport (HTTPS), access limited to authorized team members.</li>
              <li>Support team members కి కూడా <b>need-to-know</b> access మాత్రమే — logs audit చేస్తాం.</li>
              <li>Data breach జరిగితే — 72 గంటల్లో affected users కి notify చేస్తాం (DPDP Act requirement).</li>
            </>
          ) : (
            <>
              <li>OTP verification, encrypted transport (HTTPS), access limited to authorized team members.</li>
              <li>Support team members get <b>need-to-know</b> access only — we audit logs.</li>
              <li>On a data breach — we notify affected users within 72 hours (DPDP Act requirement).</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "7. ఎంత time store చేస్తాం (retention)" : "7. How long we store (retention)"}>
        <ul>
          {te ? (
            <>
              <li><b>Active profile:</b> మీరు account ఉన్న వరకు.</li>
              <li><b>Inactive (12 నెలలు login లేదు):</b> reminder పంపిస్తాం → 30 రోజుల తర్వాత profile hide.</li>
              <li><b>Payment records:</b> 8 సంవత్సరాలు (tax/legal requirement).</li>
              <li><b>Complaints/fraud evidence:</b> 3 సంవత్సరాలు (repeat fraud ఆపడానికి).</li>
            </>
          ) : (
            <>
              <li><b>Active profile:</b> as long as you hold an account.</li>
              <li><b>Inactive (no login for 12 months):</b> we send a reminder → profile hides after 30 days.</li>
              <li><b>Payment records:</b> 8 years (tax/legal requirement).</li>
              <li><b>Complaints/fraud evidence:</b> 3 years (to stop repeat fraud).</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "8. మీ rights (మీ హక్కులు)" : "8. Your rights"}>
        <ul>
          {te ? (
            <>
              <li><b>చూడటం / correct చెయ్యడం:</b> మీ profile ఎప్పుడైనా edit చెయ్యొచ్చు (support తో లేదా admin తో).</li>
              <li><b>Delete:</b> account + data delete అడగొచ్చు — <b>30 రోజుల్లో</b> profile + photos + personal data తీస్తాం (payment records legal గా ఉంటాయి).</li>
              <li><b>Consent withdraw:</b> channels/WhatsApp sharing ఆపించొచ్చు (కానీ అప్పుడు service reach తక్కువ అవుతుంది).</li>
              <li><b>Marketing opt-out:</b> &quot;STOP&quot; అనే message పంపండి లేదా support కి చెప్పండి.</li>
            </>
          ) : (
            <>
              <li><b>View / correct:</b> you can edit your profile anytime (with support or admin help).</li>
              <li><b>Delete:</b> ask to delete account + data — profile + photos + personal data removed within <b>30 days</b> (payment records stay for legal reasons).</li>
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
          <div>Name: <b>{SITE_CONFIG.owner.name}</b> (Grievance Officer & Signatory)</div>
          <div>Owner ID: <span className="font-mono font-bold text-[#7A0C2E]">{SITE_CONFIG.owner.id}</span></div>
          <div>Email: <b>{SITE_CONFIG.owner.email}</b> • WhatsApp/Phone: <b>{SITE_CONFIG.owner.contactNumber}</b></div>
          <div>Address: Hyderabad, Telangana, India</div>
          <div>{te ? "Response: 15 రోజుల్లో (complaint acknowledge 48h లోపు)" : "Response: within 15 days (complaint acknowledged within 48h)"}</div>
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
