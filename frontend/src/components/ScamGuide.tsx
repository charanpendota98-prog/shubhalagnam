"use client";

/**
 * Display-only guide on /safety: four common matrimony scams, what they look
 * like and what to do. It reads nothing, stores nothing and adds no access.
 */
import Link from "next/link";
import { useLang } from "@/lib/lang";

type Scam = { title: string; sign: string; act: string };

export default function ScamGuide() {
  const { lang } = useLang();
  const te = lang === "te";
  const scams: Scam[] = te
    ? [
        { title: "నకిలీ ప్రొఫైల్ డబ్బు అడగడం", sign: "కొద్ది రోజుల్లోనే ప్రేమగా మాట్లాడి, అత్యవసరం అని చెప్పి డబ్బు అడుగుతారు.", act: "డబ్బు పంపకండి. చాట్ స్క్రీన్‌షాట్లు దాచుకుని, ఆ ప్రొఫైల్‌ను రిపోర్ట్ చేయండి." },
        { title: "కస్టమ్స్ / గిఫ్ట్ మోసం", sign: "విదేశం నుంచి బహుమతి పంపామని, కస్టమ్స్ లేదా డెలివరీ ఫీజు కట్టమని అడుగుతారు.", act: "ఏ ఫీజూ కట్టకండి. ఇది మోసమే అయ్యే అవకాశం ఎక్కువ. మీ పెద్దలకు చెప్పి రిపోర్ట్ చేయండి." },
        { title: "NRI అత్యవసర డబ్బు అభ్యర్థన", sign: "విదేశంలో ఆసుపత్రి, ప్రయాణ సమస్య, లేదా వీసా సమస్య అని చెప్పి వెంటనే డబ్బు అడుగుతారు.", act: "ఎంత అత్యవసరం అన్నా డబ్బు పంపకండి. వారి కుటుంబాన్ని మీకు తెలిసిన మార్గంలో నేరుగా సంప్రదించండి." },
        { title: "నకిలీ వెరిఫికేషన్ లింక్", sign: "“వెరిఫై చేయడానికి” అని ఒక లింక్ పంపి, ఆధార్, PAN, బ్యాంక్ వివరాలు లేదా OTP అడుగుతారు.", act: "లింక్ తెరవకండి. OTP ఎవరికీ చెప్పకండి. ID వివరాలు ఈ సైట్‌లోని వెరిఫికేషన్ ఫారమ్‌లో మాత్రమే ఇవ్వండి." },
      ]
    : [
        { title: "Fake profile asking for money", sign: "Talks warmly for a few days, then asks for money and says it is urgent.", act: "Do not send money. Keep screenshots of the chat and report the profile." },
        { title: "Customs or gift fraud", sign: "Says a gift was sent from abroad and asks you to pay a customs or delivery fee.", act: "Do not pay any fee. Tell your family and report the profile." },
        { title: "NRI emergency money request", sign: "Says there is a hospital, travel or visa problem abroad and asks for money right away.", act: "Do not send money, however urgent it sounds. Contact their family directly through a way you already know." },
        { title: "Fake verification link", sign: "Sends a link “to verify you” and asks for Aadhaar, PAN, bank details or an OTP.", act: "Do not open the link. Never share an OTP. Give ID details only in this site's own verification form." },
      ];
  return (
    <section data-testid="scam-guide" aria-label={te ? "సాధారణ మోసాలు మరియు ఏం చేయాలి" : "Common scams and what to do"}
      className="bg-white rounded-[1.5rem] border border-gold/25 p-5">
      <h2 className={`font-bold text-maroon text-[16px] ${te ? "telugu" : ""}`}>
        {te ? "సాధారణ మోసాలు మరియు ఏం చేయాలి" : "Common scams and what to do"}
      </h2>
      <ul className="mt-3 grid md:grid-cols-2 gap-3">
        {scams.map((s) => (
          <li key={s.title} className={`bg-cream rounded-2xl p-3 border border-gold/25 ${te ? "telugu" : ""}`}>
            <h3 className="font-bold text-[13px] text-ink">{s.title}</h3>
            <p className="mt-1 text-[12px] text-gray-700"><span className="font-bold">{te ? "ఎలా ఉంటుంది: " : "What it looks like: "}</span>{s.sign}</p>
            <p className="mt-1 text-[12px] text-gray-700"><span className="font-bold">{te ? "ఏం చేయాలి: " : "What to do: "}</span>{s.act}</p>
          </li>
        ))}
      </ul>
      <p className={`mt-3 text-[12px] text-gray-700 ${te ? "telugu" : ""}`}>
        {te ? "అనుమానం వస్తే ఈ పేజీలోని రిపోర్ట్ ఫారమ్‌తో రిపోర్ట్ చేయండి. ఈ పేజీ సాధారణ సూచనలు మాత్రమే, ఎవరైనా నిజమైనవారని హామీ కాదు." : "If something feels wrong, use the report form on this page. This is general guidance, not a guarantee that any person is genuine."}
      </p>
      <Link href="/verify" className="mt-2 inline-flex min-h-11 items-center text-[13px] font-bold text-maroon underline">
        {te ? "వెరిఫికేషన్ పేజీ" : "Verification page"}
      </Link>
    </section>
  );
}
