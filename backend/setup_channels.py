"""
MANA VIVAHA — TELEGRAM CHANNEL SETUP AUTOMATION 📢
==================================================
"Local channel registry and setup tooling" — ee script tho:

  --plan              : e channels create cheyyali (wave order) + copy-paste checklist .md
  --kit  [--wave N]   : prathi channel ki ready kit (name/username/desc/pinned/rules/share) → channel-kits/
  --photos            : channel DP images (512x512, English text) → backend/channel_assets/
  --check             : explicit read-only Telegram API lookup of an explicitly configured posting destination (BOT_TOKEN required); never probe guessed alternates
  --apply [--wave N]  : MUTATES Telegram (title/description/photo/invite/pinned message); requires operator approval
  --self-test         : fake bot tho full flow (no token) — CI/test ki
  --report            : last apply/check result (.json + .md)

Token: --token xxx  leda  env BOT_TOKEN  leda  backend/.env lo BOT_TOKEN=...
NOTE: Telegram lo channel **create** cheyyadam Bot API lo ledu (bot create cheyyaleedu).
      Channel creation and any bot access are separate operator decisions. Posting is off unless an exact destination is explicitly configured; do not add the bot as admin by default.
      `--apply` is a separate, explicit Telegram mutation; it changes channel metadata and posts/pins a welcome message.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from channels_config import (  # noqa: E402
    CHANNELS, SITE, BOT_USERNAME, setup_plan, caste_split_report, channel_health_report,
    channel_links, channel_chat_id,
)
import channel_content as CC  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ASSET_DIR = os.path.join(HERE, "channel_assets")
STATE_FILE = os.environ.get("MANA_VIVAHA_CHANNEL_SETUP_STATE_FILE", os.path.join(HERE, "channel_setup_state.json"))
REPORT_DIR = os.environ.get("MANA_VIVAHA_CHANNEL_REPORT_DIR", os.path.dirname(STATE_FILE))
REGISTRY = os.path.join(HERE, "channels_config.py")
API = "https://api.telegram.org/bot%s/%s"


# ===========================================================================
# BOT API CLIENT (urllib — no extra dependency)
# ===========================================================================
class BotAPI:
    def __init__(self, token: str, dry_run: bool = False):
        self.token = token
        self.dry_run = dry_run

    # ---- low level
    def call(self, method: str, params: dict | None = None, files: dict | None = None) -> dict:
        if self.dry_run:
            return {"ok": True, "result": {"dry_run": True, "method": method}}
        url = API % (self.token, method)
        try:
            if files:
                body, headers = _multipart(params or {}, files)
                req = urllib.request.Request(url, data=body, headers=headers, method="POST")
            else:
                data = json.dumps(params or {}).encode()
                req = urllib.request.Request(url, data=data,
                                             headers={"Content-Type": "application/json"}, method="POST")
            with urllib.request.urlopen(req, timeout=40) as r:
                out = json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            try:
                out = json.loads(e.read().decode())
            except Exception:
                out = {"ok": False, "description": "HTTP %s" % e.code}
        except Exception as e:
            out = {"ok": False, "description": str(e)[:200]}
        if not out.get("ok"):
            out["_method"] = method
        return out

    def call_file(self, method: str, params: dict, field: str, path: str) -> dict:
        with open(path, "rb") as f:
            blob = f.read()
        files = {field: (os.path.basename(path), blob)}
        return self.call(method, params, files)

    # ---- high level helpers (FakeBot in tests ivanne implement chestundi)
    def get_me(self):
        return self.call("getMe").get("result", {})

    def get_chat(self, chat_id):
        return self.call("getChat", {"chat_id": chat_id}).get("result")

    def get_chat_member(self, chat_id, user_id):
        return self.call("getChatMember", {"chat_id": chat_id, "user_id": user_id}).get("result")

    def get_chat_member_count(self, chat_id):
        return self.call("getChatMemberCount", {"chat_id": chat_id}).get("result")

    def set_chat_title(self, chat_id, title):
        return self.call("setChatTitle", {"chat_id": chat_id, "title": title})

    def set_chat_description(self, chat_id, description):
        return self.call("setChatDescription", {"chat_id": chat_id, "description": description})

    def set_chat_photo(self, chat_id, path):
        return self.call_file("setChatPhoto", {"chat_id": chat_id}, "photo", path)

    def create_invite_link(self, chat_id, name="మన వివాహ"):
        return self.call("createChatInviteLink", {"chat_id": chat_id, "name": name}).get("result", {})

    def export_invite_link(self, chat_id):
        return self.call("exportChatInviteLink", {"chat_id": chat_id}).get("result")

    def send_message(self, chat_id, text, disable_notification=True):
        return self.call("sendMessage", {"chat_id": chat_id, "text": text,
                                         "parse_mode": "Markdown",
                                         "disable_web_page_preview": True,
                                         "disable_notification": disable_notification}).get("result", {})

    def pin_message(self, chat_id, message_id, notify=False):
        return self.call("pinChatMessage", {"chat_id": chat_id, "message_id": message_id,
                                            "disable_notification": not notify})


def _multipart(params: dict, files: dict):
    """Simple multipart/form-data encoder (urllib తో file upload కి)."""
    boundary = "----ManaVivahaBoundary%s" % int(time.time() * 1000)
    parts = []
    for k, v in params.items():
        parts.append(("--%s\r\nContent-Disposition: form-data; name=\"%s\"\r\n\r\n%s\r\n" % (boundary, k, v)).encode())
    for k, (fname, blob) in files.items():
        parts.append(("--%s\r\nContent-Disposition: form-data; name=\"%s\"; filename=\"%s\"\r\n"
                      "Content-Type: application/octet-stream\r\n\r\n" % (boundary, k, fname)).encode())
        parts.append(blob)
        parts.append(b"\r\n")
    parts.append(("--%s--\r\n" % boundary).encode())
    return b"".join(parts), {"Content-Type": "multipart/form-data; boundary=%s" % boundary}


# ===========================================================================
# CHANNEL DP (display picture) — English text (server lo Telugu font ledu)
# ===========================================================================
def channel_dp_image(key: str, ch: dict | None = None, out_path: str | None = None) -> str | None:
    # Reuse a repository-maintained channel asset before attempting generation; this
    # keeps plan/kit/API reads independent of Pillow and avoids replacing artwork.
    existing = out_path or os.path.join(ASSET_DIR, "%s.png" % key)
    if os.path.isfile(existing):
        return existing
    try:
        from PIL import Image, ImageDraw
    except Exception:
        return None
    try:
        from card_pro import F
    except Exception:
        from PIL import ImageFont

        def F(size, bold=False):  # type: ignore
            try:
                return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf"
                                          % ("-Bold" if bold else ""), size)
            except Exception:
                return ImageFont.load_default()

    ch = ch or CHANNELS.get(key, {})
    txt = CC.dp_text(key)
    W = H = 512
    img = Image.new("RGB", (W, H), (122, 12, 46))
    d = ImageDraw.Draw(img)
    for i in range(0, H, 4):
        shade = int(122 - (i / H) * 30)
        d.rectangle([0, i, W, i + 4], fill=(shade, 12, 46))
    d.rounded_rectangle([14, 14, W - 14, H - 14], radius=54, outline=(212, 175, 55), width=5)
    d.ellipse([W * 0.5 - 150, 74, W * 0.5 + 150, 374], outline=(212, 175, 55), width=4)

    f_big = F(64 if len(txt["big"]) <= 9 else 46, bold=True)
    w = d.textlength(txt["big"], font=f_big)
    d.text(((W - w) / 2, 150), txt["big"], font=f_big, fill=(212, 175, 55))
    if txt["mid"]:
        f_mid = F(40, bold=True)
        w2 = d.textlength(txt["mid"], font=f_mid)
        d.text(((W - w2) / 2, 236), txt["mid"], font=f_mid, fill=(255, 248, 231))
    f_sm = F(24, bold=False)
    w3 = d.textlength(txt["small"], font=f_sm)
    d.text(((W - w3) / 2, 400), txt["small"], font=f_sm, fill=(255, 248, 231))
    f_brand = F(22, bold=True)
    w4 = d.textlength("MANA VIVAHA", font=f_brand)
    d.text(((W - w4) / 2, 436), "MANA VIVAHA", font=f_brand, fill=(212, 175, 55))
    out_path = out_path or os.path.join(ASSET_DIR, "%s.png" % key)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    img.save(out_path, "PNG", optimize=True)
    return out_path


def generate_all_photos(wave: int | None = None, keys: list | None = None) -> list:
    out = []
    for row in setup_plan(wave):
        if keys and row["key"] not in keys:
            continue
        path = channel_dp_image(row["key"], CHANNELS.get(row["key"]))
        if path:
            out.append({"key": row["key"], "path": path})
    return out


# ===========================================================================
# PLAN / KIT (no token needed)
# ===========================================================================
def configured_public_links(key: str) -> dict:
    """Resolve the same owner/admin URL the public directory exposes, without guessing."""
    try:
        import chanmap
        if key in chanmap.OVERRIDES:
            return dict(chanmap.public_links().get(key) or {})
    except Exception:
        pass
    return channel_links(key)


def plan_rows(wave: int | None = None) -> list:
    rows = []
    for r in setup_plan(wave):
        ch = CHANNELS.get(r["key"], {})
        links = configured_public_links(r["key"])
        public_link = str(links.get("telegram") or "")
        rows.append({**r, "telegram_link": public_link,
                     "pinned": CC.pinned_welcome(r["key"], ch),
                     "share": CC.share_text(r["key"], ch, telegram_link=public_link),
                     "dp_text": CC.dp_text(r["key"])})
    return rows


def routing_status(channel: dict) -> str:
    """Describe explicit routing configuration without implying external health."""
    return ("Explicit destination configured; external status unchecked"
            if channel.get("routing_eligible") else "No posting destination configured")


def display_username(username: str) -> str:
    value = str(username or "").strip().lstrip("@")
    return "@" + value if value else "Not configured; do not guess"


def display_link(row: dict) -> str:
    return str(row.get("telegram_link") or "Not configured; use an owner-provided invite URL")


def print_plan(wave: int | None = None) -> None:
    rows = plan_rows(wave)
    print("\n📢 MANA VIVAHA — CHANNEL SETUP PLAN (%d configured listings%s)"
          % (len(rows), "" if wave is None else ", wave %s" % wave))
    print("=" * 78)
    print("Only exact configured targets are used. Public invite links and usernames are not external availability checks; blank destinations are intentional and must not be guessed.")
    cur_wave = None
    for i, r in enumerate(rows, 1):
        if r["wave"] != cur_wave:
            cur_wave = r["wave"]
            print("\n──────── WAVE %s ────────" % cur_wave)
        print("\n%2d. %s   [%s]" % (i, r["name"], routing_status(r)))
        print("    Username : %s" % display_username(r["username"]))
        print("    Link     : %s" % display_link(r))
        print("    Desc     : %s" % r["desc"])
    eligible = len([r for r in rows if r["routing_eligible"]])
    print("\nTotal: %d listings; %d marked routing-eligible (not an availability check)" % (len(rows), eligible))


def write_plan_md(path: str | None = None, wave: int | None = None) -> str:
    rows = plan_rows(wave)
    path = path or os.path.join(ROOT, "CHANNELS-SETUP-CHECKLIST.md")
    lines = ["# 📢 మన వివాహ — Channel Setup Checklist (%d configured listings)" % len(rows), "",
             "> Auto-generated by `backend/setup_channels.py --plan` from the canonical registry.",
             "> A routing destination must be explicitly configured. A public username/invite link is not proof of availability or bot access.",
             "> Blank usernames/destinations are intentional. Do not invent a handle or treat an invite URL as a posting chat ID.",
             "> `--apply` may change channel metadata, upload artwork, create an invite, send a welcome message, and pin it. It is a mutating setup operation, not a smoke test; use only with separate, explicit operator approval for the exact destination and intended changes.",
             "> Local registry checks do not prove external uptime, permissions, or message delivery.", "",
             "## ⚡ Setup (only after confirming ownership/access)", "",
             "```bash",
             "# 1) Create the intended channel and confirm the exact username is operator-owned.",
             "# 2) Do not add the bot as an admin by default; posting is disabled until an exact destination is explicitly configured.",
             "# If a future use case requires bot access, verify ownership and grant only the minimum permissions after separate operator review.",
             "# 3) Optionally run the explicit read-only check and review its output before any setup mutation.",
             "cd backend",
             "read -rsp 'Bot token: ' BOT_TOKEN && export BOT_TOKEN; echo",
             "python setup_channels.py --check --wave 1",
             "# After explicit approval only: python setup_channels.py --apply --wave 1",
             "unset BOT_TOKEN",
             "```", ""]
    cur = None
    for r in rows:
        if r["wave"] != cur:
            cur = r["wave"]
            lines += ["", "## 🌊 WAVE %s" % cur, ""]
        lines += ["### %s `%s`" % ("⚙️" if r["routing_eligible"] else "⬜", r["key"]),
                  "", "| Item | Value |", "|---|---|",
                  "| Name | `%s` |" % r["name"],
                  "| Configured username | `%s` |" % display_username(r["username"]),
                  "| Routing configuration | %s |" % routing_status(r),
                  "| Public Telegram link | %s |" % display_link(r),
                  "| Hashtags | %s |" % " ".join(r["hashtags"]),
                  "", "**Description (paste in channel → Edit → Description):**", "", "```", r["desc"], "```",
                  "", "**📌 Pin this post (channel కి welcome + rules):**", "", "```", r["pinned"], "```", ""]
    open(path, "w").write("\n".join(lines))
    return path


def write_kits(keys: list | None = None, wave: int | None = None) -> list:
    """Prathi channel కి separate kit file — copy-paste చెయ్యడానికి."""
    out_dir = os.path.join(ROOT, "channel-kits")
    os.makedirs(out_dir, exist_ok=True)
    written = []
    for r in plan_rows(None):
        if wave and r["wave"] != wave:
            continue
        if keys and r["key"] not in keys:
            continue
        dp_candidate = os.path.join(ASSET_DIR, "%s.png" % r["key"])
        dp = os.path.relpath(dp_candidate, ROOT) if os.path.exists(dp_candidate) else ""
        body = [
            "# %s" % r["name"], "",
            "- **Key:** `%s`  •  **Tier:** %s  •  **Wave:** %s"
            % (r["key"], r["tier"], r["wave"]),
            "- **Routing configuration:** %s" % routing_status(r),
            "- **Configured username:** `%s`" % display_username(r["username"]),
            "- **Public Telegram link:** %s (availability not checked)" % display_link(r),
            "> Use only an explicitly configured username or owner-provided invite. Blank destinations are intentional; do not invent or probe alternatives.",
            "> `setup_channels.py --apply` is a mutating operation: it may change metadata, upload artwork, create an invite, send and pin a welcome message. It is not a smoke test; run only with separate, explicit operator approval for the exact destination and intended changes.",
            "- **Hashtags:** %s" % " ".join(r["hashtags"]),
            "- **DP image:** `%s`" % (dp or "-"), "",
            "## 1) Channel create (phone → New Channel)", "",
            "Name: `%s`" % r["name"], "",
            "Username: `%s`" % display_username(r["username"]), "",
            "Description:", "", "```", r["desc"], "```", "",
            "## 2) Bot access (off by default)", "",
            "Posting is disabled for this listing unless an exact destination is explicitly configured. Do not add the bot as an administrator or grant permissions by default. If a future, owner-approved workflow requires bot access, verify the exact destination and grant only the minimum permissions needed for that specific operation.",
            "", "## 3) 📌 Pinned welcome post (idi pin cheyyi)", "", "```", r["pinned"], "```", "",
            "## 4) Rules post", "", "```", CC.rules_post(r["key"]), "```", "",
            "## 5) WhatsApp / status లో share text", "", "```", r["share"], "```", "",
            "## 6) Setup command", "", "```bash",
            "python setup_channels.py --apply --key %s" % r["key"], "```", "",
        ]
        path = os.path.join(out_dir, "%s.md" % r["key"])
        open(path, "w").write("\n".join(body))
        written.append(path)
    return written



def write_create_list_telugu(path: str | None = None, wave: int | None = None) -> str:
    """📱 Phone లో channel create చెయ్యడానికి SIMPLE copy-paste list (Telugu)."""
    rows = plan_rows(wave)
    path = path or os.path.join(ROOT, "CHANNEL-CREATE-LIST-TELUGU.md")
    by_wave: Dict[int, list] = {}
    for r in rows:
        by_wave.setdefault(r["wave"], []).append(r)
    telugu_wave = {1: "మొదటి దశ (వెంటనే చేయండి)", 2: "రెండో దశ", 3: "మూడో దశ", 4: "నాలుగో దశ"}
    lines = [
        "# 📱 CHANNEL CREATE LIST — ఇది చూసి ఒక్కొక్కటి create చేయండి",
        "",
        f"**మొత్తం {len(rows)} configured listings** — setup చేసే ముందు operator ownership/access ని స్వతంత్రంగా నిర్ధారించండి.",
        "ఈ registry external availability లేదా bot permissions ను తనిఖీ చేయదు. Username పని చేయకపోతే ఆపి, owner-approved replacement ను verify చేయండి; ఊహించి alternate వాడకండి.",
        "",
        "ప్రతి channel కి: **Name copy → configured username check → Description paste → bot permissions verify**",
        "",
        "## ⚡ ఒక్కో channel ki 4 నిమిషాలు (phone lo)",
        "1. Telegram → ☰ → **New Channel** → Name (క్రింద టేబుల్ నుంచి copy) → **Public** → Username (copy)",
        "2. Description paste (kit file లో ఉంది — `channel-kits/<key>.md`) → Create",
        "3. Do not add the bot as an administrator by default. Posting is disabled unless an exact destination is configured and owner-approved; only then grant the minimum permissions required.",
        "4. `--apply` is a separate, mutating setup operation; it may change metadata, upload artwork, create an invite, send, and pin. It is not a smoke test and needs explicit operator approval.",
        "",
    ]
    for w in sorted(by_wave):
        lines += [f"## 🌊 Wave {w} — {telugu_wave.get(w, '')} ({len(by_wave[w])} listings)", "",
                  "| # | Name (copy) | Configured username (verify first) | Routing flag (not uptime) |",
                  "|---|---|---|---|"]
        for i, r in enumerate(by_wave[w], 1):
            lines.append("| %d | `%s` | `%s` | %s |"
                         % (i, str(r["name"]).replace("|", "\\|"), display_username(r["username"]), routing_status(r)))
        lines.append("")
        if w == 1:
            lines += ["### Wave-1 operator checks (only after confirming exact ownership/access)", "",
                      "`--check` makes explicit read-only Telegram API calls; it is not a message-delivery test. Review results before any separate setup mutation.", "",
                      "```bash", "read -rsp 'Bot token: ' BOT_TOKEN && export BOT_TOKEN; echo",
                      "python setup_channels.py --check --wave 1",
                      "# After separate, explicit approval only: python setup_channels.py --apply --wave 1",
                      "unset BOT_TOKEN", "```", ""]
    lines += ["## 🎯 ముఖ్యమైన సూచనలు", "",
              "- Wave sizes and usernames above come from the registry; they are not proof of an existing public channel.",
              "- Do not send messages or enable automatic publishing until the operator verifies the exact destination and access.",
              "- `--check` performs explicit read-only Telegram API requests only when an operator supplies a real bot token; it does not prove future availability or delivery.",
              "- `--apply` is mutating and can send/pin a welcome message. It is not a smoke test and requires separate, explicit operator approval.",
              ""]
    open(path, "w").write("\n".join(lines))
    return path


# ===========================================================================
# CHECK / APPLY (token kavali)
# ===========================================================================
def load_state() -> dict:
    if os.path.exists(STATE_FILE):
        try:
            return json.load(open(STATE_FILE))
        except Exception:
            pass
    return {"channels": {}}


def save_state(state: dict) -> None:
    state["updated_at"] = time.strftime("%Y-%m-%d %H:%M:%S")
    json.dump(state, open(STATE_FILE, "w"), indent=2, ensure_ascii=False)


def check_bot_admin(bot: "BotAPI", chat_id, bot_id) -> dict:
    """Read the bot's Telegram membership and permissions; never infer them from config."""
    if not bot_id:
        return {"checked": False, "status": "unknown", "is_admin": False,
                "admin_ok": False, "permissions_ok": False,
                "missing_permissions": ["bot identity could not be verified"]}
    try:
        member = bot.get_chat_member(chat_id, bot_id)
    except Exception as exc:
        return {"checked": False, "status": "unknown", "is_admin": False,
                "admin_ok": False, "permissions_ok": False,
                "error": str(exc)[:160],
                "missing_permissions": ["Telegram membership lookup failed"]}
    if not isinstance(member, dict):
        return {"checked": False, "status": "unknown", "is_admin": False,
                "admin_ok": False, "permissions_ok": False,
                "missing_permissions": ["Telegram membership lookup returned no result"]}

    status = str(member.get("status") or "unknown").lower()
    is_admin = status in {"administrator", "creator"}
    # Telegram's creator status implies full management rights; administrator
    # capabilities must be present explicitly in the API response.
    permissions = {
        name: (True if status == "creator" else member.get(name) is True)
        for name in ("can_change_info", "can_post_messages", "can_pin_messages", "can_invite_users")
    }
    required_for_setup = ("can_change_info", "can_post_messages", "can_pin_messages")
    missing = [name for name in required_for_setup if not permissions[name]] if is_admin else list(required_for_setup)
    return {"checked": True, "status": status, "is_admin": is_admin,
            "admin_ok": is_admin, "permissions_ok": is_admin and not missing,
            **permissions, "missing_permissions": missing}


