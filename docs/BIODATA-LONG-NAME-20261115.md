# Biodata export full-name repair

Fresh live long-text export review found that the name uses `truncate` in the printable canvas. The downloaded JPG therefore permanently loses the end of long names, in English and Telugu.

The canvas name now wraps naturally, with its ID badge held separately and a gap between them. The canvas can also break unusually long unspaced strings instead of clipping through its frame. No API, member data, registration, provider, payment or privacy behavior changes.

Four browser cases cover English/Telugu at 320px/1280px, names repeated three times, full heading contents, wrapping rather than ellipsis, no horizontal page overflow, successful JPG download, no page errors and no writes. Four new plus eight PR48 production-build cases pass. Lint/static/security/build pass. Actual English and Telugu exported JPG pixels inspected: full synthetic names show across multiple lines without overlap with the ID badge or following sections.

This is a bounded export repair. Existing unset-field placeholders and broader community language work remain separate follow-ups, not claimed fixed here.
