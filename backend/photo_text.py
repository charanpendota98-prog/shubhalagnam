"""Bounded, local prominent-text / watermark screening for member photos.

Detection only: text-like regions, never recognized characters, identity or
content. A prominent overlay rejects with a bilingual reason; an uncertain
region passes and is flagged for the existing staff review queue; any failure
(model missing, engine error, timeout) defers to staff review instead of
rejecting a valid photo. All processing stays on the site server inside one
resource-limited child process at a time, mirroring photo_face.py.
"""
from __future__ import annotations
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import threading

import photo_gate

_MODEL = Path(__file__).parent / 'models/text_detection_ppocr/text_detection_en_ppocrv3_2023may.onnx'
_MODEL_SHA = '03f550c6b406fda8bf54bd8327815f6c7e2edd98cea02348c93d879254366587'
_GATE = threading.Lock()
_MESSAGES = {
 'TEXT_WATERMARK': ('Photos with large overlaid text or watermarks are not accepted. Upload a clean portrait without captions or logos.', 'పెద్ద అక్షరాలు లేదా వాటర్‌మార్క్ ఉన్న ఫోటోలు అంగీకరించబడవు. క్యాప్షన్ లేదా లోగో లేని స్పష్టమైన ముఖ ఫోటోను అప్‌లోడ్ చేయండి.'),
 'TEXT_CHECK_UNAVAILABLE': ('The photo text check could not finish; staff will review the photo before it is approved.', 'ఫోటో టెక్స్ట్ తనిఖీ పూర్తి కాలేదు; ఆమోదానికి ముందు సిబ్బంది ఫోటోను సమీక్షిస్తారు.'),
}
# A flagged region is prominent when it is confident, covers at least 0.3% of
# the frame and has text-line proportions (calibrated on a 61-case synthetic
# corpus: NASA public-domain portrait variants, English/Telugu overlays at
# several sizes/alphas/angles, phone-number captions, small logo controls).
_PROMINENT_MIN_SCORE = 0.7
_PROMINENT_MIN_AREA = 0.003
_PROMINENT_MIN_LONG = 0.14
_PROMINENT_MIN_SHORT = 0.016
# Real text lines contain many separated letter blobs; decorative patterns
# (paisley arcs, fabric motifs) stay below this bar and go to staff review
# instead of a false rejection. Corpus separation: overlays >= 11, patterns <= 6.
_TEXT_MIN_BLOBS = 9
_MAX_STDOUT = 4096
# Pre-flight memory gate. Measured child peak RSS on the Oracle ARM VM at
# normal load: ~175MiB (1024px input, warm). The box typically shows
# ~198-210MiB MemAvailable plus 3.2GiB free swap, so requiring the full peak
# in RAM (220) would defer the check forever; requiring 150 lets the child
# run at normal load with the site keeping ~50MiB + page cache, and a short
# spill of at most ~25MiB into the 3.2GiB swap on a bad moment. Below 150MiB
# the site itself is under pressure and the check defers to staff instead of
# risking the OOM killer. Override with PHOTO_TEXT_MIN_AVAIL_MB.
_MIN_AVAIL_MB = int(os.environ.get('PHOTO_TEXT_MIN_AVAIL_MB', '150'))


def _mem_available_mb():
    """MemAvailable from /proc/meminfo, or None when unreadable (non-Linux)."""
    try:
        for line in open('/proc/meminfo'):
            if line.startswith('MemAvailable:'):
                return int(line.split()[1]) // 1024
    except (OSError, ValueError, IndexError):
        pass
    return None


def _defer(reason='TEXT_CHECK_UNAVAILABLE'):
    en, te = _MESSAGES['TEXT_CHECK_UNAVAILABLE']
    return {'ok': True, 'reason': 'TEXT_CHECK_UNAVAILABLE', 'en': en, 'te': te,
            'checks': {'text_screen': 'deferred', 'deferred_reason': reason, 'needs_review': True}}


def _reject(checks):
    en, te = _MESSAGES['TEXT_WATERMARK']
    return {'ok': False, 'reason': 'TEXT_WATERMARK', 'en': en, 'te': te, 'checks': checks}


def _downscale(data: bytes) -> bytes:
    """Cap the long side at 1024px before the child decodes it. Thresholds are
    relative to the min side, so detection is scale-invariant; smaller input
    cuts decode time and child RSS on the 1GB VM. Input is already validated
    by photo_validate before this gate runs; on any decode error, send the
    original bytes and let the child's own failure path defer."""
    try:
        import io
        from PIL import Image
        im = Image.open(io.BytesIO(data))
        im.load()
        if max(im.size) <= 1024:
            return data
        im.thumbnail((1024, 1024))
        buf = io.BytesIO()
        im.convert('RGB').save(buf, format='JPEG', quality=88)
        return buf.getvalue()
    except Exception:
        return data


