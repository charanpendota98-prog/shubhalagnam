"""
Digest preview availability guard + retention:
1. GET /api/digest/preview is admin-only (route map contract). Unauthenticated
   calls AND calls with a VALID non-admin member token are rejected and must
   not write to the durable digest history (previously every public call
   appended a row: unbounded durable growth on a 1 GB host).
2. Admin preview works and records exactly one bounded entry.
3. POST /api/publish/digest (admin) still works through the guarded internal
   digest_preview(request) call - with outbound transports stubbed.
4. POST /api/digest/personal/run (admin) logs through the bounded helper.
5. The persisted digest history has a hard retention cap, verified across a
   disk persist/reload round-trip (db_store.save -> db_store.load).
"""
import asyncio
import os
import sys

os.environ["TSAP_AUTH_MODE"] = "enforce"
import secrets
os.environ["ADMIN_KEY"] = "digest-guard-" + secrets.token_urlsafe(16)
os.environ["DIGEST_PERSONAL_SEND"] = "0"  # personal-run case must exercise the send-disabled path
sys.path.insert(0, os.path.dirname(__file__))
from test_storage import isolate_test_stores
isolate_test_stores("digest-preview-guard")

import db_store
import hardening
import main
from testutil_client import TestClient

client = TestClient(main.app)
ADMIN = {"X-Admin-Key": os.environ["ADMIN_KEY"]}
passed = 0
failed = 0

def check(name, cond, detail=None):
    global passed, failed
    if cond:
        passed += 1
        print(f"  â {name}")
    else:
        failed += 1
        print(f"  â {name} â DETAIL: {detail}")

print("\n=== DIGEST PREVIEW GUARD ===")
main.DB_DIGEST[:] = []

# 1. Unauthenticated: rejected, no durable write
before = len(main.DB_DIGEST)
res = client.get("/api/digest/preview")
check("unauthenticated preview is rejected", res.status_code in (401, 403, 404), res.status_code)
check("unauthenticated preview writes nothing", len(main.DB_DIGEST) == before, len(main.DB_DIGEST))

# 2. VALID non-admin member token: still rejected, no write
member_token = hardening.sign_token("MV9999", scope="user")
identity = hardening.verify_token(member_token)
check("minted member token verifies as member MV9999",
      bool(identity) and identity.get("tsap_id") == "MV9999", identity)
res = client.get("/api/digest/preview", headers={"Authorization": f"Bearer {member_token}"})
check("verified non-admin member is denied preview", res.status_code in (401, 403, 404), res.status_code)
check("member-token preview writes nothing", len(main.DB_DIGEST) == before, len(main.DB_DIGEST))

# 3. Admin: works, appends exactly one entry
res = client.get("/api/digest/preview", headers=ADMIN)
check("admin preview succeeds", res.status_code == 200, res.status_code)
body = res.json()
check("admin preview returns digest text", isinstance(body.get("text"), str) and len(body["text"]) > 10, body)
check("admin preview appends one entry", len(main.DB_DIGEST) == before + 1, len(main.DB_DIGEST))

# 4. publish/digest internal call passes the guard with the admin request,
#    with every outbound transport stubbed (no real Telegram/WhatsApp calls)
outbound = {"wa": 0, "tg": 0}
def _fake_enqueue(targets, text, **kw):
    outbound["wa"] += 1
    return {"success": True, "stub": True, "targets": list(targets)}
async def _fake_tg(chat, text):
    outbound["tg"] += 1
    return {"ok": True, "stub": True, "channel": chat}
_orig_enq, _orig_lc, _orig_tg = main.enqueue_whatsapp, main.live_channels, main._send_telegram_public
main.enqueue_whatsapp = _fake_enqueue
main.live_channels = lambda: [{"chat_id": "@stub_channel"}]
main._send_telegram_public = _fake_tg
try:
    before = len(main.DB_DIGEST)
    res = client.post("/api/publish/digest", headers=ADMIN)
    check("admin publish succeeds via guarded preview", res.status_code == 200, (res.status_code, res.text[:200]))
    check("publish records exactly one digest entry", len(main.DB_DIGEST) == before + 1, len(main.DB_DIGEST))
    res = client.post("/api/publish/digest")
    check("unauthenticated publish is rejected", res.status_code in (401, 403, 404), res.status_code)
finally:
    main.enqueue_whatsapp, main.live_channels, main._send_telegram_public = _orig_enq, _orig_lc, _orig_tg
check("publish sent via stubs only: 1 WA enqueue + 1 telegram", outbound["wa"] == 1 and outbound["tg"] == 1, outbound)

# 5. personal/run logs via the bounded helper (default env: send disabled)
before = len(main.DB_DIGEST)
res = client.post("/api/digest/personal/run", headers=ADMIN, json={"lang": "te"})
check("admin personal run succeeds", res.status_code == 200, (res.status_code, res.text[:200]))
personal = [e for e in main.DB_DIGEST if e.get("kind") == "personal"]
check("personal run logged exactly one bounded entry", len(main.DB_DIGEST) == before + 1 and len(personal) == 1,
      (len(main.DB_DIGEST), len(personal)))
res = client.post("/api/digest/personal/run", json={"lang": "te"})
check("unauthenticated personal run is rejected", res.status_code in (401, 403, 404), res.status_code)

# 6. Retention cap, then disk persist/reload keeps history bounded
cap = main.DIGEST_HISTORY_MAX
check("cap is a sane positive bound", isinstance(cap, int) and 10 <= cap <= 10000, cap)
main.DB_DIGEST[:] = []
for i in range(cap + 25):
    main._append_digest({"at": f"probe-{i}", "brides": 0, "grooms": 0})
check("history is capped after cap+25 appends", len(main.DB_DIGEST) == cap, len(main.DB_DIGEST))
check("newest entries survive the trim", main.DB_DIGEST[-1].get("at") == f"probe-{cap + 24}", main.DB_DIGEST[-1])

snap = db_store.snapshot(main.DB_USERS, main.DB_INTERESTS, main.DB_PAYMENTS, main.DB_OTPS,
                         main.VERIFIED_PHONES, main.DB_VIEWS, main.DB_SAVES, main.DB_DIGEST)
check("snapshot carries the bounded history", len(snap.get("digest", [])) == cap, len(snap.get("digest", [])))
saved = db_store.save(snap, force=True)
check("persist to disk succeeds", bool(saved), saved)
reloaded = db_store.load()
check("reloaded history stays bounded", len(reloaded.get("digest", [])) == cap, len(reloaded.get("digest", [])))
check("reloaded history keeps newest entries",
      reloaded.get("digest", [{}])[-1].get("at") == f"probe-{cap + 24}", reloaded.get("digest", [])[-1:])

# 7. Unauthenticated flood regression: many public calls, zero growth
main.DB_DIGEST[:] = []
for _ in range(50):
    client.get("/api/digest/preview")
check("50 unauthenticated calls add zero entries", len(main.DB_DIGEST) == 0, len(main.DB_DIGEST))

print(f"\n=== RESULT: {passed} passed, {failed} failed ===")
sys.exit(1 if failed else 0)
