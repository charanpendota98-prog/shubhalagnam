import os, sys
os.environ.update(APP_ENV="test", ENV="test", TSAP_AUTH_MODE="enforce", TSAP_AUTH_SECRET="e2e-isolated-secret-not-for-production", OTP_DEV_MODE="true")
sys.path.insert(0, "/tmp/mv/backend")
from test_storage import isolate_test_stores
isolate_test_stores("e2e-preference-range-checks")
import hardening, main, uvicorn
def m(i, g, name, **x):
    d = {"tsap_id": i, "full_name": name, "gender": g, "phone": "9" + i[-9:].rjust(9, "0"), "age": 29, "height": "5'6\"",
         "marital_status": "Pelli Kaledu", "religion": "Hindu", "caste": "Reddy", "state": "TS", "district": "Hyderabad",
         "education": "B.Tech", "job": "Software", "status": "active", "approved": True, "is_approved": True,
         "photo_status": "approved", "photo_url": "", "created_at": "2026-01-01T00:00:00", "mother_tongue": "Telugu",
         "family_type": "Nuclear", "gothram": "Kashyapa", "salary": "₹10 - 12 Lakhs / year"}
    d.update(x); return d
main.DB_USERS.extend([
    m("MVE2E00001", "Groom", "Viewer Member", credits=3, password_hash=""),
    # Candidate inside the saved height range and above the minimum income.
    m("MVE2E00010", "Bride", "RangeFit Sample"),
    # Candidate outside both (height 6'1" > 5'10"; ₹2-3L below the ₹5L minimum).
    m("MVE2E00011", "Bride", "RangeMiss Sample", height="6'1\"", salary="₹2 - 3 Lakhs / year"),
    # Candidate with neither fact listed (rows stay absent; unknown stays unknown).
    m("MVE2E00012", "Bride", "RangeUnknown Sample", height="", salary=""),
    # Candidate whose listed income range crosses the selected minimum.
    m("MVE2E00013", "Bride", "RangeCross Sample", salary="₹4 - 6 Lakhs / year"),
])
import json as _j
_j.dump({"MVE2E00001": hardening.sign_token("MVE2E00001")}, open("/tmp/e2e_tokens16.json", "w"))
print("TOKEN=" + hardening.sign_token("MVE2E00001"), flush=True)
uvicorn.run(main.app, host="127.0.0.1", port=8000, log_level="warning")
