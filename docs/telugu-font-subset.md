# Script-bounded Telugu text font

The UI now supplies Noto Sans Telugu where existing stacks already name it, and adds that same face after Poppins in Tailwind's sans stack. No Latin, serif or emoji family was removed or reordered. Existing serif-first Telugu styling remains serif-first.

Pinned font is120,204bytes, width100, variableweight100-900. Source hash, output hash and exact cmap/range are in frontend/scripts/telugu/manifest.json. Reproduce using PythonfontTools4.65.0: `python frontend/scripts/telugu/subset.py SOURCE.ttf`. Source is Google Fonts Noto Sans Telugu2.005; URL is in manifest. OFL license is bundled. No browser request to Google Fonts.

All source-supported Telugu codepoints and join controls are retained. Internal space glyph is kept for shaping but excluded from CSS routing. GSUB/GPOS/GDEF and variation tables are retained. No preload. font-display:swap keeps textpaintindependentofdownload; normal native fallback remains if it fails. Versioned/iconsasset has one-year immutablecache. EnglishpagescanneedthisfontfortheTelugulogo/footer: onefontbodypercachelifetime, notonepercomponent.

Tests pin every font-face range, bytehash/license/cacheprecedence, actualcustompaint, EN/TE320/390/1280, slow-fonttextpaintandfailure, Latin-only0requests, Englishfirstfontbodythen0transferonnextnavigation. Range-delete/truncate/widen mutants are killed. CurrentandChromium110fontcases pass; no claim of physicalSafari/Androidcoverage. Measuredresearchshaping18cases(6strings×400/700/800) retainscounts/clusters/advances/offsets; outlinesdifferbyatmost0.5fontunitsafterserialization.320introcanreflowanextraline; toolbar/headerfittestsremainunchanged.

Preserved: all EN/TE copy, creator options, outboundsharetemplates, backend, paymentmode. font-onlychange.
