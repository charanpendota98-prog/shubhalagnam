"""
MANA VIVAHA — CHANNEL SETUP + CASTE×GENDER TEST SUITE 📢
=======================================================
Run:  cd backend && /tmp/mv-backend-test/bin/python test_channels_setup.py

Cover: caste×bride/groom directory entries, descriptions, pinned welcomes, maintained artwork,
setup-plan metadata, fake Telegram API flow, safe routing defaults, and website channel endpoints.
All generated files and test state are isolated; no Telegram or WhatsApp message is sent.
"""
import atexit
import json
import os
import re
import shutil
import struct
import sys
import tempfile
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from test_storage import isolate_test_stores  # noqa: E402
_TEST_STORE = isolate_test_stores("channels-setup")
for _name in ("BOT_TOKEN", "BOT_TOKEN_BACKUP", "BOT_TOKEN_ALERT", "BOT_POOL_JSON",
              "ADMIN_CHAT_ID", "DATABASE_URL"):
    os.environ.pop(_name, None)
os.environ["APP_ENV"] = "test"
os.environ["ENV"] = "test"
os.environ["CHANNELS"] = ""
os.environ["TELEGRAM_CHANNEL_DESTINATIONS_JSON"] = ""
os.environ["PUBLISH_DRY_RUN"] = "true"
os.environ["AUTO_POST_ON_REGISTER"] = "false"
os.environ["WA_ENABLED"] = "false"

_TEST_WORK = tempfile.mkdtemp(prefix="mana-vivaha-test-channels-setup-")
atexit.register(shutil.rmtree, _TEST_WORK, ignore_errors=True)
os.environ["MANA_VIVAHA_CHANMAP_FILE"] = os.path.join(_TEST_WORK, "chanmap.json")
for _name in list(os.environ):
    if _name.startswith(("TELEGRAM_CHANNEL_", "WA_CHANNEL_")):
        os.environ.pop(_name, None)
os.environ["TELEGRAM_CHANNEL_DESTINATIONS_JSON"] = ""
os.environ.pop("WA_OFFICIAL_CHANNEL", None)

import channel_content as CC  # noqa: E402
import channels_config as C  # noqa: E402
import setup_channels as SC  # noqa: E402

# All generated files from this script stay outside the checkout.
SC.ASSET_DIR = os.path.join(_TEST_WORK, "assets")
SC.ROOT = os.path.join(_TEST_WORK, "repo-output")
SC.REPORT_DIR = os.path.join(_TEST_WORK, "reports")
os.makedirs(SC.ROOT, exist_ok=True)

PASS, FAIL, SKIP = [], [], []


def check(name, cond, extra=""):
    (PASS if cond else FAIL).append(name)
    print(("  ✅ " if cond else "  ❌ ") + name + (("  | " + str(extra)) if extra else ""))


def skip(name, reason=""):
    SKIP.append(name)
    print("  ⏭️  " + name + (("  | " + str(reason)) if reason else ""))


def telugu(t: str) -> bool:
    return any("\u0c00" <= ch <= "\u0c7f" for ch in str(t))


print("=== 1. MAIN 4 + OFFICIAL (user create chesina vatitho align) ===")
check("TSBRIDE / TSGROOM1 / APBRIDE / APGROOM1 / TSAP_MATRIMONY",
      [C.CHANNELS[k]["username"] for k in ("ts_bride", "ts_groom", "ap_bride", "ap_groom", "official")]
      == ["TSBRIDE", "TSGROOM1", "APBRIDE", "APGROOM1", "TSAP_MATRIMONY"])
check("4 main channels wave-1 lo", all(C.CHANNELS[k]["wave"] == 1
                                      for k in ("ts_bride", "ts_groom", "ap_bride", "ap_groom")))
check("Primary handles are preserved but not routing-enabled by default",
      C.CHANNELS["ts_bride"]["username"] == "TSBRIDE"
      and C.CHANNELS["ts_groom"]["username"] == "TSGROOM1"
      and not C.CHANNELS["ts_bride"]["live"] and not C.CHANNELS["ts_groom"]["live"])
check("Telugu names unnai (TS Brides → తెలంగాణ వధువులు)",
      telugu(C.CHANNELS["ts_bride"]["name"]) and telugu(C.CHANNELS["ap_groom"]["name"]))

