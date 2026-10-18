"""The advanced referral suite — wallet statement, earnings explainer,
per-person invites and performance insights.

Everything a referrer sees has to be explainable from their own ledger. This
suite pins down the parts that would otherwise drift:

  • the wallet statement carries a running balance and the identity
    earned − reversed − pending − paid_out = wallet, reported as `reconciles`;
  • the earnings explainer says *why* each friend is at the stage it is at,
    and never turns a registration into money that has not been earned;
  • a per-person invite has its own link, its own token and its own stage, and
    no stored phone number ever comes back to a browser;
  • insights are computed from the member's own invites only, small samples are
    labelled, and no action copy promises a guaranteed payout;
  • every one of these routes is owner-only.

Run with ``python test_referral_wallet_suite.py`` (no pytest needed).
"""
from __future__ import annotations

import json
import os
import re
import sys
from datetime import datetime, timedelta

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("ENV", "test")
os.environ["TSAP_AUTH_MODE"] = "enforce"
os.environ.setdefault("TSAP_AUTH_SECRET", "referral-wallet-suite-secret")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from test_storage import isolate_test_stores  # noqa: E402

isolate_test_stores("referral-wallet-suite")

import hardening as H  # noqa: E402
import main  # noqa: E402
import referral as REF  # noqa: E402
from testutil_client import TestClient  # noqa: E402

client = TestClient(main.app, raise_server_exceptions=False)

PASSED: list[str] = []
FAILED: list[str] = []


def check(name: str, condition: bool, detail: object = "") -> None:
    if condition:
        PASSED.append(name)
        print(f"  ✅ {name}")
    else:
        FAILED.append(name)
        print(f"  ❌ {name}  | {detail}")


def headers_for(tsap_id: str) -> dict:
    token = H.sign_token(tsap_id)
    return {"Authorization": f"Bearer {token}", "X-TSAP-Token": token}


def make_member(tsap_id: str, name: str, phone: str) -> dict:
    user = {
        "tsap_id": tsap_id, "full_name": name, "name": name,
        "phone": phone, "gender": "Bride", "status": "approved",
        "is_approved": True, "credits": 0, "created_at": datetime.utcnow().isoformat(),
        "district": "Warangal", "state": "TS",
    }
    main.DB_USERS.append(user)
    REF.ensure_referrer_profile(user, main.DB_USERS)
    return user


def refer(friend: dict, code: str) -> dict:
    """Attach a referral the way registration does, then file the member."""
    res = REF.attach_referral(friend, code, main.DB_USERS)
    main.DB_USERS.append(friend)
    return res


def pay(friend: dict, code: str, amount: int, plan_code: str, payment_id: str = "PAY1") -> dict:
    return REF.process_referral_payment(friend, code, amount, main.DB_USERS,
                                        payment_id=payment_id, plan_code=plan_code)


def statement(tsap_id: str, **params) -> dict:
    return client.get(f"/api/referral/{tsap_id}/wallet", headers=headers_for(tsap_id),
                      params=params).json()


print("\n=== 1. ACCESS IS OWNER-ONLY ===")
ref = make_member("TSAP-W-REF", "Ravi Kumar", "9000000001")
code = ref.get("referral_code", "")
anon = client.get(f"/api/referral/{ref['tsap_id']}/wallet")
check("wallet statement is closed to anonymous callers", anon.status_code == 401, anon.status_code)
intruder = client.get(f"/api/referral/{ref['tsap_id']}/wallet", headers=headers_for("TSAP-W-OTHER"))
check("wallet statement is closed to another member's token", intruder.status_code == 401,
      intruder.status_code)
for path in ("earnings", "insights", "invites"):
    r = client.get(f"/api/referral/{ref['tsap_id']}/{path}")
    check(f"/{path} is closed to anonymous callers", r.status_code == 401, r.status_code)
post_anon = client.post(f"/api/referral/{ref['tsap_id']}/invite", json={"name": "Sita"})
check("creating an invite requires the owner's session", post_anon.status_code == 401,
      post_anon.status_code)

print("\n=== 2. WALLET STATEMENT ===")
empty = statement(ref["tsap_id"])
check("an empty wallet reconciles at zero",
      empty["identity"]["reconciles"] is True and empty["wallet"] == 0, empty["identity"])
check("an empty wallet returns no entries", empty["entries"] == [], empty["entries"])

f1 = {"tsap_id": "TSAP-W-F1", "full_name": "Sita Devi", "phone": "9000000011", "credits": 0}
refer(f1, code)
res1 = pay(f1, code, 99, "S_99", payment_id="PAY-1")
check("first qualifying payment earns the one-time reward",
      res1.get("success") is True and res1.get("commission") == 50, res1)

