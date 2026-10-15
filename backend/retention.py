"""Retention workflow for inactive member records.

After the configured age threshold (default: three years from profile creation),
eligible records are removed from active JSON stores only after a full profile
and related-activity archive is written. This workflow is not an erasure process:
archives currently have no automatic purge deadline. Profiles with a wallet
balance, pending payout, active plan, or boost are skipped. Payment and audit
ledgers are kept separately. The support log stores profile ID, name, and the
removal timestamp (not the member's phone number).

The scheduler runs shortly after startup and then once per day. A separate
privacy/erasure request must be handled through the published privacy contact.
"""
import json
import os
from datetime import datetime, timedelta

RETENTION_YEARS = int(os.getenv("RETENTION_YEARS", "3"))
BACKUP_DIR = os.environ.get("MANA_VIVAHA_RETENTION_BACKUP_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "backups"))
LOG_FILE = os.environ.get("MANA_VIVAHA_RETENTION_LOG_FILE", os.path.join(os.path.dirname(os.path.abspath(__file__)), "retention_log.json"))


def _parse_iso(v):
    if not v:
        return None
    try:
        return datetime.fromisoformat(str(v)[:19])
    except Exception:
        return None


def _is_active(u):
    """Preserve accounts with money due or a current paid/boost entitlement."""
    referral_stats = u.get("referral_stats") if isinstance(u.get("referral_stats"), dict) else {}
    try:
        wallet = max(float(u.get("wallet") or 0), float(referral_stats.get("wallet") or 0))
    except (TypeError, ValueError, OverflowError):
        return "wallet_balance_unreadable"
    if wallet > 0:
        return "wallet_balance"
    try:
        pending_payout = max(float(u.get("pending_payout") or 0),
                             float(referral_stats.get("pending_payout") or 0))
    except (TypeError, ValueError, OverflowError):
        return "pending_payout_unreadable"
    if pending_payout > 0:
        return "pending_payout"
    # `plan_expiry` is the current field written by payments; `plan_until` is
    # retained for records created by older releases. Do not archive a live plan.
    for k in ("plan_expiry", "plan_until", "boost_until"):
        until = _parse_iso(u.get(k))
        if until and until > datetime.utcnow():
            return k
    return None


def preview(users, years=None):
    """Ye profiles delete avtayi + ye skip avtayi — admin preview."""
    years = years or RETENTION_YEARS
    cutoff = datetime.utcnow() - timedelta(days=365 * years)
    expired, skipped = [], []
    for u in users:
        created = _parse_iso(u.get("created_at"))
        if not created or created >= cutoff:
            continue
        active = _is_active(u)
        if active:
            skipped.append({"tsap_id": u.get("tsap_id"), "reason": active})
        else:
            expired.append({"tsap_id": u.get("tsap_id"), "name": u.get("full_name", ""),
                            "created_at": u.get("created_at", "")})
    return {"cutoff": cutoff.isoformat(), "years": years,
            "to_delete": expired, "skipped_active": skipped,
            "total_users": len(users)}


def run(users, interests, views, saves, years=None, dry_run=False):
    """3-year ayyina profiles: archive → delete → log. Return summary."""
    years = years or RETENTION_YEARS
    p = preview(users, years)
    ids = {x["tsap_id"] for x in p["to_delete"]}
    if not ids or dry_run:
        return {"success": True, "dry_run": True, **p, "deleted": 0}

    # 1) ARCHIVE before active-store removal; this is not permanent data erasure.
    os.makedirs(BACKUP_DIR, exist_ok=True)
    stamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    arc_path = os.path.join(BACKUP_DIR, f"retention-archive-{stamp}.json")
    archive = {
        "archived_at": datetime.utcnow().isoformat(), "retention_years": years,
        "profiles": [u for u in users if u.get("tsap_id") in ids],
        "interests": [i for i in interests if i.get("from_id") in ids or i.get("to_id") in ids or i.get("tsap_id") in ids],
        "views": [v for v in views if v.get("tsap_id") in ids or v.get("viewer_id") in ids],
        "saves": [s for s in saves if s.get("tsap_id") in ids or s.get("saved_id") in ids],
    }
    with open(arc_path, "w", encoding="utf-8") as f:
        json.dump(archive, f, ensure_ascii=False, default=str, indent=1)

    # 2) DELETE (in-place lists — main DB references same objects)
    keep_users = [u for u in users if u.get("tsap_id") not in ids]
    keep_int = [i for i in interests if i.get("from_id") not in ids and i.get("to_id") not in ids and i.get("tsap_id") not in ids]
    keep_views = [v for v in views if v.get("tsap_id") not in ids and v.get("viewer_id") not in ids]
    keep_saves = [s for s in saves if s.get("tsap_id") not in ids and s.get("saved_id") not in ids]
    users[:] = keep_users
    interests[:] = keep_int
    views[:] = keep_views
    saves[:] = keep_saves

    # 3) LOG (support ki — ye ID eppudu delete ayyindo)
    log = []
    try:
        if os.path.exists(LOG_FILE):
            with open(LOG_FILE, encoding="utf-8") as f:
                log = json.load(f) or []
    except Exception:
        log = []
    log += [{"tsap_id": x["tsap_id"], "name": x.get("name", ""), "deleted_at": datetime.utcnow().isoformat()} for x in p["to_delete"]]
    with open(LOG_FILE, "w", encoding="utf-8") as f:
        json.dump(log[-20000:], f, ensure_ascii=False, default=str)

    return {"success": True, "deleted": len(ids), "skipped": len(p["skipped_active"]),
            "archive": arc_path, "remaining_users": len(users), **{k: v for k, v in p.items() if k not in ("to_delete",)}}


def start_daily(run_fn):
    """Roji oosari background run (startup thread — server block avvakunda)."""
    import threading

    def _loop():
        interval = 24 * 3600
        t = threading.Timer(interval, _loop)
        t.daemon = True
        t.start()
        try:
            run_fn()
        except Exception as e:
            print(f"[RETENTION] daily run fail: {str(e)[:80]}")

    t0 = threading.Timer(1.0, _loop)  # first run: startup tarvata 1 sec
    t0.daemon = True
    t0.start()
    return t0
