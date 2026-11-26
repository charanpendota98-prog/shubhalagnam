# Emoji font fallback

A 155,468-byte self-hosted COLRv1 WOFF2 subset supplies decorative emoji missing from the device. Existing native Apple/Segoe/Noto color emoji faces are preferred; the downloaded font sits before generic system fallback because generic fallback can select a missing-glyph box. Existing Latin and Telugu faces stay first. The font unicode-range excludes Latin, digits, space and Telugu, so those are not replaced. No string, option, outbound/share template or API payload is rewritten.

The source inventory is an upper bound: 2,062 emoji-presentation source occurrences, 201 sequences, 93 files, including locale branches, states, admin and share templates. The local test environment has no emoji font: 98 of its 122 missing sequences date to Emoji 0.6/1.0. Do not mistake this for phone prevalence. Newer sequences can still be missing on older devices. No physical-device claim is made.

The font uses `tech(color-COLRv1)`. Current Chromium153 and older Chromium110 were tested, EN/TE at320/390/1280, including provider-font inspection and pixels. Unsupported engines skip this source and retain native/generic fallback. No second legacy format is shipped. Safari is not claimed to support COLRv1; its native Apple emoji is retained. Download failure does not hide text or disable forms; an emoji-less device can still show decorative tofu when the download fails.

No preload, third-party runtime request or JavaScript icon scan. `font-display:swap` keeps text visible. Versioned asset cache is one year immutable; change filename when changing bytes. At1Mbps,155,468bytes takes roughly1.24seconds of payload transfer before latency; cached visits avoid transfer. The existing CSP allows same-origin fonts. Asset lives under the existing /icons service prefix so it receives HTTP200 rather than the localized unknown-route404.

Rebuild: Python fontTools4.65.0 plus Brotli, `python frontend/scripts/emoji/subset.py SOURCE.ttf`. See pinned source URL/SHA and outputSHA in manifest. Subsetting retains shaping closure and all layout features; strips OT-SVG to keep the smaller COLRv1-only payload. Font copyright/license is bundled alongside the file, SIL OFL1.1. Font family is a CSS alias; upstream name retained, no reserved font name stated in bundled license.

Sources: https://unicode.org/Public/emoji/latest/emoji-test.txt ; https://developer.android.com/develop/ui/views/text-and-emoji/emoji2 ; https://developer.chrome.com/blog/colrv1-fonts ; https://caniuse.com/colr-v1 ; https://github.com/googlefonts/noto-emoji/blob/main/LICENSE
