"""Stored-but-unevaluated preferences: height range, minimum income, states.

Covers the slice that connects already-stored partner preferences to factual
member-entered comparisons:
- height_min/height_max produce an informational check against the candidate's
  own listed height (unset candidate height stays unknown, no check);
- min_salary compares the candidate's listed range lower bound against the
  selected minimum (unset/unreadable salary stays unknown);
- states evaluate only when explicitly selected (the stored TS/AP default is
  not a member choice and earns no check);
- the save roundtrip carries height/salary into exp_filters for the profile
  view comparison (topmatch), and carries states only when explicit;
- checks are informational met/not_met rows, never hard filters or scores.

Run directly with ``python test_preference_range_checks.py``.
"""
from __future__ import annotations

import os
import sys
import unittest

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("ENV", "test")
os.environ["TSAP_AUTH_MODE"] = "enforce"
os.environ.setdefault("TSAP_AUTH_SECRET", "preference-range-checks-test-secret-not-for-production")
os.environ.setdefault("OTP_DEV_MODE", "true")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from test_storage import isolate_test_stores  # noqa: E402

isolate_test_stores("preference-range-checks")

from fastapi.testclient import TestClient  # noqa: E402

import hardening  # noqa: E402
import main  # noqa: E402
import quality  # noqa: E402
import topmatch  # noqa: E402

client = TestClient(main.app, raise_server_exceptions=False)


def member(tsap_id, gender="Groom", **extra):
    base = {
        "tsap_id": tsap_id, "full_name": f"Member {tsap_id}", "gender": gender,
        "phone": f"9{tsap_id[-9:]}", "age": 30, "height": "5'8\"",
        "marital_status": "Pelli Kaledu", "religion": "Hindu", "caste": "Reddy",
        "state": "TS", "district": "Hyderabad", "education": "B.Tech", "job": "Software",
        "salary": "₹10 - 12 Lakhs / year",
        "status": "active", "approved": True, "is_approved": True,
        "photo_status": "approved", "photo_url": "", "created_at": "2026-01-01T00:00:00",
    }
    base.update(extra)
    return base


def headers(tsap_id):
    token = hardening.sign_token(tsap_id)
    return {"Authorization": f"Bearer {token}", "X-TSAP-Token": token}


def save_prefs(tsap_id, **overrides):
    payload = {
        "tsap_id": tsap_id, "age_min": 25, "age_max": 40, "marital_statuses": ["Any"],
        "height_min": "5'0\"", "height_max": "5'10\"", "min_salary": "₹5 - 7 Lakhs / year",
    }
    payload.update(overrides)
    return client.post("/api/profile/preferences", json=payload, headers=headers(tsap_id))


def checks_for(viewer, candidate_id):
    response = client.get("/api/profile/preferences", params={"tsap_id": viewer}, headers=headers(viewer))
    assert response.status_code == 200, response.text
    for candidate in response.json()["preview_matches"]:
        if candidate["tsap_id"] == candidate_id:
            return {c["key"]: c for c in candidate.get("preference_checks", [])}
    return {}


main.DB_USERS.extend([
    member("MVPRC00001", "Bride"),                                   # viewer
    member("MVPRC00010"),                                            # within range / above minimum
    member("MVPRC00011", height="6'1\"", salary="₹2 - 3 Lakhs / year", state="AP"),
    member("MVPRC00012", height="", salary=""),                      # unknown stays unknown
    member("MVPRC00013", salary="₹4 - 6 Lakhs / year"),              # listed range crosses the minimum
    member("MVPRC00014", salary="Under ₹1 Lakh / Not Disclosed"),    # not-disclosed earns no check
])


