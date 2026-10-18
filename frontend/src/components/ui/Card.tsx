import type { ElementType, ReactNode } from "react";

/**
 * Card — the shared content surface.
 *
 * `tone="brand"` adds the gold top accent used across marketing sections.
 * `interactive` opts into the hover lift, which is disabled on touch devices
 * and under `prefers-reduced-motion` (see globals.css).
 */

export type CardTone = "plain" | "brand" | "flat";

type Props = {
  as?: Extract<ElementType, "div" | "article" | "li" | "section" | "aside">;
  tone?: CardTone;
  interactive?: boolean;
  className?: string;
  children: ReactNode;
};

export default function Card({
  as: Tag = "div",
  tone = "plain",
  interactive = false,
  className = "",
  children,
}: Props) {
  const classes = [
    "ds-card",
    tone === "brand" ? "ds-card--brand" : "",
    tone === "flat" ? "ds-card--flat" : "",
    interactive ? "ds-card--interactive" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <Tag className={classes}>{children}</Tag>;
}

export function CardBody({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={`ds-card__body ${className}`.trim()}>{children}</div>;
}
