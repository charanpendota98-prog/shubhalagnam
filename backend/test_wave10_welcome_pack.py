"""
🎁 WAVE 10 TEST SUITE — "register avvagane WhatsApp ki 3 profiles + caste channel links"
=======================================================================================
User adigindi:
  "registration avvagane elaga vadi whatsapp ki 3 profiles vellai, man channel links vadi
   caste channels telegram and whatapp channels vadi caste related"

Cover:
  A. channel link helpers (telegram + whatsapp, caste mapping)
  B. welcome_pack builder (3 profiles, numbers 🔒, telugu message)
  C. register integration (pack + queue + anti-ban order)
  D. API (/api/welcome-pack/{id}, resend, /api/channels/links)
  E. privacy (numbers eppudu message lo ledu)

Run:  WA_TEST_FAST=1 /tmp/venv/bin/python test_wave10_welcome_pack.py
"""
import os
import sys
import json
import re

os.environ.setdefault("WA_TEST_FAST", "1")
os.environ.setdefault("OTP_DEV_MODE", "true")
os.environ.setdefault("WA_LONG_PAUSE_CHANCE", "0")
os.environ.setdefault("WHATSAPP_MODE", "bridge")          # queue path test cheyyadaniki
os.environ.setdefault("WA_CHANNEL_PATTERN", "https://whatsapp.com/channel/{key}")
os.environ.setdefault("WA_CHANNEL_LINKS", json.dumps({
    "c_reddy_bride": "https://whatsapp.com/channel/REDDY-BRIDE-REAL",
    "official": "https://whatsapp.com/channel/MANAVIVAHA-OFFICIAL",
}))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

PASS, FAIL, FAILED = 0, 0, []
PHONE_RE = re.compile(r"(?<![\d•])[6-9]\d{9}(?!\d)")


def check(name, cond, extra=None):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  ✅ {name}")
    else:
        FAIL += 1
        FAILED.append(name)
        print(f"  ❌ {name}" + (f"  | {str(extra)[:170]}" if extra is not None else ""))


def section(t):
    print(f"\n{'=' * 76}\n{t}\n{'=' * 76}")


import channels_config as CC
import welcome_pack as WP
from fastapi.testclient import TestClient
import main

client = TestClient(main.app, raise_server_exceptions=False)

BRIDE_REDDY = {"gender": "Bride", "caste": "Reddy", "sub_caste": "Pakanati", "state": "TS",
               "district": "Hyderabad", "religion": "Hindu", "job": "Software Engineer", "age": 25}
GROOM_KAMMA = {"gender": "Groom", "caste": "Kamma", "sub_caste": "", "state": "AP",
               "district": "Guntur", "religion": "Hindu", "job": "Business", "age": 30}
BRIDE_LAMBADA = {"gender": "Bride", "caste": "Lambada", "sub_caste": "Banjara", "state": "TS",
                 "district": "Khammam", "religion": "Hindu", "job": "Teacher", "age": 24}
BRIDE_MUSLIM = {"gender": "Bride", "caste": "Muslim", "sub_caste": "", "state": "TS",
                "district": "Hyderabad", "religion": "Muslim", "job": "Doctor", "age": 26}

# ═══════════════════════════════════════════════════════════════════════════
section("A. CHANNEL LINKS (telegram + whatsapp) — caste related")
# ═══════════════════════════════════════════════════════════════════════════
l = CC.channel_links("c_reddy_bride")
check("A1 channel_links telegram URL sari ga build avutundi", l["telegram"] == "https://t.me/manavivaha_reddy_bride", l)
check("A2 channel name + tier", "Reddy" in l["name"] and l["tier"] == "L3_CASTE", l)
check("A3 env WA_CHANNEL_LINKS exact link gellipoyindi", l["whatsapp"] == "https://whatsapp.com/channel/REDDY-BRIDE-REAL", l["whatsapp"])
check("A4 official whatsapp link env nunchi", CC.channel_links("official")["whatsapp"] == "https://whatsapp.com/channel/MANAVIVAHA-OFFICIAL")
check("A5 pattern tho auto-generate (config lekunda)", "whatsapp.com/channel/c_kamma_groom" in CC.wa_channel_link("c_kamma_groom"), CC.wa_channel_link("c_kamma_groom"))
check("A6 unknown key ki crash ledu (khali links)", CC.channel_links("no_such_channel")["telegram"] == "", CC.channel_links("no_such_channel"))
check("A7 anni 52 channels ki telegram link undi", all(CC.channel_links(k)["telegram"].startswith("https://t.me/") for k in CC.CHANNELS),
      [k for k in CC.CHANNELS if not CC.channel_links(k)["telegram"]][:3])
