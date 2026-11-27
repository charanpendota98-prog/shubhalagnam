"""Localized profile errors, actual endpoint payloads, isolated fictional store only."""
import copy
import json
import os
import pathlib
import sys
import unittest
from unittest.mock import patch, Mock
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
VALIDATORS = pathlib.Path(__file__).parents[1] / 'frontend/tests/fixtures/profile-validator-errors.json'
FIXTURE = pathlib.Path(__file__).parents[1] / 'frontend/tests/fixtures/profile-update-errors.json'

class LocaleErrors(unittest.TestCase):
    def setUp(self):
        self.row = {'tsap_id': ID, 'gender': 'Groom', 'full_name': 'Fictional Member', 'job': 'Software', 'state': 'TS', 'district': 'Hyderabad', 'marital_status': 'Pelli Kaledu'}
        main.DB_USERS[:] = [self.row]
        main._USERS_ID_MAP.clear()
        self.before = copy.deepcopy(self.row)
        self.headers = {'X-Tsap-Token': hardening.sign_token(ID)}

    def post(self, body, auth=True):
        self.submitted = [str(value) for value in body.values() if isinstance(value, str) and len(value) >= 3 and value not in ('గృహిణి', 'Housewife / Homemaker (గృహిణి)')]
        return client.post('/api/profile/update', json={'tsap_id': ID, **body}, headers=self.headers if auth else {})

    def assert_error(self, response, status):
        self.assertEqual(response.status_code, status, response.text)
        d = response.json()
        self.assertFalse(d['success'])
        self.assertTrue(d['detail_en'])
        self.assertFalse(any('\u0c00' <= c <= '\u0c7f' for c in d['detail_en']))
        self.assertTrue(any('\u0c00' <= c <= '\u0c7f' for c in d['detail_te']))
        for value in getattr(self, 'submitted', []):
            self.assertNotIn(value.casefold(), d['detail_en'].casefold())
            self.assertNotIn(value.casefold(), d['detail_te'].casefold())
            self.assertNotIn(value.casefold(), str(d).casefold())
        self.assertEqual(self.row, self.before)
        return d

    def test_no_echo_guard_rejects_case_transformed_values(self):
        # Test the guard itself, independent of the frozen wire fixtures.
        for submitted, echoed in [('PRIVATE-VALUE', 'private-value'),
                                   ('private-value', 'PRIVATE-VALUE'),
                                   ('Private-Value', 'pRiVaTe-vAlUe'),
                                   ('Straße-private', 'STRASSE-PRIVATE')]:
            for field in ('detail_en', 'detail_te', 'detail'):
                with self.subTest(submitted=submitted, field=field):
                    self.submitted = [submitted]
                    payload = {'success': False, 'detail_en': 'Invalid input.',
                               'detail_te': 'చెల్లని సమాచారం.', 'detail': 'Invalid input.'}
                    payload[field] += ' ' + echoed
                    response = Mock(status_code=400, text='fictional guard probe')
                    response.json.return_value = payload
                    with self.assertRaises(AssertionError):
                        self.assert_error(response, 400)
        # A genuinely unrelated curated error must still pass the guard.
        self.submitted = ['PRIVATE-VALUE']
        response.json.return_value = {'success': False, 'detail_en': 'Invalid input.',
                                      'detail_te': 'చెల్లని సమాచారం.', 'detail': 'Invalid input.'}
        self.assert_error(response, 400)

    def test_validation_and_ownership(self):
        cases = [({'dob': 'not-a-date'}, 400), ({'dob': '2099-01-01'}, 400),
                 ({'dob': '2020-01-01'}, 400), ({'dob': '1800-01-01'}, 400),
                 ({'state': 'TS', 'district': 'Visakhapatnam'}, 400), ({'district': ''}, 400),
                 ({'state': 'BAD'}, 400), ({'children': 'BAD'}, 400),
                 ({'profile_for': 'BAD'}, 400), ({'diet': 'BAD'}, 400), ({'photo_private': 'BAD'}, 400)]
        actual = []
        for body, code in cases:
            with self.subTest(body=body):
                actual.append({'input': body, 'error': self.assert_error(self.post(body), code)})
        actual.append({'input': {'auth': False}, 'error': self.assert_error(self.post({'job': 'Changed'}, auth=False), 401)})
        actual.append({'input': {'tsap_id': 'ABSENT'}, 'error': self.assert_error(self.post({'tsap_id': 'ABSENT'}), 404)})
        if os.environ.get('WRITE_LOCALE_FIXTURE') == '1':
            VALIDATORS.write_text(json.dumps(actual, ensure_ascii=False, indent=2) + '\n')
        # Freeze exact legacy detail, DOB English, and validator-to-Telugu mapping.
        self.assertEqual(json.loads(VALIDATORS.read_text()), actual)
        for case in actual:
            self.assertNotEqual(case['error']['detail_te'], main._profile_update_error('unknown', 400)['detail_te'])
        self.assert_error(self.post({'job': 'Changed'}, auth=False), 401)
        d = self.assert_error(self.post({'tsap_id': 'ABSENT'}), 404)
        self.assertNotIn('ABSENT', d['detail_en'])

    def test_real_wire_fixtures_and_rollback(self):
        actual = {'groom400': self.assert_error(self.post({'job': 'Housewife / Homemaker (గృహిణి)'}), 400)}
        self.assertEqual(actual['groom400']['detail'], main._GROOM_HOMEMAKER_DETAIL)
        actual['district400'] = self.assert_error(self.post({'district': ''}), 400)
        for key in ('job', 'work_type'):
            self.assert_error(self.post({key: 'గృహిణి'}), 400)
        with patch.object(main, '_persist_core_state', return_value=False), patch.object(main, '_regenerate_profile_card', return_value=True):
            actual['persist503'] = self.assert_error(self.post({'job': 'Changed'}), 503)
        with patch.object(main, '_regenerate_profile_card', return_value=False):
            actual['privacy503'] = self.assert_error(self.post({'photo_private': True}), 503)
        if os.environ.get('WRITE_LOCALE_FIXTURE') == '1':
            FIXTURE.write_text(json.dumps(actual, ensure_ascii=False, indent=2) + '\n')
        self.assertEqual(json.loads(FIXTURE.read_text()), actual, 'Frontend fixtures must match actual backend endpoint payloads')

    def test_unknown_fallback_never_echoes_and_headers_survive(self):
        secret = 'PRIVATE-SUBMITTED-VALUE'
        self.submitted = [secret]
        detail = 'Unmapped error: ' + secret
        with patch.object(main, '_update_user_profile', side_effect=main.HTTPException(418, detail, headers={'Retry-After': '42'})):
            response = self.post({'job': secret})
        d = self.assert_error(response, 418)
        self.assertEqual(d['detail'], d['detail_en'])
        self.assertNotIn(secret, str(d))
        self.assertEqual(response.headers['retry-after'], '42')
        self.assertEqual(d['detail_en'], 'Profile changes could not be saved. Please try again.')
        self.assertEqual(d['detail_te'], 'ప్రొఫైల్ మార్పులను సేవ్ చేయలేకపోయాం. మళ్లీ ప్రయత్నించండి.')

    def test_invalid_choice_detail_never_echoes_submitted_value(self):
        for field in ['diet', 'profile_for', 'children', 'state', 'photo_private', 'is_nri']:
            with self.subTest(field=field):
                secret = 'PRIVATE-SUBMITTED-VALUE-8241'
                response = self.post({field: secret})
                self.assertEqual(response.status_code, 400)
                self.assertNotIn(secret, str(response.json()))
                self.assertEqual(self.row, self.before)

    def test_bride_and_valid_edits_still_succeed(self):
        self.row['gender'] = 'Bride'
        with patch.object(main, '_persist_core_state', return_value=True):
            r = self.post({'job': 'Housewife', 'diet': 'Vegetarian'})
        self.assertEqual(r.status_code, 200, r.text)
        self.assertTrue(r.json()['success'])
        self.assertEqual(self.row['job'], 'Housewife')

if __name__ == '__main__': unittest.main()