def resolve_chat(bot: "BotAPI", key: str, *, allow_primary_username: bool = True) -> dict:
    """Look up one exact target; checks may use a primary handle, mutations may not."""
    ch = CHANNELS.get(key, {})
    target = channel_chat_id(key, only_routing_eligible=False)
    if not target and allow_primary_username:
        username = str(ch.get("username") or "").strip().lstrip("@")
        target = "@" + username if username else ""
    if not target:
        return {"found": False, "target": "", "tried": []}
    try:
        chat = bot.get_chat(target)
    except Exception as exc:
        return {"found": False, "target": target, "tried": [target], "error": str(exc)[:160]}
    if chat:
        actual_username = str(chat.get("username") or "").strip().lstrip("@")
        return {"found": True, "target": target,
                "username": actual_username or (target.lstrip("@") if target.startswith("@") else ""),
                "chat": chat, "tried": [target]}
    return {"found": False, "target": target, "tried": [target]}


def configure_channel(bot: "BotAPI", key: str, state: dict, force_photo: bool = False,
                      pin_welcome: bool = True, create_invite: bool = False) -> dict:
    """Apply an explicitly routed channel after verifying bot admin permissions."""
    ch = CHANNELS.get(key)
    if not ch:
        return {"key": key, "ok": False, "error": "registry lo ledu"}
    state.setdefault("channels", {})
    st = state["channels"].get(key, {})
    title = CC.perfect_title(key, ch)
    desc = CC.perfect_description(key, ch)
    steps, errors = [], []

    # Mutations require a destination set specifically for routing; a public primary
    # username is not sufficient authorization to change a Telegram channel.
    resolved = resolve_chat(bot, key, allow_primary_username=False)
    if not resolved["found"]:
        reason = ("exact posting destination not configured; supply an owner-confirmed username or chat ID"
                  if not resolved.get("target") else "configured destination lookup did not find a channel")
        return {"key": key, "ok": False, "error": reason,
                "tried": resolved["tried"], "name": title,
                "username": resolved.get("username") or ch.get("username") or ""}

    chat = resolved["chat"]
    chat_id = chat.get("id")
    me = bot.get_me() or {}
    bot_id = me.get("id")
    if not bot_id:
        return {"key": key, "ok": False,
                "error": "bot identity could not be verified; no channel changes were made",
                "chat_title": chat.get("title"), "username": resolved["username"], "steps": []}
    admin = check_bot_admin(bot, chat_id, bot_id)
    members = chat.get("member_count")
    if members is None:
        try:
            members = bot.get_chat_member_count(chat_id)
        except Exception:
            members = None
    steps.append({"step": "get_chat", "ok": True, "username": resolved["username"],
                  "title": chat.get("title"), "members": members,
                  "admin_status_checked": admin["checked"], "admin_status": admin["status"]})
    if not admin["checked"]:
        return {"key": key, "ok": False,
                "error": "bot admin status could not be verified; no channel changes were made",
                "chat_title": chat.get("title"), "username": resolved["username"],
                "admin": admin, "steps": steps}
    if not admin["is_admin"]:
        return {"key": key, "ok": False,
                "error": "Telegram reports bot status '%s'; administrator access is required" % admin["status"],
                "chat_title": chat.get("title"), "username": resolved["username"],
                "admin": admin, "steps": steps}

    links = configured_public_links(key)
    # Prefer the current owner/admin-configured public invite over any stale setup-state URL.
    invite = str(links.get("telegram") or st.get("invite_link") or "")
    needs_invite = bool(create_invite and not invite)

    dp = os.path.join(ASSET_DIR, "%s.png" % key)
    if not os.path.exists(dp):
        dp = channel_dp_image(key, ch)
    update_title = chat.get("title") != title
    update_desc = (chat.get("description") or "").strip() != desc.strip()
    update_photo = bool(dp and (force_photo or not chat.get("photo")))
    post_welcome = bool(pin_welcome and not st.get("welcome_message_id"))
    needs = []
    if update_title or update_desc or update_photo:
        needs.append("can_change_info")
    if post_welcome:
        needs.extend(("can_post_messages", "can_pin_messages"))
    if needs_invite:
        needs.append("can_invite_users")
    missing = [name for name in dict.fromkeys(needs) if not admin.get(name)]
    if missing:
        return {"key": key, "ok": False,
                "error": "bot lacks required Telegram administrator permissions: %s; no channel changes were made"
                         % ", ".join(missing),
                "chat_title": chat.get("title"), "username": resolved["username"],
                "admin": admin, "steps": steps}

    if update_title:
        r = bot.set_chat_title(chat_id, title)
        steps.append({"step": "set_title", "ok": bool(r.get("ok")), "title": title})
        if not r.get("ok"):
            errors.append("set_title: %s" % r.get("description"))

    if update_desc:
        r = bot.set_chat_description(chat_id, desc)
        steps.append({"step": "set_description", "ok": bool(r.get("ok")), "chars": len(desc)})
        if not r.get("ok"):
            errors.append("set_description: %s" % r.get("description"))

    if update_photo:
        r = bot.set_chat_photo(chat_id, dp)
        steps.append({"step": "set_photo", "ok": bool(r.get("ok")), "file": os.path.basename(dp or "")})
        if r.get("ok"):
            st["photo_uploaded"] = True
        else:
            errors.append("set_photo: %s" % r.get("description"))

    if needs_invite:
        inv = bot.create_invite_link(chat_id, "మన వివాహ")
        invite = str(inv.get("invite_link") or bot.export_invite_link(chat_id) or "")
        steps.append({"step": "invite_link", "ok": bool(invite), "link": invite,
                      "owner_link": False, "created": bool(invite)})
        if not invite:
            errors.append("invite_link: Telegram did not return an invite URL")
    elif invite:
        steps.append({"step": "invite_link", "ok": True, "link": invite,
                      "owner_link": bool(links.get("telegram")),
                      "cached": not bool(links.get("telegram"))})
    else:
        steps.append({"step": "invite_link", "ok": True, "configured": False,
                      "skipped": True, "reason": "no owner URL; --create-invite was not requested"})

    if post_welcome:
        msg = bot.send_message(chat_id, CC.pinned_welcome(key, ch))
        mid = msg.get("message_id")
        if mid:
            r = bot.pin_message(chat_id, mid, notify=False)
            steps.append({"step": "pinned_welcome", "ok": bool(r.get("ok")), "message_id": mid})
            if r.get("ok"):
                st["welcome_message_id"] = mid
            else:
                errors.append("pinned_welcome: %s" % r.get("description"))
        else:
            errors.append("pinned_welcome: message was not sent (%s)" % (msg or {}).get("description", "unknown"))
    else:
        steps.append({"step": "pinned_welcome", "ok": True,
                      "message_id": st.get("welcome_message_id"), "cached": True})

    st.update({"username": resolved["username"], "title": title, "members": members,
               "configured_at": time.strftime("%Y-%m-%d %H:%M:%S"), "invite_link": invite})
    state["channels"][key] = st
    return {"key": key, "ok": not errors, "errors": errors, "username": resolved["username"],
            "chat_id": chat_id, "admin": admin, "steps": steps, "invite_link": invite,
            "members": st.get("members")}


