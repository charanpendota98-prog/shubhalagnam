"""Consent and reviewed counts must survive neither truthiness nor numeric coercion.
All accounts, events and enquiries live in disposable test stores.
"""
import copy
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from test_storage import isolate_test_stores
isolate_test_stores('enterprise-explicit-consent')
os.environ.update(APP_ENV='test', TSAP_AUTH_MODE='enforce', EMAIL_MODE='mock')
from fastapi.testclient import TestClient
import pytest
import main
import enterprise_ops as EOPS
from hardening import sign_token

client = TestClient(main.app, raise_server_exceptions=False)
ID = 'CONSENT-LOCAL'
main.DB_USERS.append({'tsap_id': ID, 'full_name': 'Isolated Consent Fixture', 'phone': '9000000031',
                      'is_approved': True, 'status': 'active'})
HEADERS = {'X-Tsap-Token': sign_token(ID)}
ok, _, EVENT = EOPS.create_community_event(title_en='Isolated consent event', city='Hyderabad',
    event_date='2027-01-25', organizer='Isolated audit only')
assert ok
EVENT_PATH = f"/api/events/{EVENT['event_id']}/rsvp"
BUNDLE_PATH = '/api/bundles/enquire'
BUNDLE = {'tsap_id': ID, 'bundle_id': 'BND-PELLI-ESSENTIALS', 'city': 'Hyderabad',
          'event_date': '2027-01-25', 'guest_count': 250}
RSVP = {'tsap_id': ID, 'attendee_count': 3}


@pytest.mark.parametrize('path,base', [(EVENT_PATH, RSVP), (BUNDLE_PATH, BUNDLE)])
@pytest.mark.parametrize('value', [False, None, 'false', 'False', '0', 'no', 'true', 'yes', '', 0, 1, [], {}, [True]])
def test_only_json_true_records_consent(path, base, value):
    before = copy.deepcopy(EOPS._load_state())
    response = client.post(path, headers=HEADERS, json={**base, 'consent_confirmed': value})
    assert response.status_code == 400, response.text
    assert EOPS._load_state() == before


@pytest.mark.parametrize('path,base', [(EVENT_PATH, RSVP), (BUNDLE_PATH, BUNDLE)])
def test_omitted_consent_never_writes(path, base):
    before = copy.deepcopy(EOPS._load_state())
    assert client.post(path, headers=HEADERS, json=base).status_code == 400
    assert EOPS._load_state() == before


@pytest.mark.parametrize('value', [None, 'nonsense', '3', 1.5, True, False, 0, -1, 7, [], {}])
def test_rsvp_bad_count_is_validation_error_without_write(value):
    before = copy.deepcopy(EOPS._load_state())
    response = client.post(EVENT_PATH, headers=HEADERS,
        json={**RSVP, 'consent_confirmed': True, 'attendee_count': value})
    assert response.status_code == 400, response.text
    assert EOPS._load_state() == before


def test_missing_rsvp_count_is_not_silently_defaulted():
    before = copy.deepcopy(EOPS._load_state())
    assert client.post(EVENT_PATH, headers=HEADERS, json={'tsap_id': ID, 'consent_confirmed': True}).status_code == 400
    assert EOPS._load_state() == before


@pytest.mark.parametrize('value', [None, 'nonsense', '250', 250.5, True, False, 0, 9, 5001, 10000, [], {}])
def test_bundle_bad_count_is_not_clamped_or_server_error(value):
    before = copy.deepcopy(EOPS._load_state())
    response = client.post(BUNDLE_PATH, headers=HEADERS,
        json={**BUNDLE, 'consent_confirmed': True, 'guest_count': value})
    assert response.status_code == 400, response.text
    assert EOPS._load_state() == before


def test_valid_rsvp_keeps_exact_count_and_duplicate_is_idempotent():
    response = client.post(EVENT_PATH, headers=HEADERS, json={**RSVP, 'consent_confirmed': True})
    assert response.status_code == 200, response.text
    assert response.json()['event']['rsvp_count'] == 1
    record = next(e for e in EOPS._load_state()['events'] if e['event_id'] == EVENT['event_id'])['rsvps'][0]
    assert record['attendee_count'] == 3 and record['consent_confirmed'] is True
    again = client.post(EVENT_PATH, headers=HEADERS, json={**RSVP, 'consent_confirmed': True})
    assert again.status_code == 200 and again.json()['status'] == 'already_registered'
    assert again.json()['event']['rsvp_count'] == 1


@pytest.mark.parametrize('value', [10, 5000])
def test_bundle_valid_bounds_preserve_exact_reviewed_count(value):
    response = client.post(BUNDLE_PATH, headers=HEADERS,
        json={**BUNDLE, 'guest_count': value, 'consent_confirmed': True})
    assert response.status_code == 200, response.text
    assert response.json()['enquiry']['guest_count'] == value


def test_service_layer_also_refuses_truthy_text_and_bad_count():
    before = copy.deepcopy(EOPS._load_state())
    assert not EOPS.rsvp_community_event(EVENT['event_id'], tsap_id=ID, attendee_count=2, consent_confirmed='false')[0]
    assert not EOPS.rsvp_community_event(EVENT['event_id'], tsap_id=ID, attendee_count=7, consent_confirmed=True)[0]
    assert not EOPS.submit_bundle_enquiry(**BUNDLE, consent_confirmed='false')[0]
    assert not EOPS.submit_bundle_enquiry(**{**BUNDLE, 'guest_count': 10000}, consent_confirmed=True)[0]
    assert EOPS._load_state() == before
