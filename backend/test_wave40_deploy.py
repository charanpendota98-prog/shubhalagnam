"""
WAVE 40 DEPLOY-READY - production ki anni set? (env + docker + secrets + health).
===============================================================================
D1 .env.example covers critical prod vars.
D2 prod compose valid + no dev flags (reload/dev-server/demo/workers>1).
D3 Dockerfiles exist + prod-correct.
D4 /api/health shape + secret-free.
D5 tracked files lo live secrets levu.
D6 deploy guide + next.config proxy.

Run: WA_TEST_FAST=1 /home/user/venv/bin/python test_wave40_deploy.py
"""
import json
import os
import re
import sys

os.environ.setdefault("WA_TEST_FAST", "1")
os.environ.setdefault("OTP_DEV_MODE", "true")
os.environ.setdefault("WA_LONG_PAUSE_CHANCE", "0")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

PASS, FAIL, FAILED = 0, 0, []


def check(name, cond, extra=None):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  PASS {name}")
    else:
        FAIL += 1
        FAILED.append(name)
        print(f"  FAIL {name}" + (f"  | {str(extra)[:200]}" if extra is not None else ""))


def section(t):
    print(f"\n{'=' * 76}\n{t}\n{'=' * 76}")


import main  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from testutil_paths import src_page  # noqa: E402  # App Router page.tsx + page-client.tsx aware

client = TestClient(main.app, raise_server_exceptions=False)
BE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(BE, "..")

# ===========================================================================
# D1 - env template
# ===========================================================================
section("D1 - env template")
env = src_page(".env.example")
for v in ("TSAP_AUTH_MODE", "TSAP_API_KEY", "ADMIN_KEY", "JWT_SECRET", "CORS_ORIGINS",
          "PUBLIC_SITE_URL", "OTP_CHANNELS", "MSG91_KEY", "FAST2SMS_KEY", "PAYMENTS_LIVE",
          "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET",
          "PAY_UPI_ID", "VAPID_PUBLIC_KEY", "NEXT_PUBLIC_SUPPORT_PHONE"):
    check(f"D1 env {v}", re.search(rf"^{v}=", env, re.M) is not None)
check("D1 auth default on", re.search(r"^TSAP_AUTH_MODE=on", env, re.M) is not None)

# ===========================================================================
# D2 - prod compose
# ===========================================================================
section("D2 - prod compose")
try:
    import yaml
    prod = yaml.safe_load(open(os.path.join(ROOT, "docker-compose.prod.yml"), encoding="utf-8"))
    yok = isinstance(prod, dict) and "services" in prod
except Exception as ex:
    prod, yok = {}, False
    check("D2 yaml parses", False, ex)
check("D2 yaml valid", yok)
svc = (prod.get("services", {}) if yok else {})
check("D2 backend+frontend", "backend" in svc and "frontend" in svc, list(svc))
praw = src_page("docker-compose.prod.yml")
cmds = " ".join(str(s.get("command", "")) for s in svc.values())
check("D2 no reload/dev", "--reload" not in cmds and "dev" not in cmds, cmds[:150])
check("D2 workers=1", "--workers 1" in cmds and "--workers 2" not in cmds)
check("D2 restart policies", praw.count("unless-stopped") >= 2, praw.count("unless-stopped"))
check("D2 demo off", "DEMO_SEED_ENABLED=false" in praw and "LAUNCH_SEED_COUNT=0" in praw)
check("D2 secrets passthru", all(k in praw for k in
      ("TSAP_API_KEY", "ADMIN_KEY", "JWT_SECRET", "CORS_ORIGINS", "OTP_CHANNELS")))
check("D2 no test flags", "WA_TEST_FAST=${WA_TEST_FAST:-false}" not in praw
      and "TSAP_AUTH_MODE=${TSAP_AUTH_MODE:-on}" in praw)

# ===========================================================================
# D3 - Dockerfiles
# ===========================================================================
section("D3 - Dockerfiles")
check("D3 backend Dockerfile", os.path.exists(os.path.join(BE, "Dockerfile")))
fdoc = os.path.join(ROOT, "frontend", "Dockerfile")
check("D3 frontend Dockerfile", os.path.exists(fdoc))
if os.path.exists(fdoc):
    fd = open(fdoc, encoding="utf-8").read()
    check("D3 FE build+start", "npm run build" in fd and "npm" in fd
          and "start" in fd and "npm run dev" not in fd)
    check("D3 FE public args", "NEXT_PUBLIC_SUPPORT_PHONE" in fd)

