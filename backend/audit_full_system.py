"""
Full system audit:
1. Extract all API routes in FastAPI (including routers)
2. Extract all API calls in Frontend (fetch, axios, img src, form action)
3. Check route matching & method compatibility
4. Test real response for all GET endpoints
5. Test duplicate profile detection logic
6. Test photo validation logic
7. Test admin filtering & manual plan activation logic
8. Test referral flow & card generation
9. Check for unhandled exceptions or 500 errors
"""
import os
import re
import sys

os.environ.setdefault("TSAP_AUTH_MODE", "off")
sys.path.insert(0, os.path.dirname(__file__))

import main
from fastapi.testclient import TestClient

client = TestClient(main.app)

# 1. Inspect all FastAPI registered routes
fastapi_routes = []
for route in main.app.routes:
    if hasattr(route, "path") and hasattr(route, "methods"):
        for m in route.methods:
            fastapi_routes.append((m, route.path))

print(f"=== 1. FASTAPI REGISTERED ROUTES: {len(fastapi_routes)} ===")

# 2. Extract Frontend API calls
frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "src")
found_api_calls = set()

for root, _, files in os.walk(frontend_dir):
    for f in files:
        if f.endswith((".tsx", ".ts")):
            fp = os.path.join(root, f)
            with open(fp, "r", encoding="utf-8") as file:
                content = file.read()
                # matches fetch(`/api/...` or "/api/..." or '/api/...'
                # Handles `${...}` expressions properly
                matches = re.findall(r"(/api/[a-zA-Z0-9_\-/\${}:?=&+]+)", content)
                for m in matches:
                    # strip query params
                    clean = m.split("?")[0]
                    # replace ${...} with {param}
                    clean = re.sub(r"\$\{.*?\}", "{param}", clean)
                    # replace trailing garbage if any
                    clean = re.sub(r"[\"'\`].*", "", clean)
                    if clean.startswith("/api/"):
                        found_api_calls.add((clean, os.path.relpath(fp, frontend_dir)))

print(f"=== 2. FRONTEND API PATHS USED: {len(found_api_calls)} ===")

# Check which frontend API calls have corresponding backend routes
missing_routes = []
for api_path, source_file in sorted(found_api_calls):
    # normalize path format: e.g. /api/search/{id} vs /api/search/{param}
    # convert fastapi route to regex
    matched = False
    for method, f_path in fastapi_routes:
        f_regex = re.sub(r"\{[a-zA-Z0-9_]+\}", r"[^/]+", f_path)
        f_regex = f"^{f_regex}$"
        
        # test if api_path matches f_regex by substituting a dummy param
        test_path = re.sub(r"\{param\}", "TEST_VAL", api_path)
        if re.match(f_regex, test_path) or re.match(f_regex, api_path):
            matched = True
            break
            
    if not matched:
        missing_routes.append((api_path, source_file))

print(f"\nMissing routes check:")
if missing_routes:
    print(f"❌ Found {len(missing_routes)} missing/unmatched backend routes:")
    for ep, src in missing_routes:
        print(f"   - {ep:<40} (called in {src})")
else:
    print("✅ All frontend API calls have corresponding backend routes!")

