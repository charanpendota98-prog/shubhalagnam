"""Dropped profile_for + dead diet preference repair: storage, validation, exposure, evaluation.

Covers the first missing-options slice:
- registration accepts and stores optional profile_for / diet (rejects invalid values);
- unset fields stay unknown (empty, never inferred or backfilled);
- /api/profile/update round-trips both fields with the same choice validation;
- safe_user exposes the stored self-declared facts;
- the previously stored-but-ignored diet partner preference now produces a
  factual preference check against the candidate's own diet.

Run directly with ``python test_profile_for_diet_repair.py``.
"""
from __future__ import annotations

import os
import sys
import unittest

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("ENV", "test")
os.environ["TSAP_AUTH_MODE"] = "enforce"
os.environ.setdefault("TSAP_AUTH_SECRET", "profile-for-diet-test-secret-not-for-production")
os.environ.setdefault("OTP_DEV_MODE", "true")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from test_storage import isolate_test_stores  # noqa: E402

isolate_test_stores("profile-for-diet-repair")

from fastapi.testclient import TestClient  # noqa: E402

import hardening  # noqa: E402
import interest  # noqa: E402
import main  # noqa: E402
import topmatch  # noqa: E402
from testutil_photos import TEST_PROFILE_PHOTO  # noqa: E402

client = TestClient(main.app, raise_server_exceptions=False)


def form(phone: str) -> dict[str, str]:
    return {
        "gender": "Bride",
        "full_name": "Repair Member " + "".join(chr(65 + int(d)) for d in phone[-4:]),
        "dob": "1998-01-15",
        "password": "secure-pass-123",
        "height": "5'5\"",
        "marital_status": "Pelli Kaledu",
        "religion": "Hindu",
        "caste": "Reddy",
        "state": "TS",
        "district": "Hyderabad",
        "phone": phone,
        "photo_private": "true",
        "photo_consent_confirmed": "true",
        "consent_confirmed": "true",
    }


def register(phone: str, **extra):
    payload = form(phone)
    payload.update(extra)
    return client.post(
        "/api/register",
        data=payload,
        files={"photo_file": ("profile.png", TEST_PROFILE_PHOTO, "image/png")},
    )


def headers(tsap_id: str) -> dict[str, str]:
    token = hardening.sign_token(tsap_id)
    return {"Authorization": f"Bearer {token}", "X-TSAP-Token": token}


def member(tsap_id, gender="Groom", **extra):
    base = {
        "tsap_id": tsap_id, "full_name": f"Member {tsap_id}", "gender": gender,
        "phone": f"8{tsap_id[-9:]}", "age": 30, "height": "5'8\"",
        "marital_status": "Pelli Kaledu", "religion": "Hindu", "caste": "Reddy",
        "state": "TS", "district": "Hyderabad", "education": "B.Tech", "job": "Software",
        "status": "active", "approved": True, "is_approved": True,
        "photo_status": "approved", "photo_url": "", "created_at": "2026-01-01T00:00:00",
    }
    base.update(extra)
    return base


class RegistrationStorageTest(unittest.TestCase):
    def test_register_stores_profile_for_and_diet(self):
        response = register("9912002001", profile_for="Parents", diet="Vegetarian")
        self.assertEqual(response.status_code, 200, response.text)
        tsap_id = response.json()["tsap_id"]
        user = next(u for u in main.DB_USERS if u["tsap_id"] == tsap_id)
        self.assertEqual(user["profile_for"], "Parents")
        self.assertEqual(user["diet"], "Vegetarian")

    def test_register_rejects_invalid_values(self):
        response = register("9912002002", profile_for="Cousin")
        self.assertIn(response.status_code, (400, 422), response.text)
        self.assertFalse(any(u.get("phone") == "9912002002" for u in main.DB_USERS))
        response = register("9912002003", diet="Eggetarian")
        self.assertIn(response.status_code, (400, 422), response.text)
        self.assertFalse(any(u.get("phone") == "9912002003" for u in main.DB_USERS))

    def test_unset_stays_unknown(self):
        response = register("9912002004")
        self.assertEqual(response.status_code, 200, response.text)
        tsap_id = response.json()["tsap_id"]
        user = next(u for u in main.DB_USERS if u["tsap_id"] == tsap_id)
        self.assertEqual(user["profile_for"], "")
        self.assertEqual(user["diet"], "")