class HeightRangeCheck(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        assert save_prefs("MVPRC00001").status_code == 200

    def test_height_met_and_not_met(self):
        met = checks_for("MVPRC00001", "MVPRC00010")["height"]
        self.assertEqual(met["status"], "met")
        self.assertIn("5'8\"", met["note"])
        not_met = checks_for("MVPRC00001", "MVPRC00011")["height"]
        self.assertEqual(not_met["status"], "not_met")

    def test_unset_candidate_height_no_check(self):
        self.assertNotIn("height", checks_for("MVPRC00001", "MVPRC00012"))

    def test_height_is_informational_not_hard_filter(self):
        response = client.get("/api/profile/preferences", params={"tsap_id": "MVPRC00001"}, headers=headers("MVPRC00001"))
        ids = {c["tsap_id"] for c in response.json()["preview_matches"]}
        self.assertIn("MVPRC00011", ids)  # outside the range but still listed


class MinSalaryCheck(unittest.TestCase):
    def test_salary_met_and_not_met(self):
        met = checks_for("MVPRC00001", "MVPRC00010")["min_salary"]
        self.assertEqual(met["status"], "met")
        not_met = checks_for("MVPRC00001", "MVPRC00011")["min_salary"]
        self.assertEqual(not_met["status"], "not_met")

    def test_unset_candidate_salary_no_check(self):
        self.assertNotIn("min_salary", checks_for("MVPRC00001", "MVPRC00012"))

    def test_crossing_range_cannot_be_determined(self):
        # A listed range crossing the minimum is neither met nor below.
        check = checks_for("MVPRC00001", "MVPRC00013")["min_salary"]
        self.assertEqual(check["status"], "unknown")
        self.assertIn("cannot be determined from the listed range", check["note"])
        self.assertIn("₹4 - 6 Lakhs / year", check["note"])
        self.assertIn("₹5 - 7 Lakhs / year", check["note"])

    def test_not_disclosed_salary_no_check(self):
        self.assertNotIn("min_salary", checks_for("MVPRC00001", "MVPRC00014"))

    def test_checks_carry_telugu_notes(self):
        checks = checks_for("MVPRC00001", "MVPRC00011")
        self.assertIn("వెలుపల", checks["height"]["note_te"])
        self.assertIn("కంటే తక్కువ", checks["min_salary"]["note_te"])
        self.assertIn("ఎంచుకున్న", checks["age"]["note_te"])

    def test_any_salary_no_check(self):
        assert save_prefs("MVPRC00001", min_salary="Any").status_code == 200
        self.assertNotIn("min_salary", checks_for("MVPRC00001", "MVPRC00010"))
        assert save_prefs("MVPRC00001").status_code == 200  # restore


class StatesCheck(unittest.TestCase):
    def test_default_states_earn_no_check(self):
        # Saved without an explicit states selection: the TS/AP default is not
        # a member choice, so no state comparison appears for anyone.
        checks = checks_for("MVPRC00001", "MVPRC00010")
        self.assertNotIn("states", checks)
        viewer = main._find_user("MVPRC00001")
        self.assertFalse(viewer["partner_preferences"].get("states_explicit"))

    def test_explicit_states_evaluated(self):
        assert save_prefs("MVPRC00001", states=["TS"]).status_code == 200
        self.assertEqual(checks_for("MVPRC00001", "MVPRC00010")["states"]["status"], "met")
        self.assertEqual(checks_for("MVPRC00001", "MVPRC00011")["states"]["status"], "not_met")
        assert save_prefs("MVPRC00001").status_code == 200  # restore default


class SalaryLabelParser(unittest.TestCase):
    def test_catalog_and_legacy_labels(self):
        self.assertEqual(quality.salary_label_min_rupees("₹5 - 7 Lakhs / year"), 500000)
        self.assertEqual(quality.salary_label_min_rupees("₹50+ Lakhs (NRI / High Networth)"), 5000000)
        self.assertEqual(quality.salary_label_min_rupees("₹1 Crore - ₹1.5 Crore / year"), 10000000)
        self.assertEqual(quality.salary_label_min_rupees("₹75 Lakhs - ₹1 Crore / year"), 7500000)
        self.assertEqual(quality.salary_label_min_rupees("10 LPA"), 1000000)
        self.assertEqual(quality.salary_label_min_rupees("60k"), 60000)
        self.assertEqual(quality.salary_label_min_rupees("Any"), 0)
        self.assertEqual(quality.salary_label_min_rupees(""), 0)

    def test_ranges_and_unknowns(self):
        self.assertEqual(quality.salary_label_range_rupees("₹5 - 7 Lakhs / year"), (500000, 700000))
        self.assertEqual(quality.salary_label_range_rupees("₹50+ Lakhs (NRI / High Networth)"), (5000000, None))
        self.assertEqual(quality.salary_label_range_rupees("₹75 Lakhs - ₹1 Crore / year"), (7500000, 10000000))
        self.assertEqual(quality.salary_label_range_rupees("10 LPA"), (1000000, 1000000))
        self.assertEqual(quality.salary_label_range_rupees("Under ₹1 Lakh / Not Disclosed"), (0, None))

    def test_comparison_verdicts(self):
        pref = "₹5 - 7 Lakhs / year"
        self.assertEqual(quality.income_range_comparison("₹10 - 12 Lakhs / year", pref), "met")
        self.assertEqual(quality.income_range_comparison("₹2 - 3 Lakhs / year", pref), "below")
        self.assertEqual(quality.income_range_comparison("₹4 - 6 Lakhs / year", pref), "unclear")
        self.assertEqual(quality.income_range_comparison("₹50+ Lakhs (NRI / High Networth)", "₹50+ Lakhs (NRI / High Networth)"), "met")
        self.assertIsNone(quality.income_range_comparison("", pref))
        self.assertIsNone(quality.income_range_comparison("₹10 - 12 Lakhs / year", "Any"))
        self.assertIsNone(quality.income_range_comparison("Under ₹1 Lakh / Not Disclosed", pref))


class ExpFiltersHandoff(unittest.TestCase):
    def test_handoff_carries_height_and_salary(self):
        assert save_prefs("MVPRC00001").status_code == 200
        viewer = main._find_user("MVPRC00001")
        exp = viewer["exp_filters"]
        self.assertEqual((exp["heightMin"], exp["heightMax"]), ("5'0\"", "5'10\""))
        self.assertEqual(exp["minSalary"], "₹5 - 7 Lakhs / year")
        self.assertEqual(exp["states"], [])  # default states never handed off

    def test_topmatch_profile_view_rows(self):
        viewer = main._find_user("MVPRC00001")
        rows = {r["key"]: r for r in topmatch.score_match_v2(viewer, member("MVPRC00020"))["preferences"]}
        self.assertEqual(rows["height"]["status"], "met")
        self.assertEqual(rows["min_salary"]["status"], "met")
        self.assertNotIn("states", rows)
        tall = {r["key"]: r for r in topmatch.score_match_v2(viewer, member("MVPRC00021", height="6'3\"", salary="₹1 - 2 Lakhs / year"))["preferences"]}
        self.assertEqual(tall["height"]["status"], "not_met")
        self.assertEqual(tall["min_salary"]["status"], "not_met")
        unknown = {r["key"] for r in topmatch.score_match_v2(viewer, member("MVPRC00022", height="", salary=""))["preferences"]}
        self.assertNotIn("height", unknown)
        self.assertNotIn("min_salary", unknown)

    def test_topmatch_crossing_range_unknown_and_telugu(self):
        viewer = main._find_user("MVPRC00001")
        rows = {r["key"]: r for r in topmatch.score_match_v2(viewer, member("MVPRC00025", salary="₹4 - 6 Lakhs / year"))["preferences"]}
        self.assertEqual(rows["min_salary"]["status"], "unknown")
        self.assertIn("నిర్ణయించలేము", rows["min_salary"]["note_te"])
        self.assertIn("లోపల", rows["height"]["note_te"])

    def test_topmatch_explicit_states_row(self):
        assert save_prefs("MVPRC00001", states=["AP"]).status_code == 200
        viewer = main._find_user("MVPRC00001")
        rows = {r["key"]: r for r in topmatch.score_match_v2(viewer, member("MVPRC00023", state="AP"))["preferences"]}
        self.assertEqual(rows["states"]["status"], "met")
        rows = {r["key"]: r for r in topmatch.score_match_v2(viewer, member("MVPRC00024", state="TS"))["preferences"]}
        self.assertEqual(rows["states"]["status"], "not_met")
        assert save_prefs("MVPRC00001").status_code == 200  # restore


if __name__ == "__main__":
    unittest.main(verbosity=2)
