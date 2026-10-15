# Safe two-channel smoke checks

This runbook replaces the old seeded-account/payment walkthrough. It does **not** assume any channel, bot, sample profile, referral code, payment destination, or production deployment is available.

## Safety defaults

- Backend fixtures and stateful tests must run in the repository's isolated test stores.
- `backend/test_channels.py` is a local dry run by default. An explicitly enabled read-only check uses `getMe`, `getChat`, and `getChatMember` only; it never posts or edits channels. The operator must set `ALLOW_READ_ONLY_TELEGRAM_CHECK=1`, supply a real `BOT_TOKEN`, and provide exactly two distinct explicit `TEST_CHANNELS` destinations.
- `backend/verify_live_flow.py` performs GET requests only. It does not register users/vendors, track clicks, approve records, create payment events, or send channel messages. Its retired `--flow` and `--vendor` options fail closed.
- Never test a payment by inventing a UTR, fabricating a provider webhook, or using a production customer's account. Use the payment provider's sandbox and the project's isolated test fixtures.
- A local test cannot prove that Telegram, WhatsApp, or any other external destination is currently reachable. The optional Telegram lookup reports only the result for the exact destinations checked at that time; it does not test message delivery.

## Local code checks

From the repository root:

```bash
cd backend
../.venv/bin/python -m compileall -q .
../.venv/bin/python -m unittest -v test_catalog_ordering.py test_copy_truth.py
../.venv/bin/python test_vendors_ads.py
../.venv/bin/python test_channels.py
cd ../frontend
npm run lint
npm run build
```

`test_vendors_ads.py` is a script-style suite; its summary reports pass/fail counts. Its storage is isolated and its no-merchant-UPI case explicitly expects no checkout destination. The channel script's ordinary invocation must print a dry-run message and send nothing.

## Read-only running-app smoke check

Start the app using the project's local development instructions, then from `backend/` run:

```bash
../.venv/bin/python verify_live_flow.py
```

The defaults are loopback (`127.0.0.1`) URLs for the local website and API. For a separately operated staging instance, set `SMOKE_WEB` and `SMOKE_API` to its URLs. The script reports endpoint status only; it does not certify profile identity, payment, external-link uptime, or message delivery. An optional referral-code check uses `SMOKE_REFERRAL_CODE` and remains a public GET.

## Optional read-only Telegram lookup

Only do this when an operator explicitly authorizes an external read-only lookup of two exact destinations. It calls Telegram's `getMe`, `getChat`, and `getChatMember` methods. It does not send messages, create invite links, edit channel settings, or prove future availability. Store the bot token in a secret manager or enter it interactively; do not put it in source control or a command-history line.

```bash
read -rsp "Bot token: " BOT_TOKEN; export BOT_TOKEN; echo
read -rp "Exactly two explicit destinations, comma-separated: " TEST_CHANNELS; export TEST_CHANNELS
ALLOW_READ_ONLY_TELEGRAM_CHECK=1 ../.venv/bin/python test_channels.py
unset BOT_TOKEN TEST_CHANNELS
```

If any required value is missing, the script refuses to check. This lookup does not use member names, profile IDs, photos, phone numbers, payment references, or private data.

## Manual staging review

Use an operator-controlled staging account and the provider's sandbox for any authenticated or payment workflow. Confirm the actual configured consent, privacy, moderation, and contact-sharing behavior. Keep test accounts and generated records in isolated staging storage and remove them through the normal retention process. Do not seed or impersonate members on the public site.