class UpdateRoundtripTest(unittest.TestCase):
    def _new_member(self, tsap_id):
        row = member(tsap_id, "Bride")
        main.DB_USERS.append(row)
        return row

    def test_update_roundtrip(self):
        row = self._new_member("MVPFDT0001")
        response = client.post(
            "/api/profile/update",
            json={"tsap_id": row["tsap_id"], "profile_for": "Self", "diet": "Non-Vegetarian"},
            headers=headers(row["tsap_id"]),
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(row["profile_for"], "Self")
        self.assertEqual(row["diet"], "Non-Vegetarian")
        self.assertEqual(response.json()["profile"]["diet"], "Non-Vegetarian")

    def test_update_rejects_invalid_and_preserves_record(self):
        row = self._new_member("MVPFDT0002")
        response = client.post(
            "/api/profile/update",
            json={"tsap_id": row["tsap_id"], "diet": "Vegan"},
            headers=headers(row["tsap_id"]),
        )
        self.assertEqual(response.status_code, 400, response.text)
        self.assertEqual(row.get("diet", ""), "")
        response = client.post(
            "/api/profile/update",
            json={"tsap_id": row["tsap_id"], "profile_for": "Neighbor"},
            headers=headers(row["tsap_id"]),
        )
        self.assertEqual(response.status_code, 400, response.text)
        self.assertNotIn("profile_for", row)

    def test_owner_auth_required(self):
        row = self._new_member("MVPFDT0003")
        response = client.post(
            "/api/profile/update",
            json={"tsap_id": row["tsap_id"], "diet": "Vegetarian"},
        )
        self.assertIn(response.status_code, (401, 403), response.text)
        self.assertEqual(row.get("diet", ""), "")


class SafeUserExposureTest(unittest.TestCase):
    def test_safe_user_exposes_self_declared_facts(self):
        exposed = interest.safe_user(member("MVPFDT0010", diet="Vegetarian", profile_for="Parents"))
        self.assertEqual(exposed["diet"], "Vegetarian")
        self.assertEqual(exposed["profile_for"], "Parents")

    def test_safe_user_empty_when_unset(self):
        exposed = interest.safe_user(member("MVPFDT0011"))
        self.assertEqual(exposed["diet"], "")
        self.assertEqual(exposed["profile_for"], "")


class DietPreferenceEvaluationTest(unittest.TestCase):
    def setUp(self):
        for row in main.DB_USERS:
            row["is_approved"] = False
        main.DB_USERS.extend([
            member("MVPFDT0020", "Bride"),
            member("MVPFDT0021", diet="Vegetarian"),
            member("MVPFDT0022", diet="Non-Vegetarian"),
            member("MVPFDT0023"),  # unset diet stays unknown
        ])

    def test_diet_preference_produces_factual_checks(self):
        response = client.post(
            "/api/profile/preferences",
            json={"tsap_id": "MVPFDT0020", "diet": "Vegetarian", "marital_statuses": ["Any"]},
            headers=headers("MVPFDT0020"),
        )
        self.assertEqual(response.status_code, 200, response.text)
        response = client.get("/api/profile/preferences", params={"tsap_id": "MVPFDT0020"}, headers=headers("MVPFDT0020"))
        self.assertEqual(response.status_code, 200, response.text)
        checks_by_id = {}
        for candidate in response.json()["preview_matches"]:
            checks = {c["key"]: c for c in candidate.get("preference_checks", [])}
            checks_by_id[candidate["tsap_id"]] = checks
        veg = checks_by_id["MVPFDT0021"]["diet"]
        self.assertEqual(veg["status"], "met")
        nonveg = checks_by_id["MVPFDT0022"]["diet"]
        self.assertEqual(nonveg["status"], "not_met")
        # Unset candidate diet earns no check at all (never inferred).
        self.assertNotIn("diet", checks_by_id.get("MVPFDT0023", {}))

    def test_profile_view_diet_comparison(self):
        viewer = member("MVPFDT0030", "Bride", exp_filters={"diet": "Vegetarian"})
        veg = topmatch.score_match_v2(viewer, member("MVPFDT0031", diet="Vegetarian"))["preferences"]
        self.assertEqual([r["status"] for r in veg if r["key"] == "diet"], ["met"])
        nonveg = topmatch.score_match_v2(viewer, member("MVPFDT0032", diet="Non-Vegetarian"))["preferences"]
        self.assertEqual([r["status"] for r in nonveg if r["key"] == "diet"], ["not_met"])
        unset = topmatch.score_match_v2(viewer, member("MVPFDT0033"))["preferences"]
        self.assertNotIn("diet", [r["key"] for r in unset])
        any_diet = topmatch.score_match_v2(member("MVPFDT0034", "Bride", exp_filters={"diet": "Any"}), member("MVPFDT0035", diet="Vegan"))["preferences"]
        self.assertNotIn("diet", [r["key"] for r in any_diet])

    def test_saved_preference_reaches_exp_filters(self):
        response = client.post(
            "/api/profile/preferences",
            json={"tsap_id": "MVPFDT0020", "diet": "Vegetarian", "marital_statuses": ["Any"]},
            headers=headers("MVPFDT0020"),
        )
        self.assertEqual(response.status_code, 200, response.text)
        viewer = next(u for u in main.DB_USERS if u["tsap_id"] == "MVPFDT0020")
        self.assertEqual(viewer["exp_filters"]["diet"], "Vegetarian")

    def test_any_diet_produces_no_check(self):
        response = client.post(
            "/api/profile/preferences",
            json={"tsap_id": "MVPFDT0020", "diet": "Any", "marital_statuses": ["Any"]},
            headers=headers("MVPFDT0020"),
        )
        self.assertEqual(response.status_code, 200, response.text)
        response = client.get("/api/profile/preferences", params={"tsap_id": "MVPFDT0020"}, headers=headers("MVPFDT0020"))
        for candidate in response.json()["preview_matches"]:
            keys = {c["key"] for c in candidate.get("preference_checks", [])}
            self.assertNotIn("diet", keys)


if __name__ == "__main__":
    unittest.main(verbosity=2)
