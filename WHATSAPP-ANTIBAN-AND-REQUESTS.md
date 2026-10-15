# Messaging configuration and interest-request model

This guide describes safe configuration boundaries. It does not guarantee WhatsApp/Telegram uptime, account approval, message delivery, or a response from a member. Do not use automation to evade provider limits or policies.

## Messaging defaults and operator setup

- WhatsApp is disabled by default. Keep `WHATSAPP_MODE=off`, `WA_ENABLED=false`, and `WA_INSTANCES=[]` unless an authorized operator has configured an owned, policy-compliant integration.
- Configure only the real business account, destination, and recipient that the operator controls and is permitted to contact. Do not use placeholder phone numbers, example recipients, or fallback numbers.
- Support WhatsApp is hidden until the dedicated `SUPPORT_WHATSAPP` business contact is supplied. It does not fall back to an admin/general phone number.
- Respect platform policies, recipient opt-in, rate limits, and quiet hours. Do not rotate accounts or simulate human activity to bypass abuse controls.
- Queue status is not delivery confirmation. Any user-facing notification wording must distinguish “queued” from “delivered.”
- Telegram publishing is also conditional on exact configured destinations, permissions, operator settings, and external API availability.

## Interest requests and contact sharing

Members can send a request using available credits. A recipient may accept or decline. Contact details may be shared only after acceptance and only as allowed by the applicable privacy settings. A pending request, notification, or plan purchase does not itself reveal a phone number or verify either member's identity. Declines and expiry follow the credit/refund policy displayed in the account.

## Current consumer plans

The plan catalogue in `backend/interest.py` is the source of truth:

| Plan | Price | Interest requests |
|---|---:|---:|
| Free registration | ₹0 | 3 included requests |
| Sambandham | ₹99 | 5 requests |
| Family | ₹199 | 12 requests |
| Premium | ₹299 | 25 requests |
| VIP | ₹499 | 50 requests |

Validity, renewal terms, add-ons, and applicable refund policy are shown on `/pricing` and in the signed-in account. Do not reuse older pricing tables or invent profile/payment examples.

## Local testing

Use isolated backend test storage and the repository's test fixtures for workflow tests. Do not use public member accounts, fabricated payment references, demo profiles in the live UI, or provider webhooks against production.

`backend/verify_live_flow.py` is GET-only. `backend/test_channels.py` is a no-network dry run by default; its explicitly opted-in Telegram path is read-only (`getMe`, `getChat`, `getChatMember`) and does not send or edit messages. Neither script verifies WhatsApp delivery.

## Operational references

- WhatsApp configuration and consent: `.env.example`, `backend/wa_antiban.py`, `backend/interest.py`
- Support contact: `SUPPORT_WHATSAPP` (unset means no public WhatsApp support link)
- Current plan rules: `backend/interest.py` and `/pricing`
- Safe validation: `TEST-2-CHANNELS-NORMAL.md` and `LOCAL-TEST-VS-ORACLE-DEPLOY.md`
