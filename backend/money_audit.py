"""
💰 WAVE 26 — MONEY AUDIT TRAIL (dabbulu + trust actions, dispute-proof)
============================================================
Approve / pay-verify / manual-confirm / payout / refund — prathi money action
JSONL file lo durable log (restart aina podhu) + admin API lo query.

Events: profile_approve | pay_verified | pay_confirmed | payout_approved |
        payout_rejected | wallet_paid_full | refunded | webhook_fulfilled
"""
from __future__ import annotations

import json
import os
from datetime import datetime
from typing import Dict, List, Optional

AUDIT_FILE = os.environ.get("MANA_VIVAHA_MONEY_AUDIT_FILE", os.path.join(os.path.dirname(os.path.abspath(__file__)), "money_audit26.jsonl"))
MAX_KEEP = 10000  # file rotate cap (lines)


def _now() -> str:
    return datetime.utcnow().isoformat()


def audit(event: str, actor: str = "admin", details: Optional[Dict] = None) -> Dict:
    """ఒక money action log chey — ఎప్పుడు crash అవ్వదు (audit failure != pay failure)."""
    rec = {"at": _now(), "event": str(event or ""), "actor": str(actor or ""),
           "details": details or {}}
    try:
        line = json.dumps(rec, ensure_ascii=False, default=str)
        with open(AUDIT_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
        try:
            if os.path.getsize(AUDIT_FILE) > 5 * 1024 * 1024:  # >5MB → rotate (recent half unch)
                with open(AUDIT_FILE, encoding="utf-8") as f:
                    lines = f.readlines()
                with open(AUDIT_FILE, "w", encoding="utf-8") as f:
                    f.writelines(lines[len(lines) // 2:])
        except Exception:
            pass
    except Exception:
        pass
    return rec


def read_audit(event: str = "", limit: int = 100, since: str = "") -> List[Dict]:
    """Recent-first read + filters (admin API kosam)."""
    out: List[Dict] = []
    try:
        if not os.path.exists(AUDIT_FILE):
            return []
        with open(AUDIT_FILE, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    r = json.loads(line)
                except Exception:
                    continue
                if event and r.get("event") != event:
                    continue
                if since and str(r.get("at", "")) < since:
                    continue
                out.append(r)
    except Exception:
        return []
    out.reverse()
    return out[:max(1, min(int(limit or 100), 500))]
