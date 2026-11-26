# Missing resource status

Ordinary missing pages in both locales keep the full localized server-rendered 404, including without JavaScript. The existing proxy supplies their HTTP status because separate root layouts otherwise return a minimal error shell for thrown notFound.

A URL landing in the Telugu catch-all under a reserved resource prefix now throws server notFound: api, _next, cards, photos, voice, docs, openapi, metrics, promo, icons, editorial and .well-known. These are resource/service paths, not member-facing pages. Real static assets and backend rewrites resolve before the catch-all. A missing resource may use the minimal Next error shell; it must not return a successful 200 HTML response. No actual page route overlaps these prefixes; a static test pins that invariant.

Proxy exemptions for docs, openapi.json and metrics are exact, matching their rewrite definitions, not arbitrary child paths. Backend rewrite definitions and service authorization are unchanged. No live photo/member resource was probed; scope research used fictional missing names only.

Browser tests cover reserved missing status, prefix lookalikes, full EN/TE no-JavaScript pages, real font MIME/body size, static resources and existing redirects. No copy, member data, payment or backend changes.
