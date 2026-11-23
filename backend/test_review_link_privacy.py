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
rec = P.create_review_link(owner,is_approved_profile=M._is_approved_profile, ttl_hours=48, max_views=100)
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
limited=P.create_review_link(owner,is_approved_profile=M._is_approved_profile,max_views=1)
limited_url='/api/review-links/'+limited['token']
check('view cap permits first view',c.get(limited_url).status_code==200)
check('view cap denies second view',c.get(limited_url).status_code==404)
expired=P.create_review_link(owner,is_approved_profile=M._is_approved_profile)
with P._LOCK:
    st=P._load_state()
    next(x for x in st['review_links'] if x['link_id']==expired['link_id'])['expires_at']='2000-01-01T00:00:00+00:00'
    P._save_state(st)
expired_url='/api/review-links/'+expired['token']
check('expired resolution denied',c.get(expired_url).status_code==404)
check('expired feedback denied',c.post(expired_url+'/feedback',json={'reviewer_name':'Test Elder','note':'An isolated note'}).status_code in [400,404])
# Explicit separate-request state flip and create-time denial.
owner.clear();owner.update(base)
fresh=P.create_review_link(owner,is_approved_profile=M._is_approved_profile)
fresh_url='/api/review-links/'+fresh['token']
check('resolve before state flip',c.get(fresh_url).status_code==200)
owner['is_active']=False
check('feedback after state flip denied',c.post(fresh_url+'/feedback',json={'reviewer_name':'Elder','note':'Contact 9876543210'}).status_code in [400,404])
hdr={'X-TSAP-Token':M.sign_token(base['tsap_id'])}
check('inactive create denied',c.post('/api/me/'+base['tsap_id']+'/review-links',headers=hdr,json={}).status_code==404)
owner['is_active']=True
check('eligible create allowed',c.post('/api/me/'+base['tsap_id']+'/review-links',headers=hdr,json={}).status_code==200)
check('feedback sanitized',c.post(fresh_url+'/feedback',json={'reviewer_name':'Elder','note':'Contact ౯౮౭౬౫౪౩౨౧౦ or elder@example.invalid'}).status_code==200)
notes=str(P.list_review_links(base['tsap_id']))
check('feedback contact removed','9876543210' not in notes and '౯౮౭౬౫౪౩౨౧౦' not in notes and 'elder@example.invalid' not in notes)
for text in ['౯౮౭౬౫౪౩౨౧౦','９８７６５４３２１０']:
    owner['about_myself']='Call '+text
    check('local digit variant scrubbed '+text,text not in c.get(fresh_url).text and '9876543210' not in c.get(fresh_url).text)
from interest import sanitize_public_text
check('shared sanitizer unchanged',sanitize_public_text('౯౮౭౬౫౪౩౨౧౦')=='౯౮౭౬౫౪౩౨౧౦')
check('unmatched Telugu numeral preserved',P._review_safe('వయసు ౨౮')=='వయసు ౨౮')
check('unmatched fullwidth numeral preserved',P._review_safe('Age ２８')=='Age ２８')
check('leading zero contact hidden','09876543210' not in P._review_safe('Call 09876543210'))
check('leading zero Telugu contact hidden','౦౯౮౭౬౫౪౩౨౧౦' not in P._review_safe('Call ౦౯౮౭౬౫౪౩౨౧౦'))
from unittest.mock import patch
with patch.object(P,'create_review_link',side_effect=ValueError('isolated eligibility changed')):
    check('create state race returns HTTP 404',c.post('/api/me/'+base['tsap_id']+'/review-links',headers=hdr,json={}).status_code==404)
for field in ['ttl_hours','max_views']:
    for value in ['abc',['bad'],{'bad':1}]:
        check('malformed '+field+' returns HTTP 400 '+str(value),c.post('/api/me/'+base['tsap_id']+'/review-links',headers=hdr,json={field:value}).status_code==400)
for label in [[],{},123,'x'*81]:
    check('malformed label400 '+str(label),c.post('/api/me/'+base['tsap_id']+'/review-links',headers=hdr,json={'label':label}).status_code==400)
for label in ['x'*60,'x'*80,'పెద్దల రివ్యూ లింక్']:
    response=c.post('/api/me/'+base['tsap_id']+'/review-links',headers=hdr,json={'label':label})
    check('valid label roundtrip '+str(len(label)),response.status_code==200 and response.json()['review_link']['label']==label)
for text in ['09876543210','Call 09876543210','040 2700 1234','040-2700-1234','(040) 2700 1234','Landline: 04027001234','౦౪౦ ౨౭౦౦ ౧౨౩౪','Phone ౦౯౮౭౬౫౪౩౨౧౦']:
    check('review phone hidden '+text,'[contact hidden]' in P._review_safe(text))
for prefix in ['Application ID:', 'Reference:', 'ID:', 'Member ID', 'Order no.', 'Account:', 'సంఖ్య:', 'అప్లికేషన్:', 'ఫోన్ సంఖ్య:', 'మొబైల్ సంఖ్య', 'నా ఫోన్ నంబర్', 'x', 'tel', '_']:
    for number in ['09876543210','౦౯౮౭౬౫౪౩౨౧౦']:
        text=prefix+number
        check('base masking retained '+text,'[contact hidden]' in P._review_safe(text))
for text in ['09876543210x','Application ID: 09876543211','Reference: 09876543211','application number 0 98765 43211','ID: 040 2700 1234','Order no. 09876543211','ఫోన్ సంఖ్య: 04027001234','మొబైల్ నంబర్ 04027001234']:
    check('privacy default '+text,'[contact hidden]' in P._review_safe(text))
for text in ['012345678901','Age ౨౮']:
    check('noncontact preserved '+text,P._review_safe(text)==text)
check('nested tuple values scrubbed',P._review_safe(('09876543210',{'nested':('040 2700 1234','Application ID: 09876543211')}))==('[contact hidden]',{'nested':('[contact hidden]','Application ID: [contact hidden]')}))
check('tuple type preserved',isinstance(P._review_safe(('safe',)),tuple))
failed=[name for name,ok in checks if not ok]
print({'checks':len(checks),'passed':len(checks)-len(failed),'failed':failed})
assert not failed
