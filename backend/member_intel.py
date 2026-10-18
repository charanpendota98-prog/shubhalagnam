"""
🧠 MEMBER INTELLIGENCE (WAVE 43)
================================
Explainable, member-facing insight built **only from recorded facts**:

  • verification_progress() — every recorded check, what it means, what it does not
  • profile_insights()      — why a profile appears, what is shared, what is unknown
  • interest_coach()        — what happens before/after an interest request, honestly
  • request_timeline()      — status steps with the timestamps we actually recorded
  • member_activity()       — this member's own request counts and response times

Hard rules this module never breaks:
  1. No compatibility percentage, no ranking score, no "match quality" claim.
  2. Nothing is inferred — a blank field stays unknown, never guessed.
  3. No promise of a reply, a response time, or a marriage outcome.
  4. Verification is described as *recorded checks*, never as trustworthiness.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import quality
import safety
import topmatch

DISCLAIMER_EN = (
    "Facts recorded by the members themselves — not a compatibility score, not a "
    "recommendation, and not a prediction of a reply or a marriage."
)
DISCLAIMER_TE = (
    "సభ్యులు స్వయంగా నమోదు చేసిన వివరాలు మాత్రమే — ఇది compatibility score కాదు, "
    "సిఫార్సు కాదు, సమాధానం లేదా వివాహ ఫలితం గురించిన అంచనా కాదు."
)

DELIVERY_NOTE_EN = "Queue status only — external delivery and reading are never confirmed."
DELIVERY_NOTE_TE = "Queue స్థితి మాత్రమే — బయటికి డెలివరీ అయ్యిందని లేదా చదివారని నిర్ధారణ కాదు."

# ---------------------------------------------------------------------------
# 1 · Verification progress — one honest line per recorded check
# ---------------------------------------------------------------------------
VERIFICATION_CHECKS: List[Dict[str, str]] = [
    {
        "key": "phone",
        "label_en": "Phone OTP",
        "label_te": "ఫోన్ OTP",
        "icon": "📱",
        "records_en": "Records that this account completed a one-time-password check on the number it registered with.",
        "records_te": "ఈ ఖాతా నమోదు చేసుకున్న ఫోన్ నంబర్‌కు OTP తనిఖీ పూర్తి చేసిందని నమోదు చేస్తుంది.",
        "does_not_en": "It does not confirm a person's identity, name, family, community, income, or marital status.",
        "does_not_te": "ఇది వ్యక్తి గుర్తింపు, పేరు, కుటుంబం, కమ్యూనిటీ, ఆదాయం లేదా వైవాహిక స్థితిని నిర్ధారించదు.",
        "next_step_en": "Send an OTP from the verification page.",
        "next_step_te": "ధృవీకరణ పేజీ నుండి OTP పంపండి.",
        "href": "/verify",
    },
    {
        "key": "photo",
        "label_en": "Photo review",
        "label_te": "ఫోటో సమీక్ష",
        "icon": "📷",
        "records_en": "Records that a submitted photo was reviewed by staff and accepted for the profile.",
        "records_te": "సమర్పించిన ఫోటోను సిబ్బంది సమీక్షించి ప్రొఫైల్ కోసం అంగీకరించారని నమోదు చేస్తుంది.",
        "does_not_en": "It is not a liveness check and not an identity check — review cannot prove who the photo shows.",
        "does_not_te": "ఇది liveness తనిఖీ కాదు, గుర్తింపు తనిఖీ కాదు — సమీక్షతో ఫోటోలో ఎవరున్నారో నిర్ధారించలేము.",
        "next_step_en": "Upload a clear photo from the verification page for review.",
        "next_step_te": "ధృవీకరణ పేజీ నుండి స్పష్టమైన ఫోటోను సమీక్ష కోసం అప్‌లోడ్ చేయండి.",
        "href": "/verify",
    },
    {
        "key": "id",
        "label_en": "Government ID review",
        "label_te": "ప్రభుత్వ ID సమీక్ష",
        "icon": "🪪",
        "records_en": "Records that a government ID submission was reviewed by staff.",
        "records_te": "ప్రభుత్వ ID సమర్పణను సిబ్బంది సమీక్షించారని నమోదు చేస్తుంది.",
        "does_not_en": "It does not verify any other profile detail, and no check makes a profile risk-free.",
        "does_not_te": "ఇది ఇతర ప్రొఫైల్ వివరాలను ధృవీకరించదు; ఏ తనిఖీ కూడా ప్రొఫైల్‌ను పూర్తిగా ప్రమాదరహితం చేయదు.",
        "next_step_en": "Contact support from the verification page to start an ID review.",
        "next_step_te": "ID సమీక్ష కోసం ధృవీకరణ పేజీ నుండి support ను సంప్రదించండి.",
        "href": "/verify",
    },
]

PROFILE_SECTIONS: List[Dict[str, Any]] = [
    {"key": "basic", "label_en": "Basic details", "label_te": "ప్రాథమిక వివరాలు", "icon": "🧾",
     "fields": ["full_name", "gender", "dob", "height", "marital_status", "caste", "sub_caste", "state", "district"]},
    {"key": "career", "label_en": "Education & work", "label_te": "విద్య & ఉద్యోగం", "icon": "🎓",
     "fields": ["education", "education_detail", "job", "work_type", "company", "salary", "work_location"]},
    {"key": "family", "label_en": "Family details", "label_te": "కుటుంబ వివరాలు", "icon": "🏡",
     "fields": ["father_name", "father_occupation", "mother_name", "mother_occupation",
                "native_place", "family_type", "family_status", "brothers", "sisters"]},
    {"key": "horoscope", "label_en": "Horoscope details", "label_te": "జాతక వివరాలు", "icon": "🪔",
     "fields": ["star", "rasi", "gothram", "dosham", "birth_time", "birth_place"]},
    {"key": "about", "label_en": "About & expectations", "label_te": "నా గురించి & అంచనాలు", "icon": "✍️",
     "fields": ["about_myself", "expectations"]},
]


def _filled(value: Any) -> bool:
    return bool(str(value or "").strip())


def verification_progress(user: Optional[Dict]) -> Dict[str, Any]:
    """Every recorded check for one profile, with honest meaning and next step."""
    u = user if isinstance(user, dict) else {}
    badge = safety.verification_badge(u)
    level = str(badge.get("level") or "none")

    state_by_key = {
        "phone": bool(u.get("phone_verified")),
        "photo": bool(u.get("selfie_verified") or u.get("photo_status") == "approved"),
        "id": bool(u.get("id_verified")),
    }
    checks = []
    for spec in VERIFICATION_CHECKS:
        recorded = state_by_key.get(spec["key"], False)
        checks.append({
            **spec,
            "state": "recorded" if recorded else "not_recorded",
            "recorded": recorded,
        })

    sections = []
    total_fields = 0
    provided_fields = 0
    for section in PROFILE_SECTIONS:
        fields = list(section.get("fields") or [])
        provided = [f for f in fields if _filled(u.get(f))]
        missing = [f for f in fields if not _filled(u.get(f))]
        total_fields += len(fields)
        provided_fields += len(provided)
        sections.append({
            "key": section["key"],
            "label_en": section["label_en"],
            "label_te": section["label_te"],
            "icon": section.get("icon", "•"),
            "provided": len(provided),
            "total": len(fields),
            "missing_fields": missing,
        })

    return {
        "tsap_id": str(u.get("tsap_id") or ""),
        "level": level,
        "badge": badge,
        "checks": checks,
        "recorded_checks": sum(1 for c in checks if c["recorded"]),
        "sections": sections,
        "provided_fields": provided_fields,
        "total_fields": total_fields,
        # "Details provided" is a count of member-entered fields — never a trust score.
        "detail_note_en": "Details provided counts the fields this member filled in. It is not a quality or trust score.",
        "detail_note_te": "సభ్యుడు నింపిన ఫీల్డ్‌ల సంఖ్య ఇది. ఇది నాణ్యత లేదా నమ్మకం స్కోర్ కాదు.",
        "disclaimer_en": DISCLAIMER_EN,
        "disclaimer_te": DISCLAIMER_TE,
    }


# ---------------------------------------------------------------------------
# 2 · Profile insights — why this profile appears, and what is still unknown
# ---------------------------------------------------------------------------
def profile_insights(viewer: Optional[Dict], profile: Optional[Dict],
                     saved_searches: Optional[List[Dict]] = None) -> Dict[str, Any]:
    """Facts from both profiles + which saved searches this profile satisfies."""
    a = viewer if isinstance(viewer, dict) else {}
    b = profile if isinstance(profile, dict) else {}

    facts: Dict[str, Any] = {}
    try:
        facts = topmatch.score_match_v2(a, b) or {}
    except Exception:
        facts = {}

    observations = [str(x) for x in (facts.get("observations") or [])][:6]
    differences = [str(x) for x in (facts.get("differences") or [])][:6]
    breakdown = [row for row in (facts.get("breakdown") or []) if isinstance(row, dict)][:12]

    # Fields either side left blank stay unknown — never inferred.
    unknown = []
    for row in breakdown:
        status = str(row.get("status") or "")
        if status in ("missing", "unknown", "not_provided"):
            unknown.append(row)
    blank_keys = []
    for key, label, te_label in getattr(topmatch, "PROFILE_FIELDS", []):
        if not _filled(a.get(key)) or not _filled(b.get(key)):
            blank_keys.append({"key": key, "label": label, "telugu": te_label,
                               "state": "not_provided_by_one_side"})

    searches = []
    for rec in (saved_searches or []):
        if not isinstance(rec, dict):
            continue
        filters = rec.get("filters") if isinstance(rec.get("filters"), dict) else {}
        if not filters:
            continue
        try:
            matches = bool(quality.matches_filters(b, filters))
        except Exception:
            matches = False
        searches.append({
            "search_id": str(rec.get("search_id") or rec.get("id") or ""),
            "name": str(rec.get("name") or ""),
            "matches": matches,
            "filters": {k: v for k, v in filters.items() if str(v or "").strip() not in ("", "0", "None")},
            # Which single filter this profile satisfies — the honest "why".
            "filter_detail": _filter_breakdown(b, filters),
        })

    provided, total, missing = _profile_detail_counts(b)

    return {
        "viewer_id": str(a.get("tsap_id") or ""),
        "profile_id": str(b.get("tsap_id") or ""),
        "shared": observations,
        "different": differences,
        "unknown": unknown or blank_keys[:6],
        "breakdown": breakdown,
        "saved_searches": searches,
        "matching_searches": [s["name"] or s["search_id"] for s in searches if s["matches"]],
        "profile_details": {"provided": provided, "total": total, "missing_fields": missing},
        "next_steps": [
            {"en": "Review each listed detail yourself — families decide, not a score.",
             "te": "ప్రతి వివరాన్ని మీరే పరిశీలించండి — నిర్ణయం కుటుంబాలది, స్కోర్‌ది కాదు."},
            {"en": "Ask the family about anything left blank before you decide.",
             "te": "ఖాళీగా ఉన్న వివరాలను నిర్ణయానికి ముందు కుటుంబాన్ని అడిగి తెలుసుకోండి."},
            {"en": "Send an interest request when you are ready — the owner decides whether to respond.",
             "te": "సిద్ధంగా ఉన్నప్పుడు interest request పంపండి — స్పందించాలా వద్దా అన్నది ఆ ప్రొఫైల్ యజమాని నిర్ణయం."},
        ],
        "compatibility_score_calculated": False,
        "ranking_basis": "member_entered_facts_only",
        "disclaimer_en": DISCLAIMER_EN,
        "disclaimer_te": DISCLAIMER_TE,
    }


def _filter_breakdown(profile: Dict, filters: Dict) -> List[Dict[str, Any]]:
    """Evaluate each saved-search filter on its own so the member sees which one fit.

    Every check reuses ``quality.matches_filters`` — the same semantics as search —
    so this can never disagree with the list the member actually sees.
    """
    detail: List[Dict[str, Any]] = []
    for key, value in (filters or {}).items():
        if str(value or "").strip().lower() in ("", "0", "none", "false"):
            continue
        try:
            matched = bool(quality.matches_filters(profile, {key: value}))
        except Exception:
            matched = False
        detail.append({"key": str(key), "value": str(value), "matched": matched})
    return detail


def _profile_detail_counts(user: Dict) -> (int, int, List[str]):
    provided = 0
    total = 0
    missing: List[str] = []
    for section in PROFILE_SECTIONS:
        for field in section["fields"]:
            total += 1
            if _filled(user.get(field)):
                provided += 1
            else:
                missing.append(field)
    return provided, total, missing


# ---------------------------------------------------------------------------
# 3 · Interest coach — what sending really does, before the member pays a credit
# ---------------------------------------------------------------------------
COACH_BLOCKERS = {
    "credits_ledu": {
        "en": "You have no request credits left on this plan.",
        "te": "ఈ ప్లాన్‌లో మీ వద్ద request credits లేవు.",
        "fix_href": "/requests#plans",
    },
}


def interest_coach(frm: Optional[Dict], to: Optional[Dict], interests: Optional[List[Dict]] = None,
                   blocked: bool = False, plans: Optional[List[Dict]] = None,
                   daily_limit: int = 0) -> Dict[str, Any]:
    """Explain eligibility and the honest sequence of events — before any credit is spent."""
    sender = frm if isinstance(frm, dict) else {}
    owner = to if isinstance(to, dict) else {}
    rows = [r for r in (interests or []) if isinstance(r, dict)]
    from_id = str(sender.get("tsap_id") or "")
    to_id = str(owner.get("tsap_id") or "")

    duplicate = None
    for rec in rows:
        if str(rec.get("from_id") or "") == from_id and str(rec.get("to_id") or "") == to_id:
            duplicate = {
                "request_id": str(rec.get("request_id") or ""),
                "status": str(rec.get("status") or "pending"),
                "created_at": str(rec.get("created_at") or ""),
            }
            break

    sent_today = sum(1 for r in rows
                     if str(r.get("from_id") or "") == from_id and _is_today(r.get("created_at")))
    credits = int(sender.get("credits", 0) or 0)

    reasons: List[str] = []
    if not from_id or not to_id:
        reasons.append("profile_missing")
    if from_id and from_id == to_id:
        reasons.append("self_request")
    if sender and owner and str(sender.get("gender", "")).lower() == str(owner.get("gender", "")).lower():
        reasons.append("same_gender")
    if duplicate:
        reasons.append("duplicate_request")
    if credits <= 0:
        reasons.append("no_credits")
    if blocked:
        reasons.append("blocked")

    can_send = not reasons
    fix = COACH_BLOCKERS.get("credits_ledu", {}) if "no_credits" in reasons else {}

    return {
        "from_id": from_id,
        "to_id": to_id,
        "can_send": can_send,
        "blockers": reasons,
        "blocker_help": [{"reason": r, **COACH_BLOCKERS.get(r, {})} for r in reasons if r in COACH_BLOCKERS],
        "fix_href": str(fix.get("fix_href") or ""),
        "credits": credits,
        "credits_needed": 1,
        "sent_today": sent_today,
        "daily_limit": int(daily_limit or 0),
        "duplicate_request": duplicate,
        "blocked": bool(blocked),
        # Transparency: the exact things the receiving side is shown.
        "what_owner_receives": [
            {"en": "Your profile card with the member-entered details you published.",
             "te": "మీరు ప్రచురించిన సభ్య వివరాలతో ఉన్న మీ ప్రొఫైల్ కార్డ్."},
            {"en": "Your message, exactly as you write it — nothing is rewritten or added.",
             "te": "మీరు రాసిన సందేశం అలాగే — దానికి ఏమీ కలపము, మార్చము."},
            {"en": "No phone number, no email, and no contact detail until they accept.",
             "te": "వారు అంగీకరించే వరకు ఫోన్ నంబర్, ఇమెయిల్ లేదా ఇతర సంప్రదింపు వివరాలు వెళ్లవు."},
        ],
        "next_steps": [
            {"step": "request_recorded", "en": "Your request is recorded with the message you wrote.",
             "te": "మీరు రాసిన సందేశంతో request నమోదు అవుతుంది."},
            {"step": "owner_notified", "en": "A notification is queued to the profile owner — delivery is not guaranteed.",
             "te": "ప్రొఫైల్ యజమానికి notification queue అవుతుంది — డెలివరీ హామీ లేదు."},
            {"step": "owner_decides", "en": "The owner accepts or declines; many requests receive no response.",
             "te": "యజమాని అంగీకరిస్తారు లేదా తిరస్కరిస్తారు; చాలా requests కి సమాధానం రాకపోవచ్చు."},
            {"step": "contact_on_accept", "en": "Only an accepted request opens contact access in your account views.",
             "te": "అంగీకరించిన request మాత్రమే మీ ఖాతా views లో contact access ఇస్తుంది."},
        ],
        "suggested_notes": _suggested_notes(sender, owner),
        "delivery_note_en": DELIVERY_NOTE_EN,
        "delivery_note_te": DELIVERY_NOTE_TE,
        "disclaimer_en": DISCLAIMER_EN,
        "disclaimer_te": DISCLAIMER_TE,
    }


def _is_today(value: Any) -> bool:
    text = str(value or "").strip()
    if not text:
        return False
    try:
        stamp = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return False
    if stamp.tzinfo is None:
        stamp = stamp.replace(tzinfo=timezone.utc)
    return stamp.astimezone(timezone.utc).date() == datetime.now(timezone.utc).date()


def _suggested_notes(sender: Dict, owner: Dict) -> List[Dict[str, str]]:
    """Opening lines built only from facts both members actually entered."""
    notes: List[Dict[str, str]] = []
    mine_city = str(sender.get("current_city") or sender.get("district") or "").strip()
    their_city = str(owner.get("current_city") or owner.get("district") or "").strip()
    my_work = str(sender.get("job") or sender.get("work_type") or "").strip()
    their_work = str(owner.get("job") or owner.get("work_type") or "").strip()
    their_education = str(owner.get("education") or "").strip()

    notes.append({
        "id": "polite_intro",
        "en": "Namaste. I came across your profile and it looked like a good match for our family's expectations. Would you be open to a conversation?",
        "te": "నమస్కారం. మీ ప్రొఫైల్ చూశాను, మా కుటుంబ అంచనాలకు సరిపోతుందని అనిపించింది. మాట్లాడేందుకు మీరు సిద్ధంగా ఉన్నారా?",
    })
    if mine_city and their_city and mine_city.casefold() == their_city.casefold():
        notes.append({
            "id": "same_city",
            "en": f"We are both in {their_city}, so meeting the families would be simple. Shall we talk?",
            "te": f"ఇద్దరం {their_city} లో ఉన్నాం, కాబట్టి కుటుంబాలు కలవడం సులభం. మాట్లాడొచ్చా?",
        })
    if my_work and their_work and my_work.casefold() == their_work.casefold():
        notes.append({
            "id": "same_field",
            "en": f"I also work in {their_work}, so I understand the work schedule that comes with it.",
            "te": f"నేను కూడా {their_work} రంగంలో పని చేస్తున్నాను, దాని పని వేళలు నాకు తెలుసు.",
        })
    if their_education:
        notes.append({
            "id": "education_respect",
            "en": f"Your {their_education} background stood out. I would like our families to speak once.",
            "te": f"మీ {their_education} నేపథ్యం నచ్చింది. మా కుటుంబాలు ఒకసారి మాట్లాడితే బాగుంటుంది.",
        })
    notes.append({
        "id": "family_first",
        "en": "I would like our families to speak before we decide anything. Please share your view when convenient.",
        "te": "ఏ నిర్ణయమైనా ముందు మా కుటుంబాలు మాట్లాడాలని అనుకుంటున్నాను. మీ అభిప్రాయం వీలైనప్పుడు తెలియజేయండి.",
    })
    return notes[:4]


# ---------------------------------------------------------------------------
# 4 · Request timeline — every step with the timestamp we really recorded
# ---------------------------------------------------------------------------
def request_timeline(rec: Optional[Dict]) -> Dict[str, Any]:
    """Status steps with timestamps; never invents a delivery or a reading time."""
    r = rec if isinstance(rec, dict) else {}
    status = str(r.get("status") or "pending")
    created_at = str(r.get("created_at") or "")
    status_at = str(r.get("status_at") or "")
    queue = r.get("notification_queue") if isinstance(r.get("notification_queue"), dict) else {}
    queued_at = str(queue.get("queued_at") or queue.get("recorded_at") or queue.get("created_at") or "")
    owner_queued = bool(queue.get("owner_queued"))
    responded = status in {"accepted", "declined", "expired", "withdrawn"}
    contact_granted = bool(r.get("contact_shared")) and status == "accepted"

    specs = [
        ("request_recorded", "📝", "Request recorded", "Request నమోదు అయ్యింది",
         bool(created_at), created_at,
         "Recorded on the service at the time shown — nothing else is claimed.",
         "పైన చూపిన సమయానికి సేవలో నమోదు అయ్యింది — ఇంకేమీ చెప్పడం లేదు."),
        ("owner_notification", "🔔", "Owner notification queued", "Owner notification queue అయ్యింది",
         owner_queued, queued_at, DELIVERY_NOTE_EN, DELIVERY_NOTE_TE),
        ("owner_response", "💬", f"Owner response: {status}", f"Owner స్పందన: {status}",
         responded, status_at if responded else "",
         "Shown only when the owner accepts or declines — silence is not shown as an answer."
         if not responded else "The owner's decision exactly as it was recorded.",
         "యజమాని అంగీకరించినా లేదా తిరస్కరించినా మాత్రమే చూపిస్తాం — సమాధానం లేకపోవడాన్ని సమాధానంగా చూపము."
         if not responded else "యజమాని నిర్ణయం నమోదైన విధంగానే చూపించబడింది."),
        ("contact_access", "🔓", "Contact access in accepted-request account views",
         "Accepted-request account views లో contact access",
         contact_granted, status_at if contact_granted else "",
         "Contact access follows an accepted request — never before it.",
         "అంగీకరించిన request తర్వాతే contact access — అంతకు ముందు కాదు."),
    ]
    steps = []
    for key, icon, label_en, label_te, done, at, note_en, note_te in specs:
        steps.append({
            "key": key,
            "step": key,                       # legacy key, kept for older readers
            "icon": icon,
            "label_en": label_en,
            "label_te": label_te,
            "en": label_en,                    # legacy keys, kept for older readers
            "te": label_te,
            "state": "completed" if done else "waiting",
            "done": bool(done),
            "at": at or "",
            "note_en": note_en,
            "note_te": note_te,
        })

    return {
        "request_id": str(r.get("request_id") or ""),
        "status": status,
        "created_at": created_at,
        "expires_at": str(r.get("expires_at") or ""),
        "steps": steps,
        "completed_steps": sum(1 for s in steps if s["done"]),
        "total_steps": len(steps),
        "note_en": "Only steps recorded by this service are shown, each with the time it was recorded.",
        "note_te": "ఈ సేవ నమోదు చేసిన దశలు మాత్రమే, నమోదైన సమయంతో చూపించబడతాయి.",
        "delivery_note_en": DELIVERY_NOTE_EN,
        "delivery_note_te": DELIVERY_NOTE_TE,
    }


# ---------------------------------------------------------------------------
# 5 · Member activity — this member's own numbers, from real timestamps
# ---------------------------------------------------------------------------
def member_activity(user: Optional[Dict], interests: Optional[List[Dict]] = None) -> Dict[str, Any]:
    u = user if isinstance(user, dict) else {}
    me = str(u.get("tsap_id") or "")
    rows = [r for r in (interests or []) if isinstance(r, dict)]

    sent = [r for r in rows if str(r.get("from_id") or "") == me]
    received = [r for r in rows if str(r.get("to_id") or "") == me]

    accepted = [r for r in sent if str(r.get("status") or "") == "accepted"]
    declined = [r for r in sent if str(r.get("status") or "") == "declined"]
    pending = [r for r in sent if str(r.get("status") or "") == "pending"]
    expired = [r for r in sent if str(r.get("status") or "") == "expired"]

    received_pending = [r for r in received if str(r.get("status") or "") == "pending"]
    received_accepted = [r for r in received if str(r.get("status") or "") == "accepted"]

    response_hours = []
    for rec in accepted + declined:
        hours = _hours_between(rec.get("created_at"), rec.get("status_at"))
        if hours is not None:
            response_hours.append(hours)
    response_hours.sort()
    median = response_hours[len(response_hours) // 2] if response_hours else None

    oldest_pending_hours = None
    for rec in pending:
        hours = _hours_between(rec.get("created_at"), _now_iso())
        if hours is not None:
            oldest_pending_hours = max(oldest_pending_hours or 0, hours)

    return {
        "tsap_id": me,
        "credits": int(u.get("credits", 0) or 0),
        "sent": {"total": len(sent), "pending": len(pending), "accepted": len(accepted),
                 "declined": len(declined), "expired": len(expired)},
        "received": {"total": len(received), "pending": len(received_pending),
                     "accepted": len(received_accepted)},
        "responded": len(accepted) + len(declined),
        "response_rate_percent": round(100.0 * (len(accepted) + len(declined)) / len(sent), 1) if sent else 0.0,
        "median_response_hours": round(median, 1) if median is not None else None,
        "oldest_pending_hours": round(oldest_pending_hours, 1) if oldest_pending_hours is not None else None,
        "sample_size": len(sent),
        # Small samples and silence are stated plainly rather than dressed up.
        "note_en": ("Counts come from this account only. A response rate from a handful of requests is not a "
                    "forecast, and no request is guaranteed a reply."),
        "note_te": ("ఈ లెక్కలు ఈ ఖాతాకు మాత్రమే. కొన్ని requests ఆధారంగా వచ్చే శాతం అంచనా కాదు; ఏ request కి "
                    "సమాధానం వస్తుందనే హామీ లేదు."),
        "small_sample": len(sent) < 5,
        "disclaimer_en": DISCLAIMER_EN,
        "disclaimer_te": DISCLAIMER_TE,
    }


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _hours_between(start: Any, end: Any) -> Optional[float]:
    start_text, end_text = str(start or "").strip(), str(end or "").strip()
    if not start_text or not end_text:
        return None

    def _parse(value: str):
        try:
            stamp = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
        return stamp if stamp.tzinfo else stamp.replace(tzinfo=timezone.utc)

    a, b = _parse(start_text), _parse(end_text)
    if not a or not b:
        return None
    hours = (b - a).total_seconds() / 3600.0
    return hours if hours >= 0 else None
