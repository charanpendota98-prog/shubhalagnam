"""Preference checkpoint failure restores only preference-owned fields."""
import ast
from pathlib import Path
from types import SimpleNamespace
from datetime import datetime
import pytest
from fastapi import HTTPException

@pytest.mark.parametrize('throws',[False,True])
@pytest.mark.parametrize('existing',[False,True])
def test_preference_checkpoint_rollback_and_retry(throws, existing):
    source=Path(__file__).resolve().parents[1]/'main.py'
    node=next(n for n in ast.parse(source.read_text()).body if isinstance(n,ast.FunctionDef) and n.name=='save_partner_preferences')
    node.decorator_list=[]
    original={'age_min':25,'age_max':30};summary={'ageMin':25}
    user={'tsap_id':'FICTIONAL','unrelated':{'keep':True}}
    if existing:user.update(partner_preferences=original,exp_filters=summary)
    unrelated=user['unrelated'];mode={'fail':True}
    def save(*a,**k):
        assert k['force'] is True
        if mode['fail']:
            if throws:raise OSError('synthetic checkpoint')
            return False
        return True
    scope={'datetime':datetime,'Request':object,'HTTPException':HTTPException,'_find_user':lambda ident:user,'require_owner':lambda *a:None,'DBSTORE':SimpleNamespace(save=save,snapshot=lambda *a:{}),'DB_USERS':[],'DB_INTERESTS':[],'DB_PAYMENTS':[],'DB_OTPS':{},'VERIFIED_PHONES':set(),'DB_VIEWS':[],'DB_SAVES':[],'DB_DIGEST':[],'DB_REPORTS':[],'DB_BLOCKS':[]}
    exec(compile(ast.Module(body=[node],type_ignores=[]),str(source),'exec'),scope)
    payload={'tsap_id':'FICTIONAL','age_min':27,'age_max':34,'height_min':"5'0\"",'height_max':"5'4\""}
    with pytest.raises(HTTPException) as exc:scope['save_partner_preferences'](payload,None)
    assert exc.value.status_code==503
    if existing:assert user['partner_preferences'] is original and user['exp_filters'] is summary
    else:assert 'partner_preferences' not in user and 'exp_filters' not in user
    assert user['unrelated'] is unrelated
    mode['fail']=False
    result=scope['save_partner_preferences'](payload,None)
    assert result['success'] and user['partner_preferences']['age_min']==27
    assert user['unrelated'] is unrelated
