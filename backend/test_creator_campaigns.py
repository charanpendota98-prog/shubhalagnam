import unittest
from creator_campaigns import new_campaign, resolve_campaign, campaign_view, validate_video_url
class CreatorCampaignValues(unittest.TestCase):
 def setUp(self):self.row=new_campaign('REF01',[],{'name':'My first video','channel':'youtube'},'2026-11-15T07:25:00')
 def test_owner_bound_and_random_token(self):
  self.assertEqual(len(self.row['id']),24);self.assertIsNotNone(resolve_campaign('REF01',[self.row],self.row['id']));self.assertIsNone(resolve_campaign('OTHER',[self.row],self.row['id']))
 def test_paused_history(self):
  self.row['status']='paused';self.assertIsNone(resolve_campaign('REF01',[self.row],self.row['id']));self.assertIsNotNone(resolve_campaign('REF01',[self.row],self.row['id'],active=False))
 def test_view_does_not_leak(self):
  self.row['phone']='PRIVATE';self.row['wallet']=123;v=campaign_view(self.row,'https://manavivaha.in');self.assertNotIn('phone',v);self.assertNotIn('wallet',v);self.assertIn(self.row['id'],v['link'])
 def test_validation(self):
  for payload in [{'name':'x','channel':'youtube'},{'name':'<script>','channel':'youtube'},{'name':'Good','channel':'invalid'},{'name':'My first video','channel':'youtube'}]:
   with self.assertRaises(ValueError):new_campaign('REF01',[self.row],payload,'now')
 def test_limit_and_case_preservation(self):
  with self.assertRaises(ValueError):new_campaign('REF01',[self.row]*100,{'name':'At limit','channel':'youtube'},'now')
  self.assertIsNone(resolve_campaign('REF01',[self.row],self.row['id']+'X'))
 def test_urls(self):
  self.assertEqual(validate_video_url('https://youtu.be/abc'),'https://youtu.be/abc')
  for url in ['http://youtube.com/a','javascript:alert(1)','https://127.0.0.1/a','https://youtube.com.evil.invalid/a','https://user@youtube.com/a','https://youtube.com:8080/a','https://youtube.com/\nx']:
   with self.assertRaises(ValueError):validate_video_url(url)
 def test_candidates_do_not_mutate_owner_list(self):
  existing=[self.row.copy()];new_campaign('REF01',existing,{'name':'Another','channel':'telegram'},'now');self.assertEqual(existing,[self.row])

class CreatorCampaignPersistence(unittest.TestCase):
 def setUp(self):
  import tempfile,os
  from creator_campaigns import CampaignStore
  self.tmp=tempfile.TemporaryDirectory();self.path=os.path.join(self.tmp.name,'campaigns.json');self.store=CampaignStore(self.path);self.row=self.store.create('REF01',{'name':'Video01','channel':'youtube'},'2026-11-15T07:00:00')
 def tearDown(self):self.tmp.cleanup()
 def test_restart_and_cross_owner(self):
  from creator_campaigns import CampaignStore
  self.assertIsNotNone(CampaignStore(self.path).resolve('REF01',self.row['id']));self.assertIsNone(self.store.resolve('OTHER',self.row['id']))
  with self.assertRaises(LookupError):self.store.set_status('OTHER',self.row['id'],'paused','now')
 def test_replay_and_aggregate_no_pii(self):
  for _ in range(2):self.assertTrue(self.store.record_click('REF01',self.row['id'],'private-ip-user-agent','2026-11-15T07:01:00'))
  raw=__import__('pathlib').Path(self.path).read_text();self.assertNotIn('private-ip',raw)
  users=[{'tsap_id':'U1','referred_by':'REF01','referral_campaign':self.row['id'],'phone':'secret'}]
  report=self.store.report('REF01',users,[{'from':'U1'}],'https://manavivaha.in')[0]
  self.assertEqual((report['clicks'],report['registrations'],report['eligible_rewards']),(1,1,1));self.assertNotIn('secret',str(report));self.assertEqual(self.store.report('OTHER',users,[],'x'),[])
 def test_failed_write_has_no_memory_or_disk_mutation(self):
  from unittest.mock import patch
  raw=__import__('pathlib').Path(self.path).read_text()
  with patch('creator_campaigns.atomic_json_dump',side_effect=OSError('test')):
   with self.assertRaises(OSError):self.store.set_status('REF01',self.row['id'],'paused','now')
  self.assertEqual(__import__('pathlib').Path(self.path).read_text(),raw);self.assertIsNotNone(self.store.resolve('REF01',self.row['id']))
 def test_corrupt_store_fails_closed(self):
  from pathlib import Path
  from creator_campaigns import CampaignStoreUnreadable
  for raw in ['{broken', '{"version":1,"campaigns":[null],"clicks":[]}']:
   Path(self.path).write_text(raw)
   with self.assertRaises(CampaignStoreUnreadable):self.store.report('REF01',[],[],'x')
   with self.assertRaises(CampaignStoreUnreadable):self.store.create('REF01',{'name':'No overwrite','channel':'youtube'},'now')
   self.assertEqual(Path(self.path).read_text(),raw)
 def test_pause_archive(self):
  self.store.set_status('REF01',self.row['id'],'paused','now');self.assertFalse(self.store.record_click('REF01',self.row['id'],'x','2026-11-15T07:01:00'));self.assertIsNone(self.store.resolve('REF01',self.row['id']))
  self.store.set_status('REF01',self.row['id'],'archived','now')
  with self.assertRaises(ValueError):self.store.set_status('REF01',self.row['id'],'active','now')

if __name__=='__main__':unittest.main()
