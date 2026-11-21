"""Disposable images and stores only. No production request or external delivery."""
import io
import random
import subprocess
from pathlib import Path
from unittest.mock import patch
import pytest
from PIL import Image
import photo_face as F
from photo_validate import validate_photo

PORTRAIT=(Path(__file__).parent/'fixtures/nasa-astronaut.jpg').read_bytes()

def composite():
 im=Image.open(io.BytesIO(PORTRAIT));out=Image.new('RGB',(im.width*2,im.height));out.paste(im,(0,0));out.paste(im,(im.width,0));b=io.BytesIO();out.save(b,format='JPEG',quality=95);return b.getvalue()

def noise():
 rng=random.Random(81);im=Image.frombytes('RGB',(600,800),bytes(rng.randrange(45,211) for _ in range(600*800*3)));b=io.BytesIO();im.save(b,format='JPEG',quality=90);return b.getvalue()

@pytest.mark.parametrize('data,reason',[(PORTRAIT,'FACE_ELIGIBLE'),(composite(),'MULTIPLE_FACES'),(noise(),'NO_FACE')])
def test_actual_detector(data,reason):
 assert validate_photo(data)['ok']
 v=F.check_photo_face(data);assert v['reason']==reason
 assert v['ok']==(reason=='FACE_ELIGIBLE')
 if v['ok']:assert v['checks']['face_count']==1 and 'staff review' in v['en']
 else:assert 'try another' in v['en'].lower()

@pytest.mark.parametrize('mode',['timeout','crash','bad_json','bad_count','missing_model','busy'])
def test_unavailable_fails_closed_without_claiming_bad_photo(mode,tmp_path,monkeypatch):
 if mode=='missing_model':monkeypatch.setattr(F,'_MODEL',tmp_path/'absent')
 elif mode=='timeout':monkeypatch.setattr(F.subprocess,'run',lambda *a,**k:(_ for _ in ()).throw(subprocess.TimeoutExpired('worker',5)))
 elif mode=='crash':monkeypatch.setattr(F.subprocess,'run',lambda *a,**k:subprocess.CompletedProcess([],1,b'',b''))
 elif mode=='bad_json':monkeypatch.setattr(F.subprocess,'run',lambda *a,**k:subprocess.CompletedProcess([],0,b'bad',b''))
 elif mode=='bad_count':monkeypatch.setattr(F.subprocess,'run',lambda *a,**k:subprocess.CompletedProcess([],0,b'{"faces":true}',b''))
 if mode=='busy':F._GATE.acquire()
 try:v=F.check_photo_face(PORTRAIT)
 finally:
  if mode=='busy':F._GATE.release()
 assert not v['ok'] and v['reason']=='FACE_CHECK_UNAVAILABLE'
 assert 'Your form is still here' in v['en'] and 'approved' in v['en']

@pytest.mark.parametrize('count,reason',[(0,'NO_FACE'),(2,'MULTIPLE_FACES')])
def test_false_negative_and_false_positive_guidance(count,reason,monkeypatch):
 monkeypatch.setattr(F.subprocess,'run',lambda *a,**k:subprocess.CompletedProcess([],0,('{"faces":%d}'%count).encode(),b''))
 v=F.check_photo_face(PORTRAIT);assert v['reason']==reason and ('can miss' in v['en'] or 'can be wrong' in v['en'])

def test_api_rejection_never_creates_profile_or_stores_photo(monkeypatch):
 import os
 os.environ.update(APP_ENV='test',ENV='test',TSAP_AUTH_MODE='enforce',OTP_DEV_MODE='true')
 from test_storage import isolate_test_stores
 isolate_test_stores('face-eligibility')
 import main as M
 from fastapi.testclient import TestClient
 c=TestClient(M.app);before=list(M.DB_USERS)
 data={'gender':'Bride','full_name':'Face Eligibility Fixture','dob':'1998-01-15','phone':'9911001998','password':'isolated-test-only','religion':'Hindu','caste':'Reddy','state':'TS','district':'Hyderabad','photo_private':'false','photo_consent_confirmed':'true','consent_confirmed':'true'}
 for reason,body,status in [('NO_FACE',noise(),422),('MULTIPLE_FACES',composite(),422)]:
  r=c.post('/api/register',data=data,files={'photo_file':('fixture.jpg',body,'image/jpeg')});assert r.status_code==status and r.json()['detail']['reason']==reason
  assert M.DB_USERS==before and not list(Path(M.PHOTO_MEDIA_DIR).glob('*'))
 with patch.object(M,'check_photo_face',return_value=F._failure('FACE_CHECK_UNAVAILABLE')):
  r=c.post('/api/register',data=data,files={'photo_file':('fixture.jpg',PORTRAIT,'image/jpeg')});assert r.status_code==503
 assert M.DB_USERS==before
 # A good portrait is eligible but still pending and not public, never identity-verified.
 r=c.post('/api/register',data=data,files={'photo_file':('fixture.jpg',PORTRAIT,'image/jpeg')});assert r.status_code==200,r.text
 u=M._find_user(r.json()['tsap_id']);assert u['photo_status']=='pending' and u['is_approved'] is False
 assert c.get(u['photo_url']).status_code==404

 assert u['photo_checks']['face_count']==1
 before_photo=u['photo_url']
 r2=c.post('/api/photo/upload',data={'tsap_id':u['tsap_id']},files={'file':('fixture.jpg',noise(),'image/jpeg')},headers={'X-Tsap-Token':r.json()['auth_token']})
 assert r2.status_code==422 and r2.json()['detail']['reason']=='NO_FACE'
 assert u['photo_url']==before_photo and u['photo_status']=='pending'