print("=== 2. CASTE × BRIDE/GROOM (caste prakaram) ===")
rep = C.caste_split_report()
check("37 clusters have separate bride/groom listings", rep["split_clusters"] == 37 and rep["caste_gender_channels"] == 74,
      (rep["split_clusters"], rep["caste_gender_channels"]))
check("one remaining cluster uses a shared listing", rep["mixed_caste_channels"] == 1, rep["mixed_caste_channels"])
check("127 sub-castes cover (clusters lo members)", rep["sub_castes_covered"] >= 120, rep["sub_castes_covered"])
_w1_clusters = [r["cluster"] for r in rep["by_wave"][1]]
check("wave-1 lo top 3 clusters (reddy/kamma/kapu)", set(_w1_clusters) == {"reddy", "kamma", "kapu"}, _w1_clusters)
_w2_clusters = [r["cluster"] for r in rep["by_wave"][2]]
check("wave-2 lo Velama/Vysya/Brahmin/Mala/Madiga/Viswabrahmana unnai",
      {"velama", "vysya", "brahmin", "mala", "madiga", "viswabrahmana", "yadava_goud"} <= set(_w2_clusters),
      _w2_clusters)
for caste in ("reddy", "mala", "madiga", "kapu", "yadava_goud"):
    pair = C.SPLIT_MAP.get(caste)
    check("SPLIT_MAP[%s] bride+groom" % caste, bool(pair) and pair["Bride"] in C.CHANNELS and pair["Groom"] in C.CHANNELS)
check("Split cluster ki single channel ledu (duplicate ledu)", "reddy" not in C.CHANNELS and "mala" not in C.CHANNELS)
check("Shared cluster listing exists for Other ST", "c_others_st" in C.CHANNELS
      and C.CHANNELS["c_others_st"]["tier"] == "L3_CASTE")
check("Viswabrahmana sub-castes appear in both gender-specific listings",
      {"Kamsali", "Kammari", "Kanchari", "Vadla", "Ausula", "Vadrangi", "Silpi"} <=
      set(C.CHANNELS["c_viswabrahmana_bride"]["members"])
      and C.CHANNELS["c_viswabrahmana_bride"]["members"] == C.CHANNELS["c_viswabrahmana_groom"]["members"],
      C.CHANNELS["c_viswabrahmana_bride"]["members"][:6])
check("Muslim and Christian each have combined TS/AP bride + groom listings",
      sum(1 for c in C.CHANNELS.values() if c.get("religion") == "Muslim") == 2
      and sum(1 for c in C.CHANNELS.values() if c.get("religion") == "Christian") == 2)
check("Muslim caste labels do not become Hindu caste routes",
      C.resolve_caste_key("Sheikh") is None and "muslim_bride" in C.CHANNELS
      and C.resolve_caste_key("Syed") is None)
check("Telugu name map (clusters + castes)", len(CC.CASTE_TELUGU) >= 43, len(CC.CASTE_TELUGU))
check("Caste channel title lo caste Telugu + Bride/Groom",
      "రెడ్డి వధువులు" in C.CHANNELS["c_reddy_bride"]["name"]
      and "రెడ్డి వరులు" in C.CHANNELS["c_reddy_groom"]["name"], C.CHANNELS["c_reddy_bride"]["name"])

print("=== 3. PERFECT CONTENT (Telegram limits + Telugu) ===")
bad_title = [k for k, v in C.CHANNELS.items() if len(v["name"]) > CC.TITLE_LIMIT]
bad_desc = [k for k, v in C.CHANNELS.items() if len(v["desc"]) > CC.DESC_LIMIT or len(v["desc"]) < 60]
check("Anni titles ≤128 chars", not bad_title, bad_title)
check("Anni descriptions 60–255 chars", not bad_desc, bad_desc)
check("Descriptions include the site and no guessed bot username",
      all("manavivaha.in" in v["desc"] and not re.search(r"(?:@|t\.me/)[A-Za-z0-9_]*_bot", v["desc"]) for v in C.CHANNELS.values()))
check("Prathi description lo pricing (3 FREE / ₹99)", all("FREE" in v["desc"] for v in C.CHANNELS.values()))
check("Config health report khali (anni perfect)", C.channel_health_report() == [], C.channel_health_report()[:3])

welcome = CC.pinned_welcome("c_reddy_bride", C.CHANNELS["c_reddy_bride"])
check("Pinned welcome lo rules (chatting ledu)", "chatting లేదు" in welcome)
check("Pinned welcome uses website lookup and owner-consent steps, not sample IDs",
      all(step in welcome for step in ("1️⃣", "2️⃣", "3️⃣", "/search", "/matches"))
      and "TSAP-F-2025-1042" not in welcome)
