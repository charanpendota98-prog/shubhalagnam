"""Webhook and Checkout secrets are different trust boundaries. No network calls."""
import os,sys,hmac,hashlib
sys.path.insert(0,os.path.dirname(__file__))
from test_storage import isolate_test_stores
isolate_test_stores('webhook-secret-boundary')
import paypro as P
body=b'{"event":"payment.captured"}';api='synthetic-api-secret';wh='synthetic-webhook-secret'
for k in ['RAZORPAY_SECRET','RAZORPAY_KEY_SECRET','RAZORPAY_WEBHOOK_SECRET']:os.environ.pop(k,None)
def sig(k,b=body):return hmac.new(k.encode(),b,hashlib.sha256).hexdigest()
checks=[]
def check(name,ok):checks.append((name,ok));print(('PASS ' if ok else 'FAIL ')+name)
check('no secret fails closed',not P.verify_webhook_signature(body,sig(api)))
os.environ['RAZORPAY_KEY_SECRET']=api
check('API-only must not authenticate webhook',not P.verify_webhook_signature(body,sig(api)))
os.environ['RAZORPAY_WEBHOOK_SECRET']=wh
check('configured webhook secret authenticates exact raw bytes',P.verify_webhook_signature(body,sig(wh)))
check('API secret rejected with webhook configured',not P.verify_webhook_signature(body,sig(api)))
check('mutated bytes rejected',not P.verify_webhook_signature(body+b' ',sig(wh)))
check('empty signature rejected',not P.verify_webhook_signature(body,''))
check('empty body rejected',not P.verify_webhook_signature(b'',sig(wh)))
check('nonhex signature rejected',not P.verify_webhook_signature(body,'zz'*32))
check('uppercase hex rejected',not P.verify_webhook_signature(body,sig(wh).upper()))
assert all(ok for _,ok in checks)
print(f'{len(checks)}/{len(checks)} passed; isolated signature checks, not provider delivery')
