"""Generated image software lifecycle, not camera/liveness/identity acceptance."""
import os,io,copy,random,json
from pathlib import Path
from unittest.mock import patch
os.environ['TSAP_AUTH_MODE']='enforce'
from test_storage import isolate_test_stores
isolate_test_stores('selfie-lifecycle')
from fastapi.testclient import TestClient
from PIL import Image
import main as M,hardening as H
c=TestClient(M.app,raise_server_exceptions=False);admin={'X-Admin-Key':H.ADMIN_KEY}
rng=random.Random(27);im=Image.new('RGB',(400,500));im.putdata([(rng.randrange(40,210),rng.randrange(40,210),rng.randrange(40,210))for _ in range(200000)]);f=io.BytesIO();im.save(f,format='JPEG',quality=92);IMAGE=f.getvalue();assert M.validate_photo(IMAGE,'fictional.jpg',selfie=True)['ok']

def setup():
 u={'tsap_id':'SELFIE-FICTIONAL','full_name':'Fictional','photo_private':True,'photo_status':'none','photo_urls':[]};o={'tsap_id':'OTHER-FICTIONAL','photo_private':True};M.DB_USERS[:]=[u,o];M._reindex_users();M.ECOSYSTEM3._ensure_loaded()['verification_records']=[];M.ECOSYSTEM3.save_state();assert M._persist_core_state();return u,{'Authorization':'Bearer '+H.sign_token(u['tsap_id'])},{'Authorization':'Bearer '+H.sign_token(o['tsap_id'])}
def upload(h,tid='SELFIE-FICTIONAL',data=IMAGE):return c.post('/api/verify/selfie',data={'tsap_id':tid},files={'file':('fictional.jpg',data,'image/jpeg')},headers=h)
def queue():return next(x for x in c.get('/api/admin/photos/pending',headers=admin).json()['queue']if x['kind']=='selfie')
def review(it,decision='approved'):return c.post('/api/admin/photos/review',headers=admin,json={**it,'decision':decision,'reason':'Fictional unclear image','reason_te':'స్పష్టంగా లేదు'})
def badge(h):return c.get('/api/verification/SELFIE-FICTIONAL/badges',headers=h).json()['badges']

def test_new_reject_resubmit_approve_replacement_privacy_and_stale_revision():
 u,h,other=setup();assert upload(h).status_code==200 and u['selfie_status']=='pending' and not u['selfie_verified'];it=queue();url=u['selfie_url'];assert not badge(h)
 assert c.get(url).status_code==404 and c.get(url,headers=other).status_code==404 and c.get(url,headers=h).status_code==200
 assert c.get(it['url'],headers=admin).status_code==200 and c.get(it['url'],headers=h).status_code in [401,403]
 assert review(it,'rejected').status_code==200 and not u['selfie_verified'];status=c.get('/api/photo/status/'+u['tsap_id'],headers=h).json();assert status['selfie_status']=='rejected'and status['selfie_reason']=='Fictional unclear image'
 assert upload(h).status_code==200 and not u['selfie_reason'];it=queue();assert review(it).status_code==200 and u['selfie_verified'];assert any(x['badge_type']=='selfie'for x in badge(h));assert review(it,'rejected').status_code==409
 # A legacy approved credential record cannot override new image-review state.
 M.ECOSYSTEM3._ensure_loaded()['verification_records'].append({'id':'LEGACY','tsap_id':u['tsap_id'],'badge_type':'selfie','status':'approved'});M.ECOSYSTEM3.save_state()
 old=u['selfie_url'];assert upload(h).status_code==200 and not u['selfie_verified']and u['selfie_status']=='pending';fresh=queue();assert fresh['revision']!=it['revision']and review(it).status_code==409 and not badge(h)
 assert c.get(old).status_code==404 and c.get(old,headers=h).status_code==404;assert review(fresh,'rejected').status_code==200 and not badge(h)
 stored=json.loads(Path(M.DBSTORE.DB_FILE).read_text())['users'][0];assert stored==u and stored['selfie_status']=='rejected'and not stored['selfie_verified']


def test_upload_false_raised_save_and_invalid_owner_preserve_approved_state():
 for mode in ['false','raise']:
  u,h,other=setup();assert upload(h).status_code==200;assert review(queue()).status_code==200;before=copy.deepcopy(u);files=set(Path(M.PHOTO_MEDIA_DIR).glob('*'));disk=Path(M.DBSTORE.DB_FILE).read_bytes()
  def fail():
   if mode=='raise':raise OSError('synthetic core refusal')
   return False
  with patch.object(M,'_persist_core_state',side_effect=fail):assert upload(h).status_code==503
  assert u==before and Path(M.DBSTORE.DB_FILE).read_bytes()==disk and set(Path(M.PHOTO_MEDIA_DIR).glob('*'))==files
  assert upload(other).status_code==401 and upload(h,data=b'invalid').status_code==422 and u==before
  assert upload(h).status_code==200 and not u['selfie_verified']


def test_review_false_raised_save_preserves_pending_image_and_no_badge():
 for mode in ['false','raise']:
  for decision in ['approved','rejected']:
   u,h,_=setup();assert upload(h).status_code==200;it=queue();before=copy.deepcopy(u);disk=Path(M.DBSTORE.DB_FILE).read_bytes()
   def fail():
    if mode=='raise':raise OSError('synthetic review refusal')
    return False
   with patch.object(M,'_persist_core_state',side_effect=fail),patch.object(M,'_regenerate_profile_card')as card:assert review(it,decision).status_code==503;card.assert_not_called()
   assert u==before and Path(M.DBSTORE.DB_FILE).read_bytes()==disk and not badge(h)and queue()['revision']==it['revision'];assert review(it,decision).status_code==200

if __name__=='__main__':
 tests=[v for k,v in list(globals().items())if k.startswith('test_')and callable(v)]
 for test in tests:test();print('PASS',test.__name__)
 print('RESULT:',len(tests),'passed')