check("Pinned welcome includes pricing + site without a guessed bot",
      "₹99" in welcome and "manavivaha.in" in welcome
      and not re.search(r"(?:@|t\.me/)[A-Za-z0-9_]*_bot", welcome))
check("Pinned welcome < 4096 chars (Telegram limit)", len(welcome) < CC.POST_LIMIT, len(welcome))
check("Pinned welcome lo caste Telugu (Reddy → రెడ్డి)", "రెడ్డి" in welcome)
check("Rules post lo money/safety rules", "advance" in CC.rules_post("ts_bride").lower())
share = CC.share_text("ts_bride", C.CHANNELS["ts_bride"])
check("Share text without an explicit link uses directory URL, not a constructed Telegram destination",
      "https://manavivaha.in/channels" in share and "https://t.me/" not in share)
check("Posting schedule 5 slots (roju 4 + weekly digest)", len(CC.posting_schedule()) == 5)
check("DP text English (server lo Telugu font ledu)", CC.dp_text("c_reddy_bride") ==
      {"big": "REDDY", "mid": "BRIDES", "small": "TS • AP TELUGU"})

print("=== 4. REGISTRY INTEGRITY ===")
usernames = [v["username"].lower() for v in C.CHANNELS.values() if v.get("username")]
check("102 configured listings match the frontend registry", len(C.CHANNELS) == 102, len(C.CHANNELS))
check("Configured primary usernames are unique + Telegram-valid", len(set(usernames)) == len(usernames)
      and not [u for u in usernames if not re.fullmatch(r"[a-z0-9_]{5,32}", u)])
check("Generated religion/caste entries have no guessed username",
      all(not row.get("username") for key, row in C.CHANNELS.items()
          if key.startswith("c_") or key in {"muslim_bride", "muslim_groom", "christian_bride", "christian_groom"}))
check("No fallback usernames are stored or exposed in setup-plan rows",
      all("fallbacks" not in v for v in C.CHANNELS.values())
      and all("fallbacks" not in row for row in C.setup_plan()))
# Inconsistent legacy fields must fail closed everywhere: `live` alone is not a route.
_inconsistent_key = "c_reddy_bride"
_inconsistent_channel = C.CHANNELS[_inconsistent_key]
_inconsistent_original = (_inconsistent_channel.get("routing_destination"), _inconsistent_channel.get("live"))
try:
    _inconsistent_channel["routing_destination"] = ""
    _inconsistent_channel["live"] = True
    _setup_row = next(row for row in C.setup_plan() if row["key"] == _inconsistent_key)
    import chanmap as _chanmap
    _effective_row = next(row for row in _chanmap.effective() if row["key"] == _inconsistent_key)
    check("A live flag without an exact destination is ineligible across runtime/setup/admin metadata",
          not C._routing_is_explicit(_inconsistent_channel)
          and C.channel_chat_id(_inconsistent_key) is None
          and not _setup_row["routing_eligible"]
          and not C.channel_links(_inconsistent_key)["routing_eligible"]
          and not _effective_row["routing_eligible"])
finally:
    _inconsistent_channel["routing_destination"], _inconsistent_channel["live"] = _inconsistent_original
# The bundled fallback is generated only from public registry rows and explicit URLs.
# Runtime admin overrides stay authoritative at request time.
_channels_ts_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                                 "frontend", "src", "lib", "channels.ts")
_channels_ts = open(_channels_ts_path, encoding="utf-8").read()
try:
    _channels_json = _channels_ts.split("export const ALL_CHANNELS: Channel[] = ", 1)[1].split(";\n\n// Hindu-only", 1)[0]
    _bundled_channels = json.loads(_channels_json)
    _bundled_by_key = {row["key"]: row for row in _bundled_channels}
    _public_keys = {key for key in C.CHANNELS if C.is_public_channel(key)}
    _bundled_urls_match = set(_bundled_by_key) == _public_keys and all(
        _bundled_by_key.get(key, {}).get("link", "") == C.channel_links(key)["telegram"]
        and _bundled_by_key.get(key, {}).get("whatsappLink", "") == C.channel_links(key)["whatsapp"]
        and _bundled_by_key.get(key, {}).get("deepLink") == ""
        and _bundled_by_key.get(key, {}).get("routingEligible") is C._routing_is_explicit(C.CHANNELS[key])
        and _bundled_by_key.get(key, {}).get("externalStatusChecked") is False
        for key in _public_keys)
