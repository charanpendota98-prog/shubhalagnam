"""
MANA VIVAHA — TRUST & SAFETY ENGINE 🛡️
======================================
Top matrimony sites lo "report / block / verification" undi — manam kooda (inka better ga):

  1. 🚨 REPORT — fake profile, advance money scam, harassment, wrong photo, married, spam
     • 3 valid reports → profile **auto-hide** (admin chudakamunde)
     • severity level batti priority (scam/harassment = high)
  2. 🚫 BLOCK — user ni block (vaallu mee profile chudalenu, interest pampalenru, search lo kanipinchadu)
  3. ✅ VERIFICATION LEVELS — phone ✅ → photo ✅ → ID (KYC) ✅ (badge card lo + search lo)
  4. 👮 MODERATION QUEUE — admin/staff can review and resolve reports
       (warn / hide / ban / dismiss) — identity verification is a separate workflow
  5. 💡 SAFETY TIPS — Telugu lo (scam build-up, public meeting, video call verify)

Ee module pure logic — DB lists main.py nunchi istham (test lo in-memory).
"""
from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Optional, Tuple

DB_REPORTS: List[Dict] = []
DB_BLOCKS: List[Dict] = []          # {"owner": tsap, "blocked": tsap, "at": iso, "reason": ""}

REPORT_CATEGORIES = {
    "fake_profile": {"en": "Fake profile", "te": "నకిలీ ప్రొఫైల్", "severity": "high",
                     "desc": "Photo/పేరు/details నిజం kaavu (photos vere వాళ్ల vi)"},
    "advance_money": {"en": "Advance-money request", "te": "ముందు డబ్బు అడిగారు", "severity": "high",
                      "desc": "Advance/registration/visa కోసం డబ్బు అడిగారు లేదా ఒత్తిడి చేశారు"},
    "harassment": {"en": "Harassment or abusive language", "te": "వేధింపు / అసభ్య మాటలు", "severity": "high",
                   "desc": "Asabhyam గా matladaru, threat చేశారు, blackmail"},
    "wrong_photo": {"en": "Incorrect photo", "te": "ఫోటో మార్చేశారు", "severity": "medium",
                    "desc": "Photo వేరు, asalu vyakti వేరు (video call లో telisindi)"},
    "already_married": {"en": "Married status not disclosed", "te": "ఇప్పటికే పెళ్లి అయ్యింది", "severity": "high",
                        "desc": "పెళ్లి అయింది కానీ profile లో లేదు అని cheppaledu"},
    "spam": {"en": "Spam or advertising", "te": "స్పామ్ / ప్రకటనలు", "severity": "low",
             "desc": "Interest కాదు — business/promo messages pampisthunnaru"},
    "other": {"en": "Other", "te": "ఇతర", "severity": "medium", "desc": "Vere problem — detail లో రాయండి"},
}
ACTION_RULES = {"warn": "⚠️ Warning recorded for review",
                "hide": "🙈 Profile approval disabled pending review",
                "ban": "⛔ Profile suspended; further review is required",
                "dismiss": "❌ Report closed without further action"}


def submit_report(reporter_id: str, target_id: str, category: str, detail: str = "",
                  reports: Optional[List[Dict]] = None, users: Optional[List[Dict]] = None) -> Tuple[bool, str, Dict]:
    """Report submit + auto-flag (3+ high/valid reports → auto hide)."""
    reports = DB_REPORTS if reports is None else reports
    users = users if users is not None else []
    cat = str(category or "").strip().lower()
    if cat not in REPORT_CATEGORIES:
        return False, "Category tappu — ఇవి మాత్రమే: " + ", ".join(REPORT_CATEGORIES), {}
    if not reporter_id or not target_id:
        return False, "reporter + target TSAP ID కావాలి", {}
    if str(reporter_id) == str(target_id):
        return False, "Meeru meeku report cheyyaleemu", {}
    dup = next((r for r in reports if r["reporter_id"] == reporter_id and r["target_id"] == target_id
                and r["category"] == cat and r["status"] == "open"), None)
    if dup:
        dup["detail"] = detail or dup.get("detail", "")
        dup["updated_at"] = datetime.utcnow().isoformat()
        dup["repeat_count"] = int(dup.get("repeat_count", 1)) + 1
        return True, "report_updated", dup

    rec = {
        "id": "REP-" + datetime.utcnow().strftime("%y%m%d") + "-" + str(len(reports) + 1).zfill(4),
        "reporter_id": reporter_id, "target_id": target_id, "category": cat,
        "category_telugu": REPORT_CATEGORIES[cat]["te"], "category_en": REPORT_CATEGORIES[cat]["en"],
        "severity": REPORT_CATEGORIES[cat]["severity"],
        "detail": str(detail)[:500], "status": "open", "at": datetime.utcnow().isoformat(),
        "action": "", "auto_flagged": False, "repeat_count": 1,
    }
    reports.append(rec)
    # auto-flag rules
    open_mine = [r for r in reports if r["target_id"] == target_id and r["status"] == "open"]
    highs = [r for r in open_mine if r["severity"] == "high"]
    distinct_reporters = len({r["reporter_id"] for r in open_mine})
    if len(highs) >= 2 or distinct_reporters >= 3 or len(open_mine) >= 4:
        rec["auto_flagged"] = True
        rec["auto_action"] = "profile_hidden_for_review"
        tgt = next((u for u in users if u.get("tsap_id") == target_id), None)
        if tgt is not None:
            tgt["is_approved"] = False
            tgt["hidden_reason"] = "auto_flag: %d reports (severity high: %d)" % (len(open_mine), len(highs))
            tgt["hidden_at"] = datetime.utcnow().isoformat()
    return True, "new_report", rec