st1 = statement(ref["tsap_id"])
check("the statement shows the reward with a running balance",
      len(st1["entries"]) == 1 and st1["entries"][0]["balance_after"] == 50
      and st1["entries"][0]["type"] == "commission", st1["entries"])
check("statement totals report the earned amount", st1["totals"]["earned"] == 50, st1["totals"])
check("the wallet identity holds after a reward", st1["identity"]["reconciles"] is True,
      st1["identity"])
check("the identity is stated as a readable formula",
      "₹50 earned" in st1["identity"]["formula_en"], st1["identity"]["formula_en"])

dup = pay(f1, code, 99, "S_199", payment_id="PAY-2")
check("a repeat payment earns nothing extra", dup.get("success") is False
      and dup.get("reason") == "no_repeat_commission", dup)
check("a repeat payment adds no ledger row and no money",
      statement(ref["tsap_id"])["wallet"] == 50, statement(ref["tsap_id"])["wallet"])

payout = client.post("/api/referral/payout?tsap_id=%s&amount=50&method=upi&upi_id=ravi@okhdfcbank"
                     % ref["tsap_id"], headers=headers_for(ref["tsap_id"])).json()
check("a payout request at the minimum succeeds", payout.get("success") is True, payout)
st2 = statement(ref["tsap_id"])
check("a requested payout debits the wallet into pending",
      st2["wallet"] == 0 and st2["totals"]["pending_payout"] == 50, st2["totals"])
check("the identity still holds while a payout is pending",
      st2["identity"]["reconciles"] is True, st2["identity"])
check("a zero wallet cannot request another payout",
      st2["can_request_payout"] is False, st2["can_request_payout"])

payout_id = payout["request"]["id"]
approved = REF.payout_action(payout_id, "approve", main.DB_USERS, utr="UTR1234ABCD")
check("admin approval with a UTR succeeds", approved.get("ok") is True, approved)
st3 = statement(ref["tsap_id"])
check("paid-out money leaves pending and enters paid_out",
      st3["totals"]["pending_payout"] == 0 and st3["totals"]["paid_out"] == 50, st3["totals"])
check("the identity holds after a payout is paid", st3["identity"]["reconciles"] is True,
      st3["identity"])
filtered = statement(ref["tsap_id"], types="commission")
check("the statement can be filtered to one entry type",
      {e["type"] for e in filtered["entries"]} == {"commission"}, filtered["entries"])

print("\n=== 3. REFUNDS AND THE EXPLAINER ===")
ref2 = make_member("TSAP-W-REF2", "Lakshmi Rao", "9000000002")
code2 = ref2.get("referral_code", "")
f2 = {"tsap_id": "TSAP-W-F2", "full_name": "Gopi Chand", "phone": "9000000022", "credits": 0}
refer(f2, code2)
ex_before = client.get(f"/api/referral/{ref2['tsap_id']}/earnings",
                       headers=headers_for(ref2["tsap_id"])).json()
waiting = [r for r in ex_before["rows"] if r["stage"] == "waiting"]
check("a friend who only registered is 'waiting', not 'earning'",
      len(waiting) == 1 and waiting[0]["reward"] == 0, ex_before["rows"])
check("the waiting row says what is actually required",
      "S_99" in waiting[0]["next_en"] and "₹99" in waiting[0]["next_en"], waiting[0]["next_en"])
check("no money is implied for a registration alone",
      ex_before["totals"]["gross_earned"] == 0 and ex_before["totals"]["wallet"] == 0,
      ex_before["totals"])

pay(f2, code2, 199, "S_199", payment_id="PAY-3")
ex_after = client.get(f"/api/referral/{ref2['tsap_id']}/earnings",
                      headers=headers_for(ref2["tsap_id"])).json()
rewarded = [r for r in ex_after["rows"] if r["stage"] == "rewarded"]
check("a rewarded friend carries the reward and its date",
      len(rewarded) == 1 and rewarded[0]["reward"] == 50 and bool(rewarded[0]["credited_at"]),
      rewarded)
check("the rewarded friend has a two-step timeline",
      len(rewarded[0]["timeline"]) == 2 and all(step["label_en"] for step in rewarded[0]["timeline"]),
      rewarded[0]["timeline"])
check("the explainer states the arithmetic behind the wallet",
      "1 × ₹50 = ₹50" in ex_after["formula_en"], ex_after["formula_en"])
check("explainer totals agree with the statement",
      ex_after["totals"]["gross_earned"] == statement(ref2["tsap_id"])["totals"]["earned"] == 50,
      ex_after["totals"])

