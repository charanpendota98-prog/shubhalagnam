"""Owner-scoped create retries replay durably without changing alert consent."""
import json
from pathlib import Path
import pytest
from fastapi import HTTPException
import quality as q

@pytest.fixture(autouse=True)
def isolated(tmp_path,monkeypatch):
    old=q.SAVED_SEARCHES[:];q.SAVED_SEARCHES.clear()
    monkeypatch.setattr(q,'SAVED_STATE_FILE',str(tmp_path/'saved.json'))
    yield
    q.SAVED_SEARCHES[:]=old

def create(owner='FICTIONAL',key='request_12345678',**kw):
    return q.save_search(owner,kw.get('name','Fictional search'),kw.get('filters',{'age_min':27,'age_max':33}),alert=kw.get('alert',False),request_id=key)

def test_commit_response_loss_retry_and_reload(monkeypatch):
    first=create();q.SAVED_SEARCHES.clear();q.load_saved_searches()
    replay=create();assert replay['search_id']==first['search_id']
    assert len(q.SAVED_SEARCHES)==1 and replay['alert'] is False
    assert len(json.loads(Path(q.SAVED_STATE_FILE).read_text()))==1

def test_same_key_different_owner_is_separate():
    assert create()['search_id']!=create(owner='OTHER')['search_id']
    assert len(q.SAVED_SEARCHES)==2

@pytest.mark.parametrize('patch',[{'name':'Other name'},{'filters':{'age_min':28,'age_max':34}},{'alert':True}])
def test_changed_intent_conflicts_without_mutation(patch):
    first=create();before=json.loads(Path(q.SAVED_STATE_FILE).read_text())
    with pytest.raises(HTTPException) as exc:create(**patch)
    assert exc.value.status_code==409 and q.SAVED_SEARCHES==[first]
    assert json.loads(Path(q.SAVED_STATE_FILE).read_text())==before

def test_intentional_new_key_and_legacy_calls_still_create():
    create();create(key='new_request_1234');create(key='');create(key='')
    assert len(q.SAVED_SEARCHES)==4

def test_false_checkpoint_retry_has_no_phantom_key(monkeypatch):
    original=q.save_saved_searches;monkeypatch.setattr(q,'save_saved_searches',lambda:False)
    with pytest.raises(RuntimeError):create()
    assert q.SAVED_SEARCHES==[]
    monkeypatch.setattr(q,'save_saved_searches',original);create();create()
    assert len(q.SAVED_SEARCHES)==1

def test_replay_at_limit_is_allowed_but_new_key_denied():
    first=create()
    for i in range(19):create(key=f'other_request_{i}')
    assert create()['search_id']==first['search_id']
    with pytest.raises(HTTPException):create(key='new_request_after_limit')
    assert len(q.SAVED_SEARCHES)==20

def test_replay_does_not_reenable_later_disabled_alerts():
    first=create(alert=True);q.set_search_alert('FICTIONAL',first['search_id'],False)
    replay=create(alert=True);assert replay['alert'] is False and replay['alert_consent_at']==''

@pytest.mark.parametrize('key',['short','bad key with spaces','x'*101])
def test_invalid_key_never_writes(key):
    with pytest.raises(HTTPException):create(key=key)
    assert q.SAVED_SEARCHES==[]


def test_overlapping_same_process_retries_create_one_row(monkeypatch):
    from concurrent.futures import ThreadPoolExecutor
    import time
    original=q.save_saved_searches
    def delayed():
        time.sleep(.02)
        return original()
    monkeypatch.setattr(q,'save_saved_searches',delayed)
    with ThreadPoolExecutor(max_workers=4) as pool:
        rows=list(pool.map(lambda _:create(),range(4)))
    assert len({row['search_id'] for row in rows})==1 and len(q.SAVED_SEARCHES)==1