def run_apply(bot: "BotAPI", wave: int | None = None, keys: list | None = None,
              force_photo: bool = False, create_invite: bool = False) -> dict:
    state = load_state()
    results = []
    for row in setup_plan(wave):
        if keys and row["key"] not in keys:
            continue
        res = configure_channel(bot, row["key"], state, force_photo=force_photo,
                                create_invite=create_invite)
        results.append(res)
        icon = "✅" if res.get("ok") else "⚠️"
        print("%s %-20s %s" % (icon, row["key"], res.get("username") or res.get("error", "")))
    save_state(state)
    summary = {"checked": len(results), "configured": len([r for r in results if r.get("ok")]),
               "failed": [r["key"] for r in results if not r.get("ok")],
               "at": time.strftime("%Y-%m-%d %H:%M:%S")}
    os.makedirs(REPORT_DIR, exist_ok=True)
    json.dump({"summary": summary, "results": results},
              open(os.path.join(REPORT_DIR, "channel_setup_report.json"), "w"), indent=2, ensure_ascii=False)
    return summary


def run_check(bot: "BotAPI", wave: int | None = None, keys: list | None = None) -> dict:
    me = bot.get_me()
    bot_id = me.get("id", 0)
    rows = []
    for row in setup_plan(wave):
        if keys and row["key"] not in keys:
            continue
        res = resolve_chat(bot, row["key"])
        posting_target = channel_chat_id(row["key"], only_routing_eligible=False)
        if not res["found"]:
            rows.append({"key": row["key"], "exists": False, "username": row.get("username") or "",
                         "target_configured": bool(posting_target),
                         "lookup_target_configured": bool(res.get("target")),
                         "tried": res["tried"]})
            if res.get("target"):
                print("⬜ %-20s %s — exact configured target not found" % (row["key"], res["target"]))
            else:
                print("—  %-20s no exact target configured; not checked" % row["key"])
            continue
        chat = res["chat"]
        admin = check_bot_admin(bot, chat["id"], bot_id)
        members = chat.get("member_count")
        if members is None:
            members = bot.get_chat_member_count(chat["id"])
        rows.append({"key": row["key"], "exists": True, "username": res["username"],
                     "target": res.get("target"), "target_configured": bool(posting_target),
                     "lookup_target_configured": True,
                     "title": chat.get("title"), "desc_ok": (chat.get("description") or "").strip() == row["desc"].strip(),
                     "photo": bool(chat.get("photo")), "admin": admin, "members": members})
        print("%s %-20s %-28s members=%-5s desc=%s admin=%s setup-permissions=%s"
              % ("✅" if admin["permissions_ok"] else "⚠️", row["key"], res.get("target") or res["username"], members,
                 "ok" if rows[-1]["desc_ok"] else "MISSING",
                 admin["status"] if admin["checked"] else "unchecked",
                 "ok" if admin["permissions_ok"] else "incomplete"))
    summary = {"bot": me.get("username"), "checked": len(rows),
               "exists": len([r for r in rows if r["exists"]]),
               "ready": len([r for r in rows if r.get("exists") and r.get("target_configured")
                             and r.get("admin", {}).get("permissions_ok")]),
               "missing": [r["key"] for r in rows if not r["exists"]], "rows": rows}
    os.makedirs(REPORT_DIR, exist_ok=True)
    json.dump(summary, open(os.path.join(REPORT_DIR, "channel_check_report.json"), "w"), indent=2, ensure_ascii=False)
    return summary


