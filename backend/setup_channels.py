"""
MANA VIVAHA — TELEGRAM CHANNEL SETUP AUTOMATION 📢
==================================================
"Anni channels perfect ga" — ee okka script tho:

  --plan              : e channels create cheyyali (wave order) + copy-paste checklist .md
  --kit  [--wave N]   : prathi channel ki ready kit (name/username/desc/pinned/rules/share) → channel-kits/
  --photos            : channel DP images (512x512, English text) → backend/channel_assets/
  --check             : BOT_TOKEN tho: channel unda? bot admin na? username ok na? member count?
  --apply [--wave N]  : title + description + DP + invite link + pinned welcome **auto set** (Bot API)
  --mark-live         : verified channels ni registry lo live=True cheyyi (auto patch)
  --self-test         : fake bot tho full flow (no token) — CI/test ki
  --report            : last apply/check result (.json + .md)

Token: --token xxx  leda  env BOT_TOKEN  leda  backend/.env lo BOT_TOKEN=...
NOTE: Telegram lo channel **create** cheyyadam Bot API lo ledu (bot create cheyyaleedu).
      Channel ni meeru phone lo 30 sec lo create cheyyandi (name+username paste) → bot ni admin cheyyandi →
      taruvata `--apply` ee script title/desc/DP/pinned anni automatic ga perfect ga set chestundi.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from channels_config import (  # noqa: E402
    CHANNELS, SITE, BOT_USERNAME, setup_plan, caste_split_report, channel_health_report,
)
import channel_content as CC  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ASSET_DIR = os.path.join(HERE, "channel_assets")
STATE_FILE = os.environ.get("MANA_VIVAHA_CHANNEL_SETUP_STATE_FILE", os.path.join(HERE, "channel_setup_state.json"))
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
def plan_rows(wave: int | None = None) -> list:
    rows = []
    for r in setup_plan(wave):
        rows.append({**r, "pinned": CC.pinned_welcome(r["key"], CHANNELS.get(r["key"], {})),
                     "share": CC.share_text(r["key"], CHANNELS.get(r["key"], {})),
                     "dp_text": CC.dp_text(r["key"])})
    return rows


def print_plan(wave: int | None = None) -> None:
    rows = plan_rows(wave)
    print("\n📢 MANA VIVAHA — CHANNEL SETUP PLAN (%d channels%s)"
          % (len(rows), "" if wave is None else ", wave %s" % wave))
    print("=" * 78)
    cur_wave = None
    for i, r in enumerate(rows, 1):
        if r["wave"] != cur_wave:
            cur_wave = r["wave"]
            print("\n──────── WAVE %s ────────" % cur_wave)
        mark = "✅ LIVE" if r["live"] else "⬜ create"
        print("\n%2d. %s   [%s]" % (i, r["name"], mark))
        print("    Username : @%s" % r["username"])
        print("    Taken?   : %s" % (", ".join("@" + f for f in r["fallbacks"]) or "-"))
        print("    Link     : https://t.me/%s" % r["username"])
        print("    Desc     : %s" % r["desc"])
    print("\nTotal: %d channels (%d live already)" % (len(rows), len([r for r in rows if r["live"]])))


def write_plan_md(path: str | None = None, wave: int | None = None) -> str:
    rows = plan_rows(wave)
    path = path or os.path.join(ROOT, "CHANNELS-SETUP-CHECKLIST.md")
    lines = ["# 📢 మన వివాహ — Channel Setup Checklist (%d channels)" % len(rows), "",
             "> ఈ file `setup_channels.py --plan` తో auto-generate అయ్యింది. Prathi channel కి:",
             "> **Name → Username → Description → 📌 pinned post** (copy-paste ready).", "",
             "## ⚡ Fastest way (automation)", "",
             "```bash",
             "# 1) Phone లో channels create చెయ్యండి (name+username paste) → bot ని admin చెయ్యండి",
             "# 2) Taruvata ఒక్క command — title/desc/DP/pinned/invite link అన్నీ auto set:",
             "cd backend",
             "BOT_TOKEN=xxxx python setup_channels.py --apply --wave 1",
             "```", ""]
    cur = None
    for r in rows:
        if r["wave"] != cur:
            cur = r["wave"]
            lines += ["", "## 🌊 WAVE %s" % cur, ""]
        lines += ["### %s `%s`" % ("✅" if r["live"] else "⬜", r["key"]),
                  "", "| Item | Value |", "|---|---|",
                  "| Name | `%s` |" % r["name"],
                  "| Username | `@%s` (taken ayithe: %s) |" % (r["username"], ", ".join("@" + f for f in r["fallbacks"])),
                  "| Link | https://t.me/%s |" % r["username"],
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
        dp = channel_dp_image(r["key"])
        body = [
            "# %s" % r["name"], "",
            "- **Key:** `%s`  •  **Tier:** %s  •  **Wave:** %s  •  **Status:** %s"
            % (r["key"], r["tier"], r["wave"], "LIVE ✅" if r["live"] else "create ⬜"),
            "- **Username:** `@%s` (already taken? → %s)"
            % (r["username"], ", ".join("@" + f for f in r["fallbacks"]) or "-"),
            "- **Link:** https://t.me/%s" % r["username"],
            "- **Hashtags:** %s" % " ".join(r["hashtags"]),
            "- **DP image:** `%s`" % (dp or "-"), "",
            "## 1) Channel create (phone → New Channel)", "",
            "Name: `%s`" % r["name"], "",
            "Username: `%s`" % r["username"], "",
            "Description:", "", "```", r["desc"], "```", "",
            "## 2) Bot ni admin cheyyi", "",
            "Channel → Manage → Administrators → Add Admin → `%s` → ✅ Post Messages, ✅ Edit Messages, ✅ Delete Messages, ✅ Manage Video Chats, ✅ Change Channel Info" % BOT_USERNAME,
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
        f"**మొత్తం {len(rows)} channels** — కానీ ఒకేసారి అన్నీ వద్దు. **దశ (wave) ప్రకారం** చేయండి.",
        "ప్రతి channel కి: **Name copy → Username copy → Description paste → @telugumatrimony1_bot ని admin**",
        "",
        "## ⚡ ఒక్కో channel ki 4 నిమిషాలు (phone lo)",
        "1. Telegram → ☰ → **New Channel** → Name (క్రింద టేబుల్ నుంచి copy) → **Public** → Username (copy)",
        "2. Description paste (kit file లో ఉంది — `channel-kits/<key>.md`) → Create",
        "3. Channel → **Administrators** → Add Admin → `@telugumatrimony1_bot` → Change Info + Post + Edit + Pin ✅",
        "4. `python setup_channels.py --apply --key <key>` → title/desc/DP/📌 pinned అన్నీ ఆటో సెట్",
        "",
        "**Username already taken అయితే?** → పక్కన fallback username వాడండి (అదే పని చేస్తుంది).",
        "",
    ]
    for w in sorted(by_wave):
        lines += [f"## 🌊 Wave {w} — {telugu_wave.get(w, '')} ({len(by_wave[w])} channels)", "",
                  "| # | Name (copy) | Username (copy) | Fallback | Status |",
                  "|---|---|---|---|---|"]
        for i, r in enumerate(by_wave[w], 1):
            lines.append("| %d | `%s` | `@%s` | %s | %s |"
                         % (i, str(r["name"]).replace("|", "\\|"), r["username"],
                            ", ".join("@" + f for f in r["fallbacks"][:2]) or "-",
                            "✅ LIVE" if r["live"] else "⬜ create"))
        lines.append("")
        if w == 1:
            lines += ["### ✅ Wave-1 అయ్యాక ee command run చెయ్యండి", "",
                      "```bash", "export BOT_TOKEN=xxxx",
                      "python setup_channels.py --apply --wave 1 --mark-live",
                      "python setup_channels.py --check          # అన్నీ perfect ఉన్నాయా చూడండి", "```", ""]
    lines += ["## 🎯 ముఖ్యమైన సూచనలు", "",
              "- **Wave-1 = 17 channels** (Official + 4 main + 6 castes × bride/groom) — ఇవి ముందు చేయండి",
              "- ఒకేసారి 20+ channels create చేయకండి (Telegram 'Too Many Attempts' ఇస్తుంది) → 10 చేసి 1 గంట ఆగండి",
              "- **@TSBRIDE / @TSGROOM1** ఇప్పటికే ఉన్నాయి — వాటికి bot admin ఉందో ఒకసారి check చేయండి",
              "- AP channels: `@APBRIDE`, `@APGROOM1` (India motham లో ఎవరూ తీసుకోకుండా ముందే పెట్టేయండి)",
              "- Caste channels: top 6 castes → Reddy, Kamma, Kapu, Velama, Vysya, Brahmin (bride + groom separate)",
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


def resolve_chat(bot: "BotAPI", key: str) -> dict:
    """@username (fallback తో) → chat object + which username worked."""
    ch = CHANNELS.get(key, {})
    tried = []
    for uname in [ch.get("username")] + list(ch.get("fallbacks", [])):
        if not uname:
            continue
        tried.append("@" + uname)
        chat = bot.get_chat("@" + uname)
        if chat:
            return {"found": True, "username": uname, "chat": chat, "tried": tried}
    return {"found": False, "tried": tried}


def check_bot_admin(bot: "BotAPI", chat_id, bot_id: int) -> dict:
    m = bot.get_chat_member(chat_id, bot_id) or {}
    status = m.get("status", "?")
    rights = m.get("can_change_info"), m.get("can_post_messages"), m.get("can_pin_messages")
    return {"status": status, "is_admin": status in ("administrator", "creator"),
            "can_change_info": bool(rights[0]), "can_post": bool(rights[1] if rights[1] is not None else True),
            "can_pin": bool(rights[2] if rights[2] is not None else True),
            "admin_ok": status in ("administrator", "creator") and bool(rights[0] if rights[0] is not None else True)}


def configure_channel(bot: "BotAPI", key: str, state: dict, force_photo: bool = False,
                      pin_welcome: bool = True) -> dict:
    """ఒక్క channel ని PERFECT గా set cheyyi: title → desc → DP → invite link → pinned welcome."""
    ch = CHANNELS.get(key)
    if not ch:
        return {"key": key, "ok": False, "error": "registry lo ledu"}
    title = CC.perfect_title(key, ch)
    desc = CC.perfect_description(key, ch)
    steps, errors = [], []

    resolved = resolve_chat(bot, key)
    if not resolved["found"]:
        return {"key": key, "ok": False, "error": "channel dorakaledu — create cheyyandi",
                "tried": resolved["tried"], "name": title, "username": ch["username"]}

    chat = resolved["chat"]
    chat_id = chat.get("id")
    me = bot.get_me()
    bot_id = me.get("id", 0)
    admin = check_bot_admin(bot, chat_id, bot_id)
    steps.append({"step": "get_chat", "ok": True, "username": resolved["username"],
                  "title": chat.get("title"), "members": chat.get("member_count", bot.get_chat_member_count(chat_id))})
    if not admin["is_admin"]:
        return {"key": key, "ok": False, "error": "bot admin కాదు — channel → Administrators → %s add cheyyandi" % BOT_USERNAME,
                "chat_title": chat.get("title"), "username": resolved["username"], "steps": steps}

    if chat.get("title") != title and admin["can_change_info"]:
        r = bot.set_chat_title(chat_id, title)
        steps.append({"step": "set_title", "ok": bool(r.get("ok")), "title": title})
        if not r.get("ok"):
            errors.append("set_title: %s" % r.get("description"))

    if (chat.get("description") or "").strip() != desc.strip():
        r = bot.set_chat_description(chat_id, desc)
        steps.append({"step": "set_description", "ok": bool(r.get("ok")), "chars": len(desc)})
        if not r.get("ok"):
            errors.append("set_description: %s" % r.get("description"))

    st = state["channels"].get(key, {})
    dp = os.path.join(ASSET_DIR, "%s.png" % key)
    if not os.path.exists(dp):
        dp = channel_dp_image(key, ch)
    if dp and (force_photo or not chat.get("photo") or st.get("photo_uploaded") is not True):
        r = bot.set_chat_photo(chat_id, dp)
        steps.append({"step": "set_photo", "ok": bool(r.get("ok")), "file": os.path.basename(dp or "")})
        if r.get("ok"):
            st["photo_uploaded"] = True
        else:
            errors.append("set_photo: %s" % r.get("description"))

    invite = st.get("invite_link")
    if not invite:
        inv = bot.create_invite_link(chat_id, "మన వివాహ")
        invite = inv.get("invite_link") or bot.export_invite_link(chat_id)
        steps.append({"step": "invite_link", "ok": bool(invite), "link": invite})
    else:
        steps.append({"step": "invite_link", "ok": True, "link": invite, "cached": True})

    if pin_welcome and not st.get("welcome_message_id"):
        msg = bot.send_message(chat_id, CC.pinned_welcome(key, ch))
        mid = msg.get("message_id")
        if mid:
            r = bot.pin_message(chat_id, mid, notify=False)
            steps.append({"step": "pinned_welcome", "ok": bool(r.get("ok")), "message_id": mid})
            st["welcome_message_id"] = mid
        else:
            errors.append("pinned_welcome: message పంపలేదు (%s)" % (msg or {}).get("description", "?"))
    else:
        steps.append({"step": "pinned_welcome", "ok": True, "message_id": st.get("welcome_message_id"), "cached": True})

    st.update({"username": resolved["username"], "title": title, "members": steps[0].get("members"),
               "configured_at": time.strftime("%Y-%m-%d %H:%M:%S"), "invite_link": invite})
    state["channels"][key] = st
    return {"key": key, "ok": not errors, "errors": errors, "username": resolved["username"],
            "chat_id": chat_id, "admin": admin, "steps": steps, "invite_link": invite,
            "members": st.get("members")}


def run_apply(bot: "BotAPI", wave: int | None = None, keys: list | None = None,
              force_photo: bool = False, mark_live: bool = False) -> dict:
    state = load_state()
    results = []
    for row in setup_plan(wave):
        if keys and row["key"] not in keys:
            continue
        res = configure_channel(bot, row["key"], state, force_photo=force_photo)
        results.append(res)
        icon = "✅" if res.get("ok") else "⚠️"
        print("%s %-20s %s" % (icon, row["key"], res.get("username") or res.get("error", "")))
    save_state(state)
    live = [r["key"] for r in results if r.get("ok") and r.get("username")]
    if mark_live and live:
        write_live_keys(live)
    summary = {"checked": len(results), "configured": len([r for r in results if r.get("ok")]),
               "failed": [r["key"] for r in results if not r.get("ok")],
               "live": len(live), "at": time.strftime("%Y-%m-%d %H:%M:%S")}
    json.dump({"summary": summary, "results": results},
              open(os.path.join(HERE, "channel_setup_report.json"), "w"), indent=2, ensure_ascii=False)
    return summary


def run_check(bot: "BotAPI", wave: int | None = None, keys: list | None = None) -> dict:
    me = bot.get_me()
    bot_id = me.get("id", 0)
    rows = []
    for row in setup_plan(wave):
        if keys and row["key"] not in keys:
            continue
        res = resolve_chat(bot, row["key"])
        if not res["found"]:
            rows.append({"key": row["key"], "exists": False, "username": row["username"], "tried": res["tried"]})
            print("⬜ %-20s @%s — create cheyyali" % (row["key"], row["username"]))
            continue
        chat = res["chat"]
        admin = check_bot_admin(bot, chat["id"], bot_id)
        members = chat.get("member_count", bot.get_chat_member_count(chat["id"]))
        rows.append({"key": row["key"], "exists": True, "username": res["username"],
                     "title": chat.get("title"), "desc_ok": (chat.get("description") or "").strip() == row["desc"].strip(),
                     "photo": bool(chat.get("photo")), "admin": admin, "members": members})
        print("%s %-20s @%-26s members=%-5s desc=%s admin=%s"
              % ("✅" if admin["admin_ok"] else "⚠️", row["key"], res["username"], members,
                 "ok" if rows[-1]["desc_ok"] else "MISSING", "ok" if admin["admin_ok"] else "NOT ADMIN"))
    summary = {"bot": me.get("username"), "checked": len(rows),
               "exists": len([r for r in rows if r["exists"]]),
               "ready": len([r for r in rows if r.get("exists") and r.get("admin", {}).get("admin_ok")]),
               "missing": [r["key"] for r in rows if not r["exists"]], "rows": rows}
    json.dump(summary, open(os.path.join(HERE, "channel_check_report.json"), "w"), indent=2, ensure_ascii=False)
    return summary


# ===========================================================================
# REGISTRY — live keys auto-manage
# ===========================================================================
def write_live_keys(keys: list) -> str:
    """channels_config.py లో LIVE_KEYS_EXTRA block ని update cheyyi (verified channels)."""
    src = open(REGISTRY).read()
    m = re.search(r"# >>> LIVE_KEYS_EXTRA.*?\n(.*?)# <<< LIVE_KEYS_EXTRA", src, re.S)
    current = set()
    if m:
        current = set(re.findall(r'"([^"]+)"', m.group(1)))
    current.update(keys)
    block = ("# >>> LIVE_KEYS_EXTRA (setup_channels.py --mark-live idi auto-manage చేస్తుంది)\n"
             "LIVE_KEYS_EXTRA = [\n" + "".join('    "%s",\n' % k for k in sorted(current)) + "]\n"
             "# <<< LIVE_KEYS_EXTRA")
    if m:
        src = src[:m.start()] + block + src[m.end():]
    else:
        anchor = "CHANNELS = {"
        src = src.replace(anchor, block + "\n\n" + anchor, 1)
    open(REGISTRY, "w").write(src)
    return block


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
        return {"id": 42, "username": "telugumatrimony1_bot", "first_name": "TSAP"}

    def get_chat(self, chat_id):
        self._rec("getChat", {"chat_id": chat_id})
        return {"id": 1000 + len({c["params"].get("chat_id") for c in self.calls}), "title": "Old Title",
                "description": self.description, "photo": self.photo,
                "username": str(chat_id).lstrip("@"), "type": "channel"}

    def get_chat_member(self, chat_id, user_id):
        self._rec("getChatMember", {"chat_id": chat_id, "user_id": user_id})
        return {"status": "administrator" if self.admin else "member",
                "can_change_info": self.admin, "can_post_messages": True, "can_pin_messages": True}

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
    print("\n🧪 SELF TEST (FakeBot — Telegram tho matladadu)\n" + "=" * 60)
    problems = []

    # 1) plan
    rows = plan_rows(wave)
    print("1) plan rows:", len(rows))
    if not rows:
        problems.append("plan khali")

    # 2) DP image
    dp = channel_dp_image("ts_bride")
    ok_dp = bool(dp and os.path.exists(dp))
    print("2) DP image:", dp, ok_dp)
    if not ok_dp:
        problems.append("DP generate avvaledu")

    # 3) full apply on 3 channels (fake)
    state_path_bak = None
    if os.path.exists(STATE_FILE):
        state_path_bak = STATE_FILE + ".bak"
        os.replace(STATE_FILE, state_path_bak)
    try:
        fake = FakeBot()
        res = run_apply(fake, keys=["ts_bride", "c_reddy_bride", "ap_bride"])
        methods = [c["method"] for c in fake.calls]
        print("3) fake apply summary:", res)
        for need in ("getChat", "setChatTitle", "setChatDescription", "setChatPhoto",
                     "createChatInviteLink", "sendMessage", "pinChatMessage"):
            if need not in methods:
                problems.append("apply లో %s call ravaledu" % need)
        if res["configured"] != 3:
            problems.append("3 channels configure avvaledu: %s" % res)
        # welcome text to check
        send = [c for c in fake.calls if c["method"] == "sendMessage"]
        if send and "chatting లేదు" not in send[0]["params"]["text"]:
            problems.append("welcome post లో rules లేదు")
        # 4) admin kaani bot → clear error
        fake2 = FakeBot(admin=False)
        r2 = configure_channel(fake2, "ts_bride", load_state())
        if "admin" not in str(r2.get("error", "")).lower():
            problems.append("admin లేదు error ravaledu: %s" % r2.get("error"))
        print("4) non-admin error:", r2.get("error"))
    finally:
        if state_path_bak:
            os.replace(state_path_bak, STATE_FILE)

    print("\n%s" % ("❌ PROBLEMS: %s" % problems if problems else "✅ SELF TEST PASS — anni calls perfect"))
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
    ap.add_argument("--check", action="store_true", help="Telegram లో status check")
    ap.add_argument("--apply", action="store_true", help="title/desc/DP/pinned auto set")
    ap.add_argument("--mark-live", action="store_true", help="registry లో live=True patch")
    ap.add_argument("--self-test", action="store_true", help="fake bot తో flow test")
    ap.add_argument("--wave", type=int, help="only wave N")
    ap.add_argument("--key", action="append", help="only ee key (repeat ok)")
    ap.add_argument("--token", help="BOT_TOKEN (lekapote env/.env)")
    ap.add_argument("--force-photo", action="store_true", help="DP already ఉన్న మళ్లీ upload")
    ap.add_argument("--dry-run", action="store_true", help="API calls cheyyaku (body chupinchu)")
    args = ap.parse_args()

    if args.self_test:
        return 0 if self_test(args.wave)["ok"] else 1
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
        print("🩺 config problems: %s" % (health if health else "ledu — anni perfect ✅"))
        return 0
    if args.kit:
        files = write_kits(args.key, args.wave)
        print("🧰 %d channel kits → %s" % (len(files), os.path.join(ROOT, "channel-kits")))
        return 0

    token = env_token(args.token)
    if not token:
        print("⚠️  BOT_TOKEN ledu.\n"
              "   1) Telegram → @BotFather → /mybots → మీ bot → API Token copy\n"
              "   2) export BOT_TOKEN=123456:ABC...  (leda backend/.env లో BOT_TOKEN=...)\n"
              "   3) Malli: python setup_channels.py %s"
              % ("--check" if args.check else "--apply --wave 1"))
        return 2
    bot = BotAPI(token, dry_run=args.dry_run)
    if args.check:
        summary = run_check(bot, args.wave, args.key)
        print("\n✅ ready: %s | ⬜ missing: %s" % (summary["ready"], summary["missing"]))
        return 0
    summary = run_apply(bot, args.wave, args.key, force_photo=args.force_photo, mark_live=args.mark_live)
    print("\n📊 %s" % summary)
    return 0 if not summary["failed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
