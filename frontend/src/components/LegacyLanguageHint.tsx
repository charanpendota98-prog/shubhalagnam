"use client";
import {useEffect,useState} from "react";
import {usePathname} from "next/navigation";
import {localeHref,PROTOTYPE_LOCALE_PATHS} from "@/lib/locale-path";

/** Overlay only: never hide the page, change its locale or redirect its URL. */
export default function LegacyLanguageHint() {
 const path=usePathname() || "/";
 const [show,setShow]=useState(false);
 useEffect(()=>{
  try {setShow((PROTOTYPE_LOCALE_PATHS as readonly string[]).includes(path) && localStorage.getItem("tsap_lang")==="en" && sessionStorage.getItem("mv-language-hint-dismissed")!=="1");} catch {setShow(false);}
 },[path]);
 if(!show)return null;
 return <aside aria-label="Language preference" className="fixed bottom-20 left-3 z-40 max-w-[calc(100vw-1.5rem)] rounded-xl border border-maroon/20 bg-white p-3 text-sm shadow-md flex items-center gap-4"><a href={localeHref(path,"en")} className="font-semibold text-maroon underline">View in English</a><button type="button" aria-label="Dismiss language suggestion" onClick={()=>{setShow(false);try{sessionStorage.setItem("mv-language-hint-dismissed","1");}catch{}}} className="min-h-11 min-w-11 rounded-lg border">Close</button></aside>;
}
