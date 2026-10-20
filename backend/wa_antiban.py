"""
మన వివాహ — WHATSAPP ANTI-BAN ENGINE  🛡️
==========================================
WhatsApp lo bulk posting chesthe ban avvakunda, *manishi la* behave cheyyadam ee module pani.

Anti-ban rules (anni env tho tune cheyyochu):
  1. RANDOM GAP        — prati message madhya 120–170 sec random gap (default), fixed kadu
  2. MICRO JITTER      — gap ki ± random + "type chesthunnattu" composing presence (2–9 sec)
  3. LONG BREAK        — prati 6 messages ki okasari 8–20 min "coffee break" (random)
  4. DAY CAP           — rojuki max 60 messages (warmup lo inka thakkuva)
  5. TARGET CAP        — okate channel/group ki rojuki max 4 posts (spam flag raakunda)
  6. ACTIVE HOURS      — 8:00 → 22:00 IST matrame (raatri post cheyyadu — manishi nidra)
  7. WARMUP RAMP       — kotha number day-1: 20, day-2: 35, day-3: 50, day-4+: full cap
  8. COOLDOWN          — 3 failures + 429 → 30 min auto-pause (reset/loggedOut alert)
  9. PRIORITY QUEUE    — interest/request messages (priority 0) channel posts (priority 1) kanna mundu
 10. MESSAGE VARIANTS  — same text repeat avvakunda 5 greeting/CTA variants rotation
 11. STATE FILE        — wa_state.json lo day counters + last_sent (restart lo burst avvadu)
 12. KILL SWITCH       — WA_PAUSED=true leda /api/wa/pause → ventane aagutundi

Env:
  WA_ENABLED           true|false        (default false; opt in only after target checks)
  WA_MIN_GAP           120               (seconds — minimum gap)
  WA_MAX_GAP           170               (seconds — maximum gap)
  WA_MIN_GAP_INTEREST  60                (interest messages — fast lane, still random)
  WA_MAX_GAP_INTEREST  120
  WA_BREAK_EVERY       6                 (eesari break)
  WA_BREAK_MIN_MIN     8                 (break minutes)
  WA_BREAK_MAX_MIN     20
  WA_LONG_PAUSE_CHANCE 0.08              (8% chance extra 3–8 min pause)
  WA_DAILY_CAP         60
  WA_TARGET_DAILY_CAP  4
  WA_ACTIVE_START      8                 (IST hour)
  WA_ACTIVE_END        22
  WA_WARMUP_DAYS       4                 (ramp days)
  WA_FAIL_COOLDOWN_MIN 30
  WA_TEST_FAST         false             (true → gap 1–2 sec: only for tests!)
"""
from __future__ import annotations

import copy
import hashlib
import hmac
import json
from atomic_store import atomic_json_dump
import os
import random
import threading
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

IST = timezone(timedelta(hours=5, minutes=30))
STATE_FILE = os.environ.get("MANA_VIVAHA_WA_STATE_FILE", os.path.join(os.path.dirname(os.path.abspath(__file__)), "wa_state.json"))

# Same message ni repeat ga pampakunda — greeting/CTA variants (rotation)
GREETING_VARIANTS = [
    "💍 *MANA VIVAHA* — TS-AP Telugu Matrimony",
    "💍 *MANA VIVAHA* • Telugu Matrimony (TS/AP)",
    "💍 *MANA VIVAHA* — మీ Telugu సంబంధం",
    "💍 *MANA VIVAHA* — Member-submitted Telugu matrimony profiles",
    "💍 *MANA VIVAHA* — Telugu matrimony for Telangana + Andhra Pradesh",
]
CTA_VARIANTS = [
    "📝 Free profile registration: {site}/register",
    "📝 మీ profile FREE గా పెట్టండి: {site}/register",
    "📝 మొదటి 3 interest requests ఉచితం: {site}/register",
    "📝 FREE గా join అవ్వండి: {site}/register",
    "📝 మీ details FREE గా ఇవ్వండి: {site}/register",
]


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, "").strip() or default)
    except Exception:
        return default


