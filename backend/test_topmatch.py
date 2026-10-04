"""Regression tests for factual profile comparisons and score-free candidate ordering."""
import os
import sys
from datetime import datetime, timedelta

os.environ.setdefault("WA_TEST_FAST", "1")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import topmatch  # noqa: E402

PASS = []
FAIL = []


def check(name, condition, extra=""):
    (PASS if condition else FAIL).append(name)
    print(("  ✅ " if condition else "  ❌ ") + name + (("  | " + str(extra)) if extra else ""))


NOW = datetime.utcnow()
BRIDE = {
    "tsap_id": "TSAP-F-TEST-9001", "gender": "Bride", "full_name": "Test Bride",
    "age": 24, "caste": "Reddy", "sub_caste": "Pakanati", "education": "BTech",
    "job": "Software Engineer", "district": "Hyderabad", "state": "TS",
    "star": "Rohini", "rasi": "Vrishabha", "religion": "Hindu", "is_approved": True,
    "created_at": (NOW - timedelta(days=1)).isoformat(),
}
GROOM = {
    "tsap_id": "TSAP-M-TEST-9001", "gender": "Groom", "full_name": "Test Groom",
    "age": 29, "caste": "Reddy", "sub_caste": "Pakanati", "education": "BTech",
    "job": "Software Engineer", "district": "Hyderabad", "state": "TS",
    "star": "Uttara", "rasi": "Simha", "religion": "Hindu", "is_approved": True,
    "created_at": (NOW - timedelta(days=2)).isoformat(),
    "exp_filters": {"ageMin": 23, "ageMax": 30, "caste": "same", "job": "Software"},
}
NEW_GROOM = {
    "tsap_id": "TSAP-M-TEST-9002", "gender": "Groom", "full_name": "New Test Groom",
    "age": 35, "caste": "Kamma", "education": "MBA", "job": "Teacher",
    "district": "Warangal", "state": "TS", "is_approved": True,
    "created_at": NOW.isoformat(),
}
WRONG_GENDER = {**BRIDE, "tsap_id": "TSAP-F-TEST-9002", "created_at": NOW.isoformat()}
UNAPPROVED = {**NEW_GROOM, "tsap_id": "TSAP-M-TEST-9003", "is_approved": False,
              "created_at": (NOW + timedelta(days=1)).isoformat()}

FORBIDDEN_SCORE_KEYS = {"score", "match_score", "compatibility_score", "trust_score", "raw_score",
                        "grade", "grade_telugu", "stars", "percent", "verdict", "strengths", "weak_points"}

print("=== 1. FACTUAL PROFILE COMPARISON ===")
comparison = topmatch.score_match_v2(GROOM, BRIDE)
check("shared member-entered fields become observations", any("community" in row.lower() for row in comparison["observations"]))
check("different member-entered fields remain factual differences", any("district" in row.lower() for row in comparison["observations"] + comparison["differences"]))
check("explicit saved preferences evaluated separately", all(row.get("key") in {"age", "caste", "job"} for row in comparison["preferences"]))
check("no compatibility, trust, grade, or aggregate result fields", not (FORBIDDEN_SCORE_KEYS & set(comparison)), list(comparison))
check("notice states comparison limits", "not a compatibility" in comparison.get("notice", "").lower())

print("\n=== 2. RECENCY-ONLY CANDIDATE ORDERING ===")
pool = [BRIDE, GROOM, NEW_GROOM, WRONG_GENDER, UNAPPROVED]
rows = topmatch.find_top_matches_v2(BRIDE, pool, limit=10, min_score=0)
ids = [row["profile"]["tsap_id"] for row in rows]
check("only approved opposite-gender candidates returned", ids == [NEW_GROOM["tsap_id"], GROOM["tsap_id"]], ids)
check("rows contain factual comparison fields, no scores", all(
    {"profile", "observations", "differences", "preferences"} <= set(row)
    and not (FORBIDDEN_SCORE_KEYS & set(row)) for row in rows))
strict_threshold_rows = topmatch.find_top_matches_v2(BRIDE, pool, limit=10, min_score=100)
check("legacy min_score parameter does not filter or rank", [r["profile"]["tsap_id"] for r in strict_threshold_rows] == ids)
check("limit is respected", len(topmatch.find_top_matches_v2(BRIDE, pool, limit=1)) == 1)
check("unknown gender returns no ranked candidates", topmatch.find_top_matches_v2({"gender": ""}, pool) == [])

print("\n=== 3. API SHAPES (isolated in-memory profiles) ===")
try:
    from fastapi.testclient import TestClient
    from hardening import sign_token
    import main

    old_users = list(main.DB_USERS)
    old_blocks = list(main.DB_BLOCKS)
    try:
        main.DB_USERS[:] = [dict(BRIDE), dict(GROOM), dict(NEW_GROOM)]
        main.DB_BLOCKS[:] = []
        groom_headers = {"Authorization": f"Bearer {sign_token(GROOM['tsap_id'])}"}
        bride_headers = {"Authorization": f"Bearer {sign_token(BRIDE['tsap_id'])}"}
        with TestClient(main.app) as client:
            response = client.get("/api/match/score", params={"a": GROOM["tsap_id"], "b": BRIDE["tsap_id"]}, headers=groom_headers)
            body = response.json()
            check("GET /api/match/score returns member-entered comparisons", response.status_code == 200
                  and isinstance(body.get("observations"), list) and isinstance(body.get("differences"), list),
                  (response.status_code, list(body)))
            check("/api/match/score exposes no synthetic score or verdict",
                  not (FORBIDDEN_SCORE_KEYS & set(body)), list(body))

            top = client.get(f"/api/top-matches/{BRIDE['tsap_id']}", params={"min_score": 100, "limit": 10}, headers=bride_headers)
            top_body = top.json()
            check("/api/top-matches accepts legacy threshold but publishes no scores",
                  top.status_code == 200 and top_body.get("min_score_ignored") is True
                  and all(not (FORBIDDEN_SCORE_KEYS & set(row)) for row in top_body.get("results", [])),
                  (top.status_code, list(top_body)))
            check("same-gothram profiles are not auto-excluded",
                  top_body.get("count") == 2 and top_body.get("legacy_exclusion_flags_ignored") is True,
                  top_body.get("count"))

            search = client.get("/api/search", params={"viewer_id": GROOM["tsap_id"], "limit": 10}, headers=groom_headers)
            search_body = search.json()
            search_rows = search_body.get("results", [])
            check("/api/search returns rows and no compatibility ranking",
                  search.status_code == 200 and all(not (FORBIDDEN_SCORE_KEYS & set(row))
                                                     and "reasons" not in row for row in search_rows),
                  (search.status_code, list(search_body)))
            check("/api/search uses factual observation fields", all(
                {"observations", "differences", "preference_checks"} <= set(row)
                for row in search_rows if row.get("gender") != GROOM.get("gender")))

            blocked_pair = client.get("/api/match/score", params={"a": GROOM["tsap_id"], "b": "TSAP-X-TEST-0000"}, headers=groom_headers)
            check("unknown profile is not compared", blocked_pair.status_code == 404)
    finally:
        main.DB_USERS[:] = old_users
        main.DB_BLOCKS[:] = old_blocks
except Exception as exc:  # pragma: no cover
    check("isolated API test fixture", False, repr(exc))

print("\n=== RESULT: %d pass / %d fail ===" % (len(PASS), len(FAIL)))
if FAIL:
    print("FAILED:", FAIL)
    sys.exit(1)
print("✅ factual comparison and recency-only ordering checks passed")
