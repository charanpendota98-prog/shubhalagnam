"use client";

/** 🔒 PRIVACY POLICY — neat Telugu / clean English via toggle. DPDP Act 2023 (India). */
import Link from "next/link";
import { SITE_CONFIG } from "@/lib/site-config";
import { useLang } from "@/lib/lang";

const LAST_UPDATED = "12 Oct 2026";

export default function PrivacyPage() {
  const { lang } = useLang();
  const te = lang === "te";
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-36">
      <h1 className="text-2xl md:text-3xl font-extrabold text-[#7A0C2E] telugu">
        {te ? "🔒 Privacy Policy (గోప్యతా విధానం)" : "🔒 Privacy Policy"}
      </h1>
      <div className="text-xs text-gray-500 mt-1">{te ? "చివరిగా నవీకరించిన తేదీ" : "Last updated"}: {LAST_UPDATED}{SITE_CONFIG.legalName ? ` • ${SITE_CONFIG.legalName}` : ""} • {SITE_CONFIG.domain}</div>

      <div className="mt-5 rounded-2xl bg-[#FFF8E1] border border-[#B8860B]/30 p-4 text-sm telugu text-[#7A0C2E]">
        {te ? (
          <><b>సంక్షిప్తంగా:</b> మీ వ్యక్తిగత data ని third-party advertising కోసం అమ్మము లేదా అద్దెకు ఇవ్వము.
            Profile hide చేయడం అన్ని stored records ను erase చేయదు లేదా accepted request ద్వారా ముందే ఇచ్చిన contact access ను revoke చేయదు; recipients వద్ద copies ఉండవచ్చు.
            Data access/correction/erasure కోసం క్రింద కనిపించే owner-configured privacy contact ను వాడండి; identity verification, applicable retention rules మరియు బయటికి share అయిన copies వల్ల process మారవచ్చు. Owner-configured contact కనిపించకపోతే guessed address కు sensitive documents పంపకండి; public deployment కు ముందు నిజమైన privacy contact configure చేయాలి. Fixed turnaround time హామీ ఇవ్వము.</>
        ) : (
          <><b>In short:</b> we do not sell or rent personal data for third-party advertising.
            Hiding a profile does not erase all stored records or revoke contact access already granted through accepted requests; recipients may retain copies.
            Use the owner-configured privacy contact below for access, correction, or erasure requests; identity checks, applicable retention rules, and copies already shared outside the service can affect the process. If no owner-configured contact is shown, do not send sensitive documents to guessed addresses; a public deployment must configure a real privacy contact first. No fixed completion time is promised.</>
        )}
      </div>

      <Section title={te ? "1. ఏమి data collect చేస్తాం" : "1. What data we collect"}>
        <ul>
          {te ? (
            <>
              <li><b>Profile:</b> పేరు, gender, DOB/age, height, marital status, caste, religion, district/state, education, job, salary range, gothram, nakshatram/rasi (మీ ఇష్టంతో), about, photo(s).</li>
              <li><b>Contact:</b> mobile number, optional WhatsApp number, guardian contact (optional); server-side OTP status is recorded only when that verification flow succeeds.</li>
              <li><b>Activity:</b> profile views, requests, saves, login times, request paths, referrer origin, approved campaign labels and a coarse device category. A process-local HMAC identifier derived from request IP and user-agent may link visits while the process runs; it is pseudonymous, not anonymous. Raw IP and full user-agent are not stored in analytics events. These events are memory-only, expire after 30 days, are capped at 10,000, and are cleared on process restart. Infrastructure/provider logs may have separate retention.</li>
              <li><b>Payments:</b> order/payment references, amount, plan and status. The selected payment provider processes payment details needed for checkout; its own privacy terms also apply.</li>
              <li><b>Support:</b> మీరు పంపిన messages/screenshots (complaints resolve చెయ్యడానికి).</li>
            </>
          ) : (
            <>
              <li><b>Profile:</b> name, gender, DOB/age, height, marital status, caste, religion, district/state, education, job, salary range, gothram, nakshatram/rasi (with your consent), about, photo(s).</li>
              <li><b>Contact:</b> mobile number, optional WhatsApp number, and optional guardian contact. Server-side OTP status is recorded only when that verification flow succeeds.</li>
              <li><b>Activity:</b> profile views, requests, saves, login times, request paths, referrer origins, approved campaign labels, and a coarse device category. A process-local HMAC identifier derived from request IP and user-agent may link visits while the process runs; it is pseudonymous, not anonymous. Raw IP and full user-agent are not stored in analytics events. These events are memory-only, expire after 30 days, are capped at 10,000, and are cleared on process restart. Infrastructure/provider logs may have separate retention.</li>
              <li><b>Payments:</b> order/payment references, amount, plan, and status. The selected payment provider processes payment details needed for checkout; its own privacy terms also apply.</li>
              <li><b>Support:</b> messages/screenshots you send (to resolve complaints).</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "2. ఎందుకు వాడుతాం (purpose)" : "2. Why we use it (purpose)"}>
        <ul>
          {te ? (
            <>
              <li>మీరు అందించిన profile వివరాలను service లో చూపించడం; channel లేదా messaging publication సంబంధిత consent, privacy settings, approval మరియు destination configuration ఉన్నప్పుడే ప్రయత్నించబడుతుంది. Reach/delivery హామీ లేదు.</li>
              <li>మీరు పంపిన interest requests నిర్వహించడం. Owner accept చేసిన తర్వాత contact details account views లో కనిపిస్తాయి; configured WhatsApp notification లో ఉండవచ్చు, delivery/read నిర్ధారణ కాదు.</li>
              <li>Fraud prevention, moderation, block/report handling, safety review మరియు service security.</li>
              <li>Payments, receipts, invoices, referrals మరియు requested service updates నిర్వహించడం.</li>
              <li>Promotional-communication preference లేదా privacy ప్రశ్న కోసం క్రింద కనిపించే owner-configured contact ను వాడండి; self-service opt-out control ఉందని ఈ policy హామీ ఇవ్వడం లేదు. Contact కనిపించకపోతే guessed address కు sensitive details పంపకండి.</li>
            </>
          ) : (
            <>
              <li>Displaying the profile details you provide within the service. Channel or messaging publication is attempted only where the relevant consent, privacy settings, approval, and destination configuration allow; reach and delivery are not guaranteed.</li>
              <li>Operating interest requests you initiate. After owner acceptance, contact details appear in accepted-request account views and may be included in a configured WhatsApp notification; delivery/read is not confirmed.</li>
              <li>Fraud prevention, moderation, block/report handling, safety review, and service security.</li>
              <li>Payments, receipts, invoices, referrals, and service updates you request or that are needed to operate your account.</li>
              <li>Use the owner-configured contact shown below for promotional-communication preferences or privacy questions; this policy does not claim a self-service opt-out control. If no contact is shown, do not send sensitive details to a guessed address.</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "3. ఎవరితో share చేస్తాం" : "3. Who we share with"}>
        <ul>
          {te ? (
            <>
              <li><b>ఇతర సభ్యులు:</b> public/search లో ఉన్న profile fields ఇతర సభ్యులకు కనిపించవచ్చు; private-photo setting ను గౌరవించే outputs లో photo దాచబడుతుంది. Interest request అందుకున్న వ్యక్తికి acceptance కి ముందే request మరియు పంపిన profile వివరాలు కనిపిస్తాయి; accept చేసిన తర్వాత accepted-request account views లో contact details కనిపిస్తాయి. Configured WhatsApp notification లో ఆ వివరాలు ఉండవచ్చు; delivery/read status నిర్ధారణ కాదు.</li>
              <li><b>Public placements:</b> approval/configuration ఉన్న చోట profile card చూపించవచ్చు. Public card లో phone number చేర్చకూడదనే విధంగా రూపొందించాం; private-photo setting ను గౌరవించే flows లో photo చూపించము. ఇప్పటికే బయటికి copy/share అయిన content ను తిరిగి తీసుకోలేము.</li>
              <li><b>Messaging/payment providers:</b> WhatsApp/SMS లేదా payment provider configure అయి, సంబంధిత service flow ఉపయోగించినప్పుడు వారు delivery/payment కి అవసరమైన వివరాలు process చేయవచ్చు. వారి privacy terms కూడా వర్తిస్తాయి; configured support number లేకపోతే మేము ఒక number చూపించము.</li>
              <li><b>చట్టపరమైన / service అవసరాలు:</b> సేవ నడపడానికి అవసరమైన providers/operators తో, లేదా applicable law అనుమతించినప్పుడు/అవసరమైనప్పుడు సంబంధిత వివరాలు share చేయవచ్చు.</li>
              <li>❌ మీ వ్యక్తిగత data ని third-party advertising కోసం <b>అమ్మము లేదా అద్దెకు ఇవ్వము</b>.</li>
            </>
          ) : (
            <>
              <li><b>Other members:</b> published profile fields can be visible in public/search views; the private-photo setting suppresses photos only in outputs that honor it. A person receiving an interest request can see the request and sender profile before accepting; after acceptance, contact details appear in accepted-request account views and may be included in a configured WhatsApp notification. Queue/send status does not confirm delivery or reading.</li>
              <li><b>Public placements:</b> profile cards may appear where approval/configuration allows. Public cards are designed not to include phone numbers; flows that honor private-photo settings suppress the photo. Content already copied/shared outside the service cannot be recalled.</li>
              <li><b>Messaging/payment providers:</b> when a WhatsApp/SMS or payment provider is configured and the relevant service flow is used, that provider may process the details needed for delivery/payment. Its own privacy terms also apply; we do not show an unconfigured support number.</li>
              <li><b>Legal/service needs:</b> we may share relevant information with providers/operators needed to run the service, or where applicable law requires or permits it.</li>
              <li>❌ We do not sell or rent personal data for <b>third-party advertising</b>.</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "4. Photo & number privacy (matrimony special)" : "4. Photo & number privacy (matrimony special)"}>
        <ul>
          {te ? (
            <>
              <li><b>Photo private mode:</b> private-photo setting ఉన్నప్పుడు దాన్ని గౌరవించే public outputs లో photo చూపించము. ఇతరులు ముందే copy చేసిన media ను తిరిగి తొలగించలేము.</li>
              <li><b>Watermark:</b> కొన్ని service images పై watermark ఉండవచ్చు; ఇది misuse ను ఆపుతుందని హామీ కాదు.</li>
              <li><b>Contact details:</b> profile owner interest ను accept చేసిన తర్వాత details accepted-request account views లో కనిపిస్తాయి; configured WhatsApp notification లో కూడా ఉండవచ్చు. Queue/send status delivery/read confirmation కాదు; declined request contact access ఇవ్వదు.</li>
              <li>అనుమతి లేని screenshot/share Terms కి విరుద్ధం కావచ్చు. Report లను review చేస్తాం; action మరియు timing మారవచ్చు, automatic ban హామీ లేదు.</li>
            </>
          ) : (
            <>
              <li><b>Private-photo mode:</b> outputs that honor the setting suppress the photo from public display. We cannot remove media already copied by other people.</li>
              <li><b>Watermarks:</b> some service images may carry a watermark; it cannot prevent misuse.</li>
              <li><b>Contact details:</b> after the profile owner accepts an interest request, details appear in accepted-request account views and may be included in a configured WhatsApp notification. Queue/send status does not confirm delivery or reading; a declined request does not grant contact access.</li>
              <li>Unauthorized screenshots/sharing may violate the Terms. Reports are reviewed; actions and timing can vary, and a ban is not automatic or guaranteed.</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "5. Cookies & analytics" : "5. Cookies & analytics"}>
        <ul>
          {te ? (
            <>
              <li>Login/authentication, భాష, referral సమాచారం మరియు draft/preferences కోసం browser <b>local/session storage</b> వాడవచ్చు; కొన్ని secured service flows cookies కూడా వాడవచ్చు.</li>
              <li>Basic service analytics కోసం request path, referrer origin, approved campaign labels మరియు device category నమోదు కావచ్చు. Request IP + browser user-agent నుంచి process-local HMAC pseudonym తయారవుతుంది; raw IP/full user-agent analytics event లో నిల్వ చేయము. ఈ memory-only events గరిష్ఠంగా 30 రోజులు మాత్రమే నిల్వ ఉంటాయి; 10,000 events కు cap ఉంటుంది, process restart అయితే clear అవుతాయి. Infrastructure/provider logs కు వేరు retention ఉండవచ్చు.</li>
              <li>Browser storage clear/disable చేస్తే login, భాష, draft లేదా preference features reset/పని చేయకపోవచ్చు. Analytics గురించి ప్రశ్నల కోసం configured privacy contact ఉంటే దాన్ని వాడండి; contact లేకపోతే guessed address కు details పంపకండి.</li>
            </>
          ) : (
            <>
              <li>Browser <b>local/session storage</b> may hold authentication state, language, referral information, drafts, and preferences; some secured service flows may also use cookies.</li>
              <li>Basic service analytics may record request paths, referrer origins, approved campaign labels, and a coarse device category. A process-local HMAC pseudonym derived from request IP and user-agent may link visits while the process runs; it is pseudonymous, not anonymous. Raw IP and full user-agent are not stored in analytics events. These memory-only events expire after 30 days, are capped at 10,000, and are cleared on process restart. Infrastructure/provider logs may have separate retention.</li>
              <li>Clearing or disabling browser storage can reset or break login, language, draft, or preference features. Use a configured privacy contact below for analytics questions; if none is shown, do not send details to a guessed address.</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "6. Data security" : "6. Data security"}>
        <ul>
          {te ? (
            <>
              <li>OTP flow పూర్తయినప్పుడు phone number verification status మాత్రమే నమోదు అవుతుంది; ఇది identity, profile facts లేదా background verification కాదు. Production connections HTTPS ద్వారా అందించాలి; security controls deployment మీద ఆధారపడతాయి.</li>
              <li>Administrative access configured authentication ద్వారా పరిమితం చేయబడుతుంది. ఏ system కూడా absolute security హామీ ఇవ్వదు.</li>
              <li>Security incident జరిగితే, incident assessment తర్వాత applicable law ప్రకారం అవసరమైన notification/action తీసుకుంటాము; ఇక్కడ fixed 72-hour promise లేదు.</li>
            </>
          ) : (
            <>
              <li>When the OTP flow is completed, we record phone-number verification status; this does not verify identity, profile facts, or background. Production connections should use HTTPS; security controls depend on deployment.</li>
              <li>Administrative access is restricted through configured authentication. No system can guarantee absolute security.</li>
              <li>For a security incident, we assess and take any notification/action required by applicable law; this policy does not promise a fixed 72-hour deadline.</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "7. ఎంత time store చేస్తాం (retention)" : "7. How long we store (retention)"}>
        <ul>
          {te ? (
            <>
              <li><b>Profile records:</b> ప్రస్తుత automated job, configured retention threshold దాటిన profiles ను archive చేసి active records నుంచి తొలగించవచ్చు. Default threshold 3 సంవత్సరాలు <b>profile create చేసిన తేదీ నుంచి</b> (last login నుంచి కాదు); balance/pending payout/active plan/boost ఉన్న కొన్ని profiles skip అవుతాయి.</li>
              <li>ఈ job తొలగించే ముందు profile మరియు సంబంధిత activity కి archive copy తయారు చేస్తుంది. ఆ archive copy కి ప్రస్తుతం నిర్దిష్ట purge కాలం లేదు; కాబట్టి active list నుంచి removal అంటే వెంటనే అన్ని copies erase అయ్యాయని కాదు.</li>
              <li><b>Visitor analytics:</b> 30 రోజుల తర్వాత, 10,000-event cap దాటినప్పుడు oldest entries తొలగిస్తాం; ఇవి application memory లో మాత్రమే ఉంటాయి, process restart తో clear అవుతాయి. Infrastructure/provider log retention వేరుగా ఉండవచ్చు.</li>
              <li><b>Payment, consent, support, safety records:</b> సేవ, dispute handling, security లేదా applicable legal/accounting అవసరాల కోసం అవసరమైనంతకాలం ఉంచవచ్చు. ఇక్కడ verify చేయని 8-year/3-year deadline ను హామీ ఇవ్వము.</li>
            </>
          ) : (
            <>
              <li><b>Profile records:</b> the current automated job may archive profiles beyond the configured retention threshold and remove them from active records. The default threshold is 3 years <b>from profile creation</b>, not from last login; some profiles with balances, pending payouts, active plans, or boosts are skipped.</li>
              <li>The job writes an archive copy of the profile and related activity before removal. A defined purge period for these archive copies is not currently set, so removal from active lists does not mean every copy has been erased.</li>
              <li><b>Visitor analytics:</b> in-memory events expire after 30 days, are capped at 10,000 with oldest entries dropped, and are cleared on process restart. Infrastructure/provider log retention may differ.</li>
              <li><b>Payment, consent, support, and safety records:</b> may be retained as needed for service operation, dispute handling, security, or applicable legal/accounting duties. This policy does not promise unverified 8-year or 3-year deadlines.</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "8. మీ rights (మీ హక్కులు)" : "8. Your rights"}>
        <ul>
          {te ? (
            <>
              <li><b>చూడటం / సవరించడం:</b> account లో అందుబాటులో ఉన్న controls ద్వారా మీ profile ను చూడండి లేదా సవరించండి.</li>
              <li><b>Profile hide/deactivate:</b> My Account లోని control profile ను active public search నుంచి తొలగిస్తుంది; అది అన్ని database/archive records ను erase చేయదు లేదా accepted requests లో ముందే ఇచ్చిన contact access ను revoke చేయదు. Recipients వద్ద copies ఉండవచ్చు.</li>
              <li><b>Access/correction/erasure request:</b> క్రింద owner-configured privacy/grievance contact కనిపిస్తే దానికి request పంపండి. అవసరమైతే identity verify చేసి, applicable law మరియు retained financial/security records ను పరిగణనలోకి తీసుకుంటాం. Configured contact కనిపించకపోతే sensitive documents పంపకండి. Fixed completion time ఇవ్వడం లేదు.</li>
              <li><b>Sharing consent:</b> available privacy controls మార్చండి లేదా future sharing/removal కోసం contact చేయండి. ఇప్పటికే public గా copy అయిన content ను వెనక్కి తీసుకోలేము.</li>
            </>
          ) : (
            <>
              <li><b>View / correct:</b> use the account controls available to view or edit your profile.</li>
              <li><b>Hide/deactivate profile:</b> the My Account control removes the profile from active public search; it does not erase all database/archive records or revoke contact access already granted through accepted requests. Recipients may retain copies.</li>
              <li><b>Access/correction/erasure request:</b> use the owner-configured privacy/grievance contact below if one is shown. We may verify identity and assess the request under applicable law and any necessary financial/security record retention; do not send sensitive documents to a guessed address. No fixed completion time is promised.</li>
              <li><b>Sharing consent:</b> change available privacy controls or contact us to request future-sharing changes/removal. Public content already copied outside the service cannot be recalled.</li>
            </>
          )}
        </ul>
      </Section>

      <Section title={te ? "9. Children & 3rd party links" : "9. Children & 3rd party links"}>
        <ul>
          {te ? (
            <>
              <li>ఈ service <b>18+</b> కి మాత్రమే (bride 18+, groom 21+).</li>
              <li>Payment, messaging, video మరియు vendor destinations third-party services కావచ్చు; వాటి processing వారి privacy notice ప్రకారం జరుగుతుంది.</li>
            </>
          ) : (
            <>
              <li>This service is <b>18+</b> only (bride 18+, groom 21+).</li>
              <li>Payment, messaging, video, and vendor destinations may be third-party services; their processing is covered by their own privacy notices.</li>
            </>
          )}
        </ul>
      </Section>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 text-xs text-gray-700">
        <div className="font-bold text-[#7A0C2E]">🧑‍⚖️ {te ? "గోప్యత, ఫిర్యాదుల సంప్రదింపు" : "Privacy and grievance contact"}</div>
        <div className="mt-2 space-y-1">
          {SITE_CONFIG.owner.name ? <div>{te ? "సంప్రదింపు పేరు" : "Contact name"}: <b>{SITE_CONFIG.owner.name}</b></div> : null}
          {SITE_CONFIG.legal.grievanceOfficer ? <div>{te ? "ఫిర్యాదు అధికారి" : "Grievance officer"}: <b>{SITE_CONFIG.legal.grievanceOfficer}</b></div> : null}
          {SITE_CONFIG.owner.email ? <div>{te ? "ఈమెయిల్" : "Email"}: <a href={`mailto:${SITE_CONFIG.owner.email}`} className="font-semibold text-maroon underline">{SITE_CONFIG.owner.email}</a></div> : null}
          {SITE_CONFIG.owner.contactNumber ? <div>{te ? "కాన్ఫిగర్ చేసిన WhatsApp/ఫోన్" : "Configured WhatsApp/phone"}: <b>{SITE_CONFIG.owner.contactNumber}</b></div> : null}
          {SITE_CONFIG.owner.location ? <div>{te ? "వ్యాపార స్థానం" : "Business location"}: {SITE_CONFIG.owner.location}</div> : null}
          {SITE_CONFIG.supportConfigured
            ? <div>{te ? "ఫిర్యాదులను సమీక్షిస్తాము; స్పందన సమయం మారవచ్చు." : "Complaints are reviewed; response timing may vary."}</div>
            : <div role="status">{te ? "ఈ deployment లో privacy contact configure కాలేదు. Public launch కు ముందు operator నిజమైన contact configure చేసి తనిఖీ చేయాలి." : "No privacy contact is configured for this deployment. The operator must configure and verify a real contact before public launch."}</div>}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 text-xs">
        <Link href="/pricing" className="underline text-[#7A0C2E] font-bold">💰 {te ? "ధరలు" : "Pricing"}</Link>
        <Link href="/terms" className="underline text-[#7A0C2E] font-bold">📄 {te ? "నిబంధనలు" : "Terms"}</Link>
        <Link href="/refund" className="underline text-[#7A0C2E] font-bold">💸 {te ? "వాపసు" : "Refund"}</Link>
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
