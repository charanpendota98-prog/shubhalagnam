"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import Image from "next/image";
import { authHeaders, readApiJson } from "@/lib/api";
import { useLang } from "@/lib/lang";
type Campaign = {id:string;name:string;channel:string;status:string;link:string;clicks:number;registrations:number;eligible_rewards:number;recorded_earnings_inr:number;disclosure_en:string;disclosure_te:string};
function CampaignQR({link,te}:{link:string;te:boolean}) {
 const [url,setUrl]=useState("");
 useEffect(()=>{let active=true;QRCode.toDataURL(link,{width:224,margin:4,errorCorrectionLevel:"M"}).then(x=>{if(active)setUrl(x);}).catch(()=>{});return()=>{active=false;};},[link]);
 return <details><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">{te?"Campaign QR చూడండి":"Show campaign QR"}</summary>{url?<div className="space-y-2"><Image src={url} alt={te?"ఈ campaign నమోదు లింక్ QR":"QR for this campaign registration link"} width={224} height={224} unoptimized/><a href={url} download="manavivaha-campaign-qr.png" className="inline-block min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold">{te?"QR డౌన్‌లోడ్":"Download QR"}</a><p className="text-xs text-slate-600">{te?"పంచుకునేటప్పుడు disclosure కూడా చూపండి.":"Include the disclosure when sharing."}</p></div>:<p className="text-xs">{te?"QR రాకపోతే పై లింక్ కాపీ చేయండి.":"If the QR does not load, copy the link above."}</p>}</details>;
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
   if(!ok||!d.success){if(status===401||status===403){setRows([]);setUpdated("");}throw new Error("refresh");}
   setRows(d.campaigns||[]);setUpdated(new Date().toLocaleTimeString(te?"te-IN":"en-IN"));
  }catch{if(current===epoch.current)setError(te?"తాజా campaign వివరాలు రాలేదు. మళ్లీ ప్రయత్నించండి.":"Campaign details could not be refreshed. Please retry.");}
  finally{if(current===epoch.current)setBusy(false);}
 },[endpoint,headers,te,boundedJson]);
 useEffect(()=>{epoch.current+=1;setRows([]);setUpdated("");setName("");setVideo("");setNotice("");lock.current=false;void load();return()=>{epoch.current+=1;controllers.current.forEach(c=>c.abort());};},[load]);
 const mutate=async(path:string,body:object)=>{
  if(lock.current||busy||error)return;lock.current=true;const current=epoch.current;setBusy(true);setNotice("");
  try{const {ok,status,data:d}=await boundedJson(path,{method:"POST",headers:{...headers(),"Content-Type":"application/json"},body:JSON.stringify(body)});if(current!==epoch.current)return;
   if(!ok||!d.success){if(status===401||status===403){setRows([]);setUpdated("");}throw new Error("unconfirmed");}setName("");setVideo("");await load();
  }catch{if(current===epoch.current){setError(te?"మార్పు నిర్ధారణ కాలేదు. మళ్లీ చేసే ముందు Refresh చేయండి.":"Change not confirmed. Refresh and check before trying again.");}}
  finally{if(current===epoch.current){lock.current=false;setBusy(false);}}
 };
 const copy=async(text:string)=>{try{await navigator.clipboard.writeText(text);setNotice(te?"కాపీ అయింది.":"Copied.");}catch{setNotice(te?"క్రింద లింక్ ఎంచుకుని కాపీ చేయండి.":"Select and copy the link below.");}};
 const button="min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold disabled:opacity-50";
 return <section aria-label="Creator campaigns" className="rounded-3xl border border-amber-200 bg-white p-4 sm:p-6 space-y-4">
 <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold text-maroon">{te?"మీ వీడియోలు & campaigns":"Your videos & campaigns"}</h2><button type="button" disabled={busy} onClick={()=>void load()} className={button}>{busy?(te?"లోడ్ అవుతోంది…":"Loading…"):(te?"Refresh చేయండి":"Refresh campaigns")}</button></div>
 <p className="text-sm text-slate-600">{te?"ప్రతి వీడియో లేదా channel కోసం వేరు లింక్. నమోదు, అర్హమైన rewards వేరు లెక్కలు. Automatic post పంపబడదు.":"One link per video or channel. Registrations and eligible rewards are separate counts. Nothing is posted automatically."}</p>
 <p className="text-xs text-slate-600">{te?"మొదటి అర్హమైన consumer plan చెల్లింపు నమోదైతే మాత్రమే reward రావచ్చు. నమోదు ఒక్కటే cash కాదు.":"A reward may apply only after an actual first qualifying consumer-plan payment when checkout is available. Registration alone is not cash."}</p>
 <p className="text-xs text-slate-600">{te?"Pause/archive చేసిన లింక్ ద్వారా సాధారణ referral నమోదు కొనసాగవచ్చు; కొత్త campaign లెక్కలు మాత్రం ఆగుతాయి.":"Paused or archived links can still open ordinary referral registration; new campaign attribution stops."}</p>
 <div role="status" aria-live="polite" className="text-sm">{updated&&<p>{te?"చివరి refresh":"Last refresh"}: {updated}</p>}{error&&<p className="text-rose-700">{error} {rows.length>0&&(te?"పాత వివరాలు కావచ్చు.":"Displayed details may be stale.")}</p>}{notice&&<p>{notice}</p>}</div>
 <form className="grid gap-3 sm:grid-cols-2" onSubmit={e=>{e.preventDefault();void mutate(endpoint,{name,channel,video_url:video});}}>
 <label className="text-sm font-semibold">{te?"Campaign పేరు":"Campaign name"}<input required minLength={2} maxLength={60} value={name} onChange={e=>setName(e.target.value)} className="mt-1 block min-h-11 w-full rounded-xl border p-3 font-normal"/></label>
 <label className="text-sm font-semibold">Channel<select value={channel} onChange={e=>setChannel(e.target.value)} className="mt-1 block min-h-11 w-full rounded-xl border p-3 font-normal">{["youtube","instagram","whatsapp","telegram","website","other"].map(x=><option key={x} value={x}>{x.charAt(0).toUpperCase()+x.slice(1)}</option>)}</select></label>
 <label className="text-sm font-semibold sm:col-span-2">{te?"వీడియో URL (ఐచ్ఛికం)":"Video URL (optional)"}<input type="url" maxLength={500} value={video} onChange={e=>setVideo(e.target.value)} placeholder="https://youtu.be/..." className="mt-1 block min-h-11 w-full rounded-xl border p-3 font-normal"/><span className="block mt-1 text-xs font-normal text-slate-600">YouTube, Instagram, Telegram · HTTPS</span></label>
 <button type="submit" disabled={busy||!!error} className={`${button} bg-[#7A0C2E] text-white`}>{te?"Campaign link సృష్టించండి":"Create campaign link"}</button></form>
 {!busy&&!error&&rows.length===0&&<p className="rounded-xl bg-amber-50 p-4 text-sm">{te?"ఇంకా campaigns లేవు. మొదటి వీడియోకు లింక్ సృష్టించండి.":"No campaigns yet. Create a link for your first video."}</p>}
 <div className="space-y-4">{rows.map(row=><article key={row.id} className="min-w-0 rounded-2xl border p-4 space-y-3"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-bold text-maroon break-all">{row.name}</h3><span className="text-xs text-slate-600">{row.channel} · {row.status}</span></div>
 <dl className="grid grid-cols-1 min-[360px]:grid-cols-3 gap-2 text-sm">{[[te?"నమోదైన clicks":"Recorded clicks",row.clicks],[te?"నమోదులు":"Registrations",row.registrations],[te?"అర్హమైన rewards":"Eligible rewards",row.eligible_rewards]].map(([label,value])=><div key={String(label)} className="rounded-xl bg-amber-50 p-3"><dt className="text-xs text-slate-600">{label}</dt><dd className="font-bold mt-1">{value??0}</dd></div>)}</dl>
 <p className="text-sm font-semibold">{te?"నమోదైన అర్హమైన ఆదాయం":"Recorded eligible earnings"}: ₹{Number(row.recorded_earnings_inr||0).toLocaleString("en-IN")}<span className="block text-xs font-normal text-slate-600">{te?"ఇది payout balance కాదు. అందుబాటులో ఉన్న wallet మరియు review వేరు.":"Not a payout balance. Available wallet and payout review are separate."}</span></p>
 <p className="text-xs text-slate-600">{te?"ఇవి నమోదైన events; unique వ్యక్తులు లేదా భవిష్యత్ ఆదాయం కాదు. Refunds తో అర్హమైన rewards మారవచ్చు.":"Recorded events, not unique people or future income. Eligible rewards can change with refunds."}</p><p className="break-all select-all rounded-xl bg-slate-50 p-3 text-xs">{row.link}</p>
 <div className="flex flex-wrap gap-2"><button type="button" onClick={()=>void copy(row.link)} className={button}>{te?"లింక్ కాపీ":"Copy campaign link"}</button><button type="button" onClick={()=>void copy(`${te?row.disclosure_te:row.disclosure_en}\n${row.link}`)} className={button}>{te?"Disclosure & link కాపీ":"Copy disclosure & link"}</button>
 {row.status!=="archived"&&<><button type="button" disabled={busy||!!error} onClick={()=>void mutate(`${endpoint}/${row.id}/status`,{status:row.status==="active"?"paused":"active"})} className={button}>{row.status==="active"?(te?"Pause చేయండి":"Pause campaign"):(te?"Resume చేయండి":"Resume campaign")}</button><button type="button" disabled={busy||!!error} onClick={()=>{if(window.confirm(te?"Archive చేస్తే మళ్లీ activate చేయలేరు. కొనసాగించాలా?":"Archiving cannot be undone. Past counts remain. Archive this campaign?"))void mutate(`${endpoint}/${row.id}/status`,{status:"archived"});}} className={button}>{te?"Archive చేయండి":"Archive campaign"}</button></>}</div>
 <CampaignQR link={row.link} te={te}/><details><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">{te?"Disclosure నియమం & sample":"Disclosure reminder & sample"}</summary><p className="text-sm">{te?row.disclosure_te:row.disclosure_en}</p><p className="mt-2 text-xs text-slate-600">{te?"ప్రకటన గుర్తింపు మొదట స్పష్టంగా చూపండి. Video/audio format కు తగ్గ placement అవసరం.":"Show disclosure clearly upfront. Video and audio need format-appropriate placement; a caption alone may not be enough."}</p></details></article>)}</div>
 </section>;
}