# ===========================================================================
# SELF TEST (no token) — full flow ni fake bot tho
# ===========================================================================
class FakeBot:
    """Tests కి: అన్నీ API calls record చేస్తుంది, Telegram తో matladadu."""

    def __init__(self, admin=True, photo=None, description=""):
        self.calls = []
        self.admin = admin
        self.photo = photo
        self.description = description
        self._mid = 500

    def _rec(self, m, p=None):
        self.calls.append({"method": m, "params": p or {}})
        return {"ok": True, "result": {}}

    def get_me(self):
        self._rec("getMe")
        return {"id": 42, "username": "synthetic_test_bot", "first_name": "Synthetic Test Bot"}

    def get_chat(self, chat_id):
        self._rec("getChat", {"chat_id": chat_id})
        return {"id": 1000 + len({c["params"].get("chat_id") for c in self.calls}), "title": "Old Title",
                "description": self.description, "photo": self.photo,
                "username": str(chat_id).lstrip("@"), "type": "channel"}

    def get_chat_member(self, chat_id, user_id):
        self._rec("getChatMember", {"chat_id": chat_id, "user_id": user_id})
        return {"status": "administrator" if self.admin else "member",
                "can_change_info": self.admin, "can_post_messages": self.admin,
                "can_pin_messages": self.admin, "can_invite_users": self.admin}

    def get_chat_member_count(self, chat_id):
        self._rec("getChatMemberCount", {"chat_id": chat_id})
        return 137

    def set_chat_title(self, chat_id, title):
        return self._rec("setChatTitle", {"chat_id": chat_id, "title": title})

    def set_chat_description(self, chat_id, description):
        return self._rec("setChatDescription", {"chat_id": chat_id, "description": description})

    def set_chat_photo(self, chat_id, path):
        return self._rec("setChatPhoto", {"chat_id": chat_id, "path": path})

    def create_invite_link(self, chat_id, name="మన వివాహ"):
        r = self._rec("createChatInviteLink", {"chat_id": chat_id, "name": name})
        r["result"] = {"invite_link": "https://t.me/+MANAVIVAHA%04d" % (abs(hash(chat_id)) % 10000)}
        return r["result"]

    def export_invite_link(self, chat_id):
        return "https://t.me/+EXPORTED"

    def send_message(self, chat_id, text, disable_notification=True):
        self._mid += 1
        r = self._rec("sendMessage", {"chat_id": chat_id, "text": text})
        r["result"] = {"message_id": self._mid, "text": text}
        return r["result"]

    def pin_message(self, chat_id, message_id, notify=False):
        return self._rec("pinChatMessage", {"chat_id": chat_id, "message_id": message_id})


