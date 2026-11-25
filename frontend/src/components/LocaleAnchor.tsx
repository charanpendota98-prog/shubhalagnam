"use client";
import type {ComponentProps} from "react";import {useLang} from "@/lib/lang";import {localeHref} from "@/lib/locale-path";
export default function LocaleAnchor(props:ComponentProps<"a">){const {lang}=useLang();return <a {...props} href={typeof props.href==="string"?localeHref(props.href,lang):props.href}/>}
