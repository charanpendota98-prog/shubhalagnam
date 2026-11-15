"use client";
import { useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/lang";

type Channel = "youtube" | "instagram" | "whatsapp" | "offline";
const playbooks = {
 youtube: { name: "YouTube", tag: "01", en: "Make a helpful walkthrough", te: "ఉపయోగపడే walkthrough చేయండి", prompt: "Show how a family can register, set privacy choices and send an interest request. Never display a real member's private details.", promptTe: "నమోదు, privacy ఎంపికలు, interest request ఎలా చేయాలో చూపండి. నిజమైన సభ్యుల private వివరాలు చూపవద్దు.", tip: "Create one campaign per video. Place a clear referral disclosure in the video and near the link; a description alone may not be enough.", tipTe: "ప్రతి వీడియోకు వేరు campaign. వీడియోలో, link దగ్గర స్పష్టమైన referral disclosure చూపండి; description ఒక్కటే సరిపోకపోవచ్చు." },
 instagram: { name: "Instagram", tag: "02", en: "Explain one useful feature", te: "ఒక ఉపయోగకరమైన feature వివరించండి", prompt: "Try a short reel about profile privacy or free registration. Use your own screen recording or approved materials, not member photos.", promptTe: "Profile privacy లేదా ఉచిత నమోదు గురించి చిన్న reel చేయండి. మీ screen recording లేదా approved materials వాడండి; సభ్యుల photos కాదు.", tip: "Use a separate campaign for each reel or bio placement. Make referral disclosure clear upfront and use the platform's disclosure tools where required.", tipTe: "ప్రతి reel లేదా bio కోసం వేరు campaign. మొదటే referral disclosure చూపండి; అవసరమైన platform disclosure tools వాడండి." },
 whatsapp: { name: "WhatsApp", tag: "03", en: "Share with permission", te: "అనుమతితో పంచుకోండి", prompt: "Introduce the service to a family that wants to hear about it. Explain free registration, interest-request credits and owner-controlled contact access.", promptTe: "ఆసక్తి ఉన్న కుటుంబానికి పరిచయం చేయండి. ఉచిత నమోదు, interest-request credits, owner అనుమతితో contact access గురించి చెప్పండి.", tip: "Share only where welcomed, include your referral disclosure and stop if asked. No bulk unsolicited groups, scraped numbers or pressure to pay.", tipTe: "సమ్మతి ఉన్న చోటే share చేయండి, referral disclosure జోడించండి. అడిగితే ఆపండి. Bulk spam, సేకరించిన numbers లేదా చెల్లించమని ఒత్తిడి వద్దు." },
 offline: { name: "QR / offline", tag: "04", en: "Give your link a place", te: "మీ link కోసం QR పెట్టండి", prompt: "Use your downloadable campaign QR at your own counter or an approved event. Keep the code large and leave space around it so people can scan.", promptTe: "మీ counter లేదా అనుమతి ఉన్న event లో campaign QR వాడండి. Scan అయ్యేలా పెద్దగా, చుట్టూ ఖాళీతో ఉంచండి.", tip: "Print the referral disclosure beside the QR. Ask the venue before placing materials. A scan is a recorded click, not a registration or promised reward.", tipTe: "QR పక్కన referral disclosure ముద్రించండి. Venue అనుమతి తీసుకోండి. Scan అంటే click మాత్రమే; నమోదు లేదా reward హామీ కాదు." },
};

export function CreatorClubPlaybook() {
 const te=useLang().lang==="te";const [channel,setChannel]=useState<Channel>("youtube");const p=playbooks[channel];
 return <section aria-label="Creator channel playbook" className="min-w-0 rounded-3xl border border-amber-200 bg-white p-5 sm:p-7">
  <p className="text-xs font-bold uppercase tracking-widest text-[#7A0C2E]">{te?"మీ channel · మీ శైలి":"Your channel · your style"}</p>
  <h2 className="mt-2 text-xl font-extrabold text-slate-900">{te?"మొదటి content idea ఎంచుకోండి":"Find your first content idea"}</h2>
  <p className="mt-2 text-sm text-slate-600">{te?"ఇవి సూచనలు మాత్రమే. ఏ post లేదా message automatic గా పంపబడదు.":"A starting point, not a script you must use. Nothing is posted or sent automatically."}</p>
  <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" role="group" aria-label="Choose a creator channel">{(Object.keys(playbooks) as Channel[]).map(k=><button type="button" key={k} aria-pressed={channel===k} onClick={()=>setChannel(k)} className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-bold ${channel===k?"border-[#7A0C2E] bg-[#7A0C2E] text-white":"border-slate-300 bg-white text-slate-700"}`}>{playbooks[k].name}</button>)}</div>
  <div className="mt-5 rounded-2xl bg-[#FFF8E7] p-4 sm:p-5" aria-live="polite"><p className="text-xs font-bold text-[#7A0C2E]">{p.name} / {p.tag}</p><h3 className="mt-2 text-lg font-extrabold text-slate-900">{te?p.te:p.en}</h3><p className="mt-2 text-sm leading-relaxed text-slate-700">{te?p.promptTe:p.prompt}</p><p className="mt-4 border-t border-amber-200 pt-4 text-sm leading-relaxed text-slate-700">{te?p.tipTe:p.tip}</p></div>
 </section>;
}

export function CreatorClubWelcome() {
 const te=useLang().lang==="te";
 return <section aria-label="Join Manavivaha Creator Club" className="space-y-5">
  <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
   <div className="rounded-3xl border border-amber-200 bg-white p-5 sm:p-7"><p className="text-xs font-bold uppercase tracking-widest text-[#7A0C2E]">{te?"పరిచయం నుంచి ప్రయాణం వరకు":"From introduction to action"}</p><h2 className="mt-2 text-2xl font-extrabold text-slate-900">{te?"మంచి పరిచయానికి మీరే మొదటి అడుగు.":"Be the start of a thoughtful introduction."}</h2><p className="mt-3 text-sm leading-relaxed text-slate-600">{te?"కుటుంబాలు, content creators, community connectors కోసం. మీ link, ప్రతి video campaign, నమోదు లెక్కలు, అర్హమైన rewards ఒకే చోట.":"For families, content creators and community connectors. Your link, video campaigns, recorded registrations and eligible rewards, together."}</p>
    <div className="mt-5 flex flex-col gap-3 sm:flex-row"><Link href="/referral/register" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#7A0C2E] px-5 py-3 text-center text-sm font-bold text-white">{te?"Creator Club లో చేరండి":"Join Creator Club"}</Link><Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-center text-sm font-bold text-[#7A0C2E]">{te?"సభ్యునిగా సైన్ ఇన్":"Member sign in"}</Link></div>
    <p className="mt-3 text-xs text-slate-600">{te?"Member sign in తర్వాత Referral కి రండి. Partner ID ఉంటే registration పేజీలో dashboard తెరవండి.":"After member sign in, return to Referral. Already have a partner ID? Open your dashboard on the registration page."}</p>
   </div>
   <ol className="space-y-3 rounded-3xl bg-[#F4ECE1] p-5 sm:p-7">{[
    ["01",te?"మీ creator link సిద్ధం":"Get your creator link",te?"సభ్యునిగా సైన్ ఇన్ చేయండి లేదా partner ID సృష్టించండి.":"Sign in as a member or create a partner ID."],
    ["02",te?"ప్రతి content కు ఒక campaign":"One campaign per piece of content",te?"Video/channel కోసం link + QR; disclosure తో పంచుకోండి.":"Make a link and QR for your video or channel. Share with disclosure."],
    ["03",te?"ఏది పనిచేస్తుందో చూడండి":"See what leads to action",te?"Clicks, registrations, eligible rewards వేర్వేరుగా చూడండి.":"Keep clicks, registrations and eligible rewards separate."],
   ].map(([n,title,text])=><li key={n} className="flex gap-3 rounded-2xl bg-white p-4"><span className="shrink-0 text-sm font-extrabold text-[#7A0C2E]">{n}</span><div><h3 className="text-sm font-extrabold text-slate-900">{title}</h3><p className="mt-1 text-sm leading-relaxed text-slate-600">{text}</p></div></li>)}</ol>
  </div>
  <CreatorClubPlaybook/>
 </section>;
}

type Tier={key:string;min:number;icon?:string};
export function CreatorClubProgress({dashboard,stale}:{dashboard:{stats?:{paid_count?:number};tiers?:Tier[];tier?:Tier};stale:boolean}) {
 const te=useLang().lang==="te";
 // Use only server-supplied thresholds and recorded counts; missing means unknown.
 const count=dashboard.stats?.paid_count;const tiers=Array.isArray(dashboard.tiers)?dashboard.tiers.filter(x=>Number.isFinite(x.min)&&x.min>=0&&typeof x.key==='string').slice().sort((a,b)=>a.min-b.min):[];
 if(typeof count!=="number"||!Number.isFinite(count)||count<0||!tiers.length)return null;
 const achieved=tiers.filter(x=>count>=x.min);const current=achieved.at(-1);const next=tiers.find(x=>x.min>count);
 if(!current)return null;
 const progress=next?Math.max(0,Math.min(100,((count-current.min)/(next.min-current.min))*100)):100;
 return <section aria-label="Creator Club badge progress" className="min-w-0 rounded-3xl border border-amber-200 bg-white p-5 sm:p-7">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-[#7A0C2E]">Manavivaha Creator Club</p><h2 className="mt-2 text-xl font-extrabold text-slate-900">{te?"మీ creator ప్రయాణం":"Your creator journey"}</h2></div><span className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-extrabold text-[#7A0C2E]">{current.icon} {current.key}</span></div>
  {stale&&<p role="status" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">{te?"ఈ progress పాత snapshot కావచ్చు. తాజా వివరాల కోసం Refresh చేయండి.":"This progress may be from an older snapshot. Refresh your details before relying on it."}</p>}
  <p className="mt-4 text-lg font-bold text-slate-900">{next?(te?`${next.key} badge కోసం ఇంకా ${next.min-count} qualifying rewards`:`${next.min-count} qualifying reward${next.min-count===1?"":"s"} to ${next.key}`):(te?"అత్యధిక ప్రస్తుత badge చేరుకున్నారు.":"You've reached the highest current badge.")}</p>
  <p className="mt-1 text-sm text-slate-600">{count} {te?"నమోదైన qualifying rewards. Registrations లేదా clicks కాదు.":"recorded qualifying rewards. Not registrations or clicks."}</p>
  <div role="progressbar" aria-label={te?"తదుపరి badge progress":"Progress to next badge"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-valuetext={next?`${count} qualifying rewards, ${next.min-count} to ${next.key}`:`${current.key}, highest current badge`} className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#7A0C2E]" style={{width:`${progress}%`}}/></div>
  <ol className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-5">{tiers.map(t=><li key={t.key} className={`rounded-xl border p-3 text-sm ${count>=t.min?"border-amber-300 bg-amber-50 text-[#7A0C2E]":"border-slate-200 text-slate-600"}`}><span className="block font-extrabold">{t.icon} {t.key}</span><span className="mt-1 block text-xs">{t.min} {te?"qualifying rewards నుంచి":"qualifying rewards"} · {count>=t.min?(te?"చేరుకున్నారు":"Reached"):(te?"ఇంకా చేరలేదు":"Not reached")}</span></li>)}</ol>
  <p className="mt-4 text-xs leading-relaxed text-slate-600">{te?"Badge గుర్తింపు మాత్రమే. అదనపు cash, credits, commission, support లేదా ఇతర perk లేదు. Refunds వల్ల rewards, badge మారవచ్చు.":"Badges are recognition only. No extra cash, credits, commission, support or other perks. Refunds can change reward counts and badges."}</p>
  <a href="#creator-campaigns" className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-[#7A0C2E] px-4 py-2 text-sm font-bold text-white">{te?"మీ తదుపరి campaign సృష్టించండి":"Create your next campaign"}</a>
 </section>;
}
