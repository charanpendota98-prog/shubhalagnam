"""Family snapshot authorization with seeded, disposable records only."""
from __future__ import annotations

import copy
import os
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from test_storage import isolate_test_stores

isolate_test_stores("family-snapshot-permissions")
os.environ.update(APP_ENV="test", TSAP_AUTH_MODE="enforce", TSAP_AUTH_SECRET="isolated-family-snapshot-tests-only")

from fastapi.testclient import TestClient
import ecosystem3 as ECO
import main as M

CLIENT = TestClient(M.app)
OWNER = "FAMILY-SNAPSHOT-OWNER"
OTHER = "FAMILY-SNAPSHOT-OTHER"
SECRET = "FICTIONAL-OWNER-ONLY-CODE"


def headers(identity: str, scope: str = "user") -> dict[str, str]:
    return {"x-tsap-token": M.sign_token(identity, scope=scope)}


@pytest.fixture(autouse=True)
def records():
    M.DB_USERS[:] = [{"tsap_id": OWNER, "full_name": "Fictional owner", "is_approved": True},
                     {"tsap_id": OTHER, "full_name": "Fictional other member", "is_approved": True}]
    M._reindex_users()
    state = ECO._ensure_loaded()
    state.clear()
    state.update(copy.deepcopy(ECO._DEFAULT_STATE))
    state["family_collaborators"] = [{"collaborator_id": "FCOL-SEEDED", "owner_tsap_id": OWNER,
                                      "name": "Fictional parent", "relation": "father", "status": "active",
                                      "permissions": {"can_suggest": True, "can_unlock_contacts": False}}]
    state["family_invites"] = [{"invite_id": "FINV-SEEDED", "invite_code": SECRET,
                               "owner_tsap_id": OWNER, "status": "pending"}]
    state["family_suggestions"] = [{"id": "FSUG-SEEDED", "owner_tsap_id": OWNER,
                                   "candidate_tsap_id": OTHER, "note": "Fictional family review"}]
    assert ECO.save_state()
    yield state


def test_owner_retains_invite_credentials_and_review_records():
    response = CLIENT.get(f"/api/family/{OWNER}", headers=headers(OWNER))
    assert response.status_code == 200
    assert response.json()["pending_invites"][0]["invite_code"] == SECRET
    assert len(response.json()["suggestions"]) == 1


def test_active_collaborator_reads_review_without_invite_credentials(records):
    before = copy.deepcopy(records)
    response = CLIENT.get(f"/api/family/{OWNER}", headers=headers(f"family:{OWNER}:FCOL-SEEDED", "family"))
    assert response.status_code == 200
    assert response.json()["pending_invites"] == []
    assert SECRET not in response.text
    assert len(response.json()["suggestions"]) == 1
    assert records == before


@pytest.mark.parametrize("status", ["revoked", "expired", "pending", "disabled", "", None])
def test_inactive_collaborator_snapshot_denied(records, status):
    records["family_collaborators"][0]["status"] = status
    response = CLIENT.get(f"/api/family/{OWNER}", headers=headers(f"family:{OWNER}:FCOL-SEEDED", "family"))
    assert response.status_code == 403
    assert SECRET not in response.text
    assert "suggestions" not in response.json()


@pytest.mark.parametrize("identity,scope", [
    (f"family:{OWNER}:FCOL-MISSING", "family"),
    (f"family:{OTHER}:FCOL-SEEDED", "family"),
    (f"family:{OWNER}:FCOL-SEEDED:extra", "family"),
    (f"family:{OWNER}:FCOL-SEEDED", "user"),
    (OTHER, "user"),
])
def test_nonmatching_identity_snapshot_denied(identity, scope):
    response = CLIENT.get(f"/api/family/{OWNER}", headers=headers(identity, scope))
    assert response.status_code in (401, 403)
    assert SECRET not in response.text


def test_anonymous_snapshot_denied():
    assert CLIENT.get(f"/api/family/{OWNER}").status_code in (401, 403)


def test_inactive_status_and_owner_records_survive_store_reload(records):
    records["family_collaborators"][0]["status"] = "revoked"
    assert ECO.save_state()
    ECO._LOADED_PATH = None
    response = CLIENT.get(f"/api/family/{OWNER}", headers=headers(f"family:{OWNER}:FCOL-SEEDED", "family"))
    assert response.status_code == 403
    owner = CLIENT.get(f"/api/family/{OWNER}", headers=headers(OWNER))
    assert owner.status_code == 200
    assert owner.json()["pending_invites"][0]["invite_code"] == SECRET