def _env_int(name: str, default: int) -> int:
    try:
        return int(float(os.getenv(name, "").strip() or default))
    except Exception:
        return default


def _env_bool(name: str, default: bool) -> bool:
    v = os.getenv(name)
    if v is None:
        return default
    return str(v).strip().lower() in ("1", "true", "yes", "on")


_TARGET_HASH_SECRET = (
    os.getenv("WA_TARGET_HASH_SECRET")
    or os.getenv("TSAP_AUTH_SECRET")
    or os.getenv("JWT_SECRET")
    or "local-wa-target-hash-key"
).encode("utf-8")


def _target_key(target: object) -> str:
    """Stable per-recipient key for caps; never store the recipient itself."""
    value = str(target or "").strip()
    return "target_" + hmac.new(_TARGET_HASH_SECRET, value.encode("utf-8"), hashlib.sha256).hexdigest()[:32]


class WhatsAppAntiban:
    """Thread-safe anti-ban state machine (async worker + API రెండు use chesthayi)."""

    def __init__(self, state_file: str = STATE_FILE):
        self.state_file = state_file
        self._lock = threading.Lock()
        self.state = self._load()
        # gap lottery — ee pair ni okasari select chesi, aa round antha use chestam
        self._error: Optional[str] = None

    # ------------------------------------------------------------------ state
    def _blank(self) -> Dict:
        return {
            "created_at": self._now().isoformat(),
            "last_sent_at": None,
            "sent_total": 0,
            "sent_since_break": 0,
            "days": {},           # "2025-09-14": count
            "targets": {},        # target → {"day": "..", "count": n, "last": iso, "fails": n}
            "consecutive_failures": 0,
            "cooldown_until": None,
            "next_gap": None,
            "paused": False,
            "events": [],         # last 100 audit events
        }

    def _load(self) -> Dict:
        try:
            with open(self.state_file, encoding="utf-8") as f:
                d = json.load(f)
            base = self._blank()
            base.update(d)
            # Migrate legacy raw recipient keys/events to redacted operational
            # state before any subsequent atomic write.
            old_targets = base.get("targets") or {}
            migrated_targets = {}
            needs_migration = False
            for key, value in old_targets.items():
                safe_key = key if str(key).startswith("target_") else _target_key(key)
                needs_migration = needs_migration or safe_key != key
                migrated_targets[safe_key] = value
            base["targets"] = migrated_targets
            old_events = [event for event in (base.get("events") or []) if isinstance(event, dict)]
            base["events"] = [{"at": event.get("at"), "kind": event.get("kind"), "detail": "redacted"}
                              for event in old_events][-100:]
            needs_migration = needs_migration or any(event.get("detail") != "redacted" for event in old_events)
            if needs_migration:
                try:
                    atomic_json_dump(self.state_file, base, ensure_ascii=False)
                except Exception:
                    pass
            return base
        except Exception:
            return self._blank()

    def save(self) -> bool:
        try:
            atomic_json_dump(self.state_file, self.state, ensure_ascii=False)
            return True
        except Exception:
            return False

    @staticmethod
    def _now() -> datetime:
        return datetime.now(IST)

    def _day(self) -> str:
        return self._now().strftime("%Y-%m-%d")

    def _event(self, kind: str, detail: str = "") -> None:
        # Detail may contain a target, provider response, or message fragment.
        # Operational history records the event class only.
        self.state.setdefault("events", []).append(
            {"at": self._now().isoformat(), "kind": kind, "detail": "redacted"}
        )
        self.state["events"] = self.state["events"][-100:]

    # -------------------------------------------------------------------- cfg
    def cfg(self) -> Dict:
        warmup_days = _env_int("WA_WARMUP_DAYS", 4)
        return {
            "enabled": _env_bool("WA_ENABLED", False),
            "min_gap": _env_float("WA_MIN_GAP", 120.0),
            "max_gap": _env_float("WA_MAX_GAP", 170.0),
            "min_gap_interest": _env_float("WA_MIN_GAP_INTEREST", 60.0),
            "max_gap_interest": _env_float("WA_MAX_GAP_INTEREST", 120.0),
            "min_gap_otp": _env_float("WA_MIN_GAP_OTP", 25.0),        # 🌊 WAVE 19 — OTP fast lane
            "max_gap_otp": _env_float("WA_MAX_GAP_OTP", 60.0),
            "break_every": _env_int("WA_BREAK_EVERY", 6),
            "break_min_min": _env_float("WA_BREAK_MIN_MIN", 8.0),
            "break_max_min": _env_float("WA_BREAK_MAX_MIN", 20.0),
            "long_pause_chance": _env_float("WA_LONG_PAUSE_CHANCE", 0.08),
            "daily_cap": _env_int("WA_DAILY_CAP", 60),
            "target_daily_cap": _env_int("WA_TARGET_DAILY_CAP", 8),
            "active_start": _env_int("WA_ACTIVE_START", 8),
            "active_end": _env_int("WA_ACTIVE_END", 22),
            "warmup_days": warmup_days,
            "fail_cooldown_min": _env_float("WA_FAIL_COOLDOWN_MIN", 30.0),
            "test_fast": _env_bool("WA_TEST_FAST", False),
        }

    def warmup_cap(self) -> int:
        """కొత్త number కి day-1 నుంచి ramp: 1/3 → 1/2 → 3/4 → full."""
        c = self.cfg()
        if c["warmup_days"] <= 0:
            return c["daily_cap"]
        try:
            created = datetime.fromisoformat(self.state["created_at"])
            age_days = (self._now() - created).days + 1
        except Exception:
            age_days = 1
        full = c["daily_cap"]
        ramp = {1: 0.33, 2: 0.55, 3: 0.75}
        factor = ramp.get(age_days, 1.0)
        if age_days >= c["warmup_days"]:
            factor = 1.0
        return max(3, int(full * factor))

    # ------------------------------------------------------------------ checks
    def daily_count(self) -> int:
        return int(self.state.get("days", {}).get(self._day(), 0))

    def target_state(self, target: str) -> Dict:
        key = _target_key(target)
        t = self.state.setdefault("targets", {}).get(key) or {}
        if t.get("day") != self._day():
            t = {"day": self._day(), "count": 0, "last": t.get("last"), "fails": 0}
        return t

    def check(self, target: Optional[str] = None, priority: int = 1) -> Tuple[bool, str, float]:
        """
        Returns (allowed, reason, wait_seconds).
        reason: ok | disabled | paused | cooldown | daily_cap | target_cap | quiet_hours | gap_wait
        """
        c = self.cfg()
        if not c["enabled"]:
            return False, "disabled", 60.0
        if self.state.get("paused"):
            return False, "paused", 60.0

        cd = self.state.get("cooldown_until")
        if cd:
            try:
                until = datetime.fromisoformat(cd)
                if self._now() < until:
                    return False, "cooldown", min(600.0, max(30.0, (until - self._now()).total_seconds()))
            except Exception:
                self.state["cooldown_until"] = None

        # quiet hours (raatri manishi post cheyyadu)
        hr = self._now().hour
        if not (c["active_start"] <= hr < c["active_end"]):
            wait = self._seconds_until_active(c)
            return False, "quiet_hours", wait

        # daily cap (warmup ramp tho)
        cap = self.warmup_cap()
        if self.daily_count() >= cap:
            return False, "daily_cap", 900.0

        # per-target cap
        if target:
            ts = self.target_state(target)
            if ts["count"] >= c["target_daily_cap"]:
                return False, "target_cap", 900.0

        # gap since last message
        wait = self.wait_seconds(priority)
        if wait > 0:
            return False, "gap_wait", wait
        return True, "ok", 0.0

    def _seconds_until_active(self, c: Dict) -> float:
        now = self._now()
        target = now.replace(hour=c["active_start"], minute=0, second=0, microsecond=0)
        if now.hour >= c["active_end"]:
            target = target + timedelta(days=1)
        return max(60.0, (target - now).total_seconds())

    def wait_seconds(self, priority: int = 1) -> float:
        """
        Last message nunchi inka entha gap kavali (0 = ready).
        🔒 Gap send-time lo lock ayyindi (next_gap) — random ga okasari matrame draw avutundi,
        kani prati priority ki floor untundi (channel post ki 120s, interest ki 60s).
        """
        last = self.state.get("last_sent_at")
        if not last:
            return 0.0
        try:
            elapsed = (self._now() - datetime.fromisoformat(last)).total_seconds()
        except Exception:
            return 0.0
        c = self.cfg()
        gap = float(self.state.get("next_gap") or 0)
        floor = c["min_gap_interest"] if priority <= 0 else c["min_gap"]
        if not c["test_fast"]:          # test mode lo floor clamp vaddu (lekapothe tests 120s wait avutayi)
            gap = max(gap, floor)
        if self.state.get("next_gap") is None:      # state migrate/old file
            self.state["next_gap"] = round(self._current_gap(priority), 1)
        return max(0.0, gap - elapsed)

    def _current_gap(self, priority: int, kind: str = "") -> float:
        """Random gap — otp 25–60s, interest 60–120s, channel 120–170s (+breaks/pauses)."""
        c = self.cfg()
        if c["test_fast"]:
            return random.uniform(1.0, 2.0)
        if str(kind or "").lower() == "otp":
            return random.uniform(c["min_gap_otp"], c["max_gap_otp"])
        if priority <= 0:
            return random.uniform(c["min_gap_interest"], c["max_gap_interest"])
        gap = random.uniform(c["min_gap"], c["max_gap"])
        # prati N messages ki pedda break — ee post taruvata count batti (after = s+1)
        after = int(self.state.get("sent_since_break", 0)) + 1
        if c["break_every"] > 0 and after % c["break_every"] == 0:
            break_s = random.uniform(c["break_min_min"], c["break_max_min"]) * 60
            return gap + break_s
        # occasional "manishi phone pakkana pettadu" pause
        if random.random() < c["long_pause_chance"]:
            gap += random.uniform(180, 480)
        return gap

    def typing_ms(self) -> int:
        """'Type chesthunnattu' presence duration — text length తో proportionate."""
        return int(random.uniform(2000, 9000))

    # ------------------------------------------------------------------ update
    def record_send(self, target: Optional[str] = None, ok: bool = True, detail: str = "",
                    priority: int = 1, kind: str = "") -> bool:
        with self._lock:
            previous = copy.deepcopy(self.state)
            now = self._now()
            # 🔒 next gap ni ippude LOCK chey — prati check ki re-roll avvakudadu
            self.state["next_gap"] = round(self._current_gap(priority, kind), 1)
            self.state["next_gap_priority"] = priority
            self.state["last_sent_at"] = now.isoformat()
            self.state["sent_total"] = int(self.state.get("sent_total", 0)) + 1
            self.state["sent_since_break"] = int(self.state.get("sent_since_break", 0)) + 1
            days = self.state.setdefault("days", {})
            days[self._day()] = int(days.get(self._day(), 0)) + 1
            # purana days cleanup
            if len(days) > 60:
                for k in sorted(days.keys())[:-60]:
                    days.pop(k, None)
            if target:
                ts = self.target_state(target)
                ts["count"] = int(ts.get("count", 0)) + 1
                ts["last"] = now.isoformat()
                ts["fails"] = 0 if ok else int(ts.get("fails", 0)) + 1
                self.state["targets"][_target_key(target)] = ts
            self.state["consecutive_failures"] = 0 if ok else int(self.state.get("consecutive_failures", 0)) + 1
            self._event("sent" if ok else "send_failed", f"{target or '-'} p{priority} {detail}")
            c = self.cfg()
            if self.state["consecutive_failures"] >= 3:
                self.state["cooldown_until"] = (now + timedelta(minutes=c["fail_cooldown_min"])).isoformat()
                self._event("cooldown_start", f"{c['fail_cooldown_min']} min (3 fails)")
            if int(self.state.get("sent_since_break", 0)) >= c["break_every"]:
                self.state["sent_since_break"] = 0
            if not self.save():
                self.state = previous
                return False
            return True

    def pause(self, reason: str = "manual") -> Dict:
        previous = copy.deepcopy(self.state)
        self.state["paused"] = True
        self._event("paused", reason)
        if not self.save():
            self.state = previous
            return {"ok": False, "reason": "persistence_failed"}
        return {"ok": True, "paused": True, "reason": reason}

    def resume(self) -> Dict:
        previous = copy.deepcopy(self.state)
        self.state["paused"] = False
        self.state["cooldown_until"] = None
        self.state["consecutive_failures"] = 0
        self._event("resumed")
        if not self.save():
            self.state = previous
            return {"ok": False, "reason": "persistence_failed"}
        return {"ok": True, "paused": False}

    def reset_today(self) -> Dict:
        """Test/debug: ee రోజు counters reset (caps మళ్లీ fresh)."""
        previous = copy.deepcopy(self.state)
        self.state.setdefault("days", {})[self._day()] = 0
        for t, v in list(self.state.get("targets", {}).items()):
            if v.get("day") == self._day():
                v["count"] = 0
        self.state["sent_since_break"] = 0
        if not self.save():
            self.state = previous
            return {"ok": False, "reason": "persistence_failed"}
        return {"ok": True, "reset": True, "day": self._day()}

    # ------------------------------------------------------------------- stats
    def stats(self) -> Dict:
        c = self.cfg()
        ts = self.target_state  # noqa
        return {
            "enabled": c["enabled"],
            "paused": bool(self.state.get("paused")),
            "gap_seconds": [c["min_gap"], c["max_gap"]],
            "gap_interest_seconds": [c["min_gap_interest"], c["max_gap_interest"]],
            "random_gap": f"{int(c['min_gap'])}–{int(c['max_gap'])} sec random",
            "break_every": c["break_every"],
            "break_minutes": [c["break_min_min"], c["break_max_min"]],
            "active_hours_ist": [c["active_start"], c["active_end"]],
            "warmup_cap_today": self.warmup_cap(),
            "daily_cap": c["daily_cap"],
            "target_daily_cap": c["target_daily_cap"],
            "sent_today": self.daily_count(),
            "sent_total": self.state.get("sent_total", 0),
            "sent_since_break": self.state.get("sent_since_break", 0),
            "next_allowed_in_seconds": round(self.wait_seconds(1), 1),
            "locked_next_gap_seconds": self.state.get("next_gap"),
            "gap_is_randomized_per_post": True,
            "cooldown_until": self.state.get("cooldown_until"),
            "consecutive_failures": self.state.get("consecutive_failures", 0),
            "last_sent_at": self.state.get("last_sent_at"),
            "targets_today_count": sum(1 for v in (self.state.get("targets") or {}).values()
                                    if v.get("day") == self._day()),
            "recent_event_count": len(self.state.get("events") or []),
        }


