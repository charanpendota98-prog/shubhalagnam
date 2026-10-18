/**
 * DESIGN TOKENS — single source of truth for the Mana Vivaha design system.
 * =====================================================================
 * Every value here is mirrored 1:1 as a CSS custom property in
 * `src/app/globals.css`. `scripts/design-system.test.mjs` fails the gate if the
 * two ever drift, so colours, spacing, type, elevation and motion can only be
 * changed in these two places.
 *
 * Rules for contributors:
 * • Do not hardcode raw hex/colour values in components — reference a token.
 * • Do not introduce a one-off spacing or radius value; pick the nearest step.
 * • Tailwind's existing `maroon-*`, `gold-*` and `cream-*` utilities stay as
 *   they are for legacy files; new surfaces should use the `ds-*` primitives.
 */

/** Flat token map: CSS custom-property name → value. Mirrored in globals.css. */
export const DESIGN_TOKENS = {
  /* ---------- Brand palette ---------- */
  "--ds-maroon": "#7A0C2E",
  "--ds-maroon-dark": "#5C0822",
  "--ds-maroon-light": "#A0143A",
  "--ds-maroon-soft": "#F9EDF1",
  "--ds-gold": "#D4AF37",
  "--ds-gold-light": "#F0D68C",
  "--ds-gold-soft": "#FFF6DC",
  "--ds-gold-deep": "#B8912A",
  /** Darker gold used for small text so labels clear 4.5:1 on light surfaces. */
  "--ds-gold-text": "#8A6A1F",
  "--ds-cream": "#FFF8E7",
  "--ds-cream-deep": "#F7EED8",
  "--ds-peacock": "#0F766E",
  "--ds-navy": "#0F1F3C",
  "--ds-ink": "#1A1A1A",

  /* ---------- Semantic text ---------- */
  "--ds-text": "#2A0D18",
  "--ds-text-muted": "#6F5B63",
  "--ds-text-inverse": "#FFFFFF",
  "--ds-text-on-gold": "#4A0718",

  /* ---------- Surfaces ---------- */
  "--ds-surface": "#FFFFFF",
  "--ds-surface-sunken": "#FFFDF8",
  "--ds-surface-page": "#FFF8E7",

  /* ---------- Borders ---------- */
  "--ds-border": "rgba(122, 12, 46, 0.12)",
  "--ds-border-strong": "rgba(122, 12, 46, 0.28)",
  "--ds-border-gold": "rgba(212, 175, 55, 0.45)",

  /* ---------- Feedback ---------- */
  "--ds-success": "#0F766E",
  "--ds-warning": "#B45309",
  "--ds-danger": "#BE123C",
  "--ds-info": "#1E3A5F",

  /* ---------- Spacing (4px base) ---------- */
  "--ds-space-0": "0rem",
  "--ds-space-1": "0.25rem",
  "--ds-space-2": "0.5rem",
  "--ds-space-3": "0.75rem",
  "--ds-space-4": "1rem",
  "--ds-space-5": "1.25rem",
  "--ds-space-6": "1.5rem",
  "--ds-space-8": "2rem",
  "--ds-space-10": "2.5rem",
  "--ds-space-12": "3rem",
  "--ds-space-16": "4rem",

  /* ---------- Radii ---------- */
  "--ds-radius-sm": "0.5rem",
  "--ds-radius-md": "0.75rem",
  "--ds-radius-lg": "1rem",
  "--ds-radius-xl": "1.25rem",
  "--ds-radius-2xl": "1.75rem",
  "--ds-radius-pill": "999px",

  /* ---------- Type scale ---------- */
  "--ds-font-display": "clamp(1.75rem, 5vw, 3rem)",
  "--ds-font-h2": "clamp(1.3rem, 4.4vw, 1.9rem)",
  "--ds-font-h3": "1.0625rem",
  "--ds-font-body": "0.9375rem",
  "--ds-font-sm": "0.8125rem",
  "--ds-font-xs": "0.75rem",
  "--ds-font-caption": "0.625rem",
  "--ds-leading-tight": "1.25",
  "--ds-leading-snug": "1.45",
  "--ds-leading-normal": "1.7",
  "--ds-weight-medium": "600",
  "--ds-weight-bold": "700",
  "--ds-weight-extrabold": "800",

  /* ---------- Elevation ---------- */
  "--ds-shadow-xs": "0 1px 2px rgba(42, 13, 24, 0.04)",
  "--ds-shadow-sm": "0 1px 2px rgba(42, 13, 24, 0.04), 0 12px 26px -16px rgba(122, 12, 46, 0.28)",
  "--ds-shadow-md": "0 1px 2px rgba(42, 13, 24, 0.05), 0 20px 38px -18px rgba(122, 12, 46, 0.34)",
  "--ds-shadow-lg": "0 26px 60px -28px rgba(92, 8, 34, 0.75)",
  "--ds-shadow-gold": "0 10px 24px -10px rgba(212, 175, 55, 0.85)",

  /* ---------- Motion ---------- */
  "--ds-duration-fast": "150ms",
  "--ds-duration-base": "250ms",
  "--ds-duration-slow": "400ms",
  "--ds-ease": "cubic-bezier(0.22, 1, 0.36, 1)",

  /* ---------- Layout ---------- */
  "--ds-touch-min": "44px",
  "--ds-content-max": "80rem",
} as const;

export type DesignToken = keyof typeof DESIGN_TOKENS;

/** Every token name, useful for tests and documentation generation. */
export const DESIGN_TOKEN_NAMES = Object.keys(DESIGN_TOKENS) as DesignToken[];

/** Token group names — the documentation and the gate both group by this. */
export const DESIGN_TOKEN_GROUPS = [
  "Brand palette",
  "Semantic text",
  "Surfaces",
  "Borders",
  "Feedback",
  "Spacing",
  "Radii",
  "Type scale",
  "Elevation",
  "Motion",
  "Layout",
] as const;

/** Throw at module load if a token value is malformed (empty, or a bad hex). */
for (const [name, value] of Object.entries(DESIGN_TOKENS)) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Design token ${name} has an empty value.`);
  }
  if (value.startsWith("#") && !/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value)) {
    throw new Error(`Design token ${name} is not a valid hex colour: ${value}`);
  }
}
