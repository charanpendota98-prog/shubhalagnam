"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import Image from "next/image";
import { authHeaders, readApiJson } from "@/lib/api";
import { useLang } from "@/lib/lang";
import { SITE_CONFIG } from "@/lib/site-config";
type Campaign = {id:string;name:string;channel:string;status:string;link:string;clicks:number;registrations:number;eligible_rewards:number;recorded_earnings_inr:number;disclosure_en:string;disclosure_te:string};
const campaignObject=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==="object"&&!Array.isArray(value);
function validCampaign(value:unknown):value is Campaign {
 if(!campaignObject(value)||typeof value.id!=="string"||!/^[A-Za-z0-9_-]{24}$/.test(value.id)||typeof value.name!=="string"||Array.from(value.name.trim()).length<2||Array.from(value.name).length>60||/[\x00-\x1f<>{}]/.test(value.name)||!["youtube","instagram","whatsapp","telegram","website","other"].includes(String(value.channel))||!["active","paused","archived"].includes(String(value.status)))return false;
 if(typeof value.link!=="string"||value.link.trim()!==value.link||/[\x00-\x20\x7f\\]/.test(value.link))return false;
 try{const link=new URL(value.link),site=new URL(SITE_CONFIG.siteUrl);if(link.protocol!=="https:"||link.origin!==site.origin||link.username||link.password||link.hash||!/^\/r\/[A-Z0-9_-]{1,80}$/.test(link.pathname)||link.searchParams.get("campaign")!==value.id||[...link.searchParams].length!==1)return false;}catch{return false;}
 return ["disclosure_en","disclosure_te"].every(k=>typeof value[k]==="string"&&String(value[k]).trim().length>0);
}
function validCampaignList(data:unknown):data is {success:true;campaigns:Campaign[]} {
 if(!campaignObject(data)||data.success!==true||!Array.isArray(data.campaigns)||data.campaigns.length>100)return false;
 const ids=new Set<string>();return data.campaigns.every((row:unknown)=>{
  if(!validCampaign(row)||ids.has(row.id))return false;ids.add(row.id);
  if(![row.clicks,row.registrations,row.eligible_rewards].every(n=>Number.isSafeInteger(n)&&n>=0)||typeof row.recorded_earnings_inr!=="number"||!Number.isFinite(row.recorded_earnings_inr)||row.recorded_earnings_inr<0)return false;
  return true;
 });
}
function CampaignQR({link,te}:{link:string;te:boolean}) {
 const [url,setUrl]=useState("");
 useEffect(()=>{let active=true;QRCode.toDataURL(link,{width:224,margin:4,errorCorrectionLevel:"M"}).then(x=>{if(active)setUrl(x);}).catch(()=>{});return()=>{active=false;};},[link]);
 return <details><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">{te?"ప్రచార లింక్ క్యూఆర్ చూడండి":"Show campaign QR"}</summary>{url?<div className="space-y-2"><Image src={url} alt={te?"ఈ ప్రచార నమోదు లింక్ కోసం క్యూఆర్":"QR for this campaign registration link"} width={224} height={224} unoptimized/><a href={url} download="manavivaha-campaign-qr.png" className="inline-block min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold">{te?"క్యూఆర్ డౌన్‌లోడ్":"Download QR"}</a><p className="text-xs text-slate-600">{te?"పంచుకునేటప్పుడు ప్రకటన గుర్తింపును కూడా చూపండి.":"Include the disclosure when sharing."}</p></div>:<p className="text-xs">{te?"క్యూఆర్ కనిపించకపోతే పైన ఉన్న లింక్ కాపీ చేయండి.":"If the QR does not load, copy the link above."}</p>}</details>;
}
export default function CreatorCampaigns({identity,partnerToken}:{identity:string;partnerToken?:string}) {
 const te=useLang().lang==="te";
 const [rows,setRows]=useState<Campaign[]>([]),[name,setName]=useState(""),[channel,setChannel]=useState("youtube"),[video,setVideo]=useState("");
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[updated,setUpdated]=useState("");
 const epoch=useRef(0),lock=useRef(false);
 const controllers=useRef(new Set<AbortController>());
 const boundedJson=useCallback(async(url:string,init?:RequestInit)=>{
  const controller=new AbortController();controllers.current.add(controller);
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{return await Promise.race([
   (async()=>{const response=await fetch(url,{...init,signal:controller.signal});return{ok:response.ok,status:response.status,data:await readApiJson(response)};})(),
   new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error("Request unconfirmed"));},20_000);controller.signal.addEventListener("abort",()=>reject(new Error("Request cancelled")),{once:true});})
  ]);}finally{clearTimeout(timer);controllers.current.delete(controller);}
 },[]);
 const endpoint=`/api/referral/${encodeURIComponent(identity)}/campaigns`;
 const headers=useCallback(():Record<string,string>=>partnerToken?{"X-Partner-Token":partnerToken}:authHeaders(),[partnerToken]);
 const load=useCallback(async()=>{
  const current=epoch.current;setBusy(true);setError("");
  try{const {ok,status,data:d}=await boundedJson(endpoint,{headers:headers(),cache:"no-store"});if(current!==epoch.current)return;
   if(!ok||!validCampaignList(d)){if(status===401||status===403){setRows([]);setUpdated("");}throw new Error("refresh");}
   setRows(d.campaigns);setUpdated(new Date().toLocaleTimeString(te?"te-IN":"en-IN"));
  }catch{if(current===epoch.current)setError(te?"తాజా ప్రచార వివరాలు రాలేదు. మళ్లీ ప్రయత్నించండి.":"Campaign details could not be refreshed. Please retry.");}
  finally{if(current===epoch.current)setBusy(false);}
 },[endpoint,headers,te,boundedJson]);
 useEffect(()=>{epoch.current+=1;setRows([]);setUpdated("");setName("");setVideo("");setNotice("");lock.current=false;void load();return()=>{epoch.current+=1;controllers.current.forEach(c=>c.abort());};},[load]);
 const mutate=async(path:string,body:object)=>{
  if(lock.current||busy||error)return;lock.current=true;const current=epoch.current;setBusy(true);setNotice("");
  try{const {ok,status,data:d}=await boundedJson(path,{method:"POST",headers:{...headers(),"Content-Type":"application/json"},body:JSON.stringify(body)});if(current!==epoch.current)return;
   if(!ok||!campaignObject(d)||d.success!==true||!validCampaign(d.campaign)){if(status===401||status===403){setRows([]);setUpdated("");}throw new Error("unconfirmed");}
   const expected=body as {name?:string;channel?:string;status?:string};
   if(path===endpoint?(d.campaign.name!==expected.name?.trim().replace(/\s+/g," ")||d.campaign.channel!==expected.channel||d.campaign.status!=="active"):(d.campaign.id!==path.split("/").at(-2)||d.campaign.status!==expected.status))throw new Error("unconfirmed");setName("");setVideo("");await load();
  }catch{if(current===epoch.current){setError(te?"మార్పు నిర్ధారణ కాలేదు. మళ్లీ చేసే ముందు తాజా వివరాలు చూడండి.":"Change not confirmed. Refresh and check before trying again.");}}
  finally{if(current===epoch.current){lock.current=false;setBusy(false);}}
 };
 const copy=async(text:string)=>{try{await navigator.clipboard.writeText(text);setNotice(te?"కాపీ అయింది.":"Copied.");}catch{setNotice(te?"లింక్‌ను ఎంచుకుని కాపీ చేయండి.":"Select and copy the link below.");}};
 const button="min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold disabled:opacity-50";
 return <section aria-label="Creator campaigns" className="rounded-3xl border border-amber-200 bg-white p-4 sm:p-6 space-y-4">
 <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold text-maroon">{te?"మీ వీడియోలు మరియు ప్రచారాలు":"Your videos & campaigns"}</h2><button type="button" disabled={busy} onClick={()=>void load()} className={button}>{busy?(te?"లోడ్ అవుతోంది…":"Loading…"):(te?"తాజా వివరాలు చూడండి":"Refresh campaigns")}</button></div>
 <p className="text-sm text-slate-600">{te?"ప్రతి వీడియో లేదా మాధ్యమానికి వేరు లింక్ ఉంటుంది. నమోదులు, అర్హమైన బహుమతుల లెక్కలు వేరు. ఏదీ స్వయంచాలకంగా ప్రచురించబడదు.":"One link per video or channel. Registrations and eligible rewards are separate counts. Nothing is posted automatically."}</p>
 <p className="text-xs text-slate-600">{te?"చెల్లింపు సదుపాయం అందుబాటులో ఉన్నప్పుడు, మొదటి అర్హమైన సభ్యత్వ ప్రణాళిక చెల్లింపు నమోదైతే మాత్రమే బహుమతి రావచ్చు. నమోదు చేసినంత మాత్రాన నగదు రాదు.":"A reward may apply only after an actual first qualifying consumer-plan payment when checkout is available. Registration alone is not cash."}</p>
 <p className="text-xs text-slate-600">{te?"తాత్కాలికంగా లేదా శాశ్వతంగా నిలిపిన ప్రచార లింక్ ద్వారా సాధారణ పరిచయ నమోదు కొనసాగవచ్చు. కొత్త ప్రచార లెక్కలు మాత్రం ఆగుతాయి.":"Paused or archived links can still open ordinary referral registration; new campaign attribution stops."}</p>
 <div role="status" aria-live="polite" className="text-sm">{updated&&<p>{te?"చివరిగా తాజా వివరాలు చూసిన సమయం":"Last refresh"}: {updated}</p>}{error&&<p className="text-rose-700">{error} {rows.length>0&&(te?"పాత వివరాలు కావచ్చు.":"Displayed details may be stale.")}</p>}{notice&&<p>{notice}</p>}</div>
 <form className="grid gap-3 sm:grid-cols-2" onSubmit={e=>{e.preventDefault();void mutate(endpoint,{name,channel,video_url:video});}}>
 <label className="text-sm font-semibold">{te?"ప్రచారం పేరు":"Campaign name"}<input required minLength={2} maxLength={60} value={name} onChange={e=>setName(e.target.value)} className="mt-1 block min-h-11 w-full rounded-xl border p-3 font-normal"/></label>
 <label className="text-sm font-semibold">{te?"ప్రచార మాధ్యమం":"Channel"}<select value={channel} onChange={e=>setChannel(e.target.value)} className="mt-1 block min-h-11 w-full rounded-xl border p-3 font-normal">{["youtube","instagram","whatsapp","telegram","website","other"].map(x=><option key={x} value={x}>{x.charAt(0).toUpperCase()+x.slice(1)}</option>)}</select></label>
 <label className="text-sm font-semibold sm:col-span-2">{te?"వీడియో లింక్ (ఐచ్ఛికం)":"Video URL (optional)"}<input type="url" maxLength={500} value={video} onChange={e=>setVideo(e.target.value)} placeholder="https://youtu.be/..." className="mt-1 block min-h-11 w-full rounded-xl border p-3 font-normal"/><span className="block mt-1 text-xs font-normal text-slate-600">YouTube, Instagram, Telegram · HTTPS</span></label>
 <button type="submit" disabled={busy||!!error} className={`${button} bg-[#7A0C2E] text-white`}>{te?"ప్రచార లింక్ సృష్టించండి":"Create campaign link"}</button></form>
 {!busy&&!error&&rows.length===0&&<p className="rounded-xl bg-amber-50 p-4 text-sm">{te?"ఇంకా ప్రచారాలు లేవు. మొదటి వీడియోకు లింక్ సృష్టించండి.":"No campaigns yet. Create a link for your first video."}</p>}
 <div className="space-y-4">{rows.map(row=><article key={row.id} className="min-w-0 rounded-2xl border p-4 space-y-3"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-bold text-maroon break-all">{row.name}</h3><span className="text-xs text-slate-600">{row.channel} · {te?({active:"అమలులో ఉంది",paused:"తాత్కాలికంగా ఆపారు",archived:"శాశ్వతంగా నిలిపివేశారు"}[row.status]||row.status):row.status}</span></div>
 <dl className="grid grid-cols-1 min-[360px]:grid-cols-3 gap-2 text-sm">{[[te?"నమోదైన క్లిక్‌లు":"Recorded clicks",row.clicks],[te?"నమోదులు":"Registrations",row.registrations],[te?"అర్హమైన బహుమతులు":"Eligible rewards",row.eligible_rewards]].map(([label,value])=><div key={String(label)} className="rounded-xl bg-amber-50 p-3"><dt className="text-xs text-slate-600">{label}</dt><dd className="font-bold mt-1">{value??0}</dd></div>)}</dl>
 <p className="text-sm font-semibold">{te?"నమోదైన అర్హమైన ఆదాయం":"Recorded eligible earnings"}: ₹{Number(row.recorded_earnings_inr||0).toLocaleString("en-IN")}<span className="block text-xs font-normal text-slate-600">{te?"ఇది చెల్లించదగిన నిల్వ కాదు. అందుబాటులో ఉన్న నగదు నిల్వ, చెల్లింపు సమీక్ష వేరు.":"Not a payout balance. Available wallet and payout review are separate."}</span></p>
 <p className="text-xs text-slate-600">{te?"ఇవి నమోదైన చర్యల లెక్కలు. వేర్వేరు వ్యక్తుల సంఖ్య లేదా భవిష్యత్ ఆదాయం కాదు. చెల్లింపులు తిరిగి ఇస్తే అర్హమైన బహుమతులు మారవచ్చు.":"Recorded events, not unique people or future income. Eligible rewards can change with refunds."}</p><p className="break-all select-all rounded-xl bg-slate-50 p-3 text-xs">{row.link}</p>
 <div className="flex flex-wrap gap-2"><button type="button" onClick={()=>void copy(row.link)} className={button}>{te?"లింక్ కాపీ":"Copy campaign link"}</button><button type="button" onClick={()=>void copy(`${te?row.disclosure_te:row.disclosure_en}\n${row.link}`)} className={button}>{te?"ప్రకటన గుర్తింపు మరియు లింక్ కాపీ":"Copy disclosure & link"}</button>
 {row.status!=="archived"&&<><button type="button" disabled={busy||!!error} onClick={()=>void mutate(`${endpoint}/${row.id}/status`,{status:row.status==="active"?"paused":"active"})} className={button}>{row.status==="active"?(te?"తాత్కాలికంగా ఆపండి":"Pause campaign"):(te?"మళ్లీ ప్రారంభించండి":"Resume campaign")}</button><button type="button" disabled={busy||!!error} onClick={()=>{if(window.confirm(te?"శాశ్వతంగా నిలిపితే మళ్లీ ప్రారంభించలేరు. గత లెక్కలు అలాగే ఉంటాయి. ఈ ప్రచారాన్ని శాశ్వతంగా నిలిపివేయాలా?":"Archiving cannot be undone. Past counts remain. Archive this campaign?"))void mutate(`${endpoint}/${row.id}/status`,{status:"archived"});}} className={button}>{te?"శాశ్వతంగా నిలిపివేయండి":"Archive campaign"}</button></>}</div>
 <CampaignQR link={row.link} te={te}/><details><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">{te?"ప్రకటన గుర్తింపు సూచన మరియు నమూనా":"Disclosure reminder & sample"}</summary><p className="text-sm">{te?row.disclosure_te:row.disclosure_en}</p><p className="mt-2 text-xs text-slate-600">{te?"ప్రకటన గుర్తింపును మొదట స్పష్టంగా చూపండి. వీడియో, ఆడియోలో వాటికి తగిన చోట చూపాలి. వివరణలో మాత్రమే ఉంచడం సరిపోకపోవచ్చు.":"Show disclosure clearly upfront. Video and audio need format-appropriate placement; a caption alone may not be enough."}</p></details></article>)}</div>
 </section>;
}
