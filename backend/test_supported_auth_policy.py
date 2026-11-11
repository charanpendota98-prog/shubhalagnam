"""Isolated tests: no delivery, live data, real credentials or application workers."""
import ast
import json
import os
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

os.environ['TMPDIR'] = '/var/tmp'
from test_storage import isolate_test_stores
ROOT = isolate_test_stores('supported-auth-policy')
os.environ['APP_ENV'] = 'test'
os.environ['MANA_VIVAHA_PERSISTENT_ROOT'] = ROOT
os.environ['VENDOR_POSTER_DIR'] = os.path.join(ROOT, 'vendor-posters')
os.environ['REFERRAL_POSTER_DIR'] = os.path.join(ROOT, 'referral-posters')
import main as M
import auth_policy as A
import production_gates as G
from fastapi.testclient import TestClient
C = TestClient(M.app)

class SupportedAuthTests(unittest.TestCase):
    def setUp(self):
        self.path = os.path.join(ROOT, 'policy-db.json')
        self.empty = {k: ([] if k != 'otps' else {}) for k in ('users','interests','payments','otps','verified_phones','views','saves','digest')}

    def check_db(self, payload):
        Path(self.path).write_text(json.dumps(payload))
        return G.validate_core_database(self.path)

    def test_manifest_matches_actual_35_module_paths(self):
        actual = {label: (os.path.realpath(v), d) for label,v,d in M._production_storage_paths()}
        resolved = {label: (os.path.realpath(v), d) for label,v,d in G.configured_paths(os.environ)}
        self.assertEqual(len(actual), 35)
        self.assertEqual(actual, resolved)

    def test_shared_authority(self):
        tree = ast.parse(Path(M.__file__).read_text())
        for name, delegate in [('_validate_production_storage','validate_storage'),('_validate_production_core_database','validate_core_database')]:
            fn = next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name == name)
            self.assertTrue(any(isinstance(n,ast.Attribute) and n.attr == delegate for n in ast.walk(fn)))

    def test_empty_marker_required(self):
        with self.assertRaisesRegex(RuntimeError, 'initialization marker'): self.check_db(self.empty)
        self.check_db(dict(self.empty, storage_format=G.STORAGE_FORMAT))

    def test_db_false_greens(self):
        for bad in [{'users':'invalid'}, [], dict(self.empty, users='invalid'), dict(self.empty, users=[{'tsap_id':'X','demo':True}]), dict(self.empty, users=[{'tsap_id':'X'},{'tsap_id':'x'}]), dict(self.empty, users=[{'tsap_id':'X','phone':'9'},{'tsap_id':'Y','phone':'9'}])]:
            with self.subTest(payload=bad), self.assertRaises(RuntimeError): self.check_db(bad)

    def test_each_durable_path_required_and_contained(self):
        paths = M._production_storage_paths()
        for index, (label, value, directory) in enumerate(paths):
            for invalid in ['', '/outside-data/file']:
                bad = list(paths); bad[index] = (label, invalid, directory)
                with self.subTest(label=label,invalid=invalid), self.assertRaises(RuntimeError):
                    G.validate_storage(bad, M.TOKEN_VERSIONS_PATH)

    def test_symlink_root_and_token_containment(self):
        with patch.dict(os.environ, {'MANA_VIVAHA_PERSISTENT_ROOT':'/var/../tmp'}), self.assertRaises(RuntimeError):
            G.validate_storage(M._production_storage_paths(),M.TOKEN_VERSIONS_PATH)
        with self.assertRaises(RuntimeError): G.validate_storage(M._production_storage_paths(),'/outside-data/tokens')

    def test_positive_email_policy_no_phone_requirement(self):
        env = {'EMAIL_MODE':'resend','RESEND_API_KEY':'test-only-key','MANA_VIVAHA_EMAIL_FROM':'Mana Vivaha <noreply@mail.manavivaha.in>'}
        A.validate_production_email(env)
        for key in env:
            bad = dict(env);bad.pop(key)
            with self.subTest(key=key), self.assertRaises(RuntimeError): A.validate_production_email(bad)
        for sender in ['attacker@example.com', 'noreply@mail.manavivaha.in\nBcc:x@y.com', 'x@manavivaha.in.evil.test']:
            with self.subTest(sender=sender), self.assertRaises(RuntimeError): A.validate_production_email(dict(env,MANA_VIVAHA_EMAIL_FROM=sender))
        for mode in ['off','mock','garbage']:
            with self.assertRaises(RuntimeError): A.validate_production_email(dict(env,EMAIL_MODE=mode))

    def test_flags_shared_with_hardening(self):
        for key, values in [('TSAP_AUTH_MODE',['off','test','dev']),('TSAP_AUTH_ENFORCE',['0','false','no']),('WA_TEST_FAST',['1','true','yes','on'])]:
            for value in values:
                with patch.dict(os.environ,{key:value},clear=True):
                    self.assertFalse(A.auth_enforced(os.environ))
                    self.assertFalse(M.auth_enforced())

    def test_capabilities_fail_closed_and_private(self):
        with patch.dict(os.environ,{},clear=True):
            response=C.get('/api/auth/capabilities');data=response.json()
        self.assertEqual(response.status_code,200)
        self.assertFalse(data['phone_otp']);self.assertFalse(data['email_recovery_configured']);self.assertFalse(data['passkeys_configured'])
        self.assertEqual(data['login_identifier'],'phone')
        self.assertEqual(set(data),{'password_login','login_identifier','phone_otp','email_recovery_configured','passkeys_configured','email_optional_at_registration'})
        self.assertIn('no-store',response.headers['cache-control'])
        self.assertFalse(A.capabilities({'MSG91_KEY':'test','WHATSAPP_MODE':'bridge','WA_INSTANCES':'[]'})['phone_otp'])

    def test_no_production_phone_delivery(self):
        with patch.dict(os.environ,{'APP_ENV':'production'}):
            response=C.post('/api/otp/send',json={'phone':'9876543210'})
        self.assertEqual(response.status_code,503)

    def test_operator_flags_and_credentials_fail_closed(self):
        env = {'APP_ENV':'production','TSAP_AUTH_SECRET':'test-only-'+'a'*40,'ADMIN_KEY':'test-only-'+'b'*40,
               'EMAIL_MODE':'resend','RESEND_API_KEY':'test-only','MANA_VIVAHA_EMAIL_FROM':'noreply@mail.manavivaha.in'}
        G.validate_operator_config(env,True,{'owner':{'username':'test-only','password_hash':'test-only'}})
        for key in ['APP_ENV','TSAP_AUTH_SECRET','ADMIN_KEY','EMAIL_MODE','RESEND_API_KEY','MANA_VIVAHA_EMAIL_FROM']:
            bad=dict(env);bad.pop(key)
            with self.subTest(key=key), self.assertRaises(RuntimeError): G.validate_operator_config(bad,True,{'owner':{}})
        for extra in [{'TSAP_RATE_LIMIT':'off'},{'MANA_TEST_PAYMENT_FIXTURES':'true'}]:
            with self.assertRaises(RuntimeError): G.validate_operator_config(dict(env,**extra),True,{'owner':{}})
        with self.assertRaises(RuntimeError): G.validate_operator_config(env,False,{'owner':{}})
        with self.assertRaises(RuntimeError): G.validate_operator_config(env,True,{})

    def test_phone_password_account_without_email_still_logs_in(self):
        user={'tsap_id':'POLICY-TEST-ONLY','phone':'9876543211','password_hash':M._hash_password('test-only-password'),'email':'','status':'approved'}
        before=list(M.DB_USERS)
        try:
            M.DB_USERS[:]=[user]
            result=C.post('/api/auth/login-password',json={'phone':user['phone'],'password':'test-only-password'})
            self.assertEqual(result.status_code,200,result.text)
            self.assertEqual(result.json()['tsap_id'],user['tsap_id'])
            self.assertNotEqual(C.post('/api/auth/login-password',json={'phone':'test@example.com','password':'test-only-password'}).status_code,200)
        finally: M.DB_USERS[:]=before

    def test_verified_email_reset_expiry_replay_and_unverified_denial(self):
        import copy
        from datetime import datetime, timedelta
        user={'tsap_id':'RECOVERY-TEST-ONLY','phone':'9876543212','password_hash':M._hash_password('old-test-password'),
              'email':'test-only@example.com','email_verified':True,'status':'approved'}
        before=list(M.DB_USERS); otps=copy.deepcopy(M.DB_OTPS)
        key=M._EMAIL_KEY_PREFIX+user['email']
        code='12345678'
        def record(expiry):
            M.DB_OTPS[key]={'code_hash':M._otp_digest(code),'expires':expiry.isoformat(),'tries':0,'purpose':'reset_email'}
        def reset():
            return C.post('/api/auth/reset-email',json={'email':user['email'],'code':code,'new_password':'new-test-password'})
        try:
            M.DB_USERS[:]=[user]
            record(datetime.utcnow()-timedelta(seconds=1))
            self.assertEqual(reset().status_code,400)
            self.assertTrue(M._check_password('old-test-password',user['password_hash']))
            record(datetime.utcnow()+timedelta(minutes=10))
            user['email_verified']=False
            self.assertEqual(reset().status_code,400)
            user['email_verified']=True
            self.assertEqual(reset().status_code,200)
            self.assertEqual(reset().status_code,400)
            self.assertTrue(M._check_password('new-test-password',user['password_hash']))
        finally:
            M.DB_USERS[:]=before; M.DB_OTPS.clear(); M.DB_OTPS.update(otps)

    def test_real_preflight_uses_shared_checks_without_main_startup(self):
        import subprocess, sys
        env = dict(os.environ, APP_ENV='production', TSAP_AUTH_SECRET='test-only-'+'a'*40,
                   ADMIN_KEY='test-only-'+'b'*40, EMAIL_MODE='resend', RESEND_API_KEY='test-only-key',
                   MANA_VIVAHA_EMAIL_FROM='noreply@mail.manavivaha.in',
                   CONTROL_ACCOUNTS_JSON='{"owner":{"username":"test-only","password_hash":"test-only"}}',
                   MANA_TEST_PAYMENT_FIXTURES='false', TSAP_AUTH_MODE='enforce', WA_TEST_FAST='false')
        self.check_db(dict(self.empty,storage_format=G.STORAGE_FORMAT))
        env['TSAP_DB_FILE']=self.path
        command=[sys.executable,str(Path(__file__).with_name('preflight.py'))]
        good=subprocess.run(command,env=env,capture_output=True,text=True)
        self.assertEqual(good.returncode,0,good.stdout+good.stderr)
        self.assertNotIn('[HARDENING]',good.stdout)
        env['EMAIL_MODE']='mock'
        bad=subprocess.run(command,env=env,capture_output=True,text=True)
        self.assertNotEqual(bad.returncode,0)
        self.assertIn('test-only-key',env['RESEND_API_KEY'])
        self.assertNotIn(env['RESEND_API_KEY'],bad.stdout+bad.stderr)

    def test_passkeys_require_https_rp_configuration(self):
        for origins in ['http://manavivaha.in','https://evil.test','https://manavivaha.in.evil.test']:
            self.assertFalse(A.capabilities({'PASSKEY_RP_ID':'manavivaha.in','PASSKEY_ALLOWED_ORIGINS':origins})['passkeys_configured'])
        self.assertTrue(A.capabilities({'PASSKEY_RP_ID':'manavivaha.in','PASSKEY_ALLOWED_ORIGINS':'https://manavivaha.in'})['passkeys_configured'])

if __name__ == '__main__': unittest.main(verbosity=2)
