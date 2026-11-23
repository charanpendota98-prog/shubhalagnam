"""A block must override accepted-request views, status and response access."""
import os,sys,copy
os.environ['TSAP_AUTH_MODE']='dev'
os.environ['WHATSAPP_MODE']='off'
os.environ['WA_TEST_FAST']='1'
sys.path.insert(0,os.path.dirname(__file__))
from test_storage import isolate_test_stores
isolate_test_stores('blocked-request-contact')
from fastapi.testclient import TestClient
import main as M
from interest import create_interest
from unittest.mock import patch
users=[dict(tsap_id='BLOCK-A',phone='9000011111',full_name='Block Test A',gender='Groom',credits=3,status='approved',is_approved=True,is_active=True),dict(tsap_id='BLOCK-B',phone='9000022222',full_name='Block Test B',gender='Bride',credits=3,status='approved',is_approved=True,is_active=True)]
rec=create_interest(users[0],users[1]);rec.update(status='accepted',contact_shared=True)
other=copy.deepcopy(rec);other.update(request_id='UNRELATED',from_id='BLOCK-C',to_id='BLOCK-D')
with TestClient(M.app,raise_server_exceptions=False) as c,patch.object(M,'DB_USERS',users),patch.object(M,'DB_INTERESTS',[rec,other]),patch.object(M,'DB_BLOCKS',[]),patch.object(M,'_persist_core_state',return_value=True):
 for path,key,phone in [('/api/interest/sent/BLOCK-A','sent',users[1]['phone']),('/api/interest/inbox/BLOCK-B','received',users[0]['phone'])]:
  r=c.get(path);assert r.status_code==200 and phone not in str(r.json()) and phone[:2]+'•' in str(r.json()),r.text
 before=copy.deepcopy(rec)
 for blocker,blocked in [('BLOCK-A','BLOCK-B'),('BLOCK-B','BLOCK-A')]:
  M.DB_BLOCKS[:]=[]
  r=c.post('/api/block',json={'tsap_id':blocker,'block_id':blocked});assert r.status_code==200,r.text
  for path,key in [('/api/interest/sent/BLOCK-A','sent'),('/api/interest/inbox/BLOCK-B','received')]:
   r=c.get(path);assert r.status_code==200 and r.json()[key]==[],r.text
   assert all(u['phone'] not in str(r.json())for u in users)
  for path in ['/api/interest/status/'+rec['request_id'],'/api/interest/'+rec['request_id']+'/timeline']:
   r=c.get(path);assert r.status_code==403,r.text
  for action,identity in [('accept','BLOCK-B'),('decline','BLOCK-B'),('withdraw','BLOCK-A')]:
   r=c.post('/api/interest/respond',json={'tsap_id':identity,'request_id':rec['request_id'],'action':action});assert r.status_code==403,r.text
  assert rec==before and other in M._visible_interest_records()
  for viewer,target in [('BLOCK-A','BLOCK-B'),('BLOCK-B','BLOCK-A')]:
   r=c.post('/api/unlock',json={'viewer_id':viewer,'target_id':target});assert r.status_code==403,r.text
  r=c.post('/api/unblock',json={'tsap_id':blocker,'block_id':blocked});assert r.status_code==200 and r.json()['success']
  # Preserve existing unblock semantics and request history, no permanent revoke.
  assert c.get('/api/interest/status/'+rec['request_id']).status_code==200
  assert c.get('/api/interest/sent/BLOCK-A').json()['sent'][0]['contact']!=users[1]['phone'] and users[1]['phone'] not in c.get('/api/interest/sent/BLOCK-A').text
print('PASS blocked request sent/inbox/status/timeline/respond/unlock both directions; unrelated history and unblock semantics retained')
