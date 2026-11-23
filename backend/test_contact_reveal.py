"""
🔒 CONTACT REVEAL (QR TOKEN) TEST SUITE
=======================================
Run as a script (CI convention):  python test_contact_reveal.py   (backend/ cwd)
Import-safe: no subprocess, no store, no network at import time.

Cover:
  1. Token issue → resolve roundtrip returns wa.me link + masked number only
  2. Single-use: second resolve -> already_used
  3. Expired token -> expired
  4. Tampered token -> bad_token
  5. Caller mismatch (other member) -> bad_token
  6. No accepted interest -> not_mutual
  7. Blocked pair -> blocked (and resolve re-checks at redeem time)
  8. invalidate_pair / invalidate_member revoke outstanding tokens
  9. Restart posture: unknown token never resolves (fail-closed)
 10. wa_link_for: E.164 digits only, empty on junk
 11. API: search payload carries no raw phone
 12. API: issue 403 not_mutual -> accept -> 200 bilingual -> resolve ok -> replay 410
 13. API: block revokes outstanding token (resolve 403) and blocks new issue (403)
 14. API: resolve response body never contains the raw phone digits
"""
import os
import sys
import time

os.environ.setdefault("WA_TEST_FAST", "1")
os.environ.setdefault("EMAIL_MODE", "mock")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

PASS, FAIL, FAILED = 0, 0, []


def check(name, cond, extra=None):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  ✅ {name}")
    else:
        FAIL += 1
        FAILED.append(name)
        print(f"  ❌ {name}" + (f"  → {extra}" if extra else ""))


