"""Isolated distinct-browser admission and fail-closed privacy regression."""
from pathlib import Path
import sys, os, secrets, json
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parent))
from test_storage import isolate_test_stores
isolate_test_stores('review-browser-views')
os.environ.update(TSAP_AUTH_MODE='prod', TSAP_AUTH_SECRET=secrets.token_hex(32), APP_ENV='production', ADMIN_KEY=secrets.token_hex(32), TSAP_API_KEY=secrets.token_hex(32))
import main as M
import phase2_store as P
from fastapi.testclient import TestClient
owner=dict(tsap_id='SYNBROWSER1', full_name='Fictional Owner', status='approved', is_approved=True, is_active=True, photo_private=True, photo_status='approved', phone='9876543210')
M.DB_USERS[:]=[owner]; M._reindex_users()
checks=[]
def check(name, ok):
    checks.append(name)
    assert ok, name
def link(cap=1):
    return P.create_review_link(owner, is_approved_profile=M._is_approved_profile, max_views=cap)
def resolve(rec, marker):
    return P.resolve_review_link(rec['token'], lambda tid: owner if tid == owner['tsap_id'] else None, is_approved_profile=M._is_approved_profile, viewer_marker=marker)
def record(rec):
    return next(r for r in P._load_state()['review_links'] if r['link_id']==rec['link_id'])
a=TestClient(M.app, base_url='https://testserver', raise_server_exceptions=False)
b=TestClient(M.app, base_url='https://testserver', raise_server_exceptions=False)
r=link(); url='/api/review-links/'+r['token']
response=a.get(url)
check('first admission', response.status_code==200 and response.json()['views_remaining']==0)
cookie=response.headers.get('set-cookie','')
check('secure private scoped cookie', all(s in cookie for s in ['HttpOnly','Secure','SameSite=lax','Path=/api/review-links','Max-Age=1209600']))
check('no-store',response.headers.get('cache-control')=='private, no-store')
marker=a.cookies.get('mv_review_browser')
check('marker opaque',len(marker)==43)
for _ in range(3): check('same browser cap revisit',a.get(url).status_code==200)
check('new browser denied at cap',b.get(url).status_code==404)
check('only one persisted admission',record(r)['view_count']==1 and len(record(r)['browser_views'])==1)
check('raw marker never persisted',marker not in json.dumps(P._load_state()))
check('hash not exposed in response',record(r)['browser_views'][0] not in response.text)
listing=next(x for x in P.list_review_links(owner['tsap_id']) if x['link_id']==r['link_id'])
check('capped link remains revocable',listing['status']=='active' and listing['view_limit_reached'] and 'browser_views' not in listing)
# Re-read persisted state on every call, including after module reload.
import importlib
importlib.reload(P)
check('persistence survives reload',a.get(url).status_code==200 and record(r)['view_count']==1)
r2=link(); check('same browser another link counts',a.get('/api/review-links/'+r2['token']).status_code==200)
check('different links unlinkable in stored hashes',record(r)['browser_views']!=record(r2)['browser_views'])
a.cookies.clear(); check('cleared cookie denies capped link',a.get(url).status_code==404)
# State changes must deny returning browsers too.
a.cookies.set('mv_review_browser',marker,domain='testserver.local',path='/api/review-links')
for field,value in [('is_active',False),('status','banned'),('is_approved',False)]:
    old=owner[field]; owner[field]=value
    check('seen browser eligibility '+field,resolve(r,marker)[0] is False)
    owner[field]=old
check('revoke capped link',P.revoke_review_link(owner['tsap_id'],r['link_id']))
check('seen browser revoked denied',resolve(r,marker)[0] is False)
# Concurrent first loads with the same marker are one admission.
r3=link(2); m=secrets.token_urlsafe(32)
with ThreadPoolExecutor(max_workers=8) as pool:
    results=list(pool.map(lambda _:resolve(r3,m)[0],range(16)))
check('concurrent same marker admits once',all(results) and record(r3)['view_count']==1)
with ThreadPoolExecutor(max_workers=8) as pool:
    results=list(pool.map(lambda _:resolve(r3,secrets.token_urlsafe(32))[0],range(16)))
check('concurrent new markers atomic cap',sum(results)==1 and record(r3)['view_count']==2)
with P._LOCK:
    st=P._load_state(); next(x for x in st['review_links'] if x['link_id']==r3['link_id'])['expires_at']='2000-01-01T00:00:00+00:00'; P._save_state(st)
check('seen browser expiry denied',resolve(r3,m)[0] is False)
# Legacy links retain consumed slots. A legacy capped link has no admission proof.
r4=link(2)
with P._LOCK:
    st=P._load_state(); next(x for x in st['review_links'] if x['link_id']==r4['link_id'])['view_count']=1; P._save_state(st)
check('legacy remaining admission',resolve(r4,m)[0] and record(r4)['view_count']==2)
check('legacy cap new viewer denied',not resolve(r4,secrets.token_urlsafe(32))[0])
r5=link()
with patch.object(P,'_save_state',side_effect=OSError('isolated persistence failure')):
    check('persistence failure never returns profile',b.get('/api/review-links/'+r5['token']).status_code==500)
check('failed save retains slot',record(r5)['view_count']==0)
# No valid cookie means every successful request must consume a slot, not bypass.
r6=link(2)
check('missing marker counted',resolve(r6,'')[0] and resolve(r6,'')[0] and not resolve(r6,'')[0])
r7=link(2)
b.cookies.set('mv_review_browser','invalid',domain='testserver.local',path='/api/review-links')
check('malformed marker replaced',b.get('/api/review-links/'+r7['token']).status_code==200 and len(b.cookies.get('mv_review_browser'))==43)
print({'checks':len(checks),'passed':len(checks)})
