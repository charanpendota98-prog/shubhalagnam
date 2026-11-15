"""Actual multipart signup, campaign and unchanged reward ledger in isolated stores."""
import os,socket
os.environ.update(APP_ENV='test',ENV='test',TSAP_AUTH_MODE='enforce',TSAP_AUTH_SECRET='creator-registration-isolated-secret',WA_MODE='off')
from test_storage import isolate_test_stores
isolate_test_stores('creator-registration')
# This acceptance test must never contact a provider or messaging service.
real_connect=socket.socket.connect
def connect(self,address):
 if isinstance(address,tuple) and address[0] not in ('127.0.0.1','localhost','::1'):raise OSError('External network blocked during isolated test')
 return real_connect(self,address)
socket.socket.connect=connect
import unittest,json
from pathlib import Path
import main,hardening as H,backup39
from testutil_client import TestClient
from testutil_photos import TEST_PROFILE_PHOTO
class CreatorRegistration(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.c=TestClient(main.app,raise_server_exceptions=False)
  cls.owner={'tsap_id':'SYNCR11','full_name':'Synthetic Creator','phone':'9000014701','status':'approved','is_approved':True,'credits':3}
  main.DB_USERS.append(cls.owner);main.REFERRAL.ensure_referrer_profile(cls.owner,main.DB_USERS);cls.code=cls.owner['referral_code'];cls.h={'X-Tsap-Token':H.sign_token(cls.owner['tsap_id'])};cls.n=0
 def signup(self,campaign,code=None):
  type(self).n+=1
  payload={'gender':'Bride','height':"5ft3",'marital_status':'Pelli Kaledu','caste':'Reddy','district':'Nalgonda','state':'TS','full_name':'Synthetic Campaign Bride '+chr(64+self.n),'phone':f'900003{self.n:04d}','job':'Teacher','education':'BEd','salary':'40k','password':'SyntheticSignup123!','dob':'1999-06-15','religion':'Hindu','consent_confirmed':'true','photo_consent_confirmed':'true','referral_code':code or self.code,'referral_campaign':campaign}
  return self.c.post('/api/register',data=payload,files={'photo_file':('profile.jpg',TEST_PROFILE_PHOTO,'image/jpeg')})
 def campaign(self,name):
  r=self.c.post('/api/referral/SYNCR11/campaigns',headers=self.h,json={'name':name,'channel':'youtube'});self.assertEqual(r.status_code,200,r.text);return r.json()['campaign']['id']
 def test_signup_reward_and_durability(self):
  token=self.campaign('Signup reward video');before=self.owner['credits'];r=self.signup(token);self.assertEqual(r.status_code,200,r.text);j=r.json();u=next(x for x in main.DB_USERS if x['tsap_id']==j['tsap_id']);self.assertEqual(u.get('referral_campaign'),token);self.assertEqual(u['credits'],4);self.assertEqual(self.owner['credits'],before+2);self.assertEqual(main.REFERRAL.stats_of(self.owner)['wallet'],0)
  raw=json.loads(Path(main.DBSTORE.DB_FILE).read_text());self.assertEqual(next(x for x in raw['users'] if x['tsap_id']==u['tsap_id'])['referral_campaign'],token)
  # Only a real qualifying ledger entry can increment rewards; not campaign clicks.
  result=main.REFERRAL.process_referral_payment(u,self.code,99,main.DB_USERS,plan_code='S_99',payment_id='SYN-CAMPAIGN-PAY')
  self.assertTrue(result.get('success'),result)
  rows=main._creator_store().report(self.code,main.DB_USERS,main.REFERRAL.qualifying_commission_entries(self.owner['referral_stats']),main.REFERRAL.SITE_URL);self.assertEqual(next(x for x in rows if x['id']==token)['eligible_rewards'],1)
  main.REFERRAL.process_referral_payment(u,self.code,99,main.DB_USERS,plan_code='S_99',payment_id='SYN-CAMPAIGN-PAY')
  self.assertEqual(main.REFERRAL.stats_of(self.owner)['wallet'],50)
  rows=main._creator_store().report(self.code,main.DB_USERS,main.REFERRAL.qualifying_commission_entries(self.owner['referral_stats']),main.REFERRAL.SITE_URL);self.assertEqual(next(x for x in rows if x['id']==token)['recorded_earnings_inr'],50)
  reverse=main.REFERRAL.reverse_referral_payment(u,99,main.DB_USERS);self.assertTrue(reverse.get('success'),reverse)
  rows=main._creator_store().report(self.code,main.DB_USERS,main.REFERRAL.qualifying_commission_entries(self.owner['referral_stats']),main.REFERRAL.SITE_URL);self.assertEqual(next(x for x in rows if x['id']==token)['eligible_rewards'],0)
  self.assertEqual(main.REFERRAL.stats_of(self.owner)['wallet'],0);self.assertEqual(next(x for x in rows if x['id']==token)['recorded_earnings_inr'],0)
  original=u['referral_campaign'];self.assertFalse(main.REFERRAL.attach_referral(u,self.code,main.DB_USERS).get('ok'));self.assertEqual(u['referral_campaign'],original)

 def test_cross_owner_and_pause_do_not_attach(self):
  token=self.campaign('No attribution');main._creator_store().set_status(self.code,token,'paused','2026-11-15T08:00:00');r=self.signup(token);self.assertEqual(r.status_code,200,r.text);u=next(x for x in main.DB_USERS if x['tsap_id']==r.json()['tsap_id']);self.assertNotIn('referral_campaign',u)
  token=self.campaign('Cross owner');other={'tsap_id':'SYNCR12','full_name':'Other Synthetic','phone':'9000014702','is_approved':True,'status':'approved','credits':3};main.DB_USERS.append(other);main.REFERRAL.ensure_referrer_profile(other,main.DB_USERS);r=self.signup(token,other['referral_code']);self.assertEqual(r.status_code,200,r.text);u=next(x for x in main.DB_USERS if x['tsap_id']==r.json()['tsap_id']);self.assertNotIn('referral_campaign',u)
 def test_malformed_campaign_rejected_before_member_write(self):
  before=len(main.DB_USERS);r=self.signup('A'*25);self.assertEqual(r.status_code,400,r.text);self.assertEqual(len(main.DB_USERS),before)
 def test_backup_inventory_and_corruption(self):
  self.campaign('Backup video');self.assertIn(str(Path(main.REFERRAL.STATE_FILE+'.campaigns.json').resolve()),backup39.state_files())
  import zipfile,io
  payload,_=backup39.export_zip()
  with zipfile.ZipFile(io.BytesIO(payload)) as archive:
   campaign_name=Path(main.REFERRAL.STATE_FILE+'.campaigns.json').name
   self.assertIn(campaign_name,archive.namelist());self.assertTrue(json.loads(archive.read(campaign_name))['campaigns'])
  campaign_path=Path(main.REFERRAL.STATE_FILE+'.campaigns.json');before=campaign_path.read_bytes();campaign_path.write_text('{broken');result=backup39.import_zip(payload);self.assertIn(campaign_name,result['restored']);self.assertEqual(campaign_path.read_bytes(),before)
  self.assertIsNotNone(main._creator_store().report(self.code,main.DB_USERS,[],main.REFERRAL.SITE_URL))
if __name__=='__main__':unittest.main()
