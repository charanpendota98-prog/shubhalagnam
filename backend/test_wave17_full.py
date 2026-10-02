"""
🌊 WAVE 17 TEST SUITE — PHOTO VALIDATION + ABOUT/FAMILY + SELFIE + PWA
========================================================================
  A. validate_photo unit (9 variants — PIL generated)
  B. /api/photo/upload + /api/photo/status (strict reject + pending)
  C. admin review queue (approve/reject photo+selfie)
  D. register family canonical + about guards
  E. safe_user photo gating + profile fields
  F. frontend static (PhotoFlow/verify/admin/login/PWA)

Run:  WA_TEST_FAST=1 python3 test_wave17_full.py   (backend/ nunchi)
"""
import io
import os
import random
import sys

os.environ.setdefault("WA_TEST_FAST", "1")
os.environ.setdefault("OTP_DEV_MODE", "true")
os.environ.setdefault("WA_LONG_PAUSE_CHANCE", "0")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

PASS, FAIL, FAILED = 0, 0, []
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ABOUT_OK = ("Nenu software engineer ni, Hyderabad lo untanu. Manchi family values, "
            "simple life istam. Life partner kosam chustunnanu.")


def section(t):
    print(f"\n=== {t} ===")


def check(name, cond, extra=None):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  ✅ {name}")
    else:
        FAIL += 1
        FAILED.append(name)
        print(f"  ❌ {name} :: {str(extra)[:200]}")


from PIL import Image, ImageDraw, ImageFilter  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
import main  # noqa: E402
from interest import safe_user  # noqa: E402
from photo_validate import validate_photo  # noqa: E402
from testutil_paths import src_page  # noqa: E402  # App Router page.tsx + page-client.tsx aware

random.seed(17)


