import sys,os,json,copy
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from test_storage import isolate_test_stores
isolate_test_stores('webhook-handling-matrix')
os.environ.update(WA_TEST_FAST='1',PAY_UPI_ID='isolated-test@upi')
import main as M,paypro as P
M.DB_USERS[:]=[{'tsap_id':'SYN-WEBHOOK','credits':3,'plan':'FREE','full_name':'Synthetic Webhook','phone':'9000099911'}]
def order(i):
 o={'id':'isolated-'+str(i),'tsap_id':'SYN-WEBHOOK','purpose':'credits','ref':'S_99','amount':99,'final_amount':99,'discount':0,'offer_code':'','label':'synthetic','mode':'razorpay','status':'created','rzp_order_id':'order_iso'+str(i),'created_at':P._now()};P.PAY_ORDERS.append(o);return o
def evt(o,name='payment.captured',**kw):return {'event':name,'payload':{'payment':{'entity':{'id':'pay_'+o['id'],'order_id':o['rzp_order_id'],'amount':9900,'currency':'INR','status':'captured',**kw}}}}
rows=[]
def check(case,event,expected,credits=3):
 before=copy.deepcopy(M.DB_USERS);r=P.handle_razorpay_webhook(event);ok=r.get('reason')==expected if expected else r.get('ok') is True;unchanged=credits is None or M.DB_USERS[0]['credits']==credits;rows.append({'case':case,'result':r,'pass':ok and unchanged});return r
os.environ['APP_ENV']='production'
for i,(case,field,val,reason) in enumerate([('wrong amount','amount',9800,'amount_mismatch'),('wrong currency','currency','USD','currency_mismatch'),('failed capture','status','failed','not_captured'),('missing currency','currency',None,'currency_missing')]):
 o=order(i);e=evt(o);e['payload']['payment']['entity'][field]=val;check(case,e,reason)
for i,env in enumerate(['prod','production','live'],10):
 os.environ['APP_ENV']=env;o=order(i);e=evt(o);del e['payload']['payment']['entity']['amount'];check('missing amount '+env,e,'amount_missing')
for i,env in enumerate(['prod','production','live'],20):
 os.environ['APP_ENV']=env;o=order(i);e=evt(o);del e['payload']['payment']['entity']['status'];check('missing status '+env,e,'status_missing')
# Restore baseline before valid chain, so a baseline defect cannot corrupt its oracle.
M.DB_USERS[0].update(credits=3,plan='FREE');P.PAY_ORDERS.clear();P.PAYMENT_INDEX.clear();P.RECEIPTS.clear();os.environ['APP_ENV']='production';o=order(100)
check('authorized no benefit',evt(o,'payment.authorized',status='authorized'),None)
check('capture benefit once',evt(o),None,8)
check('duplicate capture no double grant',evt(o),None,8)
check('unknown event no grant',{'event':'refund.created','payload':{}},None,8)
print(json.dumps({'pass':sum(x['pass'] for x in rows),'fail':[(x['case'],x['result'].get('reason')) for x in rows if not x['pass']]},indent=2))
assert all(x['pass'] for x in rows)
