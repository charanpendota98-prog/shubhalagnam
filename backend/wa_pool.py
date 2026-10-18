"""
MANA VIVAHA — WHATSAPP POOL + FAILOVER 📱
=========================================
"Okkati fail aina inkokati pampela" — WhatsApp ki kooda same design (multiple numbers/bridges).

  Number 1  → main posting number   (channel/group posts)
  Number 2  → second posting number (capacity double + ban risk spread)
  Number 3  → requests/interest lane + backup (priority messages eppudu vellali)

Pani ela chestundi:
  1. `pick(lane)` → ee lane ki healthy instances ni **least-sent mundu** order lo isthundi
     (load balancing + per-instance daily cap respect)
  2. `deliver(item)` → instance A try → fail aithe **ventane B** → C … (item per-instance mark avvadu,
     so same message rendu sarlu velladu)
  3. Antha fail aithe → `ok: False` + attempts list → publisher queue lo **retry (3 attempts)** +
     admin ki alert bot tho notification + dead-letter list
  4. Instance health: ok | down | auth | rate_limited (+cooldown), sent_today/threshold, last_error
  5. Per-instance anti-ban: `wa_antiban` engine per-number gaps/caps ki instance name pass avutundi

ENV:
  WA_INSTANCES — JSON: [{"name":"wa1","url":"http://wa1:3000","lane":"both","daily_cap":60,
                          "token":"optional-bridge-secret"}]
  (fallback) WHATSAPP_BRIDGE_URL + WHATSAPP_MODE=bridge → single instance "wa1"
  WA_INSTANCE_STATE — state file path (default backend/wa_pool_state.json)
"""
from __future__ import annotations

import copy
import json
from atomic_store import atomic_json_dump
import os
import time
from typing import Callable, Dict, List, Optional

STATE_FILE = os.getenv("WA_INSTANCE_STATE") or os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "wa_pool_state.json")

DEFAULT_COOLDOWNS = {"down": 300, "auth": 3600, "rate_limited": 600, "soft": 60}


class WAInstance:
    LANE_MAP = {"post": "channels", "requests": "personal",  # legacy compat
                "otp": "otp", "channels": "channels", "personal": "personal", "both": "both"}

    def __init__(self, name: str, url: str, lane: str = "both", daily_cap: int = 60, token: str = "",
                 number: str = "", paused: bool = False):
        self.name = name
        self.url = (url or "").rstrip("/")
        self.lane = self.LANE_MAP.get((lane or "both").strip().lower(), "both")
        self.number = "".join(ch for ch in str(number or "") if ch.isdigit())  # display + admin
        self.paused = bool(paused)
        self.daily_cap = int(daily_cap or 60)
        self.token = token or ""
        # health
        self.status = "ok" if self.url else "no_url"
        self.sent_today = 0
        self.total_sent = 0
        self.fail_count = 0
        self.last_error = ""
        self.last_used = ""
        self.cooldown_until = 0.0

    @property
    def configured(self) -> bool:
        return bool(self.url)

    def capacity_left(self) -> int:
        return max(0, self.daily_cap - self.sent_today)

    def available(self, now: float, lane: str = "both") -> bool:
        lane = self.LANE_MAP.get((lane or "both").strip().lower(), "both")
        if self.paused:
            return False
        if not self.configured or now < self.cooldown_until:
            return False
        if self.status in ("auth",):
            return False
        if lane != "both" and self.lane not in ("both", lane):
            return False
        return self.capacity_left() > 0

    def as_dict(self, now: Optional[float] = None) -> Dict:
        now = now or time.time()
        _n = self.number
        _mask = ("XXXXXX" + _n[-4:]) if len(_n) >= 10 else _n
        return {"name": self.name, "url": self.url, "lane": self.lane, "daily_cap": self.daily_cap,
                "number_masked": _mask, "paused": self.paused,
                "sent_today": self.sent_today, "capacity_left": self.capacity_left(),
                "total_sent": self.total_sent, "status": self.status, "failures": self.fail_count,
                "last_error": self.last_error, "last_used": self.last_used,
                "available": self.available(now),
                "cooldown_s": max(0, int(self.cooldown_until - now)) if self.cooldown_until > now else 0}


