"""Appeal submission only: one ecosystem checkpoint, exact failed-save rollback."""
import ast
import copy
from pathlib import Path
from types import SimpleNamespace
import pytest
from fastapi import HTTPException

@pytest.fixture
def eco(tmp_path, monkeypatch):
    import ecosystem3 as E
    monkeypatch.setenv('MANA_VIVAHA_ECOSYSTEM_FILE',str(tmp_path/'ecosystem.json'))
    E._ensure_loaded()
    yield E

@pytest.mark.parametrize('existing',[False,True])
@pytest.mark.parametrize('failure',['false','raise'])
def test_submission_failure_restores_exact_state_and_retry(eco,monkeypatch,existing,failure):
    E=eco;user={'tsap_id':'FICTIONAL','full_name':'Fictional Member'};save=E.save_state
    if existing:assert E.submit_appeal(user,'Original fictional appeal reason')[0]
    state=E._ensure_loaded();rows=state['moderation_appeals'];other={'id':'OTHER','tsap_id':'OTHER','status':'open','reason':'Keep unrelated','nested':{'keep':True}};rows.insert(0,other)
    state['credit_events']=[{'keep':'credit'}];state['family_activity']=[{'keep':'family'}];assert save()
    snapshot=copy.deepcopy(state);identities=rows[:];credit=state['credit_events'];family=state['family_activity'];original_bytes=Path(E.STATE_FILE).read_bytes()
    def fail():
        state['updated_at']='FAILED';state['credit_events']=[];state['family_activity']=[]
        if failure=='raise':raise OSError('isolated fault')
        return False
    monkeypatch.setattr(E,'save_state',fail)
    ok,msg,rec=E.submit_appeal(user,'Replacement fictional appeal reason')
    assert not ok and 'saved safely' in msg and rec=={};assert state==snapshot;assert state["credit_events"] is credit and state["family_activity"] is family;assert state['moderation_appeals'] is rows;assert all(a is b for a,b in zip(rows,identities));assert rows[0] is other and other['nested']=={'keep':True};assert Path(E.STATE_FILE).read_bytes()==original_bytes
    monkeypatch.setattr(E,'save_state',save);ok,kind,rec=E.submit_appeal(user,'Replacement fictional appeal reason');assert ok and kind==('updated' if existing else 'created');assert len(E.list_member_appeals('FICTIONAL'))==1
    E._LOADED_PATH=None;assert E.list_member_appeals('FICTIONAL')[0]['reason']=='Replacement fictional appeal reason'

def endpoint(E):
    from routers.ecosystem_router import build_ecosystem_router
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    def owner(request,tid):
        if request.headers.get('x-fixture-owner')!=tid:raise HTTPException(401,'Denied')
    noop=lambda *a,**k:None
    ctx={key:noop for key in ['require_admin','is_admin','token_from_request','persist_core_state','log_consent','media_filename','is_approved_profile','safe_user','vendor_is_active_listing','get_state']}
    ctx.update(clean=lambda v,*a:str(v).strip(),find_user=lambda tid:{'tsap_id':tid}if tid=='FICTIONAL'else None,require_owner=owner)
    app=FastAPI();app.include_router(build_ecosystem_router(ctx));return TestClient(app)

@pytest.mark.parametrize('existing',[False,True])
@pytest.mark.parametrize('failure',['false','raise'])
def test_api_submission503_retry_no_ghost(eco,monkeypatch,existing,failure):
    E=eco;c=endpoint(E);headers={'x-fixture-owner':'FICTIONAL'};payload={'tsap_id':'FICTIONAL','reason':'Original fictional appeal reason'};save=E.save_state
    if existing:assert c.post('/api/safety/appeal',headers=headers,json=payload).status_code==200
    before=copy.deepcopy(E._ensure_loaded());payload['reason']='Changed fictional appeal reason'
    def fail():
        if failure=='raise':raise OSError('isolated fault')
        return False
    monkeypatch.setattr(E,'save_state',fail);r=c.post('/api/safety/appeal',headers=headers,json=payload);assert r.status_code==503;assert E._ensure_loaded()==before
    monkeypatch.setattr(E,'save_state',save);r=c.post('/api/safety/appeal',headers=headers,json=payload);assert r.status_code==200 and r.json()['success'];assert len(E.list_member_appeals('FICTIONAL'))==1

def test_submission_validation_and_owner_denial_stay400401(eco,monkeypatch):
    c=endpoint(eco);calls=[];monkeypatch.setattr(eco,'save_state',lambda:calls.append(1));payload={'tsap_id':'FICTIONAL','reason':'short'}
    assert c.post('/api/safety/appeal',json=payload).status_code==401
    assert c.post('/api/safety/appeal',headers={'x-fixture-owner':'FICTIONAL'},json=payload).status_code==400
    assert calls==[] and eco.list_member_appeals('FICTIONAL')==[]
