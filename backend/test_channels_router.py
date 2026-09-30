"""
Mana Vivaha — Channel Registry + Router TEST SUITE
Run:  python test_channels_router.py
Pass ayyithe -> 65 channels, usernames valid, routing pin-to-pin, captions ready.
"""
import re
import channels_config as C

PASS, FAIL = [], []


def check(name: str, cond: bool, extra: str = ""):
    (PASS if cond else FAIL).append(name)
    print(("  ✅ " if cond else "  ❌ ") + name + (f"  [{extra}]" if extra and not cond else ""))


def run():
    print("\n=== 1. REGISTRY HEALTH ===")
    stats = C.channel_stats()
    check("Total channels = 52 (4 main + Muslim 4 + Christian 4 + caste clusters + special)",
          stats["total"] == 52, str(stats["total"]))
    check("Live channels = 2 or 52 (active)", stats["live"] in (2, 52), str(stats["live"]))
    check("L0 official = 1", stats["by_tier"]["L0_OFFICIAL"] == 1)
    check("L1 region = 5", stats["by_tier"]["L1_REGION"] == 5, str(stats["by_tier"]))
    check("L2 religion = 11 (Muslim 4 + Christian 4 + Hindu + Other + Inter-faith)",
          stats["by_tier"]["L2_RELIGION"] == 11, str(stats["by_tier"]["L2_RELIGION"]))
    check("L3 = 27 (18 caste×gender split + 9 single cluster)", stats["by_tier"]["L3_CASTE"] == 27, str(stats["by_tier"]["L3_CASTE"]))
    check("L4 special = 8", stats["by_tier"]["L4_SPECIAL"] == 8, str(stats["by_tier"]["L4_SPECIAL"]))

    usernames = [v["username"].lower() for v in C.CHANNELS.values()]
    check("Usernames unique", len(usernames) == len(set(usernames)))
    bad = [u for u in usernames if not re.fullmatch(r"[a-z0-9_]{5,32}", u)]
    check("Usernames Telegram-valid (5-32, a-z0-9_)", not bad, str(bad))

    fb = [f.lower() for v in C.CHANNELS.values() for f in v.get("fallbacks", [])]
    clash = [f for f in fb if f in usernames or fb.count(f) > 1]
    check("Fallbacks no clash", not clash, str(clash))

    for k, v in C.CHANNELS.items():
        assert v.get("name") and v.get("desc"), k
    check("Every channel has name + desc", True)
    check("Live channel usernames untouched (@TSBRIDE/@TSGROOM1)",
          C.CHANNELS["ts_bride"]["username"] == "TSBRIDE" and C.CHANNELS["ts_groom"]["username"] == "TSGROOM1")

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
    reddy_bride = {"full_name": "Lakshmi", "gender": "Bride", "state": "TS", "caste": "Reddy",
                   "age": 24, "job": "Software Engineer", "education": "BTech",
                   "district": "Nalgonda", "gothram": "Bharadwaj"}
    r = C.route_profile(reddy_bride)
    check("Reddy TS Bride → TSBRIDE first", r["usernames"][0] == "@TSBRIDE", str(r["usernames"]))
    check("Reddy TS Bride → caste×gender channel (caste prakaram)",
          "@manavivaha_reddy_bride" in r["usernames"], str(r["usernames"]))
    check("Reddy TS Bride → mixed caste channel ki duplicate ledu",
          "@manavivaha_reddy" not in r["usernames"])
    check("Reddy TS Bride → Hindu hub skipped (caste dup avoid)", "@manavivaha_hindu" not in r["usernames"])
    top = C.route_profile({**reddy_bride, "top_match": True})
    check("Top match → Hindu hub included", "@manavivaha_hindu" in top["usernames"], str(top["usernames"]))
    check("Reddy TS Bride → Software channel", "@manavivaha_software" in r["usernames"])
    check("Hashtags include #Reddy + #Nalgonda", "#Reddy" in r["hashtags"] and "#Nalgonda" in r["hashtags"])
    check("Max cap 5 respected", r["count"] <= C.MAX_POSTS)

    muslim = C.route_profile({"gender": "Groom", "state": "TS", "religion": "Muslim", "caste": "Syed", "age": 28})
    check("Muslim groom (TS) → @manavivaha_muslim_ts_groom", "@manavivaha_muslim_ts_groom" in muslim["usernames"],
          str(muslim["usernames"]))
    check("Muslim groom → NO hindu channel", not any("hindu" in u for u in muslim["usernames"]))

    christian = C.route_profile({"gender": "Bride", "state": "AP", "religion": "Christian", "caste": "CSI", "age": 26})
    check("Christian bride (AP) → @manavivaha_christian_ap_bride",
          "@manavivaha_christian_ap_bride" in christian["usernames"])
    check("Christian bride → AP Brides (@APBRIDE)", "@APBRIDE" in christian["usernames"], str(christian["usernames"]))

    nri = C.route_profile({"gender": "Groom", "state": "USA", "caste": "Kamma", "age": 31, "job": "Software Developer"})
    check("USA groom → NRI channel", "@manavivaha_nri" in nri["usernames"], str(nri["usernames"]))
    check("USA groom → Kamma groom channel (caste×gender)", "@manavivaha_kamma_groom" in nri["usernames"],
          str(nri["usernames"]))

    second = C.route_profile({"gender": "Bride", "state": "TS", "caste": "Mala", "age": 36, "marital_status": "Divorcee"})
    check("Divorcee → 2nd marriage channel", "@manavivaha_second" in second["usernames"])
    check("Divorcee → Mala bride channel (caste×gender)", "@manavivaha_mala_bride" in second["usernames"],
          str(second["usernames"]))
    check("35+ flag captured or capped", ("@manavivaha_35plus" in second["usernames"]) or second["notes"])

    abled = C.route_profile({"gender": "Groom", "state": "AP", "caste": "Kapu", "age": 30,
                             "physical_status": "Handicapped", "job": "Govt Teacher"})
    check("Differently abled → able channel", "@manavivaha_able" in abled["usernames"], str(abled["usernames"]))
    check("Govt job → govt channel", "@manavivaha_govt" in abled["usernames"])
    check("Doctor/Teacher → professionals channel", "@manavivaha_professionals" in abled["usernames"])

    interfaith = C.route_profile({"gender": "Bride", "state": "TS", "caste": "Open", "age": 27, "interfaith": True})
    check("Interfaith flag → interfaith channel", "@manavivaha_interfaith" in interfaith["usernames"])
    check("Open caste → no caste channel + note", interfaith["notes"] and not any(
        C.CHANNELS[k]["tier"] == "L3_CASTE" for k in interfaith["keys"]))

    # caste × gender verification (bride/groom separate)
    groom_reddy = C.route_profile({**reddy_bride, "gender": "Groom", "full_name": "Ravi"})
    check("Reddy Groom → reddy GROOM channel (bride channel ki velladu)",
          "@manavivaha_reddy_groom" in groom_reddy["usernames"]
          and "@manavivaha_reddy_bride" not in groom_reddy["usernames"], str(groom_reddy["usernames"]))
    mixed_only = C.route_profile({"gender": "Bride", "state": "TS", "caste": "Kummara", "age": 25})
    check("Chinna caste (Kummara) → Other BC cluster channel (#Bride filter)",
          "@manavivaha_others_bc" in mixed_only["usernames"], str(mixed_only["usernames"]))

    print("\n=== 4. CAPTION READY ===")
    cap = C.build_caption(reddy_bride, "TSAP-F-2025-5775", 92)
    check("Wave-1 lo 4 main channels unnai",
          all(k in [kk for kk, vv in C.CHANNELS.items() if vv.get("wave") == 1]
              for k in ("ts_bride", "ts_groom", "ap_bride", "ap_groom")))
    check("Caption has ID", "TSAP-F-2025-5775" in cap)
    check("Caption has score", "92%" in cap)
    check("Caption has bot CTA", C.BOT_USERNAME in cap)
    check("Caption has site register link", "/register" in cap)
    check("Caption has safety line", "మోసం జాగ్రత్త" in cap)

    print("\n=== 5. WAVES ===")
    for wave in (1, 2, 3):
        chans = [k for k, v in C.CHANNELS.items() if v.get("wave") == wave]
        print(f"  Wave-{wave}: {len(chans)} channels")
        check(f"Wave-{wave} not empty", len(chans) > 0)

    print(f"\n{'='*54}\n  RESULT: {len(PASS)} passed, {len(FAIL)} failed\n{'='*54}")
    if FAIL:
        print("  FAILED:", FAIL)
    return len(FAIL) == 0


if __name__ == "__main__":
    ok = run()
    raise SystemExit(0 if ok else 1)
