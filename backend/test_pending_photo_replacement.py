"""Owner pending replacement using actual isolated upload/moderation/storage paths."""
import os,copy
from pathlib import Path
from unittest.mock import patch
os.environ.update(TSAP_AUTH_MODE='enforce',MEMBER_COOKIE_SESSIONS='true')
from test_storage import isolate_test_stores
isolate_test_stores('pending-photo-replacement')
from fastapi.testclient import TestClient
import main as M
import hardening as H
from testutil_photos import TEST_PROFILE_PHOTO
c=TestClient(M.app,raise_server_exceptions=False)

def check_replacement(initial_status):
 u={'tsap_id':'PENDING-ONLY','full_name':'Fictional Owner','photo_status':initial_status,'photo_url':'/photos/old.jpg','photo_urls':['/photos/old.jpg'],'photo_private':False,'privacy_mode':'public','status':'approved','is_approved':True,'is_active':True}
 M.DB_USERS[:]=[u];M._reindex_users();Path(M.PHOTO_MEDIA_DIR).mkdir(parents=True,exist_ok=True);Path(M.PHOTO_MEDIA_DIR,'old.jpg').write_bytes(TEST_PROFILE_PHOTO)
 admin={'X-Admin-Key':H.ADMIN_KEY};owner={'X-Tsap-Token':H.sign_token(u['tsap_id'])};other={'X-Tsap-Token':H.sign_token('OTHER-ONLY')}
 old={'tsap_id':u['tsap_id'],'kind':'photo','revision':M._photo_review_revision(u,'photo')}
 assert c.get('/photos/old.jpg').status_code==(200 if initial_status=='approved' else 404)
 def upload(headers,content=TEST_PROFILE_PHOTO):return c.post('/api/photo/upload',headers=headers,data={'tsap_id':u['tsap_id']},files={'file':('portrait.jpg',content,'image/jpeg')})
 before=copy.deepcopy(u);assert upload(other).status_code in [401,403];assert u==before
 r=upload(owner);assert r.status_code==200,r.text;new=r.json()['url'];assert new!='/photos/old.jpg';assert u['photo_status']=='pending' and u['photo_url']==new and u['photo_urls']==[new]
 assert c.get(new).status_code==404;assert c.get(new,headers=owner).status_code==200
 assert c.get('/photos/old.jpg').status_code==404
 saved=next(x for x in M.DBSTORE.load()['users'] if x['tsap_id']==u['tsap_id']);assert saved['photo_url']==new and saved['photo_status']=='pending'
 assert c.post('/api/admin/photos/review',headers=admin,json={**old,'decision':'approved'}).status_code==409
 before=copy.deepcopy(u);assert upload(owner,b'not-an-image').status_code==422;assert u==before
 with patch.object(M,'_persist_core_state',return_value=False):assert upload(owner).status_code==503
 # Rollback regenerates the same monogram card with a fresh generation timestamp.
 assert {k:v for k,v in u.items() if k!='card_generated_at'}=={k:v for k,v in before.items() if k!='card_generated_at'}
 assert c.get(new).status_code==404
 print('PASS pending replacement: actual validators/storage, owner-only, persisted pending, public denied, stale review409, invalid/persist failure preserved')

def test_pending_replacement_stays_private_and_invalidates_old_review():
 check_replacement('pending')

def test_approved_replacement_revokes_public_photo_and_resets_review():
 check_replacement('approved')

if __name__=='__main__':
 test_pending_replacement_stays_private_and_invalidates_old_review()
 test_approved_replacement_revokes_public_photo_and_resets_review()
