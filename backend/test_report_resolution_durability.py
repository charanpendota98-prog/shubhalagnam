"""Report role checks and failed-save rollback. Isolated fictional records only."""
import os,json,copy,unittest
from unittest.mock import patch
os.environ.update(APP_ENV='test',TSAP_AUTH_MODE='enforce',WHATSAPP_MODE='off')
from test_storage import isolate_test_stores
isolate_test_stores('report-resolution-durability')
from fastapi.testclient import TestClient
import main as M,control_auth as CA
class ReportResolution(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.password='SyntheticReports2026!';encoded=CA.password_hash(cls.password);os.environ['CONTROL_ACCOUNTS_JSON']=json.dumps({r:{'username':r,'password_hash':encoded}for r in ['owner','worker','moderator','support','finance']})
 def setUp(self):
  self.users=[{'tsap_id':'REPORT_TARGET','is_approved':True,'status':'approved','warnings':0},{'tsap_id':'OTHER','is_approved':True}]
  self.reports=[{'id':'REP_TEST','target_id':'REPORT_TARGET','reporter_id':'REPORTER','category':'fake_profile','status':'open'},{'id':'REP_OTHER_SAME','target_id':'REPORT_TARGET','status':'open'},{'id':'REP_UNRELATED','target_id':'OTHER','status':'open'}]
  self.patches=[patch.object(M,'DB_USERS',self.users),patch.object(M,'DB_REPORTS',self.reports)]
  for p in self.patches:p.start()
  self.client=TestClient(M.app,raise_server_exceptions=False)
 def tearDown(self):
  for p in reversed(self.patches):p.stop()
 def login(self,role):
  r=self.client.post('/api/control/login',json={'username':role,'password':self.password});self.assertEqual(r.status_code,200);return {'X-Control-CSRF':self.client.get('/api/control/me').json()['csrf']}
 def resolve(self,headers,action='hide'):
  return self.client.post('/api/control/reports/REP_TEST/resolve',headers=headers,json={'action':action,'note':'Synthetic moderation acceptance'})
 def test_failed_save_false_and_exception_rollback_all_changed_rows(self):
  h=self.login('owner')
  for action in ['hide','warn','ban','dismiss']:
   for outcome in [False,OSError('synthetic storage refusal')]:
    before=copy.deepcopy((self.users,self.reports));uids=[id(u)for u in self.users];rids=[id(r)for r in self.reports]
    with patch.object(M.DBSTORE,'save',side_effect=outcome if isinstance(outcome,Exception) else None,return_value=outcome if not isinstance(outcome,Exception) else None),patch.object(M.CONTROL_AUTH,'audit') as audit:
     r=self.resolve(h,action);self.assertEqual(r.status_code,503,r.text);self.assertNotIn('synthetic storage refusal',r.text);self.assertEqual((self.users,self.reports),before);self.assertEqual([id(u)for u in self.users],uids);self.assertEqual([id(r)for r in self.reports],rids);self.assertFalse(any(c.args and c.args[0]=='control_report_resolve'for c in audit.call_args_list))
 def test_failed_warn_then_retry_applies_once_and_preserves_unrelated(self):
  h=self.login('owner')
  with patch.object(M,'_persist_core_state',return_value=False):self.assertEqual(self.resolve(h,'warn').status_code,503)
  self.assertEqual(self.users[0]['warnings'],0)
  with patch.object(M,'_persist_core_state',return_value=True):self.assertEqual(self.resolve(h,'warn').status_code,200)
  self.assertEqual(self.users[0]['warnings'],1);self.assertEqual([r['status']for r in self.reports],['resolved','resolved','open']);self.assertEqual(self.users[1],{'tsap_id':'OTHER','is_approved':True})
 def test_roles_and_csrf(self):
  for role in ['worker','moderator','support']:
   h=self.login(role);before=copy.deepcopy((self.users,self.reports));self.assertEqual(self.resolve(h,'ban').status_code,403);self.assertEqual((self.users,self.reports),before)
  h=self.login('finance');self.assertEqual(self.resolve(h,'dismiss').status_code,403)
  h=self.login('owner');self.assertEqual(self.resolve({},'dismiss').status_code,403)
  h=self.login('moderator')
  with patch.object(M,'_persist_core_state',return_value=True):self.assertEqual(self.resolve(h,'dismiss').status_code,200)
if __name__=='__main__':unittest.main()
