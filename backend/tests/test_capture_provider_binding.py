import copy
import hashlib
import hmac
import os
import socket
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from test_storage import isolate_test_stores
isolate_test_stores('capture-provider-binding')
os.environ.update(APP_ENV='test', TSAP_AUTH_SECRET='isolated-capture-secret')
import main as M
import paypro as P


@pytest.fixture
def order(monkeypatch):
    monkeypatch.setattr(socket.socket, 'connect', lambda *a, **k: pytest.fail('Provider network forbidden'))
    monkeypatch.setenv('APP_ENV', 'production')
    monkeypatch.setattr(P, 'pay_config', lambda: {'mode': 'razorpay'})
    monkeypatch.setattr(P, '_secret', lambda: 'fixture-secret')
    monkeypatch.setattr(M, 'DB_PAYMENTS', [])
    monkeypatch.setattr(M, '_persist_core_state', lambda: True)
    monkeypatch.setattr(P, '_fire_referral_commission', lambda *args: None)
    monkeypatch.setattr(P, '_persist', lambda: True)
    user = {'tsap_id': 'FICTIONAL-CAPTURE', 'credits': 0, 'plan': 'FREE'}
    monkeypatch.setattr(M, 'DB_USERS', [user])
    M._USERS_ID_MAP.clear()
    po = {'id': 'FICTIONAL-ORDER', 'tsap_id': user['tsap_id'], 'status': 'created',
          'final_amount': 99, 'amount': 99, 'purpose': 'credits', 'ref': 'S_99',
          'rzp_order_id': 'order_fixture', 'created_at': P._now(), 'offer_code': ''}
    monkeypatch.setattr(P, 'PAY_ORDERS', [po])
    monkeypatch.setattr(P, 'RECEIPTS', {})
    monkeypatch.setattr(P, 'PAYMENT_INDEX', {})
    yield po, user
    M._USERS_ID_MAP.clear()


def entity():
    return {'id': 'pay_fixture', 'order_id': 'order_fixture', 'currency': 'INR',
            'status': 'captured', 'captured': True, 'amount': 9900}


def verify():
    signature = hmac.new(b'fixture-secret', b'order_fixture|pay_fixture', hashlib.sha256).hexdigest()
    return P.verify_payment('FICTIONAL-ORDER', 'order_fixture', 'pay_fixture', signature)


@pytest.mark.parametrize('field,value,reason', [
    ('id', 'pay_other', 'payment_mismatch'), ('id', None, 'payment_mismatch'),
    ('order_id', 'order_other', 'capture_order_mismatch'), ('order_id', None, 'capture_order_mismatch'),
    ('currency', 'USD', 'currency_mismatch'), ('currency', None, 'currency_mismatch'),
    ('currency', 'inr', 'currency_mismatch'), ('amount', '9900', 'amount_invalid'),
    ('amount', 9900.5, 'amount_invalid'), ('amount', True, 'amount_invalid'),
    ('amount', None, 'amount_invalid'), ('amount', 9800, 'amount_mismatch'),
])
def test_invalid_provider_entity_never_fulfills(order, monkeypatch, field, value, reason):
    po, user = order
    before = copy.deepcopy((po, user, P.RECEIPTS, P.PAYMENT_INDEX))
    cap = entity(); cap[field] = value
    monkeypatch.setattr(P, '_rzp_payment_status', lambda _: cap)
    monkeypatch.setattr(P, 'fulfill_order', lambda *args: pytest.fail('Invalid capture fulfilled'))
    result = verify()
    assert result['success'] is False and result['reason'] == reason
    assert (po, user, P.RECEIPTS, P.PAYMENT_INDEX) == before


def test_valid_capture_fulfills_once_then_duplicate_does_not_fetch(order, monkeypatch):
    calls = []
    monkeypatch.setattr(P, '_rzp_payment_status', lambda _: entity())
    monkeypatch.setattr(P, 'fulfill_order', lambda *args: calls.append(args) or {'ok': True, 'message_telugu': 'fixture'})
    assert verify()['success'] is True
    monkeypatch.setattr(P, '_rzp_payment_status', lambda _: pytest.fail('Duplicate fetched again'))
    assert verify()['duplicate'] is True
    assert len(calls) == 1


@pytest.mark.parametrize('payload', [entity(), {'id': 'pay_fixture'}, [], None])
def test_real_adapter_preserves_metadata_or_fails_closed(monkeypatch, payload):
    import requests
    monkeypatch.setattr(socket.socket, 'connect', lambda *a, **k: pytest.fail('Network forbidden'))
    monkeypatch.setattr(P, '_key_id', lambda: 'fixture-key')
    monkeypatch.setattr(P, '_secret', lambda: 'fixture-secret')
    class Response:
        status_code = 200
        def json(self): return payload
    monkeypatch.setattr(requests, 'get', lambda *a, **k: Response())
    result = P._rzp_payment_status('pay_fixture')
    if payload == entity():
        assert result == entity()
    elif isinstance(payload, dict):
        assert result['currency'] is None and result['order_id'] is None and not result['captured']
    else:
        assert result['captured'] is False


@pytest.mark.parametrize('field,value', [('currency','USD'),('order_id','order_other'),('id','pay_other'),('amount',9900.7)])
def test_actual_adapter_to_verifier_rejects_bad_metadata(order, monkeypatch, field, value):
    import requests
    payload=entity();payload[field]=value
    monkeypatch.setattr(P,'_key_id',lambda:'fixture-key')
    monkeypatch.setattr(P,'_secret',lambda:'fixture-secret')
    class Response:
        status_code=200
        def json(self):return payload
    monkeypatch.setattr(requests,'get',lambda *a,**k:Response())
    monkeypatch.setattr(P,'fulfill_order',lambda *a:pytest.fail('Bad provider metadata fulfilled'))
    assert verify()['success'] is False
    assert order[0]['status']=='created'


@pytest.mark.parametrize('stored', [None, ''])
def test_captured_entity_needs_stored_provider_order(order, monkeypatch, stored):
    order[0]['rzp_order_id'] = stored
    monkeypatch.setattr(P, '_rzp_payment_status', lambda _: entity())
    assert verify()['reason'] == 'capture_order_mismatch'
    assert order[0]['status'] == 'created'


def test_real_fulfillment_grants_credits_once(order, monkeypatch):
    monkeypatch.setattr(P, '_rzp_payment_status', lambda _: entity())
    assert verify()['success'] is True
    assert order[1]['credits'] == 5
    assert len(M.DB_PAYMENTS) == 1 and len(P.RECEIPTS) == 1
    assert verify()['duplicate'] is True
    assert order[1]['credits'] == 5
    assert len(M.DB_PAYMENTS) == 1 and len(P.RECEIPTS) == 1


@pytest.mark.parametrize('failure', ['http', 'json', 'timeout'])
def test_provider_fetch_failures_do_not_grant(order, monkeypatch, failure):
    import requests
    monkeypatch.setattr(P, '_key_id', lambda: 'fixture-key')
    class Response:
        status_code = 503 if failure == 'http' else 200
        def json(self): raise ValueError('fictional invalid JSON')
    def get(*args, **kwargs):
        if failure == 'timeout': raise requests.Timeout('fictional timeout')
        return Response()
    monkeypatch.setattr(requests, 'get', get)
    monkeypatch.setattr(P, 'fulfill_order', lambda *a: pytest.fail('Fetch failure fulfilled'))
    assert verify()['reason'] == 'not_captured'
    assert order[0]['status'] == 'created' and order[1]['credits'] == 0
    assert not P.RECEIPTS and not M.DB_PAYMENTS
