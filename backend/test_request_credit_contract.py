"""Request-credit contract checks. Temporary stores, no external connections."""
import copy
import os
import socket
import sys
import unittest
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
os.environ.update(TSAP_AUTH_MODE='dev', WHATSAPP_MODE='off', WA_TEST_FAST='1')
from test_storage import isolate_test_stores
isolate_test_stores('request-credit-contract')
# An import or test must never send to an outside service.
def deny_connect(*args, **kwargs):
    raise AssertionError('Network connections forbidden in request-credit test')
socket.socket.connect = deny_connect
from fastapi.testclient import TestClient
import main as M
import interest as I


class CreditContract(unittest.TestCase):
    def setUp(self):
        self.sender = dict(tsap_id='CREDIT-A', phone='9000011111', full_name='Credit Test A', gender='Groom', credits=2, status='approved', is_approved=True, is_active=True)
        self.owner = dict(tsap_id='CREDIT-B', phone='9000022222', full_name='Credit Test B', gender='Bride', credits=3, status='approved', is_approved=True, is_active=True)
        self.rec = I.create_interest(self.sender, self.owner)
        self.rec['request_id'] = self.id()
        self.users = [self.sender, self.owner]
        self.records = [self.rec]
        self.patches = [patch.object(M, 'DB_USERS', self.users), patch.object(M, 'DB_INTERESTS', self.records), patch.object(M, 'DB_BLOCKS', []), patch.object(M, 'enqueue_whatsapp', return_value={'queued': False}), patch.object(M, 'start_wa_worker'), patch.object(M, 'log_consent'), patch.object(M, 'save_consent_ledger', return_value=True)]
        for p in self.patches:
            p.start()
            self.addCleanup(p.stop)
        M._reindex_users()
        E = M.ECOSYSTEM3
        with E._LOCK:
            state = E._ensure_loaded()
            state['credit_buckets'].clear()
            state['credit_events'].clear()
            E.save_state()
        E.sync_member_credits(self.sender)
        self.client = TestClient(M.app, raise_server_exceptions=False)
        self.addCleanup(self.client.close)

    def respond(self, action='decline', identity='CREDIT-B'):
        return self.client.post('/api/interest/respond', json={'tsap_id': identity, 'request_id': self.rec['request_id'], 'action': action})

    def expire(self):
        self.rec['created_at'] = (datetime.utcnow() - timedelta(days=8)).isoformat()
        return self.client.get('/api/interest/sent/CREDIT-A')

    def test_decline_exactly_once_and_retry_rejected(self):
        with patch.object(M, '_persist_core_state', return_value=True):
            r = self.respond()
            self.assertEqual(r.status_code, 200, r.text)
            self.assertTrue(self.rec['credit_refunded'])
            self.assertEqual(self.sender['credits'], 3)
            self.assertEqual(self.respond().status_code, 400)
            self.assertEqual(self.respond('accept').status_code, 400)
            self.assertEqual(self.sender['credits'], 3)
            self.assertEqual(M.ECOSYSTEM3.sync_member_credits(self.sender), 3)

    def test_decline_core_failure_then_retry(self):
        with patch.object(M, '_persist_core_state', side_effect=[False, True]):
            self.assertEqual(self.respond().status_code, 503)
            self.assertEqual(self.rec['status'], 'pending')
            self.assertEqual(self.sender['credits'], 2)
            r = self.respond()
            self.assertEqual(r.status_code, 200, r.text)
            self.assertEqual(self.sender['credits'], 3)
            self.assertEqual(M.ECOSYSTEM3.sync_member_credits(self.sender), 3)

    def test_wrong_owner_cannot_return_credit(self):
        with patch.object(M, '_persist_core_state', return_value=True):
            self.assertEqual(self.respond(identity='CREDIT-A').status_code, 403)
            self.assertEqual(self.sender['credits'], 2)
            self.assertEqual(self.rec['status'], 'pending')

    def test_expiry_exactly_once_separate_from_decline(self):
        with patch.object(M, '_persist_core_state', return_value=True):
            self.assertEqual(self.expire().status_code, 200)
            self.assertEqual(self.rec['status'], 'expired')
            self.assertEqual(self.sender['credits'], 3)
            self.assertEqual(self.expire().status_code, 200)
            self.assertEqual(self.respond().status_code, 400)
            self.assertEqual(M.ECOSYSTEM3.sync_member_credits(self.sender), 3)

    def test_expiry_core_failure_restores_state_then_retry(self):
        with patch.object(M, '_persist_core_state', side_effect=[False, True]):
            self.assertEqual(self.expire().status_code, 503)
            self.assertEqual(self.rec['status'], 'pending')
            self.assertEqual(self.sender['credits'], 2)
            self.assertEqual(self.expire().status_code, 200)
            self.assertEqual(self.sender['credits'], 3)

    def test_early_or_accepted_request_does_not_expire(self):
        with patch.object(M, '_persist_core_state', return_value=True):
            self.rec['created_at'] = (datetime.utcnow() - timedelta(days=6, hours=23)).isoformat()
            self.assertEqual(self.client.get('/api/interest/sent/CREDIT-A').status_code, 200)
            self.assertEqual(self.rec['status'], 'pending')
            self.rec['status'] = 'accepted'
            self.expire()
            self.assertEqual(self.rec['status'], 'accepted')
            self.assertEqual(self.sender['credits'], 2)

    def test_consent_failure_does_not_consume_decline_or_return_credit(self):
        with patch.object(M, 'log_consent', side_effect=RuntimeError('persistence_failed: test')):
            self.assertEqual(self.respond().status_code, 503)
            self.assertEqual(self.rec['status'], 'pending')
            self.assertEqual(self.sender['credits'], 2)

    def test_real_core_persistence_records_decline_and_balance_together(self):
        r = self.respond()
        self.assertEqual(r.status_code, 200, r.text)
        snap = M.DBSTORE.load()
        self.assertEqual(next(u for u in snap['users'] if u['tsap_id'] == 'CREDIT-A')['credits'], 3)
        self.assertTrue(next(i for i in snap['interests'] if i['request_id'] == self.rec['request_id'])['credit_refunded'])
        self.assertEqual(self.respond().status_code, 400)
        self.assertEqual(self.sender['credits'], 3)

    def test_real_core_persistence_records_expiry_and_balance_together(self):
        self.assertEqual(self.expire().status_code, 200)
        snap = M.DBSTORE.load()
        self.assertEqual(next(u for u in snap['users'] if u['tsap_id'] == 'CREDIT-A')['credits'], 3)
        self.assertEqual(next(i for i in snap['interests'] if i['request_id'] == self.rec['request_id'])['status'], 'expired')

    def test_contradictory_policy_settings_are_rejected(self):
        from request_credit_policy import validate_request_credit_policy
        from production_gates import validate_operator_config
        validate_request_credit_policy({})
        for value in ['1', 'true', 'yes', 'on']:
            validate_request_credit_policy({'INTEREST_REFUND_ON_DECLINE': value, 'INTEREST_EXPIRY_DAYS': '7'})
        for value in ['false', '0', 'off', 'no', '', 'typo']:
            env = {'INTEREST_REFUND_ON_DECLINE': value}
            with self.assertRaisesRegex(RuntimeError, 'INTEREST_REFUND_ON_DECLINE'):
                validate_request_credit_policy(env)
            with self.assertRaisesRegex(RuntimeError, 'INTEREST_REFUND_ON_DECLINE'):
                validate_operator_config(env, True, ['owner'])
        for value in ['0', '6', '8', '30', 'typo']:
            with self.assertRaisesRegex(RuntimeError, 'INTEREST_EXPIRY_DAYS'):
                validate_request_credit_policy({'INTEREST_EXPIRY_DAYS': value})

    def test_application_import_rejects_disabled_decline_and_extended_expiry(self):
        import subprocess
        for settings in [{'INTEREST_REFUND_ON_DECLINE': 'false'}, {'INTEREST_EXPIRY_DAYS': '8'}]:
            env = dict(os.environ, **settings)
            result = subprocess.run([sys.executable, '-c', 'import interest'], cwd=Path(__file__).resolve().parent, env=env, capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn(next(iter(settings)), result.stderr)


    def test_concurrent_decline_and_expiry_return_only_one_credit(self):
        import asyncio
        from concurrent.futures import ThreadPoolExecutor
        self.rec['created_at'] = (datetime.utcnow() - timedelta(days=8)).isoformat()
        import threading
        ready = threading.Barrier(2)
        def decline():
            ready.wait()
            response = asyncio.run(M.interest_respond({'tsap_id': 'CREDIT-B', 'request_id': self.rec['request_id'], 'action': 'decline'}))
            # Expiry may win. The handler returns JSONResponse(400) for
            # an already decided record, rather than raising HTTPException.
            return getattr(response, 'status_code', 200)
        def expire():
            ready.wait()
            return M._expire_interest_state()
        with patch.object(M, '_persist_core_state', return_value=True), ThreadPoolExecutor(max_workers=2) as pool:
            jobs = [pool.submit(decline), pool.submit(expire)]
            decline_status, _ = [job.result() for job in jobs]
        self.assertEqual(decline_status, 400 if self.rec['status'] == 'expired' else 200)
        self.assertIn(self.rec['status'], ['declined', 'expired'])
        self.assertTrue(self.rec['credit_refunded'])
        self.assertEqual(self.sender['credits'], 3)
        self.assertEqual(M.ECOSYSTEM3.sync_member_credits(self.sender), 3)


if __name__ == '__main__':
    unittest.main(verbosity=2)
