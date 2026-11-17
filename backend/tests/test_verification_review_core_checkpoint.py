"""Two-store review checkpoint and private undo recovery contract."""
import copy,json,os
from pathlib import Path
import pytest

@pytest.fixture
def case(tmp_path,monkeypatch):
 import ecosystem3 as E
 monkeypatch.setenv('MANA_VIVAHA_ECOSYSTEM_FILE',str(tmp_path/'eco.json'));E._ensure_loaded()
 user={'tsap_id':'FICTIONAL','unrelated':{'keep':True}};other={'tsap_id':'OTHER','education_verified':True}
 _,_,record=E.submit_verification_evidence(user,'education','Fictional degree')
 core=tmp_path/'core.json'
 def persist():
  from atomic_store import atomic_json_dump
  atomic_json_dump(core,[user,other]);return True
 persist();return E,user,other,record,core,persist

@pytest.mark.parametrize('badge,flag',[('education','education_verified'),('employment','employment_verified'),('government_id','id_verified'),('selfie','selfie_verified')])
@pytest.mark.parametrize('decision',['approved','rejected'])
@pytest.mark.parametrize('mode',['false','raise'])
def test_core_failure_undo_restores_both_stores_retry_and_idempotent(case,badge,flag,decision,mode):
 E,u,o,r,core,persist=case
 rec=E._ensure_loaded()['verification_records'][0];rec['badge_type']=badge;u[flag]=decision=='rejected'
 if badge=='selfie':u['selfie_status']='approved' if decision=='rejected'else'pending'
 assert E.save_state();persist();before=copy.deepcopy((rec,u,o));disk=core.read_bytes();calls=[]
 def fail_once():
  calls.append(1)
  if len(calls)==1:
   if mode=='raise':raise OSError('synthetic core refusal')
   return False
  return persist()
 ok,msg,data=E.review_verification_durable(r['id'],decision,'owner','Fictional note',[u,o],fail_once)
 assert not ok and 'saved safely' in msg and not data;assert (rec,u,o)==before;assert core.read_bytes()==disk;assert not Path(E._review_journal_path()).exists()
 E._LOADED_PATH=None;assert E.list_verification_queue('all')[0]==before[0]
 ok,_,data=E.review_verification_durable(r['id'],decision,'owner','Fictional note',[u,o],persist);assert ok and data['status']==decision and len(data['history'])==1
 assert u[flag]==(decision=='approved');assert json.loads(core.read_text())[0][flag]==(decision=='approved');assert o==before[2]
 assert E.review_verification_durable(r['id'],decision,'owner','Fictional note',[u,o],persist)[0];assert len(E.list_verification_queue('all')[0]['history'])==1

@pytest.mark.parametrize('breakpoint',['after_ecosystem','after_core'])
def test_process_interruption_recovered_before_ready(case,monkeypatch,breakpoint):
 E,u,o,r,core,persist=case;before=copy.deepcopy(u);prior=copy.deepcopy(E.list_verification_queue('all')[0])
 class Crash(BaseException):pass
 def crash():
  if breakpoint=='after_core':persist()
  raise Crash()
 with pytest.raises(Crash):E.review_verification_durable(r['id'],'approved','owner','',[u,o],crash)
 assert Path(E._review_journal_path()).exists()
 # Simulate independently loaded stores on the next process.
 users=json.loads(core.read_text());E._LOADED_PATH=None
 assert E.recover_verification_review(users,lambda: (core.write_text(json.dumps(users))or True))
 assert users[0]==before and E.list_verification_queue('all')[0]==prior
 assert not Path(E._review_journal_path()).exists()

@pytest.mark.parametrize('fault',['eco','core','unlink'])
def test_compensation_failure_retains_journal_blocks_new_review_and_later_recovers(case,monkeypatch,fault):
 E,u,o,r,core,persist=case;prior=copy.deepcopy(E.list_verification_queue('all')[0]);before=copy.deepcopy(u);save=E.save_state;clear=E._clear_review_journal;calls=[]
 def corefail():
  calls.append(1)
  if fault=='eco'and len(calls)==1:monkeypatch.setattr(E,'save_state',lambda:False)
  if fault=='unlink':monkeypatch.setattr(E,'_clear_review_journal',lambda: (_ for _ in ()).throw(OSError('refused')))
  return False
 ok,msg,_=E.review_verification_durable(r['id'],'approved','owner','',[u,o],corefail)
 assert not ok and 'recovery is pending' in msg and Path(E._review_journal_path()).exists();assert u==before
 assert not E.review_verification_durable(r['id'],'rejected','owner','',[u,o],corefail)[0]
 monkeypatch.setattr(E,'save_state',save);monkeypatch.setattr(E,'_clear_review_journal',clear)
 assert E.recover_verification_review([u,o],persist);assert E.list_verification_queue('all')[0]==prior and u==before


def test_journal_write_failure_never_changes_either_store(case,monkeypatch):
 E,u,o,r,core,persist=case;before=copy.deepcopy((E._ensure_loaded(),u));disk=core.read_bytes()
 monkeypatch.setattr(E,'atomic_json_dump',lambda *a,**k:(_ for _ in ()).throw(OSError('refused')))
 assert not E.review_verification_durable(r['id'],'approved','owner','',[u,o],persist)[0];assert (E._ensure_loaded(),u)==before and core.read_bytes()==disk


def test_corrupt_journal_fails_closed_without_mutation(case):
 E,u,o,r,core,persist=case;before=copy.deepcopy((E._ensure_loaded(),u));Path(E._review_journal_path()).write_text('{')
 assert not E.recover_verification_review([u,o],persist);assert (E._ensure_loaded(),u)==before


def test_ambiguous_core_failure_after_write_is_undone(case):
 E,u,o,r,core,persist=case;before=copy.deepcopy(u);calls=[]
 def ambiguous():
  calls.append(1);persist();return len(calls)>1
 assert not E.review_verification_durable(r['id'],'approved','owner','',[u,o],ambiguous)[0]
 assert json.loads(core.read_text())[0]==before and E.list_verification_queue('all')[0]['status']=='pending'


def test_commit_cleanup_failure_compensates_both_stores(case,monkeypatch):
 E,u,o,r,core,persist=case;before=copy.deepcopy(u);clear=E._clear_review_journal;calls=[]
 def once():
  calls.append(1)
  if len(calls)==1:raise OSError('synthetic unlink refusal')
  clear()
 monkeypatch.setattr(E,'_clear_review_journal',once)
 assert not E.review_verification_durable(r['id'],'approved','owner','',[u,o],persist)[0]
 assert json.loads(core.read_text())[0]==before and u==before and E.list_verification_queue('all')[0]['status']=='pending'
 assert not Path(E._review_journal_path()).exists()
