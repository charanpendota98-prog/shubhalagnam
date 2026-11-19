"""Expired photo grants can renew without restoring old access or erasing history."""
import copy
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from test_storage import isolate_test_stores
isolate_test_stores('photo-grant-renewal')
os.environ.update(APP_ENV='test', TSAP_AUTH_SECRET='isolated-photo-renewal-tests-only')
import ecosystem3 as E

VIEWER='FICTIONAL-VIEWER'
OWNER='FICTIONAL-OWNER'

@pytest.fixture(autouse=True)
def records():
    state=E._ensure_loaded()
    state.clear()
    state.update(copy.deepcopy(E._DEFAULT_STATE))
    assert E.save_state()
    return state

def seed(records, status='approved', expires='2000-01-01T00:00:00'):
    row={'id':'PHR-SEEDED-OLD','viewer_id':VIEWER,'owner_id':OWNER,'status':status,'expires_at':expires,'note':'Original fictional request'}
    records['photo_access_grants'].append(row)
    assert E.save_state()
    return copy.deepcopy(row)

def test_expired_approval_creates_pending_renewal_without_access(records):
    old=seed(records)
    assert not E.has_photo_access(VIEWER, OWNER)
    ok,status,new=E.request_photo_access(VIEWER, OWNER, 'Fictional renewal request')
    assert ok and status=='pending'
    assert new['id']!=old['id'] and new['note']=='Fictional renewal request'
    assert records['photo_access_grants']==[old,new]
    assert not E.has_photo_access(VIEWER, OWNER)
    assert E.list_photo_access_for_member(OWNER)['incoming'][-1]['status']=='pending'
    assert E.respond_photo_access(OWNER,new['id'],'approved')[0]
    assert E.has_photo_access(VIEWER, OWNER)
    assert records['photo_access_grants'][0]==old

def test_repeated_renewal_reuses_one_pending_request(records):
    seed(records)
    first=E.request_photo_access(VIEWER, OWNER, 'First fictional renewal')[2]
    for _ in range(4):
        ok,status,row=E.request_photo_access(VIEWER,OWNER,'Duplicate')
        assert ok and status=='pending' and row==first
    assert len(records['photo_access_grants'])==2

@pytest.mark.parametrize('status',['declined','revoked'])
def test_closed_grant_allows_new_pending_request(records,status):
    old=seed(records,status)
    ok,state,new=E.request_photo_access(VIEWER,OWNER)
    assert ok and state=='pending' and new['id']!=old['id']
    assert not E.has_photo_access(VIEWER,OWNER)

@pytest.mark.parametrize('status,expires',[
    ('pending',''),
    ('approved',(datetime.utcnow()+timedelta(days=2)).isoformat()),
    ('approved',''),
])
def test_unexpired_or_pending_request_preserves_existing_behavior(records,status,expires):
    old=seed(records,status,expires)
    assert E.request_photo_access(VIEWER,OWNER)==(True,status,old)
    assert records['photo_access_grants']==[old]

def test_pending_renewal_survives_state_reload(records):
    old=seed(records)
    new=E.request_photo_access(VIEWER,OWNER,'Fictional persisted renewal')[2]
    E._LOADED_PATH=None
    assert E.list_photo_access_for_member(OWNER)['incoming']==[old,new]
    assert not E.has_photo_access(VIEWER,OWNER)

def test_other_viewer_cannot_reuse_another_pending_request(records):
    seed(records)
    one=E.request_photo_access(VIEWER,OWNER)[2]
    two=E.request_photo_access('FICTIONAL-OTHER',OWNER)[2]
    assert one['id']!=two['id'] and two['viewer_id']=='FICTIONAL-OTHER'
    assert not E.has_photo_access('FICTIONAL-OTHER',OWNER)