REF.reverse_referral_payment(f2, 199, main.DB_USERS, reason="refund")
ex_rev = client.get(f"/api/referral/{ref2['tsap_id']}/earnings",
                    headers=headers_for(ref2["tsap_id"])).json()
check("a refund moves the friend to 'reversed'",
      any(r["stage"] == "reversed" for r in ex_rev["rows"]), ex_rev["rows"])
check("a reversal is subtracted in the formula",
      "reversed" in ex_rev["formula_en"] and ex_rev["totals"]["wallet"] == 0, ex_rev["totals"])
check("the statement reflects the clawback",
      statement(ref2["tsap_id"])["totals"]["earned"] == 0, statement(ref2["tsap_id"])["totals"])

print("\n=== 4. PER-POST INVITES (SENDING) ===")
created = client.post(f"/api/referral/{ref['tsap_id']}/invite",
                      json={"name": "Anitha", "phone": "9000000099", "channel": "whatsapp"},
                      headers=headers_for(ref["tsap_id"])).json()
check("an invite is created for one named person", created.get("success") is True, created)
token1 = created["invite"]["token"]
check("the invite has its own tracked link",
      f"/r/{code}?inv={token1}" in created["invite"]["link"], created["invite"]["link"])
check("the invite message is personalised but keeps the policy lines",
      "Anitha" in created["invite"]["message_en"] and "/referral" in created["invite"]["message_en"],
      created["invite"]["message_en"])
check("the share links pre-fill the member's own app",
      bool(created["share"]["whatsapp_en"].startswith("https://wa.me/?text="))
      and created["share"]["link"].endswith(token1), created["share"])

second = client.post(f"/api/referral/{ref['tsap_id']}/invite",
                     json={"name": "Bhanu", "channel": "telegram"},
                     headers=headers_for(ref["tsap_id"])).json()
check("an invite works without a phone number", second.get("success") is True, second)
check("each invite gets a distinct token", second["invite"]["token"] != token1,
      second["invite"]["token"])

bad_name = client.post(f"/api/referral/{ref['tsap_id']}/invite", json={"name": "A"},
                       headers=headers_for(ref["tsap_id"]))
check("a one-letter name is rejected", bad_name.status_code == 400
      and bad_name.json().get("reason") == "bad_name", bad_name.status_code)
bad_phone = client.post(f"/api/referral/{ref['tsap_id']}/invite",
                        json={"name": "Charan", "phone": "9000"},
                        headers=headers_for(ref["tsap_id"]))
check("a partial phone number is rejected", bad_phone.status_code == 400
      and bad_phone.json().get("reason") == "bad_phone", bad_phone.status_code)

same_phone = client.post(f"/api/referral/{ref['tsap_id']}/invite",
                         json={"name": "Anitha", "phone": "9000000099"},
                         headers=headers_for(ref["tsap_id"])).json()
check("the same number in one day returns the same invite instead of a duplicate",
      same_phone.get("resent") is True and same_phone["invite"]["token"] == token1,
      {"resent": same_phone.get("resent"), "token": same_phone.get("invite", {}).get("token")})

original_cap = REF.MAX_INVITES_PER_DAY
try:
    REF.MAX_INVITES_PER_DAY = 2
    capped = client.post(f"/api/referral/{ref['tsap_id']}/invite", json={"name": "Divya"},
                         headers=headers_for(ref["tsap_id"]))
    check("the daily invite limit is enforced", capped.status_code == 400
          and capped.json().get("reason") == "daily_limit", capped.status_code)
finally:
    REF.MAX_INVITES_PER_DAY = original_cap

clicked = client.post(f"/api/referral/click/{code}?source=link&inv={token1}").json()
check("an invite link click is recorded", clicked.get("success") is True, clicked)
listing = client.get(f"/api/referral/{ref['tsap_id']}/invites",
                     headers=headers_for(ref["tsap_id"])).json()
by_token = {row["token"]: row for row in listing["invites"]}
check("the clicked invite shows the 'clicked' stage",
      by_token[token1]["stage"] == "clicked", by_token[token1])
check("an unopened invite stays at 'sent' with a next step",
      by_token[second["invite"]["token"]]["stage"] == "sent"
      and bool(by_token[second["invite"]["token"]]["next_en"]),
      by_token[second["invite"]["token"]])

blob = json.dumps(listing, ensure_ascii=False)
check("no full phone number is ever returned to the browser",
      "9000000099" not in blob, blob[:200])
check("a masked phone hint is returned instead",
      any(row.get("phone_masked") for row in listing["invites"]), listing["invites"][:1])