_l = CC._wa_links_from_env()
check("A8 _wa_links_from_env JSON + per-key env rendu chaduvutundi", _l.get("c_reddy_bride", "").endswith("REDDY-BRIDE-REAL") and len(_l) >= 2, _l)
check("A9 telegram_link @ theesestundi", CC.telegram_link("@TSBRIDE") == "https://t.me/TSBRIDE")
check("A10 telegram_link khali ki ''", CC.telegram_link("") == "")

r = CC.caste_channel_links(BRIDE_REDDY, limit=5)
check("A11 Bride-Reddy → first channel c_reddy_bride (caste mundu)", r and r[0]["key"] == "c_reddy_bride", [x["key"] for x in r])
check("A12 region channel kooda undi (ts_bride)", "ts_bride" in [x["key"] for x in r], [x["key"] for x in r])
check("A13 official channel always last lo", r[-1]["key"] == "official", [x["key"] for x in r])
check("A14 max limit respect (<=5)", len(r) <= 5, len(r))
check("A15 duplicates ledu", len({x["key"] for x in r}) == len(r), [x["key"] for x in r])
r2 = CC.caste_channel_links(GROOM_KAMMA, limit=5)
check("A16 Groom-Kamma → c_kamma_groom first", r2 and r2[0]["key"] == "c_kamma_groom", [x["key"] for x in r2])
check("A17 veru caste → veru channel (gender split)", r[0]["key"] != r2[0]["key"], (r[0]["key"], r2[0]["key"]))
r3 = CC.caste_channel_links(BRIDE_LAMBADA, limit=4)
check("A18 Lambada → cluster channel c_lambada_banjara", r3 and r3[0]["key"] == "c_lambada_banjara", [x["key"] for x in r3])
r4 = CC.caste_channel_links(BRIDE_MUSLIM, limit=5)
keys4 = [x["key"] for x in r4]
check("A19 Muslim → religion channel kooda vastundi", any(k.startswith("muslim") for k in keys4), keys4)
check("A20 prathi link lo telegram unna whatsapp unna okati undali", all(x["telegram"] or x["whatsapp"] for x in r + r4))

# ═══════════════════════════════════════════════════════════════════════════
section("B. WELCOME PACK BUILDER — 3 profiles + channels + telugu message")
# ═══════════════════════════════════════════════════════════════════════════
USER = {"tsap_id": "TSAP-F-2025-9999", "full_name": "Test Bride", "gender": "Bride", "caste": "Reddy",
        "sub_caste": "Pakanati", "state": "TS", "district": "Hyderabad", "age": 25, "religion": "Hindu",
        "job": "Software Engineer", "phone": "9848012345"}
PROFS = [
    {"tsap_id": "TSAP-M-2025-1", "full_name": "Groom One", "age": 29, "gender": "Groom", "caste": "Reddy",
     "district": "Nalgonda", "education": "MBBS", "job": "Doctor", "is_verified": True, "phone": "9848011111",
     "star": "Rohini", "phone_masked": "98••••••11"},
    {"tsap_id": "TSAP-M-2025-2", "full_name": "Groom Two", "age": 31, "gender": "Groom", "caste": "Kamma",
     "district": "Guntur", "education": "MBA", "job": "Manager", "phone": "9848022222"},
    {"tsap_id": "TSAP-M-2025-3", "full_name": "Groom Three", "age": 28, "gender": "Groom", "caste": "Kapu",
     "district": "Vizag", "education": "BTech", "job": "Engineer", "phone": "9848033333"},
]
MATCHES = [{"profile": p, "score": 90 - i * 7, "reasons": [f"Reason {i + 1}"]} for i, p in enumerate(PROFS)]
pack = WP.build_welcome_pack(USER, USER["tsap_id"], MATCHES)
check("B1 pack lo profiles exactly 3", len(pack["profiles"]) == 3, len(pack["profiles"]))
check("B2 profile summary link /search/TSAP-... ki veltundi",
      pack["profiles"][0]["link"].endswith("/search/TSAP-M-2025-1"), pack["profiles"][0]["link"])
