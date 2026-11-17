"""Pair-scoped block/unblock rollback at failed core checkpoints. Synthetic records only."""
import os,copy,unittest
from unittest.mock import patch
os.environ.update(APP_ENV='test',TSAP_AUTH_MODE='enforce',WHATSAPP_MODE='off')
from test_storage import isolate_test_stores
isolate_test_stores('block-checkpoint-durability')
from fastapi import HTTPException
import main as M
class BlockCheckpoint(unittest.TestCase):
 def records(self):return [{'owner':'OTHER','blocked':'TARGET','reason':'unrelated'},{'owner':'ME','blocked':'TARGET','block_id':'TARGET','at':'original','reason':'safety'},{'owner':'ME','blocked':'ELSE','reason':'retain'}]
 def call(self,action,payload=None):return(M.api_block if action=='block'else M.api_unblock)(payload or{'tsap_id':'ME','block_id':'TARGET'})
 def test_false_and_exception_exact_pair_rollback_retry(self):
  for action in ['block','unblock']:
   for outcome in [False,OSError('synthetic refusal')]:
    with self.subTest(action=action,outcome=type(outcome).__name__):
     blocks=self.records()
     if action=='block':blocks.pop(1)
     before=copy.deepcopy(blocks);ids=list(map(id,blocks));users=[{'tsap_id':'ME'},{'tsap_id':'TARGET'}]
     with patch.object(M,'DB_BLOCKS',blocks),patch.object(M,'DB_USERS',users),patch.object(M,'_find_user',side_effect=lambda i:next((u for u in users if u['tsap_id']==i),None)),patch.object(M,'require_owner',return_value=None):
      with patch.object(M.DBSTORE,'save',side_effect=outcome if isinstance(outcome,Exception)else None,return_value=False):
       with self.assertRaises(HTTPException)as e:self.call(action)
      self.assertEqual(e.exception.status_code,503);self.assertNotIn('synthetic',e.exception.detail);self.assertEqual(blocks,before);self.assertEqual(list(map(id,blocks)),ids)
      with patch.object(M,'_persist_core_state',return_value=True):r=self.call(action)
      self.assertTrue(r['success']);pair=[b for b in blocks if b['owner']=='ME'and b['blocked']=='TARGET'];self.assertEqual(len(pair),1 if action=='block'else 0)
      stable=copy.deepcopy(blocks)
      with patch.object(M,'_persist_core_state',side_effect=AssertionError('no-op must not checkpoint')):self.call(action)
      self.assertEqual(blocks,stable);self.assertEqual([b for b in blocks if b['owner']=='OTHER'],[before[0]])
 def test_duplicate_rows_unblock_failure_restores_order_and_identity(self):
  blocks=self.records();blocks.insert(3,{'owner':'ME','blocked':'TARGET','at':'legacy-duplicate'});before=copy.deepcopy(blocks);ids=list(map(id,blocks))
  with patch.object(M,'DB_BLOCKS',blocks),patch.object(M,'require_owner',return_value=None),patch.object(M,'_persist_core_state',return_value=False):
   with self.assertRaises(HTTPException):self.call('unblock')
  self.assertEqual(blocks,before);self.assertEqual(list(map(id,blocks)),ids)
 def test_owner_guard_no_mutation(self):
  for action in ['block','unblock']:
   blocks=self.records();before=copy.deepcopy(blocks)
   with patch.object(M,'DB_BLOCKS',blocks),patch.object(M,'require_owner',side_effect=HTTPException(401,'Denied')):
    with self.assertRaises(HTTPException)as e:self.call(action)
   self.assertEqual(e.exception.status_code,401);self.assertEqual(blocks,before)
 def test_unblock_target_alias_rollback(self):
  blocks=self.records();before=copy.deepcopy(blocks)
  with patch.object(M,'DB_BLOCKS',blocks),patch.object(M,'require_owner',return_value=None),patch.object(M,'_persist_core_state',return_value=False):
   with self.assertRaises(HTTPException)as e:self.call('unblock',{'owner':'ME','target_id':'TARGET'})
  self.assertEqual(e.exception.status_code,503);self.assertEqual(blocks,before)
if __name__=='__main__':unittest.main()
