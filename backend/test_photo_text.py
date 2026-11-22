"""
📸 PHOTO TEXT/WATERMARK SCREEN TEST SUITE
=========================================
Run as a script (CI convention):  python test_photo_text.py   (backend/ cwd)
Import-safe: nothing below module imports runs at import time, so pytest
collection spawns no subprocesses and opens no stores.

Cover:
  1. Clean portrait fixture -> TEXT_OK (no false reject on the canonical photo)
  2. English caption -> reject TEXT_WATERMARK, bilingual
  3. Telugu overlay -> reject (region detection, not OCR)
  4. Phone-number caption -> reject
  5. Patterned/motif image -> never auto-reject (review band or OK)
  6. Model missing -> defer to staff review, never reject
  7. Corrupt bytes -> defer to staff review, never reject
  8. Worker timeout -> defer to staff review, never reject
  9. Memory pressure -> defer to staff review, never reject
 10. Shared gate: disabled via PHOTO_CHECK_LOCK="" -> always acquires
 11. Register integration: caption photo -> 422 bilingual; clean photo -> 200
"""
import io
import os
import subprocess
import sys

os.environ.setdefault("WA_TEST_FAST", "1")
os.environ.setdefault("EMAIL_MODE", "mock")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

PASS, FAIL, FAILED = 0, 0, []


def check(name, cond, extra=None):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  ✅ {name}")
    else:
        FAIL += 1
        FAILED.append(name)
        print(f"  ❌ {name}" + (f"  → {extra}" if extra else ""))


DEJAVU = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
# Telugu glyphs must render in any CI image: prefer the OFL font bundled as a
# test fixture, fall back to the system Noto install.
NOTO_TE = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "tests", "fixtures", "fonts", "NotoSansTelugu-Bold.ttf")
if not os.path.exists(NOTO_TE):
    NOTO_TE = "/usr/share/fonts/truetype/noto/NotoSansTelugu-Bold.ttf"


def _portrait(text=None, font_file=None, size=28, loc=(24, 420)):
    from PIL import Image, ImageDraw, ImageFont
    im = Image.new("RGB", (512, 512), (168, 150, 140))
    d = ImageDraw.Draw(im)
    d.ellipse((180, 120, 340, 300), fill=(120, 95, 80))     # face
    d.ellipse((215, 180, 245, 205), fill=(25, 25, 25))      # eyes
    d.ellipse((280, 180, 310, 205), fill=(25, 25, 25))
    d.rectangle((150, 300, 370, 512), fill=(70, 90, 120))   # shoulders
    if text:
        path = font_file or DEJAVU
        font = ImageFont.truetype(path, size) if os.path.exists(path) else ImageFont.load_default()
        d.text(loc, text, font=font, fill=(255, 220, 90), stroke_width=1, stroke_fill=(20, 16, 16))
    b = io.BytesIO()
    im.save(b, format="JPEG", quality=90)
    return b.getvalue()


def _motif():
    from PIL import Image, ImageDraw
    im = Image.new("RGB", (512, 512), (170, 150, 140))
    d = ImageDraw.Draw(im)
    for y in range(300, 512, 24):
        for x in range(0, 512, 24):
            d.arc((x, y, x + 18, y + 18), 0, 300, fill=(220, 30, 90), width=2)
    b = io.BytesIO()
    im.save(b, format="JPEG", quality=90)
    return b.getvalue()


