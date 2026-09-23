"""
🚀 WAVE 11 — ULTRA ADVANCED engines (Top matrimony sites kanna ekkuva)
=====================================================================
 1. 🛡️ gothram guard      → same-gothram auto-block (interest + matches + score)
 2. 💑 success stories     → submit → admin approve → public list + channel share text
 3. 💬 support FAQ         → Telugu Q&A search (widget + bot rendu vadathayi)
 4. 🔥 daily streak        → rojoo login ki bonus credits (retention engine)
 5. 🔔 web push            → PWA push subscriptions + notify queue (VAPID ready)
 6. 🎙️ voice intro         → 30-sec voice upload validate + profile link
 7. 🎮 complete bonus      → profile 90%+ ayithe 2 credits FREE (once — gamification)
 8. ⚡ boost packs         → ₹49/₹99/₹199 tho top-rank boost (revenue)

State: JSON files (postgres vachhaka DB ki move — pattern quality.py lage).
"""
from __future__ import annotations

import json
import os
import re
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

from hardening import clean, req_text, validation_error

STATE_DIR = os.path.dirname(os.path.abspath(__file__))
STORIES_FILE = os.path.join(STATE_DIR, "stories_state.json")
PUSH_FILE = os.path.join(STATE_DIR, "push_state.json")

STORIES: List[Dict[str, Any]] = []
PUSH_SUBS: List[Dict[str, Any]] = []
PUSH_QUEUE: List[Dict[str, Any]] = []


def _load(path: str, target: List[Dict[str, Any]]) -> None:
    try:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as fh:
                data = json.load(fh)
            if isinstance(data, list):
                target[:] = data
    except Exception:
        pass


def _save(path: str, data: Any) -> None:
    try:
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False)
    except Exception:
        pass


load_stories = lambda: _load(STORIES_FILE, STORIES)            # noqa: E731
save_stories = lambda: _save(STORIES_FILE, STORIES[-2000:])    # noqa: E731


def _push_state() -> Dict[str, List[Dict[str, Any]]]:
    return {"subs": PUSH_SUBS[-5000:], "queue": PUSH_QUEUE[-2000:]}


def load_push() -> None:
    try:
        if os.path.exists(PUSH_FILE):
            with open(PUSH_FILE, "r", encoding="utf-8") as fh:
                data = json.load(fh)
            if isinstance(data, dict):
                PUSH_SUBS[:] = data.get("subs", []) or []
                PUSH_QUEUE[:] = data.get("queue", []) or []
    except Exception:
        pass


def save_push() -> None:
    _save(PUSH_FILE, _push_state())


# ---------------------------------------------------------------------------
# 1. 🛡️ GOTHRAM GUARD — same gothram = pelli kudadhu (Telugu custom MUST)
# ---------------------------------------------------------------------------
def norm_gothram(value: Any) -> str:
    """' bharadwaj ' / 'Bharadwaja' → 'bharadwaj' (compare-safe)."""
    s = re.sub(r"[^a-z]", "", str(value or "").strip().lower())
    # common spelling variants → okate root ("Bharadwaja Gothram" == "bharadwaj")
    for suffix in ("gothram", "gotram", "gothra", "gotra"):
        if s.endswith(suffix) and len(s) > len(suffix) + 2:
            s = s[: -len(suffix)]
    if len(s) > 6 and s.endswith("a"):   # bharadwaja → bharadwaj
        s = s[:-1]
    return s


