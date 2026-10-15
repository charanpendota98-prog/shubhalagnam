# Channel setup — current source of truth

> **Superseded planning document.** Earlier versions included stale channel counts, speculative usernames, and “LIVE”/bot-admin claims that were not externally checked. Do not use or share old instructions copied from another revision of this file.

Use the generated registry outputs instead:

- [`CHANNELS-MASTER-LIST-TELUGU.md`](CHANNELS-MASTER-LIST-TELUGU.md) — current configured listings and routing flags.
- [`CHANNEL-CREATE-LIST-TELUGU.md`](CHANNEL-CREATE-LIST-TELUGU.md) — current setup checklist.
- [`CHANNELS-SETUP-CHECKLIST.md`](CHANNELS-SETUP-CHECKLIST.md) — generated channel descriptions and operator setup notes.
- [`channel-kits/`](channel-kits/) — per-listing copy and setup material.

The canonical configuration is `backend/channels_config.py`. The legacy `live` flag means **routing eligibility in code only**. No repository test proves that a Telegram destination exists, belongs to the operator, or allows the bot to post.

If a configured username is unavailable, stop and verify an operator-owned replacement before changing the canonical registry. No guessed alternate usernames are kept or probed. Use `backend/setup_channels.py --check` only as an explicit, read-only Telegram API check with a real operator-controlled bot token; it is not proof of future availability or delivery.

Never publish member data, send a test message, or enable automatic publishing based only on local validation. See [`TEST-2-CHANNELS-NORMAL.md`](TEST-2-CHANNELS-NORMAL.md) for the opt-in safety procedure.
