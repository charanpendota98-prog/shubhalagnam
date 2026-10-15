"""
WAVE 28 LIVE STORM — hammers RUNNING servers (localhost:8000 + :3000), counted cases.
Asserts: never 500, pages 200, key APIs 200. Read-mostly + 1 write journey.
Run: python3 assault28_live.py   (servers must be up)
"""
import http.client
import json
import os
import random
import urllib.request
import urllib.error
from pathlib import Path
from urllib.parse import urlsplit

# This smoke test creates a test registration on a running service. It must be
# explicitly enabled and pointed only at a disposable local/test environment.
if os.getenv("MANA_VIVAHA_ALLOW_LIVE_TEST_WRITES", "").strip().lower() not in {"1", "true", "yes"}:
    raise SystemExit("Refusing to create a live smoke-test member. Set MANA_VIVAHA_ALLOW_LIVE_TEST_WRITES=1 only for disposable test data.")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
from testutil_photos import TEST_PROFILE_PHOTO  # noqa: E402

API = os.getenv("MANA_VIVAHA_API_BASE", "http://localhost:8000").rstrip("/")
WEB = os.getenv("MANA_VIVAHA_WEB_BASE", "http://localhost:3000").rstrip("/")
CASES = [0]
FAILS = []


def hit(method, base, path, body=None, headers=None, expect=(200,)):
    CASES[0] += 1
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(base + path, data=data, method=method,
                                 headers={"Content-Type": "application/json",
                                          **(headers or {})})
    try:
        r = urllib.request.urlopen(req, timeout=10)
        b = r.read().decode()
        if r.status == 500:
            FAILS.append((path, 500, b[:100]))
        elif expect and r.status not in expect:
            FAILS.append((path, r.status, b[:100]))
        return r.status, b
    except urllib.error.HTTPError as e:
        b = e.read().decode()[:100]
        if e.code == 500:
            FAILS.append((path, 500, b))
        elif expect and e.code not in expect:
            FAILS.append((path, e.code, b))
        return e.code, b
    except Exception as e:
        FAILS.append((path, "EXC", str(e)[:100]))
        return 0, ""


# ---- setup: 1 isolated test user (pending review; photo stays private) ----
ph = f"93228{random.randrange(10000, 99999)}"
name_suffix = "".join(random.choice("ABCDEFGHJKLMNPQRSTUVWXYZ") for _ in range(6))
boundary = "----mana-vivaha-live-" + name_suffix
fields = {"gender": "female", "age": "23", "dob": "2003-01-15", "password": "test-profile-password",
          "height": "5'5", "marital_status": "Pelli Kaledu", "religion": "Hindu",
          "caste": "Kamma", "education": "BTech", "job": "Software", "salary": "9L",
          "state": "TS", "district": "Hyderabad", "phone": ph, "full_name": f"Live Storm {name_suffix}",
          "consent_confirmed": "true", "photo_consent_confirmed": "true", "photo_private": "true"}
parts = [
    f"--{boundary}\r\nContent-Disposition: form-data; name=\"{key}\"\r\n\r\n{value}\r\n".encode()
    for key, value in fields.items()
]
parts.append((f"--{boundary}\r\nContent-Disposition: form-data; name=\"photo_file\"; "
              "filename=\"test-profile.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n").encode())
parts.extend((TEST_PROFILE_PHOTO, b"\r\n", f"--{boundary}--\r\n".encode()))
mp = b"".join(parts)
api_url = urlsplit(API)
if api_url.scheme != "http" or not api_url.hostname:
    raise SystemExit("This script supports disposable HTTP test backends only; HTTPS/live targets are refused.")
conn = http.client.HTTPConnection(api_url.hostname, api_url.port or 80, timeout=10)
register_path = (api_url.path.rstrip("/") + "/api/register") or "/api/register"
conn.request("POST", register_path, mp,
             {"Content-Type": f"multipart/form-data; boundary={boundary}"})
rr = conn.getresponse()
CASES[0] += 1
reg = json.loads(rr.read().decode())
assert rr.status == 200, reg
TID = reg["tsap_id"]
TOK = {"X-TSAP-Token": reg["auth_token"]}
print(f"[live] user {TID}")

# ---- pages (crawlable) ----
app_root = os.path.join(ROOT, "frontend", "src", "app")
PAGES = []
for page_file in Path(app_root).rglob("page.tsx"):
    u = page_file.relative_to(app_root).as_posix()
    u = u.removesuffix("/page.tsx").removesuffix("page.tsx")
    u = "/" + u.strip("/") if u.strip("/") else "/"
    u = u.replace("[id]", "1")
    if "[" in u or "(" in u or u.endswith(".tsx"):
        continue
    PAGES.append(u)
if "/" not in PAGES:
    PAGES.append("/")
print(f"[live] pages: {len(PAGES)}")

APIS = [
    ("GET", "/api/health"), ("GET", "/api/plans"), ("GET", "/api/vendors"),
    ("GET", "/api/vendors/categories"), ("GET", "/api/vendors/packages"),
    ("GET", "/api/vendors/ads"), ("GET", "/api/channels/routing-eligible"),
    ("GET", "/api/channels/setup-plan"), ("GET", "/api/safety/tips"),
    ("GET", "/api/templates/interest"), ("GET", "/api/referral/terms"),
    ("GET", "/api/referral/leaderboard"),
    ("GET", f"/api/search/{TID}"), ("GET", f"/api/matches/{TID}"),
    ("GET", f"/api/interest/inbox/{TID}"), ("GET", f"/api/interest/sent/{TID}"),
    ("GET", f"/api/saved/{TID}"), ("GET", f"/api/views/{TID}"),
    ("GET", f"/api/profile/{TID}/quality"), ("GET", f"/api/photo/status/{TID}"),
    ("GET", f"/api/verification/{TID}"), ("GET", f"/api/unlocks/{TID}"),
    ("GET", f"/api/referral/{TID}"), ("GET", f"/api/welcome-pack/{TID}"),
    ("GET", "/api/cms/pages/home", (200, 404)), ("GET", "/api/cms/stories", (200, 404)),
    ("GET", "/api/success-stories", (200, 404)),
]

for it in range(45):
    for pg in PAGES:
        hit("GET", WEB, pg, expect=(200,))
    for spec in APIS:
        m, p = spec[0], spec[1]
        exp = spec[2] if len(spec) > 2 else (200,)
        hit(m, API, p, headers=TOK, expect=exp)
    # write journey (once): view + save + interest to a match
    if it == 0:
        s, b = hit("GET", API, f"/api/matches/{TID}", headers=TOK)
        try:
            ms = json.loads(b)
            rows = ms.get("matches") or ms.get("profiles") or ms.get("results") or []
            tgt = (rows[0].get("tsap_id") if rows else None)
        except Exception:
            tgt = None
        if tgt:
            hit("POST", API, "/api/view", {"tsap_id": tgt, "viewer_id": TID}, TOK, (200, 201))
            hit("POST", API, "/api/save", {"tsap_id": TID, "saved_id": tgt}, TOK, (200, 201))
            hit("POST", API, "/api/interest/send", {"from_id": TID, "to_id": tgt}, TOK,
                (200, 201, 400, 402))
    if (it + 1) % 15 == 0:
        print(f"[live] iter {it + 1}/45 cases={CASES[0]} fails={len(FAILS)}")

print(f"[live] REPORT cases={CASES[0]} fails={len(FAILS)}")
for f in FAILS[:10]:
    print("  FAIL:", f)
raise SystemExit(1 if FAILS else 0)
