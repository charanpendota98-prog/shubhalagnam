"""Short-lived, single-use contact reveal for the full profile page.

A member whose interest was accepted gets a 5-minute, single-use token.
The profile page turns it into a QR that encodes ONLY the resolve URL —
never the phone number or any private data. Resolving requires the same
member's session, works once, and returns a wa.me link plus the masked
number. Any failure is a refusal, never a leak. Revocation (block,
interest withdraw/decline, account deletion) kills outstanding tokens.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import os
import secrets
import threading
import time
from typing import Dict, List, Optional

from hardening import SECRET
from smart12 import mask_phone

TTL_SECONDS = int(os.environ.get("CONTACT_TOKEN_TTL_SEC", "300"))
_MAX_TOKENS = 5000

_CONTACT_TOKENS: Dict[str, Dict] = {}
_LOCK = threading.RLock()

_MESSAGES = {
    "not_mutual": ("Contact details unlock only after the profile owner accepts your interest.",
                   "ప్రొఫైల్ యజమాని మీ interest అంగీకరించిన తర్వాతే కాంటాక్ట్ వివరాలు అందుబాటులోకి వస్తాయి."),
    "blocked": ("Contact access is unavailable for this pair.",
                "ఈ జంటకు కాంటాక్ట్ యాక్సెస్ అందుబాటులో లేదు."),
    "expired": ("This contact QR has expired. Create a fresh one from the profile.",
                "ఈ కాంటాక్ట్ QR గడువు ముగిసింది. ప్రొఫైల్ నుండి కొత్తది తయారు చేయండి."),
    "already_used": ("This contact QR was already used. Create a fresh one from the profile.",
                     "ఈ కాంటాక్ట్ QR ఇప్పటికే వాడబడింది. ప్రొఫైల్ నుండి కొత్తది తయారు చేయండి."),
    "revoked": ("This contact access was withdrawn.",
                "ఈ కాంటాక్ట్ యాక్సెస్ ఉపసంహరించబడింది."),
    "bad_token": ("This contact link is not valid.",
                  "ఈ కాంటాక్ట్ లింక్ చెల్లదు."),
    "target_unavailable": ("Contact access is no longer available for this profile.",
                           "ఈ ప్రొఫైల్ కోసం కాంటాక్ట్ యాక్సెస్ ఇక అందుబాటులో లేదు."),
}


def message(reason: str) -> Dict[str, str]:
    en, te = _MESSAGES.get(reason, _MESSAGES["bad_token"])
    return {"reason": reason, "en": en, "te": te}


def is_mutual_accepted(interests: List[Dict], a: str, b: str) -> bool:
    """One accepted interest in either direction opens contact both ways,
    matching the existing unlock consent rule."""
    pair = {str(a).upper(), str(b).upper()}
    return any(
        str(i.get("status", "")).lower() == "accepted"
        and {str(i.get("from_id", "")).upper(), str(i.get("to_id", "")).upper()} == pair
        for i in interests
    )


def _sign(payload: str) -> str:
    return hmac.new(SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()[:32]


def _encode(viewer: str, target: str, exp: int, nonce: str) -> str:
    payload = f"{viewer}|{target}|{exp}|{nonce}"
    raw = f"{payload}|{_sign(payload)}"
    return base64.urlsafe_b64encode(raw.encode()).decode().rstrip("=")


def _decode(token: str) -> Optional[Dict]:
    try:
        raw = base64.urlsafe_b64decode(token + "=" * (-len(token) % 4)).decode()
        viewer, target, exp, nonce, sig = raw.rsplit("|", 4)
        payload = f"{viewer}|{target}|{exp}|{nonce}"
        if not hmac.compare_digest(sig, _sign(payload)):
            return None
        exp_i = int(exp)
        return {"viewer": viewer.upper(), "target": target.upper(), "exp": exp_i, "nonce": nonce}
    except (ValueError, TypeError, base64.binascii.Error, UnicodeDecodeError):
        return None


def _prune(now: float) -> None:
    # Drop only expired rows: a revoked-but-unexpired row must survive so
    # resolve can answer "withdrawn" precisely instead of a bare bad_token.
    stale = [t for t, row in _CONTACT_TOKENS.items() if row["exp"] <= now]
    for t in stale:
        _CONTACT_TOKENS.pop(t, None)
    if len(_CONTACT_TOKENS) > _MAX_TOKENS:
        oldest = sorted(_CONTACT_TOKENS, key=lambda t: _CONTACT_TOKENS[t]["created"])[: _MAX_TOKENS // 5]
        for t in oldest:
            _CONTACT_TOKENS.pop(t, None)


def issue_token(viewer: str, target: str) -> Dict:
    """Caller has already verified owner auth, mutual acceptance, no block,
    and that the target is active. Returns the token and its expiry."""
    viewer, target = viewer.upper(), target.upper()
    now = time.time()
    exp = int(now + TTL_SECONDS)
    nonce = secrets.token_urlsafe(9)
    token = _encode(viewer, target, exp, nonce)
    with _LOCK:
        _prune(now)
        _CONTACT_TOKENS[token] = {"viewer": viewer, "target": target, "exp": exp,
                                  "used": False, "revoked": False, "created": now}
    return {"ok": True, "token": token, "expires_in": TTL_SECONDS,
            "resolve_path": f"/api/contact/resolve/{token}"}


def invalidate_pair(a: str, b: str) -> int:
    """Revoke every outstanding token between two members (either direction).
    Called on block, interest decline/withdraw and account deletion."""
    pair = {str(a).upper(), str(b).upper()}
    n = 0
    with _LOCK:
        for row in _CONTACT_TOKENS.values():
            if {row["viewer"], row["target"]} == pair and not row.get("revoked"):
                row["revoked"] = True
                n += 1
    return n


def invalidate_member(tsap_id: str) -> int:
    """Revoke every token the member is part of (account deletion/ban)."""
    mid = str(tsap_id).upper()
    n = 0
    with _LOCK:
        for row in _CONTACT_TOKENS.values():
            if mid in (row["viewer"], row["target"]) and not row.get("revoked"):
                row["revoked"] = True
                n += 1
    return n


def resolve_token(token: str, caller_id: str, interests: List[Dict], is_blocked) -> Dict:
    """Single-use resolve. is_blocked(a, b) checks one direction; both are checked.
    Returns {'ok': True, 'wa_link', 'phone_masked'} or {'ok': False, **message(reason)}."""
    parsed = _decode(token)
    if not parsed:
        return {"ok": False, **message("bad_token")}
    if parsed["viewer"] != str(caller_id).upper():
        # Owner-gated endpoint also enforces this; keep the defence in depth.
        return {"ok": False, **message("bad_token")}
    now = time.time()
    with _LOCK:
        _prune(now)
        row = _CONTACT_TOKENS.get(token)
        if row is None:
            # Unknown to memory (restart, pruned or forged): never re-issue access.
            if parsed["exp"] <= now:
                return {"ok": False, **message("expired")}
            return {"ok": False, **message("bad_token")}
        if row.get("revoked"):
            return {"ok": False, **message("revoked")}
        if row["used"]:
            return {"ok": False, **message("already_used")}
        if row["exp"] <= now:
            return {"ok": False, **message("expired")}
        if is_blocked(row["viewer"], row["target"]) or is_blocked(row["target"], row["viewer"]):
            row["revoked"] = True
            return {"ok": False, **message("blocked")}
        if not is_mutual_accepted(interests, row["viewer"], row["target"]):
            row["revoked"] = True
            return {"ok": False, **message("revoked")}
        row["used"] = True
        pair = (row["viewer"], row["target"])
    return {"ok": True, "viewer": pair[0], "target": pair[1]}


def wa_link_for(phone: str) -> str:
    digits = "".join(ch for ch in str(phone or "") if ch.isdigit())
    if len(digits) == 10:
        digits = "91" + digits
    return f"https://wa.me/{digits}" if len(digits) >= 12 else ""


__all__ = ["TTL_SECONDS", "issue_token", "resolve_token", "invalidate_pair",
           "invalidate_member", "is_mutual_accepted", "wa_link_for", "message", "mask_phone"]
