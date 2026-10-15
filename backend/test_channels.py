"""Explicitly opt-in, read-only Telegram channel smoke check.

Default behavior is a local dry run: no network call is made and the script does
not read BOT_TOKEN or targets. To check external status at one point in time, an
operator must explicitly set ALLOW_READ_ONLY_TELEGRAM_CHECK=1, provide BOT_TOKEN
in the process environment, and list exactly two TEST_CHANNELS destinations.

The opt-in path calls only getMe, getChat, and getChatMember. It never sends a
message, creates an invite, edits a channel, reads a demo token, or uses profile
or payment fixtures. It does not try alternate usernames. A successful check is
only evidence for the selected destinations at the time of that check.
"""
from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request

READ_ONLY_METHODS = frozenset({"getMe", "getChat", "getChatMember"})


def telegram_read(token: str, method: str, parameters: dict | None = None) -> dict:
    """Call an allowlisted read-only Telegram Bot API method without logging its secret URL."""
    if method not in READ_ONLY_METHODS:
        raise ValueError("Only allowlisted read-only Telegram methods are permitted.")
    if not token:
        raise ValueError("A bot token is required after explicit read-only opt-in.")

    payload = urllib.parse.urlencode(parameters or {}).encode("utf-8")
    request = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/{method}",
        data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            result = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
        # Never print the request URL: the bot token is part of that URL.
        raise RuntimeError(f"Telegram read-only request failed ({type(exc).__name__}).") from None
    if not isinstance(result, dict) or not result.get("ok"):
        description = result.get("description", "Telegram returned an unsuccessful response") if isinstance(result, dict) else "Unexpected Telegram response"
        raise RuntimeError(str(description)[:180])
    value = result.get("result")
    return value if isinstance(value, dict) else {}


def main() -> int:
    if os.getenv("ALLOW_READ_ONLY_TELEGRAM_CHECK") != "1":
        print("Dry run: no Telegram request made. External checks require explicit ALLOW_READ_ONLY_TELEGRAM_CHECK=1.")
        return 0

    token = (os.getenv("BOT_TOKEN") or "").strip()
    targets = [value.strip() for value in (os.getenv("TEST_CHANNELS") or "").split(",") if value.strip()]
    if not token:
        print("Read-only check not run: BOT_TOKEN is not set in the process environment.")
        return 2
    if len(targets) != 2:
        print("Read-only check not run: exactly two explicit TEST_CHANNELS destinations are required.")
        return 2
    if len({target.casefold() for target in targets}) != 2:
        print("Read-only check not run: destinations must be distinct.")
        return 2
    if any(not (re.fullmatch(r"@[A-Za-z0-9_]{5,32}", target)
                   or re.fullmatch(r"-100[0-9]{5,20}", target)) for target in targets):
        print("Read-only check not run: use explicit @username or -100… channel ID destinations.")
        return 2

    try:
        identity = telegram_read(token, "getMe")
        bot_id = int(identity["id"])
        print("External bot identity lookup succeeded at check time.")
        for target in targets:
            chat = telegram_read(token, "getChat", {"chat_id": target})
            member = telegram_read(token, "getChatMember", {"chat_id": target, "user_id": bot_id})
            if not chat:
                raise RuntimeError("Telegram returned no chat details for an explicitly supplied destination.")
            status = str(member.get("status") or "unknown")
            admin = status in {"administrator", "creator"}
            print(
                f"Checked {target} at this time: getChat succeeded; "
                f"bot status={status}; admin={str(admin).lower()}."
            )
    except (KeyError, TypeError, ValueError, RuntimeError) as exc:
        print(f"Read-only Telegram check incomplete: {exc}")
        return 1

    print("Read-only check complete. No messages were sent; this does not prove future availability or delivery.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
