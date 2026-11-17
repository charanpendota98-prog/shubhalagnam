"""Optional search filters: family type, same-gothram skip, and the controls the UI now exposes.

Run with ``python test_search_extra_filters.py``.
"""
from __future__ import annotations

import os
import sys
import unittest

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("ENV", "test")
os.environ["TSAP_AUTH_MODE"] = "enforce"
os.environ.setdefault("TSAP_AUTH_SECRET", "search-extra-filters-test-secret-not-for-production")
os.environ.setdefault("OTP_DEV_MODE", "true")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from test_storage import isolate_test_stores  # noqa: E402

isolate_test_stores("search-extra-filters")

from fastapi.testclient import TestClient  # noqa: E402

import hardening  # noqa: E402
import main  # noqa: E402
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


VIEWER, NOGO = "MVXFLT0001", "MVXFLT0002"
main.DB_USERS.extend([
    member(VIEWER, "Bride", gothram="Kashyapa"),
    member(NOGO, "Bride", gothram="", full_name="Member no gothram"),
    member("MVXFLT0010", family_type="Joint", gothram="Kashyapa", mother_tongue="Telugu"),
    member("MVXFLT0011", family_type="Nuclear", gothram="Bharadwaja", mother_tongue="Hindi", phone_verified=True),
    member("MVXFLT0012", family_type="Nuclear", gothram="", mother_tongue="Telugu", id_verified=True),
    member("MVXFLT0013", family_type="", gothram="  kashyapa ", mother_tongue="Telugu", current_city="Pune", country="India"),
])


def headers(tsap_id):
    token = hardening.sign_token(tsap_id)
    return {"Authorization": f"Bearer {token}", "X-TSAP-Token": token}


def ids(response):
    assert response.status_code == 200, response.text
    return {row["tsap_id"] for row in response.json()["results"] if row["tsap_id"].startswith("MVXFLT001")}


class ExtraFilters(unittest.TestCase):
    def test_family_type_only_returns_listed_value(self):
        self.assertEqual(ids(client.get("/api/search?gender=groom&family_type=Joint")), {"MVXFLT0010"})
        self.assertNotIn("MVXFLT0013", ids(client.get("/api/search?gender=groom&family_type=Nuclear")))

    def test_mother_tongue_city_country_verification_work(self):
        self.assertEqual(ids(client.get("/api/search?gender=groom&mother_tongue=hindi")), {"MVXFLT0011"})
        self.assertEqual(ids(client.get("/api/search?gender=groom&city=pune")), {"MVXFLT0013"})
        self.assertEqual(ids(client.get("/api/search?gender=groom&country=india")), {"MVXFLT0013"})
        self.assertEqual(ids(client.get("/api/search?gender=groom&verification_level=id")), {"MVXFLT0012"})

    def test_same_gothram_skip_is_opt_in_and_keeps_unknown(self):
        base = ids(client.get("/api/search?gender=groom", headers=headers(VIEWER)))
        self.assertIn("MVXFLT0010", base)
        response = client.get("/api/search?gender=groom&skip_same_gothram=true", headers=headers(VIEWER))
        got = ids(response)
        self.assertNotIn("MVXFLT0010", got)
        self.assertNotIn("MVXFLT0013", got)  # whitespace/case-insensitive
        self.assertIn("MVXFLT0011", got)
        self.assertIn("MVXFLT0012", got)  # unknown gothram stays visible
        self.assertTrue(response.json()["gothram_exclusion"]["applied"])

    def test_same_gothram_without_own_value_or_sign_in_hides_nothing(self):
        base = ids(client.get("/api/search?gender=groom", headers=headers(NOGO)))
        response = client.get("/api/search?gender=groom&skip_same_gothram=true", headers=headers(NOGO))
        self.assertEqual(ids(response), base)
        self.assertEqual(response.json()["gothram_exclusion"]["reason"], "own_gothram_missing")
        anon = client.get("/api/search?gender=groom&skip_same_gothram=true")
        self.assertEqual(anon.json()["gothram_exclusion"]["reason"], "sign_in_required")
        self.assertFalse(anon.json()["gothram_exclusion"]["applied"])

    def test_saved_search_keeps_new_filters_and_matches_them(self):
        filters = quality.normalize_filters({"family_type": "Joint", "city": "Pune", "mother_tongue": "Telugu", "verification_level": "id,photo"})
        self.assertEqual(filters["family_type"], "Joint")
        self.assertEqual(filters["city"], "Pune")
        users = {u["tsap_id"]: u for u in main.DB_USERS if u["tsap_id"].startswith("MVXFLT001")}
        self.assertTrue(quality.matches_filters(users["MVXFLT0010"], {"family_type": "Joint"}))
        self.assertFalse(quality.matches_filters(users["MVXFLT0011"], {"family_type": "Joint"}))
        self.assertTrue(quality.matches_filters(users["MVXFLT0013"], {"city": "pune"}))
        self.assertTrue(quality.matches_filters(users["MVXFLT0012"], {"verification_level": "id"}))
        self.assertFalse(quality.matches_filters(users["MVXFLT0011"], {"verification_level": "id"}))


class ProfileUpdateChildren(unittest.TestCase):
    def update(self, tsap_id, **body):
        return client.post("/api/profile/update", json={"tsap_id": tsap_id, **body}, headers=headers(tsap_id))

    def test_children_saved_validated_and_cleared_for_never_married(self):
        uid = "MVXFLT0020"
        main.DB_USERS.append(member(uid, "Groom", marital_status="Divorced", children=""))
        ok = self.update(uid, children="2", physical_status="Normal")
        self.assertEqual(ok.status_code, 200, ok.text)
        stored = main._find_user(uid)
        self.assertEqual((stored["children"], stored["physical_status"]), ("2", "Normal"))
        bad = self.update(uid, children="lots")
        self.assertGreaterEqual(bad.status_code, 400)
        self.assertEqual(main._find_user(uid)["children"], "2")
        cleared = self.update(uid, marital_status="Pelli Kaledu", children="3")
        self.assertEqual(cleared.status_code, 200, cleared.text)
        self.assertEqual(main._find_user(uid)["children"], "")


if __name__ == "__main__":
    unittest.main(verbosity=2)
