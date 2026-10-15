# Channel setup checklist

This file replaces an obsolete checklist that listed unverified usernames, alternate handles, seeded-profile counts, and claimed channels were live. Do not use those old instructions.

## Before any setup

1. Review the exact configured primary usernames in [`CHANNELS-MASTER-LIST-TELUGU.md`](CHANNELS-MASTER-LIST-TELUGU.md) and `backend/channels_config.py`.
2. An authorized operator must independently confirm that each exact destination is owned or approved and that any required bot permissions are granted. Repository metadata does not prove this.
3. If the exact configured username is unavailable or not controlled by the operator, stop. Do not try a guessed alternative; verify an operator-approved destination before changing configuration.
4. Keep dry-run and publishing disabled while reviewing. Do not create sample profiles, seeded member posts, or fake payment events.
5. Use `backend/test_channels.py` only for its default local dry run or its explicitly enabled read-only lookup path. Do not use setup/apply to smoke-test production.

## Registry scope

There are 64 configured directory entries. This count is a local source-of-truth count, not a count of live Telegram channels. Exact external availability, bot-admin permissions, public visibility, and delivery have not been verified by this checklist.

See [`CHANNELS-SETUP-CHECKLIST.md`](CHANNELS-SETUP-CHECKLIST.md) for the current configuration-oriented checklist and [`TEST-2-CHANNELS-NORMAL.md`](TEST-2-CHANNELS-NORMAL.md) for safe local checks.
