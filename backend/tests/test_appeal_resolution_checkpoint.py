"""Appeal resolution, not submission or general moderation authority."""
import copy,json
from pathlib import Path
import pytest

@pytest.fixture
def case(tmp_path,monkeypatch):
 import ecosystem3 as E
 monkeypatch.setenv('MANA_VIVAHA_ECOSYSTEM_FILE',str(tmp_path/'eco.json'));E._ensure_loaded()
 u={'tsap_id':'FICTIONAL','is_approved':False,'hidden_reason':'moderation','unrelated':{'keep':True}};o={'tsap_id':'OTHER','is_approved':False}
 _,_,r=E.submit_appeal(u,'Fictional reconsideration','Fictional context');core=tmp_path/'core.json'
 def persist():
  from atomic_store import atomic_json_dump
  atomic_json_dump(core,[u,o]);return True
 persist();return E,u,o,r,core,persist

@pytest.mark.parametrize('outcome',['reinstated','upheld'])
@pytest.mark.parametrize('mode',['false','raise'])
@pytest.mark.parametrize('checkpoint',['eco','core'])
def test_false_raised_checkpoint_restores_then_retry_idempotent(case,monkeypatch,outcome,mode,checkpoint):
 E,u,o,r,core,persist=case;row=E._ensure_loaded()['moderation_appeals'][0];prior=copy.deepcopy((row,u,o));disk=core.read_bytes();save=E.save_state;calls=[]
 def fail():
  calls.append(1)
  if len(calls)==1:
   if mode=='raise':raise OSError('synthetic refusal')
   return False
  return save()if checkpoint=='eco'else persist()
 if checkpoint=='eco':monkeypatch.setattr(E,'save_state',fail)
 ok,msg,data=E.resolve_appeal_durable(r['id'],outcome,'owner','Fictional note',[u,o],fail if checkpoint=='core'else persist)
 assert not ok and 'saved safely'in msg and not data and (row,u,o)==prior and json.loads(core.read_text())==json.loads(disk)
 E._LOADED_PATH=None;assert E.list_admin_appeals('all')[0]==prior[0];monkeypatch.setattr(E,'save_state',save)
 ok,_,data=E.resolve_appeal_durable(r['id'],outcome,'owner','Fictional note',[u,o],persist);assert ok and data['resolution']==outcome and u['is_approved']==(outcome=='reinstated')
 snapshot=copy.deepcopy((E._ensure_loaded(),u,o));assert E.resolve_appeal_durable(r['id'],outcome,'owner','Fictional note',[u,o],persist)[0];assert (E._ensure_loaded(),u,o)==snapshot
 assert not E.resolve_appeal_durable(r['id'],'upheld'if outcome=='reinstated'else'reinstated','owner','Fictional note',[u,o],persist)[0]
 assert not Path(E._appeal_journal_path()).exists()and json.loads(core.read_text())[0]==u and o==prior[2]

@pytest.mark.parametrize('point',['after_eco','after_core','after_commit'])
def test_interrupted_process_reload_undo_or_committed_retry(case,monkeypatch,point):
 E,u,o,r,core,persist=case;before=copy.deepcopy(u);prior=copy.deepcopy(E.list_admin_appeals('all')[0]);clear=E._clear_appeal_journal
 class Crash(BaseException):pass
 def crash():
  if point=='after_core':persist()
  raise Crash()
 if point=='after_commit':
  def commit():clear();raise Crash()
  monkeypatch.setattr(E,'_clear_appeal_journal',commit)
 with pytest.raises(Crash):E.resolve_appeal_durable(r['id'],'reinstated','owner','',[u,o],persist if point=='after_commit'else crash)
 users=json.loads(core.read_text());E._LOADED_PATH=None;monkeypatch.setattr(E,'_clear_appeal_journal',clear)
 def reloadpersist():core.write_text(json.dumps(users));return True
 assert E.recover_appeal_resolution(users,reloadpersist)
 if point!='after_commit':assert users[0]==before and E.list_admin_appeals('all')[0]==prior
 else:assert users[0]['is_approved']and E.list_admin_appeals('all')[0]['resolution']=='reinstated'
 assert E.resolve_appeal_durable(r['id'],'reinstated','owner','',users,reloadpersist)[0]