def self_test(wave: int | None = None) -> dict:
    """Run a FakeBot flow entirely inside a temporary directory and memory-only target override."""
    print("\n🧪 SELF TEST (FakeBot — no Telegram network access)\n" + "=" * 60)
    problems = []
    temp_root = tempfile.mkdtemp(prefix="mana-vivaha-channel-self-test-")
    old_state, old_assets, old_reports = STATE_FILE, ASSET_DIR, REPORT_DIR
    key = "c_reddy_bride"
    test_keys = ["ts_bride", key, "ap_bride", "c_others_st"]
    old_routes = {test_key: (CHANNELS[test_key].get("routing_destination"), CHANNELS[test_key].get("live"))
                  for test_key in test_keys}
    try:
        STATE_FILE = os.path.join(temp_root, "channel_setup_state.json")
        ASSET_DIR = os.path.join(temp_root, "assets")
        REPORT_DIR = os.path.join(temp_root, "reports")
        for test_key in test_keys:
            CHANNELS[test_key]["routing_destination"] = "@test_" + test_key
            CHANNELS[test_key]["live"] = True

        rows = plan_rows(wave)
        print("1) plan rows:", len(rows))
        if not rows:
            problems.append("plan khali")

        dp = channel_dp_image("ts_bride")
        ok_dp = bool(dp and os.path.exists(dp))
        print("2) isolated DP image generated:", ok_dp)
        if not ok_dp:
            problems.append("DP generate avvaledu")

        fake = FakeBot()
        res = run_apply(fake, wave=None, keys=test_keys, create_invite=True)
        methods = [call["method"] for call in fake.calls]
        print("3) fake apply summary:", res)
        for needed in ("getChat", "getChatMember", "setChatTitle", "setChatDescription",
                       "setChatPhoto", "createChatInviteLink", "sendMessage", "pinChatMessage"):
            if needed not in methods:
                problems.append("apply lo %s call ravaledu" % needed)
        if res["configured"] != 4:
            problems.append("4 isolated channels configure avvaledu: %s" % res)
        send = [call for call in fake.calls if call["method"] == "sendMessage"]
        if send and "chatting లేదు" not in send[0]["params"]["text"]:
            problems.append("welcome post lo rules ledu")

        fake_non_admin = FakeBot(admin=False)
        non_admin = configure_channel(fake_non_admin, "ts_bride", load_state())
        if "admin" not in str(non_admin.get("error", "")).lower():
            problems.append("admin error ravaledu: %s" % non_admin.get("error"))
        print("4) non-admin response:", non_admin.get("error"))
    finally:
        for test_key, (destination, live) in old_routes.items():
            CHANNELS[test_key]["routing_destination"] = destination or ""
            CHANNELS[test_key]["live"] = bool(live)
        STATE_FILE, ASSET_DIR, REPORT_DIR = old_state, old_assets, old_reports
        shutil.rmtree(temp_root, ignore_errors=True)

    print("\n%s" % ("❌ SELF-TEST ISSUES: %s" % problems if problems else "✅ SELF-TEST PASS — isolated FakeBot calls only; no external status checked"))
    return {"ok": not problems, "problems": problems}