def gothram_check(a: Dict[str, Any], b: Dict[str, Any]) -> Dict[str, Any]:
    """
    Rendu profiles madhya gothram check.
    • iddari gothram telisi, okate ayithe → blocked=True (interest/match aagali)
    • okariki teliyakunte → warning matrame (block kadu — data ledu kabatti)
    """
    ga_raw = str((a or {}).get("gothram", "") or "").strip()
    gb_raw = str((b or {}).get("gothram", "") or "").strip()
    ga, gb = norm_gothram(ga_raw), norm_gothram(gb_raw)
    if ga and gb and ga == gb:
        return {
            "same": True, "blocked": True,
            "a_gothram": ga_raw, "b_gothram": gb_raw,
            "reason": "same_gothram",
            "verdict_telugu": (
                f"🚫 Same గోత్రం ({ga_raw}) — పెళ్లి కూడదు (మన సంప్రదాయం). "
                "Vere profiles చూడండి — exception కావాలి అంటే support కి చెప్పండి."),
        }
    if (ga and not gb) or (gb and not ga):
        return {
            "same": False, "blocked": False, "unknown_side": True,
            "a_gothram": ga_raw, "b_gothram": gb_raw,
            "reason": "gothram_unknown",
            "verdict_telugu": "⚠️ ఒకరికి గోత్రం లేదు — peddavaallatho confirm చేసుకోండి (same గోత్రం అయితే పెళ్లి కూడదు).",
        }
    return {
        "same": False, "blocked": False,
        "a_gothram": ga_raw, "b_gothram": gb_raw,
        "reason": "ok" if (ga and gb) else "both_unknown",
        "verdict_telugu": (f"✅ గోత్రం వేరు ({ga_raw} ≠ {gb_raw}) — సంబంధం కి OK"
                           if (ga and gb) else "ℹ️ గోత్రం details లేదు — profile complete చెయ్యండి"),
    }


def filter_same_gothram(me: Dict[str, Any], pool: List[Dict[str, Any]]) -> Dict[str, Any]:
    """pool నుంచి same-గోత్రం profiles teesi, count తో return."""
    mine = norm_gothram((me or {}).get("gothram"))
    kept, skipped = [], []
    for u in pool or []:
        g = norm_gothram(u.get("gothram"))
        if mine and g and mine == g:
            skipped.append(u.get("tsap_id"))
        else:
            kept.append(u)
    return {"kept": kept, "skipped_ids": skipped, "skipped_count": len(skipped)}


# ---------------------------------------------------------------------------
# 2. 💑 SUCCESS STORIES — pelli ayina janta → trust + viral
# ---------------------------------------------------------------------------
STORY_MIN, STORY_MAX = 20, 600


def submit_story(tsap_id: str, text: str, partner_id: str = "", couple_names: str = "",
                 photo_url: str = "", district: str = "") -> Dict[str, Any]:
    tid = req_text(tsap_id, "tsap_id", 4, 30)
    body = req_text(text, "story", STORY_MIN, STORY_MAX)
    dup = next((s for s in STORIES if s.get("tsap_id") == tid and s.get("status") == "pending"), None)
    if dup:
        validation_error("story", "⚠️ మీ story already review లో ఉంది — approve అయ్యాక కనిపిస్తుంది")
    sid = f"STORY-{len(STORIES) + 1:04d}"
    rec = {
        "story_id": sid, "tsap_id": tid,
        "partner_id": clean(partner_id, 30, "partner_id"),
        "couple_names": clean(couple_names, 80, "couple_names"),
        "text": body, "photo_url": clean(photo_url, 300, "photo_url"),
        "district": clean(district, 40, "district"),
        "status": "pending", "likes": 0,
        "created_at": datetime.utcnow().isoformat(),
        "reviewed_at": "", "review_note": "",
    }
    STORIES.append(rec)
    save_stories()
    return rec


def review_story(story_id: str, action: str, note: str = "") -> Dict[str, Any]:
    rec = next((s for s in STORIES if s.get("story_id") == story_id), None)
    if not rec:
        validation_error("story_id", "⚠️ Story దొరకలేదు — ID సరి చూడండి")
    act = str(action or "").lower()
    if act not in ("approve", "reject"):
        validation_error("action", "⚠️ action approve / reject మాత్రమే")
    assert rec is not None
    rec["status"] = "approved" if act == "approve" else "rejected"
    rec["reviewed_at"] = datetime.utcnow().isoformat()
    rec["review_note"] = clean(note, 160, "review_note")
    save_stories()
    return rec


