# ROUTE_MAP.md — Phase 1 (in progress)

**Status: Phase 0 skeleton only.** Full redirect/canonical/auth-guard matrix
for all 47 frontend routes + 327 backend endpoints is a Phase 1 deliverable,
not yet exhaustive. This file will be expanded route-by-route in the next
pass. What is verified so far:

## Confirmed-correct redirects
| From | To | Mechanism | Verified |
|---|---|---|---|
| `/remarriage` | `/second-marriage` | `next.config.mjs` `redirects()`, 308 permanent (edge-level, not client JS) | `curl -D-` → `308`, `location: /second-marriage` |

## Confirmed robots/indexation state
| Route | robots meta | In sitemap.ts | Status |
|---|---|---|---|
| `/me` | `noindex,nofollow` | No | Correct |
| `/requests` | `noindex,nofollow` | **Was yes (0.92) → removed this pass** | Fixed |
| `/admin`, `/admin/photos`, `/control`, `/growth` | N/A (robots.txt `Disallow`) | No | Correct |
| `/search/*` (individual profile pages) | N/A (robots.txt `Disallow: /search/`) | No | Correct (PII protection) |

## Backend route inventory (counted, not yet individually mapped)
- 327 `@app.{get,post,put,delete,patch}` routes in `backend/main.py`.
- 100% of `/api/admin/*`, `/api/owner/*`, `/api/moderation/*` routes carry a
  server-side authorization guard (programmatically verified this pass).
- Full per-endpoint method/auth/validation table is tracked in `API_AUDIT.md`
  (also a Phase-0 skeleton — to be filled in incrementally, prioritizing
  write/mutating endpoints first).

## Next steps for this file
1. Enumerate all 47 `frontend/src/app/**/page.tsx` routes with their auth
   requirement (public / login-required / admin-only) and robots directive.
2. Trace login/logout/unauthorized redirect destinations end-to-end (Journey D
   in the master test plan).
3. Check for duplicate-URL risk from query-string filter combinations on
   `/matches`, `/search`, `/channels`.