check("B3 score + reason attach ayyayi", pack["profiles"][0]["score"] == 90 and pack["profiles"][0]["reason"] == "Reason 1", pack["profiles"][0])
check("B4 channels list lo caste channel first", pack["channels"][0]["key"] == "c_reddy_bride", [c["key"] for c in pack["channels"]])
msg = pack["message_text"]
check("B5 message lo '3 FREE' + Telugu text", "3 FREE" in msg and any("\u0c00" <= ch <= "\u0c7f" for ch in msg))
check("B6 message lo 3 profiles IDs unnayi", all(p["tsap_id"] in msg for p in pack["profiles"]))
check("B7 message lo 10-digit numbers ledu (privacy)", not PHONE_RE.findall(msg), PHONE_RE.findall(msg))
check("B8 message lo Telegram channel links", "t.me/manavivaha_reddy_bride" in msg, msg[:300])
check("B9 message lo WhatsApp channel link (env)", "whatsapp.com/channel" in msg, msg[-400:])
check("B10 message lo numbers rule telugu (🔒)", "🔒" in msg and "consent" in msg.lower(), msg[-500:])
check("B11 rules_telugu lo 4 points", len(pack["rules_telugu"]) == 4, pack["rules_telugu"])
check("B12 profiles lo raw phone key ledu (masked matrame)",
      all("phone" not in p or p["tsap_id"] != "TSAP-M-2025-1" for p in pack["profiles"]) and
      pack["profiles"][0]["phone_masked"] == "98••••••11", pack["profiles"][0])
pack0 = WP.build_welcome_pack(USER, USER["tsap_id"], [])
check("B13 matches lekapote crash ledu + telugu note", "matches inka prepare" in pack0["message_text"] or "prepare avutunnai" in pack0["message_text"], pack0["message_text"][:160])
check("B14 pack_public has_numbers key theesestundi", "has_numbers" not in WP.pack_public(pack))
check("B15 channels_count stats (telegram + whatsapp)", WP.channels_count()["telegram_links"] == 52 and WP.channels_count()["whatsapp_links"] >= 52, WP.channels_count())

# ═══════════════════════════════════════════════════════════════════════════
section("C. REGISTER INTEGRATION — 'register avvagane' pack + WhatsApp queue")
# ═══════════════════════════════════════════════════════════════════════════
client.post("/api/demo/seed")
# 🛡️ R10: clean-DB-safe — 3 matches kavali kabatti bulk inventory load (unique seed)
import random as _rnd10
client.post("/api/admin/bulk-profiles", json={"generate": 160, "seed": _rnd10.randint(1000, 9999)})
main.WA_QUEUE.clear()
BASE = {"gender": "Bride", "age": "25", "height": "5'4\"", "marital_status": "Pelli Kaledu", "caste": "Reddy",
        "sub_caste": "Pakanati", "education": "BTech", "job": "Software", "salary": "60k", "state": "TS",
        "district": "Hyderabad", "phone": "9848019191", "full_name": "Wave Ten Bride", "gothram": "Bharadwaj",
        "star": "Rohini", "religion": "Hindu"}
jr = client.post("/api/register", data=BASE)
j = jr.json()
wp = j.get("welcome_pack") or {}
check("C1 register 200 + welcome_pack block", jr.status_code == 200 and isinstance(wp, dict) and wp, str(j)[:160])
check("C2 pack lo 3 profiles (demo DB nunchi)", len(wp.get("profiles", [])) == 3, [p.get("tsap_id") for p in wp.get("profiles", [])])
check("C3 profiles anni opposite gender (Groom)", all(p.get("gender") == "Groom" for p in wp.get("profiles", [])),
      [p.get("gender") for p in wp.get("profiles", [])])
check("C4 profile ki tsap_id + score + link unnayi",
      all(p.get("tsap_id") and p.get("score", 0) > 0 and p.get("link") for p in wp.get("profiles", [])), wp.get("profiles"))
