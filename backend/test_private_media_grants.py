"""Private-media grants cannot outlive visibility or recipient authentication."""
from pathlib import Path
import sys,os,json,secrets,hashlib
sys.path.insert(0,str(Path(__file__).resolve().parent))
from test_storage import isolate_test_stores
isolate_test_stores('private-media-grants')
os.environ.update(TSAP_AUTH_MODE='prod',TSAP_AUTH_SECRET=secrets.token_hex(32),APP_ENV='production',ADMIN_KEY=secrets.token_hex(32),STAFF_KEY=secrets.token_hex(32),TSAP_API_KEY=secrets.token_hex(32))
import main as M,ecosystem3 as E,hardening as hard
from fastapi.testclient import TestClient
from PIL import Image
M.DB_USERS[:]=[{'tsap_id':f'SYN200{i}','phone':f'900001200{i}','full_name':'Synthetic Media Member','gender':'Bride' if i==1 else 'Groom','status':'approved','is_approved':True,'is_active':True,'photo_private':True,'privacy_mode':'private','email':f'media{i}@example.invalid'} for i in [1,2]]
A='SYN2001';B='SYN2002';a=next(u for u in M.DB_USERS if u['tsap_id']==A);b=next(u for u in M.DB_USERS if u['tsap_id']==B);fn='privacy-unique-test.png';photo=Path(M.PHOTO_MEDIA_DIR)/fn;photo.parent.mkdir(parents=True,exist_ok=True);Image.new('RGB',(31,31),(16,93,217)).save(photo);a.update(photo_url='/photos/'+fn,photo_urls=['/photos/'+fn],photo_status='approved',about_myself='Contact 9000012001 bride@example.invalid');assert M._persist_core_state()
c=TestClient(M.app,raise_server_exceptions=False);ha={'X-TSAP-Token':hard.sign_token(A)};hb={'X-TSAP-Token':hard.sign_token(B)};rows=[]
def check(name,method,path,expected,headers=None,payload=None):
 r=c.request(method,path,headers=headers,json=payload);rows.append({'case':name,'method':method,'path':path.split('?')[0],'expected':expected,'actual':r.status_code,'pass':r.status_code==expected,'cache':r.headers.get('cache-control'),'body':{'response_keys':sorted(r.json())} if r.headers.get('content-type','').startswith('application/json') else {'bytes':len(r.content)} if not r.headers.get('content-type','').startswith('image/') else {'bytes':len(r.content),'sha256':hashlib.sha256(r.content).hexdigest()}});return r
check('Guest owner record denied','GET','/api/profile/'+A,401)
check('Peer owner record denied','GET','/api/profile/'+A,401,hb)
r=check('Owner record allowed','GET','/api/profile/'+A,200,ha)
check('Guest private photo denied','GET','/photos/'+fn,404)
check('Peer private photo denied','GET','/photos/'+fn,404,hb)
check('Owner private photo allowed','GET','/photos/'+fn,200,ha)
r=check('Guest public profile contact safe','GET','/api/search/'+A,200);raw=r.text;rows[-1]['contact_markers_absent']=all(x not in raw for x in [a['phone'],a['email'],'password_hash']);rows[-1]['pass'] &= rows[-1]['contact_markers_absent']
ok,_,grant=E.request_photo_access(B,A);assert ok;assert E.respond_photo_access(A,grant['id'],'approved')[0]
check('Approved peer photo allowed','GET','/photos/'+fn,200,hb)
token=E.create_signed_photo_token(fn,B,A);check('Expiring signed bearer URL works with active grant','GET','/photos/'+fn+'?access_token='+token,200)
import safety
ok,_,_=safety.block_user(A,B,'synthetic block regression',M.DB_BLOCKS);assert ok
check('Blocked recipient guest signed token denied','GET','/photos/'+fn+'?access_token='+token,404)
M.DB_BLOCKS.clear()
a.update(status='deleted',is_active=False,is_approved=False);assert M._persist_core_state()
check('Hidden profile guest denied','GET','/api/search/'+A,404)
check('Hidden profile peer photo grant denied','GET','/photos/'+fn,404,hb)
check('Hidden profile guest signed token denied','GET','/photos/'+fn+'?access_token='+token,404)
print(json.dumps({'count':len(rows),'pass':sum(x['pass'] for x in rows),'fail':[(x['case'],x['actual']) for x in rows if not x['pass']]},indent=2))
assert all(x['pass'] for x in rows)
