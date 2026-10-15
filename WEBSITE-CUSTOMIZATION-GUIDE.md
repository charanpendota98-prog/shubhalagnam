# Website customization guide — Mana Vivaha / మన వివాహ

This replaces an older guide that contained fabricated support numbers, obsolete prices, and outdated verification text. Do not copy old examples into the public site.

## Main configuration files

| Setting | Current source |
|---|---|
| Brand, site URLs, pricing display, feature flags, contact visibility | `frontend/src/lib/site-config.ts` |
| Public support WhatsApp/phone | `NEXT_PUBLIC_SUPPORT_WHATSAPP` / `NEXT_PUBLIC_SUPPORT_PHONE` in the deployment environment; leave unset until the business supplies its real contact |
| Support email | `NEXT_PUBLIC_SUPPORT_EMAIL` for the public site and `SUPPORT_EMAIL` for backend integrations; leave blank until a real business mailbox is owner-confirmed |
| Operator/legal identity, location, grievance officer | `NEXT_PUBLIC_LEGAL_NAME`, `NEXT_PUBLIC_BUSINESS_CONTACT_NAME`, `NEXT_PUBLIC_BUSINESS_LOCATION`, and `NEXT_PUBLIC_GRIEVANCE_OFFICER`; all default blank and must be owner-verified before publication |
| Browser push contact | `VAPID_SUBJECT` plus a valid matching `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` pair; no fallback contact is invented, and readiness is false until sender dependency and configuration validate |
| Canonical request plans, add-ons, and renewal | `backend/interest.py` |
| Channel labels, exact configured primary usernames, directory metadata | `backend/channels_config.py` (generated frontend data comes from `backend/gen_frontend_channels.py`) |
| Homepage content and copy | `frontend/src/app/page.tsx` and the components it imports |
| Registration fields and labels | `frontend/src/app/register/` and shared data in `frontend/src/lib/` |
| Navigation/footer | `frontend/src/components/SiteHeader.tsx`, `SiteFooter.tsx` |

`NEXT_PUBLIC_*` values are compiled into the frontend image at build time. Update the production Compose build arguments and rebuild the frontend after changing them; runtime-only container variables do not change an already-built client bundle.

## Safety and content rules

- Keep the **Mana Vivaha** / **మన వివాహ** brand intact.
- Do not invent or publish a WhatsApp number, phone recipient, payment reference, member profile, profile photo, testimonial, or channel destination.
- An empty support-number setting means WhatsApp support must remain hidden; never substitute an admin or personal number.
- Use ₹99 as the lowest paid consumer plan (5 interest requests); `backend/interest.py` is authoritative for other tiers and add-ons.
- Describe member information as member-submitted unless a specific check was performed. OTP, moderation, photo review, and identity review are distinct; do not imply any one is a guarantee.
- Configured channel metadata is not evidence of availability, bot permissions, uptime, or delivery.

## Validation

Run the frontend checks defined by its package scripts and backend tests that use isolated fixtures. Do not describe local typecheck/build/test success as proof of external service health or production deployment. See [`README.md`](README.md) and [`LOCAL-TEST-VS-ORACLE-DEPLOY.md`](LOCAL-TEST-VS-ORACLE-DEPLOY.md).
