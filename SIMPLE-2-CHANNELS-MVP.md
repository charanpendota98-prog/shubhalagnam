# Two-entry channel directory — current configuration

This note replaces the former “live MVP” status claims. `@TSBRIDE` and `@TSGROOM1` are configured primary usernames in `backend/channels_config.py`; their external availability and bot permissions have not been checked in this repository task.

- The canonical directory currently contains 64 configured entries. Registry routing flags are local metadata, not uptime or permission checks.
- No external Telegram or WhatsApp lookup, post, or channel mutation is part of local validation.
- Do not use invented profiles, generated payment references, or sample credentials in live-facing channels.
- The optional `backend/test_channels.py` path is read-only and requires explicit operator opt-in. Its default invocation performs no network request.
- `backend/setup_channels.py --apply` is a separate operation that can modify Telegram metadata and send/pin a welcome message; it is not a smoke test.

See [`LAUNCH-KIT-2-CHANNELS.md`](LAUNCH-KIT-2-CHANNELS.md) for safe local commands and [`CHANNELS-MASTER-LIST-TELUGU.md`](CHANNELS-MASTER-LIST-TELUGU.md) for the generated registry list. Neither document claims external channel availability.
