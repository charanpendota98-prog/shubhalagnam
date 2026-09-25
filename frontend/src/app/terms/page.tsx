"use client";

/** 📄 TERMS OF USE — neat Telugu / clean English via toggle. */
import Link from "next/link";
import { SITE_CONFIG } from "@/lib/site-config";
import { CHANNEL_STATS } from "@/lib/channels";
import { useLang } from "@/lib/lang";

const LAST_UPDATED = "14 Sep 2026";

export default function TermsPage() {
  const { lang } = useLang();
  const te = lang === "te";
  return (
    <main className="max-w-3xl mx-auto px-4 py-8 pb-36">
      <h1 className="text-2xl md:text-3xl font-extrabold text-[#7A0C2E] telugu">
        {te ? "📄 Terms of Use (సేవా నియమాలు)" : "📄 Terms of Use"}
      </h1>
      <div className="text-xs text-gray-500 mt-1">
        {te ? "Last updated" : "Last updated"}: {LAST_UPDATED} • {SITE_CONFIG.legalName} ({SITE_CONFIG.domain})
      </div>

      <Section title={te ? "1. ఈ service ఏంటి" : "1. What this service is"}>
        <ul>
          {te ? (
            <>
              <li>మన వివాహ (Manavivaha) ఒక <b>Telugu matrimony platform</b> — Telangana, Andhra Pradesh &amp;
                other-state/NRI Telugu families కి <b>profiles + channels + WhatsApp sharing</b> service.</li>
              <li>మనం <b>broker కాదు, marriage guarantee ఇవ్వము</b> — మన పని: correct profiles ని correct families కి చేర్చడం,
                safe &amp; respect తో.</li>
              <li>Website: {SITE_CONFIG.domain} • Telegram channels ({CHANNEL_STATS.total}) • WhatsApp sharing • Telegram: {SITE_CONFIG.officialChannel}</li>
            </>
          ) : (
            <>
              <li>మన వివాహ (Manavivaha) is a <b>Telugu matrimony platform</b> — a <b>profiles + channels + WhatsApp sharing</b> service
                for Telangana, Andhra Pradesh &amp; other-state/NRI Telugu families.</li>
              <li>We are <b>not brokers and give no marriage guarantee</b> — our job: bringing the right profiles to the right families,
                safely &amp; respectfully.</li>
              <li>Website: {SITE_CONFIG.domain} • Telegram channels ({CHANNEL_STATS.total}) • WhatsApp sharing • Telegram: {SITE_CONFIG.officialChannel}</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "2. Eligibility (ఎవరు join అవ్వచ్చు)" : "2. Eligibility (who can join)"}>
        <ul>
          {te ? (
            <>
              <li>Bride: <b>18+</b> మరియు Groom: <b>21+</b> (Indian marriage law ప్రకారం).</li>
              <li>Profile ని <b>స్వ-ఇచ్ఛతో</b> (own will) create చెయ్యాలి — family తో చెప్పినా OK, కానీ <b>వాళ్ల permission తో</b>.</li>
              <li>ఒక్క వ్యక్తికి — ఒక్క <b>active profile మాత్రమే</b> (duplicate profiles ban అవుతాయి).</li>
              <li>Aadhaar/PAN/photo verification అడగొచ్చు (trust కోసం) — ఇవ్వకపోతే profile <b>limited reach</b> లో ఉంటుంది.</li>
            </>
          ) : (
            <>
              <li>Bride: <b>18+</b> and Groom: <b>21+</b> (as per Indian marriage law).</li>
              <li>Profiles must be created of your <b>own free will</b> — family involvement is fine, but <b>with their permission</b>.</li>
              <li>One person — one <b>active profile only</b> (duplicates get banned).</li>
              <li>We may ask for Aadhaar/PAN/photo verification (for trust) — without it your profile stays in <b>limited reach</b>.</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "3. మీ responsibility (profile & content)" : "3. Your responsibility (profile & content)"}>
        <ul>
          {te ? (
            <>
              <li>ఇచ్చే details <b>నిజం</b> గా ఉండాలి — age, marital status, job, income, caste, photo.</li>
              <li>Fake photos, other person photos, morphed images → <b>immediate ban</b> + legal action.</li>
              <li>మీ profile కి copyright మీదే. Profile post ని మన channels/WhatsApp లో promote చెయ్యడానికి <b>permission ఇస్తున్నారు</b> (name, photo, details తో — మీ privacy settings బట్టి).</li>
              <li>Photo private mode / watermark — ఈ options ఉన్నాయి, మీ ఇష్టం.</li>
            </>
          ) : (
            <>
              <li>Details you give must be <b>true</b> — age, marital status, job, income, caste, photo.</li>
              <li>Fake photos, other people&apos;s photos, morphed images → <b>immediate ban</b> + legal action.</li>
              <li>Your profile&apos;s copyright stays yours. You give <b>permission</b> to promote your profile post on our channels/WhatsApp (name, photo, details — per your privacy settings).</li>
              <li>Photo private mode / watermark — these options exist, your choice.</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "4. Requests policy (chatting లేదు)" : "4. Requests policy (no chatting)"}>
        <ul>
          {te ? (
            <>
              <li><b>Chatting / DM feature లేదు</b> — spam &amp; మోసం ఆపడానికి ఇదే మన design.</li>
              <li>మీరు పంపిన <b>request</b> — target కి మీ profile + card WhatsApp లో వెళ్తుంది (మన official number నుంచి).</li>
              <li>Numbers <b>రెండు వైపులా ఒప్పుక తర్వాతే</b> share అవుతాయి. Declined అయిన వాళ్ల number ఎప్పుడూ ఇవ్వము.</li>
              <li>ఒక్క request = ఒక్క credit. Decline/no-response (7 రోజులు) అయితే credit మళ్లీ వస్తుంది.</li>
              <li>Daily limits + duplicate check ఉన్నాయి (ఒక profile కి repeat requests block).</li>
            </>
          ) : (
            <>
              <li><b>No chatting / DM feature</b> — this is our design to stop spam &amp; fraud.</li>
              <li>A <b>request</b> you send — your profile + card goes to the target on WhatsApp (from our official number).</li>
              <li>Numbers are shared only <b>after mutual accept</b>. We never give numbers of people who declined.</li>
              <li>One request = one credit. On decline/no-response (7 days) the credit comes back.</li>
              <li>Daily limits + duplicate checks exist (repeat requests to one profile are blocked).</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "5. Prohibited conduct (వీటి వల్ల ban అవుతారు) 🚫" : "5. Prohibited conduct (these get you banned) 🚫"}>
        <ul>
          {te ? (
            <>
              <li><b>Advance / registration / visa / hospital money అడగడం</b> — ఇది fraud. Report అయితే ban + police complaint.</li>
              <li>Harassment, caste/religion abuses, stalking, repeated unwanted requests.</li>
              <li>Business promotions, ads, other websites links channel/WhatsApp లో పెట్టడం.</li>
              <li>Other profiles data (photos/numbers) ని బయట share చెయ్యడం.</li>
              <li>Automated scraping, bots, bulk fake registrations.</li>
            </>
          ) : (
            <>
              <li><b>Asking for advance / registration / visa / hospital money</b> — this is fraud. On report: ban + police complaint.</li>
              <li>Harassment, caste/religion abuse, stalking, repeated unwanted requests.</li>
              <li>Posting business promotions, ads, or other websites&apos; links in channels/WhatsApp.</li>
              <li>Sharing other profiles&apos; data (photos/numbers) outside.</li>
              <li>Automated scraping, bots, bulk fake registrations.</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "6. Fees & payments" : "6. Fees & payments"}>
        <ul>
          {te ? (
            <>
              <li>Plans, add-ons, renewal prices — <Link href="/pricing" className="underline font-bold">/pricing</Link> page లో clear గా ఉన్నాయి.</li>
              <li>Free tier: మొదటి 3 requests FREE (card details అవసరం లేదు).</li>
              <li><b>Auto-renewal లేదు</b>. Payment Razorpay/UPI secure gateway తో.</li>
              <li>Refund rules → <Link href="/refund" className="underline font-bold">/refund</Link> policy లో.</li>
              <li>Prices ఎప్పుడైనా మార్చొచ్చు — కానీ మీరు pay చేసిన plan features ఇవ్వకుండా ఉండం.</li>
            </>
          ) : (
            <>
              <li>Plans, add-ons, renewal prices — clearly listed on the <Link href="/pricing" className="underline font-bold">/pricing</Link> page.</li>
              <li>Free tier: first 3 requests FREE (no card details needed).</li>
              <li><b>No auto-renewal</b>. Payments via secure Razorpay/UPI gateway.</li>
              <li>Refund rules → in the <Link href="/refund" className="underline font-bold">/refund</Link> policy.</li>
              <li>Prices may change anytime — but we never withhold features of a plan you paid for.</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "7. మన limits (liability)" : "7. Our limits (liability)"}>
        <ul>
          {te ? (
            <>
              <li>Profiles ని verify చెయ్యడానికి మనం best efforts పెడతాం (OTP, ID, photo) — కానీ <b>100% guarantee ఇవ్వలేము</b>.
                మీరే కూడా verify చెయ్యాలి (meeting, documents, family background).</li>
              <li>వ్యక్తి వేరే వ్యక్తి మధ్య జరిగే matter, meetings, money dealings కి మనం <b>party కాదు, responsible కాదు</b>.</li>
              <li>మనం ఇచ్చే service maximum liability = <b>మీ last 3 months లో pay చేసిన amount</b> వరకే.</li>
              <li>Fraud జరిగిన వెంటనే <Link href="/safety" className="underline font-bold">/safety</Link> లో report చెయ్యండి — మనం 24h లో action తీసుకుంటాం (hide/ban + help).</li>
            </>
          ) : (
            <>
              <li>We put best efforts into verifying profiles (OTP, ID, photo) — but <b>cannot give 100% guarantee</b>.
                You must verify too (meeting, documents, family background).</li>
              <li>For matters, meetings, or money dealings between individuals, we are <b>not a party and not responsible</b>.</li>
              <li>Our maximum liability = <b>the amount you paid in the last 3 months</b>, at most.</li>
              <li>Report fraud immediately in <Link href="/safety" className="underline font-bold">/safety</Link> — we act within 24h (hide/ban + help).</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "8. Account suspend / terminate" : "8. Account suspend / terminate"}>
        <ul>
          {te ? (
            <>
              <li>Terms violate, fake details, fraud reports, repeated complaints → warning → <b>hide</b> → <b>ban</b>.</li>
              <li>Banned accounts&apos; remaining credits refund అవ్వవు (fraud cases లో).</li>
              <li>మీరు account delete చెయ్యాలంటే — /privacy లో process (data delete, credits forfeit).</li>
            </>
          ) : (
            <>
              <li>Terms violations, fake details, fraud reports, repeated complaints → warning → <b>hide</b> → <b>ban</b>.</li>
              <li>Banned accounts&apos; remaining credits are not refunded (in fraud cases).</li>
              <li>To delete your account — process in /privacy (data delete, credits forfeit).</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "9. Governing law & changes" : "9. Governing law & changes"}>
        <ul>
          {te ? (
            <>
              <li>ఈ terms <b>Indian law</b> బట్టి, disputes కి <b>Hyderabad, Telangana</b> courts jurisdiction.</li>
              <li>Terms update అయితే ఈ page లో date మారుస్తాం — కొత్త features కి చిన్న additions జరుగుతాయి.</li>
              <li>Dispute ఉంటే — ముందు <b>{SITE_CONFIG.supportEmail}</b> కి email చెయ్యండి (30 రోజుల్లో resolve చెయ్యడానికి try చేస్తాం).</li>
            </>
          ) : (
            <>
              <li>These terms follow <b>Indian law</b>; disputes fall under <b>Hyderabad, Telangana</b> courts&apos; jurisdiction.</li>
              <li>When terms update, we change the date on this page — small additions come with new features.</li>
              <li>If you have a dispute — first email <b>{SITE_CONFIG.supportEmail}</b> (we try to resolve within 30 days).</li>
            </>
          )}
        </ul>
      </Section>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 text-xs text-gray-700">
        <div className="font-bold text-[#7A0C2E]">{te ? "Contact" : "Contact"}</div>
        <div className="mt-2 space-y-1">
          <div>Email: <b>{SITE_CONFIG.supportEmail}</b> • WhatsApp/Phone: <b>{SITE_CONFIG.supportPhoneDisplay}</b></div>
          <div>{SITE_CONFIG.legalName}, Hyderabad, Telangana, India</div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 text-xs">
        <Link href="/pricing" className="underline text-[#7A0C2E] font-bold">💰 {te ? "Pricing" : "Pricing"}</Link>
        <Link href="/refund" className="underline text-[#7A0C2E] font-bold">💸 {te ? "Refund Policy" : "Refund Policy"}</Link>
        <Link href="/privacy" className="underline text-[#7A0C2E] font-bold">🔒 {te ? "Privacy" : "Privacy"}</Link>
        <Link href="/safety" className="underline text-[#7A0C2E] font-bold">🛡️ {te ? "Safety" : "Safety"}</Link>
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
