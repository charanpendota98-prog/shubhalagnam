"""Legacy moderation shares role, CSRF and durable-save boundaries. Fictional state only."""
import copy
import json
import os
import unittest
from unittest.mock import patch
os.environ.update(APP_ENV='test', ENV='test', TSAP_AUTH_MODE='enforce', WA_TEST_FAST='0', WHATSAPP_MODE='off', WA_ENABLED='false')
from test_storage import isolate_test_stores
isolate_test_stores('legacy-moderation-safety')
from fastapi.testclient import TestClient
import main as M
import hardening as H
import control_auth as CA

class LegacyModerationSafety(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.password='Fictional-test-only-2026'
        encoded=CA.password_hash(cls.password)
        os.environ['CONTROL_ACCOUNTS_JSON']=json.dumps({role:{'username':role,'password_hash':encoded} for role in ['owner','worker','moderator','support','finance']})
    def setUp(self):
        self.users=[{'tsap_id':'TARGET','is_approved':True,'status':'approved','warnings':0}, {'tsap_id':'OTHER','is_approved':True}]
        self.reports=[{'id':'REP_TEST','target_id':'TARGET','reporter_id':'REPORTER','category':'fake_profile','severity':'high','status':'open'}, {'id':'REP_SAME','target_id':'TARGET','category':'spam','severity':'low','status':'open'}, {'id':'REP_OTHER','target_id':'OTHER','category':'spam','severity':'low','status':'open'}]
        self.patches=[patch.object(M,'DB_USERS',self.users),patch.object(M,'DB_REPORTS',self.reports),patch.object(H,'STAFF_KEY','fictional-staff-key')]
        for p in self.patches:p.start()
        self.client=TestClient(M.app,raise_server_exceptions=False)
    def tearDown(self):
        for p in reversed(self.patches):p.stop()
    def resolve(self,headers=None,action='warn',rid='REP_TEST'):
        return self.client.post('/api/moderation/resolve/'+rid,headers=headers or {},json={'action':action,'note':'Fictional acceptance note'})
    def login(self,role):
        r=self.client.post('/api/control/login',json={'username':role,'password':self.password})
        self.assertEqual(r.status_code,200,r.text)
        return {'X-Control-CSRF':self.client.get('/api/control/me').json()['csrf']}
    def test_anonymous_and_wrong_key_denied_without_changes(self):
        before=copy.deepcopy((self.users,self.reports))
        for headers in [{},{'X-Admin-Key':'wrong'}]:
            self.assertEqual(self.resolve(headers).status_code,403)
            self.assertEqual((self.users,self.reports),before)
    def test_staff_key_cannot_ban_with_normalized_action(self):
        before=copy.deepcopy((self.users,self.reports))
        for action in ['ban',' BAN ']:
            with patch.object(M,'_persist_core_state') as persist:
                self.assertEqual(self.resolve({'X-Admin-Key':H.STAFF_KEY},action).status_code,403)
                persist.assert_not_called()
            self.assertEqual((self.users,self.reports),before)
    def test_cookie_roles_cannot_ban_even_with_csrf(self):
        before=copy.deepcopy((self.users,self.reports))
        for role in ['worker','moderator','support','finance']:
            headers=self.login(role)
            self.assertEqual(self.resolve(headers,'ban').status_code,403)
            self.assertEqual((self.users,self.reports),before)
    def test_cookie_writes_require_csrf_owner_and_moderator(self):
        before=copy.deepcopy((self.users,self.reports))
        for role in ['owner','moderator']:
            self.login(role)
            for headers in [{},{'X-Control-CSRF':'incorrect'}]:
                with patch.object(M,'_persist_core_state') as persist:
                    self.assertEqual(self.resolve(headers).status_code,403)
                    persist.assert_not_called()
                self.assertEqual((self.users,self.reports),before)
    def test_failed_save_restores_exact_objects_all_actions(self):
        headers={'X-Admin-Key':H.ADMIN_KEY}
        for action in ['warn','hide','ban','dismiss']:
            for outcome in [False,OSError('fictional-storage-failure')]:
                with self.subTest(action=action,outcome=type(outcome).__name__):
                    before=copy.deepcopy((self.users,self.reports));identities=[id(x) for x in self.users+self.reports]
                    with patch.object(M.DBSTORE,'save',side_effect=outcome if isinstance(outcome,Exception) else None,return_value=False),patch.object(CA,'audit') as audit:
                        r=self.resolve(headers,action)
                    self.assertEqual(r.status_code,503,r.text)
                    self.assertNotIn('fictional-storage-failure',r.text)
                    self.assertEqual((self.users,self.reports),before)
                    self.assertEqual([id(x) for x in self.users+self.reports],identities)
                    self.assertFalse(any(c.args and c.args[0]=='legacy_report_resolve' for c in audit.call_args_list))
    def test_owner_ban_and_staff_warning_supported(self):
        for role,action in [('owner','ban'),('moderator','warn')]:
            headers=self.login(role)
            with patch.object(M,'_persist_core_state',return_value=True),patch.object(CA,'audit') as audit:
                r=self.resolve(headers,action)
            self.assertEqual(r.status_code,200,r.text)
            self.assertEqual(r.json()['action'],action)
            self.assertTrue(any(c.args and c.args[0]=='legacy_report_resolve' for c in audit.call_args_list))
        self.assertEqual(self.users[0]['warnings'],1)
        self.assertTrue(self.users[0]['is_banned'])
        self.assertEqual(self.reports[2]['status'],'open')
    def test_failed_warning_retry_applies_once(self):
        headers={'X-Admin-Key':H.STAFF_KEY}
        with patch.object(M,'_persist_core_state',return_value=False):self.assertEqual(self.resolve(headers).status_code,503)
        self.assertEqual(self.users[0]['warnings'],0)
        with patch.object(M,'_persist_core_state',return_value=True):self.assertEqual(self.resolve(headers).status_code,200)
        self.assertEqual(self.users[0]['warnings'],1)
    def test_unknown_action_or_report_no_checkpoint(self):
        before=copy.deepcopy((self.users,self.reports))
        for action,rid in [('invalid','REP_TEST'),('warn','MISSING')]:
            with patch.object(M,'_persist_core_state') as persist:
                self.assertEqual(self.resolve({'X-Admin-Key':H.ADMIN_KEY},action,rid).status_code,400)
                persist.assert_not_called()
            self.assertEqual((self.users,self.reports),before)

if __name__=='__main__':unittest.main()
