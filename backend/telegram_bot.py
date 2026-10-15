"""
Mana Vivaha — Telegram helper bot (aiogram 3.x)
Website is the only registration/checkout flow; this bot provides read-only lookup and consent-gated contact access.

🚀 WAVE 11 — bots perfect:
  • import-safe (BOT_TOKEN lekapoina module import avutundi — tests + health OK)
  • /help /myid /search /cancel + photo handler + unknown-text fallback
  • pure helpers (parse_start_ref, help_text, format_id_search) — network lekunda test avvachu
"""
import asyncio
import os
import sys

_backend_dir = os.path.dirname(os.path.abspath(__file__))
_vendor_dir = os.path.join(_backend_dir, "vendor")
if os.path.isdir(_vendor_dir) and _vendor_dir not in sys.path:
    sys.path.insert(0, _vendor_dir)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from aiogram import Bot, Dispatcher, F
from aiogram.types import Message, CallbackQuery
from aiogram.filters import Command

# Canonical directory registry (routing eligibility is not external channel health).
from channels_config import (
    CHANNELS, channel_stats, route_profile, build_caption, build_hashtags,
    channel_chat_id, post_targets, live_channels,
)

BOT_TOKEN = (os.getenv("BOT_TOKEN") or "").strip()
ADMIN_CHAT_ID = os.getenv("ADMIN_CHAT_ID", "").strip()
SITE_URL = os.getenv("SITE_URL", "https://manavivaha.in")


def _api_headers() -> dict:
    """🌊 WAVE 22 — bot → API automation auth (TSAP_API_KEY same env, రెండు chotla)."""
    _k = os.getenv("TSAP_API_KEY", "").strip()
    return {"X-Api-Key": _k} if _k else {}

# ── import-safe bot (token lekapoina / wrong format ayina crash kadu) ─────────
bot = None
BOT_ERROR = ""
try:
    if BOT_TOKEN and ":" in BOT_TOKEN:
        bot = Bot(token=BOT_TOKEN)
    else:
        BOT_ERROR = "BOT_TOKEN not configured — /start తో test చెయ్యలేము (token పెట్టండి)"
except Exception as e:  # noqa: BLE001 — wrong format etc.
    BOT_ERROR = f"BOT_TOKEN invalid: {e}"
    bot = None


def get_bot() -> Bot | None:
    """Lazy bot (token .env లో pettaka polling start చెయ్యాలి)."""
    return bot


def bot_status() -> dict:
    """Health API కి — token/config ok నా (network call లేదు)."""
    return {
        "configured": bot is not None,
        "error": BOT_ERROR,
        "admin_configured": bool(ADMIN_CHAT_ID and str(ADMIN_CHAT_ID).isdigit()),
        "routing_eligible_channels": len(live_channels()),
        "external_channel_status_checked": False,
        "note_telugu": ("🤖 Bot ready — polling start చెయ్యొచ్చు" if bot
                        else "⚠️ BOT_TOKEN పెట్టండి (.env) — appudu polling start అవుతుంది"),
    }


# ── pure helpers (tests network lekunda run avvadaniki) ───────────────────────
def parse_start_ref(text: str) -> dict:
    """Parse known bot deep-link shapes without creating or mutating member records."""
    parts = str(text or "").strip().split()
    ref = parts[1] if len(parts) > 1 else ""
    out = {"raw": ref, "kind": "plain", "value": ""}
    if ref.startswith("unlock_"):
        out.update(kind="unlock", value=ref[7:].upper())
    elif ref.startswith("ch_"):
        out.update(kind="channel", value=ref[3:])
    elif ref.startswith("ref_"):
        out.update(kind="referral", value=ref[4:])
    elif ref.upper().startswith("TSAP-"):
        out.update(kind="profile", value=ref.upper())
    elif ref.startswith("story_"):
        out.update(kind="story", value=ref[6:])
    return out


def help_text() -> str:
    return (
        "🙏 మన వివాహ Bot — HELP\n\n"
        "• /start — website registration and service links\n"
        "• /search <member ID shown on the website> — view a public profile\n"
        "• /unlock <member ID> — only after an accepted interest and authenticated profile link\n"
        "• /mylist — accepted contacts (masked)\n"
        "• /balance — current request-credit balance\n"
        "• /pay — open the website for current checkout options\n"
        "• /link <member ID> <phone last 4 digits> — link Telegram to your existing profile\n"
        "• /myid — show your Telegram ID\n"
        "• /cancel — clear a pending link/unlock request\n\n"
        "This bot does not create profiles or collect photos/phone numbers in chat. Do not send payment references or money to a chat contact.\n"
        "Member details and channel destinations are not independently verified. Check current prices/terms and use the configured website checkout.\n\n"
        f"🌐 Website: {SITE_URL}\n"
        "Profile-owner acceptance is required for contact access in accepted-request account views; notification delivery is not guaranteed."
    )


