"""
Registry → CHANNELS-MASTER-LIST-TELUGU.md (auto-generate master list doc)
Run: python gen_master_list.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from channels_config import CHANNELS, channel_stats, BOT_USERNAME, SITE  # noqa: E402

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "CHANNELS-MASTER-LIST-TELUGU.md")
TIER_TITLE = {
    "L0_OFFICIAL": "LEVEL 0 — OFFICIAL HUB",
    "L1_REGION": "LEVEL 1 — REGION FLAGSHIP",
    "L2_RELIGION": "LEVEL 2 — RELIGION",
    "L3_CASTE": "LEVEL 3 — CASTE-WISE (bride/groom separate)",
    "L4_SPECIAL": "LEVEL 4 — SPECIAL",
}


def esc(text: str) -> str:
    return str(text).replace("|", "\\|")


def main():
    st = channel_stats()
    out = []
    A = out.append
    A("# 🚀 MANA VIVAHA — FINAL MASTER CHANNEL LIST (65 Channels)")
    A("")
    A("> **Idi final list anna** — Regions + Religions (Hindu / Muslim / Christian) + Hindu caste-wise + Special categories.")
    A(f"> Bot: `{BOT_USERNAME}` • Website: {SITE} • Registry: `backend/channels_config.py` (single source of truth)")
    A(f"> Ee doc auto-generated — `python3 backend/gen_master_list.py`")
    A("")
    A("## 📊 Summary")
    A("")
    A("| Level | Enti | Count |")
    A("|---|---|---|")
    A("| L0 | Official hub (brand home) | 1 |")
    A("| L1 | Region — TS/AP Bride & Groom + NRI | 5 |")
    A("| L2 | Religion — Hindu, Muslim, Christian, Other, Inter-faith | 5 |")
    A("| L3 | **Caste-wise (Hindu) — 1 caste = 1 channel** | **43** |")
    A("| L4 | Special — 2nd marriage, able, govt, IT, doctors, 35+, bureau | 11 |")
    A(f"| **TOTAL** | | **{st['total']}** |")
    A("")
    A(f"✅ Live: **{st['live']}** (`@TSBRIDE`, `@TSGROOM1`) • ⬜ Create cheyyalsinavi: **{st['to_create']}**")
    A("")
    A("### Waves — ee order lo create chey")
    A("")
    A("| Wave | Time | Channels |")
    A("|---|---|---|")
    for w, t in [(1, "Day 1-3"), (2, "Week 1-2"), (3, "Week 3-4"), (4, "Month 2")]:
        cnt = sum(1 for v in CHANNELS.values() if v.get("wave") == w)
        A(f"| **W{w}** | {t} | {cnt} channels |")
    A("")

    for tier in ["L0_OFFICIAL", "L1_REGION", "L2_RELIGION", "L3_CASTE", "L4_SPECIAL"]:
        items = [(k, v) for k, v in CHANNELS.items() if v["tier"] == tier]
        A(f"## {TIER_TITLE[tier]} ({len(items)})")
        A("")
        if tier == "L3_CASTE":
            A("**Rule:** 1 caste = 1 channel — Bride + Groom iddaru okkate channel lo, `#Bride` / `#Groom` hashtag filter.")
            A("5000 members dataka split cheyyadam ledu — empty channels fail avuthayi. Taruvata `_bride`/`_groom` ga split cheyyochu.")
            A("")
        A("| # | Channel | Username | Wave | Status |")
        A("|---|---|---|---|---|")
        for i, (k, v) in enumerate(items, 1):
            status = "✅ LIVE" if v.get("live") else f"⬜ W{v['wave']}"
            A(f"| {i} | {esc(v['name'])} | [@{v['username']}](https://t.me/{v['username']}) | {v['wave']} | {status} |")
        A("")

    A("## 🤖 Bot Auto-Router — one approve = viral everywhere")
    A("")
    A("```")
    A("Reddy + TS + Bride + Software job")
    A("   → @TSBRIDE              (region + gender)")
    A("   → @manavivaha_reddy     (caste)")
    A("   → @manavivaha_software  (job special)")
    A("   = max 5 channels, okka approve tho — manual posting ledu")
    A("")
    A("Muslim + TS + Groom    → @TSGROOM1 + @manavivaha_muslim      (caste channels skip)")
    A("Christian + AP + Bride → @manavivaha_ap_bride + @manavivaha_christian")
    A("Caste telisi unte        → general Hindu hub skip (duplication oddu)")
    A("Open / Caste no bar      → @manavivaha_hindu + @manavivaha_interfaith")
    A("Divorcee / Widow         → + @manavivaha_second")
    A("Handicapped              → + @manavivaha_able")
    A("Govt job                 → + @manavivaha_govt   |  Software → + @manavivaha_software")
    A("Doctors                  → + @manavivaha_doctors |  Teacher → + @manavivaha_teachers")
    A("Age 35+                  → + @manavivaha_35plus")
    A("USA / Gulf / Abroad      → + @manavivaha_nri")
    A("```")
    A("")
    A("**Priority:** region → religion → caste → specials • **Max 5 posts per profile** (spam control)")
    A("**Hashtags auto:** `#Caste #State #Gender #District #Age24 #BTech #PhotoPrivate`")
    A("")
    A("## 🛠️ Server lo — copy paste")
    A("")
    A("```bash")
    A("cd ~/matrimony-site")
    A("python3 backend/create_channels.py              # full plan (wave-wise)")
    A("python3 backend/create_channels.py --wave 1     # day-1 batch")
    A("python3 backend/create_channels.py --check      # ee channels unnai? bot admin ah? (BOT_TOKEN kavali)")
    A("python3 backend/create_channels.py --mark-live reddy")
    A("python3 backend/gen_frontend_channels.py        # website data sync")
    A("python3 backend/gen_master_list.py              # ee doc refresh")
    A("sudo -E docker-compose up -d --build")
    A("sudo docker logs matrimony-site_bot_1 --tail 20")
    A("```")
    A("")
    A("## 📌 Per channel — 3 minutes")
    A("")
    A("1. Telegram → **New Channel** → name + username (table lo unna `@username` exact ga)")
    A("2. Description → `--key <key>` output lo unna Desc paste chey")
    A(f"3. **{BOT_USERNAME}** ni **Admin** chey (Post + Edit + Delete rights MUST)")
    A("4. Pinned welcome post paste chey:")
    A("")
    A("```")
    A("🙏 మన వివాహ — TS-AP Telugu Matrimony ki swagatham!")
    A("🆔 Profile ID search: https://manavivaha.in/search")
    A("📝 3 min lo FREE register: https://manavivaha.in/register")
    A("💰 ₹99 ke Sambandham — modati 3 numbers FREE")
    A(f"🤖 Bot: {BOT_USERNAME}")
    A("⚠️ Advance money adigithe ventane report cheyyandi — mosam oddu!")
    A("```")
    A("")
    A("5. `python3 backend/create_channels.py --mark-live <key>` → bot aa channel lo post start chestundi")
    A("")
    A("## ⚠️ Username already taken ayithe?")
    A("")
    A("Prathi channel ki **fallback usernames** registry lo ready: `--key <key>` output lo `Taken?` line chudu.")
    A("Assalu available ledu ante `channels_config.py` lo `username` marchi, `gen_frontend_channels.py` malli run chey.")
    A("")
    A("## 🖥️ Website + API")
    A("")
    A("- `/channels` — 52 channels, tier tabs + search + wave filter + LIVE filter + copy info")
    A("- Home page — region/religion grid + selected community channels + special categories (registry-driven)")
    A("- API — `GET /api/channels`, `?tier=L3_CASTE`, `GET /api/channels/live`, `POST /api/channels/route`")
    A("")
    A("---")
    A("")
    A("**మన వివాహ — 52 channels, okka platform, okka bot, okka approve = viral everywhere.** 🔥")
    A("")

    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(out))
    print(f"✅ wrote {os.path.relpath(OUT)} ({sum(len(x) for x in out)} chars)")


if __name__ == "__main__":
    main()