def check_photo_text(data: bytes) -> dict:
    """One child at a time across ALL backend processes (shared file lock),
    eight-second wall limit, fail to staff review."""
    if not data or len(data) > 5 * 1024 * 1024 or not _GATE.acquire(blocking=False):
        return _defer('input_or_busy')
    fd = photo_gate.acquire_photo_gate()
    if fd is None:
        _GATE.release()
        return _defer('input_or_busy')
    try:
        avail = _mem_available_mb()
        if avail is not None and avail < _MIN_AVAIL_MB:
            return _defer('memory_pressure')
        data = _downscale(data)
        if not _MODEL.is_file() or hashlib.sha256(_MODEL.read_bytes()).hexdigest() != _MODEL_SHA:
            return _defer('model_missing')
        env = {'PATH': os.environ.get('PATH', '/usr/bin:/bin'), 'PYTHONPATH': os.environ.get('PYTHONPATH', ''),
               'OPENBLAS_NUM_THREADS': '1', 'OMP_NUM_THREADS': '1', 'OPENCV_LOG_LEVEL': 'SILENT'}
        p = subprocess.run([sys.executable, str(Path(__file__).resolve()), '--worker'], input=data,
                           stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env, timeout=8, check=False)
        if p.returncode or not p.stdout or len(p.stdout) > _MAX_STDOUT:
            return _defer('worker_failed')
        payload = json.loads(p.stdout)
        width, height = payload.get('w'), payload.get('h')
        regions = payload.get('regions')
        if type(width) is not int or type(height) is not int or not (0 < width <= 12000) or not (0 < height <= 12000):
            return _defer('bad_worker_output')
        if not isinstance(regions, list) or len(regions) > 24:
            return _defer('bad_worker_output')
        frame = float(width * height)
        side = float(min(width, height))
        prominent = []
        for r in regions:
            if not isinstance(r, dict):
                return _defer('bad_worker_output')
            score, rw, rh, blobs = r.get('score'), r.get('w'), r.get('h'), r.get('blobs')
            if type(score) is not float or type(rw) is not float or type(rh) is not float or type(blobs) is not int:
                return _defer('bad_worker_output')
            if not (0.0 <= score <= 1.0) or not (0 < rw <= 12000) or not (0 < rh <= 12000) or not (0 <= blobs <= 5000):
                return _defer('bad_worker_output')
            long_, short = max(rw, rh), min(rw, rh)
            if (score >= _PROMINENT_MIN_SCORE and rw * rh >= _PROMINENT_MIN_AREA * frame
                    and long_ >= _PROMINENT_MIN_LONG * side and short >= _PROMINENT_MIN_SHORT * side):
                prominent.append({'area_pct': rw * rh * 100.0 / frame, 'blobs': blobs})
        checks = {'text_screen': 'done', 'text_regions': len(prominent),
                  'text_area_pct': round(sum(r['area_pct'] for r in prominent), 1)}
        if not prominent:
            return {'ok': True, 'reason': 'TEXT_OK',
                    'en': 'No prominent overlaid text detected; staff review is still required.',
                    'te': 'పెద్ద అక్షరాలు కనిపించలేదు; సిబ్బంది సమీక్ష ఇంకా అవసరం.', 'checks': checks}
        checks['needs_review'] = True
        if any(r['blobs'] >= _TEXT_MIN_BLOBS for r in prominent):
            return _reject(checks)
        # Uncertain region (pattern, emblem, single motif): never auto-reject.
        return {'ok': True, 'reason': 'TEXT_REVIEW',
                'en': 'A marking was detected; staff will review the photo.',
                'te': 'ఒక గుర్తు కనిపించింది; సిబ్బంది ఫోటోను సమీక్షిస్తారు.', 'checks': checks}
    except (OSError, ValueError, TypeError, subprocess.TimeoutExpired, json.JSONDecodeError):
        return _defer('engine_error')
    finally:
        photo_gate.release_photo_gate(fd)
        _GATE.release()


def _worker():
    # Limits apply before loading native libraries. Never load them in the web process.
    import resource
    resource.setrlimit(resource.RLIMIT_AS, (512 * 1024 * 1024, 512 * 1024 * 1024))
    resource.setrlimit(resource.RLIMIT_DATA, (256 * 1024 * 1024, 256 * 1024 * 1024))
    resource.setrlimit(resource.RLIMIT_CPU, (6, 6))
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    vendor = Path(__file__).parent / 'vendor'
    if vendor.is_dir():
        sys.path.insert(0, str(vendor))
    import cv2
    import numpy as np
    cv2.setNumThreads(1)
    data = sys.stdin.buffer.read(5 * 1024 * 1024 + 1)
    if not data or len(data) > 5 * 1024 * 1024:
        raise ValueError('input bounds')
    image = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError('decode')
    h, w = image.shape[:2]
    if min(h, w) < 64 or max(h, w) > 12000 or h * w > 50000000:
        raise ValueError('dimensions')
    model = cv2.dnn_TextDetectionModel_DB(str(_MODEL))
    model.setBinaryThreshold(0.3)
    model.setPolygonThreshold(0.5)
    model.setUnclipRatio(2.0)
    model.setMaxCandidates(200)
    model.setInputSize((512, 512))
    model.setInputMean((123.675, 116.28, 103.53))
    model.setInputScale(1.0 / 255 / np.array([.229, .224, .225]))
    model.setInputSwapRB(False)
    boxes, scores = model.detect(image)
    regions = []
    if boxes is not None:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        for box, score in list(zip(boxes, scores))[:24]:
            _, (rw, rh), _ = cv2.minAreaRect(box.astype(np.float32))
            x0, y0 = int(box[:, 0].min()), int(box[:, 1].min())
            x1, y1 = int(box[:, 0].max()), int(box[:, 1].max())
            x0, y0 = max(0, x0), max(0, y0)
            x1, y1 = min(w, x1), min(h, y1)
            blobs = 0
            crop = gray[y0:y1, x0:x1]
            if crop.size:
                th = cv2.threshold(crop, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
                blobs = max(cv2.connectedComponents(th)[0], cv2.connectedComponents(255 - th)[0]) - 1
            regions.append({'score': round(float(score), 4), 'w': round(float(rw), 1),
                            'h': round(float(rh), 1), 'blobs': max(0, min(5000, blobs))})
    print(json.dumps({'regions': regions, 'w': int(w), 'h': int(h)}))


if __name__ == '__main__' and sys.argv[1:] == ['--worker']:
    _worker()
