"use client";
import Link from "next/link";import type {ComponentProps} from "react";import {useLang} from "@/lib/lang";import {localeHref} from "@/lib/locale-path";
export default function LocaleLink(props:ComponentProps<typeof Link>) {const {lang}=useLang();return <Link {...props} href={typeof props.href === "string" && props.href.startsWith("/") && !props.href.startsWith("//") ? localeHref(props.href,lang) : props.href}/>}
