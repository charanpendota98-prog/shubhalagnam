"""Deterministic guards against the former random-filename phone false positive."""
from voice_test_helpers import voice_metadata_is_private

base = {"success": True, "tsap_id": "TEST-1", "voice_url": "/voice/TEST-1-261120031500-a9848012345b.mp3", "has_voice": True, "uploaded_at": "2026-11-20T03:15:00", "note_telugu": "Synthetic voice note"}
assert voice_metadata_is_private(base, "TEST-1")
assert voice_metadata_is_private({**base, "voice_url": "", "has_voice": False, "uploaded_at": ""}, "TEST-1")
assert not voice_metadata_is_private({**base, "phone": "9848012345"}, "TEST-1")
assert not voice_metadata_is_private({**base, "note_telugu": "Call 9848012345"}, "TEST-1")
assert not voice_metadata_is_private({**base, "voice_url": base["voice_url"] + "?phone=9848012345"}, "TEST-1")
assert not voice_metadata_is_private({**base, "voice_url": base["voice_url"].replace("TEST-1", "OTHER")}, "TEST-1")
assert not voice_metadata_is_private({**base, "voice_url": "/voice/9848012345.mp3"}, "TEST-1")
assert not voice_metadata_is_private({**base, "has_voice": "true"}, "TEST-1")
assert not voice_metadata_is_private({**base, "tsap_id": "OTHER"}, "TEST-1")
assert not voice_metadata_is_private({**base, "uploaded_at": "9848012345"}, "TEST-1")
print("10 deterministic voice-metadata privacy checks passed")