except (IndexError, KeyError, TypeError, ValueError):
    _bundled_urls_match = False
check("Bundled frontend fallback contains only public rows and explicit links",
      _bundled_urls_match)
check("By tier counts match canonical registry", C.channel_stats()["by_tier"] ==
      {"L0_OFFICIAL": 1, "L1_REGION": 5, "L2_RELIGION": 13, "L3_CASTE": 75, "L4_SPECIAL": 8},
      C.channel_stats()["by_tier"])
check("No source-code live-key patch path remains", "LIVE_KEYS_EXTRA" not in open(SC.REGISTRY).read()
      and not hasattr(SC, "write_live_keys"))

print("=== 5. SETUP PLAN (wave order) ===")
plan = C.setup_plan()
check("Plan includes all configured listings", len(plan) == 102, len(plan))
check("Plan wave order lo sorted", [r["wave"] for r in plan] == sorted(r["wave"] for r in plan))
w1 = C.setup_plan(1)
check("Wave-1 has 24 configured listings", len(w1) == 24, len(w1))
check("Wave-1 lo official mundu", w1[0]["key"] == "official", w1[0]["key"])
check("Wave-1 has main, combined religion, and caste-gender listings",
      {"ts_bride", "ts_groom", "ap_bride", "ap_groom", "muslim_bride", "muslim_groom",
       "christian_bride", "christian_groom", "c_reddy_bride", "c_kamma_groom"} <= {r["key"] for r in w1})
check("Plan rows include descriptions and explicit routing status",
      all(r["desc"] and r["hashtags"] and "fallbacks" not in r
          and "routing_eligible" in r and "destination_configured" in r
          and "live" not in r and r["external_status_checked"] is False for r in plan))
check("No routes are eligible without explicit operator configuration",
      C.channel_stats()["routing_eligible"] == 0
      and not any(row["routing_eligible"] for row in plan), C.channel_stats())

print("=== 6. DP IMAGES (maintained channel artwork) ===")
source_dp = os.path.join(os.path.dirname(os.path.abspath(__file__)), "channel_assets", "c_reddy_bride.png")
os.makedirs(SC.ASSET_DIR, exist_ok=True)
if os.path.isfile(source_dp):
    shutil.copyfile(source_dp, os.path.join(SC.ASSET_DIR, "c_reddy_bride.png"))
dp = SC.channel_dp_image("c_reddy_bride")
check("Maintained DP reused in isolated test storage", bool(dp) and os.path.exists(dp))
with open(dp, "rb") as f:
    png = f.read()
check("DP PNG signature", png[:8] == b"\x89PNG\r\n\x1a\n")
size = struct.unpack(">II", png[16:24]) if png[:8] == b"\x89PNG\r\n\x1a\n" else (0, 0)
check("DP 512x512 (Telegram square)", size == (512, 512), size)
check("Maintained channel artwork remains isolated from member photos",
      len([f for f in os.listdir(SC.ASSET_DIR) if f.endswith(".png")]) == 1,
      len([f for f in os.listdir(SC.ASSET_DIR) if f.endswith(".png")]))

