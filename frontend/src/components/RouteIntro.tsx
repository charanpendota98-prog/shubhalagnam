"use client";

import type { ReactNode } from "react";

type Props = {
  /** Small uppercase line above the title, e.g. "Plans" / "ట్రస్ట్". */
  eyebrow: string;
  title: string;
  /** One honest sentence under the title. */
  lead?: string;
  /** Right-hand actions or a status chip; wraps under the copy on phones. */
  aside?: ReactNode;
  /** Telugu title/lead need the Telugu font stack and looser leading. */
  telugu?: boolean;
  /** Decorative glyph rendered in the band's corner (emoji or symbol). */
  glyph?: string;
  /** Compact variant for tool pages that also have their own big heading. */
  size?: "hero" | "compact";
};

/**
 * ROUTE INTRO — the shared opening band for every non-home page.
 *
 * The site previously opened very differently depending on the route: the home
 * page had a full cinematic stage while /pricing, /safety, /vendors … started
 * as a bare stack of cards. This band gives every route the same cinematic
 * entry — a maroon depth panel with a drifting gold light, a stagger-in title,
 * and a hairline gold rule — so the product reads as one film, not a set of
 * unrelated screens.
 *
 * It is pure CSS/SVG (no images, no video) and only animates transform/opacity.
 * `RouteFrame` renders it, so a route gets it by declaring its copy in
 * `RouteFrame`'s ROUTES map and nothing else.
 */
export default function RouteIntro({ eyebrow, title, lead, aside, telugu = false, glyph = "✦", size = "hero" }: Props) {
  const compact = size === "compact";

  return (
    <section className={`mv-intro ${compact ? "mv-intro--compact" : ""}`} aria-label={title}>
      <span className="mv-intro__glow" aria-hidden="true" />
      <span className="mv-intro__rule" aria-hidden="true" />
      {glyph ? (
        <span className="mv-intro__glyph" aria-hidden="true">
          {glyph}
        </span>
      ) : null}

      <div className="mv-intro__body">
        <p className="mv-intro__eyebrow anim-hero">{eyebrow}</p>
        <h1 className={`mv-intro__title anim-hero-1 ${telugu ? "telugu" : ""}`} lang={telugu ? "te-IN" : undefined}>
          {title}
        </h1>
        {lead ? (
          <p className={`mv-intro__lead anim-hero-2 ${telugu ? "telugu" : ""}`} lang={telugu ? "te-IN" : undefined}>
            {lead}
          </p>
        ) : null}
        {aside ? <div className="mv-intro__aside anim-hero-3">{aside}</div> : null}
      </div>
    </section>
  );
}
