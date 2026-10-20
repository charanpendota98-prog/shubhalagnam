# WhatsApp Bridge — Mana Vivaha

This optional Baileys service is an internal sender for **authorized WhatsApp
numbers**. It supports consent-based operational messaging and channel publishing;
it is not a cold-message or unsolicited bulk-send system.

## Security boundary

- Run one bridge container/session directory per authorized number. Never mount
  the same Baileys auth directory into two instances.
- Set a unique `BRIDGE_TOKEN` for every instance and keep
  `BRIDGE_REQUIRE_TOKEN=true` in production. The bridge fails closed when the
  required token is missing.
- Do not publish bridge ports to the internet. The application backend calls the
  bridge over the private Compose network and exposes owner-only operations
  endpoints under `/api/admin/wa/numbers/{name}/auth/*`.
- The admin panel retrieves QR data through that authenticated backend boundary
  and renders it in memory. Auth metadata includes only a non-secret QR age so a
  stale code can be refreshed. Pairing codes are rate-limited, coalesced while a
  request is in flight, returned only to the current owner view, never logged,
  and never persisted. A pairing request must match the instance's configured
  authorized number when one is recorded.
- Bridge status contains metadata only. QR contents, pairing codes, bridge
  tokens, session credentials, recipient numbers, and message bodies must not be
  sent to worker views, analytics, public health APIs, or logs.

## Internal configuration

Each bridge uses its own `SESSION_DIR` and `BRIDGE_NAME`:

```text
wa-otp       → SESSION_DIR=/app/session-otp       → lane otp
wa-channels  → SESSION_DIR=/app/session-channels  → lane channels
wa-personal  → SESSION_DIR=/app/session-personal  → lane personal
wa-backup    → SESSION_DIR=/app/session-backup    → lane both
```

The Compose development stack already uses separate `session`, `session2`, and
`session3` mounts. Configure the backend pool with the actual private service
URLs and secrets through the deployment secret manager; do not put live tokens
in source control or browser storage. The backend encrypts bridge tokens with
AES-GCM before writing its pool state; set `WA_TOKEN_ENCRYPTION_KEY` (32+ random
characters) or use the required `TSAP_AUTH_SECRET` fallback. Legacy plaintext
pool state is read only for migration and is rewritten encrypted on the next
successful save.

The pool lanes are explicit:

- `otp`: login/registration OTP work only.
- `channels`: approved channel/post publishing only.
- `personal`: consent-based interest, referral, or operational messages only.
- `both`: optional backup/failover capacity. It is not a replacement for a
  dedicated OTP lane unless the configured failover policy permits it.

The backend keeps per-instance daily caps, cooldowns, queue retries, dead-letter
metadata, pause/resume state, and failover order. A local sender success is only
a recorded bridge result; it does **not** prove recipient delivery or reading.

## Owner login workflow

1. Start the internal bridge service with its unique token and isolated session
   directory.
2. Sign in to the protected control portal as the **owner**. Workers and other
   staff cannot access login material or number configuration.
3. Open **WhatsApp Operations Console**. Check a bridge's auth status, then use
   **Show QR** or enter the authorized phone number for **Request code**.
4. Scan the QR in WhatsApp Linked Devices, or enter the one-time pairing code in
   WhatsApp. Refresh auth status after linking.
5. Keep OTP, channel, personal, and optional backup lanes separately configured.
   A channel outage must not silently route OTP work through a non-OTP instance.

The direct bridge routes `/auth/status`, `/auth/qr`, `/auth/pairing-code`, `/send`,
`/send-image`, `/presence`, `/groups`, and `/status` are token-protected. The
legacy `/qr` page is also protected and is retained only for compatibility; use
the owner application console instead.

## Consent and operational safety

- Send only to numbers/groups the organization is authorized to operate and to
  recipients who have opted in or requested the operational message.
- Keep channel mappings supplied by the business; do not invent destinations.
- Respect WhatsApp policies, quiet hours, per-number gaps, daily caps, pause and
  failover controls. Fix a bridge/QR/auth problem before requeueing dead letters.
- Do not claim that a queue entry, bridge response, or local send result proves
  delivery. The UI intentionally labels these as recorded local results.
