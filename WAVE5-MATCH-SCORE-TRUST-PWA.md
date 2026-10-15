# Archived matching, trust-label, and PWA proposal

This replaces an old feature proposal that presented fabricated weighted “trust” scores, identity badges, popularity rankings, match reasons, and production status as if they were authoritative. Do not use the former tables or API examples as public copy or current implementation documentation.

## Current display rules

- Do not expose or sort members by a synthetic trust score.
- Do not call a member identity-verified unless a named, recorded verification check supports that exact label. OTP, photo review, and ID review are separate checks and none guarantees every profile claim.
- Do not present a compatibility calculation as popularity, trustworthiness, or an outcome guarantee. If a specific calculation appears in the product, describe its inputs and limits plainly.
- Current endpoint and UI behavior must be checked in the backend and frontend source before being documented. Historical test data is not a live member record.

## Current references

- Search route: `backend/main.py` and `ROUTE_MAP.md`
- Recorded verification copy: `backend/interest.py`, `backend/test_copy_truth.py`
- Current UI and PWA behavior: the live frontend source and package scripts
- Safe validation limits: `README.md` and `LOCAL-TEST-VS-ORACLE-DEPLOY.md`

This document makes no claim about current ranking accuracy, production deployment, identity verification, or external service health.
