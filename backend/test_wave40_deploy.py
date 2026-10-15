"""Standalone production deployment contract and secret-exposure checks.

The test checks repository configuration only; it cannot establish that a
Docker host, deployment domain, DNS, providers, or external backups work.

Run: python test_wave40_deploy.py
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
for v in ("TSAP_AUTH_MODE", "TSAP_API_KEY", "TSAP_TOKEN_VERSIONS_FILE", "ADMIN_KEY", "JWT_SECRET", "CORS_ORIGINS",
          "PUBLIC_SITE_URL", "OTP_CHANNELS", "MSG91_KEY", "FAST2SMS_KEY", "PAYMENTS_LIVE",
          "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET",
          "PAY_UPI_ID", "VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT",
          "SUPPORT_EMAIL", "NEXT_PUBLIC_SUPPORT_PHONE", "NEXT_PUBLIC_SUPPORT_WHATSAPP",
          "NEXT_PUBLIC_SUPPORT_EMAIL", "NEXT_PUBLIC_BUSINESS_CONTACT_NAME",
          "NEXT_PUBLIC_BUSINESS_LOCATION", "NEXT_PUBLIC_GRIEVANCE_OFFICER", "NEXT_PUBLIC_LEGAL_NAME"):
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
backend_cfg = svc.get("backend", {})
backend_env = backend_cfg.get("environment", {})
backend_command = backend_cfg.get("command", [])
frontend_command = svc.get("frontend", {}).get("command", [])
check("D2 backend command is production uvicorn; frontend uses Next start",
      isinstance(backend_command, list) and backend_command[:1] == ["uvicorn"]
      and isinstance(frontend_command, list) and "dev" not in frontend_command,
      {"backend": backend_command, "frontend": frontend_command})
check("D2 single backend worker and no reload",
      isinstance(backend_command, list)
      and "--reload" not in backend_command
      and "--workers" in backend_command
      and backend_command[backend_command.index("--workers") + 1:]
          and backend_command[backend_command.index("--workers") + 1] == "1",
      backend_command)
check("D2 restart policies", praw.count("unless-stopped") >= 2, praw.count("unless-stopped"))
check("D2 demo off", str(backend_env.get("DEMO_SEED_ENABLED", "")).lower() == "false"
      and str(backend_env.get("LAUNCH_SEED_COUNT", "")) == "0", backend_env)
check("D2 secrets and optional push/support configuration passthru", all(k in backend_env for k in
      ("TSAP_API_KEY", "ADMIN_KEY", "JWT_SECRET", "CORS_ORIGINS", "OTP_CHANNELS",
       "SUPPORT_EMAIL", "VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT")))
check("D2 auth enabled and test fixtures disabled",
      backend_env.get("TSAP_AUTH_MODE") == "${TSAP_AUTH_MODE:-on}"
      and str(backend_env.get("MANA_TEST_PAYMENT_FIXTURES", "")).lower() == "false"
      and "WA_TEST_FAST" not in backend_env, backend_env)
check("D2 token revocation state is durable and included in JSON-state backups",
      backend_env.get("TSAP_TOKEN_VERSIONS_FILE") == "/var/lib/manavivaha/state/token_versions.json"
      and backend_env.get("TSAP_TOKEN_VERSIONS_FILE", "").startswith(
          backend_env.get("MANA_VIVAHA_STATE_DIR", "") + "/")
      and backend_env.get("MANA_VIVAHA_STATE_DIR") == "/var/lib/manavivaha/state",
      {"token_versions": backend_env.get("TSAP_TOKEN_VERSIONS_FILE"),
       "state_dir": backend_env.get("MANA_VIVAHA_STATE_DIR")})
check("D2 no development source bind mounts",
      all(not isinstance(v, str) or not v.startswith(("./", "../"))
          for v in backend_cfg.get("volumes", []) + svc.get("frontend", {}).get("volumes", [])),
      {"backend": backend_cfg.get("volumes"), "frontend": svc.get("frontend", {}).get("volumes")})
check("D2 internal API and loopback frontend exposure",
      not backend_cfg.get("ports") and svc.get("frontend", {}).get("ports") == ["127.0.0.1:3000:3000"],
      {"backend_ports": backend_cfg.get("ports"), "frontend_ports": svc.get("frontend", {}).get("ports")})

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
    check("D3 FE public args", all(key in fd for key in (
        "NEXT_PUBLIC_SUPPORT_PHONE", "NEXT_PUBLIC_SUPPORT_WHATSAPP", "NEXT_PUBLIC_SUPPORT_EMAIL",
        "NEXT_PUBLIC_BUSINESS_CONTACT_NAME", "NEXT_PUBLIC_BUSINESS_LOCATION", "NEXT_PUBLIC_GRIEVANCE_OFFICER",
        "NEXT_PUBLIC_LEGAL_NAME")))

# ===========================================================================
# D4 - health
# ===========================================================================
section("D4 - health")
h = client.get("/api/health")
check("D4 200", h.status_code == 200, h.status_code)
hj = h.json()
check("D4 shape", hj.get("success") and hj.get("service") == "manavivaha-api"
      and isinstance(hj.get("counts"), dict) and "users" in hj["counts"], hj)
legal_record = client.get("/api/legal/acceptance")
check("D4 unsupported legal-acceptance record retired",
      legal_record.status_code == 410 and "ip_address" not in legal_record.json()
      and "contact_number" not in legal_record.json(), legal_record.status_code)
owner_summary = client.get("/api/owner/summary")
owner_summary_body = owner_summary.json() if owner_summary.status_code == 200 else {}
check("D4 owner summary omits unsupported acceptance metadata",
      owner_summary.status_code == 200 and "owner_acceptance" not in owner_summary_body
      and "acceptance_record" not in owner_summary_body, owner_summary.status_code)
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
        r"[0-9]{6,10}:[A-Za-z0-9_-]{20,}",
        r"[A-Za-z0-9_-]{24,}[.][A-Za-z0-9_-]{24,}",
        r"pbkdf2[$][A-Za-z0-9$._-]{20,}"]
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
check("D5 no high-confidence secret patterns in scanned worktree files", not hits, hits[:5])
guide = os.path.join(ROOT, "PRODUCTION-DEPLOY.md")
check("D6 current production guide exists", os.path.exists(guide))
if os.path.exists(guide):
    guide_text = open(guide, encoding="utf-8").read()
    guide_lower = guide_text.lower()
    check("D6 guide documents deployment, backup, and rollback gates",
          all(k in guide_lower for k in
              ("docker compose", ".env.production", "backup", "rollback", "no-go")),
          [k for k in ("docker compose", ".env.production", "backup", "rollback", "no-go")
           if k not in guide_lower])
nc = src_page("frontend/next.config.mjs")
check("D6 api proxy", "BACKEND_URL" in nc and "/api/:path*" in nc)

# ===========================================================================
# D7 - deployment wiring (configuration only; not external availability)
# ===========================================================================
section("D7 - deployment wiring")
bot_env = svc.get("bot", {}).get("environment", {})
check("D7 optional bot uses internal backend API", bot_env.get("API_BASE") == "http://backend:8000",
      bot_env.get("API_BASE"))
check("D7 API_BASE in env", re.search(r"^API_BASE=", env, re.M) is not None)
cx = os.path.join(ROOT, "Caddyfile.example")
check("D7 Caddyfile", os.path.exists(cx))
ct = open(cx, encoding="utf-8").read() if os.path.exists(cx) else ""
check("D7 example hostnames proxy to the IPv4 loopback listener", "manavivaha.in" in ct
      and ct.count("reverse_proxy 127.0.0.1:3000") == 2
      and "reverse_proxy localhost:3000" not in ct)
check("D7 example domain has an operator DNS verification caveat",
      "verify DNS" in ct or "verifying DNS" in ct)

# ===========================================================================
# D8 - deployment helper points to the current guarded runbook
# ===========================================================================
section("D8 - deployment helper guard")
setup_path = os.path.join(ROOT, "scripts", "oracle-setup.sh")
check("D8 host bootstrap script exists", os.path.exists(setup_path))
if os.path.exists(setup_path):
    setup_text = open(setup_path, encoding="utf-8").read()
    check("D8 script uses strict shell mode", "set -euo pipefail" in setup_text)
    check("D8 host mutation is opt-in", "MANA_VIVAHA_ALLOW_HOST_MUTATION" in setup_text
          and "Refusing to modify this host" in setup_text)
    check("D8 script points to current production guidance, not stale branch paths",
          "PRODUCTION-DEPLOY.md" in setup_text
          and "DEPLOY-GUIDE-TELUGU.md Step 4" not in setup_text
          and "arena/01a0aaf1" not in setup_text,
          setup_text[:240])

updater_path = os.path.join(ROOT, "scripts", "update-vm.sh")
check("D8 VM updater exists", os.path.exists(updater_path))
if os.path.exists(updater_path):
    updater_text = open(updater_path, encoding="utf-8").read()
    check("D8 updater is pinned to standalone production Compose",
          "-f docker-compose.prod.yml" in updater_text
          and re.search(r"-f\s+docker-compose\.yml(?:\s|$)", updater_text) is None)
    check("D8 deploy requires reviewed commit and backup acknowledgement",
          '"$(git rev-parse HEAD)"' in updater_text
          and "MANA_VIVAHA_BACKUP_VERIFIED" in updater_text)
    check("D8 updater avoids destructive Git and volume cleanup commands",
          all(fragment not in updater_text for fragment in
              ("git checkout", "git reset --hard", "git clean -fd", "docker compose down -v",
               "docker volume rm", "--remove-orphans")))

print(f"\n{'=' * 76}\nRESULT: {PASS} pass / {FAIL} fail\n{'=' * 76}")
if FAILED:
    print("FAILED:", FAILED)
    sys.exit(1)
print("WAVE40 ALL GREEN")
