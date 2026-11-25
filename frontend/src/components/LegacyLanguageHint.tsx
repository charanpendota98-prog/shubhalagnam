"use client";
import {useEffect,useState} from "react";
import {usePathname} from "next/navigation";
import {localeHref,hasEnglishRoute,usesInPlaceLanguage} from "@/lib/locale-path";
import {useLang} from "@/lib/lang";

/** Overlay only: never hide the page, change its locale or redirect its URL. */
export default function LegacyLanguageHint() {
 const path=usePathname() || "/";
 const {lang,setLang}=useLang();
 const [show,setShow]=useState(false);
 useEffect(()=>{
  try {setShow(!path.startsWith("/en") && hasEnglishRoute(path) && localStorage.getItem("tsap_lang")==="en" && sessionStorage.getItem("mv-language-hint-dismissed")!=="1");} catch {setShow(false);}
 },[path]);
 if(!show || lang === "en")return null;
 return <aside aria-label="Language preference" className="fixed bottom-20 left-3 z-40 max-w-[calc(100vw-1.5rem)] rounded-xl border border-maroon/20 bg-white p-3 text-sm shadow-md flex items-center gap-4"><a href={localeHref(path,"en")} onClick={event=>{if(usesInPlaceLanguage(path)){event.preventDefault();setLang("en");}}} className="font-semibold text-maroon underline">View in English</a><button type="button" aria-label="Dismiss language suggestion" onClick={()=>{setShow(false);try{sessionStorage.setItem("mv-language-hint-dismissed","1");}catch{}}} className="min-h-11 min-w-11 rounded-lg border">Close</button></aside>;
}
