"""Isolated regression: staff approval cannot be bypassed by grants or CMS."""
from pathlib import Path
import os
import secrets
import sys
from datetime import datetime, timedelta
sys.path.insert(0, str(Path(__file__).resolve().parent))
from test_storage import isolate_test_stores
isolate_test_stores('photo-approval-grants')
os.environ.update(TSAP_AUTH_MODE='prod', TSAP_AUTH_SECRET=secrets.token_hex(32),
                  APP_ENV='production', ADMIN_KEY=secrets.token_hex(32),
                  STAFF_KEY=secrets.token_hex(32), TSAP_API_KEY=secrets.token_hex(32))
import main as M
import ecosystem3 as E
import hardening as H
from fastapi.testclient import TestClient
from PIL import Image

A, B = 'SYNPA1', 'SYNPA2'
owner = dict(tsap_id=A, full_name='Isolated owner', status='approved', is_approved=True,
             is_active=True, photo_private=True, privacy_mode='private', photo_status='approved')
peer = dict(tsap_id=B, full_name='Isolated viewer', status='approved', is_approved=True, is_active=True)
M.DB_USERS[:] = [owner, peer]
M._reindex_users()
root = Path(M.PHOTO_MEDIA_DIR)
root.mkdir(parents=True, exist_ok=True)
for name in ['first.png', 'replacement.png', 'cms-only.png']:
    Image.new('RGB', (32, 32), (54, 84, 102)).save(root / name)
owner.update(photo_url='/photos/first.png', photo_urls=['/photos/first.png'])
c = TestClient(M.app, raise_server_exceptions=False)
ha, hb = {'X-TSAP-Token': H.sign_token(A)}, {'X-TSAP-Token': H.sign_token(B)}
ok, _, grant = E.request_photo_access(B, A)
assert ok and E.respond_photo_access(A, grant['id'], 'approved')[0]
checks = []

def check(label, actual, expected):
    checks.append((label, actual == expected, actual, expected))

def issue():
    return c.post('/api/photo/access/signed-url', headers=hb,
                  json={'viewer_id': B, 'owner_id': A})

def get(name, headers=None, token=None):
    return c.get('/photos/' + name, headers=headers,
                 params={'access_token': token} if token else {})

check('approved private issuance', issue().status_code, 200)
old_token = E.create_signed_photo_token('first.png', B, A)
# Grant exists BEFORE owner replaces the photo. Approval never follows the grant.
owner.update(photo_url='/photos/replacement.png', photo_urls=['/photos/replacement.png'])
check('replaced original bearer denied', get('first.png', token=old_token).status_code, 404)
for status in ['pending', 'rejected', 'auto_pass', '']:
    owner['photo_status'] = status
    token = E.create_signed_photo_token('replacement.png', B, A)
    check(status + ' issuance', issue().status_code, 404)
    check(status + ' direct grant', get('replacement.png', hb).status_code, 404)
    check(status + ' signed bearer', get('replacement.png', token=token).status_code, 404)
    check(status + ' owner review', get('replacement.png', ha).status_code, 200)
owner['photo_status'] = 'approved'
check('replacement approved issuance', issue().status_code, 200)
token = E.create_signed_photo_token('replacement.png', B, A)
check('approved bearer', get('replacement.png', token=token).status_code, 200)
for state in ['pending', 'rejected']:
    owner['photo_status'] = state
    check('previously issued URL after ' + state, get('replacement.png', token=token).status_code, 404)
owner['photo_status'] = 'approved'
check('approved peer grant', get('replacement.png', hb).status_code, 200)
check('private response no-store', get('replacement.png', hb).headers.get('cache-control'), 'private, no-store')

for mode in ['revoked', 'expired', 'blocked']:
    assert E.respond_photo_access(A, grant['id'], 'approved')[0]
    M.DB_BLOCKS.clear()
    if mode == 'revoked':
        assert E.respond_photo_access(A, grant['id'], 'revoked')[0]
    elif mode == 'expired':
        with E._LOCK:
            row = next(g for g in E._ensure_loaded()['photo_access_grants'] if g['id'] == grant['id'])
            row['expires_at'] = (datetime.utcnow() - timedelta(seconds=30)).isoformat()
    else:
        M.DB_BLOCKS.append({'owner': A, 'blocked': B})
    check(mode + ' issuance', issue().status_code, 403 if mode != 'blocked' else 404)
    check(mode + ' peer', get('replacement.png', hb).status_code, 404)
    check(mode + ' bearer', get('replacement.png', token=token).status_code, 404)
M.DB_BLOCKS.clear()
assert E.respond_photo_access(A, grant['id'], 'revoked')[0]
# A CMS reference may publish standalone CMS media, never override a member.
M.CMS.list_pages = lambda *_: [{'photos': ['/photos/replacement.png', '/photos/cms-only.png']}]
M.CMS.list_stories = lambda *_: []
for private, status, expected in [(True, 'approved', 404), (False, 'pending', 404),
                                  (False, 'rejected', 404), (False, 'approved', 200)]:
    owner.update(photo_private=private, privacy_mode='private' if private else 'public', photo_status=status)
    check(f'CMS private={private} status={status}', get('replacement.png').status_code, expected)
owner.update(photo_private=False, privacy_mode='public', photo_status='approved', is_active=False)
check('CMS inactive member', get('replacement.png').status_code, 404)
owner['is_active'] = True
owner['selfie_url'] = '/photos/replacement.png'
check('CMS selfie stays private', get('replacement.png').status_code, 404)
check('standalone CMS image remains public', get('cms-only.png').status_code, 200)
# One filename referenced by two owners must satisfy BOTH owners.
owner.pop('selfie_url',None)
owner.update(photo_private=False,privacy_mode='public',photo_status='approved')
peer.update(photo_url='/photos/replacement.png',photo_private=False,privacy_mode='public',photo_status='pending')
check('mixed-owner pending blocks public',get('replacement.png').status_code,404)
peer['photo_status']='approved';peer['photo_private']=True
check('mixed-owner private blocks public',get('replacement.png').status_code,404)
peer['photo_private']=False
check('both owners approved public',get('replacement.png').status_code,200)
check('public photo cache five minutes',get('replacement.png').headers.get('cache-control'),'public, max-age=300')
failures = [x for x in checks if not x[1]]
print({'checks': len(checks), 'passed': len(checks) - len(failures), 'failures': failures})
assert not failures