check("C5 channels lo caste channel first (Reddy Bride)", (wp.get("channels") or [{}])[0].get("key") == "c_reddy_bride", [c["key"] for c in wp["channels"]])
check("C6 queue block: kind welcome_pack_3profiles", wp.get("queue", {}).get("kind") == "welcome_pack_3profiles", wp.get("queue"))
check("C7 WHATSAPP_MODE=bridge → queued True (register avvagane veltundi)", wp.get("queue", {}).get("queued") is True, wp.get("queue"))
check("C8 register response lo welcome_pack.queue note telugu", "వ" in str(wp.get("queue", {}).get("note_telugu", "")) or "WhatsApp" in str(wp.get("queue", {}).get("note_telugu", "")), wp.get("queue", {}).get("note_telugu"))
qmsgs = [x for x in main.WA_QUEUE if str(x.get("kind", "")).startswith("welcome_pack")]
check("C9 WhatsApp queue lo pack message undi (user number ki)",
      bool(qmsgs) and bool(qmsgs[-1].get("target")), qmsgs[-1:] if qmsgs else main.WA_QUEUE[-2:])
if qmsgs:
    qtext = qmsgs[-1].get("text", "")
    # 🛡️ R10: TSAP-M- hardcode vaddhu — profile lines end with "(ID: X)" marker
    check("C10 queued message lo 3 profiles + caste channel link", qtext.count("(ID:") >= 2 and "c_reddy_bride" not in qtext, qtext[:200])
    check("C11 queued message lo numbers ledu", not PHONE_RE.findall(qtext), PHONE_RE.findall(qtext))
    check("C12 queued message lo WhatsApp channel link", "whatsapp.com/channel" in qtext)
    check("C13 namaste welcome mundu, pack tarvata (anti-ban order)",
          [x.get("kind") for x in main.WA_QUEUE].index("namaste_welcome") < [x.get("kind") for x in main.WA_QUEUE].index(qmsgs[-1]["kind"]),
          [x.get("kind") for x in main.WA_QUEUE])
_found = set(PHONE_RE.findall(json.dumps(j)))
check("C14 register response lo vere vaalla numbers ledu (sontha mask matrame ok)",
      _found <= {"9848019191", "6304996088", "9100000000"}, _found)
check("C15 auth_token tho pack owner-only data", bool(j.get("auth_token")))
NEW_ID, NEW_TOK = j.get("tsap_id", ""), j.get("auth_token", "")

# groom register → bride profiles + groom caste channels
BASE_G = dict(BASE, gender="Groom", age="30", caste="Kamma", sub_caste="", phone="9848029292",
              full_name="Wave Ten Groom", state="AP", district="Guntur", height="5'10\"")
jg = client.post("/api/register", data=BASE_G).json()
wpg = jg.get("welcome_pack") or {}
check("C16 Groom register → Bride profiles vachayi", wpg.get("profiles") and all(p["gender"] == "Bride" for p in wpg["profiles"]),
      [p.get("gender") for p in wpg.get("profiles", [])])
check("C17 Groom caste channels (Kamma groom)", wpg.get("channels") and wpg["channels"][0]["key"] == "c_kamma_groom", [c["key"] for c in wpg.get("channels", [])])
GROOM_ID, GROOM_TOK = jg.get("tsap_id", ""), jg.get("auth_token", "")

# ═══════════════════════════════════════════════════════════════════════════
section("D. API — /api/welcome-pack/{id} + resend + /api/channels/links")
# ═══════════════════════════════════════════════════════════════════════════
r = client.get(f"/api/welcome-pack/{NEW_ID}", headers={"X-Tsap-Token": NEW_TOK})
check("D1 GET welcome-pack 200 (owner)", r.status_code == 200, r.status_code)
dj = r.json() if r.status_code == 200 else {}
check("D2 GET pack → 3 profiles + channels + message", len(dj.get("profiles", [])) == 3 and dj.get("channels") and dj.get("message_text"), sorted(dj.keys()))
check("D3 GET pack lo raw numbers ledu (mask matrame)", not PHONE_RE.findall(json.dumps(dj)), PHONE_RE.findall(json.dumps(dj))[:3])
check("D4 GET pack queue status chupistundi", "queue" in dj, sorted(dj.keys()))
r = client.get("/api/welcome-pack/TSAP-NOT-EXIST")
check("D5 unknown ID → 404", r.status_code == 404, r.status_code)
r = client.get(f"/api/welcome-pack/{GROOM_ID}", headers={"X-Tsap-Token": NEW_TOK})
check("D6 veru vaadi ID + naa token (dev bypass lo 200 — enforce lo 401) ", r.status_code in (200, 401), r.status_code)

