"""Image-specific moderation regressions. All media and profiles are isolated."""
import copy
import os
from pathlib import Path
from unittest.mock import patch
os.environ['TSAP_AUTH_MODE'] = 'enforce'
from test_storage import isolate_test_stores
isolate_test_stores('photo-review-revision')
from fastapi.testclient import TestClient
from PIL import Image
import hardening as H
import main as M

client = TestClient(M.app, raise_server_exceptions=False)
ADMIN = {'X-Admin-Key': H.ADMIN_KEY}


def profile(kind='photo'):
    u = {'tsap_id': 'REVISION-ONLY', 'full_name': 'Synthetic Person', 'photo_private': True,
         'photo_url': '/photos/revision-photo-A.jpg', 'photo_urls': ['/photos/revision-photo-A.jpg'],
         'photo_status': 'pending', 'selfie_url': '/photos/revision-selfie-A.jpg', 'selfie_status': 'pending'}
    M.DB_USERS[:] = [u]
    M._reindex_users()
    Path(M.PHOTO_MEDIA_DIR).mkdir(parents=True, exist_ok=True)
    for name in ['revision-photo-A.jpg','revision-photo-B.jpg','revision-selfie-A.jpg','revision-selfie-B.jpg']:
        Image.new('RGB', (40, 50), (100, 120, 140)).save(Path(M.PHOTO_MEDIA_DIR) / name)
    return u


def queued(kind):
    r = client.get('/api/admin/photos/pending', headers=ADMIN)
    assert r.status_code == 200, r.text
    return next(it for it in r.json()['queue'] if it['kind'] == kind)


def decide(it, decision='approved', **extra):
    return client.post('/api/admin/photos/review', headers=ADMIN, json={
        'tsap_id': it['tsap_id'], 'kind': it['kind'], 'revision': it['revision'], 'decision': decision, **extra})


def test_revision_content_and_approval():
    u=profile();it=queued('photo')
    assert len(it['revision']) == 64 and 'revision='+it['revision'] in it['url']
    assert 'revision-photo-A.jpg' not in it['url']
    r=client.get(it['url'], headers=ADMIN)
    assert r.status_code == 200 and r.headers['cache-control'] == 'private, no-store'
    with patch.object(M, '_regenerate_profile_card', return_value=True), patch.object(M, '_persist_core_state', return_value=True):
        assert decide(it).status_code == 200
        before=copy.deepcopy(u)
        assert decide(it, 'rejected').status_code == 409 and u == before


def test_stale_photo_decisions_and_content():
    for decision in ['approved','rejected']:
        u=profile();it=queued('photo')
        u.update(photo_url='/photos/revision-photo-B.jpg',photo_urls=['/photos/revision-photo-B.jpg'])
        before=copy.deepcopy(u)
        with patch.object(M, '_persist_core_state') as persist:
            assert decide(it, decision).status_code == 409
            persist.assert_not_called()
        assert u == before, (u,before)
        content=client.get(it['url'],headers=ADMIN);assert content.status_code == 409, (content.status_code,content.text)
        fresh=queued('photo');assert fresh['revision'] != it['revision']
        assert client.get(fresh['url'],headers=ADMIN).status_code == 200


def test_stale_selfie_and_cross_kind_revision():
    u=profile();it=queued('selfie');photo=queued('photo')
    assert decide({**photo,'revision':it['revision']}).status_code == 409
    u['selfie_url']='/photos/revision-selfie-B.jpg';before=copy.deepcopy(u)
    assert decide(it).status_code == 409 and u == before
    assert client.get(it['url'],headers=ADMIN).status_code == 409
    fresh=queued('selfie')
    with patch.object(M, '_persist_core_state', return_value=True):
        assert decide(fresh).status_code == 200 and u['selfie_verified'] is True


def test_missing_revision_and_auth_are_denied():
    u=profile();before=copy.deepcopy(u);it=queued('photo')
    assert decide({**it,'revision':''}).status_code == 409
    assert client.get(it['url'].split('&revision=')[0],headers=ADMIN).status_code == 409
    assert client.get(it['url']).status_code in [401,403]
    r=client.post('/api/admin/photos/review', json={**it,'decision':'approved'})
    assert r.status_code in [401,403] and u == before


def test_persistence_failure_restores_pending_state():
    u=profile();before=copy.deepcopy(u);it=queued('photo')
    with patch.object(M, '_regenerate_profile_card', return_value=True), patch.object(M, '_persist_core_state', return_value=False):
        assert decide(it).status_code == 503
    assert u == before and queued('photo')['revision'] == it['revision']


def test_current_rejection_preserves_image_and_privacy():
    u=profile();before=copy.deepcopy(u);it=queued('photo')
    with patch.object(M, '_regenerate_profile_card', return_value=True), patch.object(M, '_persist_core_state', return_value=True):
        assert decide(it,'rejected',reason='Unclear',reason_te='స్పష్టంగా లేదు').status_code == 200
    assert u['photo_url'] == before['photo_url'] and u['photo_urls'] == before['photo_urls']
    assert u['photo_private'] is True and u['photo_reason_te'] == 'స్పష్టంగా లేదు'
    assert Path(M.PHOTO_MEDIA_DIR, 'revision-photo-A.jpg').exists()


def test_concurrent_review_commits_once():
    from concurrent.futures import ThreadPoolExecutor
    u=profile();it=queued('photo')
    with patch.object(M, '_regenerate_profile_card', return_value=True), patch.object(M, '_persist_core_state', return_value=True) as persist:
        with ThreadPoolExecutor(max_workers=2) as pool:
            responses=list(pool.map(lambda _: decide(it), range(2)))
        assert sorted(r.status_code for r in responses) == [200,409]
        assert persist.call_count == 1 and u['photo_status'] == 'approved'


def test_replacement_commit_and_waiting_review_use_same_lock():
    import threading
    u=profile();it=queued('photo');started=threading.Event();result=[]
    def review():
        started.set();result.append(decide(it).status_code)
    with M._PHOTO_REVIEW_LOCK:
        t=threading.Thread(target=review);t.start();assert started.wait(2)
        u.update(photo_url='/photos/revision-photo-B.jpg',photo_urls=['/photos/revision-photo-B.jpg'])
    t.join(5);assert not t.is_alive() and result == [409] and u['photo_status'] == 'pending'


if __name__ == '__main__':
    tests=[v for k,v in list(globals().items()) if k.startswith('test_') and callable(v)]
    for test in tests:
        test();print('PASS',test.__name__)
    print(f'RESULT: {len(tests)} passed / 0 failed')
