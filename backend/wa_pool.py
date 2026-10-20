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

import base64
import copy
import hashlib
import json
import re
import secrets
from atomic_store import atomic_json_dump
import os
import time
from typing import Callable, Dict, List, Optional, Tuple
from urllib.parse import urlsplit, urlunsplit

try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
except Exception:  # pragma: no cover - production requirements include cryptography
    AESGCM = None

try:
    import httpx
except Exception:  # pragma: no cover - the production dependency is optional for dry-run tests
    httpx = None

STATE_FILE = os.getenv("WA_INSTANCE_STATE") or os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "wa_pool_state.json")

DEFAULT_COOLDOWNS = {"down": 300, "auth": 3600, "rate_limited": 600, "soft": 60}
_ALLOWED_LANES = {"otp", "channels", "personal", "both"}
_INSTANCE_NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$")
_PHONE_RE = re.compile(r"^\+?[1-9][0-9]{7,14}$")
_TOKEN_AAD = b"mana-vivaha-wa-bridge-token-v1"
_TOKEN_PREFIX = "enc:v1:"


def _token_key() -> Optional[bytes]:
    """Derive a stable local encryption key from an app/secret-manager secret."""
    source = (os.getenv("WA_TOKEN_ENCRYPTION_KEY", "").strip()
              or os.getenv("TSAP_AUTH_SECRET", "").strip()
              or os.getenv("JWT_SECRET", "").strip())
    if len(source) < 32 or AESGCM is None:
        return None
    return hashlib.sha256(("wa-token-at-rest:" + source).encode("utf-8")).digest()


def _protect_token(token: str) -> str:
    """Authenticated encryption for bridge tokens persisted in the pool state."""
    if not token:
        return ""
    key = _token_key()
    if key is None:
        raise RuntimeError("a 32+ character token-encryption secret is required")
    nonce = secrets.token_bytes(12)
    encrypted = AESGCM(key).encrypt(nonce, token.encode("utf-8"), _TOKEN_AAD)
    return _TOKEN_PREFIX + base64.urlsafe_b64encode(nonce + encrypted).decode("ascii")


def _unprotect_token(value: object) -> Tuple[str, bool]:
    """Read encrypted state and migrate a legacy plaintext token on next save."""
    raw = str(value or "")
    if not raw:
        return "", False
    if not raw.startswith(_TOKEN_PREFIX):
        # Existing state files used plaintext. Keep runtime compatibility, but
        # callers must rewrite them through save_state before production use.
        return raw, True
    key = _token_key()
    if key is None or AESGCM is None:
        return "", False
    try:
        packed = base64.urlsafe_b64decode(raw[len(_TOKEN_PREFIX):].encode("ascii"))
        if len(packed) <= 12:
            return "", False
        token = AESGCM(key).decrypt(packed[:12], packed[12:], _TOKEN_AAD).decode("utf-8")
        return token[:512], False
    except Exception:
        # Never guess or expose a token when integrity/decryption fails.
        return "", False


def _optional_nonnegative_int(value: object) -> Optional[int]:
    try:
        return max(0, int(value)) if value is not None else None
    except (TypeError, ValueError):
        return None


def _error_summary(value: object) -> str:
    """Return a bounded operational category, never a bridge/provider payload."""
    text = str(value or "").lower()
    if any(word in text for word in ("401", "403", "unauthorized", "forbidden", "token")):
        return "bridge authentication failed"
    if any(word in text for word in ("timeout", "timed out", "network", "connect", "dns")):
        return "bridge network unavailable"
    if any(word in text for word in ("not connected", "disconnected", "logged out")):
        return "bridge session is not connected"
    if "429" in text or "rate" in text or "too many" in text:
        return "bridge rate limited"
    if "5" in text and "status" in text:
        return "bridge service unavailable"
    return "bridge request failed"


