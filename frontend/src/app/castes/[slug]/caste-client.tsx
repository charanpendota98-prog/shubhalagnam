"use client";

/** /castes/[slug] body — neat Telugu / clean English via toggle (SEO shell stays server). */
import Link from "next/link";
import { CASTES, buildSlug } from "@/lib/seo-pages";
import { ALL_CHANNELS, CHANNEL_STATS } from "@/lib/channels";
import { TelegramIcon, WhatsAppIcon } from "@/components/BrandIcons";
import { useLang } from "@/lib/lang";
import { stateFullName } from "@/lib/telugu-data";
import { resolveChannelLinks, useChannelDirectoryLinks } from "@/lib/channel-links";

type Caste = {
  key: string; name: string; split?: boolean;
  username?: string; link?: string;
  bride?: { username?: string; link?: string };
  groom?: { username?: string; link?: string };
};
type District = { slug: string; name: string; state: string };
type Chan = {
  key?: string; name?: string; username?: string; link?: string; deepLink?: string;
  desc?: string; routingEligible?: boolean; wave?: number; hashtags?: string[];
};

export default function CasteClient({ caste, role, district, chan, otherChan }: {
  caste: Caste; role: "bride" | "groom"; district: District | null;
  chan: Chan | null; otherChan: Chan | null;
}) {
  const { lang } = useLang();
  const te = lang === "te";
  const channelDirectory = useChannelDirectoryLinks();
  const currentChannel = ALL_CHANNELS.find((item) => item.key === chan?.key);
  const otherChannel = ALL_CHANNELS.find((item) => item.key === otherChan?.key);
  const currentLinks = currentChannel
    ? resolveChannelLinks(currentChannel, channelDirectory)
    : { telegram: "", whatsapp: "", whatsappIsDirect: false };
  const otherLinks = otherChannel
    ? resolveChannelLinks(otherChannel, channelDirectory)
    : { telegram: "", whatsapp: "", whatsappIsDirect: false };
  const otherRole = role === "bride" ? "groom" : "bride";
  const roleTelugu = role === "bride" ? "పెళ్లి కూతురు (Bride)" : "పెళ్లి కొడుకు (Groom)";
  const myChanLabel = `${caste.name} ${role === "bride" ? "Brides" : "Grooms"}`;
  const otherChanLabel = `${caste.name} ${role === "bride" ? "Grooms" : "Brides"}`;
  const roleEn = role === "bride" ? "Bride" : "Groom";
  const where = district ? `${district.name}, ${stateFullName(district.state, te)}` : te ? "Telangana + Andhra Pradesh" : "Telangana + Andhra Pradesh";
  const sameCasteOtherRole = buildSlug(caste.key, role === "bride" ? "groom" : "bride", district?.slug);

  return (
    <div className="min-h-dvh">
      <section className="maroon-gradient text-white">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <nav className="text-[11px] opacity-90 flex gap-2 flex-wrap">
            <Link href="/" className="underline">{te ? "Home" : "Home"}</Link><span>/</span>
            <Link href="/castes" className="underline">{te ? "Castes" : "Castes"}</Link><span>/</span>
            <span>{caste.name} {role}</span>
          </nav>
          <h1 className="mt-3 text-2xl md:text-4xl font-bold">
            {caste.name} {role === "bride" ? "Bride" : "Groom"} Matrimony — {district ? district.name : "TS & AP"}
          </h1>
          <p className="mt-2 text-[13px] md:text-sm opacity-90 telugu max-w-3xl">
            {te ? (
              <>{caste.name} {roleTelugu} సంబంధాలు — {where}. సభ్యులు అందించిన profile వివరాలు; వ్యక్తిగత వివరాలు స్వతంత్రంగా ధృవీకరించబడవు. Phone OTP పూర్తయితే అది phone access నే సూచిస్తుంది, DOB verification కాదు. అంగీకారం తర్వాత contact వివరాలు పంచుకునే ముందు స్వయంగా నిర్ధారించుకోండి.</>
            ) : (
              <>{caste.name} {roleEn} matches — {where}. Profiles are member-submitted; personal details are not independently verified. Phone OTP, when completed, confirms access to a number—not DOB or identity. Confirm details independently before sharing contact information.</>
            )}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/register" className="gold-gradient text-maroon font-bold text-sm px-5 py-3 rounded-xl hover-lift">
              {te ? "📝 FREE గా register చెయ్యండి" : "📝 Register FREE"}
            </Link>
            {currentLinks.telegram ? (
              <a href={currentLinks.telegram} target="_blank" rel="noopener noreferrer" className="bg-white/10 border border-white/25 font-bold text-sm px-5 py-3 rounded-xl">
                📢 {te ? `${myChanLabel} — listed link` : `Open listed ${myChanLabel} link`}
              </a>
            ) : (
              <span className="bg-white/10 border border-white/25 font-bold text-sm px-5 py-3 rounded-xl">📢 {te ? "Channel link అందుబాటులో లేదు" : "Channel link not listed"}</span>
            )}
            <Link href="/requests" className="bg-white/10 border border-white/25 font-bold text-sm px-5 py-3 rounded-xl">
              {te ? "💌 Requests dashboard" : "💌 Requests dashboard"}
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold">
            <span className="bg-white/10 border border-white/20 px-3 py-1 rounded-full">{te ? "OTP = ఫోన్ నంబర్ యాక్సెస్ మాత్రమే" : "Phone OTP (if completed) ≠ identity verification"}</span>
            <span className="bg-white/10 border border-white/20 px-3 py-1 rounded-full">{te ? "పుట్టిన తేదీ సభ్యుడు అందించినది" : "DOB supplied by member"}</span>
            <span className="bg-white/10 border border-white/20 px-3 py-1 rounded-full">{te ? "ఫోటో గోప్యతా నియంత్రణలు ఐచ్ఛికం" : "Optional photo privacy controls"}</span>
            <span className="bg-white/10 border border-white/20 px-3 py-1 rounded-full">{te ? "₹99 → 5 requests" : "₹99 → 5 requests"}</span>
            <span className="bg-white/10 border border-white/20 px-3 py-1 rounded-full">{te ? "తిరస్కరించిన requests: refund policy" : "Declined requests: credit-refund policy"}</span>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-8 grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <section className="bg-white rounded-2xl p-5 card-shadow border border-gold/20">
            <h2 className="text-lg font-bold text-maroon">
              {te ? <>{caste.name} {role === "bride" ? "Brides" : "Grooms"} ని ఎలా చూడాలి?</>
                  : <>How to see {caste.name} {role === "bride" ? "Brides" : "Grooms"}?</>}
            </h2>
            <ol className="mt-3 space-y-2 text-[13px] text-gray-700 list-decimal list-inside">
              {te ? (
                <>
                  <li><b>FREE register</b> — personal, family, caste/astro, education, location + photo.</li>
                  <li><b>Profile post:</b> profile ఆమోదం తర్వాత, publisher settings అనుమతిస్తే <b>{myChanLabel}</b> వంటి సంబంధిత destination కు post queue కావచ్చు; delivery హామీ కాదు.</li>
                  <li><b>💌 Interest పంపండి:</b> notification అందుబాటులో ఉన్న service configuration మీద ఆధారపడి ఉంటుంది.</li>
                  <li><b>✅ Accept అయితే:</b> accepted-request account views లో contact details కనిపిస్తాయి; notification delivery హామీ లేదు. స్వయంగా నిర్ధారించుకోండి.</li>
                </>
              ) : (
                <>
                  <li><b>Register FREE</b> — personal, family, caste/astro, education, location + photo.</li>
                  <li><b>Profile post:</b> after approval, a post may be queued for relevant destinations such as <b>{myChanLabel}</b> if publishing is configured. Delivery is not guaranteed.</li>
                  <li><b>💌 Send interest:</b> notification delivery depends on the available service configuration.</li>
                  <li><b>✅ On accept:</b> contact details appear in accepted-request account views; notification delivery is not guaranteed. Verify independently.</li>
                </>
              )}
            </ol>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/register" className="maroon-gradient text-white font-bold text-[13px] px-4 py-2.5 rounded-xl">
                {te ? "Register FREE" : "Register FREE"}
              </Link>
              <Link href={`/castes/${sameCasteOtherRole}`} className="border border-maroon/30 text-maroon font-bold text-[13px] px-4 py-2.5 rounded-xl">
                {te ? <>{caste.name} {role === "bride" ? "Grooms" : "Brides"} చూడండి →</>
                    : <>See {caste.name} {role === "bride" ? "Grooms" : "Brides"} →</>}
              </Link>
            </div>
          </section>

          <section className="bg-white rounded-2xl p-5 card-shadow border border-gold/20">
            <h2 className="text-lg font-bold text-maroon">
              {te ? <>ఎందుకు caste-wise channel ({caste.name})?</> : <>Why a caste-wise channel ({caste.name})?</>}
            </h2>
            {caste.split ? (
              <div className="mt-2 bg-white border border-gold/30 rounded-2xl p-3 text-[12px] text-gray-700">
                {te ? (
                  <>⭐ <b>{caste.name} కి bride + groom channels separate గా ఉన్నాయి</b> (caste ప్రకారం) —{" "}
                    {role === "bride" ? "మీరు ఇప్పుడు చూస్తున్నది" : "bride page"} <b>{myChanLabel}</b>,{" "}
                    {role === "bride" ? "groom" : "మీ"} page <b>{otherChanLabel}</b>.{" "}
                    <Link className="underline font-bold text-maroon" href={`/castes/${buildSlug(caste.key, otherRole, district?.slug)}`}>
                      {otherRole === "bride" ? "Brides" : "Grooms"} page చూడండి →
                    </Link></>
                ) : (
                  <>⭐ <b>{caste.name} has separate bride + groom channels</b> (caste-wise) —{" "}
                    {role === "bride" ? "you are viewing" : "the bride page"} <b>{myChanLabel}</b>,{" "}
                    {role === "bride" ? "the groom" : "your"} page is <b>{otherChanLabel}</b>.{" "}
                    <Link className="underline font-bold text-maroon" href={`/castes/${buildSlug(caste.key, otherRole, district?.slug)}`}>
                      See {otherRole === "bride" ? "Brides" : "Grooms"} page →
                    </Link></>
                )}
              </div>
            ) : null}
            <p className="mt-2 text-[13px] text-gray-700 leading-relaxed">
              {te ? (
                <>పబ్లిక్ directory లో {CHANNEL_STATS.by_tier.L3_CASTE} community listings ఉన్నాయి. వాటికి invite links లేదా external availability నిర్ధారించబడలేదు.</>
              ) : (
                <>The channel registry contains {CHANNEL_STATS.by_tier.L3_CASTE} caste-specific destinations. A post may be queued for relevant destinations after profile approval only when publishing is configured and has access; delivery or reach is not guaranteed. External link availability is not checked automatically.</>
              )}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              {(chan?.hashtags || []).slice(0, 6).map((h) => (
                <span key={h} className="bg-cream border border-gold/30 px-2 py-0.5 rounded-full text-gray-700">{h}</span>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="bg-navy text-white rounded-2xl p-5 card-shadow">
            <div className="flex items-center justify-between gap-2">
              <div className="font-bold leading-tight">{myChanLabel}</div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap bg-white/10 text-white/80">
                {te ? "లిస్టులో ఉంది" : "LISTED"}
              </span>
            </div>
            <div className="text-[11px] opacity-70 mt-0.5">
              {te ? "Channel link availability ఆటోమేటిక్‌గా తనిఖీ చేయబడదు" : "Channel link availability is not checked automatically"}
            </div>
            <div className="mt-3 space-y-2">
              {currentLinks.telegram ? (
                <a href={currentLinks.telegram} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-[#229ED9] text-white font-bold text-[13px] py-2.5 rounded-xl shadow-soft hover:brightness-110 active:scale-[0.97] transition">
                  <TelegramIcon className="w-4 h-4" mono />
                  {te ? "లిస్టు చేసిన Telegram link తెరవండి" : "Open listed Telegram link"}
                </a>
              ) : null}
              {currentLinks.whatsapp ? (
                <a href={currentLinks.whatsapp} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-[#128C4A] to-[#20bd5a] text-white font-bold text-[13px] py-2.5 rounded-xl shadow-soft hover:brightness-105 active:scale-[0.97] transition"
                  title={te ? "బాహ్య WhatsApp లింక్; availability తనిఖీ చేయబడదు" : "External WhatsApp link; availability is not checked"}>
                  <WhatsAppIcon className="w-4 h-4" mono />
                  {currentLinks.whatsappIsDirect
                    ? (te ? "లిస్టు చేసిన WhatsApp channel తెరవండి" : "Open listed WhatsApp channel")
                    : (te ? "Configured WhatsApp support తెరవండి" : "Open configured WhatsApp support")}
                </a>
              ) : (
                <div className="rounded-xl border border-white/20 px-3 py-2 text-center text-[11px] text-white/75">
                  {te ? "WhatsApp destination లిస్టులో లేదు" : "No WhatsApp destination listed"}
                </div>
              )}
              {otherLinks.telegram ? (
                <a href={otherLinks.telegram} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full border border-white/25 text-white font-bold text-[12px] py-2 rounded-xl hover:bg-white/10 transition">
                  <TelegramIcon className="w-3.5 h-3.5" mono />
                  {te ? `${otherChanLabel} — listed Telegram link` : `${otherChanLabel} — listed Telegram link`}
                </a>
              ) : null}
            </div>
            <p className="mt-2 text-[10px] leading-relaxed opacity-70">{te ? "లింకులు directory లో ఉన్నవి మాత్రమే; external availability తనిఖీ చేయబడదు." : "Links are directory listings; external availability is not checked."}</p>
            <Link href="/channels" className="mt-3 block text-center text-[11px] underline underline-offset-2 opacity-80 hover:opacity-100">
              {te ? <>అన్ని {CHANNEL_STATS.total} channels →</> : <>All {CHANNEL_STATS.total} channels →</>}
            </Link>
          </div>

          <RelatedCastes te={te} casteKey={caste.key} role={role} districtSlug={district?.slug} />

          <div className="bg-white rounded-2xl p-5 card-shadow border border-gold/20">
            <div className="font-bold text-maroon text-[14px]">
              {te ? "పారదర్శక ధరలు (Direct Connect Pricing)" : "Transparent Pricing (Direct Connect)"}
            </div>
            <ul className="mt-2 text-[12px] text-gray-700 space-y-1">
              <li>{te ? <>🎁 మొదటి <b>3 interest requests FREE</b></> : <>🎁 First <b>3 interest requests FREE</b></>}</li>
              <li>₹99 → <b>5 interest requests</b> (₹20/request)</li>
              <li>₹199 → <b>12 interest requests</b></li>
              <li>₹299 → <b>25 interest requests</b></li>
              <li>₹499 → <b>50 interest requests</b></li>
            </ul>
            <Link href="/requests" className="mt-3 block text-center maroon-gradient text-white font-bold text-[12px] py-2.5 rounded-xl">
              {te ? "Plans చూడండి →" : "See plans →"}
            </Link>
          </div>
        </aside>
      </div>

      <section className="max-w-5xl mx-auto px-4 pb-10">
        <div className="bg-white rounded-2xl p-5 card-shadow border border-gold/20">
          <h2 className="text-lg font-bold text-maroon">{caste.name} {role} — FAQ</h2>
          <div className="mt-3 space-y-3 text-[13px]">
            <div>
              <div className="font-bold text-ink">{te ? "Charge ఎంత?" : "How much does it cost?"}</div>
              <div className="text-gray-600">
                {te ? "Register FREE. మొదటి 3 interest requests FREE. తర్వాత ₹99 → 5 interest requests (₹20/request), ₹499 → 50 (₹10/request)."
                    : "Registration is FREE. First 3 interest requests FREE. Then ₹99 → 5 interest requests (₹20/request), ₹499 → 50 (₹10/request)."}
              </div>
            </div>
            <div>
              <div className="font-bold text-ink">{te ? "Chatting ఉందా?" : "Is there chatting?"}</div>
              <div className="text-gray-600">
                {te ? "ఈ పేజీలో chatting లేదు. Interest notification delivery హామీ లేదు. Owner accept చేసిన తర్వాత accepted-request account views లో contact details కనిపిస్తాయి; decline credit return account policy ప్రకారం ఉంటుంది."
                    : "There is no in-site chat. Notification delivery is not guaranteed. Owner acceptance grants contact access in accepted-request account views; decline credit returns follow account policy."}
              </div>
            </div>
            <div>
              <div className="font-bold text-ink">{te ? "నా profile ఎక్కడ post అవుతుంది?" : "Where does my profile get posted?"}</div>
              <div className="text-gray-600">
                {te ? <>Profile ఆమోదం తర్వాత, publishing service configured అయి channel access ఉంటే {myChanLabel} వంటి సంబంధిత destination కు post queue కావచ్చు. Delivery హామీ కాదు; availability ఆటోమేటిక్‌గా check చేయబడదు.</>
                    : <>After profile approval, a post may be queued for relevant destinations such as {myChanLabel} if publishing is configured and has channel access. Delivery is not guaranteed, and availability is not checked automatically.</>}
              </div>
            </div>
            <div>
              <div className="font-bold text-ink">
                {te ? <>{caste.name} వేద గుణమేళనం / జాతక పొంతన ఉందా?</> : <>Is there {caste.name} Vedic Gunamelanam check?</>}
              </div>
              <div className="text-gray-600">
                {te ? "అవును — వేద గుణమేళనం (రాశి, నక్షత్ర, గణ, యోని, రజ్జు, వేధ…) రిపోర్ట్ ఉచితంగా /porutham లో చూడొచ్చు."
                    : "Yes — the Vedic Gunamelanam (rasi, nakshatra, gana, yoni, rajju, vedha…) report is free to view in /porutham."}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function RelatedCastes({ te, casteKey, role, districtSlug }: {
  te: boolean; casteKey: string; role: "bride" | "groom"; districtSlug?: string;
}) {
  const related = CASTES.filter((c) => c.key !== casteKey).slice(0, 10);
  return (
    <div className="bg-white rounded-2xl p-5 card-shadow border border-gold/20">
      <div className="font-bold text-maroon text-[14px]">{te ? "వేరే castes" : "Other castes"}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {related.map((c) => (
          <Link key={c.key} href={`/castes/${buildSlug(c.key, role, districtSlug)}`}
            className="text-[11px] bg-cream border border-gold/25 rounded-full px-2.5 py-1">
            {c.name}
          </Link>
        ))}
      </div>
      <Link href="/castes" className="mt-3 block text-[12px] font-bold text-maroon underline">
        {te ? "కమ్యూనిటీ డైరెక్టరీ చూడండి →" : "Browse community directory →"}
      </Link>
    </div>
  );
}