def approved_stories(limit: int = 20) -> List[Dict[str, Any]]:
    rows = [s for s in STORIES if s.get("status") == "approved"]
    rows.sort(key=lambda r: r.get("created_at", ""), reverse=True)
    return rows[: max(1, min(int(limit or 20), 50))]


def like_story(story_id: str) -> Dict[str, Any]:
    rec = next((s for s in STORIES if s.get("story_id") == story_id and s.get("status") == "approved"), None)
    if not rec:
        validation_error("story_id", "⚠️ Story దొరకలేదు (approve అయ్యాక మాత్రమే like)")
    assert rec is not None
    rec["likes"] = int(rec.get("likes", 0)) + 1
    save_stories()
    return {"story_id": story_id, "likes": rec["likes"]}


def story_share_text(story: Dict[str, Any]) -> str:
    """Channel/WhatsApp forward text (numbers లేదు — privacy safe)."""
    names = story.get("couple_names") or "మన వివాహ జంట"
    dist = f" ({story['district']})" if story.get("district") else ""
    return (
        f"💑 SUCCESS STORY{dist} 💑\n{names} — మన వివాహ ద్వారా కలిశారు! 🎉\n"
        f"\"{story.get('text','')[:220]}\"\n\n"
        f"మీకు కూడా ఇలాంటి సంబంధం కావాలి అంటే → manavivaha.in (₹99 కే సంబంధం, మొదటి 3 FREE) 🙏")


# ---------------------------------------------------------------------------
# 3. 💬 SUPPORT FAQ — Telugu bot answers (widget + Telegram bot common)
# ---------------------------------------------------------------------------
SUPPORT_FAQS: List[Dict[str, Any]] = [
    {"id": "price", "q": "₹99 ఎందుకు? Free లో ఏం వస్తుంది?",
     "a": "మొదటి 3 profiles + 3 interests FREE. ₹99 → 5 profiles unlock (numbers accept తర్వాత). Decline అయితే credit refund — loss లేదు.",
     "keys": ["price", "99", "free", "cost", "dabbulu", "rate", "plan"]},
    {"id": "numbers", "q": "Phone numbers ఎప్పుడు vastayi?",
     "a": "Numbers ఎప్పుడు public కాదు. మీరు interest పంపి, avatali వాళ్లు ACCEPT చేస్తే iddariki numbers WhatsApp లో automatic గా vastayi.",
     "keys": ["number", "phone", "contact", "mobile"]},
    {"id": "register", "q": "Register ఎలా? Entha time?",
     "a": "3 min: /register లో details → OTP verify → photo → ID వస్తుంది. Bot లో కూడా @telugumatrimony1_bot /start చెయ్యొచ్చు.",
     "keys": ["register", "join", "signup", "account", "create"]},
    {"id": "photo_private", "q": "Photo private గా pettukovacha (ammayilu)?",
     "a": "అవును! Photo-private ON చేస్తే మీ photo blur లో ఉంటుంది — interest accept చేసినవాళ్లకే clear photo. 100% safe.",
     "keys": ["photo", "private", "blur", "safe", "ammayi", "hide"]},
    {"id": "gothram", "q": "Same గోత్రం అయితే?",
     "a": "Same గోత్రం అయితే interest automatic గా block అవుతుంది — పెళ్లి కూడదు కాబట్టి. Warning కూడా చూపిస్తాం.",
     "keys": ["gothram", "gotram"]},
    {"id": "porutham", "q": "వేద గుణమేళనం / జాతక పొంతన చూస్తారా?",
     "a": "అవును — జన్మ నక్షత్రం + రాశి ఇవ్వండి, వేద గుణమేళనం స్కోరు + తెలుగు విశ్లేషణ ఇస్తాం (/porutham). సంబంధం వివరాల్లో కూడా గుణమేళనం లైన్ వస్తుంది.",
     "keys": ["porutham", "jathakam", "jatakam", "star", "rasi", "nakshatra", "horoscope", "gunamelanam", "ponthana"]},
    {"id": "refund", "q": "Refund policy ఏంటి?",
     "a": "Matches రాకపోతే 7 days లో refund — /refund లో details చూడండి. Decline అయిన interest credit మీకు automatic refund.",
     "keys": ["refund", "return", "money back", "cancel"]},
    {"id": "fake", "q": "Fake profiles untaya? Report ఎలా?",
     "a": "OTP verify + photo check + 2 reports = auto-hide. Fake అనిపిస్తే profile లో Report button నొక్కండి → మన team 24h లో action, మీరు safe.",
     "keys": ["fake", "fraud", "report", "scam", "mosam", "block"]},
    {"id": "bureau", "q": "నేను broker/bureau — ఎలా join అవ్వాలి?",
     "a": "/bureau లో register → referral code వస్తుంది → మీకు ₹50 per paid user + dashboard. Bureaus కి ₹999 white-label plan ఉంది.",
     "keys": ["bureau", "broker", "agent", "commission"]},
    {"id": "vendor", "q": "పెళ్లి vendors (catering/photo) ads ఎలా ఇవ్వాలి?",
     "a": "/vendors లో register → ₹149 నుంచి packages → admin approve → మీకు direct customer leads WhatsApp కి.",
     "keys": ["vendor", "ad", "catering", "photo", "decoration", "business"]},
    {"id": "whatsapp", "q": "WhatsApp లో matches vastaya?",
     "a": "అవును! Register avvagane 3 profiles WhatsApp కి + రోజు 9AM daily matches (paid) + saved-search alerts. Telegram channels కూడా join అవ్వండి.",
     "keys": ["whatsapp", "telegram", "channel", "daily", "message"]},
    {"id": "support_human", "q": "Manishitho matladali — support number?",
     "a": "Bot లో /help type చెయ్యండి leda website /safety page లో contact — మన team 10AM–7PM Telugu లో reply ఇస్తుంది.",
     "keys": ["support", "help", "contact", "human", "call", "number kavali"]},
]


