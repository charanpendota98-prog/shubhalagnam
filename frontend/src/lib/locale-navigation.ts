"use client";
import {useMemo} from "react";import {useRouter,usePathname} from "next/navigation";import {useLang} from "@/lib/lang";import {localeHref,baseLocalePath} from "@/lib/locale-path";
export function useLocaleRouter(){const router=useRouter();const {lang}=useLang();return useMemo(()=>({...router,push:(href:string,options?:Parameters<typeof router.push>[1])=>router.push(localeHref(href,lang),options),replace:(href:string,options?:Parameters<typeof router.replace>[1])=>router.replace(localeHref(href,lang),options),prefetch:(href:string)=>router.prefetch(localeHref(href,lang))}),[router,lang]);}
export function useBasePathname(){const p=usePathname();return p?baseLocalePath(p):p;}