print("=== 7. APPLY FLOW (FakeBot — isolated test-only target; no Telegram access) ===")
key = "c_reddy_bride"
old_route = (C.CHANNELS[key].get("routing_destination"), C.CHANNELS[key].get("live"))
try:
    C.CHANNELS[key]["routing_destination"] = "@test_channel_reddy_bride"
    C.CHANNELS[key]["live"] = True
    state = SC.load_state()
    fake = SC.FakeBot()
    res = SC.configure_channel(fake, key, state)
    methods = [c["method"] for c in fake.calls]
    check("Apply fake flow ok", res["ok"], res.get("errors"))
    check("FakeBot uses only the exact test target and its resolved chat ID",
          fake.calls[0]["params"].get("chat_id") == "@test_channel_reddy_bride"
          and all(call.get("params", {}).get("chat_id") in (None, "@test_channel_reddy_bride", 1001)
                  for call in fake.calls), [c.get("params") for c in fake.calls])
    check("setChatTitle call (perfect title)", "setChatTitle" in methods)
    check("setChatDescription call (Telugu desc)", "setChatDescription" in methods)
    check("setChatPhoto call (DP upload)", "setChatPhoto" in methods)
    check("Owner-provided invite link is reused without creating a replacement",
          "createChatInviteLink" not in methods
          and res.get("invite_link") == SC.configured_public_links(key).get("telegram"),
          res.get("invite_link"))
    check("sendMessage + pinChatMessage (welcome pin)", "sendMessage" in methods and "pinChatMessage" in methods)
    title_call = [c for c in fake.calls if c["method"] == "setChatTitle"][0]
    check("Title = perfect title (రెడ్డి వధువులు)", title_call["params"]["title"] == C.CHANNELS[key]["name"])
    send_call = [c for c in fake.calls if c["method"] == "sendMessage"][0]
    pinned = send_call["params"]["text"]
    check("Pinned post includes safety guidance and website/consent steps",
          "chatting లేదు" in pinned and "Advance/visa" in pinned
          and all(step in pinned for step in ("1️⃣", "2️⃣", "3️⃣"))
          and "/search" in pinned and "/matches" in pinned)
    check("State saved only in isolated test directory",
          os.path.commonpath([SC.STATE_FILE, _TEST_STORE]) == _TEST_STORE)

    fake2 = SC.FakeBot()
    SC.configure_channel(fake2, key, state)
    m2 = [c["method"] for c in fake2.calls]
    check("Second run lo welcome malli pampaledu (cached)", "sendMessage" not in m2, m2)

    old_ts_route = (C.CHANNELS["ts_bride"].get("routing_destination"), C.CHANNELS["ts_bride"].get("live"))
    C.CHANNELS["ts_bride"]["routing_destination"] = "@test_ts_bride"
    C.CHANNELS["ts_bride"]["live"] = True
    try:
        r3 = SC.configure_channel(SC.FakeBot(admin=False), "ts_bride", SC.load_state())
        check("Bot admin status is read from FakeBot; non-admin is never described as admin",
              (not r3["ok"]) and "admin" in str(r3.get("error", "")).lower()
              and r3.get("admin", {}).get("checked") is True
              and r3.get("admin", {}).get("status") == "member")
    finally:
        C.CHANNELS["ts_bride"]["routing_destination"], C.CHANNELS["ts_bride"]["live"] = old_ts_route

    no_destination = SC.FakeBot()
    no_route_result = SC.configure_channel(no_destination, "ap_groom", SC.load_state())
    check("Mutation refuses to fall back to a public primary username",
          not no_route_result["ok"] and not no_destination.calls
          and no_route_result["tried"] == [], no_route_result)

    class MissingBot(SC.FakeBot):
        def get_chat(self, chat_id):
            self._rec("getChat", {"chat_id": chat_id})
            return None
    old_ap_route = (C.CHANNELS["ap_bride"].get("routing_destination"), C.CHANNELS["ap_bride"].get("live"))
    C.CHANNELS["ap_bride"]["routing_destination"] = "@APBRIDE"
    C.CHANNELS["ap_bride"]["live"] = True
    try:
        r4 = SC.configure_channel(MissingBot(), "ap_bride", SC.load_state())
        check("Missing exact explicitly configured target is not replaced by an alternate",
              (not r4["ok"]) and "lookup" in r4["error"]
              and r4["username"] == "APBRIDE" and r4["tried"] == ["@APBRIDE"], r4)
    finally:
        C.CHANNELS["ap_bride"]["routing_destination"], C.CHANNELS["ap_bride"]["live"] = old_ap_route
finally:
    C.CHANNELS[key]["routing_destination"], C.CHANNELS[key]["live"] = old_route

