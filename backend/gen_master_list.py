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
    A(f"# 🚀 MANA VIVAHA — CHANNEL REGISTRY ({st['total']} configured listings)")
    A("")
    A("> **Idi final list anna** — Regions + Religions (Hindu / Muslim / Christian) + Hindu caste-wise + Special categories.")
    A(f"> Website: {SITE} • Registry: `backend/channels_config.py` (single source of truth)")
    A(f"> Configured bot username: `{BOT_USERNAME}`" if BOT_USERNAME else "> Bot username is not configured; do not invent or guess one.")
    A("> Usernames/links are repository configuration only; external availability and bot permissions are not checked here. The legacy `live` flag means routing eligibility, not uptime.")
    A("> If a configured username is unavailable, stop and verify an operator-owned replacement. This registry does not suggest or probe alternate usernames.")
    A(f"> Ee doc auto-generated — `python3 backend/gen_master_list.py`")
    A("")
    A("## 📊 Summary")
    A("")
    A("| Level | Enti | Count |")
    A("|---|---|---|")
    for tier in ["L0_OFFICIAL", "L1_REGION", "L2_RELIGION", "L3_CASTE", "L4_SPECIAL"]:
        A(f"| {tier.split('_', 1)[0]} | {TIER_TITLE[tier].replace('LEVEL ', '').replace(' — ', ' — ')} | {st['by_tier'].get(tier, 0)} |")
    A(f"| **TOTAL** | Configured listings | **{st['total']}** |")
    A("")
    A(f"⚙️ Registry routing-eligible flags: **{st['routing_eligible']}** (external availability/permissions unchecked)")
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
            A("**Structure:** the current registry has 22 community clusters with separate Bride/Groom listings and one shared Other ST listing; counts describe configured entries only.")
            A("These flags do not establish that a Telegram destination exists, is active, or grants the bot posting permission.")
            A("")
        A("| # | Channel | Configured username (verify before use) | Wave | Routing flag |")
        A("|---|---|---|---|---|")
        for i, (k, v) in enumerate(items, 1):
            status = "Routing eligible; external status unchecked" if v.get("live") else "Not marked routing-eligible"
            A(f"| {i} | {esc(v['name'])} | `@{v['username']}` | {v['wave']} | {status} |")
        A("")

    A("## 🤖 Registry routing")
    A("")
    A("The server selects destinations from the configured registry and limits automatic routing to the code-defined cap. This document does not establish that any external link is reachable or that a bot has channel permissions.")
    A("No alternate usernames are stored or tried. If a configured destination is unavailable, stop and verify a replacement owned by the operator before changing the registry.")
    A("")

    A("## 🛠️ Server lo — copy paste")
    A("")
    A("```bash")
    A("cd ~/matrimony-site")
    A("python3 backend/setup_channels.py --plan       # canonical plan (no token required)")
    A("python3 backend/setup_channels.py --check       # exact configured usernames; explicit external read-only API check")
    A("python3 backend/setup_channels.py --apply --key <registry-key>  # only after confirming destination ownership/access")
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
    A(f"3. **{BOT_USERNAME}** ni అవసరమైతే మాత్రమే, owner approval తర్వాత minimum permissions తో add చేయండి." if BOT_USERNAME else "3. Bot account configure కాలేదు; bot ను add చేయవద్దు లేదా username guess చేయవద్దు.")
    A("4. Pinned welcome post paste chey:")
    A("")
    A("```")
    A("🙏 మన వివాహ — TS-AP Telugu Matrimony directory")
    A("Profiles are member-submitted; independently verify personal details before making decisions.")
    A("Use only the member ID currently shown on the website. Send an interest request through the configured service flow.")
    A("Owner acceptance grants contact access in accepted-request account views. Configured notification messages may be queued; external delivery is not confirmed.")
    A("Check current plan details at https://manavivaha.in/pricing. External channel availability and delivery are not checked here.")
    A(f"🤖 Configured bot username: {BOT_USERNAME}" if BOT_USERNAME else "🤖 Bot username is not configured; use the website links only.")
    A("⚠️ Do not send advance money; report suspicious requests at https://manavivaha.in/safety.")
    A("```")
    A("")
    A("5. The registry's internal legacy `live` flag means routing eligibility only; it is not proof of channel existence, activity, or bot permissions.")
    A("")
    A("## ⚠️ If the configured username is unavailable")
    A("")
    A("Do not substitute a guessed username. Verify ownership and availability with the operator, then update the canonical registry and regenerate the generated files.")
    A("")

    A("## 🖥️ Website + API")
    A("")
    A(f"- `/channels` — {st['total']} configured listings, tier tabs + search + copy information; external link availability is not checked")
    A("- Home page — region/religion grid + selected community channels + special categories (registry-driven)")
    A("- API — `GET /api/channels`, `?tier=L3_CASTE`, `GET /api/channels/routing-eligible`, `POST /api/channels/route`")
    A("")
    A("---")
    A("")
    A(f"**మన వివాహ — {st['total']} configured directory listings. External availability and delivery are not guaranteed.**")
    A("")

    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(out))
    print(f"✅ wrote {os.path.relpath(OUT)} ({sum(len(x) for x in out)} chars)")


if __name__ == "__main__":
    main()
