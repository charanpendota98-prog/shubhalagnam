"""Profile update input coverage. All requests use an isolated fictional store."""
import ast
import copy
import os
import pathlib
import sys
import unittest
from unittest.mock import patch

os.environ['APP_ENV'] = 'test'
os.environ['ENV'] = 'test'
os.environ['TSAP_AUTH_MODE'] = 'enforce'
os.environ.setdefault('TSAP_AUTH_SECRET', 'profile-sanitization-isolated-secret')
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from test_storage import isolate_test_stores
isolate_test_stores('profile-update-input-coverage')
from fastapi.testclient import TestClient
import hardening
import main

ID = 'ISOLATED-SANITIZATION'
TEXT_LIMITS = {'birth_time': 30, 'weight': 20, 'brothers': 20, 'sisters': 20,
               'exp_age_min': 3, 'exp_age_max': 3}
client = TestClient(main.app, raise_server_exceptions=False)


class ProfileInputCoverage(unittest.TestCase):
    def setUp(self):
        self.row = {'tsap_id': ID, 'gender': 'Bride', 'full_name': 'Fictional Member',
                    'state': 'TS', 'district': 'Hyderabad', 'job': 'Software', 'is_nri': False}
        main.DB_USERS[:] = [self.row]
        main._USERS_ID_MAP.clear()
        self.headers = {'X-Tsap-Token': hardening.sign_token(ID)}

    def post(self, fields, auth=True):
        # Test every input independently without exhausting the real rate limiter.
        hardening._RL_BUCKETS.clear()
        return client.post('/api/profile/update', json={'tsap_id': ID, **fields},
                           headers=self.headers if auth else {})

    def test_every_updatable_field_has_a_normalizer(self):
        # Fail closed when another writable field is added without a sanitizer.
        tree = ast.parse(pathlib.Path(main.__file__).read_text())
        endpoint = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == '_update_user_profile')
        assignments = {n.targets[0].id: n.value for n in ast.walk(endpoint)
                       if isinstance(n, ast.Assign) and len(n.targets) == 1 and isinstance(n.targets[0], ast.Name)}
        writable = set(ast.literal_eval(assignments['updatable_fields']))
        free_text = set(ast.literal_eval(assignments['_free_text_max']))
        specialized = {'dob', 'state', 'children', 'profile_for', 'diet', 'photo_private', 'is_nri'}
        self.assertEqual(writable, free_text | specialized)

    def test_six_text_fields_strip_markup_controls_and_cap_lengths(self):
        attacks = ['<script>alert(1)</script>', '<img src=x onerror=alert(1)>VALUE',
                   'javascript:alert(1)', 'data:text/html,ATTACK', '\x00\x01VALUE\r\nEND',
                   '<svg onload=alert(1)>VALUE</svg>', 'A' * 700,
                   {'nested': '<script>alert(1)</script>'}, ['<img src=x onerror=x>'], 12, False, '']
        for field, limit in TEXT_LIMITS.items():
            for attack in attacks:
                with self.subTest(field=field, attack=attack):
                    with patch.object(main, '_persist_core_state', return_value=True):
                        response = self.post({field: attack})
                    self.assertEqual(response.status_code, 200, response.text)
                    stored = self.row[field]
                    self.assertIsInstance(stored, str)
                    self.assertEqual(stored, hardening.clean(attack, limit))
                    self.assertLessEqual(len(stored), limit)
                    self.assertNotRegex(stored.lower(), r'<[^>]*>|javascript:|data:text/html|onerror=|onload=')
                    if field in response.json()['profile']:
                        self.assertEqual(response.json()['profile'][field], stored)

    def test_valid_text_round_trip_null_omission_and_unchanged_fields(self):
        fields = {'birth_time': '10:30 AM', 'weight': '65 kg', 'brothers': '2', 'sisters': '1',
                  'exp_age_min': '24', 'exp_age_max': '32', 'is_nri': False}
        with patch.object(main, '_persist_core_state', return_value=True):
            response = self.post(fields)
            self.assertEqual(response.status_code, 200, response.text)
            for key, value in fields.items():
                self.assertEqual(self.row[key], value)
            before = copy.deepcopy(self.row)
            response = self.post({key: None for key in fields})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(self.row, before)

    def test_is_nri_normalizes_only_supported_boolean_values(self):
        for value, expected in [(True, True), (False, False), (1, True), (0, False),
                                ('true', True), ('false', False), ('yes', True), ('no', False),
                                ('on', True), ('off', False), ('Y', True), ('N', False)]:
            with self.subTest(value=value), patch.object(main, '_persist_core_state', return_value=True):
                response = self.post({'is_nri': value})
                self.assertEqual(response.status_code, 200, response.text)
                self.assertIs(self.row['is_nri'], expected)

    def test_invalid_is_nri_is_localized_and_atomic(self):
        for value in ['', 'maybe', '<script>alert(1)</script>', 2, [], {}]:
            before = copy.deepcopy(self.row)
            with self.subTest(value=value), patch.object(main, '_persist_core_state') as persist:
                response = self.post({'is_nri': value, 'full_name': 'Must Not Be Stored', 'weight': '<b>55</b>'})
                self.assertEqual(response.status_code, 400, response.text)
                self.assertEqual(response.json()['detail_en'], 'Choose a valid value for overseas status.')
                self.assertIn('విదేశీ నివాస స్థితి', response.json()['detail_te'])
                self.assertEqual(self.row, before)
                persist.assert_not_called()

    def test_owner_guard_and_failed_checkpoint_keep_original_record(self):
        before = copy.deepcopy(self.row)
        fields = {key: '<script>alert(1)</script>' for key in TEXT_LIMITS}
        fields['is_nri'] = True
        response = self.post(fields, auth=False)
        self.assertEqual(response.status_code, 401)
        self.assertEqual(self.row, before)
        with patch.object(main, '_persist_core_state', return_value=False), patch.object(main, '_regenerate_profile_card', return_value=True):
            response = self.post(fields)
        self.assertEqual(response.status_code, 503)
        self.assertEqual(self.row, before)


if __name__ == '__main__':
    unittest.main()