print("=== 8. EXPLICIT DESTINATION CONFIGURATION (fail closed by default) ===")
original_live = {key: (row.get("routing_destination"), row.get("live")) for key, row in C.CHANNELS.items()}
try:
    check("Default environment has no configured posting destinations",
          C.channel_stats()["routing_eligible"] == 0)
    with patch.dict(os.environ, {
        "CHANNELS": "TSBRIDE,APBRIDE",
        "TELEGRAM_CHANNEL_DESTINATIONS_JSON": json.dumps({
            "c_reddy_bride": "@test_channel_reddy_bride",
            "c_kamma_groom": "-1001234567890",
        }),
    }):
        C._apply_explicit_routing_configuration()
        check("A listed primary username only routes when explicitly allowlisted",
              C.CHANNELS["ts_bride"]["routing_destination"] == "@TSBRIDE"
              and C.CHANNELS["ap_bride"]["routing_destination"] == "@APBRIDE")
        check("Exact owner-supplied username and channel ID map to specific keys",
              C.channel_chat_id("c_reddy_bride") == "@test_channel_reddy_bride"
              and C.channel_chat_id("c_kamma_groom") == "-1001234567890")
        check("No unconfigured generated community gets a fallback",
              C.channel_chat_id("c_mala_bride") is None)
        configured = C.route_profile({"gender": "Bride", "state": "TS", "religion": "Hindu", "caste": "Reddy"})
        check("Router returns only exact configured destinations",
              configured["usernames"] == ["@TSBRIDE", "@test_channel_reddy_bride"],
              configured["usernames"])
finally:
    for key, (destination, live) in original_live.items():
        C.CHANNELS[key]["routing_destination"] = destination or ""
        C.CHANNELS[key]["live"] = bool(live)

print("=== 9. KIT + CHECKLIST OUTPUT ===")
tmpdir = tempfile.mkdtemp()
try:
    md = SC.write_plan_md(os.path.join(tmpdir, "checklist.md"), wave=1)
    body = open(md).read()
    check("Checklist md generate (wave 1)", "WAVE 1" in body and "@APBRIDE" in body)
    check("Blank destinations are not rendered as @ or t.me/", "@" + "` |" not in body
          and "https://t.me/" + " |" not in body)
    check("Checklist lo pinned post + description", "📌 Pin this post" in body and "Description" in body)
    kits = SC.write_kits(wave=1)
    check("Wave-1 kits match configured wave size", len(kits) == 24, len(kits))
    kit = open([k for k in kits if k.endswith("c_reddy_bride.md")][0]).read()
    check("Kit lo 6 steps (create/access guidance/pin/rules/share/command)",
          all(x in kit for x in ("New Channel", "Bot access (off by default)", "Pinned welcome", "Rules post", "--apply --key c_reddy_bride")))
    check("Generated kits contain no guessed destinations or broad bot-admin grants",
          all(not re.search(r"(?:@|https://t\.me/)manavivaha_", open(path, encoding="utf-8").read())
              and "Do not add the bot as an administrator or grant permissions by default" in open(path, encoding="utf-8").read()
              and "Delete Messages" not in open(path, encoding="utf-8").read()
              for path in SC.write_kits()))
finally:
    shutil.rmtree(tmpdir, ignore_errors=True)

