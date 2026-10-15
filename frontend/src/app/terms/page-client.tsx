"use client";

/** 📄 TERMS OF USE — neat Telugu / clean English via toggle. */
import Link from "next/link";
import { SITE_CONFIG } from "@/lib/site-config";
import { CHANNEL_STATS } from "@/lib/channels";
import { useLang } from "@/lib/lang";

const LAST_UPDATED = "12 Oct 2026";

export default function TermsPage() {
  const { lang } = useLang();
  const te = lang === "te";
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-36">
      <h1 className="text-2xl md:text-3xl font-extrabold text-[#7A0C2E] telugu">
        {te ? "📄 Terms of Use (సేవా నియమాలు)" : "📄 Terms of Use"}
      </h1>
      <div className="text-xs text-gray-500 mt-1">
        {te ? "చివరిగా నవీకరించిన తేదీ" : "Last updated"}: {LAST_UPDATED}{SITE_CONFIG.legalName ? ` • ${SITE_CONFIG.legalName}` : ""} • {SITE_CONFIG.domain}
      </div>

      <Section title={te ? "1. ఈ service ఏంటి" : "1. What this service is"}>
        <ul>
          {te ? (
            <>
              <li>మన వివాహ ఒక <b>Telugu matrimony platform</b> — సభ్యులు అందించిన profiles మరియు deployment‌లో configure చేసిన sharing tools‌ను అందిస్తుంది.</li>
              <li>మేము <b>broker కాదు, marriage guarantee ఇవ్వము</b>. ఈ platform సభ్యులు అందించిన profiles ను కుటుంబాలు పరిశీలించడానికి tools ఇస్తుంది; contact sharing profile-owner acceptance తరువాతే ఉంటుంది.</li>
              <li>Website: {SITE_CONFIG.domain} • channel directory listings ({CHANNEL_STATS.total}) • WhatsApp sharing • <Link href="/channels" className="underline">configured channel listings</Link> (external availability not checked)</li>
            </>
          ) : (
            <>
              <li>Mana Vivaha is a <b>Telugu matrimony platform</b> that offers member-submitted profiles and sharing tools only where a deployment destination is configured.</li>
              <li>We are <b>not brokers and give no marriage guarantee</b>. The platform provides tools for families to review member-submitted profiles; contact sharing follows profile-owner acceptance.</li>
              <li>Website: {SITE_CONFIG.domain} • channel directory listings ({CHANNEL_STATS.total}) • WhatsApp sharing • <Link href="/channels" className="underline">configured channel listings</Link> (external availability not checked)</li>
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
              <li>ఒకరికి ఒక active profile మాత్రమే ఉంచండి; suspected duplicates review తర్వాత applicable policy ప్రకారం restrict చేయవచ్చు.</li>
              <li>Phone OTP, photo review, ID review వంటి వేర్వేరు checks ఉండవచ్చు. ప్రతి check తన పరిమిత అంశాన్నే సూచిస్తుంది; ఇతర profile వివరాలు లేదా identity నిర్ధారితం కావు.</li>
            </>
          ) : (
            <>
              <li>Bride: <b>18+</b> and Groom: <b>21+</b> (as per Indian marriage law).</li>
              <li>Profiles must be created of your <b>own free will</b> — family involvement is fine, but <b>with their permission</b>.</li>
              <li>Keep one active profile per person; suspected duplicate accounts may be restricted after review under the applicable policy.</li>
              <li>Separate phone OTP, photo, or ID checks may be offered or required. Each check applies only to the recorded item; it does not verify other profile details or establish identity.</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "3. మీ responsibility (profile & content)" : "3. Your responsibility (profile & content)"}>
        <ul>
          {te ? (
            <>
              <li>ఇచ్చే details <b>నిజం</b> గా ఉండాలి — age, marital status, job, income, caste, photo.</li>
              <li>Fake, unauthorized, or manipulated photos may be removed and may lead to account restrictions after review; any further action depends on the facts and applicable law.</li>
              <li>మీరు అందించిన content పై మీ హక్కులు మీవే. సంబంధిత consent, photo setting, review/approval మరియు configured destination అనుమతించినప్పుడు మాత్రమే profile material ను channel లేదా messaging ప్రచురణకు పరిగణిస్తాం; publication లేదా reach హామీ లేదు.</li>
              <li>Photo private mode / watermark — ఈ options ఉన్నాయి, మీ ఇష్టం.</li>
            </>
          ) : (
            <>
              <li>Details you give must be <b>true</b> — age, marital status, job, income, caste, photo.</li>
              <li>Fake, unauthorized, or manipulated photos may be removed and may lead to account restrictions after review; any further action depends on the facts and applicable law.</li>
              <li>You retain rights in the content you provide. Profile material is considered for channel or messaging publication only where relevant consent, photo settings, review/approval, and a configured destination allow it; publication or reach is not guaranteed.</li>
              <li>Photo private mode / watermark — these options exist, your choice.</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "4. అధికారిక సంప్రదింపుల విధానం (Consent-Driven Requests Policy)" : "4. Official Consent-Driven Requests Policy"}>
        <ul>
          {te ? (
            <>
              <li><b>Casual chat / DM ఫీచర్ లేదు</b> — unwanted messaging తగ్గించేందుకు ఇరు కుటుంబాల సమ్మతి ఆధారిత contact-sharing విధానం ఉపయోగిస్తాం.</li>
              <li>మీ <b>ఇంట్రెస్ట్ రిక్వెస్ట్</b> ను అమల్లో ఉన్న notification సేవల ద్వారా profile owner‌కు పంపడానికి ప్రయత్నిస్తాం; బాహ్య సేవల delivery హామీ కాదు.</li>
              <li>Profile owner <b>accept చేసిన తర్వాత మాత్రమే</b> contact details accepted-request account views లో కనిపిస్తాయి. Configured WhatsApp notification queue కావచ్చు, కానీ delivery హామీ లేదు. Decline అయితే contact access ఇవ్వము.</li>
              <li>ఒక request = ఒక credit. Decline పై credit return account లో చూపిన policy ప్రకారం ఉంటుంది; 7 రోజులకు స్పందన లేక request expire అయితే ఖర్చయిన credit ఒకసారి తిరిగి వస్తుంది. Credit return cash refund కాదు.</li>
              <li>రోజువారీ పరిమితులు మరియు డూప్లికేట్ ప్రొటెక్షన్ నిబంధనలు ఖచ్చితంగా అమలు చేయబడతాయి.</li>
            </>
          ) : (
            <>
              <li><b>No casual chat or DM feature.</b> Contact sharing is consent-driven to reduce unwanted messaging and protect privacy; no system can eliminate all abuse.</li>
              <li>We attempt to send your <b>Interest Request</b> to the profile owner through the notification services configured for the deployment; external delivery is not guaranteed.</li>
              <li>Contact details appear in accepted-request account views only <b>after the profile owner accepts</b>. A configured WhatsApp notification may include those details; queue/send status is not proof of delivery or reading. Declined requests do not grant contact access.</li>
              <li>One request = one credit. Credit returns on decline follow the policy shown in your account; if a request expires after 7 days without a response, its spent credit is returned once. A credit return is not a cash refund.</li>
              <li>Daily limits and anti-spam duplicate request guards are strictly enforced.</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "5. Prohibited conduct (నిషేధిత ప్రవర్తన) 🚫" : "5. Prohibited conduct 🚫"}>
        <ul>
          {te ? (
            <>
              <li><b>Advance / registration / visa / hospital money అడిగే requests</b> మోసం సంకేతాలు కావచ్చు. Report చేయండి; ప్రతి report review తర్వాత evidence మరియు applicable law ప్రకారం చర్య నిర్ణయిస్తాం.</li>
              <li>Harassment, caste/religion abuses, stalking, repeated unwanted requests.</li>
              <li>Business promotions, ads, other websites links channel/WhatsApp లో పెట్టడం.</li>
              <li>Other profiles data (photos/numbers) ని బయట share చెయ్యడం.</li>
              <li>Automated scraping, bots, bulk fake registrations.</li>
            </>
          ) : (
            <>
              <li>Requests for <b>advance / registration / visa / hospital money</b> may be a fraud warning. Report them; action follows review of the evidence and applicable law.</li>
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
              <li><b>Auto-renewal లేదు</b>. Payment options మరియు final amount checkout లో చూపిస్తాం; availability ప్రస్తుత configuration పై ఆధారపడుతుంది.</li>
              <li>Refund rules → <Link href="/refund" className="underline font-bold">/refund</Link> policy లో.</li>
              <li>తదుపరి orders కోసం prices మారవచ్చు; మీరు కొనుగోలు చేసిన order కు checkout లో చూపిన terms వర్తిస్తాయి, applicable law ప్రకారం మీ హక్కులు అలాగే ఉంటాయి.</li>
            </>
          ) : (
            <>
              <li>Plans, add-ons, renewal prices — clearly listed on the <Link href="/pricing" className="underline font-bold">/pricing</Link> page.</li>
              <li>Free tier: first 3 requests FREE (no card details needed).</li>
              <li><b>No auto-renewal</b>. Payment methods and the final amount are shown at checkout; availability depends on the current configuration.</li>
              <li>Refund rules → in the <Link href="/refund" className="underline font-bold">/refund</Link> policy.</li>
              <li>Prices may change for future orders. The terms shown at checkout apply to your purchase, subject to rights that cannot be limited under applicable law.</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "7. మన limits (liability)" : "7. Our limits (liability)"}>
        <ul>
          {te ? (
            <>
              <li>సభ్యులు ఇచ్చిన వివరాలను స్వతంత్రంగా నిర్ధారించండి. Phone OTP number access‌ను మాత్రమే చూపుతుంది; photo/ID review వాటి సమర్పణ/సమీక్ష స్థితినే చూపుతుంది — identity లేదా ఇతర వివరాల హామీ కాదు.</li>
              <li>వ్యక్తి వేరే వ్యక్తి మధ్య జరిగే matter, meetings, money dealings కి మనం <b>party కాదు, responsible కాదు</b>.</li>
              <li>Applicable law కింద పరిమితం చేయలేని హక్కులు లేదా పరిహారాలు ఈ Terms వల్ల తగ్గవు; బాధ్యత applicable law ప్రకారం నిర్ణయించబడుతుంది.</li>
              <li>Fraud అనుమానం ఉంటే <Link href="/safety" className="underline font-bold">/safety</Link> లో report చేయండి. ప్రతి report‌ను సమీక్షిస్తాం; చర్య సమయం మరియు ఫలితం మారవచ్చు.</li>
            </>
          ) : (
            <>
              <li>Independently review member-submitted details. Phone OTP records access to a number; photo/ID review records only the submitted item and review status. Neither guarantees identity or other profile details.</li>
              <li>For matters, meetings, or money dealings between individuals, we are <b>not a party and not responsible</b>.</li>
              <li>Nothing in these Terms limits rights or remedies that cannot be limited under applicable law; any liability is determined under applicable law.</li>
              <li>If you suspect fraud, report it on <Link href="/safety" className="underline font-bold">/safety</Link>. Reports are reviewed; response time and outcome may vary.</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "8. Account suspend / terminate" : "8. Account suspend / terminate"}>
        <ul>
          {te ? (
            <>
              <li>Terms violation, fake details లేదా safety complaint report అయినప్పుడు evidence review చేసి, applicable policy మరియు law ప్రకారం చర్య తీసుకుంటాం; warning లేదా restriction ప్రతి సందర్భంలో ఒకేలా ఉండకపోవచ్చు.</li>
              <li>Credits cash refund కావు; account restriction మరియు refund review published policy మరియు applicable law ప్రకారం ఉంటాయి.</li>
              <li>Profile ను public search నుంచి దాచడానికి My Account control వాడండి. ఇది stored-data erasure కాదు; accepted requests లో ముందే ఇచ్చిన contact access ను revoke చేయదు, బయట save చేసిన copies ను తిరిగి తీసుకోలేము. Erasure request కోసం /privacy లో owner-configured contact channel ఉంటే దాన్ని వాడండి; contact configure కాలేదంటే sensitive వివరాలను పంపకండి. Payment, safety, audit లేదా archive records applicable అవసరాల వల్ల మిగలవచ్చు.</li>
            </>
          ) : (
            <>
              <li>We review reported Terms violations, false details, and safety complaints and may take action under the applicable policy and law. The outcome is evidence-based and is not a fixed warning-to-ban sequence.</li>
              <li>Credits are not cash refunds; account restrictions and refund requests follow the published policy and applicable law.</li>
              <li>Use the My Account control to hide your profile from public search. This is not stored-data erasure and does not revoke contact access already granted through accepted requests; copies saved/shared outside the service cannot be recalled. Use an owner-configured contact channel in /privacy for an erasure request; if none is shown, do not send sensitive details to guessed addresses. Payment, safety, audit, or archive records may remain where applicable.</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "9. Governing law & changes" : "9. Governing law & changes"}>
        <ul>
          {te ? (
            <>
              <li>ఈ Terms కు applicable <b>Indian law</b> వర్తిస్తుంది; సముచిత forum applicable law ప్రకారం నిర్ణయించబడుతుంది.</li>
              <li>Terms update అయితే ఈ page లో date చూపిస్తాం; మార్పులు ఇక్కడ ప్రకటిస్తాం.</li>
              <li>{SITE_CONFIG.supportEmail ? <>వివాదాల కోసం configured email‌ను వాడండి: <a href={`mailto:${SITE_CONFIG.supportEmail}`} className="underline">{SITE_CONFIG.supportEmail}</a>. స్పందన సమయం మారవచ్చు.</> : SITE_CONFIG.supportLink || SITE_CONFIG.supportPhoneDisplay ? <><Link href="/privacy" className="underline">Privacy page</Link> లో చూపిన configured contact channel‌ను వాడండి; స్పందన సమయం మారవచ్చు.</> : <>ఈ deployment లో support contact configure కాలేదు. Sensitive వివరాలు పంపే ముందు operator నిజమైన contact configure చేసి తనిఖీ చేయాలి.</>}</li>
            </>
          ) : (
            <>
              <li>These Terms are governed by applicable <b>Indian law</b>; the competent forum is determined under applicable law.</li>
              <li>Changes to these Terms will be shown on this page with an updated date.</li>
              <li>{SITE_CONFIG.supportEmail ? <>For disputes, use the configured email <a href={`mailto:${SITE_CONFIG.supportEmail}`} className="underline">{SITE_CONFIG.supportEmail}</a>. Response time may vary.</> : SITE_CONFIG.supportLink || SITE_CONFIG.supportPhoneDisplay ? <>See the <Link href="/privacy" className="underline">Privacy page</Link> for any configured contact channel; response time may vary.</> : <>No support contact is configured for this deployment. The operator must configure and verify one before public launch; do not send sensitive details to guessed addresses.</>}</li>
            </>
          )}
        </ul>
      </Section>

      <div className="mt-6 flex flex-wrap gap-3 text-xs">
        <Link href="/pricing" className="underline text-[#7A0C2E] font-bold">💰 {te ? "ధరలు" : "Pricing"}</Link>
        <Link href="/refund" className="underline text-[#7A0C2E] font-bold">💸 {te ? "వాపసు విధానం" : "Refund Policy"}</Link>
        <Link href="/privacy" className="underline text-[#7A0C2E] font-bold">🔒 {te ? "గోప్యత" : "Privacy"}</Link>
        <Link href="/safety" className="underline text-[#7A0C2E] font-bold">🛡️ {te ? "భద్రత" : "Safety"}</Link>
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
