"""Localized profile errors, actual endpoint payloads, isolated fictional store only."""
import copy
import json
import os
import pathlib
import sys
import unittest
from unittest.mock import patch
os.environ['APP_ENV'] = 'test'
os.environ['ENV'] = 'test'
os.environ['TSAP_AUTH_MODE'] = 'enforce'
os.environ.setdefault('TSAP_AUTH_SECRET', 'localized-profile-errors-isolated-secret')
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from test_storage import isolate_test_stores
isolate_test_stores('profile-localized-errors')
from fastapi.testclient import TestClient
import hardening
import main
client = TestClient(main.app, raise_server_exceptions=False)
ID = 'ISOLATED-LOCALE'
FIXTURE = pathlib.Path(__file__).parents[1] / 'frontend/tests/fixtures/profile-update-errors.json'

class LocaleErrors(unittest.TestCase):
    def setUp(self):
        self.row = {'tsap_id': ID, 'gender': 'Groom', 'full_name': 'Fictional Member', 'job': 'Software', 'state': 'TS', 'district': 'Hyderabad', 'marital_status': 'Pelli Kaledu'}
        main.DB_USERS[:] = [self.row]
        main._USERS_ID_MAP.clear()
        self.before = copy.deepcopy(self.row)
        self.headers = {'X-Tsap-Token': hardening.sign_token(ID)}

    def post(self, body, auth=True):
        return client.post('/api/profile/update', json={'tsap_id': ID, **body}, headers=self.headers if auth else {})

    def assert_error(self, response, status):
        self.assertEqual(response.status_code, status, response.text)
        d = response.json()
        self.assertFalse(d['success'])
        self.assertTrue(d['detail_en'])
        self.assertFalse(any('\u0c00' <= c <= '\u0c7f' for c in d['detail_en']))
        self.assertTrue(any('\u0c00' <= c <= '\u0c7f' for c in d['detail_te']))
        self.assertEqual(self.row, self.before)
        return d

    def test_validation_and_ownership(self):
        cases = [({'dob': 'not-a-date'}, 400), ({'dob': '2099-01-01'}, 400),
                 ({'dob': '2020-01-01'}, 400), ({'dob': '1800-01-01'}, 400),
                 ({'state': 'TS', 'district': 'Visakhapatnam'}, 400), ({'district': ''}, 400),
                 ({'state': 'BAD'}, 400), ({'children': 'BAD'}, 400),
                 ({'profile_for': 'BAD'}, 400), ({'diet': 'BAD'}, 400), ({'photo_private': 'BAD'}, 400)]
        for body, code in cases:
            with self.subTest(body=body): self.assert_error(self.post(body), code)
        self.assert_error(self.post({'job': 'Changed'}, auth=False), 401)
        d = self.assert_error(self.post({'tsap_id': 'ABSENT'}), 404)
        self.assertNotIn('ABSENT', d['detail_en'])

    def test_real_wire_fixtures_and_rollback(self):
        actual = {'groom400': self.assert_error(self.post({'job': 'Housewife / Homemaker (గృహిణి)'}), 400)}
        self.assertEqual(actual['groom400']['detail'], main._GROOM_HOMEMAKER_DETAIL)
        for key in ('job', 'work_type'):
            self.assert_error(self.post({key: 'గృహిణి'}), 400)
        with patch.object(main, '_persist_core_state', return_value=False), patch.object(main, '_regenerate_profile_card', return_value=True):
            actual['persist503'] = self.assert_error(self.post({'job': 'Changed'}), 503)
        with patch.object(main, '_regenerate_profile_card', return_value=False):
            actual['privacy503'] = self.assert_error(self.post({'photo_private': True}), 503)
        if os.environ.get('WRITE_LOCALE_FIXTURE') == '1':
            FIXTURE.write_text(json.dumps(actual, ensure_ascii=False, indent=2) + '\n')
        self.assertEqual(json.loads(FIXTURE.read_text()), actual, 'Frontend fixtures must match actual backend endpoint payloads')

    def test_bride_and_valid_edits_still_succeed(self):
        self.row['gender'] = 'Bride'
        with patch.object(main, '_persist_core_state', return_value=True):
            r = self.post({'job': 'Housewife', 'diet': 'Vegetarian'})
        self.assertEqual(r.status_code, 200, r.text)
        self.assertTrue(r.json()['success'])
        self.assertEqual(self.row['job'], 'Housewife')

if __name__ == '__main__': unittest.main()
