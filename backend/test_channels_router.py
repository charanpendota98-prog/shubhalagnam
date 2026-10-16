"""
Mana Vivaha — Channel Registry + Router TEST SUITE
Run:  python test_channels_router.py
These are local registry/routing/content checks only. They do not contact Telegram, prove destination availability, or check bot permissions.
"""
import os
import re
for _key in ("CHANNELS", "TELEGRAM_CHANNEL_DESTINATIONS_JSON"):
    os.environ.pop(_key, None)
import channels_config as C

PASS, FAIL = [], []


def check(name: str, cond: bool, extra: str = ""):
    (PASS if cond else FAIL).append(name)
    print(("  ✅ " if cond else "  ❌ ") + name + (f"  [{extra}]" if extra and not cond else ""))


def run():
    print("\n=== 1. REGISTRY HEALTH ===")
    stats = C.channel_stats()
    check("Total configured listings = 103", stats["total"] == 103, str(stats["total"]))
    check("Default registry has no configured destinations; external status stays unchecked",
          stats["routing_eligible"] == 0 and stats["external_status_checked"] is False, str(stats))
    check("L0 official = 1", stats["by_tier"]["L0_OFFICIAL"] == 1)
    check("L1 region = 5", stats["by_tier"]["L1_REGION"] == 5, str(stats["by_tier"]))
    check("L2 religion = 13 (Hindu + bride/groom listings for every selectable religion)",
          stats["by_tier"]["L2_RELIGION"] == 13, str(stats["by_tier"]["L2_RELIGION"]))
    check("L3 = 76 community-gender listings", stats["by_tier"]["L3_CASTE"] == 76, str(stats["by_tier"]["L3_CASTE"]))
    check("L4 special = 8", stats["by_tier"]["L4_SPECIAL"] == 8, str(stats["by_tier"]["L4_SPECIAL"]))

    usernames = [str(v.get("username") or "").lower() for v in C.CHANNELS.values() if v.get("username")]
    check("Usernames unique", len(usernames) == len(set(usernames)))
    bad = [u for u in usernames if not re.fullmatch(r"[a-z0-9_]{5,32}", u)]
    check("Usernames Telegram-valid (5-32, a-z0-9_)", not bad, str(bad))

    check("Registry stores no guessed fallback usernames",
          all("fallbacks" not in channel for channel in C.CHANNELS.values()))

    for k, v in C.CHANNELS.items():
        assert v.get("name") and v.get("desc"), k
    check("Every channel has name + desc", True)
    check("Configured primary usernames unchanged (@TSBRIDE/@TSGROOM1; external status unchecked)",
          C.CHANNELS["ts_bride"]["username"] == "TSBRIDE" and C.CHANNELS["ts_groom"]["username"] == "TSGROOM1")

    # Isolated routing fixture: only synthetic test destinations are enabled;
    # this file never calls Telegram or WhatsApp and never configures real targets.
    original_routes = {key: (row.get("routing_destination"), row.get("live"))
                       for key, row in C.CHANNELS.items()}
    def test_target(key: str) -> str:
        return "@test_" + key
    for key, row in C.CHANNELS.items():
        row["routing_destination"] = test_target(key)
        row["live"] = True
    check("Only explicit synthetic test targets enable the isolated route fixture",
          C.channel_stats()["routing_eligible"] == len(C.CHANNELS)
          and all(C.channel_chat_id(key) == test_target(key) for key in C.CHANNELS))

    print("\n=== 2. CASTE ALIAS RESOLUTION ===")
    cases = {
        "Reddy": "reddy", "SC-Mala": "mala", "SC-Madiga": "madiga", "ST-Lambadi": "lambada_banjara",
        "Arya Vysya": "vysya", "Golla": "yadava_goud", "Banjara": "lambada_banjara", "Kamsali": "viswabrahmana",
        "Munnuru Kapu": "munnuru_kapu", "Padmasali": "padmashali_weavers", "Chenchu": "others_st",
        "Open": None, "Others": None, "Telaga": "kapu", "Qureshi": None,
    }
    for raw, expected in cases.items():
        got = C.resolve_caste_key(raw)
        if expected == "None?":
            check(f"Caste '{raw}' → not a Hindu caste channel", got is None, str(got))
        else:
            check(f"Caste '{raw}' → {expected}", got == expected, str(got))

    print("\n=== 3. ROUTING — PIN TO PIN ===")
    reddy_bride = {"full_name": "Lakshmi", "gender": "Bride", "state": "TS", "religion": "Hindu", "caste": "Reddy",
                   "age": 24, "job": "Software Engineer", "education": "BTech",
                   "district": "Nalgonda", "gothram": "Bharadwaj"}
    r = C.route_profile(reddy_bride)
    check("Reddy TS Bride → exact test target first", r["usernames"][0] == test_target("ts_bride"), str(r["usernames"]))
    check("Reddy TS Bride → caste×gender channel (caste prakaram)",
          test_target("c_reddy_bride") in r["usernames"], str(r["usernames"]))
    check("Reddy TS Bride → mixed caste channel ki duplicate ledu",
          test_target("c_reddy") not in r["usernames"])
    check("Reddy TS Bride → Hindu hub skipped (caste dup avoid)", test_target("hindu") not in r["usernames"])
    top = C.route_profile({**reddy_bride, "top_match": True})
    check("Legacy top_match flag cannot change routing destinations",
          test_target("hindu") not in top["usernames"] and "Legacy top_match flag ignored" in " ".join(top["notes"]))
    check("Software category is not routed while its channel is excluded from public listings",
          test_target("software_it") not in r["usernames"]
          and "not listed publicly" in " ".join(r["notes"]))
    check("Hashtags include #Reddy + #Nalgonda", "#Reddy" in r["hashtags"] and "#Nalgonda" in r["hashtags"])
    check("Max cap 5 respected", r["count"] <= C.MAX_POSTS)

    muslim = C.route_profile({"gender": "Groom", "state": "TS", "religion": "Muslim", "caste": "Syed", "age": 28})
    check("Muslim groom → combined TS/AP listing", test_target("muslim_groom") in muslim["usernames"],
          str(muslim["usernames"]))
    check("Muslim groom → NO hindu channel", not any("hindu" in u for u in muslim["usernames"]))

    christian = C.route_profile({"gender": "Bride", "state": "AP", "religion": "Christian", "caste": "CSI", "age": 26})
    check("Christian bride → combined TS/AP listing",
          test_target("christian_bride") in christian["usernames"])
    check("Christian bride → AP Brides (@APBRIDE)", test_target("ap_bride") in christian["usernames"], str(christian["usernames"]))

    nri = C.route_profile({"gender": "Groom", "state": "USA", "religion": "Hindu", "caste": "Kamma", "age": 31, "job": "Software Developer"})
    check("USA groom → NRI channel", test_target("nri_global") in nri["usernames"], str(nri["usernames"]))
    check("USA groom → Kamma groom channel (caste×gender)", test_target("c_kamma_groom") in nri["usernames"],
          str(nri["usernames"]))

    second = C.route_profile({"gender": "Bride", "state": "TS", "religion": "Hindu", "caste": "Mala", "age": 36, "marital_status": "Divorcee"})
    check("Second-marriage channel is not routed; the separate directory route remains available",
          test_target("second_marriage") not in second["usernames"]
          and test_target("c_mala_bride") in second["usernames"])
    check("Divorcee → Mala bride channel (caste×gender)", test_target("c_mala_bride") in second["usernames"],
          str(second["usernames"]))
    check("35+ flag captured or capped", (test_target("35plus") in second["usernames"]) or second["notes"])

    abled = C.route_profile({"gender": "Groom", "state": "AP", "religion": "Hindu", "caste": "Kapu", "age": 30,
                             "physical_status": "Handicapped", "job": "Govt Teacher"})
    check("Excluded special-category channels are not used as routing destinations",
          all(test_target(key) not in abled["usernames"] for key in
              ("differently_abled", "govt_jobs", "doctors_teachers")), str(abled["usernames"]))

    interfaith = C.route_profile({"gender": "Bride", "state": "TS", "caste": "Open", "age": 27, "interfaith": True})
    check("No unconfigured intercommunity destination is stored or emitted",
          "interfaith" not in C.CHANNELS
          and all("interfaith" not in C.CHANNELS[key]["username"].lower() for key in interfaith["keys"])
          and any("No configured intercommunity destination" in note for note in interfaith["notes"]))
    check("Open caste → no caste channel + note", interfaith["notes"] and not any(
        C.CHANNELS[k]["tier"] == "L3_CASTE" for k in interfaith["keys"]))

    # caste × gender verification (bride/groom separate)
    groom_reddy = C.route_profile({**reddy_bride, "gender": "Groom", "full_name": "Ravi"})
    check("Reddy Groom → reddy GROOM channel (bride channel ki velladu)",
          test_target("c_reddy_groom") in groom_reddy["usernames"]
          and test_target("c_reddy_bride") not in groom_reddy["usernames"], str(groom_reddy["usernames"]))
    mixed_only = C.route_profile({"gender": "Bride", "state": "TS", "religion": "Hindu", "caste": "Kummara", "age": 25})
    check("Kummara routes to its configured gender-specific community listing",
          test_target("c_kummari_bride") in mixed_only["usernames"], str(mixed_only["usernames"]))

    print("\n=== 4. CAPTION READY ===")
    cap = C.build_caption(reddy_bride, "TSAP-TEST-ONLY", 92)
    check("Wave-1 lo 4 main channels unnai",
          all(k in [kk for kk, vv in C.CHANNELS.items() if vv.get("wave") == 1]
              for k in ("ts_bride", "ts_groom", "ap_bride", "ap_groom")))
    check("Caption includes only the ID supplied by the caller", "TSAP-TEST-ONLY" in cap)
    check("Caption labels destination selection, not a compatibility score",
          "not a compatibility score" in cap and "92%" not in cap)
    check("Caption links to the current profile page and contains no guessed bot CTA",
          "https://manavivaha.in/search/TSAP-TEST-ONLY" in cap
          and not re.search(r"(?:@|t\.me/)[A-Za-z0-9_]*_bot", cap))
    check("Caption includes a scam-prevention reminder", "Do not send advance money" in cap)

    print("\n=== 5. WAVES ===")
    for wave in (1, 2, 3):
        chans = [k for k, v in C.CHANNELS.items() if v.get("wave") == wave]
        print(f"  Wave-{wave}: {len(chans)} channels")
        check(f"Wave-{wave} not empty", len(chans) > 0)

    for key, (destination, live) in original_routes.items():
        C.CHANNELS[key]["routing_destination"] = destination or ""
        C.CHANNELS[key]["live"] = bool(live)
    check("Synthetic routing fixture leaves the default registry disabled",
          C.channel_stats()["routing_eligible"] == 0)
    print(f"\n{'='*54}\n  RESULT: {len(PASS)} passed, {len(FAIL)} failed\n{'='*54}")
    if FAIL:
        print("  FAILED:", FAIL)
    return len(FAIL) == 0


if __name__ == "__main__":
    ok = run()
    raise SystemExit(0 if ok else 1)