def report_stats(reports: Optional[List[Dict]] = None) -> Dict:
    reports = DB_REPORTS if reports is None else reports
    openr = [r for r in reports if r["status"] == "open"]
    by_cat: Dict[str, int] = {}
    for r in reports:
        by_cat[r["category"]] = by_cat.get(r["category"], 0) + 1
    return {"total": len(reports), "open": len(openr),
            "high": len([r for r in openr if r["severity"] == "high"]),
            "auto_flagged": len([r for r in reports if r.get("auto_flagged")]),
            "resolved": len([r for r in reports if r["status"] == "resolved"]),
            "by_category": by_cat,
            "message_telugu": "%d open reports (high priority: %d) — ముందు scam/harassment చూడండి"
                              % (len(openr), len([r for r in openr if r["severity"] == "high"]))}


def block_user(owner_id: str, blocked_id: str, reason: str = "",
               blocks: Optional[List[Dict]] = None) -> Tuple[bool, str, Dict]:
    blocks = DB_BLOCKS if blocks is None else blocks
    if not owner_id or not blocked_id or owner_id == blocked_id:
        return False, "Tappu IDs", {}
    existing = next((b for b in blocks if b["owner"] == owner_id and b["blocked"] == blocked_id), None)
    if existing:
        return True, "already_blocked", existing
    rec = {"owner": owner_id, "blocked": blocked_id, "reason": str(reason)[:200],
           "at": datetime.utcnow().isoformat()}
    blocks.append(rec)
    return True, "blocked", rec


def unblock_user(owner_id: str, blocked_id: str, blocks: Optional[List[Dict]] = None) -> Tuple[bool, str]:
    blocks = DB_BLOCKS if blocks is None else blocks
    before = len(blocks)
    blocks[:] = [b for b in blocks if not (b["owner"] == owner_id and b["blocked"] == blocked_id)]
    return (len(blocks) < before), ("unblocked" if len(blocks) < before else "not_blocked")


def is_blocked(a: str, b: str, blocks: Optional[List[Dict]] = None) -> bool:
    """Either side block చేసిన true (రెండు directions)."""
    blocks = DB_BLOCKS if blocks is None else blocks
    return any((x["owner"] == a and x["blocked"] == b) or (x["owner"] == b and x["blocked"] == a) for x in blocks)


def block_list(owner_id: str, blocks: Optional[List[Dict]] = None) -> List[Dict]:
    blocks = DB_BLOCKS if blocks is None else blocks
    return [b for b in blocks if b["owner"] == owner_id]


# --------------------------------------------------------------- verification
VERIFY_LEVELS = ["none", "phone", "photo", "id"]
VERIFY_TELUGU = {
    "none": "ధృవీకరణ ఇంకా లేదు",
    "phone": "📱 ఫోన్ OTP ద్వారా ధృవీకరించబడింది",
    "photo": "📸 ఫోటోను బృందం సమీక్షించి ఆమోదించింది",
    "id": "🪪 ప్రభుత్వ ID ను బృందం మాన్యువల్‌గా సమీక్షించింది",
}
VERIFY_ENGLISH = {
    "none": "No check recorded",
    "phone": "📱 Phone number access confirmed by OTP",
    "photo": "📸 Photo reviewed and approved by staff",
    "id": "🪪 Government ID manually reviewed by staff",
}
VERIFY_NEXT_STEP_ENGLISH = {
    "none": "Submit an OTP to confirm access to your phone number.",
    "phone": "Upload a photo or selfie for review at /verify.",
    "photo": "Contact support about government ID review.",
    "id": "Manual ID review is complete.",
}