def instances_from_env() -> List[WAInstance]:
    raw = os.getenv("WA_INSTANCES", "").strip()
    out: List[WAInstance] = []
    if raw:
        try:
            for i, d in enumerate(json.loads(raw)):
                out.append(WAInstance(d.get("name", "wa%d" % (i + 1)), d.get("url", ""),
                                      d.get("lane", "both"), d.get("daily_cap", 60), d.get("token", ""),
                                      d.get("number", ""), d.get("paused", False)))
        except Exception:
            pass
    if not out:
        url = os.getenv("WHATSAPP_BRIDGE_URL", "").strip()
        if url:
            out.append(WAInstance("wa1", url, "both", int(os.getenv("WA_DAILY_CAP", "60"))))
    return out


class WAPool:
    def __init__(self, instances: Optional[List[WAInstance]] = None, deliverer: Optional[Callable] = None,
                 clock=None, state_file: Optional[str] = None):
        self.instances = instances if instances is not None else instances_from_env()
        self._deliverer = deliverer      # deliverer(instance, item) -> {"ok":bool,...} (sync/async)
        self._clock = clock or time.time
        self.state_file = state_file if state_file is not None else STATE_FILE
        self.day = time.strftime("%Y-%m-%d", time.gmtime(self._clock()))
        self.last_delivery: List[Dict] = []
        self.load_state()

    # ---------------------------------------------------------------- state
    def load_state(self) -> None:
        try:
            if os.path.exists(self.state_file):
                data = json.load(open(self.state_file)) or {}
                for d in data.get("config") or []:   # admin-added numbers restore
                    if not any(i.name == d.get("name") for i in self.instances):
                        self.instances.append(WAInstance(
                            d.get("name", "waX"), d.get("url", ""), d.get("lane", "both"),
                            d.get("daily_cap", 60), d.get("token", ""),
                            d.get("number", ""), d.get("paused", False)))
                if data.get("day") == self.day:
                    for inst in self.instances:
                        s = (data.get("instances") or {}).get(inst.name) or {}
                        inst.sent_today = int(s.get("sent_today", 0) or 0)
                        inst.total_sent = int(s.get("total_sent", 0) or 0)
        except Exception:
            pass

    def save_state(self) -> bool:
        try:
            payload = {"day": self.day, "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                       "config": [{"name": i.name, "url": i.url, "lane": i.lane,
                                   "daily_cap": i.daily_cap, "token": i.token,
                                   "number": i.number, "paused": i.paused} for i in self.instances],
                       "instances": {i.name: {"sent_today": i.sent_today, "total_sent": i.total_sent,
                                              "status": i.status, "last_error": i.last_error}
                                     for i in self.instances}}
            atomic_json_dump(self.state_file, payload, indent=2)
            return True
        except Exception:
            return False

    def _roll_day(self) -> None:
        today = time.strftime("%Y-%m-%d", time.gmtime(self._clock()))
        if today != self.day:
            self.day = today
            for inst in self.instances:
                inst.sent_today = 0
                if inst.status != "auth":
                    inst.status = "ok" if inst.configured else "no_url"
                inst.cooldown_until = 0.0
            self.save_state()

    # ---------------------------------------------------------------- health
    def order(self, lane: str = "channels") -> List[WAInstance]:
        self._roll_day()
        now = self._clock()
        lane = WAInstance.LANE_MAP.get((lane or "channels").strip().lower(), "channels")
        pool = [i for i in self.instances if lane == "both" or i.lane in ("both", lane)] or list(self.instances)
        # 🎯 ee lane ki dedicated number mundu (requests number requests ki), tarvata load balance
        return sorted(pool, key=lambda i: (i.lane != lane and lane != "both",
                                           not i.available(now, lane), i.sent_today, i.total_sent))

    def health(self) -> Dict:
        self._roll_day()
        now = self._clock()
        return {"instances": [i.as_dict(now) for i in self.instances],
                "configured": len([i for i in self.instances if i.configured]),
                "available": len([i for i in self.instances if i.available(now)]),
                "otp_order": [i.name for i in self.order("otp")],
                "channels_order": [i.name for i in self.order("channels")],
                "personal_order": [i.name for i in self.order("personal")],
                "total_sent_today": sum(i.sent_today for i in self.instances),
                "failover": "purpose number down అయితే 'both' backup number వెంటనే (duplicate అవ్వదు)",
                "recommended": "3 numbers: OTP (fast) + Channels (posts) + Personal (DMs) + 1 both-backup (optional)",
                "recent": self.last_delivery[-10:]}

    def note_success(self, inst: WAInstance) -> bool:
        previous = copy.deepcopy(inst.__dict__)
        inst.sent_today += 1
        inst.total_sent += 1
        inst.status = "ok"
        inst.last_error = ""
        inst.last_used = time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime(self._clock()))
        if not self.save_state():
            inst.__dict__.clear()
            inst.__dict__.update(previous)
            return False
        return True

    def note_failure(self, inst: WAInstance, kind: str, error: str = "", retry_after: float = 0) -> bool:
        previous = copy.deepcopy(inst.__dict__)
        inst.fail_count += 1
        inst.last_error = (error or kind)[:180]
        inst.status = kind
        cool = float(retry_after or DEFAULT_COOLDOWNS.get(kind, 60))
        if cool > 0:
            inst.cooldown_until = self._clock() + cool
        if not self.save_state():
            inst.__dict__.clear()
            inst.__dict__.update(previous)
            return False
        return True

    @staticmethod
    def classify(res: Dict) -> tuple:
        status = res.get("status")
        err = str(res.get("error") or "").lower()
        if status in (401, 403) or "unauthorized" in err or "forbidden" in err:
            return "auth", 3600
        if status == 429 or "rate" in err or "too many" in err:
            return "rate_limited", float(res.get("retry_after") or 600)
        if "not connected" in err or "disconnected" in err or "logged out" in err:
            return "down", 300
        if status and int(status) >= 500:
            return "down", 300
        if res.get("network_error"):
            return "down", 300
        return "soft", 60

    # ---------------------------------------------------------------- deliver
    async def deliver(self, item: Dict, lane: str = "post", deliverer: Optional[Callable] = None,
                      max_instances: int = 3, preferred: Optional[str] = None) -> Dict:
        """
        Oka WhatsApp message ni deliver chey — instances failover tho.
        item: {"target":..,"text":..,"image_id"/"image_path"/"image_url":..,"priority":..,"kind":..}
        """
        import asyncio
        fn = deliverer or self._deliverer
        attempts: List[Dict] = []
        ordered = [i for i in self.order(lane) if i.configured]
        if preferred:
            ordered.sort(key=lambda i: (i.name != preferred, i.sent_today))
        candidates = ordered[:max_instances]
        if not candidates:
            return {"ok": False, "instance": "", "attempts": attempts,
                    "error": "WhatsApp instances configure చెయ్యలేదు",
                    "hint": "WA_INSTANCES (JSON) leda WHATSAPP_BRIDGE_URL set చెయ్యండి"}
        if fn is None:
            return {"ok": False, "instance": "", "attempts": attempts,
                    "error": "deliverer లేదు (publisher _wa_send_via_instance pass చెయ్యాలి)"}
        for inst in candidates:
            try:
                res = fn(inst, item)
                if asyncio.iscoroutine(res):
                    res = await res
            except Exception as e:
                res = {"ok": False, "network_error": True, "error": "%s: %s" % (type(e).__name__, e)}
            if res.get("ok"):
                if not self.note_success(inst):
                    return {"ok": False, "instance": inst.name, "attempts": attempts,
                            "error": "WhatsApp success could not be recorded safely",
                            "reason": "persistence_failed"}
                entry = {"at": time.strftime("%H:%M:%S"), "instance": inst.name,
                         "target": item.get("target"), "ok": True, "kind": item.get("kind"),
                         "fallback_used": bool(attempts)}
                self.last_delivery.append(entry)
                return {"ok": True, "instance": inst.name, "attempts": attempts + [{"instance": inst.name, "ok": True}],
                        "fallback_used": bool(attempts), "result": res}
            kind, retry = self.classify(res)
            if not self.note_failure(inst, kind, res.get("error") or "", retry):
                return {"ok": False, "instance": inst.name, "attempts": attempts,
                        "error": "WhatsApp failure could not be recorded safely",
                        "reason": "persistence_failed"}
            attempts.append({"instance": inst.name, "ok": False, "kind": kind,
                             "error": (res.get("error") or "")[:160], "cooldown_s": int(retry)})
        self.last_delivery.append({"at": time.strftime("%H:%M:%S"), "ok": False,
                                   "target": item.get("target"), "attempts": attempts})
        return {"ok": False, "instance": "", "attempts": attempts,
                "error": "అన్నీ WhatsApp instances fail అయ్యాయి",
                "hint": "bridge QR scan + WA_INSTANCES urls check చెయ్యండి"}

    # ------------------------------------------------------- 🌊 WAVE 19 admin manage
    def add_instance(self, name: str, url: str, lane: str = "both", daily_cap: int = 60,
                     token: str = "", number: str = "") -> Dict:
        name = (name or "").strip() or ("wa%d" % (len(self.instances) + 1))
        if any(i.name == name for i in self.instances):
            return {"success": False, "reason": "duplicate",
                    "message_telugu": f"⚠️ {name} already ఉంది — vere name ఇవ్వండి"}
        inst = WAInstance(name, url, lane, daily_cap, token, number)
        self.instances.append(inst)
        if not self.save_state():
            self.instances.remove(inst)
            return {"success": False, "reason": "persistence_failed",
                    "message_telugu": "⚠️ WhatsApp number could not be saved safely. Please try again."}
        return {"success": True, "name": name, "lane": inst.lane,
                "message_telugu": f"✅ {name} ({inst.lane}) add అయ్యింది"}

    def update_instance(self, name: str, **kw) -> Dict:
        inst = next((i for i in self.instances if i.name == name), None)
        if not inst:
            return {"success": False, "reason": "not_found",
                    "message_telugu": "⚠️ Number దొరకలేదు"}
        previous = copy.deepcopy(inst.__dict__)
        if "url" in kw and kw["url"] is not None:
            inst.url = str(kw["url"]).rstrip("/")
            inst.status = "ok" if inst.url else "no_url"
        if "lane" in kw and kw["lane"]:
            inst.lane = WAInstance.LANE_MAP.get(str(kw["lane"]).strip().lower(), inst.lane)
        if "daily_cap" in kw and kw["daily_cap"]:
            inst.daily_cap = max(1, int(kw["daily_cap"]))
        if "token" in kw and kw["token"] is not None:
            inst.token = str(kw["token"])
        if "number" in kw and kw["number"] is not None:
            inst.number = "".join(ch for ch in str(kw["number"]) if ch.isdigit())
        if "paused" in kw:
            inst.paused = bool(kw["paused"])
            if not inst.paused and inst.status == "paused":
                inst.status = "ok" if inst.configured else "no_url"
        if inst.paused:
            inst.status = "paused"
        if not self.save_state():
            inst.__dict__.clear()
            inst.__dict__.update(previous)
            return {"success": False, "reason": "persistence_failed",
                    "message_telugu": "⚠️ WhatsApp number update could not be saved safely. Please try again."}
        return {"success": True, "name": name, "instance": inst.as_dict(),
                "message_telugu": f"✅ {name} update అయ్యింది"}

    def remove_instance(self, name: str) -> Dict:
        previous = list(self.instances)
        before = len(self.instances)
        self.instances = [i for i in self.instances if i.name != name]
        if len(self.instances) == before:
            return {"success": False, "reason": "not_found",
                    "message_telugu": "⚠️ Number దొరకలేదు"}
        if not self.save_state():
            self.instances = previous
            return {"success": False, "reason": "persistence_failed",
                    "message_telugu": "⚠️ WhatsApp number could not be removed safely. Please try again."}
        return {"success": True, "message_telugu": f"🗑️ {name} teesesam"}

    def dead_letter(self, item: Dict, attempts: List[Dict]) -> Dict:
        """3 tries అయ్యాక కూడా fail → dead-letter (admin alert + తర్వాత manual/bulk retry)."""
        rec = {"at": time.strftime("%Y-%m-%d %H:%M:%S"), "target": item.get("target"),
               "kind": item.get("kind"), "text_preview": str(item.get("text", ""))[:120],
               "attempts": attempts}
        self.last_delivery.append({"at": rec["at"], "dead_letter": True, "target": rec["target"]})
        return rec


_ENGINES: Dict[str, object] = {}


def engine_for(instance_name: str):
    """Per-number anti-ban engine — ఒక్క WhatsApp number కి ఒక్క gaps/caps state (multi-number safe)."""
    try:
        from wa_antiban import WhatsAppAntiban
    except Exception:
        return None
    key = instance_name or "default"
    if key not in _ENGINES:
        base = os.path.join(os.path.dirname(os.path.abspath(__file__)), "wa_state_%s.json" % key)
        try:
            _ENGINES[key] = WhatsAppAntiban(state_file=base)
        except Exception:
            return None
    return _ENGINES[key]


_POOL: Optional[WAPool] = None
_SIG = None


def get_pool(force_reload: bool = False) -> WAPool:
    global _POOL, _SIG
    sig = (os.getenv("WA_INSTANCES", ""), os.getenv("WHATSAPP_BRIDGE_URL", ""), os.getenv("WA_INSTANCE_STATE", ""))
    if force_reload or _POOL is None or sig != _SIG:
        _POOL = WAPool()
        _SIG = sig
    return _POOL


def wa_health() -> Dict:
    return get_pool().health()
