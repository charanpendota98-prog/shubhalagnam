"""Owner-only read-only bureau operations. All state is disposable."""
import os
os.environ.update(APP_ENV="test", ENV="test", TSAP_AUTH_MODE="enforce")
from test_storage import isolate_test_stores
isolate_test_stores("control-bureaus")
import json
import unittest
from pathlib import Path
from unittest.mock import patch
import control_auth as CA
import main
import hardening as H
from testutil_client import TestClient

class BureauOperations(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.password="SyntheticBureauTest2026!"
  encoded=CA.password_hash(cls.password)
  os.environ["CONTROL_ACCOUNTS_JSON"]=json.dumps({r:{"username":r,"password_hash":encoded} for r in ["owner","worker","moderator","support","finance"]})
  cls.path=Path(main.PHASE2.resolve_phase2_state_file())
 def setUp(self):
  self.path.unlink(missing_ok=True)
  self.client=TestClient(main.app,raise_server_exceptions=False)
 def auth(self, role="owner"):
  r=self.client.post("/api/control/login",json={"username":role,"password":self.password});self.assertEqual(r.status_code,200,r.text)
 def seed(self, n=2):
  ids=[]
  for i in range(n):
   ok,_,d=main.PHASE2.create_bureau_tenant(f"Synthetic bureau {i:03}","Secret owner","Hyderabad" if i%2==0 else "NTR","9000014000");self.assertTrue(ok);ids.append(d)
  return ids
 def test_real_session_owner_and_anonymous_key_and_other_roles_denied(self):
  self.seed();self.assertIn(self.client.get('/api/control/bureaus').status_code,[401,403])
  self.assertEqual(self.client.get('/api/control/bureaus',headers={"X-Admin-Key":H.ADMIN_KEY}).status_code,403)
  for role in ['worker','moderator','support','finance']:
   self.auth(role);self.assertEqual(self.client.get('/api/control/bureaus').status_code,403,role)
  self.auth();r=self.client.get('/api/control/bureaus');self.assertEqual(r.status_code,200,r.text);self.assertEqual(r.headers['cache-control'],'no-store')
 def test_allowlist_counts_and_no_state_write_or_tenant_bypass(self):
  rows=self.seed();bid=rows[0]['bureau_id'];main.PHASE2.add_bureau_seat(bid,"Secret operator")
  st=json.loads(self.path.read_text());st['bureaus'][bid]['seats'].append({'status':'revoked','key_sha256':'PRIVATEHASH'})
  st['bureaus'][bid]['clients']=[{'client_tsap_id':'PRIVATE-ID','notes':'PRIVATE NOTE','consent_confirmed':True},{'client_tsap_id':'OTHER-ID','consent_confirmed':False}];self.path.write_text(json.dumps(st))
  before=self.path.read_bytes();self.auth();r=self.client.get('/api/control/bureaus');self.assertEqual(r.status_code,200,r.text);d=r.json()
  self.assertEqual(d['totals'],{'bureaus':2,'active_seats':1,'revoked_seats':1,'consented_clients':1});self.assertEqual(self.path.read_bytes(),before)
  for val in ['PRIVATE','Secret owner','Secret operator','9000014000','phone_last4','owner_name','owner_key','key_sha256','clients','audit','notes']:
   # consented_clients is the explicit aggregate, not a serialized roster.
   if val=='clients':continue
   self.assertNotIn(val,r.text)
  self.assertEqual(set(d['items'][0]),{'bureau_id','business_name','district','created_at','active_seats','revoked_seats','consented_clients'})
  self.assertEqual(self.client.get(f'/api/bureaus/{bid}/workspace').status_code,403)
  self.assertEqual(self.client.get(f"/api/bureaus/{rows[1]['bureau_id']}/workspace",headers={'X-Bureau-Key':rows[0]['owner_key']}).status_code,403)
 def test_search_pagination_bounds_and_global_totals(self):
  self.seed(23);self.auth();d=self.client.get('/api/control/bureaus?page=2&page_size=20').json();self.assertEqual(len(d['items']),3);self.assertEqual(d['pages'],2)
  d=self.client.get('/api/control/bureaus?q=hyDERAbad&page_size=999&page=999').json();self.assertEqual(d['matched'],12);self.assertEqual(d['totals']['bureaus'],23);self.assertEqual(d['page_size'],50);self.assertEqual(d['page'],1)
  self.assertEqual(self.client.get('/api/control/bureaus?q=missing').json()['matched'],0)
 def test_missing_store_is_true_empty_not_created(self):
  self.auth();r=self.client.get('/api/control/bureaus');self.assertEqual(r.status_code,200);self.assertEqual(r.json()['totals']['bureaus'],0);self.assertFalse(self.path.exists())
 def test_corruption_and_unreadable_fail_not_empty_and_unchanged(self):
  self.auth()
  for body in ['{broken','[]','{}','{"bureaus":[]}','{"bureaus":{"BUR-X":{"seats":[null]}}}','{"bureaus":{"BUR-X":{"clients":{}}}}']:
   self.path.write_text(body);r=self.client.get('/api/control/bureaus');self.assertEqual(r.status_code,503,(body,r.text));self.assertEqual(self.path.read_text(),body)
  with patch('phase2_store.open',side_effect=PermissionError('private path')):
   r=self.client.get('/api/control/bureaus');self.assertEqual(r.status_code,503);self.assertNotIn('private path',r.text)
 def test_query_is_not_audited_and_post_not_allowed(self):
  self.auth();self.client.get('/api/control/bureaus?q=SENSITIVEQUERY');self.assertNotIn('SENSITIVEQUERY',str(CA.audit_recent(1)));self.assertEqual(self.client.post('/api/control/bureaus',json={}).status_code,405)

if __name__=='__main__':unittest.main()
