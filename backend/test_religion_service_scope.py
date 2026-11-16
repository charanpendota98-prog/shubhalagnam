"""New religion options narrow without rewriting or deleting existing records."""
import os,json,copy
os.environ.update(APP_ENV='test',TSAP_AUTH_MODE='enforce',TSAP_AUTH_SECRET='isolated-religion-contract-secret',ADMIN_KEY='isolated-religion-admin-key',WA_ENABLED='false',PUBLISH_DRY_RUN='true')
from test_storage import isolate_test_stores
isolate_test_stores('religion-service-scope')
import main as M,matchpro as MP,hardening as H,channels_config as C
from testutil_client import TestClient
assert MP.RELIGIONS==['Hindu','Muslim','Christian']
removed=['Sikh','Jain','Buddhist','Other']
with TestClient(M.app,raise_server_exceptions=False) as c:
 assert c.get('/api/meta/religions').json()['religions']==MP.RELIGIONS
 for r in removed:
  assert MP.castes_for(r)['castes']==[]
  before_count=len(M.DB_USERS)
  rejected=c.post('/api/register',data={'gender':'Bride','full_name':'Synthetic Unsupported','dob':'1998-01-01','religion':r,'caste':'Legacy Community','state':'TS','district':'Hyderabad','phone':'9000012333','password':'synthetic-only','consent_confirmed':'true','photo_consent_confirmed':'true'})
  assert rejected.status_code==400,(r,rejected.status_code,rejected.text[:160]);assert 'religion' in rejected.text.lower();assert len(M.DB_USERS)==before_count
  for endpoint,field in [('castes','castes'),('subcastes','subcastes')]:
   meta=c.get('/api/meta/'+endpoint,params={'religion':r}).json();assert meta[field]==[] and meta['allow_custom'] is False and meta['supported'] is False

  u={'tsap_id':'SYN-LEGACY-'+r.upper(),'full_name':'Synthetic Legacy','gender':'Bride','religion':r,'age':28,'dob':'1998-01-01','state':'TS','district':'Hyderabad','caste':'Legacy Community','is_approved':True,'is_active':True,'phone':'9000000111','password_hash':'legacy-hash-preserved','credits':3,'plan':'FREE'}
  M.DB_USERS.append(u);M._reindex_users();assert M._persist_core_state();before=copy.deepcopy(u)
  response=c.post('/api/profile/update',json={'tsap_id':u['tsap_id'],'about_myself':'Updated unrelated legacy profile detail'},headers={'X-Tsap-Token':H.sign_token(u['tsap_id'])})
  assert response.status_code==200,(r,response.status_code,response.text[:160]);assert u['religion']==before['religion'] and u['password_hash']==before['password_hash'] and u['credits']==before['credits'];assert any(x['tsap_id']==u['tsap_id'] for x in M.DB_USERS)
 for key in ['sikh_bride','jain_bride','buddhist_groom','other_religion_bride']:
  assert key in C.CHANNELS and not C.is_public_channel(key);assert c.get('/api/channels/'+key+'/kit').status_code==404
 public=c.get('/api/channels').json();assert public['stats']['total']==85
 assert not any(x in json.dumps(public).lower() for x in ['buddhist','jain_','sikh_','other_religion'])
 print('PASS three choices; four legacy records editable/preserved; hidden directory entries retained internally, public kits404;85public listings')