@pytest.mark.parametrize('fault',['eco','core','unlink'])
def test_compensation_refusal_retains_journal_and_later_recovers(case,monkeypatch,fault):
 E,u,o,r,core,persist=case;before=copy.deepcopy(u);prior=copy.deepcopy(E.list_admin_appeals('all')[0]);save=E.save_state;clear=E._clear_appeal_journal
 def fail():
  if fault=='eco':monkeypatch.setattr(E,'save_state',lambda:False)
  if fault=='unlink':monkeypatch.setattr(E,'_clear_appeal_journal',lambda:(_ for _ in ()).throw(OSError('refused')))
  return False
 ok,msg,_=E.resolve_appeal_durable(r['id'],'reinstated','owner','',[u,o],fail);assert not ok and 'recovery is pending'in msg and u==before
 assert Path(E._appeal_journal_path()).exists()and not E.resolve_appeal_durable(r['id'],'upheld','owner','',[u,o],fail)[0]
 monkeypatch.setattr(E,'save_state',save);monkeypatch.setattr(E,'_clear_appeal_journal',clear);assert E.recover_appeal_resolution([u,o],persist);assert E.list_admin_appeals('all')[0]==prior

@pytest.mark.parametrize('banned',[{'is_banned':True},{'status':'banned'},{'status':'deleted'},{'status':'inactive'},{'is_active':False},{'status':'pending'}])
def test_banned_profile_not_reinstated_or_resolved(case,banned):
 E,u,o,r,core,persist=case;u.update(banned);prior=copy.deepcopy((E._ensure_loaded(),u));ok,msg,_=E.resolve_appeal_durable(r['id'],'reinstated','owner','',[u,o],persist);assert not ok and 'cannot be restored'in msg and (E._ensure_loaded(),u)==prior
 assert E.resolve_appeal_durable(r['id'],'upheld','owner','',[u,o],persist)[0];assert not u['is_approved']


def test_routes_roles_wire_values_validation_and_failed_core(case,monkeypatch):
 from fastapi import FastAPI,HTTPException
 from fastapi.testclient import TestClient
 from routers.ecosystem_router import build_ecosystem_router
 E,u,o,r,core,persist=case;noop=lambda *a,**k:None
 ctx={k:noop for k in ['clean','find_user','require_owner','is_admin','token_from_request','log_consent','media_filename','is_approved_profile','safe_user','vendor_is_active_listing']}
 def admin(req,**kw):
  if req.headers.get('x-fixture-role')not in ['owner','moderator']:raise HTTPException(403,'Denied')
  return req.headers['x-fixture-role']
 calls=[]
 def failonce():
  calls.append(1);return persist()if len(calls)>1 else False
 ctx.update(require_admin=admin,get_state=lambda:{'users':[u,o]},persist_core_state=failonce);app=FastAPI();app.include_router(build_ecosystem_router(ctx));c=TestClient(app);url='/api/admin/appeals/'+r['id']+'/resolve'
 for role in ['finance','support','worker','']:assert c.post(url,headers={'x-fixture-role':role},json={'outcome':'reinstated'}).status_code==403
 h={'x-fixture-role':'moderator'};assert c.post(url,headers=h,json={'outcome':'denied'}).status_code==400
 assert c.post(url,headers=h,json={'outcome':'reinstated'}).status_code==503 and not u['is_approved']
 assert c.post(url,headers=h,json={'outcome':'reinstated'}).status_code==200 and u['is_approved']
 assert c.post(url,headers=h,json={'outcome':'upheld'}).status_code==409


def test_corrupt_or_unwritable_journal_no_mutation(case,monkeypatch):
 E,u,o,r,core,persist=case;before=copy.deepcopy((E._ensure_loaded(),u));Path(E._appeal_journal_path()).write_text('{');assert not E.recover_appeal_resolution([u,o],persist);assert (E._ensure_loaded(),u)==before
 Path(E._appeal_journal_path()).unlink();monkeypatch.setattr(E,'atomic_json_dump',lambda *a,**k:(_ for _ in ()).throw(OSError('refused')));assert not E.resolve_appeal_durable(r['id'],'reinstated','owner','',[u,o],persist)[0];assert (E._ensure_loaded(),u)==before
