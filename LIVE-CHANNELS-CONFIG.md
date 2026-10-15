# Telegram channel registry configuration

This note describes repository configuration only. It is **not** a report that any Telegram channel exists, is reachable, or has granted bot permissions. No external Telegram check was performed for this change.

## Configured primary usernames

The canonical registry is `backend/channels_config.py`. It contains 64 directory entries: 1 official, 5 regional, 5 religion, 45 selected-community, and 8 special entries. The primary usernames below are preserved as configured; their status is unchecked:

| Registry key | Configured username | External status |
|---|---|---|
| `ts_bride` | `@TSBRIDE` | Not checked |
| `ts_groom` | `@TSGROOM1` | Not checked |
| `ap_bride` | `@APBRIDE` | Not checked |
| `ap_groom` | `@APGROOM1` | Not checked |
| `official` | `@TSAP_MATRIMONY` | Not checked |

The remaining entries are also defined in the canonical registry. A configured username or syntactically valid link does not prove availability, ownership, bot-admin status, delivery, or membership. Do not substitute a guessed username or probe alternate usernames. If an operator-owned destination cannot be confirmed, stop and have the operator verify an approved replacement before editing the registry.

## Safe local commands

From the repository root:

```bash
python backend/setup_channels.py --plan       # local registry/configuration output; no Telegram request
python backend/setup_channels.py --self-test  # FakeBot only; no Telegram request
python backend/gen_frontend_channels.py       # regenerate frontend data from the canonical registry
python backend/gen_master_list.py             # regenerate the master-list document
```

`python backend/setup_channels.py --check` is an explicit external, read-only Telegram API lookup of the exact configured usernames and requires a real operator-controlled bot token. It reports only what Telegram returns at check time; it is not a future-availability or delivery guarantee. Do not run it without explicit operator authorization.

`python backend/setup_channels.py --apply` is **not** a smoke test: it can change Telegram channel metadata, upload artwork, create an invite link, send a welcome message, and pin it. Do not run it unless an authorized operator explicitly approves those mutations for the exact destination.

## Runtime and public wording

The API and generated frontend expose routing eligibility as repository metadata and use `external_status_checked: false`. Automatic routing may select configured candidates after profile approval when publishing is configured; delivery is not guaranteed. Public links show only explicit configured links or the configured primary username; no alternate usernames are guessed.
