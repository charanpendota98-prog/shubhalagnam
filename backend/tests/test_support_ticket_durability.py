"""Support-only checkpoint rollback, retry and restart durability."""
import copy
import sys
from pathlib import Path
from unittest.mock import patch
import pytest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import ecosystem3 as E

@pytest.fixture(autouse=True)
def restore_module_state():
    previous=(E.STATE_FILE,E._LOADED_PATH,E._STATE)
    yield
    E.STATE_FILE,E._LOADED_PATH,E._STATE=previous

@pytest.mark.parametrize('throws', [False, True])
def test_support_failed_checkpoint_rolls_back_and_retry_once(tmp_path, monkeypatch, throws):
    monkeypatch.setenv('MANA_VIVAHA_ECOSYSTEM_FILE', str(tmp_path/'eco.json'))
    user={'tsap_id':'FICTIONAL','full_name':'Fictional member'}
    other={'tsap_id':'OTHER','full_name':'Other fictional member'}
    ok,_,original=E.create_support_ticket(other,'general','Other ticket','Unrelated test message')
    assert ok
    state=E._ensure_loaded();unrelated=state['support_tickets'][0]
    before=copy.deepcopy(unrelated)
    args={'side_effect':OSError('synthetic checkpoint')} if throws else {'return_value':False}
    with patch.object(E,'save_state',**args):
        ok,msg,data=E.create_support_ticket(user,'technical','Failed ticket','Synthetic member test message')
    assert not ok and 'could not be saved' in msg and not data
    assert E.list_member_tickets('FICTIONAL')==[]
    assert unrelated is state['support_tickets'][0] and unrelated==before
    ok,_,ticket=E.create_support_ticket(user,'technical','Retry ticket','Synthetic member test message')
    assert ok
    rec=state['support_tickets'][-1];baseline=copy.deepcopy(rec)
    disk=Path(E.STATE_FILE).read_bytes()
    with patch.object(E,'save_state',**args):
        ok,msg,data=E.reply_support_ticket(ticket['ticket_id'],'Fictional staff reply','owner','closed')
    assert not ok and 'could not be saved' in msg and not data
    assert rec is state['support_tickets'][-1] and rec==baseline
    assert Path(E.STATE_FILE).read_bytes()==disk and unrelated==before
    ok,_,saved=E.reply_support_ticket(ticket['ticket_id'],'Fictional staff reply','owner','closed')
    assert ok and saved['status']=='closed' and len(saved['messages'])==2
    E._LOADED_PATH=None
    reloaded=E.list_member_tickets('FICTIONAL')
    assert len(reloaded)==1 and reloaded[0]['status']=='closed' and len(reloaded[0]['messages'])==2
    assert E.list_member_tickets('OTHER')==[original]