# ===========================================================================
# D4 - health
# ===========================================================================
section("D4 - health")
h = client.get("/api/health")
check("D4 200", h.status_code == 200, h.status_code)
hj = h.json()
check("D4 shape", hj.get("success") and hj.get("service") == "manavivaha-api"
      and isinstance(hj.get("counts"), dict) and "users" in hj["counts"], hj)
dump = json.dumps(hj)
check("D4 secret-free", not any(k in dump for k in
      ("RAZORPAY_KEY_SECRET", "rzp_live", "ADMIN_KEY", "JWT_SECRET", "BOT_TOKEN", "BEGIN")),
      dump[:150])

# ===========================================================================
# D5 - no live secrets tracked + D6 guide/proxy
# ===========================================================================
section("D5/D6 - secrets + guide")
pats = [r"rzp_live_[A-Za-z0-9]{6,}", r"AKIA[0-9A-Z]{10,}", r"xoxb-[0-9A-Za-z-]+",
        r"ghp_[0-9A-Za-z]{10,}", r"-----BEGIN \w+ PRIVATE KEY-----",
        r"[0-9]{6,10}:[A-Za-z0-9_-]{20,}"]
hits = []
for dirpath, dirnames, files in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames
                   if d not in (".git", ".venv", "venv", "node_modules", ".next", "__pycache__", "backups")]
    for fn in files:
        if not fn.endswith((".py", ".yml", ".yaml", ".example", ".tsx", ".ts", ".js",
                             ".md", ".json", ".sh")):
            continue
        fp = os.path.join(dirpath, fn)
        try:
            txt = open(fp, encoding="utf-8", errors="ignore").read()
        except OSError:
            continue
        for p in pats:
            for m in re.findall(p, txt):
                ml = m.lower()
                if ("xxxx" in m or "your-" in ml or "example" in ml
                        or "test-fake" in ml or "redacted" in ml
                        or m.startswith("0000000000:")):
                    continue
                hits.append(f"{os.path.relpath(fp, ROOT)}:{m[:18]}")
check("D5 zero live secrets", not hits, hits[:5])
g = os.path.join(ROOT, "DEPLOY-GUIDE-TELUGU.md")
check("D6 guide exists", os.path.exists(g))
if os.path.exists(g):
    gt = open(g, encoding="utf-8").read()
    check("D6 guide steps", all(k in gt.lower() for k in
          ("docker compose", ".env", "caddy", "backup", "rollback")), gt[:100])
nc = src_page("frontend/next.config.mjs")
check("D6 api proxy", "BACKEND_URL" in nc and "/api/:path*" in nc)

# ===========================================================================
# D7 - deploy domain wiring (MilesWeb/manavivaha.in ready)
# ===========================================================================
section("D7 - domain wiring")
check("D7 bot API_BASE prod", "API_BASE=http://backend:8000" in praw)
check("D7 API_BASE in env", re.search(r"^API_BASE=", env, re.M) is not None)
cx = os.path.join(ROOT, "Caddyfile.example")
check("D7 Caddyfile", os.path.exists(cx))
if os.path.exists(cx):
    ct = open(cx, encoding="utf-8").read()
    check("D7 Caddy domain+proxy", "manavivaha.in" in ct and "reverse_proxy" in ct
          and "localhost:3000" in ct)
check("D7 milesweb section", "MilesWeb" in gt)

# ===========================================================================
# D8 - Oracle free tier section
# ===========================================================================
section("D8 - oracle free tier")
check("D8 oracle section", all(k in gt for k in
      ("Oracle", "Ampere", "Ingress", "Reserved", "iptables", "manavivaha.in", "200MB",
       "Micro", "swap", "oracle-setup.sh", "runbook")))
check("D8 setup script", os.path.exists(os.path.join(ROOT, "scripts", "oracle-setup.sh")))

print(f"\n{'=' * 76}\nRESULT: {PASS} pass / {FAIL} fail\n{'=' * 76}")
if FAILED:
    print("FAILED:", FAILED)
    sys.exit(1)
print("WAVE40 ALL GREEN")