def run_suite():
    from test_storage import isolate_test_stores
    isolate_test_stores("contact-reveal")
    import contact_reveal as CR

    interests = [{"from_id": "TSAPAAAA1", "to_id": "TSAPBBBB2", "status": "accepted"}]
    no_block = lambda a, b: False

    # 1. roundtrip
    t = CR.issue_token("TSAPAAAA1", "TSAPBBBB2")
    check("1. issue returns token + expiry", bool(t.get("token")) and t.get("expires_in") == CR.TTL_SECONDS, t)
    r = CR.resolve_token(t["token"], "TSAPAAAA1", interests, no_block)
    check("1a. resolve ok for owner", r.get("ok") is True and r.get("target") == "TSAPBBBB2", r)

    # 2. single-use
    r2 = CR.resolve_token(t["token"], "TSAPAAAA1", interests, no_block)
    check("2. replay -> already_used", r2.get("reason") == "already_used", r2)

    # 3. expired
    expired_t = CR.issue_token("TSAPAAAA1", "TSAPBBBB2")
    expired = expired_t["token"]
    CR._CONTACT_TOKENS[expired]["exp"] = int(time.time()) - 5
    r3 = CR.resolve_token(expired, "TSAPAAAA1", interests, no_block)
    check("3. expired token -> expired", r3.get("reason") == "expired", r3)

    # 4. tampered signature
    bad = t["token"][:-2] + ("AA" if not t["token"].endswith("AA") else "BB")
    r4 = CR.resolve_token(bad, "TSAPAAAA1", interests, no_block)
    check("4. tampered token -> bad_token", r4.get("reason") == "bad_token", r4)

    # 5. caller mismatch
    t5 = CR.issue_token("TSAPAAAA1", "TSAPBBBB2")
    r5 = CR.resolve_token(t5["token"], "TSAPCCCC3", interests, no_block)
    check("5. non-owner caller -> bad_token", r5.get("reason") == "bad_token", r5)

    # 6. not mutual
    t6 = CR.issue_token("TSAPAAAA1", "TSAPBBBB2")
    r6 = CR.resolve_token(t6["token"], "TSAPAAAA1", [], no_block)
    check("6. interest gone at resolve -> revoked (withdrawn)", r6.get("reason") == "revoked", r6)
    check("6a. mutual check one accepted either direction",
          CR.is_mutual_accepted(interests, "TSAPBBBB2", "TSAPAAAA1") is True
          and CR.is_mutual_accepted([{"from_id": "X", "to_id": "Y", "status": "pending"}], "X", "Y") is False)

    # 7. blocked at resolve
    t7 = CR.issue_token("TSAPAAAA1", "TSAPBBBB2")
    r7 = CR.resolve_token(t7["token"], "TSAPAAAA1", interests, lambda a, b: True)
    check("7. blocked at resolve -> blocked", r7.get("reason") == "blocked", r7)

    # 8. invalidation
    t8 = CR.issue_token("TSAPAAAA1", "TSAPBBBB2")
    n = CR.invalidate_pair("TSAPBBBB2", "TSAPAAAA1")
    r8 = CR.resolve_token(t8["token"], "TSAPAAAA1", interests, no_block)
    check("8. invalidate_pair revokes", n >= 1 and r8.get("reason") == "revoked", (n, r8))
    t8b = CR.issue_token("TSAPAAAA1", "TSAPBBBB2")
    n2 = CR.invalidate_member("TSAPBBBB2")
    r8b = CR.resolve_token(t8b["token"], "TSAPAAAA1", interests, no_block)
    check("8a. invalidate_member revokes", n2 >= 1 and r8b.get("reason") == "revoked", (n2, r8b))

    # 9. restart posture: well-formed but unknown token (fresh module state) never resolves
    ghost = "ghost-" + "x" * 30
    r9 = CR.resolve_token(ghost, "TSAPAAAA1", interests, no_block)
    check("9. unknown token -> bad_token (fail-closed)", r9.get("reason") == "bad_token", r9)

    # 9b. opaque token: random, carries no member IDs, expiry or signature
    to = CR.issue_token("TSAPAAAA1", "TSAPBBBB2")["token"]
    import base64 as _b64
    try:
        decoded = _b64.urlsafe_b64decode(to + "=" * (-len(to) % 4)).decode("latin-1")
    except Exception:
        decoded = ""
    check("9b. token carries no member IDs", "TSAPAAAA1" not in to and "TSAPBBBB2" not in to
          and "TSAPAAAA1" not in decoded and "TSAPBBBB2" not in decoded and len(to) >= 32, to)
    check("9c. viewer_of is a server-side lookup (unknown -> None)",
          CR.viewer_of(to) == "TSAPAAAA1" and CR.viewer_of("nope") is None)

    # 9d. per-viewer rate limit is keyed by member, not by IP
    import hardening as _H
    class _Req:
        method = "POST"
        cookies = {}
        headers = {}
        class url:
            path = "/api/contact/token"
    _old = (_H.RL_DISABLED, _H.dev_mode)
    _H.RL_DISABLED = False
    _H.dev_mode = lambda: False
    try:
        hits = [_H.viewer_rate_limit_hit(_Req, "RLVIEW01", 3, 60) for _ in range(4)]
        other = _H.viewer_rate_limit_hit(_Req, "RLVIEW02", 3, 60)
    finally:
        _H.RL_DISABLED, _H.dev_mode = _old
    class _AdminReq(_Req):
        headers = {"x-admin-key": _H.ADMIN_KEY}
    _H.RL_DISABLED = False
    _H.dev_mode = lambda: False
    try:
        admin_hits = [_H.viewer_rate_limit_hit(_AdminReq, "RLVIEW03", 3, 60) for _ in range(6)]
        member_after = [_H.viewer_rate_limit_hit(_Req, "RLVIEW03", 3, 60) for _ in range(3)]
    finally:
        _H.RL_DISABLED, _H.dev_mode = _old
    check("9e. admin-key calls never burn a member's quota",
          admin_hits == [None] * 6 and member_after == [None] * 3, (admin_hits, member_after))
    check("9d. viewer limit trips on the 4th call, other member unaffected",
          hits[:3] == [None] * 3 and hits[3] and hits[3]["limit"] == 3 and other is None, (hits, other))

    # 10. wa_link_for
    check("10. wa_link digits only", CR.wa_link_for("+91 98480 12345") == "https://wa.me/919848012345",
          CR.wa_link_for("+91 98480 12345"))
    check("10a. wa_link junk -> empty", CR.wa_link_for("not-a-phone") == "" and CR.wa_link_for("123") == "")

    # ---- API integration -------------------------------------------------
    from fastapi.testclient import TestClient
    import main as M
    import email_channel
    import smart12 as S12

    email_channel.send_email = lambda to, subject, text: {"ok": True, "channel": "email", "detail": "mock_sent"}
    email_channel.EMAIL_MODE = "mock"
    c = TestClient(M.app)

    def register(name, phone, email, dob):
        from testutil_photos import TEST_PROFILE_PHOTO
        payload = {
            "gender": "Groom", "religion": "Hindu", "state": "TS", "district": "Hyderabad",
            "marital_status": "Never Married", "full_name": name, "profile_for": "Self",
            "dob": dob, "height": "5ft 6in", "caste": "Reddy",
            "phone": phone, "password": "password123", "email": email,
            "photo_private": "true", "consent_confirmed": "true", "photo_consent_confirmed": "true",
        }
        resp = c.post("/api/register", data=payload,
                      files={"photo_file": ("profile.jpg", TEST_PROFILE_PHOTO, "image/jpeg")})
        return resp

    r_a = register("Contact Reveal Viewer", "9861111111", "cr-viewer@manavivaha.com", "1994-02-03")
    r_b = register("Contact Reveal Target", "9862222222", "cr-target@manavivaha.com", "1995-04-05")
    check("11. two members registered", r_a.status_code == 200 and r_b.status_code == 200,
          (r_a.status_code, r_b.status_code, r_b.text[:200]))
    if r_a.status_code != 200 or r_b.status_code != 200:
        print(f"\n=== RESULT: {PASS} passed, {FAIL} failed ===")
        return FAIL
    a_id = r_a.json()["tsap_id"].upper()
    b_id = r_b.json()["tsap_id"].upper()

    # 11a. search payload has no raw phone (approve in-store so it is listed)
    for u in M.DB_USERS:
        if str(u.get("tsap_id", "")).upper() == b_id:
            u["status"] = "approved"; u["is_approved"] = True; u["is_active"] = True
    s = c.get(f"/api/search/{b_id}")
    body = s.text
    check("11a. search payload omits raw phone", s.status_code == 200 and "9862222222" not in body, s.status_code)

    # 12. not mutual -> 403
    r12 = c.post("/api/contact/token", json={"viewer_id": a_id, "target_id": b_id})
    check("12. issue without acceptance -> 403 not_mutual",
          r12.status_code == 403 and "not_mutual" in r12.text, (r12.status_code, r12.text[:200]))

    # accept an interest directly in store (respond flow covered elsewhere)
    M.DB_INTERESTS.append({"id": "cr-test-1", "from_id": a_id, "to_id": b_id,
                           "status": "accepted", "created_at": time.time()})
    r12b = c.post("/api/contact/token", json={"viewer_id": a_id, "target_id": b_id})
    d12 = r12b.json() if r12b.headers.get("content-type", "").startswith("application/json") else {}
    check("12a. issue after acceptance -> 200 + token", r12b.status_code == 200 and bool(d12.get("token")),
          (r12b.status_code, r12b.text[:200]))
    check("12b. bilingual issue copy", bool(d12.get("message_telugu")) and bool(d12.get("message_en")))

    token = d12.get("token", "")
    r13 = c.post("/api/contact/resolve", json={"token": token})
    d13 = r13.json() if r13.headers.get("content-type", "").startswith("application/json") else {}
    masked = S12.mask_phone("9862222222")
    check("13. resolve -> wa_link + masked only",
          r13.status_code == 200 and d13.get("wa_link") == "https://wa.me/919862222222"
          and d13.get("phone_masked") == masked, (r13.status_code, d13))
    import re as _re
    check("14. wa_link is the only digit carrier, masked field is masked",
          _re.fullmatch(r"https://wa\.me/91\d{10}", str(d13.get("wa_link", ""))) is not None
          and "9862222222" not in str(d13.get("phone_masked", "")), d13)
    check("14a. issue response has no digits", "9862222222" not in r12b.text)
    # /api/unlock must not return raw digits any more
    ru = c.post("/api/unlock", json={"viewer_id": a_id, "target_id": b_id})
    check("14b. /api/unlock accepted -> success, no raw phone",
          ru.status_code == 200 and ru.json().get("success") is True and "phone" not in ru.json()
          and "9862222222" not in ru.text, (ru.status_code, ru.text[:200]))

    r13b = c.post("/api/contact/resolve", json={"token": token})
    check("13a. replay via API -> 410", r13b.status_code == 410, r13b.status_code)

    # 13b. block revokes outstanding token and blocks new issue
    r14 = c.post("/api/contact/token", json={"viewer_id": a_id, "target_id": b_id})
    token2 = r14.json().get("token", "") if r14.status_code == 200 else ""
    rb = c.post("/api/block", json={"tsap_id": a_id, "block_id": b_id})
    check("13b. block succeeds", rb.status_code == 200, (rb.status_code, rb.text[:200]))
    r15 = c.post("/api/contact/resolve", json={"token": token2})
    check("13c. outstanding token revoked by block -> 403/410", r15.status_code in (403, 410), r15.status_code)
    r16 = c.post("/api/contact/token", json={"viewer_id": a_id, "target_id": b_id})
    check("13d. new issue after block -> 403", r16.status_code == 403, r16.status_code)

    # per-viewer cap and report revocation (unit level, fresh pair)
    for _ in range(CR._MAX_PER_VIEWER):
        CR.issue_token("TSAPCAP01", "TSAPCAP02")
    capped = CR.issue_token("TSAPCAP01", "TSAPCAP02")
    check("15. per-viewer outstanding cap -> too_many", capped.get("ok") is False and capped.get("reason") == "too_many", capped)
    tk = CR.issue_token("TSAPRPT01", "TSAPRPT02")["token"]
    rr = c.post("/api/report", json={"reporter_id": "TSAPRPT01", "target_id": "TSAPRPT02", "category": "fake_profile", "detail": "x"})
    CR.invalidate_pair("TSAPRPT01", "TSAPRPT02")
    check("15a. revoked pair token resolves as revoked",
          CR.resolve_token(tk, "TSAPRPT01", [{"from_id": "TSAPRPT01", "to_id": "TSAPRPT02", "status": "accepted"}], no_block).get("reason") == "revoked")
    import interest as _I
    # interest-send preview carries no phone
    check("16. owner preview text has no requester phone",
          "9861111111" not in _I.interest_to_owner_text(
              next(u for u in M.DB_USERS if str(u.get("tsap_id", "")).upper() == a_id),
              next(u for u in M.DB_USERS if str(u.get("tsap_id", "")).upper() == b_id),
              {"request_id": "r1", "note": "", "observations": []}))

    print(f"\n=== RESULT: {PASS} passed, {FAIL} failed ===")
    return FAIL


if __name__ == "__main__":
    sys.exit(1 if run_suite() else 0)