def format_id_search(profile: dict) -> str:
    """ID search result card — WAVE 13: FIRST NAME visible, surname hidden, number ఎప్పుడు లేదు."""
    from smart12 import first_name_of  # lazy: cycle-safe
    p = profile or {}
    tid = p.get('tsap_id', '—')
    return (
        f"🔎 {tid} — {first_name_of(p.get('full_name',''))}\n"
        f"{p.get('gender','')} · {p.get('age','')} yrs · {p.get('caste','')}\n"
        f"🎓 {p.get('education','—')} · 💼 {p.get('job','—')}\n"
        f"📍 {p.get('district','—')}, {p.get('state') or 'Not provided'}\n"
        f"⭐ {p.get('star','—')} · గోత్రం: {p.get('gothram','—')}\n\n"
        f"💌 Interest పంపడానికి website {SITE_URL}/search/{tid} లో login చేయండి. Owner accept చేసిన తర్వాత contact details share అవుతాయి."
    )


# ── WAVE 12 pure formatters (network lekunda test avvachu) ───────────────────
def unlock_result_text(data: dict) -> str:
    """POST /api/unlock response → user message."""
    d = data or {}
    if d.get("success"):
        return (f"✅ అంగీకారం తర్వాత contact details అందుబాటులో ఉన్నాయి\n📞 `{d.get('phone','—')}`\n"
                f"📝 గౌరవంగా మాట్లాడండి — all the best! 💍")
    if d.get("reason") == "consent_required":
        return "🔒 " + str(d.get("message_telugu", "Interest పంపి profile owner acceptance కోసం వేచి ఉండండి."))
    if d.get("reason") == "no_credits":
        return ("⚠️ Credits ayipoyayi!\n" + str(d.get("message_telugu","")) + "\n\n/pay — interest-request plans చూడండి 🙏")
    return "⚠️ " + str(d.get("message_telugu") or d.get("detail") or "unlock avvaledu — ID సరి చూడండి")


def mylist_text(data: dict) -> str:
    """GET /api/unlocks response → masked list + hint."""
    d = data or {}
    items = d.get("profiles", []) or []
    if not items:
        return ("📋 Accepted contact list ఖాళీగా ఉంది.\n\nWebsite లో profile కి interest పంపండి; owner accept చేసిన తర్వాత contact details share అవుతాయి.\n"
                "Credits are for interest requests; payment cannot bypass consent.")
    lines = [f"📋 మీ unlocked profiles ({len(items)}):", ""]
    for i, p in enumerate(items, 1):
        lines.append(f"{i}. {p.get('name_masked','—')} — {p.get('phone_masked','')} "
                     f"({p.get('tsap_id','')} · {p.get('caste','')})")
    lines += ["", "Accepted interest ఉన్న profile కోసం /unlock <ID> ఉపయోగించండి (no credit charge)."]
    return "\n".join(lines)


def balance_text(credits: int, plan: str = "FREE") -> str:
    return (f"💰 మీ balance: *{credits}* interest-request credits\n📦 Plan: {plan}\n\n"
            f"1 credit = 1 interest request. Contact details are shared only after the profile owner accepts.\n"
            f"Credits అయిపోయినప్పుడు /pay లో configured plans చూడండి 🙏")


def pay_text() -> str:
    import os as _os
    upi = _os.getenv("PAY_UPI_ID", "").strip()
    call = _os.getenv("SUPPORT_CALL_NUMBER", "").strip()
    if not upi:
        lines = ["💳 Payment checkout is currently unavailable.",
                 "Please do not send money until the official payment destination is shown in the app."]
    else:
        lines = ["💳 Manual UPI payment:", "",
                 f"1️⃣ Pay only to the configured merchant UPI ID: `{upi}` (include your TSAP ID in the note).",
                 "2️⃣ Keep the transaction reference. Credits are added only after an administrator verifies payment."]
    if call:
        lines.append(f"\n📞 Support call: {call}")
    lines.append("\n💰 Plans and current prices are shown in the app.")
    return "\n".join(lines)


