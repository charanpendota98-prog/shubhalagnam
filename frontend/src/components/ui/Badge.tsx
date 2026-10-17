import type { ReactNode } from "react";

/**
 * Badge — small status/eyebrow label.
 *
 * The default (gold) tone is the section eyebrow used on the homepage. The
 * remaining tones carry meaning, so pair them with text: colour alone must
 * never be the only signal (WCAG 1.4.1).
 */

export type BadgeTone = "gold" | "maroon" | "neutral" | "success" | "warning" | "danger";

type Props = {
  tone?: BadgeTone;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
};

export default function Badge({ tone = "gold", icon, className = "", children }: Props) {
  const classes = [
    "ds-badge",
    tone === "gold" ? "" : `ds-badge--${tone}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={classes}>
      {icon}
      <span>{children}</span>
    </span>
  );
}