def mkimg(blur=0, dark=False, tiny=False, flat=False, white=False, glare=False, frame=False):
    if flat:
        img = Image.new("RGB", (600, 800), (128, 128, 128))
    elif white:
        img = Image.new("RGB", (600, 800), (250, 250, 250))
    else:
        img = Image.new("RGB", (600, 800))
        px = img.load()
        # 🛡️ R10: mid-range ramp (GLARE false-positive vaddhu) + BLOCKY noise —
        # per-pixel noise JPEG lo smooth ayipotundi (blur false-positive); 4px blocks survive
        import random as _r17
        _noise = [[_r17.randint(-45, 45) for _ in range(0, 600, 4)] for _ in range(0, 800, 4)]
        for y in range(800):
            _ny = _noise[y // 4]
            for x in range(600):
                n = _ny[x // 4]
                px[x, y] = (max(0, min(235, 20 + ((x * 3 + y) % 190) + n)),
                            max(0, min(235, 20 + ((x + y * 2) % 190) + n)),
                            max(0, min(235, 20 + ((x * 2 - y) % 190) + n)))
        d = ImageDraw.Draw(img)
        for _ in range(30):
            x0, x1 = sorted([random.randint(0, 600), random.randint(0, 600)])
            y0, y1 = sorted([random.randint(0, 800), random.randint(0, 800)])
            d.ellipse([x0, y0, x1, y1], fill=(random.randint(30, 200),) * 3)  # R10: 250+ ellipses = GLARE false-positive
        if glare:
            ImageDraw.Draw(img).ellipse([100, 150, 500, 650], fill=(255, 255, 255))
        if frame:
            fd = ImageDraw.Draw(img)
            fd.rectangle([0, 0, 600, 50], fill=(5, 5, 5))
            fd.rectangle([0, 750, 600, 800], fill=(5, 5, 5))
    if blur:
        img = img.filter(ImageFilter.GaussianBlur(blur))
    if dark:
        img = img.point(lambda v: int(v * 0.1))
    if tiny:
        img = img.resize((150, 150))
    b = io.BytesIO()
    img.save(b, "JPEG", quality=88)
    return b.getvalue()


# ═══════════════════════════════════════════════════════════════════════════
section("A. VALIDATE_PHOTO UNIT")
# ═══════════════════════════════════════════════════════════════════════════
_cases = [("sharp", {}, True, "OK"), ("blur", {"blur": 6}, False, "BLURRY"),
          ("dark", {"dark": True}, False, "TOO_DARK"), ("tiny", {"tiny": True}, False, "LOW_RES"),
          ("flat", {"flat": True}, False, "FLAT"), ("white", {"white": True}, False, "TOO_BRIGHT"),
          ("glare", {"glare": True}, False, "GLARE"), ("framed", {"frame": True}, False, "PHOTO_OF_PHOTO")]
for i, (name, kw, exp_ok, exp_reason) in enumerate(_cases, 1):
    r = validate_photo(mkimg(**kw), name + ".jpg")
    check(f"A{i} {name} → {exp_reason}", r["ok"] is exp_ok and r["reason"] == exp_reason,
          (r["ok"], r["reason"]))
r = validate_photo(b"not-an-image" * 500, "x.jpg")
check("A9 text bytes → BAD_FORMAT", r["ok"] is False and r["reason"] == "BAD_FORMAT", r["reason"])
r = validate_photo(mkimg(), "s.jpg")
check("A10 telugu reason present", "ఫోటో" in r["te"] and r["checks"].get("blur_score", 0) > 0,
      (r["te"][:40], r["checks"].get("blur_score")))

# ═══════════════════════════════════════════════════════════════════════════
section("B–C. UPLOAD + STATUS + ADMIN REVIEW")
# ═══════════════════════════════════════════════════════════════════════════
client = TestClient(main.app, raise_server_exceptions=False)
client.post("/api/demo/seed")
BASE = {"height": "5'5\"", "education": "BTech", "job": "Software", "salary": "60k",
        "state": "TS", "district": "Hyderabad", "religion": "Hindu", "caste": "Reddy"}


def reg(name, phone, **over):
    d = dict(BASE, gender="Bride", age="26", phone=phone, full_name=name,
             marital_status="Pelli Kaledu", family_status="Middle Class",
             about_myself=ABOUT_OK)
    d.update(over)
    return client.post("/api/register", data=d)


TID = reg("Wave Seventeen Photo", "9963222201").json().get("tsap_id", "")
check("B1 register with about+family 200", bool(TID), TID)


def up(data, fname="p.jpg", tid=None):
    return client.post("/api/photo/upload", files={"file": (fname, data, "image/jpeg")},
                       data={"tsap_id": tid or TID})


r = up(mkimg())
check("B2 sharp → 200 pending", r.status_code == 200 and r.json().get("status") == "pending",
      (r.status_code, str(r.json())[:100]))
for i, (name, kw) in enumerate([("blur", {"blur": 6}), ("dark", {"dark": True}),
                                ("tiny", {"tiny": True}), ("flat", {"flat": True}),
                                ("glare", {"glare": True}), ("framed", {"frame": True})], 3):
    rr = up(mkimg(**kw), name + ".jpg")
    det = (rr.json().get("detail") or {}) if rr.status_code != 200 else {}
    check(f"B{i} {name} rejected 422+te", rr.status_code == 422 and "ఫోటో" in str(det.get("te", "")),
          (rr.status_code, str(det)[:100]))
st = client.get(f"/api/photo/status/{TID}").json()
check("B9 status pending", st.get("photo_status") == "pending" and st.get("photo_url", "").startswith("/photos/"), st)
q = client.get("/api/admin/photos/pending").json()
check("C1 admin queue lists her", TID in [x.get("tsap_id") for x in q.get("queue", [])], q.get("count"))
check("C2 queue name first-only (privacy)", all(" " not in (x.get("name") or "x") for x in q.get("queue", [])))
r = client.post("/api/admin/photos/review",
                json={"tsap_id": TID, "kind": "photo", "decision": "approved"})
check("C3 approve ok", r.json().get("success") is True, r.json())
u = next(x for x in main.DB_USERS if x.get("tsap_id") == TID)
check("C4 approved → has_photo+urls", u.get("has_photo") is True and len(u.get("photo_urls", [])) == 1,
      (u.get("has_photo"), u.get("photo_urls")))
T2 = reg("Wave Seventeen Reject", "9963222202").json().get("tsap_id", "")
up(mkimg(), "ok.jpg", T2)
r = client.post("/api/admin/photos/review",
                json={"tsap_id": T2, "kind": "photo", "decision": "rejected",
                      "reason": "Group photo", "reason_te": "గ్రూప్ ఫోటో వద్దు"})
st2 = client.get(f"/api/photo/status/{T2}").json()
check("C5 reject → telugu reason", st2.get("photo_status") == "rejected" and "గ్రూప్" in st2.get("photo_reason_te", ""), st2)
r = client.post("/api/verify/selfie", files={"file": ("s.jpg", mkimg(), "image/jpeg")},
                data={"tsap_id": TID})
check("C6 selfie upload pending", r.json().get("status") == "pending", r.json())
r = client.post("/api/verify/selfie", files={"file": ("b.jpg", mkimg(dark=True), "image/jpeg")},
                data={"tsap_id": TID})
check("C7 dark selfie 422", r.status_code == 422, r.status_code)
r = client.post("/api/admin/photos/review",
                json={"tsap_id": TID, "kind": "selfie", "decision": "approved"})
check("C8 selfie approve → badge",
      r.json().get("success") is True and next(x for x in main.DB_USERS if x.get("tsap_id") == TID).get("selfie_verified") is True)

# ═══════════════════════════════════════════════════════════════════════════
section("D–E. REGISTER GUARDS + GATING")
# ═══════════════════════════════════════════════════════════════════════════
r = reg("Wave Seventeen Legacy Fam", "9963222203", family_status="Lower Middle")
lu = next((x for x in main.DB_USERS if x.get("tsap_id") == r.json().get("tsap_id", "")), {})
check("D1 legacy family maps canonical", r.status_code == 200 and lu.get("family_status") == "Middle Class",
      (r.status_code, lu.get("family_status")))
r = reg("Wave Seventeen Rich Fam", "9963222204", family_status="Rich / Affluent (Elite)")
check("D2 elite family ok", r.status_code == 200, r.status_code)
r = reg("Wave Seventeen Junk Fam", "9963222205", family_status="Royal")
check("D3 junk family 400", r.status_code == 400, r.status_code)
r = reg("Wave Seventeen Short", "9963222206", about_myself="too short bio")
check("D4 short about 400", r.status_code == 400, r.status_code)
r = reg("Wave Seventeen Phoneleak", "9963222207", about_myself=ABOUT_OK + " call 9848012345")
check("D5 phone in about 400", r.status_code == 400, r.status_code)
r = reg("Wave Seventeen Mailleak", "9963222208", about_myself=ABOUT_OK + " mail a@b.com here")
check("D6 email in about 400", r.status_code == 400, r.status_code)
su = safe_user(next(x for x in main.DB_USERS if x.get("tsap_id") == T2))
check("E1 pending photo_url hidden", su.get("photo_url") in ("", None) and su.get("photo_status") == "rejected", su.get("photo_url"))
su = safe_user(next(x for x in main.DB_USERS if x.get("tsap_id") == TID))
check("E2 approved photo visible + selfie badge",
      su.get("photo_url", "").startswith("/photos/") and su.get("selfie_verified") is True,
      (su.get("photo_url"), su.get("selfie_verified")))
pf = client.get(f"/api/search/{TID}").json().get("profile", {})
check("E3 profile pub selfie+photo", pf.get("selfie_verified") is True and pf.get("photo_status") == "approved",
      {k: pf.get(k) for k in ("selfie_verified", "photo_status")})

# ═══════════════════════════════════════════════════════════════════════════
section("F. FRONTEND STATIC + PWA")
# ═══════════════════════════════════════════════════════════════════════════
F = os.path.join(ROOT, "frontend")
reg_src = src_page("frontend/src/app/register/page.tsx")
check("F1 family pills canonical", "Upper Middle Class" in reg_src and "Rich / Affluent (Elite)" in reg_src)
check("F2 about mandatory+counter", "Minimum 50 characters" in reg_src and "minimum 50 characters" in reg_src)
check("F3 about contact guard", "[6-9]" in reg_src and "పెట్టకండి" in reg_src)
check("F4 PhotoFlow on success", "PhotoFlow" in reg_src and "<PhotoFlow tsapId={tsap}" in reg_src)
pf_src = src_page("frontend/src/components/PhotoFlow.tsx")
check("F5 PhotoFlow states", all(x in pf_src for x in
      ("Add photo for better responses", "Upload in progress", "Photo not approved",
       "Add new photo", "I will do this later", "Photo approved", "validation in progress")))
vf_src = src_page("frontend/src/app/verify/page.tsx")
check("F6 verify selfie page", "Verify with a live selfie" in vf_src and "/api/verify/selfie" in vf_src)
ap_src = src_page("frontend/src/app/admin/photos/page.tsx")
adm_src = src_page("frontend/src/app/admin/page.tsx")
check("F7 admin review UI+tab", "/api/admin/photos/review" in ap_src and '"photos"' in adm_src)
lg_src = src_page("frontend/src/app/login/page.tsx")
check("F8 keep-logged-in checkbox", "Keep me logged in" in lg_src and "sessionStorage" in
      src_page("frontend/src/lib/api.ts"))
man = src_page("frontend/public/manifest.webmanifest")
check("F9 PWA manifest installable", '"standalone"' in man and "icon-512" in man and "shortcuts" in man)
pwa_src = src_page("frontend/src/components/PWA.tsx")
check("F10 install prompt + SW", "beforeinstallprompt" in pwa_src and "serviceWorker" in pwa_src)

print(f"\n{'=' * 76}\nRESULT: {PASS} pass / {FAIL} fail")
if FAILED:
    print("FAILED:", FAILED)
    sys.exit(1)
