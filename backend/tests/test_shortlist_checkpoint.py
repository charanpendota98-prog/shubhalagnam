"""Shortlist checkpoint failures never leak uncommitted in-memory state."""
import ast
from pathlib import Path
from datetime import datetime
from types import SimpleNamespace
import pytest
from fastapi import HTTPException

@pytest.fixture
def endpoint():
    source=Path(__file__).resolve().parents[1]/'main.py';tree=ast.parse(source.read_text())
    nodes=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in ('toggle_save','saved_note_set')]
    for n in nodes:n.decorator_list=[]
    rows=[];mode={'fail':True};calls=[]
    def persist():calls.append(1);return not mode['fail']
    scope={'datetime':datetime,'Request':object,'Body':lambda **k:None,'HTTPException':HTTPException,'clean':lambda value,*a:str(value or '').strip(),'require_owner':lambda *a:None,'_find_user':lambda *a:True,'safety':SimpleNamespace(is_blocked=lambda *a:False),'DB_SAVES':rows,'DB_BLOCKS':[],'_persist_core_state':persist,'SHORTLIST_NOTE_MAX':280}
    exec(compile(ast.Module(body=nodes,type_ignores=[]),str(source),'exec'),scope)
    return scope,rows,mode,calls

@pytest.mark.parametrize('existing',[False,True])
def test_add_remove_failure_exact_rollback_retry(endpoint,existing):
    s,rows,mode,calls=endpoint;other={'tsap_id':'OTHER','saved_id':'KEEP'};row={'tsap_id':'OWNER','saved_id':'TARGET','note':'original','note_at':'before'}
    rows.extend([other,row] if existing else [other]);before=rows[:]
    with pytest.raises(HTTPException) as exc:s['toggle_save']({'tsap_id':'OWNER','target_id':'TARGET'})
    assert exc.value.status_code==503 and rows==before
    assert all(a is b for a,b in zip(rows,before))
    mode['fail']=False;r=s['toggle_save']({'tsap_id':'OWNER','target_id':'TARGET'})
    assert r['success'] and r['saved'] is not existing and rows[0] is other

@pytest.mark.parametrize('existing_fields',[False,True])
@pytest.mark.parametrize('note',['replacement',''])
def test_note_failure_restores_exact_fields_and_retry(endpoint,existing_fields,note):
    s,rows,mode,calls=endpoint;row={'tsap_id':'OWNER','saved_id':'TARGET','unrelated':{'keep':True}}
    if existing_fields:row.update(note='before',note_at='old-time')
    rows.append(row);before=dict(row);identity=row['unrelated']
    with pytest.raises(HTTPException) as exc:s['saved_note_set']('OWNER','TARGET',{'note':note})
    assert exc.value.status_code==503 and row==before and rows[0] is row and row['unrelated'] is identity
    mode['fail']=False;r=s['saved_note_set']('OWNER','TARGET',{'note':note});assert r['success'] and row['note']==note

def test_denied_owner_does_not_mutate_or_checkpoint(endpoint):
    s,rows,mode,calls=endpoint
    def deny(*a):raise HTTPException(401,'denied')
    s['require_owner']=deny
    for name,args in [('toggle_save',({'tsap_id':'OWNER','target_id':'TARGET'},)),('saved_note_set',('OWNER','TARGET',{'note':'x'}))]:
        with pytest.raises(HTTPException) as exc:s[name](*args)
        assert exc.value.status_code==401
    assert rows==[] and calls==[]
