# Script-bounded Telugu text font

The UI supplies Noto Sans Telugu where existing stacks already name it, and adds that same face after Poppins in Tailwind's sans stack. No Latin, serif or emoji family was removed or reordered. Existing serif-first Telugu styling remains serif-first.

The pinned font is 120,204 bytes, width 100, variable weight 100-900. Source hash, output hash and exact cmap/range are in frontend/scripts/telugu/manifest.json. Reproduce using Python fontTools 4.65.0: `python frontend/scripts/telugu/subset.py SOURCE.ttf`. Source is Google Fonts Noto Sans Telugu 2.005; URL is in the manifest. The OFL license is bundled. No browser request to Google Fonts.

All source-supported Telugu codepoints and join controls are retained. The internal space glyph is kept for shaping but excluded from CSS routing. GSUB/GPOS/GDEF and variation tables are retained. No preload. The swap font-display setting keeps text paint independent of download; normal native fallback remains if it fails. The versioned icons asset has a one-year immutable cache. English pages can need this font for the Telugu logo/footer: one font body per cache lifetime, not one per component.

Tests pin every font-face range, byte hash, license and cache precedence. They cover actual custom paint, EN/TE at 320/390/1280, slow-font text paint and failure, Latin-only zero requests, and an English first font body followed by zero transfer on the next navigation. Range delete, truncate and widen mutants are killed. Current Chromium and Chromium 110 font cases pass; no claim of physical Safari or Android coverage. Measured research shaping used 18 cases (six strings at weights 400/700/800) and retains counts, clusters, advances and offsets; outlines differ by at most half a font unit after serialization. The 320 intro can reflow an extra line; toolbar/header fit tests remain unchanged.

Preserved: all EN/TE copy, creator options, outbound share templates, backend and payment mode. This is a font-only change.
