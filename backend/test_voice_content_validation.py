"""Validate real audio before storage, without touching existing recordings."""
import os
from pathlib import Path
import socket
from unittest.mock import patch

os.environ.update(APP_ENV='test', ENV='test', TSAP_AUTH_MODE='enforce', TSAP_AUTH_SECRET='local-voice-tests-'+'x'*40, OTP_DEV_MODE='true', EMAIL_MODE='mock', WA_ENABLED='false', WHATSAPP_MODE='off')
from test_storage import isolate_test_stores
isolate_test_stores('voice-content')
_connect = socket.socket.connect
def guard(self, address):
    if isinstance(address, tuple) and address[0] not in ('127.0.0.1','::1','localhost'):
        raise RuntimeError('External network forbidden')
    return _connect(self, address)
socket.socket.connect = guard

import main as M
import voice_media as V
from voice_fixture import tone_file
from testutil_client import TestClient
M.enqueue_whatsapp = lambda *args, **kwargs: {'queued': False}
M.start_wa_worker = lambda: None
owner = 'VOICE-CONTENT-ONLY'
user = {'tsap_id': owner, 'full_name': 'Fictional audio audit', 'phone': '9000000099', 'approved': True, 'is_approved': True, 'status': 'active', 'gender': 'Groom', 'credits': 0}
M.DB_USERS.append(user)
M._reindex_users()
assert M._persist_core_state()
client = TestClient(M.app, raise_server_exceptions=False)
headers = {'X-Tsap-Token': M.sign_token(owner)}
passed = 0
def check(condition, description):
    global passed
    assert condition, description
    passed += 1
    print('PASS', description)
def upload(name, data):
    return client.post('/api/voice/upload', data={'tsap_id': owner}, files={'file': (name, data, 'audio/mpeg')}, headers=headers)

fixtures = {ext: tone_file(ext) for ext in ['mp3','wav','ogg','oga','m4a','aac','webm']}
for ext, data in fixtures.items():
    response = upload('tone.'+ext, data)
    check(response.status_code == 200, 'valid synthetic '+ext+' accepted')
    media = client.get(response.json()['url'], headers=headers)
    check(media.status_code == 200 and media.content == data, ext+' persisted audio is exact')
import subprocess
import tempfile
with tempfile.TemporaryDirectory() as directory:
    normal_m4a = Path(directory) / 'normal.m4a'
    subprocess.run(['ffmpeg','-v','error','-f','lavfi','-i','sine=frequency=440:duration=25','-c:a','aac',str(normal_m4a)], check=True, timeout=10)
    check(upload('normal.m4a', normal_m4a.read_bytes()).status_code == 200, 'ordinary seekable M4A with trailing metadata accepted')
video = subprocess.check_output(['ffmpeg','-v','error','-f','lavfi','-i','color=c=black:s=64x64:d=0.5','-c:v','libvpx','-f','webm','pipe:1'], timeout=10)
check(upload('video.webm', video).status_code == 400, 'video-only container rejected')
previous = user['voice_url']
previous_at = user['voice_at']
files_before = sorted(Path(M.VOICE_MEDIA_DIR).iterdir())
for name, data in [('text.mp3', b'plain text '*400),('header.mp3', b'ID3'+bytes(8000)),('renamed.mp3', fixtures['wav']),('broken.wav', b'RIFF'+bytes(5000)),('short.wav', fixtures['wav'][:1500])]:
    response = upload(name, data)
    check(response.status_code == 400, name+' rejected')
    check(user['voice_url'] == previous and user['voice_at'] == previous_at and sorted(Path(M.VOICE_MEDIA_DIR).iterdir()) == files_before, name+' preserves existing recording and files')
with patch.object(V.shutil, 'which', return_value=None):
    response = upload('tone.mp3', fixtures['mp3'])
check(response.status_code == 503 and user['voice_url'] == previous, 'missing decoder fails closed and preserves existing voice')
with patch.object(V.subprocess, 'run', side_effect=V.subprocess.TimeoutExpired('decoder', 5)):
    response = upload('tone.mp3', fixtures['mp3'])
check(response.status_code == 400 and user['voice_url'] == previous, 'decoder timeout cannot save unchecked audio')
with patch.object(M, '_persist_core_state', return_value=False):
    response = upload('tone.mp3', fixtures['mp3'])
check(response.status_code == 503 and user['voice_url'] == previous and sorted(Path(M.VOICE_MEDIA_DIR).iterdir()) == files_before, 'save failure rolls back recording and new file')
print('RESULT', passed, 'PASS')
