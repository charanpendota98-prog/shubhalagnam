"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/lang";
import { apiGet, getTsapId } from "@/lib/api";

type Prompt = {
  success?: boolean;
  member_days?: number | null;
  days_known?: boolean;
  min_days?: number;
  accepted_interests?: number;
  stories?: { total: number; pending: number; approved: number; rejected: number };
  can_submit?: boolean;
  reason?: string;
  title_telugu?: string;
  title_en?: string;
  note_telugu?: string;
  note_en?: string;
  share_url?: string;
};

/**
 * Invites a member to share their story — only when their own account can
 * justify it (time on the service, or an interest accepted on both sides).
 * Never implies a match happened and never promises publication.
 */
export default function StoryNudge() {
  const { lang } = useLang();
  const te = lang === "te";
  const [row, setRow] = useState<Prompt | null>(null);

  useEffect(() => {
    const tid = getTsapId();
    if (!tid) return;
    let alive = true;
    apiGet<Prompt>(`/api/stories/prompt?tsap_id=${encodeURIComponent(tid)}`)
      .then((res) => {
        if (alive && res.ok && res.data?.success) setRow(res.data);
      })
      .catch(() => {
        /* a missing nudge is not an error worth showing */
      });
    return () => {
      alive = false;
    };
  }, []);

  // "not_yet" means the member's own record cannot justify the invite; showing
  // a card then would be noise, so the nudge stays silent.
  if (!row || !row.reason || row.reason === "not_yet") return null;

  const title = (te ? row.title_telugu : row.title_en) || row.title_en || "";
  const note = (te ? row.note_telugu : row.note_en) || row.note_en || "";
  const days = row.member_days;

  return (
    <section className="rounded-3xl border border-gold/30 bg-gradient-to-br from-[#FFF7EC] to-white p-5 shadow-xs">
      <h2 className="text-base font-black text-[#7A0C2E]">{title}</h2>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#4A3B2A]">{note}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[#6B5A46]">
        {row.days_known && typeof days === "number" && (
          <span className="rounded-full bg-white border border-gold/25 px-2.5 py-1">
            {te ? `${days} రోజుల సభ్యుడు` : `${days} days a member`}
          </span>
        )}
        {(row.accepted_interests ?? 0) > 0 && (
          <span className="rounded-full bg-white border border-gold/25 px-2.5 py-1">
            {te
              ? `${row.accepted_interests} accepted interest`
              : `${row.accepted_interests} accepted interest`}
          </span>
        )}
        {(row.stories?.total ?? 0) > 0 && (
          <span className="rounded-full bg-white border border-gold/25 px-2.5 py-1">
            {te
              ? `${row.stories?.pending ?? 0} review లో · ${row.stories?.approved ?? 0} ప్రచురితం`
              : `${row.stories?.pending ?? 0} in review · ${row.stories?.approved ?? 0} published`}
          </span>
        )}
      </div>

      {row.can_submit && (
        <Link
          href={row.share_url || "/stories"}
          className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-[#7A0C2E] px-5 text-[13px] font-black text-white hover:bg-[#5E0A23]"
        >
          {te ? "మీ story పంపండి" : "Share your story"}
        </Link>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-[#8A6A1F]">
        {te
          ? "Story పంపడం వల్ల ఎవరూ verified అవ్వరు; ఇది గుర్తింపు రుజువు కాదు. Review తర్వాతే ప్రచురణ — హామీ కాదు."
          : "Sharing a story verifies nobody and is not proof of identity. Review comes first; publication is never guaranteed."}
      </p>
    </section>
  );
}
