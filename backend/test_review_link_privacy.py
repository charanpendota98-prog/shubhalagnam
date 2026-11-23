"""Review links use canonical public eligibility and contact redaction."""
from pathlib import Path
import sys, os, secrets
sys.path.insert(0, str(Path(__file__).resolve().parent))
from test_storage import isolate_test_stores
isolate_test_stores('review-link-privacy')
os.environ.update(TSAP_AUTH_MODE='prod', TSAP_AUTH_SECRET=secrets.token_hex(32), APP_ENV='production', ADMIN_KEY=secrets.token_hex(32), TSAP_API_KEY=secrets.token_hex(32))
import main as M
import phase2_store as P
from fastapi.testclient import TestClient

c = TestClient(M.app, raise_server_exceptions=False)
base = dict(tsap_id='SYNELDER1', full_name='Isolated Owner', status='approved', is_approved=True,
            is_active=True, photo_private=True, privacy_mode='private', photo_status='approved',
            photo_url='/photos/isolated-only.png', about_myself='Call 9876543210 or elder@example.invalid',
            company='Unused', education_detail='Email elder@example.invalid', job='Call 9876543210',
            phone='9876543210', email='elder@example.invalid', password_hash='never disclose')
owner = dict(base)
M.DB_USERS[:] = [owner]
M._reindex_users()
rec = P.create_review_link(owner, ttl_hours=48, max_views=100)
url = '/api/review-links/' + rec['token']
checks = []
def check(label, value):checks.append((label, bool(value)))

r = c.get(url)
check('approved owner resolves', r.status_code == 200)
p = r.json().get('profile', {})
check('embedded contact strings redacted everywhere', base['phone'] not in r.text and base['email'] not in r.text)
check('structured secrets absent', all(k not in p for k in ['phone', 'email', 'password_hash', 'dob', 'birth_time']))
check('private photo withheld', p.get('photo_url') is None)
for change in [dict(status=s) for s in ['pending','hidden','banned','deleted','married_fixed','inactive','rejected']] + [dict(is_active=False),dict(is_approved=False),dict(is_banned=True),dict(is_demo=True),dict(account_status='deactivated')]:
    owner.clear();owner.update(base);owner.update(change)
    check('unavailable resolution ' + str(change), c.get(url).status_code == 404)
    f=c.post(url+'/feedback',json={'reviewer_name':'Test Elder','relation':'Aunt','note':'Isolated note'})
    check('unavailable feedback ' + str(change), f.status_code in [400,404])
M.DB_USERS.clear()
M._reindex_users()
check('removed owner resolution denied', c.get(url).status_code == 404)
check('removed owner feedback denied', c.post(url+'/feedback',json={'reviewer_name':'Test Elder','note':'Isolated note'}).status_code in [400,404])
M.DB_USERS[:] = [owner]
M._reindex_users()
owner.clear();owner.update(base)
for private,status,expected in [(True,'approved',None),(False,'pending',None),(False,'rejected',None),(False,'approved',base['photo_url'])]:
    owner.update(photo_private=private,privacy_mode='private' if private else 'public',photo_status=status)
    check('photo '+str((private,status)),c.get(url).json().get('profile',{}).get('photo_url')==expected)
check('active feedback works',c.post(url+'/feedback',json={'reviewer_name':'Test Elder','note':'An isolated note'}).status_code==200)
assert P.revoke_review_link(base['tsap_id'],rec['link_id'])
check('revoked resolution denied',c.get(url).status_code==404)
check('revoked feedback denied',c.post(url+'/feedback',json={'reviewer_name':'Test Elder','note':'An isolated note'}).status_code in [400,404])
limited=P.create_review_link(owner,max_views=1)
limited_url='/api/review-links/'+limited['token']
check('view cap permits first view',c.get(limited_url).status_code==200)
check('view cap denies second view',c.get(limited_url).status_code==404)
expired=P.create_review_link(owner)
with P._LOCK:
    st=P._load_state()
    next(x for x in st['review_links'] if x['link_id']==expired['link_id'])['expires_at']='2000-01-01T00:00:00+00:00'
    P._save_state(st)
expired_url='/api/review-links/'+expired['token']
check('expired resolution denied',c.get(expired_url).status_code==404)
check('expired feedback denied',c.post(expired_url+'/feedback',json={'reviewer_name':'Test Elder','note':'An isolated note'}).status_code in [400,404])
failed=[name for name,ok in checks if not ok]
print({'checks':len(checks),'passed':len(checks)-len(failed),'failed':failed})
assert not failed