print("=== 10. WEBSITE API ===")
try:
    from fastapi.testclient import TestClient
    import main

    c = TestClient(main.app, raise_server_exceptions=False)
    _public_key = "c_reddy_bride"
    _public_channel = C.CHANNELS[_public_key]
    _public_original = (_public_channel.get("routing_destination"), _public_channel.get("live"))
    try:
        _public_channel["routing_destination"] = ""
        _public_channel["live"] = True
        _public_status = main._channel_public(_public_key, _public_channel)
        check("Public channel API does not infer eligibility from live alone",
              not _public_status["routing_eligible"] and not _public_status["destination_configured"]
              and _public_status["status"] == "No posting destination configured")
    finally:
        _public_channel["routing_destination"], _public_channel["live"] = _public_original
    d = c.get("/api/channels").json()
    join_payload = c.get("/api/channels/join").json()
    check("Runtime join links use the public filter and match active configured defaults",
          join_payload.get("success") is True
          and join_payload.get("links") == {key: value for key, value in main.CHAN.public_links().items()
                                              if C.is_public_channel(key)}
          and not (C.PUBLIC_DIRECTORY_EXCLUDED_KEYS & set(join_payload.get("links", {})))
          and join_payload.get("external_status_checked") is False)
    try:
        _frontend_channels_path = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                               "..", "frontend", "src", "lib", "channels.ts")
        _frontend_channels_source = open(_frontend_channels_path, encoding="utf-8").read()
        _array_marker = "export const ALL_CHANNELS: Channel[] = "
        _array_start = _frontend_channels_source.index(_array_marker) + len(_array_marker)
        _frontend_rows, _array_end = json.JSONDecoder().raw_decode(_frontend_channels_source[_array_start:])
        _frontend_links = {
            row["key"]: {"telegram": row.get("link", ""), "whatsapp": row.get("whatsappLink", "")}
            for row in _frontend_rows if row.get("link") or row.get("whatsappLink")
        }
        _runtime_links = {key: value for key, value in main.CHAN.public_links().items()
                          if C.is_public_channel(key)}
        check("Bundled frontend fallback links exactly match isolated runtime API links",
              _frontend_links == _runtime_links,
              {"frontend": len(_frontend_links), "runtime": len(_runtime_links),
               "frontend_only": sorted(set(_frontend_links) - set(_runtime_links)),
               "runtime_only": sorted(set(_runtime_links) - set(_frontend_links))})
        check("Bundled channel fallback has no guessed Manavivaha handles or bot deep links",
              not re.search(r"(?:@|https://t\.me/)manavivaha_", _frontend_channels_source)
              and all(row.get("deepLink") == "" for row in _frontend_rows))
        check("Bundled frontend only exposes configured primary usernames",
              all(row.get("username", "") == ("@" + C.CHANNELS[row["key"]]["username"]
                                                 if C.CHANNELS[row["key"]].get("username") else "")
                  for row in _frontend_rows))
    except Exception as _parity_error:  # pragma: no cover - report the failed parity check
        check("Bundled frontend fallback links parse and match runtime", False, repr(_parity_error))
    _spotlight_profile = {"tsap_id": "SPOTLIGHT-TEST", "status": "approved", "is_approved": True,
                          "is_active": True, "photo_status": "approved", "photo_private": True,
                          "privacy_mode": "private", "photo_url": "/photos/private.jpg"}
    _spotlight_row = {"promo_id": "SPOT-TEST", "tsap_id": "SPOTLIGHT-TEST", "photo_url": "/photos/previous.jpg"}
    with patch.object(main.spotlight, "get_active_spotlights", return_value=[_spotlight_row]), \
         patch.object(main, "_find_user", return_value=_spotlight_profile):
        _private_spotlights = main._current_public_spotlights(6)
    check("Spotlight public feed suppresses a profile photo made private after submission",
          len(_private_spotlights) == 1 and _private_spotlights[0]["photo_url"] == "")
    _spotlight_profile["is_active"] = False
    with patch.object(main.spotlight, "get_active_spotlights", return_value=[_spotlight_row]), \
         patch.object(main, "_find_user", return_value=_spotlight_profile):
        _deactivated_spotlights = main._current_public_spotlights(6)
    check("Spotlight public feed hides deactivated profiles immediately", _deactivated_spotlights == [])
    check("GET /api/channels exposes 91 public listings; routing remains disabled",
          d["stats"]["total"] == 91 and d["stats"]["routing_eligible"] == 0, d["stats"])
    public_channels = [channel for tier_rows in d["channels_by_tier"].values() for channel in tier_rows]
    check("Public channel API omits excluded categories, malformed targets and external-status claims",
          all("fallbacks" not in channel and "live" not in channel
              and channel.get("routing_eligible") is False
              and channel.get("destination_configured") is False
              and channel.get("external_status_checked") is False
              and "availability" not in channel.get("status", "") for channel in public_channels)
          and not (C.PUBLIC_DIRECTORY_EXCLUDED_KEYS & {channel["key"] for channel in public_channels}))
    check("Public API omits tiers that have no visible listings",
          set(d["channels_by_tier"]) == {"L1_REGION", "L2_RELIGION", "L3_CASTE"}
          and set(d["tiers"]) == set(d["channels_by_tier"]))
    reddy_public = next(channel for channel in public_channels if channel["key"] == "c_reddy_bride")
    check("Owner-provided invite link is preserved while guessed handle is absent",
          reddy_public["username"] == ""
          and reddy_public["link"] == C.channel_links("c_reddy_bride")["telegram"]
          and "manavivaha_reddy_bride" not in reddy_public["link"])
    check("Channels lo photo field (DP URL)", all("photo" in x for x in d["channels_by_tier"]["L1_REGION"]))
    check("L1 lo 4 main unnai", len(d["channels_by_tier"]["L1_REGION"]) >= 4)
    check("L3 caste channels lo caste + gender fields",
          all("caste" in x for x in d["channels_by_tier"]["L3_CASTE"]))

    r = c.get("/api/channels/photo/c_reddy_bride.png")
    check("GET /api/channels/photo/{key}.png 200 PNG", r.status_code == 200 and r.content[:4] == b"\x89PNG", r.status_code)

    k = c.get("/api/channels/c_reddy_bride/kit").json()
    check("GET /api/channels/{key}/kit", k["name"].endswith("రెడ్డి వధువులు") and "chatting లేదు" in k["pinned_post"])
    check("Kit setup instructions contain no guessed alternates",
          len(k["how_to_setup_telugu"]) == 4 and "alternate" not in " ".join(k["how_to_setup_telugu"]).casefold())
    check("Kit keeps owner invite link and rules", C.channel_links("c_reddy_bride")["telegram"] in k["share_text"]
          and "manavivaha_reddy_bride" not in k["share_text"] and "RULES" in k["rules_post"])
    check("Kit never fabricates bot deep link", k.get("deep_link", "") == "")
    check("Kit 404 tappu key ki", c.get("/api/channels/nope/kit").status_code == 404)

    sp = c.get("/api/channels/setup-plan").json()
    check("GET /api/channels/setup-plan includes only public listings",
          len(sp["plan"]) == 91
          and not (C.PUBLIC_DIRECTORY_EXCLUDED_KEYS & {row["key"] for row in sp["plan"]})
          and all("fallbacks" not in row and "live" not in row
                  and "routing_eligible" in row and row["external_status_checked"] is False
                  for row in sp["plan"]))
    check("setup-plan local copy checks pass while destinations remain unconfigured",
          sp["config_problems"] == [] and sp["stats"]["routing_eligible"] == 0)
    check("setup-plan wave filter counts only public listings",
          len(c.get("/api/channels/setup-plan?wave=1").json()["plan"]) == 22)

    # Exercise admin/runtime link overrides without persisting or editing the tracked link map.
    import copy
    original_overrides = copy.deepcopy(main.CHAN.OVERRIDES)
    test_link = "https://t.me/+TESTINVITE0001"
    try:
        main.CHAN.OVERRIDES["c_reddy_bride"] = {
            "telegram_link": test_link, "whatsapp_link": "", "active": True,
            "note": "test fixture only",
        }
        runtime_links = main.CHAN.public_links()
        public_result = c.get("/api/channels/links?caste=Reddy&gender=Bride").json()
        runtime_row = next(row for row in public_result["channels"] if row["key"] == "c_reddy_bride")
        check("/api/channels/links uses the same runtime owner override as join/directory",
              runtime_row["telegram"] == test_link and runtime_row["whatsapp"] == "",
              runtime_row)
        from welcome_pack import build_welcome_pack, channels_count
        pack = build_welcome_pack({"caste": "Reddy", "gender": "Bride", "state": "TS"},
                                  "TSAPTEST001", [], directory_links=runtime_links)
        pack_row = next(row for row in pack["channels"] if row["key"] == "c_reddy_bride")
        check("Welcome pack consumes runtime public links, not the static base map",
              pack_row["telegram"] == test_link and pack_row["whatsapp"] == "", pack_row)
        check("Channel directory stats count the same runtime map",
              public_result["stats"] == channels_count(directory_links=runtime_links),
              public_result["stats"])
    finally:
        main.CHAN.OVERRIDES.clear()
        main.CHAN.OVERRIDES.update(original_overrides)

    tier = c.get("/api/channels?tier=L3_CASTE").json()
    check("Tier filter works (L3 74 public listings)", tier["count"] == 74, tier["count"])
    check("Hidden channel kit and photo endpoints both return 404",
          all(c.get(f"/api/channels/{key}/kit").status_code == 404
              and c.get(f"/api/channels/photo/{key}.png").status_code == 404
              for key in C.PUBLIC_DIRECTORY_EXCLUDED_KEYS))
except ModuleNotFoundError as e:  # pragma: no cover
    if e.name in {"fastapi", "starlette", "httpx"}:
        skip("TestClient suite", "install backend requirements for API coverage: %s" % e.name)
    else:
        check("TestClient suite", False, repr(e))
except Exception as e:  # pragma: no cover
    check("TestClient suite", False, repr(e))

print("\n=== RESULT: %d pass / %d fail / %d skipped ===" % (len(PASS), len(FAIL), len(SKIP)))
if FAIL:
    print("FAILED:", FAIL)
    sys.exit(1)
if SKIP:
    print("SKIPPED:", SKIP)
print("🏆 CHANNELS SETUP (102 internal entries; 91 public listings; safe destinations) — executed tests pass")

# Isolated test data/assets/kits are removed by the registered atexit cleanup,
# including when the suite exits early after a failure.
