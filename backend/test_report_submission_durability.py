"""Report submission checkpoint failure, exact rollback and retry. Fictional state only."""
import os,copy,unittest
from unittest.mock import patch
os.environ.update(APP_ENV='test',TSAP_AUTH_MODE='enforce',WHATSAPP_MODE='off')
from test_storage import isolate_test_stores
isolate_test_stores('report-submission-durability')
from fastapi import HTTPException
import main as M
class ReportSubmission(unittest.TestCase):
 def setup_case(self,threshold=True):
  self.users=[{'tsap_id':'TARGET','is_approved':True,'status':'approved'},{'tsap_id':'OTHER','is_approved':True,'hidden_reason':'unrelated'}]
  self.reports=([{'id':'EXISTING','reporter_id':'REPORTER1','target_id':'TARGET','category':'harassment','severity':'high','status':'open'}]if threshold else[])+[{'id':'UNRELATED','reporter_id':'REPORTER1','target_id':'OTHER','category':'spam','severity':'low','status':'open'}]
 def submit(self,category='fake_profile',reporter='REPORTER2'):
  return M.api_report({'reporter_id':reporter,'target_id':'TARGET','category':category,'detail':'Fictional report'})
 def test_false_exception_restore_exact_state_identity_and_retry(self):
  for threshold in [False,True]:
   for outcome in [False,OSError('synthetic refusal')]:
    with self.subTest(threshold=threshold,outcome=type(outcome).__name__):
     self.setup_case(threshold);before=copy.deepcopy((self.users,self.reports));uids=list(map(id,self.users));rids=list(map(id,self.reports))
     with patch.object(M,'DB_USERS',self.users),patch.object(M,'DB_REPORTS',self.reports),patch.object(M,'require_owner',return_value=None):
      with patch.object(M.DBSTORE,'save',side_effect=outcome if isinstance(outcome,Exception)else None,return_value=False):
       with self.assertRaises(HTTPException)as e:self.submit()
      self.assertEqual(e.exception.status_code,503);self.assertNotIn('synthetic',e.exception.detail);self.assertEqual((self.users,self.reports),before);self.assertEqual(list(map(id,self.users)),uids);self.assertEqual(list(map(id,self.reports)),rids)
      with patch.object(M,'_persist_core_state',return_value=True):r=self.submit()
      self.assertTrue(r['success']);self.assertEqual(r['auto_hidden'],threshold);self.assertEqual(self.users[0]['is_approved'],not threshold);self.assertEqual(len(self.reports),len(before[1])+1)
      durable=copy.deepcopy((self.users,self.reports))
      with patch.object(M,'_persist_core_state',side_effect=AssertionError('duplicate must not checkpoint')):dup=self.submit()
      self.assertEqual(dup['kind'],'already_reported');self.assertEqual((self.users,self.reports),durable)
 def test_single_reporter_multiple_categories_does_not_change_threshold(self):
  self.setup_case(True)
  with patch.object(M,'DB_USERS',self.users),patch.object(M,'DB_REPORTS',self.reports),patch.object(M,'require_owner',return_value=None),patch.object(M,'_persist_core_state',return_value=True):r=self.submit(reporter='REPORTER1')
  self.assertFalse(r['auto_hidden']);self.assertTrue(self.users[0]['is_approved'])
 def test_invalid_category_no_mutation_or_checkpoint(self):
  self.setup_case();before=copy.deepcopy((self.users,self.reports))
  with patch.object(M,'DB_USERS',self.users),patch.object(M,'DB_REPORTS',self.reports),patch.object(M,'require_owner',return_value=None),patch.object(M,'_persist_core_state',side_effect=AssertionError('invalid must not checkpoint')):
   with self.assertRaises(HTTPException)as e:self.submit('invalid')
  self.assertEqual(e.exception.status_code,400);self.assertEqual((self.users,self.reports),before)
 def test_owner_check_precedes_mutation(self):
  self.setup_case();before=copy.deepcopy((self.users,self.reports))
  with patch.object(M,'DB_USERS',self.users),patch.object(M,'DB_REPORTS',self.reports),patch.object(M,'require_owner',side_effect=HTTPException(401,'Denied')):
   with self.assertRaises(HTTPException)as e:self.submit()
  self.assertEqual(e.exception.status_code,401);self.assertEqual((self.users,self.reports),before)
if __name__=='__main__':unittest.main()