def search_faq(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    q = str(query or "").strip().lower()
    if not q:
        return [{"id": f["id"], "q": f["q"], "a": f["a"]} for f in SUPPORT_FAQS[: max(1, min(limit, 12))]]
    scored = []
    for f in SUPPORT_FAQS:
        hay = f"{f['q']} {f['a']} {' '.join(f['keys'])}".lower()
        hits = sum(1 for w in re.split(r"\s+", q) if len(w) > 1 and w in hay)
        if hits:
            scored.append((hits, f))
    scored.sort(key=lambda x: -x[0])
    return [{"id": f["id"], "q": f["q"], "a": f["a"]} for _, f in scored[: max(1, min(limit, 12))]] or [
        {"id": "support_human", "q": "Manishitho మాట్లాడండి",
         "a": next(f["a"] for f in SUPPORT_FAQS if f["id"] == "support_human")}]


# ---------------------------------------------------------------------------
# 4. 🔥 DAILY STREAK — rojoo ra → credits (retention engine)
# ---------------------------------------------------------------------------
STREAK_BONUS = {1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 3, 7: 5}   # day → bonus credits
STREAK_MILESTONES = {7: "🔥 7 days streak! +5 credits — super consistency!",
                     14: "⚡ 14 days! +8 credits — మీ profile top priority లో ఉంటుంది",
                     30: "👑 30 days! +15 credits + VIP badge — మన వివాహ star!"}
STREAK_MAX_DAY_BONUS = 5


def streak_bonus_for(day_count: int) -> int:
    if day_count >= 30:
        return 15
    if day_count >= 14:
        return 8
    if day_count >= 7:
        return STREAK_BONUS[7]
    return STREAK_BONUS.get(max(1, min(day_count, 7)), 1)


def streak_status(user: Dict[str, Any], today: str = "") -> Dict[str, Any]:
    today = today or date.today().isoformat()
    last = str((user or {}).get("streak_last", "") or "")
    count = int((user or {}).get("streak_count", 0) or 0)
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    alive = last in (today, yesterday)
    shown = count if alive else 0
    return {
        "count": shown, "best": int((user or {}).get("streak_best", 0) or 0),
        "claimed_today": last == today,
        "next_bonus": streak_bonus_for(shown + 1),
        "milestone_telugu": next((STREAK_MILESTONES[d] for d in sorted(STREAK_MILESTONES) if shown < d),
                                  "👑 Champion — streak continue చెయ్యండి!"),
    }


def claim_daily(user: Dict[str, Any], today: str = "") -> Dict[str, Any]:
    """Rojoo okasari claim — streak penchi bonus credits ఇస్తుంది (user dict mutate)."""
    today = today or date.today().isoformat()
    last = str(user.get("streak_last", "") or "")
    if last == today:
        return {"success": False, "already": True, "count": int(user.get("streak_count", 0) or 0),
                "message_telugu": "✅ ఈ రోజు bonus already తీసుకున్నారు — రేపు మళ్లీ రండి! 🙏"}
    yesterday = (datetime.strptime(today, "%Y-%m-%d").date() - timedelta(days=1)).isoformat()
    count = int(user.get("streak_count", 0) or 0) + 1 if last == yesterday else 1
    bonus = streak_bonus_for(count)
    user["streak_count"] = count
    user["streak_last"] = today
    user["streak_best"] = max(int(user.get("streak_best", 0) or 0), count)
    user["credits"] = int(user.get("credits", 0) or 0) + bonus
    msg = f"🔥 Day-{count} streak! +{bonus} credits FREE (total: {user['credits']})"
    if count in STREAK_MILESTONES:
        msg += f"\n{STREAK_MILESTONES[count]}"
    return {"success": True, "count": count, "bonus": bonus, "credits": user["credits"],
            "best": user["streak_best"], "milestone": count in STREAK_MILESTONES,
            "message_telugu": msg}


# ---------------------------------------------------------------------------
# 5. 🔔 WEB PUSH — browser closed ayina alerts (VAPID ready, graceful degrade)
# ---------------------------------------------------------------------------
def vapid_public_key() -> str:
    return str(os.getenv("VAPID_PUBLIC_KEY", "") or "")


def push_subscribe(tsap_id: str, endpoint: str, keys: Optional[Dict[str, str]] = None,
                   ua: str = "") -> Dict[str, Any]:
    tid = req_text(tsap_id, "tsap_id", 4, 30)
    ep = req_text(endpoint, "endpoint", 10, 500)
    keys = keys or {}
    old = next((s for s in PUSH_SUBS if s.get("endpoint") == ep), None)
    if old:
        old["tsap_id"] = tid
        old["keys"] = {"p256dh": clean(keys.get("p256dh", ""), 200, "p256dh"),
                       "auth": clean(keys.get("auth", ""), 200, "auth")}
        old["updated_at"] = datetime.utcnow().isoformat()
        save_push()
        return {"success": True, "sub_id": old["sub_id"], "renewed": True,
                "message_telugu": "🔔 Match alerts ON — కొత్త matches వస్తే notification వస్తుంది"}
    sid = f"PUSH-{len(PUSH_SUBS) + 1:05d}"
    rec = {"sub_id": sid, "tsap_id": tid, "endpoint": ep,
           "keys": {"p256dh": clean(keys.get("p256dh", ""), 200, "p256dh"),
                    "auth": clean(keys.get("auth", ""), 200, "auth")},
           "ua": clean(ua, 160, "ua"), "created_at": datetime.utcnow().isoformat(),
           "updated_at": datetime.utcnow().isoformat(), "fail_count": 0}
    PUSH_SUBS.append(rec)
    save_push()
    return {"success": True, "sub_id": sid, "renewed": False,
            "message_telugu": "🔔 Match alerts ON — browser close చేసిన కొత్త matches notification వస్తుంది!"}


def push_unsubscribe(tsap_id: str = "", endpoint: str = "") -> Dict[str, Any]:
    before = len(PUSH_SUBS)
    if endpoint:
        PUSH_SUBS[:] = [s for s in PUSH_SUBS if s.get("endpoint") != endpoint]
    elif tsap_id:
        PUSH_SUBS[:] = [s for s in PUSH_SUBS if s.get("tsap_id") != tsap_id]
    removed = before - len(PUSH_SUBS)
    if removed:
        save_push()
    return {"success": True, "removed": removed,
            "message_telugu": "🔕 Alerts off చేశాం" if removed else "ℹ️ Active alerts లేవు"}


def subs_for(tsap_id: str) -> List[Dict[str, Any]]:
    return [s for s in PUSH_SUBS if s.get("tsap_id") == tsap_id]


def push_notify(tsap_id: str, title: str, body: str, url: str = "/matches") -> Dict[str, Any]:
    """
    Notify = queue + (VAPID keys + pywebpush unte real send, lekapothe preview mode).
    Keys lekunda kooda API/UX motham test avvadaniki graceful design.
    """
    title = req_text(title, "title", 1, 80)
    body = req_text(body, "body", 1, 200)
    targets = subs_for(req_text(tsap_id, "tsap_id", 4, 30))
    if not targets:
        return {"success": False, "reason": "no_subscription", "queued": 0,
                "message_telugu": "🔔 ఈ user alerts ON చెయ్యలేదు — matches page లో 🔔 button నొక్కితే ON అవుతుంది"}
    payload = {"title": title, "body": body, "url": clean(url, 200, "url"),
               "icon": "/icons/icon-192.png", "tag": f"mv-{tsap_id}",
               "at": datetime.utcnow().isoformat()}
    # real send attempt (optional dep — lekapothe preview mode)
    sent, failed = 0, 0
    vapid_priv = str(os.getenv("VAPID_PRIVATE_KEY", "") or "")
    if vapid_priv and vapid_public_key():
        try:
            from pywebpush import webpush  # type: ignore
            for s in targets:
                try:
                    webpush(subscription_info={"endpoint": s["endpoint"], "keys": s.get("keys", {})},
                            data=json.dumps(payload), vapid_private_key=vapid_priv,
                            vapid_claims={"sub": "mailto:support@manavivaha.in"})
                    sent += 1
                except Exception:
                    failed += 1
                    s["fail_count"] = int(s.get("fail_count", 0)) + 1
            save_push()
        except ImportError:
            pass
    qid = f"PQ-{len(PUSH_QUEUE) + 1:05d}"
    PUSH_QUEUE.append({"queue_id": qid, "tsap_id": tsap_id, "payload": payload,
                       "targets": len(targets), "sent": sent, "failed": failed,
                       "mode": "live" if sent else "preview",
                       "at": datetime.utcnow().isoformat()})
    save_push()
    return {"success": True, "queued": len(targets), "sent": sent, "failed": failed,
            "mode": "live" if sent else "preview",
            "payload_preview": payload,
            "message_telugu": ("🔔 Notification pampam!" if sent
                               else "🔔 Queue లో pettam (VAPID keys set చెయ్యగానే live అవుతుంది)")}


# ---------------------------------------------------------------------------
# 6. 🎙️ VOICE INTRO — 30 sec voice (village users ki typing lekunda trust)
# ---------------------------------------------------------------------------
VOICE_ALLOWED = {"mp3", "wav", "ogg", "oga", "m4a", "aac", "webm"}
VOICE_MAX_BYTES = 2 * 1024 * 1024   # 30-sec compressed voice ki chalu
VOICE_MIN_BYTES = 1024


def voice_validate(filename: str, size: int) -> Dict[str, Any]:
    ext = str(filename or "").split(".")[-1].lower()
    if ext not in VOICE_ALLOWED:
        return {"ok": False,
                "error_telugu": "🎙️ Voice format MP3/WAV/OGG/M4A మాత్రమే — phone recorder లో పంపండి"}
    if size > VOICE_MAX_BYTES:
        return {"ok": False, "error_telugu": "🎙️ Voice 2MB kanna పెద్దది — 30 sec short clip పంపండి"}
    if size < VOICE_MIN_BYTES:
        return {"ok": False, "error_telugu": "🎙️ Voice khali గా ఉంది — మళ్లీ record చెయ్యండి"}
    return {"ok": True, "ext": ext}


# ---------------------------------------------------------------------------
# 7. 🎮 COMPLETE BONUS — 90%+ profile → 2 credits once
# ---------------------------------------------------------------------------
COMPLETE_BONUS_THRESHOLD = 90
COMPLETE_BONUS_CREDITS = 2


def claim_complete_bonus(user: Dict[str, Any], percent: int) -> Dict[str, Any]:
    if user.get("complete_bonus_claimed"):
        return {"success": False, "already": True,
                "message_telugu": "✅ Profile bonus already తీసుకున్నారు — matches enjoy చెయ్యండి!"}
    if int(percent or 0) < COMPLETE_BONUS_THRESHOLD:
        return {"success": False, "need_more": COMPLETE_BONUS_THRESHOLD - int(percent or 0),
                "message_telugu": f"📝 Profile {percent}% ఉంది — {COMPLETE_BONUS_THRESHOLD}% చేస్తే 2 credits FREE! Photo + about add చెయ్యండి"}
    user["complete_bonus_claimed"] = True
    user["credits"] = int(user.get("credits", 0) or 0) + COMPLETE_BONUS_CREDITS
    return {"success": True, "bonus": COMPLETE_BONUS_CREDITS, "credits": user["credits"],
            "message_telugu": f"🎮 Profile {percent}% complete! +{COMPLETE_BONUS_CREDITS} credits FREE (total: {user['credits']}) 🌟"}


# ---------------------------------------------------------------------------
# 8. ⚡ BOOST PACKS — pay → top rank (revenue)
# ---------------------------------------------------------------------------
BOOST_PACKS = {
    "B_1": {"code": "B_1", "days": 1, "price": 49, "label": "⚡ 24h Boost — ₹49"},
    "B_3": {"code": "B_3", "days": 3, "price": 99, "label": "⚡ 3-day Boost — ₹99 (popular)"},
    "B_7": {"code": "B_7", "days": 7, "price": 199, "label": "⚡ 7-day Super Boost — ₹199"},
}


def is_boosted(user: Dict[str, Any]) -> bool:
    try:
        return datetime.fromisoformat(str(user.get("boost_until", ""))) > datetime.utcnow()
    except Exception:
        return False


def apply_boost(user: Dict[str, Any], pack_code: str) -> Dict[str, Any]:
    pack = BOOST_PACKS.get(str(pack_code or "").upper())
    if not pack:
        validation_error("pack", "⚠️ Boost pack B_1 / B_3 / B_7 మాత్రమే")
    assert pack is not None
    base = datetime.utcnow()
    try:
        cur = datetime.fromisoformat(str(user.get("boost_until", "")))
        if cur > base:
            base = cur                      # existing boost paina extend
    except Exception:
        pass
    until = (base + timedelta(days=int(pack["days"]))).isoformat()
    user["boost_until"] = until
    return {"pack": pack, "boost_until": until,
            "message_telugu": f"{pack['label']} active! Matches + channels లో మీ profile TOP లో ఉంటుంది ⚡"}


def boost_rank_key(user: Dict[str, Any]) -> int:
    return 1 if is_boosted(user) else 0


load_stories()
load_push()