dp = Dispatcher()

# Minimal session cache for the pending-unlock handoff; profile data stays in the website backend.
user_sessions = {}


@dp.message(Command("start"))
async def cmd_start(message: Message):
    """Route users to the website; this bot does not create local/demo member records."""
    ref = parse_start_ref(message.text)
    if ref["kind"] == "unlock":
        target = ref["value"]
        session = user_sessions.get(message.from_user.id, {})
        if session.get("tsap_id"):
            await _do_unlock(message, session["tsap_id"], target)
        else:
            user_sessions[message.from_user.id] = {**session, "pending_unlock": target}
            await message.answer(
                f"🔒 {target} contact access కోసం ముందుగా మీ website profile ను /link ద్వారా link చేయండి. "
                "Interest request అంగీకరించిన తర్వాత మాత్రమే contact details అందుబాటులో ఉంటాయి."
            )
        return
    if ref["kind"] == "profile":
        await message.answer(f"🔎 Profile చూడండి: {SITE_URL}/search/{ref['value']}\nInterest పంపడానికి website లో sign in చేయండి.")
        return
    if ref["kind"] == "referral":
        await message.answer(f"👥 Referral details చూడండి: {SITE_URL}/r/{ref['value']}\nWebsite registration లో terms చదవండి.")
        return
    if ref["kind"] == "channel":
        await message.answer(f"📢 Channel directory: {SITE_URL}/channels\nExternal link availability ఈ bot తనిఖీ చేయదు.")
        return
    await message.answer(
        f"🙏 మన వివాహ — Mana Vivaha\n\nRegistration, profile updates, interests and checkout కోసం website ఉపయోగించండి: {SITE_URL}/register\n"
        "ఈ bot chat లో profiles సృష్టించదు; phone number, photo లేదా payment details పంపవద్దు.\n\n"
        "Profile owner accept చేసిన తర్వాత contact details accepted-request account views లో అందుబాటులోకి వస్తాయి; notification delivery హామీ లేదు.\n"
        "Member వివరాలు independently verify చేయబడవు; నిర్ణయానికి ముందు స్వయంగా నిర్ధారించండి."
    )


@dp.message(Command("help"))
async def cmd_help(message: Message):
    await message.answer(help_text())


@dp.message(Command("myid"))
async def cmd_myid(message: Message):
    await message.answer(f"🆔 మీ Telegram ID: `{message.from_user.id}`\nSupport కి ee ID పంపండి 🙏", parse_mode="Markdown")


@dp.message(Command("cancel"))
async def cmd_cancel(message: Message):
    user_sessions.pop(message.from_user.id, None)
    await message.answer("✅ Pending Telegram link/unlock details cleared. For profile changes, use the website.")


@dp.message(Command("search"))
async def cmd_search(message: Message):
    """Bot లో ne ID search — backend API కి call (token ఉంటే)."""
    parts = str(message.text or "").strip().split()
    if len(parts) < 2:
        await message.answer("🔎 Usage: /search <member ID shown on the website>")
        return
    tsap_id = parts[1].upper()
    # backend API nunchi profile (site internal call)
    import aiohttp
    api_base = os.getenv("API_BASE", "http://localhost:8000")
    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=8)) as sess:
            async with sess.get(f"{api_base}/api/search/{tsap_id}", headers=_api_headers()) as resp:
                if resp.status != 200:
                    await message.answer(f"⚠️ {tsap_id} దొరకలేదు — ID సరి చూడండి")
                    return
                data = await resp.json()
        prof = data.get("profile", data)
        await message.answer(format_id_search(prof if isinstance(prof, dict) else {"tsap_id": tsap_id}))
    except Exception as e:  # noqa: BLE001
        await message.answer(f"⚠️ Search ఇప్పుడు work avvatledu — website లో చూడండి: {SITE_URL}/matches\n({str(e)[:60]})")


async def _do_unlock(message: Message, viewer: str, target: str):
    """Consent-gated contact lookup shared by /unlock and website deep-links."""
    import aiohttp
    api_base = os.getenv("API_BASE", "http://localhost:8000")
    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as s:
            async with s.post(f"{api_base}/api/unlock",
                              json={"viewer_id": viewer, "target_id": target},
                              headers=_api_headers()) as resp:
                data = await resp.json()
        await message.answer(unlock_result_text(data if isinstance(data, dict) else {}), parse_mode="Markdown")
    except Exception as e:  # noqa: BLE001
        await message.answer(f"⚠️ Unlock ఇప్పుడు work avvatledu — website లో try చెయ్యండి: {SITE_URL}/matches\n({str(e)[:60]})")


