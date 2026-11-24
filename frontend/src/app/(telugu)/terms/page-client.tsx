"use client";
import "@/components/trust-workspace.css";

/** 📄 TERMS OF USE — neat Telugu / clean English via toggle. */
import Link from "@/components/LocaleLink";
import { SITE_CONFIG } from "@/lib/site-config";
import { POLICY_SUPPORT_EMAIL } from "@/lib/policy-facts";
// Legal copy avoids a hard-coded channel count: CHANNEL_STATS.total is auto-generated
// with external_status_checked=false (live links unverified), so no number is stated
// until the channel directory is verified live.
import { useLang } from "@/lib/lang";

const LAST_UPDATED = "17 Nov 2026";

export default function TermsPage() {
  const { lang } = useLang();
  const te = lang === "te";
  return (
    <div className="mv-trust-workspace max-w-3xl mx-auto px-4 py-8 pb-36">
      <h1 className="text-2xl md:text-3xl font-extrabold text-[#7A0C2E] telugu">
        {te ? "📄 Terms of Use (సేవా నియమాలు)" : "📄 Terms of Use"}
      </h1>
      <div className="text-xs text-gray-500 mt-1">
        {te ? "Last updated" : "Last updated"}: {LAST_UPDATED} • {SITE_CONFIG.legalName} ({SITE_CONFIG.domain})
      </div>

      <p data-testid="policy-payment-fact" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">{te ? "Paid checkout ప్రస్తుతం అందుబాటులో లేదు. డబ్బు పంపవద్దు. ఇప్పటికే ఉన్న refund/credit హక్కులు, response deadlines ఈ factual update వల్ల మారవు." : "Paid checkout is currently unavailable. Do not send money. Existing refund/credit rights and response deadlines are unchanged by this factual update."}</p>

      <Section title={te ? "1. ఈ service ఏంటి" : "1. What this service is"}>
        <ul>
          {te ? (
            <>
              <li>మన వివాహ (Manavivaha) ఒక <b>Telugu matrimony platform</b> — Telangana, Andhra Pradesh &amp;
                other-state/NRI Telugu families కి <b>profiles + channels + WhatsApp sharing</b> service.</li>
              <li>మనం <b>broker కాదు, marriage guarantee ఇవ్వము</b> — మన పని: correct profiles ని correct families కి చేర్చడం,
                safe &amp; respect తో.</li>
              <li>Website: {SITE_CONFIG.domain} • Telegram channel directory • WhatsApp sharing • Telegram: {SITE_CONFIG.officialChannel}</li>
            </>
          ) : (
            <>
              <li>మన వివాహ (Manavivaha) is a <b>Telugu matrimony platform</b> — a <b>profiles + channels + WhatsApp sharing</b> service
                for Telangana, Andhra Pradesh &amp; other-state/NRI Telugu families.</li>
              <li>We are <b>not brokers and give no marriage guarantee</b> — our job: bringing the right profiles to the right families,
                safely &amp; respectfully.</li>
              <li>Website: {SITE_CONFIG.domain} • Telegram channel directory • WhatsApp sharing • Telegram: {SITE_CONFIG.officialChannel}</li>
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

      <Section title={te ? "4. అధికారిక సంప్రదింపుల విధానం (Consent-Driven Requests Policy)" : "4. Official Consent-Driven Requests Policy"}>
        <ul>
          {te ? (
            <>
              <li><b>అనవసర చాటింగ్ / DM ఫీచర్ ఉండదు</b> — స్పామ్ మరియు మోసాలను అరికట్టడానికి ఇరు కుటుంబాల సమ్మతి ఆధారిత విధానం మాత్రమే అమలులో ఉంటుంది.</li>
              <li>మీ <b>Interest Request</b> account లో నమోదు అవుతుంది. Configured service ద్వారా external notification queue కావచ్చు; delivery లేదా message చదివారనే నిర్ధారణ కాదు.</li>
              <li>Profile owner accept చేసిన తర్వాత accepted-request account views లో contact వివరాలు కనిపిస్తాయి. తిరస్కరించిన requests contact వివరాలు బహిర్గతం కావు.</li>
              <li>ఒక రిక్వెస్ట్ = ఒక క్రెడిట్. ఒకవేళ తిరస్కరించబడినా లేదా 7 రోజుల్లో స్పందన లేకపోయినా క్రెడిట్ 100% రీఫండ్ చేయబడుతుంది.</li>
              <li>రోజువారీ పరిమితులు మరియు డూప్లికేట్ ప్రొటెక్షన్ నిబంధనలు ఖచ్చితంగా అమలు చేయబడతాయి.</li>
            </>
          ) : (
            <>
              <li><b>No casual chatting / DM feature</b> — to eliminate spam and protect privacy, communication is strictly consent-driven between families.</li>
              <li>Your <b>Interest Request</b> is recorded in your account. An external notification may be queued through a configured service; delivery or reading is not confirmed.</li>
              <li>Contact details appear in accepted-request account views after the profile owner accepts. Contact details of declined requests are not disclosed.</li>
              <li>One request = one credit. On decline or no-response within 7 days, your credit is 100% refunded to your balance.</li>
              <li>Daily limits and anti-spam duplicate request guards are strictly enforced.</li>
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
              <li><b>Auto-renewal లేదు</b>. Paid checkout ప్రస్తుతం అందుబాటులో లేదు. Verified checkout destination కనిపించే వరకు డబ్బు పంపవద్దు. Paid checkout ప్రారంభించే ముందు payment handling వివరాలను update చేస్తాం.</li>
              <li>Refund rules → <Link href="/refund" className="underline font-bold">/refund</Link> policy లో.</li>
              <li>Prices ఎప్పుడైనా మార్చొచ్చు — కానీ మీరు pay చేసిన plan features ఇవ్వకుండా ఉండం.</li>
            </>
          ) : (
            <>
              <li>Plans, add-ons, renewal prices — clearly listed on the <Link href="/pricing" className="underline font-bold">/pricing</Link> page.</li>
              <li>Free tier: first 3 requests FREE (no card details needed).</li>
              <li><b>No auto-renewal</b>. Paid checkout is currently unavailable. Do not send money until a verified checkout destination is shown. Payment handling details will be updated before paid checkout is enabled.</li>
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
              <li>Profiles ని verify చెయ్యడానికి మనం best efforts పెడతాం (photo review, ID review) — కానీ <b>100% guarantee ఇవ్వలేము</b>.
                మీరే కూడా verify చెయ్యాలి (meeting, documents, family background).</li>
              <li>వ్యక్తి వేరే వ్యక్తి మధ్య జరిగే matter, meetings, money dealings కి మనం <b>party కాదు, responsible కాదు</b>.</li>
              <li>మనం ఇచ్చే service maximum liability = <b>మీ last 3 months లో pay చేసిన amount</b> వరకే.</li>
              <li>Fraud జరిగిన వెంటనే <Link href="/safety" className="underline font-bold">/safety</Link> లో report చెయ్యండి — మనం 24h లో action తీసుకుంటాం (hide/ban + help).</li>
            </>
          ) : (
            <>
              <li>We put best efforts into verifying profiles (photo review, ID review) — but <b>cannot give 100% guarantee</b>.
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
              <li>{POLICY_SUPPORT_EMAIL ? <>Dispute ఉంటే — ముందు <b>{POLICY_SUPPORT_EMAIL}</b> కి email చెయ్యండి (30 రోజుల్లో resolve చెయ్యడానికి try చేస్తాం).</> : <>Dispute ఉంటే — ముందు support channel ద్వారా చెప్పండి (30 రోజుల్లో resolve చెయ్యడానికి try చేస్తాం).</>}</li>
            </>
          ) : (
            <>
              <li>These terms follow <b>Indian law</b>; disputes fall under <b>Hyderabad, Telangana</b> courts&apos; jurisdiction.</li>
              <li>When terms update, we change the date on this page — small additions come with new features.</li>
              <li>{POLICY_SUPPORT_EMAIL ? <>If you have a dispute — first email <b>{POLICY_SUPPORT_EMAIL}</b> (we try to resolve within 30 days).</> : <>If you have a dispute — first reach us through the support channel (we try to resolve within 30 days).</>}</li>
            </>
          )}
        </ul>
      </Section>

      <section aria-labelledby="business-contact-heading" className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-700">
        <h2 id="business-contact-heading" className="font-bold text-[#7A0C2E]">{te ? "Business contact వివరాలు" : "Business contact details"}</h2>
        {POLICY_SUPPORT_EMAIL ? <p className="mt-3">Email: <LocaleAnchor className="underline break-all" href={`mailto:${POLICY_SUPPORT_EMAIL}`}>{POLICY_SUPPORT_EMAIL}</LocaleAnchor></p> : null}
        {SITE_CONFIG.owner.name ? <p className="mt-2">{te ? "Business contact" : "Business contact"}: {SITE_CONFIG.owner.name}</p> : null}
        {SITE_CONFIG.owner.contactNumber ? <p className="mt-2"><LocaleAnchor className="underline" href={`tel:${SITE_CONFIG.owner.contactNumber}`}>{SITE_CONFIG.owner.contactNumber}</LocaleAnchor></p> : null}
        <p className="mt-3">{te ? "ఇవి సంప్రదింపు వివరాలు మాత్రమే. ఈ page digital signature లేదా service agreement acceptance కి రుజువు కాదు." : "These are contact details only. This page is not proof of a digital signature or acceptance of a service agreement."}</p>
      </section>

      <div className="mt-6 flex flex-wrap gap-3 text-xs">
        <Link href="/pricing" className="underline text-[#7A0C2E] font-bold">💰 {te ? "Pricing" : "Pricing"}</Link>
        <Link href="/refund" className="underline text-[#7A0C2E] font-bold">💸 {te ? "Refund Policy" : "Refund Policy"}</Link>
        <Link href="/privacy" className="underline text-[#7A0C2E] font-bold">🔒 {te ? "Privacy" : "Privacy"}</Link>
        <Link href="/safety" className="underline text-[#7A0C2E] font-bold">🛡️ {te ? "Safety" : "Safety"}</Link>
      </div>
    </div>
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

import LocaleAnchor from "@/components/LocaleAnchor";
