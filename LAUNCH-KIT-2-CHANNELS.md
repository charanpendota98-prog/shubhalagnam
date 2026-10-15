# Channel setup notes — two configured regional entries

This is a local setup guide, not evidence that the named Telegram channels exist or that the bot has access. No external channel lookup or message send is implied.

## Configured primary usernames

| Registry key | Primary username | External status |
|---|---|---|
| `ts_bride` | `@TSBRIDE` | Not checked |
| `ts_groom` | `@TSGROOM1` | Not checked |

These values are read from `backend/channels_config.py`. Keep the configured usernames unchanged unless an authorized operator verifies and approves a replacement. Never guess or automatically probe alternates.

## Local registry review

```bash
python backend/setup_channels.py --plan
python backend/setup_channels.py --self-test
```

Both commands are local. The self-test uses a fake Telegram API client and does not contact Telegram.

`python backend/setup_channels.py --check` performs explicit read-only requests to Telegram for exact configured usernames and requires a real operator-controlled bot token. Run it only with explicit authorization. Results apply only to the selected usernames at the time of the check.

`python backend/setup_channels.py --apply` can edit channel metadata, upload a display picture, create an invite link, send a welcome message, and pin it. It is a production-capable mutation, not a smoke test; use it only after the operator confirms ownership, access, and intended changes for the exact destination.

## Profile and payment testing

Do not seed fictional members, copy sample profile details into public channels, invent payment references, or send test posts to production channels. Use isolated backend fixtures for local workflow tests and the payment provider's official sandbox for payment tests. Repository tests do not prove external channel uptime, bot permissions, payment settlement, or message delivery.

For current safe validation commands, see [`TEST-2-CHANNELS-NORMAL.md`](TEST-2-CHANNELS-NORMAL.md) and [`LOCAL-TEST-VS-ORACLE-DEPLOY.md`](LOCAL-TEST-VS-ORACLE-DEPLOY.md).