def _verified_level(user: Dict) -> str:
    """Derive the badge only from server/admin evidence, never a requested level."""
    u = user or {}
    if u.get("id_verified"):
        return "id"
    if u.get("selfie_verified") or u.get("photo_status") == "approved":
        return "photo"
    if u.get("phone_verified"):
        return "phone"
    return "none"


def has_verification_evidence(user: Dict) -> bool:
    """True only for OTP or review evidence; ignores legacy plan/approval flags."""
    return _verified_level(user or {}) != "none"


def set_verification(user: Dict, kind: str) -> Tuple[bool, str, Dict]:
    """Refresh a level from evidence already recorded by OTP/admin review."""
    kind = str(kind or "").strip().lower()
    if kind not in ("phone", "photo", "id"):
        return False, "kind: phone | photo | id మాత్రమే", {}
    evidence = {
        "phone": bool((user or {}).get("phone_verified")),
        "photo": bool((user or {}).get("selfie_verified") or (user or {}).get("photo_status") == "approved"),
        "id": bool((user or {}).get("id_verified")),
    }[kind]
    if not evidence:
        return False, "%s verification కి OTP లేదా మాన్యువల్ review evidence అవసరం" % kind, user or {}
    level = _verified_level(user or {})
    (user or {})["verification_level"] = level
    return True, "level_%s" % level, user or {}


def verification_badge(user: Dict) -> Dict:
    """Describe the highest completed check without converting it to a trust score."""
    lvl = _verified_level(user or {})
    next_step = {
        "none": "ఫోన్ ధృవీకరణ కోసం OTP ను నమోదు చేయండి",
        "phone": "ఫోటో/సెల్ఫీ సమీక్ష కోసం /verify లో అప్‌లోడ్ చేయండి",
        "photo": "ప్రభుత్వ ID సమీక్ష కోసం support ను సంప్రదించండి",
        "id": "ID మాన్యువల్ సమీక్ష పూర్తయింది",
    }[lvl]
    return {
        "level": lvl,
        "telugu": VERIFY_TELUGU[lvl],
        "english": VERIFY_ENGLISH[lvl],
        "next_step_telugu": next_step,
        "next_step_en": VERIFY_NEXT_STEP_ENGLISH[lvl],
    }


# --------------------------------------------------------------- moderation
def moderation_queue(reports: Optional[List[Dict]] = None, users: Optional[List[Dict]] = None,
                     limit: int = 50) -> Dict:
    reports = DB_REPORTS if reports is None else reports
    users = users or []
    order = {"high": 0, "medium": 1, "low": 2}
    openr = [r for r in reports if r["status"] == "open"]
    openr.sort(key=lambda r: (order.get(r["severity"], 3), r["at"]))
    items = []
    for r in openr[:limit]:
        tgt = next((u for u in users if u.get("tsap_id") == r["target_id"]), None)
        same_target = [x for x in openr if x["target_id"] == r["target_id"]]
        items.append({
            "report_id": r["id"], "category": r["category"], "category_telugu": r["category_telugu"],
            "category_en": REPORT_CATEGORIES.get(r["category"], {}).get("en", str(r["category"]).replace("_", " ").title()),
            "severity": r["severity"], "detail": r["detail"], "at": r["at"],
            "reporter_id": r["reporter_id"], "target_id": r["target_id"],
            "reports_on_target": len(same_target),
            "target": ({"tsap_id": tgt.get("tsap_id"), "full_name": tgt.get("full_name"),
                        "phone_last4": tgt.get("phone_last4"), "district": tgt.get("district"),
                        "is_approved": tgt.get("is_approved", True),
                        "verification": verification_badge(tgt)["level"]} if tgt else None),
            "suggested_action": ("ban" if r["severity"] == "high" and len(same_target) >= 2 else
                                 "hide" if r["severity"] == "high" else "warn"),
        })
    return {"open": len(openr), "items": items, "actions": list(ACTION_RULES.keys()),
            "message_telugu": "High severity reports ముందు చూడండి — scam/harassment కి వెంటనే action teesukondi"}


