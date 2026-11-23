"""Isolated review bearer-path analytics and logging regressions."""
import asyncio
import contextlib
import io
import json
import logging
import logging.config
import os
import secrets
import sys
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from test_storage import isolate_test_stores
isolate_test_stores('review-token-logging')
os.environ.update(TSAP_AUTH_MODE='prod', TSAP_AUTH_SECRET=secrets.token_hex(32), APP_ENV='production', ADMIN_KEY=secrets.token_hex(32))
import main as M
import growth as G
import hardening as H
from request_privacy import redact_review_tokens, safe_request_path
from starlette.requests import Request
from fastapi.testclient import TestClient

TOKEN = 'rv_IsolatedBearer_AbCdEf-123'
PATH = '/api/review-links/' + TOKEN

def request(path=PATH, method='POST'):
    return Request({'type':'http','path':path,'raw_path':path.encode(),'query_string':b'',
                    'headers':[],'method':method,'scheme':'http','server':('test',80),'client':('127.0.0.1',1234)})

for path in [PATH, PATH+'/feedback', '/other/'+TOKEN, '/other/'+TOKEN+'?copy='+TOKEN,
             '/api/review-links/not-a-token', '/api/review-links/rv%5FIsolatedBearer_AbCdEf-123',
             '/api/review-links/rv%255FIsolatedBearer_AbCdEf-123']:
    safe=redact_review_tokens(path)
    assert TOKEN not in safe and 'IsolatedBearer' not in safe and 'not-a-token' not in safe, safe
assert redact_review_tokens('/api/search')=='/api/search'
assert redact_review_tokens('/other/a%20b')=='/other/a%20b'
assert safe_request_path(request())==redact_review_tokens(PATH)
assert G._safe_path(PATH+'/feedback')==redact_review_tokens(PATH+'/feedback')
assert G._safe_path('/other/'+TOKEN)==redact_review_tokens('/other/'+TOKEN)
assert G._safe_path('/api/search?token='+TOKEN)=='/api/search'

c=TestClient(M.app,raise_server_exceptions=False)
with patch.object(M,'track_visit') as visit:
    c.get(PATH)
    c.get(PATH+'/feedback')
    assert visit.call_count==0
    c.get('/other/'+TOKEN)
    assert visit.call_count==1 and TOKEN not in str(visit.call_args)

with patch.object(H,'RL_DISABLED',False), patch.object(H,'dev_mode',return_value=False), patch.object(H,'is_admin',return_value=False), patch.object(H,'is_automation',return_value=False), patch.object(H,'RL_DEFAULT',(1,60)):
    H._RL_BUCKETS.clear()
    assert H.rate_limit_hit(request(),extra_key=TOKEN) is None
    assert H.rate_limit_hit(request('/api/review-links/rv_AnotherBearer'),extra_key=TOKEN) is None
    assert len(H._RL_BUCKETS)==2
    assert H.rate_limit_hit(request(),extra_key=TOKEN)
    assert TOKEN not in str(H._RL_BUCKETS) and 'rv_AnotherBearer' not in str(H._RL_BUCKETS)
    assert TOKEN not in str(H.abuse_snapshot())
    assert 'POST /api/review-links/{token}' in H.ABUSE['rate_limit_by_route']
    event=H.abuse_snapshot()['recent'][-1]
    assert event['where']=='POST '+redact_review_tokens(PATH)
H._RL_BUCKETS.clear()

out=io.StringIO()
with contextlib.redirect_stdout(out):
    result=asyncio.run(M._telugu_500_handler(request(),RuntimeError(PATH)))
assert result.status_code==500 and TOKEN not in out.getvalue()
assert redact_review_tokens(PATH) in out.getvalue()
assert H.abuse_snapshot()['recent'][-1]['where']==redact_review_tokens(PATH)
assert TOKEN not in str(H.abuse_snapshot())

# Exercise the exact production handler/filter setup, including ASGI errors.
cfg=json.loads((Path(__file__).parent/'logging_privacy.json').read_text())
out=io.StringIO()
with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
    logging.config.dictConfig(cfg)
    logging.getLogger('uvicorn.access').info('%s - "%s %s HTTP/%s" %d','127.0.0.1','GET',PATH+'?copy='+TOKEN,'1.1',404)
    try:
        raise RuntimeError(PATH)
    except RuntimeError:
        logging.getLogger('uvicorn.error').exception('ASGI failure at %s',PATH)
assert TOKEN not in out.getvalue() and '{token:' in out.getvalue() and 'Traceback' in out.getvalue()
H.abuse_log('test',PATH,{'nested':[{'path':PATH,'error':TOKEN}]})
assert TOKEN not in str(H.abuse_snapshot())
assert redact_review_tokens(redact_review_tokens(PATH))==redact_review_tokens(PATH)
assert redact_review_tokens(PATH)!=redact_review_tokens('/api/review-links/rv_OtherBearer')
import subprocess
for cwd in [Path(__file__).resolve().parent.parent,Path(__file__).resolve().parent]:
    # Uvicorn CLI adds app-dir before configuring logs. Check both filesystem layouts.
    code="import sys,json,logging.config;sys.path.insert(0,'backend');logging.config.dictConfig(json.load(open(sys.argv[1])))"
    subprocess.run([sys.executable,'-c',code,str(Path(__file__).parent/'logging_privacy.json')],cwd=cwd,check=True)
print('PASS review token paths: templates, encoded paths, analytics skip/defense, rate buckets/events, 500 output, uvicorn access/traceback')
