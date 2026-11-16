"""Range rejection is side-effect free; supported equal/legacy bounds survive."""
import ast
from pathlib import Path
from types import SimpleNamespace
from datetime import datetime
import pytest
from fastapi import HTTPException

@pytest.fixture
def endpoint():
    source=Path(__file__).resolve().parents[1]/'main.py'
    node=next(n for n in ast.parse(source.read_text()).body if isinstance(n,ast.FunctionDef) and n.name=='save_partner_preferences')
    node.decorator_list=[]
    old={'age_min':25,'age_max':35};summary={'ageMin':25};unrelated={'keep':True}
    user={'tsap_id':'FICTIONAL','partner_preferences':old,'exp_filters':summary,'unrelated':unrelated}
    saves=[];owners=[]
    scope={'datetime':datetime,'Request':object,'HTTPException':HTTPException,'_find_user':lambda ident:user,'require_owner':lambda *a:owners.append(a),'DBSTORE':SimpleNamespace(save=lambda *a,**k:saves.append(k) or True,snapshot=lambda *a:{}),'DB_USERS':[],'DB_INTERESTS':[],'DB_PAYMENTS':[],'DB_OTPS':{},'VERIFIED_PHONES':set(),'DB_VIEWS':[],'DB_SAVES':[],'DB_DIGEST':[],'DB_REPORTS':[],'DB_BLOCKS':[]}
    exec(compile(ast.Module(body=[node],type_ignores=[]),str(source),'exec'),scope)
    return scope,user,old,summary,unrelated,saves,owners

@pytest.mark.parametrize('patch',[
    {'age_min':40,'age_max':22},{'age_min':'invalid'},{'age_max':False},
    {'age_min':17},{'age_min':0},{'age_max':-1},{'age_min':27.5},
    {'height_min':"6'0\"",'height_max':"5'0\""},
    {'height_min':'180 cm','height_max':"5'0\""},
    {'height_min':'junk'},{'height_max':"5'12\""},{'height_min':'5.99'},
])
def test_invalid_ranges_never_mutate_or_checkpoint(endpoint,patch):
    scope,user,old,summary,unrelated,saves,owners=endpoint
    payload={'tsap_id':'FICTIONAL','age_min':25,'age_max':35,**patch}
    with pytest.raises(HTTPException) as exc:scope['save_partner_preferences'](payload,None)
    assert exc.value.status_code==400
    assert user['partner_preferences'] is old and user['exp_filters'] is summary
    assert user['unrelated'] is unrelated and saves==[] and len(owners)==1

@pytest.mark.parametrize('patch',[
    {'age_min':31,'age_max':33},{'age_min':18,'age_max':18},
    {'age_min':'31','age_max':'33'},
    {'height_min':"5'4\"",'height_max':"5'4\""},
    {'height_min':'5.4','height_max':'6.0'},
    {'height_min':'160 cm','height_max':'180 cm'},
    {'height_min':'160 cm','height_max':"6'0\""},
    {'height_min':'','height_max':''},
])
def test_valid_bounds_remain_exact(endpoint,patch):
    scope,user,old,summary,unrelated,saves,owners=endpoint
    result=scope['save_partner_preferences']({'tsap_id':'FICTIONAL',**patch},None)
    assert result['success'] and saves==[{'force':True}]
    for k,v in patch.items():assert user['partner_preferences'][k]==(int(v) if k.startswith('age') else v)
    assert user['unrelated'] is unrelated

def test_ownership_precedes_validation(endpoint):
    scope,user,old,summary,unrelated,saves,owners=endpoint
    def deny(*a):raise HTTPException(401,'unauthorized')
    scope['require_owner']=deny
    with pytest.raises(HTTPException) as exc:scope['save_partner_preferences']({'tsap_id':'FICTIONAL','age_min':'invalid'},None)
    assert exc.value.status_code==401 and saves==[] and user['partner_preferences'] is old
