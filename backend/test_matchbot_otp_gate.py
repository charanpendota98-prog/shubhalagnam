"""The assistant's OTP next-step must match what this deployment can deliver.

`assistant_tips()` used to append the P6 "verify" tip to every member without
`phone_verified`, pointing at `/login` with an "OTP తో phone ధృవీకరించండి"
instruction. The supported production deployment has `phone_otp=False` in
`auth_policy.capabilities()` and main.py refuses to issue a code for exactly that
reason — so the tip described a step nobody could complete, and it surfaced in
the /me next-steps card.

These tests pin both sides of the gate.
"""
from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))

import auth_policy as AUTH_POLICY  # noqa: E402
import matchbot  # noqa: E402

UNVERIFIED_MEMBER = {
    "tsap_id": "TSAP-TEST-P6",
    "full_name": "Example Member",
    "gender": "Bride",
    "phone": "9876543210",
    "phone_verified": False,
    # Fully-filled profile and a photo, so P1/P2 stay quiet and the only
    # optional nudge left on the table is P6.
    "photo_url": "/media/example.jpg",
}

COMPLETE_BRIEFING = {
    "nudge": {"percent": 92, "level": "excellent"},
    "mutual": {},
    "matches": [],
}

OTP_ON = {"phone_otp": True}
OTP_OFF = {"phone_otp": False}


class AssistantTipsOtpGateTests(unittest.TestCase):
    def _kinds(self, capabilities: dict) -> list[str]:
        with patch.object(AUTH_POLICY, "capabilities", return_value=capabilities):
            tips = matchbot.assistant_tips(dict(UNVERIFIED_MEMBER), dict(COMPLETE_BRIEFING))
        return [tip["kind"] for tip in tips]

    def test_verify_tip_is_offered_when_phone_otp_is_available(self) -> None:
        kinds = self._kinds(OTP_ON)
        self.assertIn("verify", kinds)

        with patch.object(AUTH_POLICY, "capabilities", return_value=OTP_ON):
            tips = matchbot.assistant_tips(dict(UNVERIFIED_MEMBER), dict(COMPLETE_BRIEFING))
        verify = next(tip for tip in tips if tip["kind"] == "verify")
        self.assertEqual(verify["priority"], 3)
        self.assertEqual(verify["cta"], "/login")
        self.assertIn("OTP", verify["telugu"])
        self.assertIn("OTP", verify["en"])
        self.assertIn("identity", verify["en"].lower())

    def test_verify_tip_is_absent_when_phone_otp_is_unavailable(self) -> None:
        kinds = self._kinds(OTP_OFF)
        self.assertNotIn("verify", kinds)
        # The rest of the checklist is untouched by the gate.
        self.assertTrue(kinds, "a complete profile should still get the fallback tip")
        self.assertIn("all_good", kinds)

    def test_verified_member_never_gets_the_tip(self) -> None:
        member = {**UNVERIFIED_MEMBER, "phone_verified": True}
        for capabilities in (OTP_ON, OTP_OFF):
            with self.subTest(phone_otp=capabilities["phone_otp"]):
                with patch.object(AUTH_POLICY, "capabilities", return_value=capabilities):
                    kinds = [t["kind"] for t in matchbot.assistant_tips(dict(member), dict(COMPLETE_BRIEFING))]
                self.assertNotIn("verify", kinds)

    def test_supported_deployment_reports_otp_off_so_the_tip_is_gated_out(self) -> None:
        """End to end against the real policy: no OTP capability → no OTP tip."""
        capabilities = AUTH_POLICY.capabilities(os.environ)
        self.assertFalse(capabilities["phone_otp"], "the supported deployment must not advertise phone OTP")
        with patch.dict(os.environ, {}, clear=True):
            self.assertFalse(matchbot._phone_otp_available())
        kinds = [t["kind"] for t in matchbot.assistant_tips(dict(UNVERIFIED_MEMBER), dict(COMPLETE_BRIEFING))]
        self.assertNotIn("verify", kinds)

    def test_capability_lookup_failure_omits_the_tip(self) -> None:
        """A broken policy module must never resurrect an unusable next step."""
        with patch.object(AUTH_POLICY, "capabilities", side_effect=RuntimeError("boom")):
            kinds = [t["kind"] for t in matchbot.assistant_tips(dict(UNVERIFIED_MEMBER), dict(COMPLETE_BRIEFING))]
        self.assertNotIn("verify", kinds)


if __name__ == "__main__":
    unittest.main(verbosity=2)