@dp.message(Command("unlock"))
async def cmd_unlock(message: Message):
    """Show a contact only when the linked member has an accepted interest."""
    parts = str(message.text or "").strip().split()
    if len(parts) < 2:
        await message.answer("🔓 Usage: /unlock <member ID>\nContact details కోసం accepted interest అవసరం.")
        return
    target = parts[1].upper()
    sess = user_sessions.get(message.from_user.id, {})
    viewer = sess.get("tsap_id", "")
    if not viewer:
        user_sessions[message.from_user.id] = {**sess, "pending_unlock": target}
        await message.answer("🙏 ముందు మీ existing website profile ను /link ద్వారా link చేయండి. Contact access కోసం profile-owner acceptance అవసరం.",
                             parse_mode="Markdown")
        return
    await _do_unlock(message, viewer, target)


@dp.message(Command("mylist"))
async def cmd_mylist(message: Message):
    sess = user_sessions.get(message.from_user.id, {})
    viewer = sess.get("tsap_id", "")
    if not viewer:
        await message.answer("🙏 ముందు /link MEE-TSAP-ID చెయ్యండి — appudu మీ unlocked list చూపిస్తాం")
        return
    import aiohttp
    api_base = os.getenv("API_BASE", "http://localhost:8000")
    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as s:
            async with s.get(f"{api_base}/api/unlocks/{viewer}", headers=_api_headers()) as resp:
                data = await resp.json()
        await message.answer(mylist_text(data if isinstance(data, dict) else {}))
    except Exception as e:  # noqa: BLE001
        await message.answer(f"⚠️ List load avvaledu ({str(e)[:60]}) — /help చూడండి")


@dp.message(Command("balance"))
async def cmd_balance(message: Message):
    sess = user_sessions.get(message.from_user.id, {})
    viewer = sess.get("tsap_id", "")
    if not viewer:
        await message.answer("🙏 ముందు /link MEE-TSAP-ID చెయ్యండి")
        return
    import aiohttp
    api_base = os.getenv("API_BASE", "http://localhost:8000")
    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as s:
            async with s.get(f"{api_base}/api/credits/{viewer}", headers=_api_headers()) as resp:
                data = await resp.json() if resp.status == 200 else {}
        await message.answer(balance_text(int(data.get("credits", 0)), str(data.get("plan", "FREE"))),
                             parse_mode="Markdown")
    except Exception as e:  # noqa: BLE001
        await message.answer(f"⚠️ Balance load avvaledu ({str(e)[:60]})")


@dp.message(Command("pay"))
async def cmd_pay(message: Message):
    await message.answer(pay_text(), parse_mode="Markdown")


@dp.message(Command("link"))
async def cmd_link(message: Message):
    """Link Telegram to an existing website profile after checking registered-phone digits."""
    parts = str(message.text or "").strip().split()
    if len(parts) < 2:
        await message.answer("🔗 Usage: /link <member ID> <last 4 digits of the registered phone>. Contact access still requires an accepted interest.")
        return
    tsap_id = parts[1].upper()
    last4 = "".join(ch for ch in (parts[2] if len(parts) > 2 else "") if ch.isdigit())[-4:]
    if len(last4) != 4:
        await message.answer("🔐 Security కోసం registered phone యొక్క చివరి 4 digits కూడా ఇవ్వండి: /link %s <last4>" % tsap_id)
        return
    import aiohttp
    api_base = os.getenv("API_BASE", "http://localhost:8000")
    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as s:
            async with s.post(f"{api_base}/api/link-telegram",
                              json={"tsap_id": tsap_id,
                                    "chat_id": str(message.from_user.id),
                                    "phone_last4": last4},
                              headers=_api_headers()) as resp:
                data = await resp.json()
        if resp.status == 200 and isinstance(data, dict) and data.get("success") is not False:
            _sess = {**user_sessions.get(message.from_user.id, {}), "tsap_id": tsap_id}
            _pend = _sess.pop("pending_unlock", "")
            user_sessions[message.from_user.id] = _sess
            await message.answer(f"✅ Link అయ్యింది! {tsap_id} ↔ Telegram\n\nIppudu:\n• /unlock <ID> — accepted interest ఉంటే contact details\n• /mylist — accepted contacts (masked)\n• /balance — interest-request credits",
                                 parse_mode="Markdown")
            if _pend:
                await message.answer(f"⏳ {_pend} contact access చెక్ చేస్తున్నాం — accepted interest ఉండాలి…")
                await _do_unlock(message, tsap_id, _pend)
        else:
            await message.answer(f"⚠️ {(data or {}).get('message_telugu') or 'ID దొరకలేదు — సరి చూడండి'}")
    except Exception as e:  # noqa: BLE001
        await message.answer(f"⚠️ Link avvaledu ({str(e)[:60]}) — website లో try చెయ్యండి")