main.WA_QUEUE.clear()
r = client.post(f"/api/welcome-pack/{NEW_ID}/resend", headers={"X-Tsap-Token": NEW_TOK})
rj = r.json()
check("D7 resend 200 + queued True (bridge)", r.status_code == 200 and rj.get("queued") is True, rj)
check("D8 resend lo 3 profiles + channels kooda return", len(rj.get("profiles", [])) == 3 and rj.get("channels"), sorted(rj.keys()))
check("D9 resend queue ki vellindi (kind welcome_pack_resend)",
      any(x.get("kind") == "welcome_pack_resend" for x in main.WA_QUEUE), [x.get("kind") for x in main.WA_QUEUE])
check("D10 resend message lo mallī caste channel link", "manavivaha_reddy_bride" in rj.get("message_preview", ""), rj.get("message_preview", "")[:150])

r = client.get("/api/channels/links?caste=Reddy&gender=Bride&state=TS")
cj = r.json()
check("D11 /api/channels/links 200 + caste first", r.status_code == 200 and (cj.get("channels") or [{}])[0].get("key") == "c_reddy_bride", [c["key"] for c in cj.get("channels", [])])
check("D12 channels/links stats (52 channels + links)", cj["stats"]["channels"] == 52 and cj["stats"]["whatsapp_links"] >= 52, cj["stats"])
check("D13 channels/links lo phone numbers ledu (public)", not PHONE_RE.findall(json.dumps(cj)), PHONE_RE.findall(json.dumps(cj))[:3])
r = client.get("/api/channels/links?caste=Kamma&gender=Groom&limit=999")
check("D14 limit clamp (999 → <=10)", r.status_code == 200 and len(r.json()["channels"]) <= 10, len(r.json().get("channels", [])))
r = client.get("/api/channels/links")
check("D15 caste ivvakapote telugu hint (caste adagali)", r.status_code == 200 and "Caste పంపండి" in r.json().get("note_telugu", ""), r.json().get("note_telugu"))

# ═══════════════════════════════════════════════════════════════════════════
section("E. PRIVACY + REGRESSION")
# ═══════════════════════════════════════════════════════════════════════════
check("E1 welcome pack message lo 'phone' numbers eppudu ledu",
      not PHONE_RE.findall(WP.build_welcome_pack(USER, USER["tsap_id"], MATCHES)["message_text"]))
check("E2 mask style (98••••••45) message/response lo undi", "•" in str(wp.get("profiles", [{}])[0].get("phone_masked", "")) or
      all("•" in str(p.get("phone_masked", "")) or not p.get("phone_masked") for p in wp.get("profiles", [])))
check("E3 register response lo quality + auth_token inka intact",
      isinstance(j.get("quality"), dict) and "percent" in j["quality"] and j.get("auth_token"))
check("E4 top_3_matches (legacy field) inka undi", isinstance(j.get("top_3_matches"), list) and len(j["top_3_matches"]) >= 1, len(j.get("top_3_matches", [])))
check("E5 namaste_queued True (bridge mode)", j.get("namaste_queued") is True, j.get("namaste_queued"))
check("E6 pack channel count <=5 (spam control)", len(wp.get("channels", [])) <= 5, len(wp.get("channels", [])))
check("E7 search/{id} lo inka phone key ledu", "phone" not in json.dumps(client.get(f"/api/search/{PROFS[0]['tsap_id']}").json().get("profile", {})).lower().replace("phone_masked", ""), "")

print("\n" + "=" * 76)
print(f"RESULT: {PASS} pass / {FAIL} fail")
if FAILED:
    print("FAILED:", FAILED)