# ===========================================================================
# CLI
# ===========================================================================
def env_token(cli_token: str | None) -> str:
    if cli_token:
        return cli_token
    if os.environ.get("BOT_TOKEN"):
        return os.environ["BOT_TOKEN"]
    envf = os.path.join(HERE, ".env")
    if os.path.exists(envf):
        for line in open(envf):
            if line.strip().startswith("BOT_TOKEN="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


def main() -> int:
    ap = argparse.ArgumentParser(description="మన వివాహ channel setup automation")
    ap.add_argument("--plan", action="store_true", help="creation plan print + CHANNELS-SETUP-CHECKLIST.md")
    ap.add_argument("--kit", action="store_true", help="prathi channel కి kit file (channel-kits/)")
    ap.add_argument("--create-list", action="store_true", help="📱 Telugu copy-paste create list (phone కి)")
    ap.add_argument("--photos", action="store_true", help="channel DP images generate")
    ap.add_argument("--check", action="store_true", help="Explicit read-only Telegram lookup; requires an operator token; does not prove future availability")
    ap.add_argument("--apply", action="store_true", help="apply channel changes to exact configured destinations")
    ap.add_argument("--create-invite", action="store_true", help="explicitly create a Telegram invite only when no owner URL exists (requires --apply)")
    ap.add_argument("--self-test", action="store_true", help="fake bot తో flow test")
    ap.add_argument("--wave", type=int, help="only wave N")
    ap.add_argument("--key", action="append", help="only ee key (repeat ok)")
    ap.add_argument("--token", help="BOT_TOKEN (lekapote env/.env)")
    ap.add_argument("--force-photo", action="store_true", help="DP already ఉన్న మళ్లీ upload")
    ap.add_argument("--dry-run", action="store_true", help="API calls cheyyaku (body chupinchu)")
    args = ap.parse_args()

    if args.self_test:
        return 0 if self_test(args.wave)["ok"] else 1
    if args.create_invite and not args.apply:
        ap.error("--create-invite requires --apply")
    if args.photos:
        out = generate_all_photos(args.wave, args.key)
        print("🖼️  %d channel DP images → %s" % (len(out), ASSET_DIR))
        return 0
    if args.create_list:
        p = write_create_list_telugu(None, args.wave)
        print("📱 create list (Telugu): %s" % p)
        return 0
    if args.plan or not any([args.kit, args.check, args.apply, args.photos, args.create_list]):
        print_plan(args.wave)
        print("\n📄 checklist: %s" % write_plan_md(None, args.wave))
        print("🧾 caste coverage: %s" % caste_split_report())
        health = channel_health_report()
        print("🧪 local registry configuration issues: %s" % (health if health else "none; this is not an external channel check"))
        return 0
    if args.kit:
        files = write_kits(args.key, args.wave)
        print("🧰 %d channel kits → %s" % (len(files), os.path.join(ROOT, "channel-kits")))
        return 0

    token = env_token(args.token)
    if not token:
        print("⚠️  BOT_TOKEN ledu.\n"
              "   1) Telegram → @BotFather → /mybots → మీ bot → API Token copy\n"
              "   2) load BOT_TOKEN securely from your secret manager or prompt; never commit it\n"
              "   3) Malli: python setup_channels.py %s"
              % ("--check" if args.check else "--apply --wave 1"))
        return 2
    bot = BotAPI(token, dry_run=args.dry_run)
    if args.check:
        summary = run_check(bot, args.wave, args.key)
        print("\n✅ ready: %s | ⬜ missing: %s" % (summary["ready"], summary["missing"]))
        return 0
    summary = run_apply(bot, args.wave, args.key, force_photo=args.force_photo,
                        create_invite=args.create_invite)
    print("\n📊 %s" % summary)
    return 0 if not summary["failed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
