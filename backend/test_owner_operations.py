"""Owner operations and member review pagination, disposable stores only."""
import os
os.environ.update(APP_ENV='test', ENV='test', TSAP_AUTH_MODE='enforce')
from test_storage import isolate_test_stores
isolate_test_stores('owner-command-center')
import json, unittest
from unittest.mock import patch
from pathlib import Path
import main, control_auth as CA, hardening as H, referral
from testutil_client import TestClient

class OwnerOperations(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.password='SyntheticOwnerTest2026!'
  encoded=CA.password_hash(cls.password)
  os.environ['CONTROL_ACCOUNTS_JSON']=json.dumps({r:{'username':r,'password_hash':encoded}for r in ['owner','worker','moderator','support','finance']})
 def setUp(self):
  self.client=TestClient(main.app,raise_server_exceptions=False)
  self.patches=[]
  for obj,name,value in [(main,'DB_USERS',[]),(main.growth,'DB_VISITORS',[]),(main.growth,'DB_LEADS',[]),(main.RP19,'PARTNERS',[]),(referral,'PAYOUTS',[]),(main.A11,'STORIES',[])]:
   p=patch.object(obj,name,value);p.start();self.patches.append(p)
  self.path=Path(main.spotlight.SPOTLIGHT_FILE);self.path.parent.mkdir(parents=True,exist_ok=True);self.path.write_text('[]')
 def tearDown(self):
  for p in reversed(self.patches):p.stop()
 def auth(self,role='owner'):
  r=self.client.post('/api/control/login',json={'username':role,'password':self.password});self.assertEqual(r.status_code,200,r.text)
 def test_owner_session_guard_and_post_denial(self):
  self.assertIn(self.client.get('/api/control/operations').status_code,[401,403])
  self.assertEqual(self.client.get('/api/control/operations',headers={'X-Admin-Key':H.ADMIN_KEY}).status_code,403)
  for role in ['worker','moderator','support','finance']:
   self.auth(role);self.assertEqual(self.client.get('/api/control/operations').status_code,403)
  self.auth();r=self.client.get('/api/control/operations');self.assertEqual(r.status_code,200,r.text);self.assertEqual(r.headers['cache-control'],'no-store');self.assertEqual(self.client.post('/api/control/operations',json={}).status_code,405)
 def test_true_zero_counts_and_allowlist(self):
  self.auth();d=self.client.get('/api/control/operations').json();self.assertEqual(d['growth']['leads'],0);self.assertEqual(d['referrals']['partners'],0);self.assertEqual(d['content']['pending_spotlights'],0)
  main.DB_USERS.append({'full_name':'PRIVATE-NAME','phone':'9000091111','referred_by':'PRIVATECODE'})
  main.growth.DB_LEADS.extend([{'phone':'9000091111','notes':'PRIVATE-NOTE','status':'new','contact_consent':True},{'status':'old','contact_consent':False}]);main.RP19.PARTNERS.append({'secret':'PRIVATE-KEY'});referral.PAYOUTS.extend([{'status':'requested','amount':999},{'status':'paid'}]);self.path.write_text('[{"status":"pending_review","phone":"9000091111"}]')
  before=self.path.read_bytes();r=self.client.get('/api/control/operations');d=r.json();self.assertEqual(d['growth']['leads'],2);self.assertEqual(d['growth']['consented_leads'],1);self.assertEqual(d['referrals']['requested_payouts'],1);self.assertEqual(d['content']['pending_spotlights'],1);self.assertEqual(self.path.read_bytes(),before)
  for private in ['PRIVATE','9000091111','999','csrf','password']:self.assertNotIn(private,r.text)
 def test_unknown_malformed_and_error_not_zero(self):
  self.auth()
  with patch.object(main.growth,'DB_LEADS',[None]):self.assertIsNone(self.client.get('/api/control/operations').json()['growth']['leads'])
  self.path.write_text('{broken');r=self.client.get('/api/control/operations');self.assertEqual(r.status_code,503);self.assertEqual(self.path.read_text(),'{broken')
  with patch.object(main.CHAN,'coverage',side_effect=OSError('privatepath')):r=self.client.get('/api/control/operations');self.assertEqual(r.status_code,503);self.assertNotIn('privatepath',r.text)
 def seed(self):
  main.DB_USERS.extend([{'tsap_id':f'SYN{i:03}','full_name':f'Synthetic member {i:03}','district':'Hyderabad' if i%2==0 else 'NTR','status':'pending' if i<22 else 'approved','phone':'9000091111'}for i in range(45)])
 def test_queue_search_pagination_and_no_private_fields(self):
  self.seed();self.auth();r=self.client.get('/api/control/profile-queue?status=all&page=2&page_size=20');d=r.json();self.assertEqual(len(d['items']),20);self.assertEqual(d['matched'],45);self.assertEqual(d['pages'],3);self.assertEqual(d['items'][0]['tsap_id'],'SYN020');self.assertNotIn('9000091111',r.text)
  d=self.client.get('/api/control/profile-queue?status=all&q=HYDERABAD&page=999&page_size=999').json();self.assertEqual(d['matched'],23);self.assertEqual(d['page_size'],100);self.assertEqual(d['page'],1)
  self.assertEqual(self.client.get('/api/control/profile-queue?q=missing').json()['matched'],0)
  self.client.get('/api/control/profile-queue?q=PRIVATEQUERY');self.assertNotIn('PRIVATEQUERY',str(CA.audit_recent(1)))
 def test_worker_pending_only_and_compat_limit(self):
  self.seed();self.auth('worker');self.assertEqual(self.client.get('/api/control/profile-queue?status=all').status_code,403);d=self.client.get('/api/control/profile-queue?page=2&page_size=20').json();self.assertEqual(len(d['items']),2);self.assertTrue(all(x['status']=='pending'for x in d['items']))
  self.auth();self.assertEqual(len(self.client.get('/api/control/profile-queue?limit=3').json()['items']),3);self.assertEqual(self.client.get('/api/control/profile-queue?status=garbage').status_code,400)

if __name__=='__main__':unittest.main()
