"""Isolated real production-entry regression. All state is disposable; external sockets blocked."""
import os,sys,shutil,tempfile,subprocess,json,time,urllib.request,signal,socket
from pathlib import Path
source=Path(__file__).resolve().parent.parent
root=Path(tempfile.mkdtemp(prefix='mv-serving-check-',dir='/var/tmp'))
try:
 release=root/'release'; shutil.copytree(source/'backend',release/'backend',ignore=shutil.ignore_patterns('__pycache__','vendor','*.log'))
 state=root/'durable'; state.mkdir()
 sys.path.insert(0,str(release/'backend'));import production_gates as G
 env={k:v for k,v in os.environ.items() if k in ('PATH','HOME','LANG','LD_LIBRARY_PATH')}
 env.update(APP_ENV='production',TSAP_AUTH_SECRET='isolated-test-only-'+'a'*40,ADMIN_KEY='isolated-test-only-'+'b'*40,
 EMAIL_MODE='resend',RESEND_API_KEY='isolated-test-only',MANA_VIVAHA_EMAIL_FROM='noreply@mail.manavivaha.in',
 CONTROL_ACCOUNTS_JSON=json.dumps({'owner':{'username':'isolated-test-only','password_hash':'not-a-real-password'}}),
 MANA_VIVAHA_PERSISTENT_ROOT=str(state),MANA_VIVAHA_STATE_DIR=str(state/'custom-state'),
 MANA_VIVAHA_APP_STATE_DIR=str(state/'custom-app'),MANA_VIVAHA_MEDIA_DIR=str(state/'custom-media'),
 TSAP_DB_FILE=str(state/'custom-db.json'),TSAP_TOKEN_VERSIONS_FILE=str(state/'custom-state/custom-token.json'),
 CONTROL_AUDIT_FILE=str(state/'custom-audit.jsonl'),VENDOR_POSTER_DIR=str(state/'custom-vendor'),REFERRAL_POSTER_DIR=str(state/'custom-referral'),
 MANA_VIVAHA_TEST_DATA_DIR=str(state))
 for index,(_,key,default,_) in enumerate(G.PATH_SPECS):env[key]=str(state/('custom-'+str(index)+'-'+default))
 db={k:([] if k!='otps' else {}) for k in ('users','interests','payments','otps','verified_phones','views','saves','digest')};db['storage_format']=G.STORAGE_FORMAT
 Path(env['TSAP_DB_FILE']).write_text(json.dumps(db))
 # Testing network guard: any accidental provider connect is blocked, loopback probes allowed.
 hook=root/'hook';hook.mkdir();(hook/'sitecustomize.py').write_text('''import socket
_connect=socket.socket.connect
def guarded(self,address):
    if isinstance(address,tuple) and address[0] not in ('127.0.0.1','::1','localhost'): raise RuntimeError('External network forbidden in isolated serving test')
    return _connect(self,address)
socket.socket.connect=guarded
''')
 env['PYTHONPATH']=str(hook)
 parity="import backend.main as M,production_gates as G,os; a={x:(os.path.realpath(y),z) for x,y,z in M._production_storage_paths()}; b={x:(os.path.realpath(y),z) for x,y,z in G.configured_paths(os.environ)}; assert len(a)==35 and a==b,(a,b); print('PASS nondefault manifest parity: all35 paths')"
 q=subprocess.run([sys.executable,'-c',parity],cwd=release,env=env,capture_output=True,text=True);print(q.stdout,q.stderr);assert q.returncode==0
 # Prove preflight failure blocks exec, then real allowed startup with same exact interpreter/cwd.
 bad=dict(env,EMAIL_MODE='mock');q=subprocess.run([sys.executable,'backend/serve_production.py'],cwd=release,env=bad,capture_output=True,text=True);assert q.returncode!=0 and 'Uvicorn running' not in q.stderr;print('PASS entry rejected mock config before uvicorn')
 with socket.socket() as probe: probe.bind(('127.0.0.1',8000))
 log=open(root/'entry-process.log','w+')
 p=subprocess.Popen([sys.executable,'backend/serve_production.py'],cwd=release,env=env,stdout=log,stderr=log,start_new_session=True)
 try:
  for _ in range(80):
   if p.poll() is not None:raise RuntimeError('serve entry exited '+str(p.returncode))
   log.flush();log.seek(0)
   if 'Uvicorn running on http://127.0.0.1:8000' not in log.read():time.sleep(.2);continue
   try:
    with urllib.request.urlopen('http://127.0.0.1:8000/api/auth/capabilities',timeout=1) as r:data=json.load(r)
    assert data=={'password_login':True,'login_identifier':'phone','phone_otp':False,'email_recovery_configured':True,'passkeys_configured':False,'email_optional_at_registration':True}
    print('PASS actual serve_production preflight -> exec uvicorn backend.main:app -> HTTP200 capabilities; isolated fixture, exact cwd/interpreter; no external network');break
   except (OSError,urllib.error.URLError):time.sleep(.2)
  else:raise RuntimeError('startup deadline')
 finally:
  os.killpg(p.pid,signal.SIGTERM)
  try:p.wait(timeout=8)
  except subprocess.TimeoutExpired:os.killpg(p.pid,signal.SIGKILL);p.wait()
  log.flush();log.seek(0);print(log.read());log.close()
finally:shutil.rmtree(root)
