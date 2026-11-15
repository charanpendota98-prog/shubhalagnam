"""Isolated transport ownership and campaign persistence tests; no provider calls."""
import os
os.environ.update(APP_ENV='test',ENV='test',TSAP_AUTH_MODE='enforce',TSAP_AUTH_SECRET='creator-isolated-test-secret')
from test_storage import isolate_test_stores
isolate_test_stores('creator-campaign-api')
import unittest
import main,hardening as H
from testutil_client import TestClient
from unittest.mock import patch

class CreatorCampaignAPI(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.c=TestClient(main.app,raise_server_exceptions=False)
  cls.owner={'tsap_id':'SYNCR01','full_name':'Synthetic Creator','phone':'9000014501','status':'approved','is_approved':True,'credits':3}
  main.DB_USERS.append(cls.owner);main.REFERRAL.ensure_referrer_profile(cls.owner,main.DB_USERS)
  cls.headers={'X-Tsap-Token':H.sign_token('SYNCR01')};cls.path='/api/referral/SYNCR01/campaigns'
 def create(self,name):
  r=self.c.post(self.path,json={'name':name,'channel':'youtube'},headers=self.headers);self.assertEqual(r.status_code,200,r.text);return r.json()['campaign']
 def test_owner_auth_and_no_contact_in_report(self):
  self.assertIn(self.c.get(self.path).status_code,[401,403]);other={'X-Tsap-Token':H.sign_token('SYNOTHER')};self.assertIn(self.c.get(self.path,headers=other).status_code,[401,403]);self.create('Owner auth video');r=self.c.get(self.path,headers=self.headers);self.assertEqual(r.status_code,200);self.assertNotIn('9000014501',r.text)
 def test_click_bound_to_referrer_and_paused(self):
  row=self.create('Click video');code=self.owner['referral_code'];url='/api/referral/click/'+code+'?campaign='+row['id'];r=self.c.post(url);self.assertEqual(r.status_code,200,r.text);self.assertTrue(r.json()['campaign_recorded']);self.c.post(url);report=self.c.get(self.path,headers=self.headers).json()['campaigns'];self.assertEqual(next(x for x in report if x['id']==row['id'])['clicks'],1)
  r=self.c.post(self.path+'/'+row['id']+'/status',headers=self.headers,json={'status':'paused'});self.assertEqual(r.status_code,200);self.assertFalse(self.c.post(url).json()['campaign_recorded'])
 def test_atomic_write_failure_is_not_success(self):
  with patch('creator_campaigns.atomic_json_dump',side_effect=OSError('isolated write failure')):
   r=self.c.post(self.path,headers=self.headers,json={'name':'Will not persist','channel':'telegram'});self.assertEqual(r.status_code,503,r.text)
  self.assertNotIn('Will not persist',self.c.get(self.path,headers=self.headers).text)
 def test_corrupt_file_returns_unavailable_without_overwrite(self):
  from pathlib import Path
  p=Path(main.REFERRAL.STATE_FILE+'.campaigns.json');prior=p.read_bytes() if p.exists() else None
  try:
   p.write_text('{broken');self.assertEqual(self.c.get(self.path,headers=self.headers).status_code,503)
   self.assertEqual(self.c.post(self.path,headers=self.headers,json={'name':'Corrupt test','channel':'youtube'}).status_code,503);self.assertEqual(p.read_text(),'{broken')
  finally:
   if prior is not None:p.write_bytes(prior)
   else:p.unlink(missing_ok=True)
 def test_partner_scope(self):
  p={'partner_id':'SYN-PARTNER','referral_code':'SYN-PARTNER','name':'Synthetic Partner','phone':'9000014599'};main.RP19.PARTNERS.append(p);url='/api/referral/SYN-PARTNER/campaigns';self.assertEqual(self.c.get(url,headers=self.headers).status_code,401)
  h={'X-Partner-Token':H.sign_token('partner:SYN-PARTNER',ttl_seconds=3600,scope='partner')};r=self.c.post(url,headers=h,json={'name':'Partner campaign','channel':'telegram'});self.assertEqual(r.status_code,200,r.text);self.assertEqual(self.c.get(url,headers=h).status_code,200);self.assertNotIn('9000014599',r.text)
if __name__=='__main__':unittest.main()
