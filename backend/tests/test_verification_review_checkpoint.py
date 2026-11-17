"""First ecosystem review checkpoint only. Subsequent core checkpoint is separate."""
import copy
from pathlib import Path
import pytest

@pytest.fixture
def eco(tmp_path,monkeypatch):
    import ecosystem3 as E
    monkeypatch.setenv('MANA_VIVAHA_ECOSYSTEM_FILE',str(tmp_path/'ecosystem.json'));E._ensure_loaded();return E

@pytest.mark.parametrize('badge,flag',[('education','education_verified'),('employment','employment_verified'),('government_id','id_verified'),('selfie','selfie_verified')])
@pytest.mark.parametrize('decision',['approved','rejected'])
@pytest.mark.parametrize('failure',['false','raise'])
def test_failed_review_restores_record_history_badge_and_retry(eco,monkeypatch,badge,flag,decision,failure):
    E=eco;u={'tsap_id':'FICTIONAL',flag:decision=='rejected','selfie_status':'pending','other':{'keep':True}};other={'tsap_id':'OTHER','keep':True};save=E.save_state
    ok,_,r=E.submit_verification_evidence(u,badge,'Fictional evidence','Fictional Degree');assert ok
    state=E._ensure_loaded();rows=state['verification_records'];rec=rows[0];history=rec['history'];snapshot=copy.deepcopy(state);before=copy.deepcopy(u);disk=Path(E.STATE_FILE).read_bytes();badges=E.member_badges(u)
    def fail():
        state['updated_at']='FAILED'
        if failure=='raise':raise OSError('synthetic checkpoint refusal')
        return False
    monkeypatch.setattr(E,'save_state',fail);ok,msg,data=E.review_verification_evidence(r['id'],decision,'Reviewer','Fictional review',[other,u]);assert not ok and 'saved safely' in msg and data=={};assert state==snapshot and rows is state['verification_records'] and rows[0]is rec;assert rec['history']is history;assert u==before and other=={'tsap_id':'OTHER','keep':True};assert E.member_badges(u)==badges and Path(E.STATE_FILE).read_bytes()==disk
    monkeypatch.setattr(E,'save_state',save);ok,_,data=E.review_verification_evidence(r['id'],decision,'Reviewer','Fictional review',[other,u]);assert ok and data['status']==decision and len(data['history'])==1 and u[flag]==(decision=='approved')
    E._LOADED_PATH=None;stored=E.list_verification_queue('all')[0];assert stored['status']==decision and len(stored['history'])==1

def test_missing_invalid_review_do_not_checkpoint(eco,monkeypatch):
    calls=[];monkeypatch.setattr(eco,'save_state',lambda:calls.append(1));assert not eco.review_verification_evidence('NOPE','approved','Reviewer')[0];assert not eco.review_verification_evidence('NOPE','invalid','Reviewer')[0];assert calls==[]

@pytest.mark.parametrize('failure',['false','raise'])
def test_route503_does_not_call_core_persist(eco,monkeypatch,failure):
    from fastapi import FastAPI,HTTPException
    from fastapi.testclient import TestClient
    from routers.ecosystem_router import build_ecosystem_router
    u={'tsap_id':'FICTIONAL'};_,_,rec=eco.submit_verification_evidence(u,'education','Fictional credential');calls=[];noop=lambda *a,**k:None
    ctx={k:noop for k in ['clean','find_user','require_owner','is_admin','token_from_request','log_consent','media_filename','is_approved_profile','safe_user','vendor_is_active_listing']}
    def admin(request,**kw):
        if request.headers.get('x-fixture-role')!='owner':raise HTTPException(403,'denied')
        return 'owner'
    ctx.update(require_admin=admin,get_state=lambda:{'users':[u]},persist_core_state=lambda:calls.append(1));app=FastAPI();app.include_router(build_ecosystem_router(ctx));c=TestClient(app)
    def fail():
        if failure=='raise':raise OSError('isolated fault')
        return False
    monkeypatch.setattr(eco,'save_state',fail);url='/api/admin/verification/'+rec['id']+'/review';assert c.post(url,json={'decision':'approved'}).status_code==403;r=c.post(url,headers={'x-fixture-role':'owner'},json={'decision':'approved'});assert r.status_code==503 and calls==[] and not u.get('education_verified')
