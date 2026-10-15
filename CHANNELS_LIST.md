# Mana Vivaha Telegram channel registry

This file replaces an older list that included guessed backup usernames, state-split destinations that are not configured, and claims that channels were already live. Do not use that obsolete list to create or contact channels.

## Source of truth

- Canonical registry: [`backend/channels_config.py`](backend/channels_config.py)
- Current human-readable list: [`CHANNELS-MASTER-LIST-TELUGU.md`](CHANNELS-MASTER-LIST-TELUGU.md)
- Setup checklist: [`CHANNELS-SETUP-CHECKLIST.md`](CHANNELS-SETUP-CHECKLIST.md)
- Safe test instructions: [`TEST-2-CHANNELS-NORMAL.md`](TEST-2-CHANNELS-NORMAL.md)

The repository currently contains **64 configured directory entries**. A configured primary username or URL is not proof that a Telegram channel exists, is available, is controlled by the operator, has granted bot permissions, or will receive a post. Do not guess or probe alternate usernames. If an operator-controlled destination cannot be confirmed, stop and verify an approved replacement before changing the registry.

No channels are represented here as “live” or externally verified. Local registry generation and tests do not check external uptime, permissions, membership, or message delivery. Do not seed channels with fictional member profiles or test messages.
