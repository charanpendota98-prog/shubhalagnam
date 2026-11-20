"""Test-only checks for public voice metadata, including generated path tokens."""
import json
import re

_PHONE = re.compile(r"(?<![\d•])[6-9]\d{9}(?!\d)")
_FIELDS = {"success", "tsap_id", "voice_url", "has_voice", "uploaded_at", "note_telugu"}


def voice_metadata_is_private(payload, expected_id):
    """Exclude only a validated generated media path from phone-text scanning.

    Opaque timestamp/random tokens can contain ten phone-shaped digits. Do not
    exempt query strings, foreign profile paths, free text or unknown fields.
    """
    if not isinstance(payload, dict) or set(payload) != _FIELDS:
        return False
    if payload["success"] is not True or payload["tsap_id"] != expected_id:
        return False
    url = payload["voice_url"]
    if not isinstance(url, str) or payload["has_voice"] is not bool(url):
        return False
    safe_id = re.sub(r"[^A-Z0-9-]", "", expected_id.strip().upper())[:24] or "admin"
    if url and not re.fullmatch(
        rf"/voice/{re.escape(safe_id)}-\d{{12}}-[0-9a-f]{{12}}\.(?:mp3|wav|ogg|oga|m4a|aac|webm)", url
    ):
        return False
    if not all(isinstance(payload[key], str) for key in ("uploaded_at", "note_telugu")):
        return False
    visible = {**payload, "voice_url": "<validated generated media path>" if url else ""}
    return not _PHONE.search(json.dumps(visible, ensure_ascii=False))