def resolve_report(report_id: str, action: str, note: str = "",
                   reports: Optional[List[Dict]] = None, users: Optional[List[Dict]] = None) -> Tuple[bool, str, Dict]:
    reports = DB_REPORTS if reports is None else reports
    # 🛡️ Legacy/partial rows must not crash the moderation queue with a 500.
    rec = next((r for r in reports if isinstance(r, dict) and str(r.get("id", "")) == str(report_id)), None)
    if not rec:
        return False, "Report దొరకలేదు: %s" % report_id, {}
    action = str(action or "").strip().lower()
    if action not in ACTION_RULES:
        return False, "action ఇవి మాత్రమే: " + ", ".join(ACTION_RULES), {}
    rec["status"] = "resolved"
    rec["action"] = action
    rec["action_telugu"] = ACTION_RULES[action]
    rec["resolved_at"] = datetime.utcnow().isoformat()
    rec["admin_note"] = str(note)[:300]
    target_id = str(rec.get("target_id", "") or "")
    tgt = next((u for u in (users or []) if target_id and u.get("tsap_id") == target_id), None)
    if tgt is not None:
        if action == "hide":
            tgt["is_approved"] = False
            tgt["hidden_reason"] = "admin: " + note[:120]
        elif action == "ban":
            tgt["is_approved"] = False
            tgt["is_banned"] = True
            tgt["banned_at"] = datetime.utcnow().isoformat()
        elif action == "warn":
            tgt["warnings"] = int(tgt.get("warnings", 0)) + 1
    # same target ki migilina open reports ni kooda close chey (oke action tho)
    for r in reports:
        if not isinstance(r, dict) or not target_id:
            continue
        if str(r.get("target_id", "") or "") == target_id and str(r.get("status", "")) == "open":
            r["status"] = "resolved"
            r["action"] = action
            r["resolved_at"] = datetime.utcnow().isoformat()
            r["admin_note"] = "bulk resolve: " + rec["id"]
    return True, action, rec


# --------------------------------------------------------------- safety tips
def safety_tips() -> List[Dict]:
    """Bilingual safety tips for the public safety page and welcome message."""
    return [
        {"icon": "💰", "title": "అత్యవసర డబ్బు అభ్యర్థనలపై జాగ్రత్త",
         "title_en": "Be cautious of urgent requests for money",
         "telugu": "Registration fee / visa / hospital / train ticket అంటూ వెంటనే డబ్బు అడిగితే, చెల్లించే ముందు కుటుంబంతో స్వతంత్రంగా నిర్ధారించండి. అనుమానం ఉంటే report చేయండి; review సమయం, ఫలితం మారవచ్చు.",
         "en": "Registration fees, visas, hospital costs, or travel tickets can be used to pressure you. Verify any request independently with family before paying. Report concerns; review timing and outcomes may vary."},
        {"icon": "📸", "title": "ఫోటోను స్వతంత్రంగా నిర్ధారించండి",
         "title_en": "Check profile photos independently",
         "telugu": "Matrimony profile లో photos vere వాళ్ల vi కూడా undochu. WhatsApp video call (2 నిమిషాలు) చేసి confirm చెయ్యండి.",
         "en": "A profile photo may not belong to the person shown. Arrange a video call and verify the person's identity independently; a photo review is not an identity check."},
        {"icon": "🏠", "title": "మొదటి పరిచయానికి బహిరంగ ప్రదేశాన్ని ఎంచుకోండి",
         "title_en": "Meet in a public place",
         "telugu": "Pellichoopulu/temple/hotel lobby — ఇంట్లో కాదు, okkari తో కాదు. Inti peddavallani teesukondi.",
         "en": "Choose a public venue for a first meeting. Avoid meeting alone at a private home, and consider bringing a trusted family member or friend."},
        {"icon": "📱", "title": "నంబర్ లేదా OTP ను ఎవరికీ ఇవ్వవద్దు",
         "title_en": "Never share a one-time code",
         "telugu": "మన site లో number interest accept అయ్యాక మాత్రమే share అవుతుంది. OTP అని ఎవరు adigina — ivvakandi.",
         "en": "Contact details are shared in account views only after the profile owner accepts an interest request. Never share a one-time code with anyone."},
        {"icon": "📄", "title": "పత్రాలను కుటుంబంతో కలిసి పరిశీలించండి",
         "title_en": "Review important documents with family",
         "telugu": "Age/ID/education certificates original chusi, parents తో కలిసి మాత్రమే final చెయ్యండి.",
         "en": "Review original age, identity, and education documents with family before making a decision. Recorded site checks do not verify every profile detail."},
        {"icon": "🚫", "title": "యాప్‌లో చాట్ లేదు — జాగ్రత్తగా సంప్రదించండి",
         "title_en": "There is no in-app chat",
         "telugu": "మన site లో chatting లేదు. Interest accept అయితే — direct గా మీరు matladukovachu (మనం middle లో undamu).",
         "en": "The site does not offer in-app chat. After an interest request is accepted, consented contact details are available in account views; the site does not take part in those conversations."},
    ]


def report_ack_text(target_name: str = "profile") -> str:
    return ("🙏 Report పంపినందుకు ధన్యవాదాలు.\n"
            "ఈ report review కోసం నమోదు చేయబడింది; చర్య సమయం, ఫలితం మారవచ్చు.\n"
            "🔒 Report చేసిన వారి వివరాలు reported profile owner‌కు చూపించము.\n"
            "⚠️ డబ్బు అడిగినట్లయితే screenshots లేదా payment details‌ను భద్రపరచండి.")
