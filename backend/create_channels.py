"""Safe channel-directory helper.

Plan generation is local-only. `--check` makes explicit read-only lookups only
for exact configured targets and reports point-in-time evidence; it never marks
channels eligible or probes guessed alternatives.
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from channels_config import (  # noqa: E402
    CHANNELS, channel_stats, channel_links,
    BOT_USERNAME, SITE,
)

TIER_ORDER = ["L0_OFFICIAL", "L1_REGION", "L2_RELIGION", "L3_CASTE", "L4_SPECIAL"]
TIER_TITLE = {
    "L0_OFFICIAL": "LEVEL 0 — OFFICIAL HUB",
    "L1_REGION": "LEVEL 1 — REGION FLAGSHIP",
    "L2_RELIGION": "LEVEL 2 — RELIGION",
    "L3_CASTE": "LEVEL 3 — COMMUNITY-WISE",
    "L4_SPECIAL": "LEVEL 4 — SPECIAL",
}


def print_channel(key: str, ch: dict, index: int | None = None) -> None:
    eligible = bool(ch.get("live"))
    status = ("Explicit destination configured; external status unchecked"
              if eligible else "No posting destination configured")
    username = str(ch.get("username") or "").strip().lstrip("@")
    public_link = channel_links(key).get("telegram") or ""
    print(f"\n  {'#' + str(index) + ' ' if index else ''}{ch['name']}   [{status}]")
    print(f"     Configured username : {'@' + username if username else 'Not configured; do not guess'}")
    print(f"     Public Telegram link: {public_link or 'Not configured'}")
    print(f"     Wave     : {ch.get('wave')}")
    print(f"     Hashtags : {' '.join(ch.get('hashtags', []))}")
    print(f"     Desc     : {ch.get('desc', '')}")


def plan(wave: int | None = None, key: str | None = None) -> None:
    stats = channel_stats()
    print("=" * 70)
    print(f"  MANA VIVAHA — CHANNEL DIRECTORY PLAN   |   {BOT_USERNAME}")
    print("=" * 70)
    print(f"  Configured listings: {stats['total']}   Explicit posting destinations: {stats['routing_eligible']}")
    print("  External availability and bot permissions are not inferred from registry values.")
    print("  Blank category usernames are intentional; do not invent handles or invite links.")
    print(f"  Setup instructions and read-only checks are available via setup_channels.py.")

    for tier in TIER_ORDER:
        items = [(k, v) for k, v in CHANNELS.items() if v.get("tier") == tier]
        if wave:
            items = [(k, v) for k, v in items if v.get("wave") == wave]
        if key:
            items = [(k, v) for k, v in items if k == key]
        if not items:
            continue
        print("\n" + "─" * 70)
        print(f" {TIER_TITLE[tier]}   ({len(items)} configured listings)")
        print("─" * 70)
        for i, (channel_key, channel) in enumerate(items, 1):
            print_channel(channel_key, channel, i)

    print("\n" + "=" * 70)
    print("  PINNED WELCOME POST (copy only after verifying intended channel):")
    print("=" * 70)
    print(f"""  🙏 మన వివాహ — TS-AP Telugu Matrimony directory
  🆔 Profile ID search: {SITE}/search
  📝 Register: {SITE}/register
  💰 Pricing and request terms: {SITE}/pricing
  {('🤖 Configured bot username: ' + BOT_USERNAME) if BOT_USERNAME else '🤖 Bot username is not configured; do not guess one.'}
  ⚠️ Do not send advance money; report suspicious requests at {SITE}/safety.""")


def check_telegram() -> int:
    """Run the shared read-only check for exact configured primary/mapped targets."""
    from setup_channels import BotAPI, env_token, run_check

    token = env_token("")
    if not token:
        print("Read-only check not run: provide BOT_TOKEN through the process environment/secret manager.")
        return 2
    summary = run_check(BotAPI(token))
    print("\nRead-only lookup complete. This is point-in-time evidence only; no messages were sent.")
    return 0 if not summary.get("missing") else 1


if __name__ == "__main__":
    args = sys.argv[1:]
    if "--check" in args:
        raise SystemExit(check_telegram())
    wave = int(args[args.index("--wave") + 1]) if "--wave" in args else None
    key = args[args.index("--key") + 1] if "--key" in args else None
    plan(wave=wave, key=key)
