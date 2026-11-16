"""Read-only statement regressions with disposable, synthetic accounting rows."""
import copy
import sys
from pathlib import Path
import pytest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from test_storage import isolate_test_stores
isolate_test_stores('statement-accounting')
import referral as R


def user(ledger,wallet,pending=0,paid=0):
    return {'tsap_id':'SYN-STATEMENT','wallet':wallet,'referral_stats':{'ledger':ledger,'wallet':wallet,'pending_payout':pending,'paid_out':paid}}


def commission(reversed=False):
    return {'type':'commission','amount':50,'reversed':reversed,'id':'SYN-REWARD'}


@pytest.mark.parametrize('ledger,wallet,pending,paid',[
    ([],0,0,0),([commission()],50,0,0),
    ([commission(True),{'type':'reversal','amount':-50}],0,0,0),
    ([commission(),{'type':'payout_request','amount':-50}],0,50,0),
    ([commission(),{'type':'payout_request','amount':-50},{'type':'payout_paid','amount':0}],0,0,50),
    ([commission(),{'type':'payout_request','amount':-50},{'type':'payout_reject','amount':50}],50,0,0),
    ([commission(),{'type':'payout_manual_full','amount':-50}],0,0,50),
    ([commission(True),{'type':'payout_request','amount':-50},{'type':'payout_paid','amount':0},{'type':'reversal','amount':-50}],-50,0,50),
])
def test_statement_reconciles_real_accounting_states(ledger,wallet,pending,paid):
    u=user(ledger,wallet,pending,paid)
    out=R.wallet_statement(u)
    assert out['identity']['expected_wallet']==wallet
    assert out['identity']['actual_wallet']==wallet
    assert out['identity']['reconciles'] is True
    assert out['entries'][0]['balance_after']==wallet if ledger else out['entries']==[]


def test_reversal_does_not_subtract_original_reward_twice():
    out=R.wallet_statement(user([commission(True),{'type':'reversal','amount':-50}],0))
    assert out['totals']['earned']==50
    assert out['totals']['reversed']==-50
    assert '₹50 earned' in out['identity']['formula_en']
    assert '= ₹0' in out['identity']['formula_en']


def test_filtered_rows_retain_full_ledger_balance():
    u=user([commission(),{'type':'payout_request','amount':-50},{'type':'payout_reject','amount':50}],50)
    out=R.wallet_statement(u,types=['payout_reject'])
    assert len(out['entries'])==1 and out['entries'][0]['balance_after']==50
    out=R.wallet_statement(u,types=['payout_request'])
    assert out['entries'][0]['balance_after']==0


def test_genuine_mismatch_remains_visible():
    assert R.wallet_statement(user([commission()],17))['identity']['reconciles'] is False


def test_statement_does_not_change_wallet_or_ledger():
    u=user([commission(True),{'type':'reversal','amount':-50}],0)
    before=copy.deepcopy(u)
    R.wallet_statement(u)
    assert u['wallet']==before['wallet']
    assert u['referral_stats']['ledger']==before['referral_stats']['ledger']


def test_earnings_explainer_gross_is_before_reversals():
    u=user([commission(True),{'type':'reversal','amount':-50}],0)
    out=R.earnings_explainer(u,[u])
    assert out['totals']['gross_earned']==50
    assert out['totals']['reversed']==-50
    assert out['totals']['wallet']==0
    assert '₹50 recorded earnings' in out['formula_en']


@pytest.mark.parametrize('action', ['reject','approve','manual','reverse'])
def test_existing_mutators_keep_statement_identity(monkeypatch, action):
    monkeypatch.setattr(R,'save_state',lambda: {'ok':True})
    monkeypatch.setattr(R,'PAYOUTS',[])
    ref={'tsap_id':'SYN-REF','full_name':'Fictional Referrer','phone':'9000019991','credits':3,'plan':'FREE'}
    friend={'tsap_id':'SYN-FRIEND','full_name':'Fictional Friend','phone':'9000019992','credits':3,'plan':'FREE'}
    users=[ref,friend]
    R.ensure_referrer_profile(ref,users)
    assert R.attach_referral(friend,ref['referral_code'],users)['ok']
    reward=R.process_referral_payment(friend,ref['referral_code'],99,users,payment_id='SYN-NO-PROVIDER',plan_code='S_99')
    assert reward.get('success') or reward.get('ok')
    if action=='reverse':
        assert R.reverse_referral_payment(friend,99,users)['success']
    elif action=='manual':
        assert R.pay_wallet_full(ref['referral_code'],users,utr='SYNREFONLY')['ok']
    else:
        req=R.payout_request(ref,50,method='upi',upi_id='fictional@invalid')
        assert req['ok']
        assert R.wallet_statement(ref)['identity']['reconciles'] is True
        assert R.payout_action(req['request']['id'],action,users,utr='SYNREFONLY')['ok']
    before=copy.deepcopy(ref)
    out=R.wallet_statement(ref)
    assert out['identity']['reconciles'] is True
    assert out['identity']['expected_wallet']==ref['referral_stats']['wallet']
    assert ref['wallet']==before['wallet']
    assert ref['referral_stats']['ledger']==before['referral_stats']['ledger']
