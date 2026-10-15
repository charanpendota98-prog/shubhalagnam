"""Focused spotlight regressions; all persistence is a disposable local fixture.

Run from ``backend/`` with ``python -m unittest test_spotlight -v``. No network,
production database, payment provider, or real member record is accessed.
"""
from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import spotlight  # noqa: E402


class SpotlightTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory(prefix="mv-test-spotlight-")
        self.file = Path(self.temp_dir.name) / "spotlight-fixture.json"
        self.file.write_text("[]", encoding="utf-8")
        self.patch_file = patch.object(spotlight, "SPOTLIGHT_FILE", str(self.file))
        self.patch_file.start()
        self.addCleanup(self.patch_file.stop)
        self.addCleanup(self.temp_dir.cleanup)

    def submit(self, *, plan: str = "SPOT_7", utr: str = "123456789012",
               consent_confirmed: bool = True, video_url: str = "https://youtu.be/abcdefghijk",
               user_overrides: dict | None = None, photo_url: str = "") -> dict:
        user = {
            "tsap_id": "TSAP-TEST-SPOTLIGHT",
            "full_name": "Test Member",
            "gender": "Bride",
            "status": "approved",
            "is_approved": True,
            "is_active": True,
            "photo_status": "approved",
            "photo_private": False,
            "privacy_mode": "public",
            "age": 28,
            "caste": "Reddy",
            "district": "Hyderabad",
            "education": "Member-entered education",
            "job": "Member-entered work",
            "income": "private fixture only",
            "phone": "9999999999",
            "photo_url": "/photos/test-profile.jpg",
        }
        user.update(user_overrides or {})
        return spotlight.create_spotlight_submission(
            user=user,
            plan_code=plan,
            headline="Test-only headline",
            pitch_text="Test-only introduction text.",
            photo_url=photo_url,
            video_url=video_url,
            payment_mode="manual_upi",
            payment_ref=utr,
            consent_confirmed=consent_confirmed,
            auto_approve=False,
        )

    def test_public_placement_requires_payment_and_media_review_and_minimizes_fields(self) -> None:
        item = self.submit()
        self.assertEqual(item["status"], "pending_review")
        self.assertTrue(item["publication_consent"])
        self.assertEqual(item["publication_consent_version"], "spotlight-public-placement-v1")
        self.assertEqual(item["photo_url"], "/photos/test-profile.jpg")
        self.assertEqual(item["video_url"], "https://www.youtube-nocookie.com/embed/abcdefghijk")
        self.assertEqual(spotlight.get_active_spotlights(), [])
        with self.assertRaisesRegex(ValueError, "Verify the payment"):
            spotlight.moderate_spotlight(item["promo_id"], "approve", notes="Reviewed media carefully.")

        spotlight.moderate_spotlight(
            item["promo_id"], "verify_payment", moderator="test-admin",
            notes="Test fixture UTR matched to isolated test ledger.",
        )
        with self.assertRaisesRegex(ValueError, "profile/media review"):
            spotlight.moderate_spotlight(item["promo_id"], "approve", notes="")

        spotlight.moderate_spotlight(
            item["promo_id"], "approve", moderator="test-admin",
            notes="Test fixture headline and media reviewed; not identity verification.",
        )
        public = spotlight.get_active_spotlights(limit=6)
        self.assertEqual(len(public), 1)
        row = public[0]
        self.assertEqual(row["promo_id"], item["promo_id"])
        self.assertEqual(row["tsap_id"], "TSAP-TEST-SPOTLIGHT")
        self.assertEqual(row["badge_text_te"], spotlight.SPOTLIGHT_TIERS["SPOT_7"]["badge_te"])
        self.assertEqual(
            set(row),
            {
                "promo_id", "tsap_id", "full_name", "gender", "age", "caste", "subcaste", "district",
                "education", "job", "height", "badge_text", "badge_text_te", "headline",
                "pitch_text", "photo_url", "video_url",
            },
        )
        for private_or_unsupported in (
            "phone", "income", "payment_ref", "payment_mode", "amount_due", "amount_paid",
            "contact_opt", "moderator_notes", "media_review_note", "views_count",
            "clicks_count", "interests_count", "approved_at", "expires_at",
        ):
            self.assertNotIn(private_or_unsupported, row)

    def test_application_requires_approved_profile_and_explicit_publication_consent(self) -> None:
        with self.assertRaisesRegex(ValueError, "active, approved"):
            self.submit(utr="123456789013", user_overrides={"is_approved": False, "status": "pending"})
        with self.assertRaisesRegex(ValueError, "Confirm that the profile fields"):
            self.submit(utr="123456789014", consent_confirmed=False)

    def test_private_photos_and_untrusted_media_links_fail_closed(self) -> None:
        private_photo = self.submit(
            utr="123456789015",
            user_overrides={"photo_private": True, "privacy_mode": "private"},
        )
        self.assertEqual(private_photo["photo_url"], "")
        with self.assertRaisesRegex(ValueError, "existing, approved public"):
            self.submit(utr="123456789016", photo_url="https://images.example/fake.jpg")
        with self.assertRaisesRegex(ValueError, "valid HTTPS YouTube"):
            self.submit(utr="123456789017", video_url="https://evil-youtube.com/watch?v=abcdefghijk")
        self.assertEqual(spotlight._clean_video_url("http://youtu.be/abcdefghijk"), "")
        self.assertEqual(spotlight._profile_photo_url("/photos/../private.jpg"), "")

    def test_same_utr_cannot_be_submitted_for_multiple_placements(self) -> None:
        self.submit(utr="123456789018")
        with self.assertRaisesRegex(ValueError, "already been submitted"):
            self.submit(utr="123456789018")

    def test_tracking_only_counts_whitelisted_events_on_active_paid_placements(self) -> None:
        item = self.submit(utr="987654321012")
        self.assertFalse(spotlight.record_spotlight_interaction(item["promo_id"], "click"))
        self.assertFalse(spotlight.record_spotlight_interaction(item["promo_id"], "invented"))
        spotlight.moderate_spotlight(
            item["promo_id"], "verify_payment", notes="Test fixture UTR matched to isolated test ledger."
        )
        spotlight.moderate_spotlight(
            item["promo_id"], "approve", notes="Test fixture profile and media reviewed by local test."
        )
        self.assertTrue(spotlight.record_spotlight_interaction(item["promo_id"], "click"))
        rows = json.loads(self.file.read_text(encoding="utf-8"))
        self.assertEqual(rows[0]["clicks_count"], 1)
        self.assertFalse(spotlight.record_spotlight_interaction("UNKNOWN-TEST-ID", "click"))
        spotlight.moderate_spotlight(item["promo_id"], "close")
        self.assertFalse(spotlight.record_spotlight_interaction(item["promo_id"], "click"))

    def test_bad_or_expired_dates_fail_closed(self) -> None:
        item = self.submit(utr="111122223333")
        spotlight.moderate_spotlight(
            item["promo_id"], "verify_payment", notes="Test fixture UTR matched to isolated test ledger."
        )
        spotlight.moderate_spotlight(
            item["promo_id"], "approve", notes="Test fixture profile and media reviewed by local test."
        )
        rows = json.loads(self.file.read_text(encoding="utf-8"))
        rows[0]["expires_at"] = "not-a-date"
        self.file.write_text(json.dumps(rows), encoding="utf-8")
        self.assertEqual(spotlight.get_active_spotlights(), [])
        self.assertEqual(json.loads(self.file.read_text(encoding="utf-8"))[0]["status"], "expired")
        self.assertFalse(spotlight.record_spotlight_interaction(item["promo_id"], "view"))

    def test_tier_copy_is_bilingual_and_does_not_promise_reach_or_metrics(self) -> None:
        for tier in spotlight.SPOTLIGHT_TIERS.values():
            self.assertTrue(tier["perks_en"])
            self.assertTrue(tier["perks_te"])
            terms = " ".join(tier["perks_en"]).casefold()
            self.assertNotIn("view count", terms)
            self.assertNotIn("click count", terms)
            self.assertNotIn("more people", terms)
            self.assertIn("reach", terms)
            self.assertIn("badge_te", tier)


if __name__ == "__main__":
    unittest.main()