def run_suite():
    from test_storage import isolate_test_stores
    _TEST_STORE = isolate_test_stores("photo-text")

    import photo_gate
    import photo_text
    from testutil_photos import TEST_PROFILE_PHOTO

    # 1. Canonical clean portrait passes.
    r = photo_text.check_photo_text(TEST_PROFILE_PHOTO)
    check("1. clean NASA portrait -> TEXT_OK", r["ok"] and r["reason"] == "TEXT_OK", r)

    # 2. English caption rejects, bilingual.
    r = photo_text.check_photo_text(_portrait("SAMPLE PHOTO"))
    check("2. English caption -> TEXT_WATERMARK", not r["ok"] and r["reason"] == "TEXT_WATERMARK", r)
    check("2a. bilingual", bool(r["en"]) and any("ఫ" <= ch <= "౯" for ch in r["te"]), r.get("te", "")[:40])
    check("2b. checks carry area", "text_area_pct" in r["checks"], r["checks"])

    # 3. Telugu overlay rejects.
    r = photo_text.check_photo_text(_portrait("నమూనా ఫోటో", font_file=NOTO_TE))
    check("3. Telugu overlay -> TEXT_WATERMARK", not r["ok"] and r["reason"] == "TEXT_WATERMARK", r)

    # 4. Phone-number caption rejects.
    r = photo_text.check_photo_text(_portrait("99900 00000", size=32))
    check("4. phone caption -> TEXT_WATERMARK", not r["ok"], r)

    # 5. Decorative motif: never auto-reject.
    r = photo_text.check_photo_text(_motif())
    check("5. motif pattern -> not rejected", r["ok"] and r["reason"] in ("TEXT_OK", "TEXT_REVIEW"), r)

    # 6. Missing model -> defer, never reject.
    orig_model = photo_text._MODEL
    photo_text._MODEL = photo_text.Path("/nonexistent/model.onnx")
    try:
        r = photo_text.check_photo_text(_portrait("SAMPLE PHOTO"))
    finally:
        photo_text._MODEL = orig_model
    check("6. missing model -> deferred to staff", r["ok"] and r["reason"] == "TEXT_CHECK_UNAVAILABLE"
          and r["checks"].get("needs_review") is True, r)

    # 7. Corrupt bytes -> defer, never reject.
    r = photo_text.check_photo_text(b"not an image at all")
    check("7. corrupt bytes -> deferred, not rejected", r["ok"] and r["reason"] == "TEXT_CHECK_UNAVAILABLE", r)

    # 8. Worker timeout -> defer, never reject.
    orig_run = photo_text.subprocess.run
    def _timeout(*a, **k):
        raise subprocess.TimeoutExpired(cmd="worker", timeout=5)
    photo_text.subprocess.run = _timeout
    try:
        r = photo_text.check_photo_text(_portrait("SAMPLE PHOTO"))
    finally:
        photo_text.subprocess.run = orig_run
    check("8. worker timeout -> deferred to staff", r["ok"] and r["reason"] == "TEXT_CHECK_UNAVAILABLE"
          and r["checks"].get("needs_review") is True, r)

    # 9. Memory pressure -> defer, never reject.
    orig_avail = photo_text._mem_available_mb
    photo_text._mem_available_mb = lambda: 50
    try:
        r = photo_text.check_photo_text(_portrait("SAMPLE PHOTO"))
    finally:
        photo_text._mem_available_mb = orig_avail
    check("9. memory pressure -> deferred to staff", r["ok"] and r["reason"] == "TEXT_CHECK_UNAVAILABLE"
          and r["checks"].get("deferred_reason") == "memory_pressure", r)

    # 10. Shared gate disabled via env -> always acquires (VM-upgrade escape hatch).
    os.environ["PHOTO_CHECK_LOCK"] = ""
    import importlib
    importlib.reload(photo_gate)
    fd = photo_gate.acquire_photo_gate()
    check("10. PHOTO_CHECK_LOCK='' disables file lock", fd == -1, fd)
    photo_gate.release_photo_gate(fd)  # must be a safe no-op
    del os.environ["PHOTO_CHECK_LOCK"]
    importlib.reload(photo_gate)

    # 10. Register integration.
    from fastapi.testclient import TestClient
    import main as M
    import email_channel

    email_channel.send_email = lambda to, subject, text: {"ok": True, "channel": "email", "detail": "mock_sent"}
    email_channel.EMAIL_MODE = "mock"
    c = TestClient(M.app)

    payload = {
        "gender": "Groom", "religion": "Hindu", "state": "TS", "district": "Hyderabad",
        "marital_status": "Never Married", "full_name": "Photo Text Test", "profile_for": "Self",
        "dob": "1995-01-01", "height": "5ft 6in", "caste": "Reddy",
        "phone": "9844444444", "password": "password123", "email": "photo-text@manavivaha.com",
        "photo_private": "true", "consent_confirmed": "true", "photo_consent_confirmed": "true",
    }
    r = c.post("/api/register", data=payload,
               files={"photo_file": ("caption.jpg", _portrait("CALL 99900 00000", size=30), "image/jpeg")})
    check("11. register with caption photo -> 422", r.status_code == 422, r.status_code)
    detail = r.json().get("detail", {})
    check("11a. reason TEXT_WATERMARK bilingual", detail.get("reason") == "TEXT_WATERMARK"
          and detail.get("message_telugu") and "watermark" in str(detail.get("message_en", "")).lower(), str(detail)[:200])

    payload["phone"] = "9855555555"
    payload["email"] = "photo-text-2@manavivaha.com"
    payload["full_name"] = "Photo Text Clean"
    r = c.post("/api/register", data=payload,
               files={"photo_file": ("clean.jpg", TEST_PROFILE_PHOTO, "image/jpeg")})
    check("12. register with clean photo -> 200", r.status_code == 200, r.status_code)
    if r.status_code == 200:
        u = next((x for x in M.DB_USERS if x.get("tsap_id") == r.json().get("tsap_id")), {})
        checks = (u or {}).get("photo_checks", {})
        check("12a. text screen recorded on profile", checks.get("text_screen") == "done", checks)

    print(f"\n=== RESULT: {PASS} passed, {FAIL} failed ===")
    return FAIL


if __name__ == "__main__":
    sys.exit(1 if run_suite() else 0)
