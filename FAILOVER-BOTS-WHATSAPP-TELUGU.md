# Messaging integrations — operator-verified setup

This is a configuration checklist, not a guarantee of delivery, uptime, or platform approval. Local tests do not establish Telegram or WhatsApp availability. No bot username, phone number, group ID, bridge address, or fallback destination is supplied here.

## Safe defaults

- Telegram publishing is dry-run by default. Keep `PUBLISH_DRY_RUN=true` and automatic publishing disabled until the operator verifies each exact destination and permission.
- WhatsApp is disabled by default (`WHATSAPP_MODE=off`, `WA_ENABLED=false`, `WA_INSTANCES=[]`). Leave these values unchanged unless an authorized operator intentionally configures an owned integration.
- Do not add guessed backup bot usernames, example recipients, masked phone numbers, or placeholder group IDs. Configure only accounts and destinations the operator controls and has permission to message.
- A backup integration is not automatically safer or more reliable. Verify its separate ownership, access scope, consent basis, rate limits, and incident handling before enabling it.

## Operator checklist

1. Store real tokens in a secret manager; never commit tokens or paste them into source files, tickets, or shell history.
2. Confirm ownership and least-privilege permissions for each Telegram bot and channel. A registry entry or successful local build is not a Telegram check.
3. For WhatsApp, use an approved business integration or an operator-controlled bridge, and send only to destinations that have explicitly opted in and are permitted by the applicable policy.
4. Keep `WA_ENABLED=false` and publishing dry-run enabled while reviewing configuration. Check the exact destination, test message, and consent before any opt-in live send.
5. `backend/test_channels.py` is a local no-network dry run by default. Its opt-in `ALLOW_READ_ONLY_TELEGRAM_CHECK=1` path only calls `getMe`, `getChat`, and `getChatMember`; it does not send a message or test delivery.
6. Monitor delivery responses, retries, and failures. A successful request does not guarantee that a person received or saw the message.

Never treat failover as a promise that a post will reach another destination. If a configured destination is unavailable or unauthorized, stop and investigate; do not silently switch to an unverified alternative.
