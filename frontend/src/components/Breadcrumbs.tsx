"use client";

/**
 * Visible breadcrumb trail, driven by the same data the page uses for its
 * BreadcrumbList JSON-LD (which is always emitted in English for crawlers).
 */

import Link from "next/link";
import { useLang } from "@/lib/lang";

export type Crumb = { en: string; te?: string; href?: string };

export default function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  const { lang } = useLang();
  const te = lang === "te";
  const rows = (Array.isArray(trail) ? trail : []).filter((crumb) => crumb && crumb.en);
  if (rows.length <= 1) return null;

  return (
    <nav aria-label={te ? "బ్రెడ్‌క్రంబ్" : "Breadcrumb"} className="mx-auto w-full max-w-6xl px-4 pt-4">
      <ol className="flex flex-wrap items-center gap-1 text-[12px] text-slate-500">
        {rows.map((crumb, index) => {
          const label = (te && crumb.te ? crumb.te : crumb.en) as string;
          const last = index === rows.length - 1;
          return (
            <li key={`${crumb.en}-${index}`} className="flex items-center gap-1">
              {crumb.href && !last ? (
                <Link href={crumb.href} className="underline-offset-2 hover:text-[#5c0821] hover:underline">
                  {label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={last ? "font-semibold text-slate-700" : ""}>
                  {label}
                </span>
              )}
              {!last && (
                <span aria-hidden="true" className="text-slate-300">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