@dp.message(F.text.in_(["👰 Bride", "🤵 Groom"]))
async def gender_chosen(message: Message):
    await message.answer(f"For profile search and registration, use {SITE_URL}/register. This bot does not collect profile details.")


@dp.message(F.text.contains("తెలంగాణ") | F.text.contains("ఆంధ్ర"))
async def state_chosen(message: Message):
    await message.answer(f"Select your location on the website: {SITE_URL}/register. This bot does not create member records.")


@dp.message(F.photo)
async def photo_received(message: Message):
    await message.answer(f"For your safety, this bot does not collect or store profile photos. Use the secure website flow: {SITE_URL}/register")


@dp.message(F.contact)
async def contact_received(message: Message):
    await message.answer(f"For your safety, this bot does not collect phone contacts in chat. Use the website's registration flow: {SITE_URL}/register")


@dp.message(F.text)
async def website_only_fallback(message: Message):
    if str(message.text or "").startswith("/"):
        await message.answer("⚠️ Unknown command — /help చూడండి.")
    else:
        await message.answer(f"Registration and profile updates are handled on the website: {SITE_URL}/register. Please do not send personal details in this chat.")


async def post_to_channels(profile: dict, tsap_id: str, score: int | None = None, photo_path: str | None = None):
    """Retired local workflow: return a preview only and never send channel messages."""
    targets = post_targets(profile or {})
    caption = build_caption(profile or {}, tsap_id)
    return {
        "posted": [],
        "failed": [],
        "not_routing_eligible": targets["not_routing_eligible"],
        "routing_candidates": targets["routing_candidates"],
        "hashtags": targets["hashtags"],
        "notes": targets["notes"],
        "dry_run": True,
        "external_status_checked": False,
        "reason": "Legacy bot registration/publishing is disabled; no message was sent.",
        "caption_preview": caption[:300],
    }


@dp.callback_query(F.data.startswith("approve_"))
async def approve_callback(callback: CallbackQuery):
    await callback.answer("Legacy bot approval is retired; use the authenticated website dashboard.", show_alert=True)
    if callback.message:
        await callback.message.edit_text("No profile was approved or posted. Review profiles through the authenticated website dashboard.")


@dp.callback_query(F.data.startswith("reject_"))
async def reject_callback(callback: CallbackQuery):
    await callback.answer("Legacy bot rejection is retired; use the authenticated website dashboard.", show_alert=True)
    if callback.message:
        await callback.message.edit_text("No profile was changed. Review records through the authenticated website dashboard.")


@dp.callback_query(F.data.startswith("premium_"))
async def premium_callback(callback: CallbackQuery):
    await callback.answer("Legacy credit gifting is retired; use the authenticated website dashboard.", show_alert=True)
    if callback.message:
        await callback.message.edit_text("No credits were added. Use the authenticated website dashboard for member support.")


# Optional scheduler hook kept for callers, but no daily sender is configured here.
async def daily_sender_once(api_base: str = "") -> dict:
    return {"ok": True, "mode": "disabled", "sent": 0,
            "note": "No daily digest scheduler is configured; no messages were sent."}


async def main():
    st = channel_stats()
    print(f"[BOT START] {st['total']} configured listings | routing-eligible flags: {st['routing_eligible']} (external status unchecked)")
    print("[BOT START] configured routing usernames: " + ", ".join("@" + c["username"] for c in live_channels()))
    _b = get_bot()
    if _b is None:
        print(f"[BOT STOP] {BOT_ERROR}")
        return
    await dp.start_polling(_b)


if __name__ == "__main__":
    asyncio.run(main())
