# Vendor directory, lead flow, and paid placements

This guide describes the implementation in the repository. Listings and leads are not evidence that a business has been verified, and package purchase does not guarantee enquiries, reach, bookings, or message delivery.

## Categories and current packages

The 18 wedding-related categories are served from `backend/vendors.py` and displayed from the API. The same module is the source of truth for package prices:

| Package | Price / term | Included functionality |
|---|---:|---|
| One-day Promo Share Kit | ₹149 / one day of private kit access after approval | Share-ready promotional copy and poster generation; it is not a directory listing, and no external post or reach is included or guaranteed. |
| Basic Listing | ₹499 / 30 days | Paid directory listing; call and WhatsApp links appear only when supplied and valid. |
| Status Share Kit | ₹499 / one-time | Status-sized poster and share-ready copy; it is not a directory listing, and no status/group distribution is included. |
| Spotlight | ₹999 / 7 days | Eligibility for configured website ad-slot rotation; no fixed ranking or impression total is promised. |
| Standard Listing | ₹1,499 / 90 days | Directory listing and vendor dashboard for recorded enquiries; WhatsApp notification depends on a separately configured number and delivery. |
| Premium Placement | ₹3,999 / 180 days | Directory listing, eligibility for configured website placement rotation, and share-ready promotional content. No identity verification or external reach is implied. |

The two share-kit packages do not create public directory listings. After payment-reference and business-details review, the ₹149 Promo Share Kit is available in the private `/vendors/kit` page for one day; the owner can copy its materials and download posters during that term. The ₹499 Status Share Kit is a one-time private-materials package. Neither package posts to an external channel. Confirm current pricing and checkout options on `/vendors` before making a payment; if checkout details are absent, do not pay.

The listed vendor add-ons are currently unavailable online. Do not pay for an unavailable add-on.

## Public listing and customer enquiry

- Vendor records are not seeded with demo businesses in the live-facing directory. Empty or unavailable listings should remain empty rather than being replaced with fictional businesses.
- Vendor-submitted business details, prices, ratings, and photos require independent confirmation before booking. A paid placement is disclosed advertising, not a popularity, trust, or verification score.
- A customer enquiry is stored for the vendor dashboard. A WhatsApp contact or notification is available only if the relevant business supplies a valid number and the service is configured. A queued notification is not proof of delivery.
- Enquiry forms require the visitor's explicit consent before sending the lead details to a vendor.

## Review and authorization

Vendor review reads and actions use an authenticated owner session. State-changing review actions require CSRF protection. Do not remove these guards to make the admin interface easier to use; restore or repair the UI while keeping the authorization checks intact. Payment review and business identity review are separate, and the application does not independently verify vendor identity.

## Tests and external status

- `backend/test_vendors_ads.py` is a local scenario suite using isolated test state; run it with `cd backend && /tmp/mv-backend-test/bin/python test_vendors_ads.py` in this workspace.
- `backend/verify_live_flow.py` is GET-only and does not support the retired `--vendor` mutation flow. It is an endpoint smoke check, not a payment, identity, external-link, or delivery test.
- No Telegram/WhatsApp distribution, vendor message delivery, or external channel availability is established by these local checks.

## Source files

- Engine, package catalogue, consent and lead capture: `backend/vendors.py`
- Owner-session/CSRF-protected application routes: `backend/main.py`
- Poster generation: `backend/vendor_kit.py`
- Public directory, registration, profile and vendor review UI: `frontend/src/app/vendors/` and the authenticated admin/control panels.