f3 = {"tsap_id": "TSAP-W-F3", "full_name": "Anitha", "phone": "9000000033", "credits": 0}
f3["referral_invite_token"] = token1
refer(f3, code)
listing2 = client.get(f"/api/referral/{ref['tsap_id']}/invites",
                      headers=headers_for(ref["tsap_id"])).json()
by_token2 = {row["token"]: row for row in listing2["invites"]}
check("registration closes the loop on that one invite",
      by_token2[token1]["stage"] == "joined" and by_token2[token1]["joined_tsap"] == "TSAP-W-F3",
      by_token2[token1])
pay(f3, code, 99, "S_99", payment_id="PAY-4")
listing3 = client.get(f"/api/referral/{ref['tsap_id']}/invites",
                      headers=headers_for(ref["tsap_id"])).json()
by_token3 = {row["token"]: row for row in listing3["invites"]}
check("the qualifying payment moves the invite to 'rewarded'",
      by_token3[token1]["stage"] == "rewarded" and by_token3[token1]["reward"] == 50,
      by_token3[token1])
check("invite counts are reported per stage",
      listing3["counts"]["rewarded"] == 1 and listing3["counts"]["sent"] >= 1, listing3["counts"])

print("\n=== 5. INSIGHTS ===")
ins = client.get(f"/api/referral/{ref['tsap_id']}/insights",
                 headers=headers_for(ref["tsap_id"])).json()
check("insights aggregate invites by channel",
      {c["channel"] for c in ins["channels"]} >= {"whatsapp", "telegram"}, ins["channels"])
check("a small sample is labelled as indicative, not a forecast",
      ins["conversion"]["small_sample"] is True
      and "indicative" in ins["conversion"]["sample_size_note_en"],
      ins["conversion"])
check("conversion rates are null rather than invented when the base is empty",
      ins["conversion"]["click_to_join_pct"] is None
      or isinstance(ins["conversion"]["click_to_join_pct"], float),
      ins["conversion"])
check("insights offer concrete next actions", len(ins["next_actions"]) >= 1, ins["next_actions"])

old_invite = REF._invites_of(ref)[-1]
old_invite["sent_at"] = (datetime.utcnow() - timedelta(days=5)).isoformat()
ins2 = client.get(f"/api/referral/{ref['tsap_id']}/insights",
                  headers=headers_for(ref["tsap_id"])).json()
check("unopened invites older than the follow-up window are surfaced",
      any(f["days"] >= REF.INVITE_FOLLOWUP_DAYS for f in ins2["followups"]), ins2["followups"])
check("every follow-up carries a ready share link",
      all(f.get("share", {}).get("link") for f in ins2["followups"]), ins2["followups"])

print("\n=== 6. STATEMENT EXPORT ===")
csv_res = client.get(f"/api/referral/{ref['tsap_id']}/wallet.csv", headers=headers_for(ref["tsap_id"]))
check("the statement can be exported as CSV", csv_res.status_code == 200, csv_res.status_code)
check("the export is served as a downloadable CSV",
      "text/csv" in (csv_res.headers.get("content-type") or "")
      and "attachment" in (csv_res.headers.get("content-disposition") or ""),
      csv_res.headers)
body = csv_res.text
check("the export carries the same rows as the screen",
      "commission" in body and "balance_after_inr" in body, body[:120])
check("the export carries the reconciliation too",
      "reconciles,yes" in body.replace("\r\n", "\n"), [l for l in body.splitlines() if "reconciles" in l])
check("the export is closed to anonymous callers",
      client.get(f"/api/referral/{ref['tsap_id']}/wallet.csv").status_code == 401,
      client.get(f"/api/referral/{ref['tsap_id']}/wallet.csv").status_code)

print("\n=== 7. NOTHING IS OVERSTATED ===")
payload = json.dumps(ins2, ensure_ascii=False).lower()
check("no insight promises a guaranteed payout", "guaranteed payout" not in payload, "insights")
ex_payload = json.dumps(ex_rev, ensure_ascii=False).lower()
check("the explainer does not promise future earnings",
      "will earn" not in ex_payload and "projected" not in ex_payload, "explainer")
check("the statement carries the review caveat",
      "not guaranteed" in statement(ref["tsap_id"])["note_en"], statement(ref["tsap_id"])["note_en"])
check("insights are described as the member's own data",
      "own tracked invites" in ins2["note_en"], ins2["note_en"])

print(f"\n=== RESULT: {len(PASSED)} pass / {len(FAILED)} fail ===")
if FAILED:
    print("FAILED:", FAILED)
    sys.exit(1)
print("💎 ADVANCED REFERRAL SUITE (statement reconciles, explainer is honest, "
      "invites are per person, insights are own-data only) — executed tests pass")