# Singleton — publisher + API rendu idi use chesthayi
ENGINE = WhatsAppAntiban()


def variantize(text: str, site: str, bot: str = "") -> str:
    """Rotate safe copy; include a bot contact only when explicitly configured."""
    if "MANA VIVAHA" in text:
        text = text.replace("💍 *MANA VIVAHA* — TS-AP Telugu Matrimony", random.choice(GREETING_VARIANTS), 1)
    import re
    pattern = re.compile(r"(?m)^📝[^\n]*/register(?:\n🤖 Bot:[^\n]*)?")
    repl = random.choice(CTA_VARIANTS).format(site=site)
    configured_bot = str(bot or "").strip()
    if configured_bot:
        repl += f"\n🤖 Bot: {configured_bot}"
    text2 = pattern.sub(repl, text, count=1)
    return text2 if text2 != text else text


if __name__ == "__main__":  # quick demo: python wa_antiban.py
    import time
    e = WhatsAppAntiban()
    print(json.dumps(e.stats(), indent=2, ensure_ascii=False))
    print("\n-- simulated 8 gaps (random 120–170 + breaks) --")
    # Exercise timing state only; this marker is local and is not an external destination.
    for i in range(8):
        g = e._current_gap(1)
        print(f"  msg {i+1}: gap {g/60:.2f} min ({int(g)}s)")
        e.record_send(target="local-only-test-target", ok=True, priority=1)
