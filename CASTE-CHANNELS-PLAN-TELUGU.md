# Caste and community channel configuration

This file replaces an old proposal that invented Telegram usernames, promised automatic cross-posting, and recommended seeding channels with member profiles. Those claims and proposed destinations are not current configuration.

Use the canonical registry in [`backend/channels_config.py`](backend/channels_config.py) and the operator-facing [`CHANNELS-MASTER-LIST-TELUGU.md`](CHANNELS-MASTER-LIST-TELUGU.md) for the exact configured primary usernames. Do not add state splits, religion splits, interfaith destinations, alternate handles, or other destinations unless the operator independently confirms control of the exact destination and approves a registry change.

## What configuration means

- Registry entries describe local directory/routing metadata only.
- A configured username/link does not establish external availability, ownership, bot-admin status, membership, or successful delivery.
- Routing eligibility is not proof that a post was sent or received.
- No alternate usernames are guessed or automatically probed.
- Do not seed public channels with invented member profiles or payment/test content.

## Safe verification

`backend/test_channels.py` is a local no-network dry run by default. Its explicitly enabled Telegram path only performs read-only `getMe`, `getChat`, and `getChatMember` lookups for operator-supplied exact destinations; it does not post, edit, pin, or invite. `backend/setup_channels.py --apply` is a separate mutating operation and must not be used as a smoke test.

See [`TEST-2-CHANNELS-NORMAL.md`](TEST-2-CHANNELS-NORMAL.md) and [`LOCAL-TEST-VS-ORACLE-DEPLOY.md`](LOCAL-TEST-VS-ORACLE-DEPLOY.md). Local validation is not evidence of external uptime or delivery.
