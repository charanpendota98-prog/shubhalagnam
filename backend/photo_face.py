"""Bounded, local photo face eligibility. No recognition, identity or liveness claim."""
from __future__ import annotations
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import threading

_MODEL = Path(__file__).parent / 'models/face_detection_yunet/face_detection_yunet_2023mar.onnx'
_MODEL_SHA = '8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4'
_GATE = threading.Lock()
_MESSAGES = {
 'NO_FACE': ('No clear face was detected. Choose a recent, front-facing portrait with your face unobstructed. This automatic check can miss a valid photo; try another clear portrait.', 'స్పష్టమైన ముఖం కనిపించలేదు. ముఖం పూర్తిగా కనిపించేలా, ముందు నుంచి ఇటీవల తీసిన ఫోటోను ఎంచుకోండి. ఈ స్వయంచాలక తనిఖీ సరైన ఫోటోను కూడా గుర్తించకపోవచ్చు; మరో స్పష్టమైన ఫోటోతో ప్రయత్నించండి.'),
 'MULTIPLE_FACES': ('More than one face was detected. Choose a portrait showing only the person represented by this profile. Detection can be wrong; try another clear portrait.', 'ఒకటి కంటే ఎక్కువ ముఖాలు కనిపించాయి. ఈ ప్రొఫైల్‌లోని వ్యక్తి మాత్రమే ఉన్న ఫోటోను ఎంచుకోండి. తనిఖీలో పొరపాటు ఉండవచ్చు; మరో స్పష్టమైన ఫోటోతో ప్రయత్నించండి.'),
 'FACE_CHECK_UNAVAILABLE': ('The photo face check could not finish. Your form is still here. Try a smaller clear JPEG portrait or retry shortly. Your photo has not been approved.', 'ఫోటోలో ముఖాన్ని తనిఖీ చేయలేకపోయాం. మీ వివరాలు ఇక్కడే ఉన్నాయి. తక్కువ పరిమాణంలో ఉన్న స్పష్టమైన JPEG ఫోటోతో లేదా కొద్దిసేపటి తర్వాత ప్రయత్నించండి. మీ ఫోటో ఆమోదించబడలేదు.'),
}

def _failure(reason):
 en,te = _MESSAGES[reason]
 return {'ok':False,'reason':reason,'en':en,'te':te,'checks':{'face_eligibility':'unconfirmed' if reason=='FACE_CHECK_UNAVAILABLE' else 'not_eligible'}}

def check_photo_face(data: bytes) -> dict:
 """One child at a time, no queue, five-second wall limit, no silent bypass."""
 if not data or len(data)>5*1024*1024 or not _GATE.acquire(blocking=False):
  return _failure('FACE_CHECK_UNAVAILABLE')
 try:
  if not _MODEL.is_file() or hashlib.sha256(_MODEL.read_bytes()).hexdigest()!=_MODEL_SHA:
   return _failure('FACE_CHECK_UNAVAILABLE')
  env={'PATH':os.environ.get('PATH','/usr/bin:/bin'),'PYTHONPATH':os.environ.get('PYTHONPATH',''),'OPENBLAS_NUM_THREADS':'1','OMP_NUM_THREADS':'1','OPENCV_LOG_LEVEL':'SILENT'}
  p=subprocess.run([sys.executable,str(Path(__file__).resolve()),'--worker'],input=data,stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=env,timeout=5,check=False)
  if p.returncode or len(p.stdout)>512:return _failure('FACE_CHECK_UNAVAILABLE')
  count=json.loads(p.stdout).get('faces')
  if type(count) is not int or count<0 or count>5000:return _failure('FACE_CHECK_UNAVAILABLE')
  if count!=1:return _failure('NO_FACE' if count==0 else 'MULTIPLE_FACES')
  return {'ok':True,'reason':'FACE_ELIGIBLE','en':'One face detected; staff review is still required.','te':'ఒక ముఖం గుర్తించబడింది; సిబ్బంది సమీక్ష ఇంకా అవసరం.','checks':{'face_eligibility':'one_face_detected','face_count':1,'face_model':'yunet-2023mar'}}
 except (OSError,ValueError,TypeError,subprocess.TimeoutExpired):
  return _failure('FACE_CHECK_UNAVAILABLE')
 finally:_GATE.release()

def _worker():
 # Limits apply before loading native libraries. Never load them in the web process.
 import resource
 resource.setrlimit(resource.RLIMIT_AS,(384*1024*1024,384*1024*1024))
 resource.setrlimit(resource.RLIMIT_DATA,(96*1024*1024,96*1024*1024))
 resource.setrlimit(resource.RLIMIT_CPU,(3,3))
 resource.setrlimit(resource.RLIMIT_CORE,(0,0))
 vendor=Path(__file__).parent/'vendor'
 if vendor.is_dir():sys.path.insert(0,str(vendor))
 import cv2
 import numpy as np
 cv2.setNumThreads(1)
 data=sys.stdin.buffer.read(5*1024*1024+1)
 if not data or len(data)>5*1024*1024:raise ValueError('input bounds')
 image=cv2.imdecode(np.frombuffer(data,dtype=np.uint8),cv2.IMREAD_COLOR)
 if image is None:raise ValueError('decode')
 h,w=image.shape[:2]
 if min(h,w)<350 or max(h,w)>12000 or h*w>50000000:raise ValueError('dimensions')
 scale=min(320/w,320/h)
 resized=cv2.resize(image,(max(1,round(w*scale)),max(1,round(h*scale))))
 canvas=np.zeros((320,320,3),dtype=np.uint8)
 rh,rw=resized.shape[:2];canvas[:rh,:rw]=resized
 detector=cv2.FaceDetectorYN.create(str(_MODEL),'',(320,320),0.8,0.3,5000)
 _,faces=detector.detect(canvas)
 print(json.dumps({'faces':0 if faces is None else len(faces)}))

if __name__=='__main__' and sys.argv[1:]==['--worker']:_worker()
