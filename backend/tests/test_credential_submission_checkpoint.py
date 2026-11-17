"""Verification submission is one ecosystem checkpoint, not staff review."""
import copy
from pathlib import Path
import pytest
from fastapi import HTTPException

@pytest.fixture
def eco(tmp_path, monkeypatch):
    import ecosystem3 as E
    monkeypatch.setenv('MANA_VIVAHA_ECOSYSTEM_FILE',str(tmp_path/'ecosystem.json'))
    E._ensure_loaded()
    return E

@pytest.mark.parametrize('badge',['education','employment','government_id','selfie'])
@pytest.mark.parametrize('existing',[False,True])
@pytest.mark.parametrize('failure',['false','raise'])
def test_failed_submission_exact_rollback_and_retry(eco,monkeypatch,badge,existing,failure):
    E=eco;user={'tsap_id':'FICTIONAL'};save=E.save_state
    if existing:
        assert E.submit_verification_evidence(user,badge,'Original fictional detail','Original Degree')[0]
        rec=E._ensure_loaded()['verification_records'][0];rec.update(status='rejected',rejection_reason='Prior review',history=[{'decision':'rejected','nested':{'keep':True}}]);history=rec['history'];history_row=history[0]
    state=E._ensure_loaded();rows=state['verification_records'];other={'id':'OTHER','tsap_id':'OTHER','status':'approved','history':[{'keep':True}]};rows.insert(0,other)
    state['credit_events']=[{'keep':'credit'}];state['family_activity']=[{'keep':'family'}];assert save()
    snapshot=copy.deepcopy(state);identities=rows[:];credit=state['credit_events'];family=state['family_activity'];disk=Path(E.STATE_FILE).read_bytes()
    def fail():
        state['updated_at']='FAILED';state['credit_events']=[];state['family_activity']=[]
        if failure=='raise':raise OSError('isolated checkpoint refusal')
        return False
    monkeypatch.setattr(E,'save_state',fail);ok,msg,data=E.submit_verification_evidence(user,badge,'Replacement fictional credential','Changed Degree')
    assert not ok and 'saved safely' in msg and data=={};assert state==snapshot and state['verification_records'] is rows;assert all(a is b for a,b in zip(rows,identities));assert rows[0] is other;assert state['credit_events'] is credit and state['family_activity'] is family;assert Path(E.STATE_FILE).read_bytes()==disk
    if existing:assert rec['history'] is history and history[0] is history_row
    monkeypatch.setattr(E,'save_state',save);ok,_,data=E.submit_verification_evidence(user,badge,'Replacement fictional credential','Changed Degree');assert ok and data['status']=='pending';assert data['resubmission_count']==int(existing);assert len(data['history'])==(2 if existing else 0)
    E._LOADED_PATH=None;mine=[x for x in E._ensure_loaded()['verification_records']if x['tsap_id']=='FICTIONAL'];assert len(mine)==1 and mine[0]['document_type']=='Changed Degree'

def client():
    from routers.ecosystem_router import build_ecosystem_router
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    noop=lambda *a,**k:None
    ctx={k:noop for k in ['require_admin','is_admin','token_from_request','persist_core_state','log_consent','media_filename','is_approved_profile','safe_user','vendor_is_active_listing','get_state']}
    def owner(request,tid):
        if request.headers.get('x-fixture-owner')!=tid:raise HTTPException(401,'Denied')
    ctx.update(clean=lambda v,*a:str(v).strip(),find_user=lambda tid:{'tsap_id':tid}if tid=='FICTIONAL'else None,require_owner=owner)
    app=FastAPI();app.include_router(build_ecosystem_router(ctx));return TestClient(app)

@pytest.mark.parametrize('existing',[False,True])
@pytest.mark.parametrize('failure',['false','raise'])
def test_api503_no_ghost_retry200(eco,monkeypatch,existing,failure):
    E=eco;c=client();h={'x-fixture-owner':'FICTIONAL'};url='/api/verification/FICTIONAL/submit';payload={'badge_type':'education','summary':'Original fictional degree'};save=E.save_state
    if existing:assert c.post(url,headers=h,json=payload).status_code==200
    before=copy.deepcopy(E._ensure_loaded());payload['summary']='Changed fictional degree'
    def fail():
        if failure=='raise':raise OSError('isolated fault')
        return False
    monkeypatch.setattr(E,'save_state',fail);r=c.post(url,headers=h,json=payload);assert r.status_code==503;assert E._ensure_loaded()==before
    monkeypatch.setattr(E,'save_state',save);r=c.post(url,headers=h,json=payload);assert r.status_code==200 and r.json()['success'];assert len(E.list_verification_queue())==1

def test_validation_owner_denial_and_masking_unchanged(eco,monkeypatch):
    c=client();url='/api/verification/FICTIONAL/submit';payload={'badge_type':'invalid','summary':'Fictional'};calls=[];save=eco.save_state;monkeypatch.setattr(eco,'save_state',lambda:calls.append(1))
    assert c.post(url,json=payload).status_code==401;assert c.post(url,headers={'x-fixture-owner':'FICTIONAL'},json=payload).status_code==400;assert calls==[]
    monkeypatch.setattr(eco,'save_state',save);payload.update(badge_type='government_id',summary='Fictional masked test 123456789012 ABCDE1234F');r=c.post(url,headers={'x-fixture-owner':'FICTIONAL'},json=payload);assert r.status_code==200;assert '123456789012' not in r.text and 'ABCDE1234F' not in r.text
