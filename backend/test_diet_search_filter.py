"""Diet search filter: /api/search narrowing, saved-search keys, alert matching.

Covers the diet crossflow completion slice:
- /api/search?diet= narrows to members whose self-declared diet matches;
- multi-value (comma) selections match any listed value, case-insensitively;
- members who never set a diet stay unknown and never match a selection;
- saved searches keep the diet key (normalize_filters) and the saved-search
  alert matcher (matches_filters) plus the digest matcher apply it.

Run directly with ``python test_diet_search_filter.py``.
"""
from __future__ import annotations

import os
import sys
import unittest

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("ENV", "test")
os.environ["TSAP_AUTH_MODE"] = "enforce"
os.environ.setdefault("TSAP_AUTH_SECRET", "diet-search-filter-test-secret-not-for-production")
os.environ.setdefault("OTP_DEV_MODE", "true")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from test_storage import isolate_test_stores  # noqa: E402

isolate_test_stores("diet-search-filter")

from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402
import phase2_store  # noqa: E402
import quality  # noqa: E402

client = TestClient(main.app, raise_server_exceptions=False)


def member(tsap_id, gender="Groom", **extra):
    base = {
        "tsap_id": tsap_id, "full_name": f"Member {tsap_id}", "gender": gender,
        "phone": f"9{tsap_id[-9:]}", "age": 30, "height": "5'8\"",
        "marital_status": "Pelli Kaledu", "religion": "Hindu", "caste": "Reddy",
        "state": "TS", "district": "Hyderabad", "education": "B.Tech", "job": "Software",
        "status": "active", "approved": True, "is_approved": True,
        "photo_status": "approved", "photo_url": "", "created_at": "2026-01-01T00:00:00",
        "mother_tongue": "Telugu", "family_type": "Nuclear", "gothram": "Kashyapa",
    }
    base.update(extra)
    return base


main.DB_USERS.extend([
    member("MVDSF00001", "Bride"),  # viewer
    member("MVDSF00010", diet="Vegetarian"),
    member("MVDSF00011", diet="Non-Vegetarian"),
    member("MVDSF00012"),  # unset diet stays unknown
    member("MVDSF00013", diet=" vegetarian "),  # stored untrimmed still matches
])

USERS = {u["tsap_id"]: u for u in main.DB_USERS}


def ids(response):
    assert response.status_code == 200, response.text
    return {row["tsap_id"] for row in response.json()["results"] if row["tsap_id"].startswith("MVDSF0001")}


class DietSearchFilter(unittest.TestCase):
    def test_single_value_narrows(self):
        self.assertEqual(ids(client.get("/api/search?gender=groom&diet=Vegetarian")), {"MVDSF00010", "MVDSF00013"})
        self.assertEqual(ids(client.get("/api/search?gender=groom&diet=Non-Vegetarian")), {"MVDSF00011"})

    def test_multi_value_matches_any(self):
        self.assertEqual(
            ids(client.get("/api/search?gender=groom&diet=Vegetarian,Non-Vegetarian")),
            {"MVDSF00010", "MVDSF00011", "MVDSF00013"},
        )

    def test_unset_diet_never_matches(self):
        got = ids(client.get("/api/search?gender=groom&diet=Vegetarian,Non-Vegetarian"))
        self.assertNotIn("MVDSF00012", got)

    def test_no_filter_returns_all(self):
        got = ids(client.get("/api/search?gender=groom"))
        self.assertEqual(got, {"MVDSF00010", "MVDSF00011", "MVDSF00012", "MVDSF00013"})

    def test_overlong_diet_rejected(self):
        response = client.get("/api/search?gender=groom&diet=" + "x" * 501)
        self.assertIn(response.status_code, (400, 422), response.text)


class DietSavedSearch(unittest.TestCase):
    def test_normalize_filters_keeps_diet(self):
        filters = quality.normalize_filters({"diet": "Vegetarian,Non-Vegetarian"})
        self.assertEqual(filters["diet"], "Vegetarian,Non-Vegetarian")
        self.assertEqual(quality.normalize_filters({"diet": ""}), {})

    def test_matches_filters_applies_diet(self):
        veg = {"diet": "Vegetarian"}
        self.assertTrue(quality.matches_filters(USERS["MVDSF00010"], veg))
        self.assertFalse(quality.matches_filters(USERS["MVDSF00011"], veg))
        # Unset diet stays unknown: never matches a selection.
        self.assertFalse(quality.matches_filters(USERS["MVDSF00012"], veg))
        self.assertTrue(quality.matches_filters(USERS["MVDSF00012"], {}))

    def test_digest_applies_diet(self):
        viewer = USERS["MVDSF00001"]
        # The digest only considers approved candidates.
        grooms = [dict(u, status="approved") for u in USERS.values() if u["tsap_id"].startswith("MVDSF0001")]
        saved = [{"search_id": "s1", "name": "Veg", "filters": {"diet": "Vegetarian"}}]
        digest = phase2_store.compute_saved_search_digest(viewer, saved, grooms, {})
        matched = {p["tsap_id"] for p in digest["digests"][0]["sample_profiles"]}
        self.assertEqual(matched, {"MVDSF00010", "MVDSF00013"})
        self.assertEqual(digest["digests"][0]["match_count"], 2)


if __name__ == "__main__":
    unittest.main(verbosity=2)
