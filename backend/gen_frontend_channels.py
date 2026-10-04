"""
Registry → frontend/src/lib/channels.ts  (auto-generate, no drift)
Run: python gen_frontend_channels.py
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from channels_config import CHANNELS, channel_stats, channel_links  # noqa: E402

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                   "..", "frontend", "src", "lib", "channels.ts")

TIER_LABEL = {
    "L0_OFFICIAL": ("Official Hub", "📢", "Announcements and service information"),
    "L1_REGION": ("Regions", "📍", "Telangana, Andhra Pradesh and NRI directory entries"),
    "L2_RELIGION": ("Community", "🕊️", "Hindu, Muslim and Christian directory entries"),
    "L3_CASTE": ("Community-wise", "💍", "Selected community directory entries"),
    "L4_SPECIAL": ("Special", "⭐", "Additional member-submitted profile categories"),
}
TIER_ORDER = ["L0_OFFICIAL", "L1_REGION", "L2_RELIGION", "L3_CASTE", "L4_SPECIAL"]


def main():
    rows = []
    for key, ch in CHANNELS.items():
        links = channel_links(key)
        rows.append({
            "key": key,
            "tier": ch["tier"],
            "name": ch["name"],
            "username": "@" + ch["username"],
            "link": str(links.get("telegram", "") or ""),
            "deepLink": str(links.get("telegram", "") or ""),
            "whatsappLink": str(links.get("whatsapp", "") or ""),
            # site-only: "… Register FREE: site | Bot: @x" trailer strip (site meeda redundant + bot wording radhu)
            "desc": " ".join(ch["desc"].split()).split(" Register FREE:")[0],
            "hashtags": ch.get("hashtags", []),
            "wave": ch.get("wave", 4),
            "live": bool(ch.get("live")),
        })
    # Hindu-only registration: caste channels plus caste-no-bar/open.
    caste_options = [c.get("route", {}).get("caste") for c in CHANNELS.values()
                     if c["tier"] == "L3_CASTE" and isinstance(c.get("route"), dict)]
    caste_options = [c for c in caste_options if c]
    caste_options = sorted(set(caste_options + ["Open"]), key=lambda value: (value.casefold(), value))

    tiers = [{"key": t, "label": TIER_LABEL[t][0], "icon": TIER_LABEL[t][1],
              "hint": TIER_LABEL[t][2],
              "count": sum(1 for r in rows if r["tier"] == t)} for t in TIER_ORDER]
    stats = channel_stats()

    ts = "// AUTO-GENERATED from backend/channels_config.py — edit registry, run gen_frontend_channels.py\n"
    ts += "// మన వివాహ | TSAP Matrimony — MASTER CHANNEL REGISTRY\n\n"
    ts += "export type Channel = {\n  key: string;\n  tier: string;\n  name: string;\n  username: string;\n"
    ts += "  link: string;\n  deepLink: string;\n  whatsappLink: string;\n  desc: string;\n  hashtags: string[];\n"
    ts += "  wave: number;\n  live: boolean;\n};\n\n"
    ts += f"export const CHANNEL_STATS = {json.dumps(stats, ensure_ascii=False)} as const;\n\n"
    ts += f"export const CHANNEL_TIERS = {json.dumps(tiers, ensure_ascii=False, indent=2)} as const;\n\n"
    ts += "export const ALL_CHANNELS: Channel[] = " + json.dumps(rows, ensure_ascii=False, indent=2) + ";\n\n"
    ts += "// Hindu-only register form dropdown — registry castes + Open\n"
    ts += "export const CASTE_OPTIONS: string[] = " + json.dumps(caste_options, ensure_ascii=False, indent=2) + ";\n"
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(ts)
    print(f"✅ wrote {os.path.relpath(OUT)} — {len(rows)} channels, {len(tiers)} tiers, stats={stats}")


if __name__ == "__main__":
    main()
