"""Public profile visibility regressions; all persistence is isolated from live stores."""
from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

BACKEND_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_DIR))

os.environ["WA_TEST_FAST"] = "0"
os.environ["TSAP_AUTH_MODE"] = "enforce"
os.environ.setdefault("OTP_DEV_MODE", "true")
from test_storage import isolate_test_stores  # noqa: E402

isolate_test_stores("public-profile-visibility")

import main  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


class PublicProfileVisibilityTests(unittest.TestCase):
    profile_id = "TSAP-TEST-VISIBILITY-1"

    def setUp(self) -> None:
        self.profile = {
            "tsap_id": self.profile_id,
            "full_name": "Visibility Test Profile",
            "gender": "Bride",
            "age": 28,
            "caste": "Reddy",
            "district": "Hyderabad",
            "state": "TS",
            "education": "Member-entered test education",
            "job": "Member-entered test work",
            "phone": "9999900001",
            "status": "approved",
            "is_approved": True,
            "is_active": True,
            "photo_status": "approved",
            "photo_url": "/photos/visibility-test.jpg",
            "photo_urls": ["/photos/visibility-test.jpg"],
            "photo_private": False,
            "privacy_mode": "public",
        }
        self.client = TestClient(main.app, raise_server_exceptions=False)
        self.client.__enter__()
        self.addCleanup(self.client.__exit__, None, None, None)
        # App startup may restore the isolated test store; inject the fixture afterwards.
        main.DB_USERS[:] = [u for u in main.DB_USERS if u.get("tsap_id") != self.profile_id]
        main.DB_USERS.append(self.profile)
        main._reindex_users()

    def test_deactivation_removes_profile_from_public_search_but_owner_can_access_it(self) -> None:
        public = self.client.get(f"/api/search/{self.profile_id}")
        self.assertEqual(public.status_code, 200)
        self.assertEqual(self.client.get(f"/api/astro/chart/{self.profile_id}").status_code, 200)
        cards_dir = Path(main.CARD_MEDIA_DIR)
        cards_dir.mkdir(parents=True, exist_ok=True)
        card_path = cards_dir / f"{self.profile_id}.png"
        card_path.write_bytes(b"card-test-bytes")
        self.addCleanup(lambda: card_path.unlink(missing_ok=True))
        self.assertEqual(self.client.get(f"/cards/{self.profile_id}.png").status_code, 200)

        self.profile["is_active"] = False
        self.profile["is_approved"] = False
        self.profile["status"] = "deleted"
        public_after_hide = self.client.get(f"/api/search/{self.profile_id}")
        self.assertEqual(public_after_hide.status_code, 404)
        listing = self.client.get("/api/search?limit=100")
        self.assertEqual(listing.status_code, 200)
        self.assertNotIn(self.profile_id, {row["tsap_id"] for row in listing.json()["results"]})
        self.assertEqual(self.client.get(f"/api/astro/chart/{self.profile_id}").status_code, 404)
        self.assertEqual(self.client.get(f"/api/astro/dosha/{self.profile_id}").status_code, 404)
        self.assertEqual(self.client.get(f"/cards/{self.profile_id}.png").status_code, 404)

        owner = self.client.get(
            f"/api/search/{self.profile_id}",
            headers={"X-Tsap-Token": main.sign_token(self.profile_id)},
        )
        self.assertEqual(owner.status_code, 200)
        self.assertEqual(owner.json()["profile"]["tsap_id"], self.profile_id)
        owner_headers = {"X-Tsap-Token": main.sign_token(self.profile_id)}
        self.assertEqual(self.client.get(f"/api/astro/chart/{self.profile_id}", headers=owner_headers).status_code, 200)
        self.assertEqual(self.client.get(f"/cards/{self.profile_id}.png", headers=owner_headers).status_code, 200)

    def test_photo_visibility_is_rechecked_and_photo_status_is_owner_only(self) -> None:
        self.profile["photo_private"] = True
        self.profile["privacy_mode"] = "private"
        hidden_photo = self.client.get(f"/api/search/{self.profile_id}")
        self.assertEqual(hidden_photo.status_code, 200)
        public_profile = hidden_photo.json()["profile"]
        self.assertEqual(public_profile["photo_url"], "")
        self.assertEqual(public_profile["photo_urls"], [])
        self.assertFalse(public_profile["has_photo"])
        self.assertNotIn("photo_status", public_profile)

        unauthenticated_status = self.client.get(f"/api/photo/status/{self.profile_id}")
        self.assertEqual(unauthenticated_status.status_code, 401)
        owner_status = self.client.get(
            f"/api/photo/status/{self.profile_id}",
            headers={"X-Tsap-Token": main.sign_token(self.profile_id)},
        )
        self.assertEqual(owner_status.status_code, 200)

    def test_uploaded_review_media_requires_owner_or_moderator(self) -> None:
        photos_dir = Path(main.PHOTO_MEDIA_DIR)
        photos_dir.mkdir(parents=True, exist_ok=True)
        filename = f"privacy-guard-{uuid4().hex}.jpg"
        photo_path = photos_dir / filename
        photo_path.write_bytes(b"not-an-image-but-sufficient-for-route-auth")
        self.addCleanup(lambda: photo_path.unlink(missing_ok=True))
        self.profile.update({
            "photo_url": f"/photos/{filename}",
            "photo_urls": [],
            "photo_status": "pending",
            "photo_private": False,
            "privacy_mode": "public",
        })

        raw_public = self.client.get(f"/photos/{filename}")
        self.assertEqual(raw_public.status_code, 404)
        wrong_owner = self.client.get(
            f"/photos/{filename}",
            headers={"X-Tsap-Token": main.sign_token("TSAP-OTHER-OWNER")},
        )
        self.assertEqual(wrong_owner.status_code, 404)
        owner = self.client.get(
            f"/photos/{filename}",
            headers={"X-Tsap-Token": main.sign_token(self.profile_id)},
        )
        self.assertEqual(owner.status_code, 200)
        self.assertEqual(owner.headers.get("cache-control"), "private, no-store")

        admin_headers = {"X-Admin-Key": main.TSAP_ADMIN_KEY}
        queue = self.client.get("/api/admin/photos/pending", headers=admin_headers)
        self.assertEqual(queue.status_code, 200)
        item = next(row for row in queue.json()["queue"] if row.get("tsap_id") == self.profile_id)
        self.assertIn("/api/admin/photos/", item["url"])
        self.assertNotEqual(item["url"], f"/photos/{filename}")
        review_bytes = self.client.get(item["url"], headers=admin_headers)
        self.assertEqual(review_bytes.status_code, 200)
        self.assertEqual(review_bytes.headers.get("cache-control"), "private, no-store")

    def test_private_approved_photo_is_not_publicly_fetchable(self) -> None:
        photos_dir = Path(main.PHOTO_MEDIA_DIR)
        photos_dir.mkdir(parents=True, exist_ok=True)
        filename = f"privacy-private-{uuid4().hex}.jpg"
        photo_path = photos_dir / filename
        photo_path.write_bytes(b"private-test-bytes")
        self.addCleanup(lambda: photo_path.unlink(missing_ok=True))
        self.profile.update({
            "photo_url": f"/photos/{filename}",
            "photo_urls": [f"/photos/{filename}"],
            "photo_status": "approved",
            "photo_private": True,
            "privacy_mode": "private",
        })
        public_photo = self.client.get(f"/photos/{filename}")
        self.assertEqual(public_photo.status_code, 404)
        owner_photo = self.client.get(
            f"/photos/{filename}",
            headers={"X-Tsap-Token": main.sign_token(self.profile_id)},
        )
        self.assertEqual(owner_photo.status_code, 200)

    def test_published_cms_media_is_public_only_after_explicit_publish(self) -> None:
        photos_dir = Path(main.PHOTO_MEDIA_DIR)
        photos_dir.mkdir(parents=True, exist_ok=True)
        filename = f"cms-public-{uuid4().hex}.jpg"
        photo_path = photos_dir / filename
        photo_path.write_bytes(b"published-cms-test-bytes")
        self.addCleanup(lambda: photo_path.unlink(missing_ok=True))
        photo_url = f"/photos/{filename}"
        created = main.CMS.upsert_story(
            "", "Test Groom", "Test Bride", photo_url, published=False,
        )
        story_id = created["story"]["id"]
        self.addCleanup(lambda: main.CMS.delete_item("story", story_id))

        self.assertEqual(self.client.get(photo_url).status_code, 404)
        main.CMS.upsert_story(story_id, "Test Groom", "Test Bride", photo_url, published=True)
        published_photo = self.client.get(photo_url)
        self.assertEqual(published_photo.status_code, 200)
        self.assertEqual(published_photo.headers.get("cache-control"), "public, max-age=3600")

    def test_external_photo_urls_are_not_returned_or_used_for_photo_only_search(self) -> None:
        self.profile["photo_url"] = "https://images.invalid/member.jpg"
        self.profile["photo_urls"] = ["https://images.invalid/member.jpg"]
        response = self.client.get(f"/api/search/{self.profile_id}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["profile"]["photo_url"], "")
        self.assertFalse(response.json()["profile"]["has_photo"])

        photo_only = self.client.get("/api/search?photo_only=true&limit=100")
        self.assertEqual(photo_only.status_code, 200)
        self.assertNotIn(self.profile_id, {row["tsap_id"] for row in photo_only.json()["results"]})

    def test_weekly_showcase_rechecks_active_approval(self) -> None:
        with tempfile.TemporaryDirectory(prefix="mv-showcase-test-") as temp_dir:
            showcase_file = Path(temp_dir) / "showcase.json"
            week = main._week_key()
            showcase_file.write_text(json.dumps({week: {"ids": [self.profile_id], "caste": "Reddy"}}), encoding="utf-8")
            with patch.object(main, "SHOWCASE_FILE", str(showcase_file)):
                self.assertEqual(main.showcase_public()["count"], 1)
                self.profile["is_active"] = False
                self.profile["is_approved"] = False
                self.assertEqual(main.showcase_public()["count"], 0)


if __name__ == "__main__":
    unittest.main()