def _bridge_base_url(value: object) -> str:
    """Normalize a configured bridge URL without retaining query/credential material."""
    raw = str(value or "").strip()
    if not raw:
        return ""
    parsed = urlsplit(raw)
    try:
        port = parsed.port
    except ValueError:
        return ""
    if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
        return ""
    path = (parsed.path or "").rstrip("/")
    for suffix in ("/auth/pairing-code", "/auth/status", "/auth/qr", "/send-image",
                   "/presence", "/groups", "/health", "/status", "/send", "/auth"):
        if path.endswith(suffix):
            path = path[: -len(suffix)]
            break
    netloc = parsed.hostname
    if port:
        netloc += f":{port}"
    return urlunsplit((parsed.scheme, netloc, path, "", "")).rstrip("/")


class WAInstance:
    LANE_MAP = {"post": "channels", "requests": "personal",  # legacy compat
                "otp": "otp", "channels": "channels", "personal": "personal", "both": "both"}

    def __init__(self, name: str, url: str, lane: str = "both", daily_cap: int = 60, token: str = "",
                 number: str = "", paused: bool = False):
        self.name = name
        self.url = _bridge_base_url(url)
        self.lane = self.LANE_MAP.get((lane or "both").strip().lower(), "both")
        self.number = "".join(ch for ch in str(number or "") if ch.isdigit())  # display + admin
        self.paused = bool(paused)
        self.daily_cap = int(daily_cap or 60)
        self.token = str(token or "")
        # health
        self.status = "ok" if self.url else "no_url"
        self.sent_today = 0
        self.total_sent = 0
        self.fail_count = 0
        self.last_error = ""
        self.last_used = ""
        self.cooldown_until = 0.0
        # Runtime-only bridge auth observation. It is deliberately not persisted or
        # returned with credentials; the admin auth endpoint refreshes it on demand.
        self.bridge_connected = None

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
        if self.bridge_connected is False or self.status in ("auth",):
            return False
        if lane != "both" and self.lane not in ("both", lane):
            return False
        return self.capacity_left() > 0

    def as_dict(self, now: Optional[float] = None) -> Dict:
        now = now or time.time()
        _n = self.number
        _mask = (("X" * max(4, len(_n) - 4)) + _n[-4:]) if _n else ""
        auth_state = "unknown"
        if self.bridge_connected is True:
            auth_state = "connected"
        elif self.bridge_connected is False:
            auth_state = "not_connected"
        return {"name": self.name, "url_configured": bool(self.url), "lane": self.lane, "daily_cap": self.daily_cap,
                "number_masked": _mask, "paused": self.paused,
                "sent_today": self.sent_today, "capacity_left": self.capacity_left(),
                "total_sent": self.total_sent, "status": self.status, "auth_state": auth_state,
                "failures": self.fail_count,
                "last_error": _error_summary(self.last_error) if self.last_error else "", "last_used": self.last_used,
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
            out.append(WAInstance("wa1", url, "both", int(os.getenv("WA_DAILY_CAP", "60")),
                                  os.getenv("WHATSAPP_BRIDGE_TOKEN", "")))
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
                needs_token_migration = False
                for d in data.get("config") or []:   # admin-added numbers restore
                    token, legacy = _unprotect_token(d.get("token", ""))
                    needs_token_migration = needs_token_migration or legacy
                    if not any(i.name == d.get("name") for i in self.instances):
                        self.instances.append(WAInstance(
                            d.get("name", "waX"), d.get("url", ""), d.get("lane", "both"),
                            d.get("daily_cap", 60), token,
                            d.get("number", ""), d.get("paused", False)))
                if data.get("day") == self.day:
                    for inst in self.instances:
                        s = (data.get("instances") or {}).get(inst.name) or {}
                        inst.sent_today = int(s.get("sent_today", 0) or 0)
                        inst.total_sent = int(s.get("total_sent", 0) or 0)
                # Legacy plaintext tokens remain usable for this process, then
                # are rewritten with authenticated encryption when a valid app
                # secret is available. Never write plaintext back to disk.
                if needs_token_migration:
                    self.save_state()
        except Exception:
            pass

    def save_state(self) -> bool:
        try:
            protected_config = []
            for instance in self.instances:
                protected_config.append({
                    "name": instance.name, "url": instance.url, "lane": instance.lane,
                    "daily_cap": instance.daily_cap, "token": _protect_token(instance.token),
                    "number": instance.number, "paused": instance.paused,
                })
            payload = {"day": self.day, "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                       "config": protected_config,
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
        # Never fall back from a dedicated lane to an unrelated purpose. An OTP
        # job with no OTP-capable instance must stay queued/dead-lettered rather
        # than silently using a channel or personal number.
        pool = [i for i in self.instances if lane == "both" or i.lane in ("both", lane)]
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

    def _instance(self, name: str) -> Optional[WAInstance]:
        return next((item for item in self.instances if item.name == name), None)

    def _bridge_request(self, inst: WAInstance, method: str, path: str, payload: Optional[Dict] = None) -> Dict:
        """Call a configured bridge without ever returning its URL, token, or raw error."""
        if httpx is None:
            return {"ok": False, "status": 503, "error": "bridge client unavailable"}
        if not inst.url:
            return {"ok": False, "status": 503, "error": "bridge URL missing"}
        headers = {"X-Bridge-Token": inst.token} if inst.token else {}
        try:
            with httpx.Client(timeout=8.0, follow_redirects=False) as client:
                response = client.request(method, f"{inst.url}{path}", headers=headers, json=payload)
            try:
                body = response.json()
            except Exception:
                body = {}
            if response.status_code >= 400:
                return {"ok": False, "status": response.status_code, "error": _error_summary(response.status_code)}
            return {"ok": True, "status": response.status_code, "body": body if isinstance(body, dict) else {}}
        except Exception as exc:
            return {"ok": False, "status": 503, "error": _error_summary(type(exc).__name__)}

    def auth_status(self, name: str) -> Dict:
        inst = self._instance(name)
        if not inst:
            return {"success": False, "reason": "not_found", "message_en": "WhatsApp instance not found."}
        result = self._bridge_request(inst, "GET", "/auth/status")
        if not result.get("ok"):
            inst.bridge_connected = False
            return {"success": False, "name": inst.name, "status": result.get("status", 503),
                    "error_code": _error_summary(result.get("error")),
                    "message_en": "Bridge authentication status is unavailable."}
        body = result.get("body") or {}
        connected = bool(body.get("connected"))
        inst.bridge_connected = connected
        return {"success": True, "name": inst.name, "connected": connected,
                "registered": bool(body.get("registered")),
                "qr_available": bool(body.get("qr_available")),
                "pairing_available": bool(body.get("pairing_available")),
                "qr_age_seconds": _optional_nonnegative_int(body.get("qr_age_seconds")),
                "state": str(body.get("state") or ("connected" if connected else "not_connected"))[:40]}

    def auth_qr(self, name: str) -> Dict:
        inst = self._instance(name)
        if not inst:
            return {"success": False, "reason": "not_found", "message_en": "WhatsApp instance not found."}
        result = self._bridge_request(inst, "GET", "/auth/qr")
        if not result.get("ok"):
            return {"success": False, "status": result.get("status", 503),
                    "error_code": _error_summary(result.get("error")),
                    "message_en": "QR is not available from this bridge."}
        body = result.get("body") or {}
        qr = body.get("qr") if isinstance(body.get("qr"), str) else ""
        return {"success": True, "name": inst.name, "connected": bool(body.get("connected")),
                "qr": qr[:12000], "qr_available": bool(qr),
                "qr_age_seconds": _optional_nonnegative_int(body.get("qr_age_seconds"))}

    def request_pairing_code(self, name: str, phone: str) -> Dict:
        inst = self._instance(name)
        if not inst:
            return {"success": False, "reason": "not_found", "message_en": "WhatsApp instance not found."}
        raw_phone = str(phone or "").strip()
        if not _PHONE_RE.fullmatch(raw_phone):
            return {"success": False, "reason": "invalid_phone", "message_en": "Enter an authorized phone number with country code."}
        digits = raw_phone.lstrip("+")
        if inst.number and digits != inst.number:
            return {"success": False, "reason": "phone_not_authorized",
                    "message_en": "The phone does not match this instance's authorized number."}
        result = self._bridge_request(inst, "POST", "/auth/pairing-code", {"phone": digits})
        if not result.get("ok"):
            return {"success": False, "status": result.get("status", 503),
                    "error_code": _error_summary(result.get("error")),
                    "message_en": "Pairing code could not be requested."}
        body = result.get("body") or {}
        code = body.get("pairing_code") if isinstance(body.get("pairing_code"), str) else ""
        return {"success": bool(code), "name": inst.name, "pairing_code": code[:32],
                "message_en": "Pairing code ready. It is not stored by the application." if code else "Pairing code is not ready."}

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
        inst.last_error = _error_summary(error or kind)
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
                # Exception text can contain provider/recipient material. Keep it
                # inside the process only as a category for operations decisions.
                res = {"ok": False, "network_error": True, "error": _error_summary(type(e).__name__)}
            if res.get("ok"):
                if not self.note_success(inst):
                    return {"ok": False, "instance": inst.name, "attempts": attempts,
                            "error": "WhatsApp success could not be recorded safely",
                            "reason": "persistence_failed"}
                entry = {"at": time.strftime("%H:%M:%S"), "instance": inst.name,
                         "ok": True, "kind": item.get("kind"),
                         "fallback_used": bool(attempts)}
                self.last_delivery.append(entry)
                safe_result = {key: res.get(key) for key in ("status", "kind", "with_image", "dry_run") if key in res}
                return {"ok": True, "instance": inst.name, "attempts": attempts + [{"instance": inst.name, "ok": True}],
                        "fallback_used": bool(attempts), "result": safe_result}
            kind, retry = self.classify(res)
            if not self.note_failure(inst, kind, res.get("error") or "", retry):
                return {"ok": False, "instance": inst.name, "attempts": attempts,
                        "error": "WhatsApp failure could not be recorded safely",
                        "reason": "persistence_failed"}
            attempts.append({"instance": inst.name, "ok": False, "kind": kind,
                             "error": _error_summary(res.get("error") or kind), "cooldown_s": int(retry)})
        self.last_delivery.append({"at": time.strftime("%H:%M:%S"), "ok": False,
                                   "kind": item.get("kind"), "attempts": attempts})
        return {"ok": False, "instance": "", "attempts": attempts,
                "error": "అన్నీ WhatsApp instances fail అయ్యాయి",
                "hint": "bridge QR scan + WA_INSTANCES urls check చెయ్యండి"}

    # ------------------------------------------------------- 🌊 WAVE 19 admin manage
    def add_instance(self, name: str, url: str, lane: str = "both", daily_cap: int = 60,
                     token: str = "", number: str = "") -> Dict:
        name = (name or "").strip() or ("wa%d" % (len(self.instances) + 1))
        base_url = _bridge_base_url(url)
        lane = str(lane or "both").strip().lower()
        try:
            cap = int(daily_cap or 60)
        except (TypeError, ValueError):
            return {"success": False, "reason": "invalid_cap", "message_telugu": "⚠️ Daily cap must be a whole number."}
        raw_number = str(number or "").strip()
        if not _INSTANCE_NAME_RE.fullmatch(name):
            return {"success": False, "reason": "invalid_name", "message_telugu": "⚠️ Instance name may use letters, numbers, dot, dash, or underscore only."}
        if not base_url:
            return {"success": False, "reason": "invalid_url", "message_telugu": "⚠️ Use an http(s) bridge URL without credentials or query parameters."}
        if lane not in _ALLOWED_LANES:
            return {"success": False, "reason": "invalid_lane", "message_telugu": "⚠️ Lane must be otp, channels, personal, or both."}
        if cap < 1 or cap > 10000:
            return {"success": False, "reason": "invalid_cap", "message_telugu": "⚠️ Daily cap must be between 1 and 10000."}
        if raw_number and not _PHONE_RE.fullmatch(raw_number):
            return {"success": False, "reason": "invalid_phone", "message_telugu": "⚠️ Enter the authorized WhatsApp number with country code."}
        if len(str(token or "")) > 512:
            return {"success": False, "reason": "invalid_token", "message_telugu": "⚠️ Bridge token is too long."}
        if any(i.name == name for i in self.instances):
            return {"success": False, "reason": "duplicate",
                    "message_telugu": f"⚠️ {name} already ఉంది — vere name ఇవ్వండి"}
        inst = WAInstance(name, base_url, lane, cap, token, raw_number)
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
            new_url = _bridge_base_url(kw["url"])
            if not new_url and str(kw["url"]).strip():
                return {"success": False, "reason": "invalid_url", "message_telugu": "⚠️ Use an http(s) bridge URL without credentials or query parameters."}
            inst.url = new_url
            inst.status = "ok" if inst.url else "no_url"
            inst.bridge_connected = None
        if "lane" in kw and kw["lane"]:
            requested_lane = str(kw["lane"]).strip().lower()
            if requested_lane not in _ALLOWED_LANES:
                return {"success": False, "reason": "invalid_lane", "message_telugu": "⚠️ Lane must be otp, channels, personal, or both."}
            inst.lane = requested_lane
        if "daily_cap" in kw and kw["daily_cap"] is not None:
            try:
                requested_cap = int(kw["daily_cap"])
            except (TypeError, ValueError):
                return {"success": False, "reason": "invalid_cap", "message_telugu": "⚠️ Daily cap must be a whole number."}
            if requested_cap < 1 or requested_cap > 10000:
                return {"success": False, "reason": "invalid_cap", "message_telugu": "⚠️ Daily cap must be between 1 and 10000."}
            inst.daily_cap = requested_cap
        if "token" in kw and kw["token"] is not None:
            if len(str(kw["token"])) > 512:
                return {"success": False, "reason": "invalid_token", "message_telugu": "⚠️ Bridge token is too long."}
            inst.token = str(kw["token"])
        if "number" in kw and kw["number"] is not None:
            requested_number = str(kw["number"]).strip()
            if requested_number and not _PHONE_RE.fullmatch(requested_number):
                return {"success": False, "reason": "invalid_phone", "message_telugu": "⚠️ Enter the authorized WhatsApp number with country code."}
            inst.number = "".join(ch for ch in requested_number if ch.isdigit())
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
               "image_id": item.get("image_id", ""), "image_path": item.get("image_path"),
               "priority": item.get("priority", 1), "dedupe_key": item.get("dedupe_key", ""),
               "attempts": attempts}
        self.last_delivery.append({"at": rec["at"], "dead_letter": True, "kind": rec.get("kind")})
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
        safe_key = re.sub(r"[^A-Za-z0-9_.-]", "_", str(key))[:64] or "default"
        state_root = os.getenv("MANA_VIVAHA_STATE_DIR") or os.path.dirname(os.path.abspath(__file__))
        base = os.path.join(state_root, "wa_state_%s.json" % safe_key)
        try:
            _ENGINES[key] = WhatsAppAntiban(state_file=base)
        except Exception:
            return None
    return _ENGINES[key]


_POOL: Optional[WAPool] = None
_SIG = None


def get_pool(force_reload: bool = False) -> WAPool:
    global _POOL, _SIG
    sig = (os.getenv("WA_INSTANCES", ""), os.getenv("WHATSAPP_BRIDGE_URL", ""),
           os.getenv("WHATSAPP_BRIDGE_TOKEN", ""), os.getenv("WA_INSTANCE_STATE", ""))
    if force_reload or _POOL is None or sig != _SIG:
        _POOL = WAPool()
        _SIG = sig
    return _POOL


def wa_health() -> Dict:
    return get_pool().health()
