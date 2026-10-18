"""
TSAP Matrimony — FastAPI Backend — Pin-to-Pin Perfect Advanced
All endpoints: Register, ID Search, Matches, Credits, Referral, Bureau, Admin, Payment, Channels auto-post
"""
import sys, os
_backend_dir = os.path.dirname(os.path.abspath(__file__))
_vendor_dir = os.path.join(_backend_dir, "vendor")
if os.path.isdir(_vendor_dir) and _vendor_dir not in sys.path:
    sys.path.insert(0, _vendor_dir)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Form, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from atomic_store import atomic_json_dump, atomic_write_bytes
from typing import Any, Dict, List, Optional
from contextlib import asynccontextmanager
import os, random, json, re, hashlib, hmac, urllib.parse, time, secrets, copy
from urllib.parse import quote
import threading
from collections import defaultdict
from datetime import datetime, timedelta, timezone

MEDIA_ROOT = os.path.realpath(os.getenv("MANA_VIVAHA_MEDIA_DIR", "/tmp"))
CARD_MEDIA_DIR = os.path.join(MEDIA_ROOT, "cards")
PHOTO_MEDIA_DIR = os.path.join(MEDIA_ROOT, "photos")
VOICE_MEDIA_DIR = os.path.join(MEDIA_ROOT, "voice")
JATHAKAM_MEDIA_DIR = os.path.join(MEDIA_ROOT, "jathakam")

# Import our modules
from models import RegisterRequest, RegisterResponse, SearchResponse, MatchResult, is_never_married_status
from card_generator import generate_profile_id
from credits import PLANS, can_view_number, deduct_credit, add_credits
from referral import (
    generate_referral_code, process_referral_payment, get_leaderboard, parse_referral_type,
    ensure_referrer_profile, validate_referral, attach_referral, referral_dashboard,
    share_kit as referral_share_kit,
    payout_request, payout_action, payout_queue, pay_wallet_full, track_click, referral_terms_telugu,
    reverse_referral_payment, load_state as referral_load_state, stats_of as referral_stats_of,
    find_referrer as referral_find_referrer, _code_of as referral_code_of,
    referrer_join_text, referrer_commission_text, referee_welcome_text,
    mask_payout as referral_mask_payout,
    tier_of as referral_tier_of, MILESTONES as REFERRAL_MILESTONES, TIERS as REFERRAL_TIERS,
    FIRST_PAY_COMMISSION, MIN_PAYOUT, QUALIFYING_PLAN_CODES,
    qualifying_commission_entries as referral_qualifying_commissions,
)  # noqa: E402
import refpartners as RP19  # noqa: E402  # 🌊 WAVE 19 — referral partners
import spotlight  # 🌟 WAVE 42 — Profiles of the Day & Spotlight Engine
from vendors import (                                                        # 🏪 vendor ads + promotions
    register_vendor, activate_vendor, reject_vendor, expire_due_vendors, vendors_directory,
    ad_rotation, track_vendor_click, vendor_lead, promo_post, vendor_dashboard,
    vendor_queue, vendor_revenue, packages_public as vendor_packages_public,
    vendor_stats, public_vendor, explicit_whatsapp_number as vendor_whatsapp_number,
    is_active_listing as vendor_is_active_listing,
    category_label as vendor_category_label,
    SHARE_KIT_CODES as VENDOR_SHARE_KIT_CODES,
    CATEGORIES as VENDOR_CATEGORIES, PACKAGES as VENDOR_PACKAGES, SLOTS as VENDOR_SLOTS,
    load_state as vendors_load_state, save_state as vendors_save_state,
)
from channels_config import (
    CHANNELS, channel_stats, channels_by_tier, route_profile, build_caption,
    build_hashtags, live_channels, pending_channels, all_channels, resolve_caste_key,
    setup_plan as channels_config_setup_plan, caste_split_report, channel_health_report,
    channel_links, BOT_USERNAME, _routing_is_explicit, is_public_channel,
    public_channels, public_channel_stats,
)
try:
    from card_pro import create_pro_card, has_telugu_font  # full-detail neat card
except Exception:  # fonts/PIL lekapoyina server padipodu
    create_pro_card = None
    def has_telugu_font():
        return False

import growth
import publisher as PUBLISHER
import wa_antiban as WA_ANTIBAN
import vendors as VENDOR_STORE
import quality as QUALITY
import referral as REFERRAL
from growth import (namaste_text, admin_new_profile_text, lead_followup_text,
                      track_visit, save_lead, lead_stats, leads_list, share_kit, inventory_status)
from publisher import (dead_letters, requeue_dead,
    enqueue, publish_profile, publish_status, read_log, start_worker, worker_running,
    build_whatsapp_text, build_share_text, config as publish_config,
    enqueue_whatsapp, wa_queue_stats, start_wa_worker, whatsapp_link, WA_QUEUE, WA_DEAD,
)
from wa_antiban import ENGINE as WA_ENGINE
# 🛡️ WAVE 9 — hardening layer (auth tokens, admin key, rate limit, validation, abuse ledger)
import db_store as DBSTORE  # noqa: E402  # 🌊 WAVE 22 — core DB persistence
import control_auth as CONTROL_AUTH  # private operations portal sessions
import money_audit as MAUD  # noqa: E402  # 🌊 WAVE 26 — money audit trail
import retention as RETENTION  # 🗑️ WAVE 40: 3-year profile auto-delete (archive first)
from hardening import (
    auth_enforced, require_owner, require_admin, rate_limit_hit, too_many, client_ip,
    apply_security_headers, posture as security_posture, abuse_snapshot, abuse_log,
    sign_token, verify_token, token_from_request, is_admin, is_automation, clean, req_text,
    require_vendor, vendor_token, admin_role, revoke_all_tokens,
    req_phone, req_int, req_choice, req_bool, req_bool_strict, validation_error, seen as idem_seen, abuse_count, clamp_int,
    ADMIN_KEY as TSAP_ADMIN_KEY, NAME_RE, PHONE_RE, dev_mode,
    TOKEN_VERSIONS_PATH,
)

_PRODUCTION_ENV_NAMES = {"production", "prod", "live"}


def _is_production_environment() -> bool:
    return str(os.getenv("APP_ENV", "")).strip().lower() in _PRODUCTION_ENV_NAMES


def _test_payment_fixtures_enabled() -> bool:
    """Only explicit isolated tests may synthesize paid results; never preview or live."""
    fixture_flag = str(os.getenv("MANA_TEST_PAYMENT_FIXTURES", "")).strip().lower()
    environment = str(os.getenv("APP_ENV", "")).strip().lower()
    isolated_data_dir = str(os.getenv("MANA_VIVAHA_TEST_DATA_DIR", "")).strip()
    return (
        dev_mode()
        and environment in {"", "test"}
        and bool(isolated_data_dir)
        and fixture_flag in {"1", "true", "yes", "on"}
    )


# ⭐ profiles quality + saved searches + consent ledger + templates
from quality import (
    profile_completeness, templates as quality_templates, facets as search_facets,
    save_search, saved_for, delete_search, set_search_alert, new_matches_for, mark_alerted, matches_filters,
    log_consent, consent_for, load_saved_searches, load_consent_ledger, save_consent_ledger, CONSENT_LEDGER,
    SAVED_SEARCHES,
)
import member_intel
from interest import (
    PLANS as INTEREST_PLANS, plan_list, get_plan, plan_by_amount, apply_payment,
    can_send_interest, create_interest, respond_interest, expire_old,
    interest_to_owner_text, interest_accepted_text, interest_accepted_owner_text, interest_declined_text,
    interest_notify_text, inbox_for, sent_for, safe_user, sanitize_public_text, sanitize_public_payload,
    MAX_PER_DAY as INTEREST_MAX_PER_DAY, EXPIRY_DAYS as INTEREST_EXPIRY_DAYS,
    REFUND_ON_DECLINE as INTEREST_REFUND_ON_DECLINE, mask_phone,
)
import topmatch, safety, preview, bot_pool, wa_pool
import matchbot  # 🧠 Smart Match Assistant — personalized daily briefing + tips
import digest_engine  # 📬 personalized daily digest engine (generate queue, gated send)
import smart12 as S12  # 🔒 WAVE 12: masked captions + unlock/entitlement + ₹500 assisted
import astro as AST      # 🪐 WAVE 13: astrology evidence + Jathakam review
import ads as ADS        # 📢 WAVE 13: vendor ad campaigns
import matchpro as MP      # factual age/location helpers; no compatibility ranking
from community_catalog import subcastes_for as community_subcastes_for
from location_catalog import (
    TS_DISTRICTS as CANONICAL_TS_DISTRICTS,
    AP_DISTRICTS as CANONICAL_AP_DISTRICTS,
    canonicalize_district,
)


def _validate_production_storage() -> dict:
    """Fail closed unless every durable store/media path is on the mounted data root."""
    root_value = os.getenv("MANA_VIVAHA_PERSISTENT_ROOT", "").strip()
    state_value = os.getenv("MANA_VIVAHA_STATE_DIR", "").strip()
    if not root_value or not os.path.isabs(root_value):
        raise RuntimeError("MANA_VIVAHA_PERSISTENT_ROOT must be an absolute durable-volume path")
    if not state_value or not os.path.isabs(state_value):
        raise RuntimeError("MANA_VIVAHA_STATE_DIR must be an absolute durable state path")

    root = os.path.realpath(root_value)
    state_root = os.path.realpath(state_value)
    if root == "/" or root == "/tmp" or root.startswith("/tmp/"):
        raise RuntimeError("Production persistence cannot use the container root or ephemeral /tmp")
    try:
        token_state_is_backed_up = os.path.commonpath((state_root, os.path.realpath(TOKEN_VERSIONS_PATH))) == state_root
    except ValueError:
        token_state_is_backed_up = False
    if not token_state_is_backed_up:
        raise RuntimeError("Production token-revocation state must be inside MANA_VIVAHA_STATE_DIR for durable backup")

    import backup39 as BACKUP
    paths = [
        ("state directory", state_value, True),
        ("core profiles/payments database", DBSTORE.DB_FILE, False),
        ("token-revocation versions", TOKEN_VERSIONS_PATH, False),
        ("payment/offer state", PP.PERSIST_FILE, False),
        ("ad campaigns", ADS.PERSIST_FILE, False),
        ("astrology records", AST.PERSIST_FILE, False),
        ("CMS content", CMS.PERSIST_FILE, False),
        ("channel overrides", CHAN.PERSIST_FILE, False),
        ("consent ledger", QUALITY.CONSENT_STATE_FILE, False),
        ("saved searches", QUALITY.SAVED_STATE_FILE, False),
        ("stories", A11.STORIES_FILE, False),
        ("push subscriptions", A11.PUSH_FILE, False),
        ("money audit", MAUD.AUDIT_FILE, False),
        ("publisher log", PUBLISHER.LOG_FILE, False),
        ("referrals", REFERRAL.STATE_FILE, False),
        ("referral partners", RP19.JSON_FILE, False),
        ("referral partner export", RP19.CSV_FILE, False),
        ("retention log", RETENTION.LOG_FILE, False),
        ("retention archives", RETENTION.BACKUP_DIR, True),
        ("smart reveal state", S12.PERSIST_FILE, False),
        ("spotlight state", spotlight.SPOTLIGHT_FILE, False),
        ("vendor state", VENDOR_STORE.STATE_FILE, False),
        ("WhatsApp anti-abuse state", WA_ANTIBAN.STATE_FILE, False),
        ("WhatsApp instance state", wa_pool.STATE_FILE, False),
        ("daily matches", DAILY_FILE, False),
        ("weekly showcase", SHOWCASE_FILE, False),
        ("backup snapshots", BACKUP.BACKUP_DIR, True),
        ("control audit", os.getenv("CONTROL_AUDIT_FILE", "").strip(), False),
        ("media root", MEDIA_ROOT, True),
        ("profile cards", CARD_MEDIA_DIR, True),
        ("profile photos", PHOTO_MEDIA_DIR, True),
        ("voice introductions", VOICE_MEDIA_DIR, True),
        ("jathakam uploads", JATHAKAM_MEDIA_DIR, True),
        ("vendor poster output", os.getenv("VENDOR_POSTER_DIR", "").strip(), True),
        ("referral poster output", os.getenv("REFERRAL_POSTER_DIR", "").strip(), True),
    ]

    writable_dirs = {root}
    for label, value, is_directory in paths:
        if not value or not os.path.isabs(value):
            raise RuntimeError(f"Production storage path for {label} must be absolute and configured")
        resolved = os.path.realpath(value)
        try:
            within_root = os.path.commonpath((root, resolved)) == root
        except ValueError:
            within_root = False
        if not within_root:
            raise RuntimeError(f"Production storage path for {label} is outside the durable volume")
        target_dir = resolved if is_directory else os.path.dirname(resolved)
        os.makedirs(target_dir, mode=0o700, exist_ok=True)
        writable_dirs.add(target_dir)

    for directory in writable_dirs:
        try:
            probe = os.path.join(directory, ".mana-vivaha-write-check-" + secrets.token_hex(8))
            fd = os.open(probe, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
            os.close(fd)
            os.unlink(probe)
        except OSError as exc:
            raise RuntimeError(f"Production data volume is not writable: {directory}") from exc

    return {"root": root, "durable_paths": len(paths)}


def _validate_production_core_database() -> dict:
    """Validate the core registration store before any production workers start.

    A missing/corrupt/incomplete store is never interpreted as an empty database.
    A genuinely new installation must use the separate one-shot bootstrap command;
    ordinary server startup can never initialize or authorize an empty replacement volume.
    """
    path = os.path.abspath(DBSTORE.DB_FILE)
    collections = {
        "users": list,
        "interests": list,
        "payments": list,
        "otps": dict,
        "verified_phones": list,
        "views": list,
        "saves": list,
        "digest": list,
    }

    def _read_store() -> dict:
        try:
            with open(path, encoding="utf-8") as handle:
                value = json.load(handle)
        except Exception as exc:
            raise RuntimeError(
                "Production core database is unreadable or corrupt; preserve the file and restore a verified backup"
            ) from exc
        if not isinstance(value, dict):
            raise RuntimeError("Production core database must be a JSON object; file was not modified")
        missing = [key for key in collections if key not in value]
        if missing:
            raise RuntimeError(
                "Production core database is missing required fields (%s); preserve it and migrate/restore a verified backup"
                % ", ".join(missing)
            )
        wrong_types = [key for key, expected in collections.items() if not isinstance(value.get(key), expected)]
        if wrong_types:
            raise RuntimeError(
                "Production core database has invalid collection types (%s); file was not modified"
                % ", ".join(wrong_types)
            )
        if any(not isinstance(row, dict) for key in ("users", "interests", "payments", "views", "saves", "digest")
               for row in value[key]):
            raise RuntimeError("Production core database contains malformed rows; file was not modified")
        if any(not isinstance(phone, str) for phone in value["verified_phones"]):
            raise RuntimeError("Production core database contains malformed verified-phone values; file was not modified")
        if any(not isinstance(phone, str) or not isinstance(record, dict)
               for phone, record in value["otps"].items()):
            raise RuntimeError("Production core database contains malformed OTP state; file was not modified")
        return value

    if not os.path.exists(path):
        raise RuntimeError(
            "Production core database is missing at %s; startup is blocked to protect registrations. "
            "Restore the existing database, or use bootstrap_core_db.py --confirm-new-install only "
            "for a verified brand-new installation" % path
        )

    payload = _read_store()
    has_records = any(bool(payload[key]) for key in collections)
    if not has_records and payload.get("storage_format") != DBSTORE.STORAGE_FORMAT:
        raise RuntimeError(
            "Production core database is empty and has no initialization marker; startup is blocked. "
            "After a verified backup, use the one-shot --confirm-existing-empty command only if every collection is truly empty"
        )

    seen_ids = set()
    seen_phones = set()
    for row_number, profile in enumerate(payload["users"], start=1):
        if not isinstance(profile, dict):
            raise RuntimeError("Production profile row %d is malformed; no records were discarded" % row_number)
        if _is_synthetic_profile(profile):
            raise RuntimeError(
                "Production database contains a demo/seed profile at row %d; review it offline without deleting real registrations"
                % row_number
            )
        tsap_id = str(profile.get("tsap_id") or "").strip().upper()
        if not tsap_id or tsap_id in seen_ids:
            raise RuntimeError(
                "Production database contains a missing/duplicate profile ID at row %d; no records were discarded"
                % row_number
            )
        seen_ids.add(tsap_id)
        phone = str(profile.get("phone") or "").strip()
        if phone and phone in seen_phones:
            raise RuntimeError(
                "Production database contains a duplicate profile phone at row %d; no records were discarded"
                % row_number
            )
        if phone:
            seen_phones.add(phone)

    return {"file": path, "users": len(payload["users"]), "has_records": has_records}


def _is_synthetic_profile(profile: Optional[Dict]) -> bool:
    """Recognize legacy fixtures so they cannot enter member-facing data paths."""
    if not isinstance(profile, dict):
        return True
    return bool(
        profile.get("demo") is True or profile.get("is_demo") is True
        or profile.get("seed_source") or profile.get("source") == "demo_seed"
        or profile.get("profile_note") == "TSAP demo profile"
        or profile.get("inventory_status") or profile.get("seed")
    )


def _is_approved_profile(profile: Optional[Dict]) -> bool:
    """Fail closed for public listings, including accounts explicitly deactivated by their owner."""
    if not isinstance(profile, dict) or profile.get("is_banned") or _is_synthetic_profile(profile):
        return False
    status = str(profile.get("status") or "").strip().lower()
    if status in {"pending", "rejected", "deleted", "married_fixed", "banned", "inactive", "hidden"}:
        return False
    active = profile.get("is_active")
    if active is not None and str(active).strip().lower() not in {"1", "true", "yes", "on", "active", "approved"}:
        return False
    flag = profile.get("is_approved")
    if flag is not None:
        return flag is True or str(flag).strip().lower() in {"1", "true", "yes", "approved"}
    return status == "approved"


def _is_nri(u: Dict) -> bool:  # 🌊 WAVE 14 adapter: stored flag + detect_nri fallback
    try:
        u = u or {}
        if u.get("is_nri"):
            return True
        return bool(MP.detect_nri(str(u.get("country", "")), str(u.get("work_location", "")),
                                   str(u.get("current_city", "")), str(u.get("state", ""))).get("is_nri"))
    except Exception:
        return False


def _prof_label(u: Dict) -> str:
    """Return the member-entered profession without inferring a job category."""
    return str((u or {}).get("job") or "").strip()
import paypro as PP        # 🌊 WAVE 14: safe-pay + festival offers
import cms as CMS            # 📝 WAVE 15: pages + stories + banners
import chanmap as CHAN         # 📡 WAVE 15: channel links + import + coverage
from interest import ADDONS, RENEWALS, is_addon, get_addon, get_renewal, plan_list_with_free, addon_list, renewal_offer, bureau_list
from photo_validate import validate_photo, sanitize_photo  # 🌊 WAVE 17 — photo validation pipeline
from otp_channels import send_otp as otp_channel_send, CHANNEL_TELUGU  # 🌊 WAVE 18 — free OTP
from channels_config import post_targets, caste_channel_links, channel_links, WA_OFFICIAL_LINK
# 🎁 WAVE 10 — register avvagane "3 profiles + caste channel links" WhatsApp ki
from welcome_pack import build_welcome_pack, pack_public, channels_count as wa_links_stats
# 🚀 WAVE 11 — additional tools (gothram text comparison, stories, streak, push, voice, boosts)
import advanced11 as A11

@asynccontextmanager
async def _app_lifespan(_application):
    """Use FastAPI's lifespan contract for worker setup and final persistence flush."""
    await _startup_publisher()
    await _startup_backup39()
    try:
        yield
    finally:
        await _shutdown_flush_db()


app = FastAPI(title="TSAP Matrimony API — Ultra Advanced", version="2.0", lifespan=_app_lifespan)


# ---------------------------------------------------------------------------
# PRIVATE CONTROL PORTAL — one login, server-side roles, no public admin key
# ---------------------------------------------------------------------------
@app.post("/api/control/login")
def control_login(payload: dict, request: Request, response: Response):
    result = CONTROL_AUTH.login((payload or {}).get("username", ""), (payload or {}).get("password", ""), request)
    response.set_cookie(**CONTROL_AUTH.cookie_options(), value=result.pop("session"))
    return {"success": True, **result, "message": "Authenticated"}


@app.get("/api/control/me")
def control_me(request: Request):
    item = CONTROL_AUTH.require(request)
    return {"success": True, "role": item["role"], "username": item["username"],
            "expires_at": item.get("expires", item.get("expires_at", 0)), "csrf": item.get("csrf", "")}


@app.post("/api/control/logout")
def control_logout(request: Request, response: Response):
    item = CONTROL_AUTH.require(request)
    if not CONTROL_AUTH.csrf_valid(request, item):
        raise HTTPException(403, "CSRF validation failed")
    CONTROL_AUTH.logout(request)
    response.delete_cookie(CONTROL_AUTH.COOKIE_NAME, path="/")
    return {"success": True}


@app.get("/api/control/summary")
def control_summary(request: Request):
    item = CONTROL_AUTH.require(request)
    # Workers receive counts only; no phone/email/payment values are serialized.
    result = {"success": True, "role": item["role"], "profiles": len(DB_USERS),
              "pending_profiles": sum(1 for u in DB_USERS if str(u.get("status", "pending")) == "pending"),
              "open_reports": sum(1 for r in DB_REPORTS if str(r.get("status", "open")) == "open")}
    if item["role"] == "owner":
        result.update({"payments": len(DB_PAYMENTS), "audit": CONTROL_AUTH.audit_recent(50)})
    return result


@app.get("/api/control/profile-queue")
def control_profile_queue(request: Request, status: str = "pending", limit: int = 50):
    """Safe operations queue. This endpoint deliberately has no phone/email/payment fields."""
    item = CONTROL_AUTH.require(request)
    if status not in {"pending", "approved", "rejected", "all"}:
        raise HTTPException(400, "Invalid queue status")
    if item["role"] != "owner" and status != "pending":
        raise HTTPException(403, "Moderation staff can view pending profiles only")
    limit = max(1, min(int(limit), 100))
    rows = []
    for user in DB_USERS:
        current = str(user.get("status", "pending"))
        if status != "all" and current != status:
            continue
        rows.append({"tsap_id": str(user.get("tsap_id", "")),
                     "full_name": str(user.get("full_name", ""))[:120],
                     "gender": str(user.get("gender", ""))[:20],
                     "age": user.get("age"),
                     "district": str(user.get("district", ""))[:80],
                     "status": current,
                     "photo_status": str(user.get("photo_status", "none")),
                     "created_at": user.get("created_at", "")})
        if len(rows) >= limit:
            break
    CONTROL_AUTH.audit("control_queue_view", item["username"], request, status=status, count=len(rows))
    return {"success": True, "items": rows, "role": item["role"]}


# ---------------------------------------------------------------------------
# 🎛️ ADVANCED CONTROL PORTAL — analytics + safe actions (session-authed, RBAC)
# All endpoints below authenticate via the control SESSION cookie (require()),
# enforce CSRF on writes, and audit every action. Workers get moderation-only
# powers; owners get finance + analytics. No phone/email/payment PII is ever
# serialized to a worker session.
# ---------------------------------------------------------------------------
_CONTROL_WRITE_ROLES = {"owner", "worker", "moderator", "support"}
_CONTROL_FINANCE_ROLES = {"owner", "finance"}
_CONTROL_OWNER_ROLES = {"owner"}


def _control_write_guard(request: Request, roles: Optional[set] = None) -> dict:
    """Require a valid control session + valid CSRF header for any mutating action."""
    item = CONTROL_AUTH.require(request, roles=roles)
    if item.get("sid") == "api_key_session":
        raise HTTPException(403, "An owner session cookie is required for this control action")
    if not CONTROL_AUTH.csrf_valid(request, item):
        raise HTTPException(403, "CSRF validation failed")
    return item


def _control_owner_session_guard(request: Request, *, mutating: bool = False) -> dict:
    """Vendor review is restricted to an owner session cookie; writes also need CSRF."""
    item = CONTROL_AUTH.require(request, roles=_CONTROL_OWNER_ROLES)
    if item.get("sid") == "api_key_session":
        raise HTTPException(403, "Owner session cookie required")
    if mutating and not CONTROL_AUTH.csrf_valid(request, item):
        raise HTTPException(403, "CSRF validation failed")
    return item


@app.get("/api/control/analytics")
def control_analytics(request: Request):
    """Rich, privacy-safe operations analytics for the advanced dashboard."""
    item = CONTROL_AUTH.require(request)
    owner = item["role"] == "owner"
    finance_access = item["role"] in _CONTROL_FINANCE_ROLES
    now = datetime.utcnow()

    def _parse(dt):
        try:
            return datetime.fromisoformat(str(dt).replace("Z", ""))
        except Exception:
            return None

    total = len(DB_USERS)
    pending = sum(1 for u in DB_USERS if str(u.get("status", "pending")) == "pending")
    approved = sum(1 for u in DB_USERS if u.get("is_approved") or str(u.get("status")) == "approved")
    rejected = sum(1 for u in DB_USERS if str(u.get("status")) == "rejected")
    with_photo = sum(1 for u in DB_USERS if str(u.get("photo_status", "none")) not in {"none", ""})
    recorded_checks = sum(1 for u in DB_USERS if safety.has_verification_evidence(u))

    # gender split
    males = sum(1 for u in DB_USERS if str(u.get("gender", "")).lower().startswith("m"))
    females = sum(1 for u in DB_USERS if str(u.get("gender", "")).lower().startswith("f"))

    # signups last 14 days (sparkline)
    days = []
    for i in range(13, -1, -1):
        day = (now - timedelta(days=i)).date()
        c = 0
        for u in DB_USERS:
            d = _parse(u.get("created_at"))
            if d and d.date() == day:
                c += 1
        days.append({"date": day.isoformat(), "count": c})
    signups_today = days[-1]["count"] if days else 0
    signups_7d = sum(d["count"] for d in days[-7:])

    # top castes / states / districts
    def _top(field, n=8):
        counts: dict = {}
        for u in DB_USERS:
            key = str(u.get(field, "") or "—").strip() or "—"
            counts[key] = counts.get(key, 0) + 1
        return sorted(({"label": k, "count": v} for k, v in counts.items()),
                      key=lambda x: -x["count"])[:n]

    open_reports = sum(1 for r in DB_REPORTS if str(r.get("status", "open")) == "open")
    photos_pending = sum(1 for u in DB_USERS if str(u.get("photo_status", "none")) == "pending")

    # ⏳ Queue aging — an operations count, never a member-level list. How long
    # pending profiles have been waiting is the most actionable number here.
    AGING_BUCKETS = [("under_24h", 0, 24), ("1_3_days", 24, 72),
                     ("3_7_days", 72, 168), ("over_7_days", 168, None)]
    aging = [{"label": label, "count": 0} for label, _, _ in AGING_BUCKETS]
    oldest_hours = 0.0
    pending_with_date = 0
    for u in DB_USERS:
        if str(u.get("status", "pending")) != "pending":
            continue
        created = _parse(u.get("created_at"))
        if not created:
            continue
        pending_with_date += 1
        hours = max(0.0, (now - created).total_seconds() / 3600.0)
        oldest_hours = max(oldest_hours, hours)
        for index, (_label, low, high) in enumerate(AGING_BUCKETS):
            if hours >= low and (high is None or hours < high):
                aging[index]["count"] += 1
                break

    # 📉 Funnel — where members stall. Aggregate counts only, in descending
    # order; a later step can never exceed an earlier one because every step is
    # a subset of the members counted in the step before it.
    photo_ids = {str(u.get("tsap_id", "")).upper() for u in DB_USERS
                 if str(u.get("photo_status", "none")) not in {"none", ""}}
    approved_ids = {str(u.get("tsap_id", "")).upper() for u in DB_USERS
                    if u.get("is_approved") or str(u.get("status")) == "approved"}
    interest_senders = {str(r.get("from_id", "")).upper() for r in DB_INTERESTS}
    funnel = [
        {"step": "registered", "count": total},
        {"step": "photo_added", "count": len(photo_ids)},
        {"step": "approved", "count": len(approved_ids)},
        {"step": "sent_first_interest", "count": len(interest_senders & approved_ids)},
    ]

    # 💬 Engagement — request outcomes are reported as what members did, never
    # as an outcome or success signal about a person.
    interest_status: dict = {}
    for row in DB_INTERESTS:
        key = str(row.get("status", "pending")).strip().lower() or "pending"
        interest_status[key] = interest_status.get(key, 0) + 1
    saved_total = len(SAVED_SEARCHES)
    alerts_on = sum(1 for row in SAVED_SEARCHES
                    if row.get("alert") is True and str(row.get("alert_consent_at") or "").strip())
    trend_previous = sum(d["count"] for d in days[-14:-7])

    result = {
        "success": True, "role": item["role"], "generated_at": now.isoformat(),
        "totals": {
            "profiles": total, "pending": pending, "approved": approved, "rejected": rejected,
            "with_photo": with_photo, "recorded_checks": recorded_checks, "males": males, "females": females,
            "open_reports": open_reports, "photos_pending": photos_pending,
            "interests": len(DB_INTERESTS), "posts": len(DB_POSTS),
        },
        "signups": {"today": signups_today, "last_7d": signups_7d, "series": days},
        "top_castes": _top("caste"),
        "top_states": _top("state", 6),
        "top_districts": _top("district"),
        "queue_health": {
            "pending": pending, "photos_pending": photos_pending, "open_reports": open_reports,
        },
        "queue_aging": {
            "buckets": aging,
            "oldest_pending_hours": round(oldest_hours, 1),
            "pending_with_date": pending_with_date,
        },
        "funnel": funnel,
        "engagement": {
            "interests_total": len(DB_INTERESTS),
            "interest_status": [{"label": key, "count": value}
                                for key, value in sorted(interest_status.items(), key=lambda kv: -kv[1])],
            "saved_searches": saved_total,
            "saved_search_alerts_on": alerts_on,
            "shortlist_entries": len(DB_SAVES),
        },
        "trend": {"last_7d": signups_7d, "previous_7d": trend_previous,
                  "delta": (signups_7d - trend_previous)},
    }
    if finance_access:
        # Finance totals are aggregate-only; no per-user payment details are returned.
        # The checkout ledger and core DB historically used separate stores. Merge
        # by order id so the dashboard cannot under-count PayBox transactions or
        # double-count the mirrored row.
        core_rows = list(DB_PAYMENTS)
        core_keys = {str(row.get("pay_order_id") or row.get("order_id") or "")
                     for row in core_rows if str(row.get("pay_order_id") or row.get("order_id") or "")}
        checkout_rows = []
        for order in PP.PAY_ORDERS:
            order_key = str(order.get("id") or order.get("pay_order_id") or "")
            if order_key and order_key not in core_keys and str(order.get("status", "")).lower() in {"paid", "refunded"}:
                checkout_rows.append({
                    "order_id": order_key,
                    "amount": order.get("final_amount", order.get("amount", 0)),
                    "status": order.get("status"),
                    "paid_at": order.get("paid_at", ""),
                    "purpose": order.get("purpose", ""),
                })
        finance_rows = core_rows + checkout_rows
        paid = [p for p in finance_rows if str(p.get("status", "")).lower() in {"paid", "success", "captured", "completed"}]
        refunded = [p for p in finance_rows if str(p.get("status", "")).lower() == "refunded"]
        revenue = sum(float(p.get("amount", p.get("final_amount", 0)) or 0) for p in paid)
        plan_split: dict = {}
        for u in DB_USERS:
            pl = str(u.get("plan", "FREE") or "FREE")
            plan_split[pl] = plan_split.get(pl, 0) + 1
        result["revenue"] = {
            "total": round(revenue, 2), "payments": len(paid), "attempts": len(finance_rows),
            "refunded": len(refunded),
            "plan_split": [{"label": k, "count": v} for k, v in sorted(plan_split.items(), key=lambda x: -x[1])],
            "reconciliation": {
                "core_records": len(core_rows),
                "checkout_records": len(PP.PAY_ORDERS),
                "unmirrored_checkout_records": len(checkout_rows),
                "refunded_records": len(refunded),
                "pending_orders": sum(1 for o in PP.PAY_ORDERS if str(o.get("status")) in {"created", "claimed"}),
                "history_note": "Checkout orders are merged by order ID; an unmirrored record requires operator reconciliation.",
            },
        }
    if owner:
        result["audit"] = CONTROL_AUTH.audit_recent(30)
    return result


def _queue_approved_profile_publication(user: dict) -> dict:
    """Queue approved profile content only; a queue entry is not proof of delivery."""
    if not user or not user.get("is_approved"):
        return {"queued": False, "targets": [], "reason": "profile_not_approved"}
    if not publish_config().get("auto_post_on_approval", False):
        return {"queued": False, "targets": [], "reason": "auto_publish_disabled"}

    plan = post_targets(user)
    if not plan.get("routing_candidates"):
        return {"queued": False, "targets": [], "reason": "no_routing_destinations"}

    tsap_id = str(user.get("tsap_id", ""))
    private_photo = bool(user.get("photo_private") or user.get("privacy_mode") == "private")
    candidate_card = os.path.join(CARD_MEDIA_DIR, f"{tsap_id}.png")
    photo_path = candidate_card if not private_photo and os.path.isfile(candidate_card) else None
    result = enqueue(user, tsap_id, photo_path=photo_path)
    result["reason"] = "queued_for_delivery" if result.get("queued") else "queue_failed"
    user["publish_queued"] = bool(result.get("queued"))
    user["publish_targets"] = result.get("targets", [])
    user["publish_status"] = result["reason"]
    return result


@app.post("/api/control/profile/{tsap_id}/action")
def control_profile_action(tsap_id: str, payload: dict, request: Request):
    """Worker/owner: approve (auto-post) or reject a profile. Session + CSRF authed."""
    item = _control_write_guard(request, roles=_CONTROL_WRITE_ROLES)
    action = str((payload or {}).get("action", "")).strip().lower()
    note = str((payload or {}).get("note", ""))[:200]
    if action not in {"approve", "reject", "pending"}:
        raise HTTPException(400, "Invalid action — approve / reject / pending")
    user = next((u for u in DB_USERS if str(u.get("tsap_id")) == str(tsap_id)), None)
    if not user:
        raise HTTPException(404, "Profile not found")
    if item["role"] != "owner":
        if action not in {"approve", "reject"}:
            raise HTTPException(403, "Moderation staff may only approve or reject pending profiles")
        if str(user.get("status", "pending")) != "pending":
            raise HTTPException(409, "Only pending profiles can be changed by moderation staff")
    if action == "reject" and not note:
        raise HTTPException(400, "A rejection reason is required")

    user_before = copy.deepcopy(user)
    publication: dict = {"queued": False, "targets": [], "reason": "not_applicable"}
    if action == "approve":
        user["is_approved"] = True
        user["status"] = "approved"
        try:
            route = route_profile(user)
            user["post_hashtags"] = route.get("hashtags", [])
        except Exception:
            user["post_hashtags"] = []
        user["posted_channels"] = []  # queued targets are not published results
        # Approval is the first point at which reviewed, non-private media may
        # enter a shareable card.  Rebuild from a transient validated path; the
        # path itself is never persisted.
        if not _regenerate_profile_card(user):
            user.clear()
            user.update(user_before)
            raise HTTPException(503, "Profile card could not be regenerated safely. Please try again.")
        # Commit the privacy-sensitive approval before any external publication
        # queue side effect. A failed core save must never report approval.
        if not _persist_core_state():
            user.clear()
            user.update(user_before)
            _regenerate_profile_card(user)
            raise HTTPException(503, "Profile moderation could not be saved safely. Please try again.")
        publication = _queue_approved_profile_publication(user)
        if not _persist_core_state():
            # Approval is already durable; discard only non-authoritative queue
            # metadata so a restart cannot claim delivery that was not recorded.
            for key in ("publish_queued", "publish_targets", "publish_status"):
                if key in user_before:
                    user[key] = user_before[key]
                else:
                    user.pop(key, None)
    elif action == "reject":
        user["is_approved"] = False
        user["status"] = "rejected"
        user["reject_note"] = note
        user["publish_queued"] = False
        if not _persist_core_state():
            user.clear()
            user.update(user_before)
            raise HTTPException(503, "Profile moderation could not be saved safely. Please try again.")
    else:
        user["status"] = "pending"
        if not _persist_core_state():
            user.clear()
            user.update(user_before)
            raise HTTPException(503, "Profile moderation could not be saved safely. Please try again.")

    targets = publication.get("targets", [])
    CONTROL_AUTH.audit("control_profile_" + action, item["username"], request,
                       tsap_id=tsap_id, queue_targets=len(targets), queued=bool(publication.get("queued")), note=note)
    if action == "approve":
        message = (f"✅ Approved — publish job queued for {len(targets)} configured destinations; delivery is not confirmed"
                   if publication.get("queued") else f"✅ Approved — not queued ({publication.get('reason')})")
    else:
        message = {"reject": "❌ Rejected", "pending": "↩️ Pending కి మార్చాం"}[action]
    return {"success": True, "tsap_id": tsap_id, "status": user.get("status"),
            "posted_to": [], "publish_targets": targets, "publish_queued": bool(publication.get("queued")),
            "publish_reason": publication.get("reason"), "count": len(targets), "message": message}


@app.post("/api/control/profile/{tsap_id}/upgrade")
def control_profile_upgrade(tsap_id: str, payload: dict, request: Request):
    """Staff plan activation uses the same four paid packs; plan credits never verify a profile."""
    item = _control_write_guard(request, roles=_CONTROL_FINANCE_ROLES)
    d = payload or {}
    plan_code = str(d.get("plan", "S_99")).strip().upper()
    paid_codes = {"S_99", "S_199", "S_299", "S_499"}
    if plan_code not in paid_codes:
        raise HTTPException(400, "Only the current S_99/S_199/S_299/S_499 plans can be activated here")
    plan = INTEREST_PLANS[plan_code]
    expected_credits = int(plan["profiles"])
    if d.get("credits") is not None:
        try:
            submitted_credits = int(d["credits"])
        except (TypeError, ValueError):
            raise HTTPException(400, "Plan credits must be a number")
        if submitted_credits != expected_credits:
            raise HTTPException(400, f"{plan_code} includes exactly {expected_credits} interest-request credits")

    payment_mode = str(d.get("payment_mode", "") or "").strip().upper()
    allowed_payment_modes = {"UPI_QR", "PHONEPE", "GPAY", "BANK_TRANSFER", "CASH", "ADMIN_COMPLIMENTARY"}
    if payment_mode not in allowed_payment_modes:
        raise HTTPException(400, "Choose a recognized payment source before activating a plan")
    is_comped = payment_mode == "ADMIN_COMPLIMENTARY"
    amount = 0 if is_comped else int(plan["price"])
    try:
        submitted_amount = int(d["amount"]) if d.get("amount") is not None else amount
    except (TypeError, ValueError):
        raise HTTPException(400, "Payment amount must be a number")
    if not is_comped and submitted_amount != amount:
        raise HTTPException(400, f"{plan_code} price is ₹{amount}; amount mismatch")
    trigger_referral = bool(d.get("trigger_referral", True)) and not is_comped
    # A staff activation is an accounting action, not a free-form status toggle.
    # Paid/manual modes need a non-placeholder UTR, receipt, or proof reference;
    # complimentary grants require an explicit reason instead.
    utr = str(d.get("utr", "") or d.get("payment_proof", "") or "").strip()
    notes = str(d.get("notes", "") or "").strip()
    if is_comped:
        if len(notes) < 8:
            raise HTTPException(400, "A reason of at least 8 characters is required for a complimentary grant")
        utr = ""
    else:
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9 ./_:-]{5,63}", utr) or not any(ch.isdigit() for ch in utr):
            raise HTTPException(400, "A valid UTR, receipt, or payment-proof reference is required for paid activation")
        duplicate_proof = any(
            str(row.get("utr", "") or "").strip().upper() == utr.upper()
            and str(row.get("status", "")).lower() not in {"refunded", "reversed"}
            for row in DB_PAYMENTS
        ) or any(
            str(row.get("utr", "") or "").strip().upper() == utr.upper()
            and str(row.get("status", "")).lower() not in {"refunded", "reversed"}
            for row in PP.PAY_ORDERS
        )
        if duplicate_proof:
            raise HTTPException(409, "This payment proof reference was already recorded; reconcile it before retrying")

    user = _find_user(tsap_id)
    if not user:
        raise HTTPException(404, f"Profile ID '{tsap_id}' not found")
    user_refs_before = list(DB_USERS)
    users_before = copy.deepcopy(DB_USERS)
    payments_before = copy.deepcopy(DB_PAYMENTS)
    pay_orders_before = copy.deepcopy(PP.PAY_ORDERS)

    user["plan"] = plan_code
    user["is_premium"] = True
    if not is_comped:
        user["has_paid"] = True
    user["credits"] = int(user.get("credits", 0) or 0) + expected_credits
    user["plan_expiry"] = (datetime.utcnow() + timedelta(days=int(plan["validity_days"]))).isoformat()
    user.setdefault("credit_history", []).append({
        "at": datetime.utcnow().isoformat(),
        "change": expected_credits,
        "reason": ("admin_complimentary_plan_" if is_comped else "admin_grant_") + plan_code,
        "by": item["username"],
        "mode": payment_mode,
        "utr": utr,
        "note": notes or f"Admin {('complimentary ' if is_comped else 'manual ')}plan grant: {plan_code} (+{expected_credits} request credits)",
    })

    order_id = f"ORD_MANUAL_{int(time.time())}_{random.randint(100, 999)}"
    pay_order = {
        "id": order_id,
        "order_id": order_id,
        "pay_order_id": order_id,
        "purpose": "credits",
        "ref": plan_code,
        "final_amount": amount,
        "tsap_id": user.get("tsap_id"),
        "full_name": user.get("full_name"),
        "phone": user.get("phone"),
        "plan": plan_code,
        "amount": amount,
        "status": "comped" if is_comped else "paid",
        "paid_via": payment_mode,
        "utr": utr,
        "payment_proof": utr,
        "payment_proof_status": "operator_recorded" if not is_comped else "not_applicable_complimentary",
        "created_at": datetime.utcnow().isoformat(),
        "notes": notes,
        "operator": item["username"],
    }
    PP.PAY_ORDERS.append(pay_order)
    DB_PAYMENTS.append(pay_order)

    ref_msg = ""
    if trigger_referral and user.get("referred_by"):
        try:
            r_res = process_referral_payment(user, user["referred_by"], amount, DB_USERS,
                                             payment_id=order_id, plan_code=plan_code)
            if r_res.get("success"):
                ref_msg = f" • Referrer ({user['referred_by']}) కి ₹50 wallet reward జమైంది."
        except Exception:
            pass

    plan_title = f"{plan['label']} (₹{plan['price']})"
    wa_text = (
        f"💐 నమస్కారం {user.get('full_name')} గారు!\n\n"
        f"మన వివాహ లో మీ {plan_title} plan యాక్టివేట్ అయ్యింది.\n"
        f"🪙 {expected_credits} interest-request credits జోడించబడ్డాయి; గడువు {plan['validity_days']} రోజులు.\n"
        "Plan activation does not verify identity or approve a profile. Contact details require profile-owner acceptance.\n"
        "Payment / complimentary status: " + ("complimentary grant — reason recorded" if is_comped else "payment proof recorded; provider confirmation is not implied")
    )
    wa_text_en = (
        f"💐 Hello {user.get('full_name')},\n\n"
        f"Your {plan_title} plan on Mana Vivaha has been activated.\n"
        f"🪙 {expected_credits} interest-request credits were added; the plan is valid for {plan['validity_days']} days.\n"
        "Plan activation does not verify identity or approve a profile. Contact details require profile-owner acceptance.\n"
        "Payment / complimentary status: " + ("complimentary grant — reason recorded" if is_comped else "payment proof recorded; provider confirmation is not implied")
    )
    if not _persist_core_state() or not PP._persist():
        _restore_user_snapshot(users_before, user_refs_before)
        DB_PAYMENTS[:] = payments_before
        PP.PAY_ORDERS[:] = pay_orders_before
        # Best-effort restoration of the two ledgers after an injected/storage failure.
        _persist_core_state()
        PP._persist()
        raise HTTPException(503, "Plan grant could not be saved safely. Please try again.")
    CONTROL_AUTH.audit("control_profile_upgrade", item["username"], request,
                       tsap_id=tsap_id, plan=plan_code, amount=amount, comped=is_comped,
                       payment_mode=payment_mode, proof_recorded=bool(utr),
                       reason_recorded=bool(notes), credits_added=expected_credits)

    return {
        "success": True, "tsap_id": user.get("tsap_id"), "full_name": user.get("full_name"),
        "plan": plan_code, "plan_title": plan_title, "credits": user["credits"],
        "credits_added": expected_credits, "plan_expiry": user.get("plan_expiry"),
        "comped": is_comped, "verification": safety.verification_badge(user),
        "wa_message": wa_text, "wa_message_en": wa_text_en,
        "message_telugu": f"{user.get('tsap_id')} కి {plan_title} active అయ్యింది (+{expected_credits} interest-request credits, {plan['validity_days']} రోజులు). Profile approval / identity verification వేరుగా ఉంటుంది.{ref_msg}",
    }


@app.post("/api/control/profile/{tsap_id}/counselor-note")
def control_add_counselor_note(tsap_id: str, payload: dict, request: Request):
    """Admin/Worker Counselor Log: add timestamped call notes, interaction status & next callback date."""
    item = _control_write_guard(request, roles=_CONTROL_OWNER_ROLES)
    d = payload or {}
    stage = str(d.get("stage", "call_completed")).strip().lower()
    note_text = str(d.get("note", "") or "").strip()
    callback_at = str(d.get("callback_at", "") or "").strip()

    user = _find_user(tsap_id)
    if not user:
        raise HTTPException(404, f"Profile '{tsap_id}' not found")

    entry = {
        "id": f"NOTE_{int(time.time())}_{random.randint(100, 999)}",
        "at": datetime.utcnow().isoformat(),
        "operator": item["username"],
        "stage": stage,
        "note": note_text,
        "callback_at": callback_at
    }
    user.setdefault("counselor_notes", []).append(entry)
    user["crm_stage"] = stage
    user["crm_last_updated"] = datetime.utcnow().isoformat()
    if callback_at:
        user["crm_callback_at"] = callback_at

    CONTROL_AUTH.audit("counselor_note_added", item["username"], request,
                       tsap_id=tsap_id, stage=stage)
    try:
        DBSTORE.save(DBSTORE.snapshot(DB_USERS, DB_INTERESTS, DB_PAYMENTS, DB_OTPS,
                                      VERIFIED_PHONES, DB_VIEWS, DB_SAVES, DB_DIGEST), force=True)
    except Exception:
        pass

    return {
        "success": True,
        "message": "కౌన్సిలర్ నోట్ విజయవంతంగా నమోదైంది",
        "entry": entry,
        "notes": user.get("counselor_notes", [])
    }


@app.get("/api/control/profile/{tsap_id}/counselor-notes")
def control_get_counselor_notes(tsap_id: str, request: Request):
    """Owner-only access to counselor notes and interaction history."""
    item = CONTROL_AUTH.require(request, roles=_CONTROL_OWNER_ROLES)
    user = _find_user(tsap_id)
    if not user:
        raise HTTPException(404, f"Profile '{tsap_id}' not found")
    return {
        "success": True,
        "tsap_id": tsap_id,
        "full_name": user.get("full_name"),
        "crm_stage": user.get("crm_stage", "new_lead"),
        "notes": user.get("counselor_notes", [])
    }


@app.get("/api/control/reports")
def control_reports(request: Request, limit: int = 50):
    """Session-authenticated moderation queue with reporter identity withheld from staff."""
    item = CONTROL_AUTH.require(request)
    limit = max(1, min(int(limit), 100))
    try:
        result = safety.moderation_queue(DB_REPORTS, DB_USERS, limit)
        if item["role"] != "owner":
            for report in result.get("items", []):
                report.pop("reporter_id", None)
        return {"success": True, **result}
    except Exception:
        return {"success": True, "items": [], "open": 0, "actions": []}


@app.post("/api/control/reports/{report_id}/resolve")
def control_report_resolve(report_id: str, payload: dict, request: Request):
    """Resolve a report with role-appropriate actions (session + CSRF protected)."""
    item = _control_write_guard(request, roles=_CONTROL_WRITE_ROLES)
    d = payload or {}
    action = str(d.get("action", "")).strip().lower()
    note = str(d.get("note", "")).strip()[:200]
    if action == "ban" and item["role"] != "owner":
        raise HTTPException(403, "Only an owner may permanently ban a profile")
    if not note:
        raise HTTPException(400, "A specific moderation note is required")
    ok, msg, rec = safety.resolve_report(report_id, action, note,
                                         reports=DB_REPORTS, users=DB_USERS)
    if not ok:
        raise HTTPException(400, msg)
    CONTROL_AUTH.audit("control_report_resolve", item["username"], request,
                       report_id=report_id, moderation_action=action, note=note)
    try:
        DBSTORE.save(DBSTORE.snapshot(DB_USERS, DB_INTERESTS, DB_PAYMENTS, DB_OTPS,
                                      VERIFIED_PHONES, DB_VIEWS, DB_SAVES, DB_DIGEST), force=True)
    except Exception:
        pass
    return {"success": True, "action": msg, "report": rec}


@app.get("/api/control/spotlight/queue")
def control_spotlight_queue(request: Request, status: str = "all", limit: int = 50):
    """Owner-only queue for paid spotlight submissions and payment references."""
    item = CONTROL_AUTH.require(request, roles=_CONTROL_OWNER_ROLES)
    limit = max(1, min(int(limit), 100))
    all_promos = spotlight._load_spotlights()
    if status != "all":
        filtered = [p for p in all_promos if p.get("status") == status]
    else:
        filtered = all_promos
    filtered.sort(key=lambda x: str(x.get("submitted_at", "")), reverse=True)
    CONTROL_AUTH.audit("control_spotlight_queue", item["username"], request, status=status, count=len(filtered[:limit]))
    return {"success": True, "items": filtered[:limit], "total": len(filtered), "role": item["role"]}


@app.post("/api/control/spotlight/{promo_id}/action")
def control_spotlight_action(promo_id: str, payload: dict, request: Request):
    """Owner-only approval actions for paid spotlight promotions."""
    item = _control_write_guard(request, roles=_CONTROL_OWNER_ROLES)
    d = payload or {}
    action = str(d.get("action", "")).strip().lower()
    notes = str(d.get("notes", "")).strip()
    override_days = int(d.get("days", 0)) or None
    try:
        updated = spotlight.moderate_spotlight(
            promo_id=promo_id,
            action=action,
            moderator=item["username"],
            notes=notes,
            override_days=override_days
        )
        CONTROL_AUTH.audit("control_spotlight_action", item["username"], request, promo_id=promo_id, spotlight_action=action)
        return {"success": True, "item": updated, "message": f"Spotlight promotion {action}d successfully"}
    except Exception as e:
        raise HTTPException(400, str(e))


@app.get("/api/control/channels/coverage")
def control_channels_coverage(request: Request):
    """Owner view of how many channel destinations are actually configured.

    Counts configuration, not availability: a configured link is a link an
    operator saved, never proof that the Telegram or WhatsApp destination is
    live or that the bot can post to it.
    """
    item = CONTROL_AUTH.require(request, roles=_CONTROL_OWNER_ROLES)
    cov = CHAN.coverage()
    pending: list[str] = []
    for tier, row in (cov.get("by_tier") or {}).items():
        for key in row.get("pending_keys", [])[:8]:
            pending.append(f"{tier}:{key}")
    CONTROL_AUTH.audit("control_channels_coverage", item["username"], request,
                       total=cov.get("total", 0), routing_eligible=cov.get("routing_eligible", 0))
    return {
        "success": True,
        "total": cov.get("total", 0),
        "routing_eligible": cov.get("routing_eligible", 0),
        "with_whatsapp": cov.get("with_whatsapp", 0),
        "customized": cov.get("customized", 0),
        "by_tier": cov.get("by_tier", {}),
        "critical_gaps": cov.get("critical_gaps", []),
        "whatsapp_gaps": cov.get("whatsapp_gaps", []),
        "pending_sample": pending,
        "external_status_checked": False,
        "note": "Counts are configuration only. No external availability, bot permission "
                "or reachability is checked; blank WhatsApp destinations remain blank and are never guessed.",
    }


@app.get("/api/control/stories")

def control_stories(request: Request, status: str = "pending", limit: int = 50):
    """Owner-only member-story moderation queue (control session, not admin key)."""
    item = CONTROL_AUTH.require(request, roles=_CONTROL_OWNER_ROLES)
    status = (status or "").strip().lower()
    if status and status not in ("pending", "approved", "rejected"):
        raise HTTPException(400, "status: pending/approved/rejected (khali = anni)")
    limit = clamp_int(limit, "limit", 1, 200, 50)
    rows = [x for x in A11.STORIES if not status or x.get("status") == status]
    rows = list(reversed(rows[-limit:]))
    CONTROL_AUTH.audit("control_stories", item["username"], request, status=status or "all", count=len(rows))
    return {
        "success": True, "status": status or "all", "count": len(rows), "stories": rows,
        "review_note": "Approval is a publication decision only. Identity and relationship "
                       "details are not verified, and names are whatever the submitter supplied.",
    }


@app.post("/api/control/stories/{story_id}/action")
def control_story_action(story_id: str, payload: dict, request: Request):
    """Owner-only approve/reject for a member story (CSRF protected)."""
    item = _control_write_guard(request, roles=_CONTROL_OWNER_ROLES)
    d = payload or {}
    action = str(d.get("action", "")).strip().lower()
    note = str(d.get("note", "")).strip()
    try:
        updated = A11.review_story(story_id, action, note)
        CONTROL_AUTH.audit("control_story_action", item["username"], request,
                           story_id=story_id, story_action=action, note=note[:60])
        out = {"success": True, "story": updated,
               "message": f"Story {action}d successfully",
               "publication_note": "Approval publishes the story as submitted; it does not "
                                   "verify identity, relationship or consent."}
        if action == "approve":
            out["share_text"] = A11.story_share_text(updated)
        return out
    except Exception as e:
        raise HTTPException(400, str(e))


@app.get("/api/control/payouts/queue")
def control_payouts_queue(request: Request, status: str = "requested"):
    """Finance-only queue of referral payout requests and payment details."""
    item = CONTROL_AUTH.require(request, roles=_CONTROL_FINANCE_ROLES)
    res = payout_queue(status if status != "all" else "")
    CONTROL_AUTH.audit("control_payouts_queue", item["username"], request, status=status, count=res.get("count", 0))
    return {"success": True, **res, "role": item["role"]}


@app.post("/api/control/payouts/{request_id}/action")
def control_payout_action(request_id: str, payload: dict, request: Request):
    """Finance-only payout settlement (CSRF protected)."""
    item = _control_write_guard(request, roles=_CONTROL_FINANCE_ROLES)
    d = payload or {}
    action = str(d.get("action", "")).strip().lower()
    utr = str(d.get("utr", "")).strip()
    reason = str(d.get("reason", "")).strip()
    res = payout_action(request_id, action, DB_USERS, utr=utr, reason=reason)
    if not res.get("ok"):
        status_code = 503 if res.get("reason") == "persistence_failed" else 400
        raise HTTPException(status_code, res.get("message_telugu") or "Payout action failed")
    CONTROL_AUTH.audit("control_payout_action", item["username"], request, request_id=request_id, payout_action=action)
    return {"success": True, **res}


@app.get("/api/control/castes")
def control_castes_list(request: Request):
    """Control Portal: Castes & Community Hubs overview with counts and subcastes."""
    item = CONTROL_AUTH.require(request)
    from channels_config import CASTE_CLUSTERS, CHANNELS, _routing_is_explicit
    clusters_data = []
    for cl in CASTE_CLUSTERS:
        key = cl["key"]
        en = cl["en"]
        te = cl["te"]
        cat = cl.get("category", "OC")
        members = list(cl.get("members", []))
        males = sum(1 for u in DB_USERS if (str(u.get("caste", "")).lower() in [m.lower() for m in members] or key in str(u.get("caste", "")).lower()) and str(u.get("gender", "")).lower() in ["groom", "male"])
        females = sum(1 for u in DB_USERS if (str(u.get("caste", "")).lower() in [m.lower() for m in members] or key in str(u.get("caste", "")).lower()) and str(u.get("gender", "")).lower() in ["bride", "female"])
        mixed_channel = CHANNELS.get(f"c_{key}")
        bride_channel = CHANNELS.get(f"c_{key}_bride") or mixed_channel
        groom_channel = CHANNELS.get(f"c_{key}_groom") or mixed_channel
        clusters_data.append({
            "key": key,
            "en": en,
            "te": te,
            "category": cat,
            "members": members,
            "split": cl.get("split", False),
            "males": males,
            "females": females,
            "total": males + females,
            "routing_eligible": bool(
                (bride_channel and _routing_is_explicit(bride_channel))
                or (groom_channel and _routing_is_explicit(groom_channel))
            ),
            "channel_bride": (bride_channel or {}).get("username", ""),
            "channel_groom": (groom_channel or {}).get("username", ""),
        })
    return {"success": True, "castes": clusters_data, "total_castes": len(clusters_data)}


@app.get("/api/control/matchmaker/{profile_id}")
def control_matchmaker(
    profile_id: str,
    request: Request,
    caste: str = "",
    district: str = "",
    state: str = "",
    education: str = "",
    job: str = "",
    min_score: int = 0,
    age_min: int = 0,
    age_max: int = 0,
    salary_min: int = 0,
    photo_only: int = 0,
    verified_only: int = 0,
    limit: int = 50,
):
    """Owner-only match search by an exact profile ID; returns protected contact details."""
    item = CONTROL_AUTH.require(request, roles=_CONTROL_OWNER_ROLES)
    pid = profile_id.strip().upper()
    me = next((u for u in DB_USERS if str(u.get("tsap_id", "")).strip().upper() == pid), None)
    if not _is_approved_profile(me):
        raise HTTPException(404, "Approved profile ID not found")

    target_gender = "Groom" if str(me.get("gender", "")).lower() in ["bride", "female"] else "Bride"
    pool = [
        u for u in DB_USERS
        if _is_approved_profile(u)
        and u.get("tsap_id") != me.get("tsap_id")
        and (not u.get("gender") or str(u.get("gender", "")).lower() == target_gender.lower())
        and not safety.is_blocked(me["tsap_id"], u.get("tsap_id", ""), DB_BLOCKS)
    ]

    # Member-entered name/gothram text never determines profile eligibility.
    kept = list(pool)

    # Filter conditions
    _fcastes = [x.strip().lower() for x in (caste or "").split(",") if x.strip()]
    _fdists = [x.strip().lower() for x in (district or "").split(",") if x.strip()]
    _fedu = [x.strip().lower() for x in (education or "").split(",") if x.strip()]
    _fjobs = [x.strip().lower() for x in (job or "").split(",") if x.strip()]

    def _sal_val(v):
        try:
            return float(str(v).replace(",", "").strip().split()[0])
        except Exception:
            return 0.0

    filtered = []
    for c in kept:
        try:
            _age = int(c.get("age", 0) or 0)
        except Exception:
            _age = 0
        if age_min and _age and _age < age_min:
            continue
        if age_max and _age and _age > age_max:
            continue
        if _fcastes and str(c.get("caste", "")).lower() not in _fcastes:
            continue
        if _fdists and str(c.get("district", "")).lower() not in _fdists:
            continue
        if state and str(c.get("state", "")) != state:
            continue
        if _fedu and str(c.get("education", "")).lower() not in _fedu:
            continue
        if _fjobs and str(c.get("job", "")).lower() not in _fjobs:
            continue
        if salary_min and _sal_val(c.get("salary", 0)) < salary_min:
            continue
        if photo_only and not _has_profile_photo(c):
            continue
        if verified_only and not safety.has_verification_evidence(c):
            continue
        filtered.append(c)

    # Filtered member profiles; a separately purchased, active boost may affect placement.
    matches = topmatch.find_top_matches_v2(me, filtered, limit=min(limit, 100), min_score=min_score)
    matches.sort(key=lambda r: A11.boost_rank_key(r.get("profile", {})), reverse=True)

    results = []
    for m in matches:
        p = m.pop("profile", {})
        # Astrology output is deliberately unavailable here. Search must not turn
        # member-entered star/rasi fields into a compatibility number or a chart.
        # The real-document review flow lives at /porutham and is owner-gated.
        guna_res = None

        # Facts listed by both members; no inferred match reasons or suitability verdict.
        observations = list(m.get("observations") or [])[:4]
        details_summary = " • ".join(observations[:3]) if observations else "తనిఖీ చేయడానికి రెండు profiles లో వివరాలు లేవు"

        m.update({
            "tsap_id": p.get("tsap_id"),
            "full_name": p.get("full_name"),
            "phone": p.get("phone", ""),
            "gender": p.get("gender"),
            "age": p.get("age"),
            "height": p.get("height", ""),
            "caste": p.get("caste"),
            "sub_caste": p.get("sub_caste", ""),
            "gothram": p.get("gothram", ""),
            "star": p.get("star", ""),
            "rasi": p.get("rasi", ""),
            "district": p.get("district"),
            "state": p.get("state"),
            "education": p.get("education"),
            "job": p.get("job"),
            "salary": p.get("salary", ""),
            "marital_status": p.get("marital_status"),
            "photo_url": p.get("photo_url") or (p.get("photo_urls", [None])[0] if isinstance(p.get("photo_urls"), list) and p.get("photo_urls") else None),
            "is_verified": safety.has_verification_evidence(p),
            "verification": safety.verification_badge(p)["level"],
            "ashtakoota_total_36": None,
            "porutham_checks_passed": None,
            "porutham_checks_total": None,
            "gunamelanam_basis": None,
            "gunamelanam_doshas": [],
            "jathakam_status": "review_required",
            "observations": observations,
            "details_summary": details_summary,
            "recommendation_telugu": "ℹ️ సభ్యులు అందించిన వివరాలను పరిశీలించి, కుటుంబంతో మాట్లాడి మీ నిర్ణయం తీసుకోండి; ఇది match verdict కాదు.",
        })
        results.append(m)

    # Build ready-to-copy Notepad lines
    copy_notepad_lines = [
        f"{r['full_name']} -- {r['phone']} ({r['tsap_id']} • {r['caste']} • {r['age']}y • {r['job']})"
        for r in results
    ]

    CONTROL_AUTH.audit("control_matchmaker_view", item["username"], request, target_id=me.get("tsap_id"), matches_count=len(results))
    return {
        "success": True,
        "candidate": {
            "tsap_id": me.get("tsap_id"),
            "full_name": me.get("full_name"),
            "gender": me.get("gender"),
            "age": me.get("age"),
            "height": me.get("height", ""),
            "caste": me.get("caste"),
            "sub_caste": me.get("sub_caste", ""),
            "gothram": me.get("gothram", ""),
            "star": me.get("star", ""),
            "rasi": me.get("rasi", ""),
            "district": me.get("district"),
            "state": me.get("state"),
            "education": me.get("education"),
            "job": me.get("job"),
            "salary": me.get("salary", ""),
            "phone": me.get("phone", ""),
            "photo_url": me.get("photo_url") or (me.get("photo_urls", [None])[0] if isinstance(me.get("photo_urls"), list) and me.get("photo_urls") else None),
            "is_verified": safety.has_verification_evidence(me),
            "verification": safety.verification_badge(me)["level"],
        },
        "count": len(results),
        "results": results,
        "copy_notepad_text": "\n".join(copy_notepad_lines),
        "message_telugu": f"🎯 {me.get('full_name')} ({me.get('tsap_id')}) కి {len(results)} అనుకూలమైన సంబంధాలు దొరికాయి",
    }


@app.get("/api/control/directory")
def control_directory(
    request: Request,
    q: str = "",
    gender: str = "",
    caste: str = "",
    district: str = "",
    status: str = "all",
    date_range: str = "all",
    date_from: str = "",
    date_to: str = "",
    payment_status: str = "all",
    verification_status: str = "all",
    photo_filter: str = "all",
    marital_filter: str = "all",
    profession_filter: str = "all",
    include_contact: bool = False,
    limit: int = 100,
    offset: int = 0,
):
    """Owner-only directory; contact disclosure is an explicit audited action."""
    item = CONTROL_AUTH.require(request, roles=_CONTROL_OWNER_ROLES)
    limit = max(1, min(int(limit), 500))
    if include_contact:
        CONTROL_AUTH.audit("control_directory_contact_view", item.get("username", "owner"), request,
                          query=q[:80], returned_limit=limit, offset=offset)
    offset = max(0, int(offset))

    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    yesterday_str = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
    week_ago_str = (datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%d")
    month_prefix = today_str[:7]

    summary = {
        "total_all": len(DB_USERS),
        "today_count": sum(1 for u in DB_USERS if str(u.get("created_at", ""))[:10] == today_str),
        "yesterday_count": sum(1 for u in DB_USERS if str(u.get("created_at", ""))[:10] == yesterday_str),
        "last_7days_count": sum(1 for u in DB_USERS if str(u.get("created_at", ""))[:10] >= week_ago_str),
        "paid_count": sum(1 for u in DB_USERS if u.get("is_premium") or str(u.get("plan", "FREE")).upper() not in ("FREE", "", "NONE")),
        "unpaid_count": sum(1 for u in DB_USERS if not (u.get("is_premium") or str(u.get("plan", "FREE")).upper() not in ("FREE", "", "NONE"))),
        "verified_count": sum(1 for u in DB_USERS if safety.has_verification_evidence(u)),
        "photo_count": sum(1 for u in DB_USERS if _has_profile_photo(u)),
        "pending_count": sum(1 for u in DB_USERS if str(u.get("status", "pending")) == "pending"),
    }

    items = list(DB_USERS)

    # 1. Status filter
    if status and status != "all":
        items = [u for u in items if str(u.get("status", "pending")) == status or (status == "approved" and u.get("is_approved"))]

    # 2. Date Range filter
    if date_range == "today":
        items = [u for u in items if str(u.get("created_at", ""))[:10] == today_str]
    elif date_range == "yesterday":
        items = [u for u in items if str(u.get("created_at", ""))[:10] == yesterday_str]
    elif date_range in ("7days", "last_7_days"):
        items = [u for u in items if str(u.get("created_at", ""))[:10] >= week_ago_str]
    elif date_range in ("month", "this_month"):
        items = [u for u in items if str(u.get("created_at", ""))[:10].startswith(month_prefix)]
    elif date_range == "custom":
        if date_from:
            items = [u for u in items if str(u.get("created_at", ""))[:10] >= date_from]
        if date_to:
            items = [u for u in items if str(u.get("created_at", ""))[:10] <= date_to]

    # 3. Payment / Plan filter
    if payment_status == "paid":
        items = [u for u in items if u.get("is_premium") or str(u.get("plan", "FREE")).upper() not in ("FREE", "", "NONE")]
    elif payment_status in ("unpaid", "free"):
        items = [u for u in items if not (u.get("is_premium") or str(u.get("plan", "FREE")).upper() not in ("FREE", "", "NONE"))]

    # 4. Verification filter
    if verification_status == "verified":
        items = [u for u in items if safety.has_verification_evidence(u)]
    elif verification_status == "unverified":
        items = [u for u in items if not safety.has_verification_evidence(u)]

    # 5. Photo filter
    if photo_filter == "with_photo":
        items = [u for u in items if _has_profile_photo(u)]
    elif photo_filter == "no_photo":
        items = [u for u in items if not _has_profile_photo(u)]

    # 6. Marital filter
    if marital_filter == "first_marriage":
        items = [u for u in items if str(u.get("marital_status", "")).lower().strip() in ("pelli kaledu", "never married", "unmarried", "single", "", "పెళ్లి కాలేదు")]
    elif marital_filter in ("second_marriage", "remarriage"):
        items = [u for u in items if str(u.get("marital_status", "")).lower().strip() not in ("pelli kaledu", "never married", "unmarried", "single", "", "పెళ్లి కాలేదు")]

    # 6b. Profession filter
    if profession_filter == "housewife":
        items = [u for u in items if any(k in str(u.get("job", "")).lower() or k in str(u.get("education_detail", "")).lower() for k in ("housewife", "homemaker", "గృహిణి", "not working", "none", "looking", "intlo", "no job"))]
    elif profession_filter == "it_software":
        items = [u for u in items if any(k in str(u.get("job", "")).lower() for k in ("software", "it", "developer", "engineer", "tech", "programmer", "data", "cloud", "tester", "qa"))]
    elif profession_filter == "govt":
        items = [u for u in items if any(k in str(u.get("job", "")).lower() for k in ("govt", "government", "teacher", "bank", "railway", "police", "officer", "public", "revenue", "clerk", "collector"))]
    elif profession_filter == "business":
        items = [u for u in items if any(k in str(u.get("job", "")).lower() for k in ("business", "self", "entrepreneur", "shop", "real estate", "contractor", "trader"))]

    # 7. Gender filter
    if gender:
        items = [u for u in items if str(u.get("gender", "")).lower() == gender.lower()]

    # 8. Caste filter
    if caste:
        c_low = [x.strip().lower() for x in caste.split(",") if x.strip()]
        items = [u for u in items if any(c in str(u.get("caste", "")).lower() or c in str(u.get("sub_caste", "")).lower() for c in c_low)]

    # 9. District filter
    if district:
        d_low = [x.strip().lower() for x in district.split(",") if x.strip()]
        items = [u for u in items if any(d in str(u.get("district", "")).lower() or d in str(u.get("current_city", "")).lower() for d in d_low)]

    # 10. Keyword search
    if q.strip():
        ql = q.strip().lower()
        items = [
            u for u in items
            if ql in str(u.get("tsap_id", "")).lower()
            or ql in str(u.get("full_name", "")).lower()
            or ql in str(u.get("phone", ""))
            or ql in str(u.get("caste", "")).lower()
            or ql in str(u.get("sub_caste", "")).lower()
            or ql in str(u.get("district", "")).lower()
            or ql in str(u.get("gothram", "")).lower()
            or ql in str(u.get("job", "")).lower()
            or ql in str(u.get("education", "")).lower()
        ]

    items.sort(key=lambda u: str(u.get("created_at", "")), reverse=True)
    total = len(items)
    rows = []
    for u in items[offset:offset + limit]:
        rows.append({
            "tsap_id": u.get("tsap_id"),
            "full_name": u.get("full_name"),
            "gender": u.get("gender"),
            "age": u.get("age"),
            "dob": u.get("dob", ""),
            "caste": u.get("caste"),
            "sub_caste": u.get("sub_caste", ""),
            "gothram": u.get("gothram", ""),
            "star": u.get("star", ""),
            "rasi": u.get("rasi", ""),
            "marital_status": u.get("marital_status", "Pelli Kaledu"),
            "children": "" if is_never_married_status(u.get("marital_status")) else u.get("children", ""),
            "district": u.get("district"),
            "state": u.get("state"),
            "education": u.get("education"),
            "job": u.get("job"),
            "salary": u.get("salary", ""),
            # Contact values stay masked unless the owner deliberately enables
            # audited outreach disclosure for this directory load.
            "phone": u.get("phone", "") if include_contact else "",
            "phone_masked": mask_phone(u.get("phone", "")),
            "contact_revealed": bool(include_contact),
            "status": str(u.get("status", "pending")),
            "plan": str(u.get("plan", "FREE") or "FREE"),
            "plan_name": {"S_99": "స్వాగతం (Silver)", "S_199": "శుభారంభం (Gold)", "S_299": "కళ్యాణం (Platinum)", "S_499": "కళ్యాణ వైభోగం (Diamond)", "S_999": "మంగళసూత్రం (VIP)"}.get(str(u.get("plan", "FREE")), str(u.get("plan", "FREE"))),
            "is_premium": bool(u.get("is_premium") or str(u.get("plan", "FREE")).upper() not in ("FREE", "", "NONE")),
            "is_verified": safety.has_verification_evidence(u),
            "verification": safety.verification_badge(u)["level"],
            "photo_url": u.get("photo_url") or (u.get("photo_urls", [None])[0] if isinstance(u.get("photo_urls"), list) and u.get("photo_urls") else None),
            "created_at": u.get("created_at", ""),
            "credits": u.get("credits", 0),
        })

    return {
        "success": True,
        "total": total,
        "count": len(rows),
        "offset": offset,
        "limit": limit,
        "summary": summary,
        "profiles": rows,
    }


@app.get("/api/control/astro-check")
def control_astro_check(boy_id: str, girl_id: str, request: Request):
    """Admin-only astrology evidence status; never a star-only calculation."""
    item = CONTROL_AUTH.require(request, roles=_CONTROL_OWNER_ROLES)
    u_boy = _find_user(boy_id.strip().upper())
    u_girl = _find_user(girl_id.strip().upper())
    if not u_boy:
        raise HTTPException(404, f"Boy profile '{boy_id}' not found")
    if not u_girl:
        raise HTTPException(404, f"Girl profile '{girl_id}' not found")

    # Do not turn member-entered star/rasi values into an astrology result.
    # The control screen can record the evidence state, but never manufactures a
    # chart, score, or Porutham verdict.
    por_res = _jathakam_result_unavailable(u_girl.get("tsap_id", ""), u_boy.get("tsap_id", ""))

    # Same Gothram Check
    boy_gothram = str(u_boy.get("gothram") or "").strip()
    girl_gothram = str(u_girl.get("gothram") or "").strip()
    same_gothram = (boy_gothram.casefold() == girl_gothram.casefold()) if boy_gothram and girl_gothram else None
    porutham_text = "🎯 *Porutham లెక్కించలేదు:* నిజమైన జాతక పత్రం మరియు తగిన professional review అవసరం."
    verdict_text = "ℹ️ Profile star/rasi fields నుంచి score, chart లేదా marriage verdict సృష్టించలేదు."

    # Format a shareable reference report without filling missing data with guessed results.
    wa_lines = [
        "🪔 *మన వివాహ — Astrology evidence status*",
        "═══════════════════════════",
        f"🤵 *వరుడు:* {u_boy.get('full_name') or u_boy.get('tsap_id') or '—'} ({u_boy.get('tsap_id') or '—'}) • నక్షత్రం: {u_boy.get('star') or '—'} • రాశి: {u_boy.get('rasi') or '—'} • గోత్రం: {boy_gothram or '—'}",
        f"👰 *వధువు:* {u_girl.get('full_name') or u_girl.get('tsap_id') or '—'} ({u_girl.get('tsap_id') or '—'}) • నక్షత్రం: {u_girl.get('star') or '—'} • రాశి: {u_girl.get('rasi') or '—'} • గోత్రం: {girl_gothram or '—'}",
        "───────────────────────────",
        porutham_text,
        verdict_text,
    ]

    if same_gothram is True:
        wa_lines.append(f"⚠️ *గోత్ర గమనిక:* ఇద్దరూ ఇచ్చిన గోత్ర వివరాలు ఒకేలా ఉన్నాయి ({boy_gothram}); సంప్రదాయం గురించి మీ కుటుంబ పెద్దలు/పురోహితులతో చర్చించండి.")
    elif same_gothram is False:
        wa_lines.append("ℹ️ అందించిన గోత్ర వివరాలు వేర్వేరు. ఇతర జాతక వివరాలు మరియు సంప్రదాయాలను విడిగా పరిశీలించండి.")
    else:
        wa_lines.append("ℹ️ గోత్ర వివరాలు సరిపోల్చడానికి అందుబాటులో లేవు.")

    wa_lines.extend([
        "───────────────────────────",
        f"🌐 *ప్రొఫైల్ లింకులు:* https://manavivaha.in/search/{u_boy.get('tsap_id')} & https://manavivaha.in/search/{u_girl.get('tsap_id')}",
    ])
    configured_support = os.getenv("SUPPORT_WHATSAPP", "").strip()
    if configured_support:
        wa_lines.append(f"📞 Configured support contact: {configured_support}")
    wa_lines.append("_ఈ నివేదిక సాంప్రదాయ సూచిక మాత్రమే; వివరాలు మరియు నిర్ణయాలను స్వతంత్రంగా నిర్ధారించండి. మన వివాహ_")

    return {
        "success": True,
        "boy": safe_user(u_boy),
        "girl": safe_user(u_girl),
        "porutham": por_res,
        "same_gothram": same_gothram,
        "wa_report_text": "\n".join(wa_lines)
    }


@app.get("/api/control/demand-matrix")
def control_demand_matrix(request: Request):
    """Control Portal: Caste Demand & Gender Supply Balance Matrix."""
    item = CONTROL_AUTH.require(request)
    caste_map = defaultdict(lambda: {"brides": 0, "grooms": 0, "recorded_checks": 0})
    for u in DB_USERS:
        c = str(u.get("caste", "Other")).strip() or "Other"
        g = str(u.get("gender", "Bride")).capitalize()
        if g in ("Groom", "Male"):
            caste_map[c]["grooms"] += 1
        else:
            caste_map[c]["brides"] += 1
        if safety.has_verification_evidence(u):
            caste_map[c]["recorded_checks"] += 1

    results = []
    for c, data in sorted(caste_map.items(), key=lambda x: x[1]["brides"] + x[1]["grooms"], reverse=True):
        tot = data["brides"] + data["grooms"]
        b = data["brides"]
        g = data["grooms"]
        ratio = round(b / max(1, g), 2)
        health = "balanced" if 0.8 <= ratio <= 1.25 else ("high_groom_demand" if ratio > 1.25 else "high_bride_demand")
        results.append({
            "caste": c,
            "total": tot,
            "brides": b,
            "grooms": g,
            "ratio": ratio,
            "recorded_checks": data["recorded_checks"],
            "health": health,
            "health_telugu": {
                "balanced": "⚖️ సమతుల్యం (Balanced)",
                "high_groom_demand": "🤵 వరుల కొరత (High Groom Demand)",
                "high_bride_demand": "👰 వధువుల కొరత (High Bride Demand)"
            }.get(health, "సమతుల్యం")
        })

    return {
        "success": True,
        "total_castes": len(results),
        "matrix": results
    }


@app.get("/api/control/high-intent-leads")
def control_high_intent_leads(request: Request, limit: int = 50):
    """Owner-only access to unpaid-member contact details; does not imply purchase intent."""
    item = CONTROL_AUTH.require(request, roles=_CONTROL_OWNER_ROLES)
    unpaid = [u for u in DB_USERS if not (u.get("is_premium") or str(u.get("plan", "FREE")).upper() not in ("FREE", "", "NONE"))]
    unpaid.sort(key=lambda u: str(u.get("created_at", "")), reverse=True)

    rows = []
    for u in unpaid[:limit]:
        phone = u.get("phone", "")
        full_name = u.get("full_name", "")
        tsap_id = u.get("tsap_id", "")
        wa_msg = f"💐 నమస్కారం {full_name} గారు!\n\nమన వివాహ లో మీ ప్రొఫైల్ ({tsap_id}) కి మ్యాచ్‌ల సంఖ్య పెరుగుతోంది. నేరుగా 5 కుటుంబాల ఫోన్ నంబర్లు అన్‌లాక్ చేసుకోవడానికి ఈరోజే మా *₹99 స్వాగతం ప్లాన్* తీసుకోండి (50% స్పెషల్ ఆఫర్):\nhttps://manavivaha.in/pricing\n\nమీరు UPI QR / PhonePe ద్వారా చెల్లించడానికి ఇక్కడే రిప్లై ఇవ్వగలరు."
        rows.append({
            "tsap_id": tsap_id,
            "full_name": full_name,
            "gender": u.get("gender"),
            "age": u.get("age"),
            "caste": u.get("caste"),
            "district": u.get("district"),
            "phone": phone,
            "created_at": u.get("created_at", ""),
            "wa_discount_msg": wa_msg
        })

    return {
        "success": True,
        "total_high_intent": len(rows),
        "leads": rows
    }


@app.post("/api/control/profiles/add")
def control_add_profile(payload: dict, request: Request):
    """Owner-only assisted profile creation, with member consent recorded server-side."""
    item = _control_write_guard(request, roles=_CONTROL_OWNER_ROLES)
    d = payload or {}
    full_name = str(d.get("full_name", "")).strip()
    if not full_name:
        raise HTTPException(400, "Full name required")
    raw_gender = str(d.get("gender", "")).strip().capitalize()
    if raw_gender not in {"Bride", "Groom"}:
        raise HTTPException(400, "Choose a valid gender")
    gender = raw_gender

    full_name = clean(full_name, 60, "control_add_profile:full_name")
    raw_age = str(d.get("age") or "").strip()
    try:
        age = int(raw_age) if raw_age else None
    except ValueError:
        raise HTTPException(400, "Age must be a whole number")
    if age is not None and not (21 if gender == "Groom" else 18) <= age <= 100:
        raise HTTPException(400, f"Age must be at least {21 if gender == 'Groom' else 18} for this profile")
    height = clean(d.get("height", ""), 12, "control_add_profile:height")
    religion = req_choice(d.get("religion"), "religion", MP.RELIGIONS)
    community_options = MP.castes_for(religion)["castes"]
    if str(d.get("caste", "")).strip() == "Other / self-described":
        caste = clean(d.get("caste_custom", ""), 100, "control_add_profile:caste_custom")
        if len(caste) < 2:
            raise HTTPException(400, "Enter the member-provided community name")
    else:
        caste = req_choice(d.get("caste"), "caste", community_options)
    if str(d.get("sub_caste", "")).strip() == "Other / self-described":
        sub_caste = clean(d.get("sub_caste_custom", ""), 100, "control_add_profile:sub_caste_custom")
        if len(sub_caste) < 2:
            raise HTTPException(400, "Enter the member-provided subgroup name")
    else:
        raw_subcaste = str(d.get("sub_caste", "")).strip()
        known_subcastes = community_subcastes_for(religion, caste)
        if known_subcastes and raw_subcaste:
            sub_caste = req_choice(raw_subcaste, "sub_caste", known_subcastes, required=False, default="")
        else:
            sub_caste = clean(raw_subcaste, 100, "control_add_profile:sub_caste")
    gothram = clean(d.get("gothram", ""), 100, "control_add_profile:gothram")
    star = clean(d.get("star", ""), 50, "control_add_profile:star")
    rasi = clean(d.get("rasi", ""), 50, "control_add_profile:rasi")
    education = clean(d.get("education", ""), 60, "control_add_profile:education")
    job = clean(d.get("job", ""), 100, "control_add_profile:job")
    salary = clean(d.get("salary", ""), 40, "control_add_profile:salary")
    state = str(d.get("state", "")).strip().upper()
    district = clean(d.get("district", ""), 80, "control_add_profile:district")
    district = canonicalize_district(state, district)
    if state not in {"TS", "AP", "Other"}:
        raise HTTPException(400, "Choose a valid state or region")
    if state == "TS" and district and district not in TS_DISTRICTS_LIST:
        raise HTTPException(400, "District does not match the selected state")
    if state == "AP" and district and district not in AP_DISTRICTS_LIST:
        raise HTTPException(400, "District does not match the selected state")
    if not district:
        raise HTTPException(400, "Choose the member-provided district or location")
    about_myself = clean(d.get("about_myself", ""), 600, "control_add_profile:about_myself")
    photo_url = clean(d.get("photo_url", ""), 300, "control_add_profile:photo_url")
    phone = req_phone(d.get("phone", ""), "phone")
    if not req_bool(d.get("consent_confirmed")):
        raise HTTPException(400, "Confirm that the member consented to this profile entry")
    marital_status = clean(d.get("marital_status", ""), 40, "control_add_profile:marital_status")
    children = clean(d.get("children", ""), 20, "control_add_profile:children")
    
    with _REGISTER_LOCK:
        if any(u.get("phone") == phone and not u.get("seed_source") for u in DB_USERS):
            raise HTTPException(409, "A profile already exists with this phone number")
        seq = len(DB_USERS) + 1
        tsap_id = generate_profile_id(caste, seq)
        while any(str(u.get("tsap_id")) == str(tsap_id) for u in DB_USERS):
            seq += 1
            tsap_id = generate_profile_id(caste, seq)
        
        user = {
            "tsap_id": tsap_id,
            "full_name": full_name,
            "gender": gender,
            "age": age,
            "height": height,
            "marital_status": marital_status,
            "children": children,
            "religion": religion,
            "caste": caste,
            "sub_caste": sub_caste,
            "gothram": gothram,
            "star": star,
            "rasi": rasi,
            "education": education,
            "job": job,
            "salary": salary,
            "state": state,
            "district": district,
            "phone": phone,
            "phone_last4": phone[-4:],
            "phone_masked": mask_phone(phone),
            "phone_verified": False,
            "about_myself": about_myself,
            "photo_url": photo_url,
            "is_approved": False,
            "is_verified": False,
            "status": "pending",
            "plan": "FREE",
            "credits": 3,
            "created_at": datetime.utcnow().isoformat(),
            "consent_confirmed": True,
            "consent_confirmed_at": datetime.utcnow().isoformat(),
            "consent_version": "staff-profile-entry-v1",
        }

        code = f"{caste[:3].upper()}{random.randint(1000, 9999)}"
        user["my_referral_code"] = code

        # 🛡️ P3 hardening (defense-in-depth, consistency w/ the Phase 13
        # /api/profile/update fix): this admin-only Control Portal creator built
        # every field with a bare .strip(), unlike the public /api/register path
        # which always runs free-text fields through clean() (HTML-tag +
        # javascript:/onerror= stripping). Requires an elevated admin/staff
        # credential to reach (_control_write_guard above), so the practical
        # risk is low, but sanitize anyway for consistency across every write path.
        for _k, _n in (("full_name", 60), ("caste", 100), ("sub_caste", 100), ("gothram", 100),
                       ("star", 50), ("rasi", 50), ("education", 60), ("job", 100), ("salary", 40),
                       ("district", 80), ("about_myself", 600), ("photo_url", 300)):
            if _k in user:
                user[_k] = clean(user.get(_k), _n, "control_add_profile:" + _k)

        try:
            route = route_profile(user)
            user["routing_targets"] = route.get("usernames", [])
            user["posted_channels"] = []
            user["post_hashtags"] = route.get("hashtags", [])
        except Exception:
            user["routing_targets"] = []
            user["posted_channels"] = []
            user["post_hashtags"] = []
        
        DB_USERS.append(user)
        _reindex_users()
        if not DBSTORE.save(DBSTORE.snapshot(DB_USERS, DB_INTERESTS, DB_PAYMENTS, DB_OTPS,
                                             VERIFIED_PHONES, DB_VIEWS, DB_SAVES, DB_DIGEST), force=True):
            DB_USERS.remove(user)
            _reindex_users()
            raise HTTPException(503, "Profile could not be saved safely; no profile was accepted. Please retry.")

    CONTROL_AUTH.audit("control_add_profile", item["username"], request, tsap_id=tsap_id, caste=caste, name=full_name)
    return {"success": True, "tsap_id": tsap_id, "status": "pending", "is_approved": False,
            "is_verified": False, "phone_verified": False,
            "profile": {"tsap_id": tsap_id, "status": "pending"},
            "message": f"Profile {tsap_id} created for review. No channel post was sent."}


@app.get("/api/control/vendors")
def control_vendors_list(request: Request, status: str = "pending"):
    """Owner-only vendor review queue; records come from storage, never demo fixtures."""
    item = _control_owner_session_guard(request)
    status = str(status or "pending").strip().lower()
    if status not in {"pending", "active", "kit_ready", "rejected", "expired", "all"}:
        raise HTTPException(400, "Invalid vendor status")
    result = vendor_queue(status)
    CONTROL_AUTH.audit("control_vendor_queue", item["username"], request,
                       status=status, count=result.get("count", 0))
    return {"success": True, **result, "status": status}


@app.get("/api/control/vendors/revenue")
def control_vendors_revenue(request: Request):
    """Owner-only aggregate vendor figures; no vendor records are fabricated."""
    item = _control_owner_session_guard(request)
    result = vendor_revenue()
    CONTROL_AUTH.audit("control_vendor_revenue_view", item["username"], request)
    return {"success": True, **result}


@app.post("/api/control/vendors/{vendor_id}/action")
def control_vendor_action(vendor_id: str, payload: dict, request: Request):
    """Owner-session + CSRF protected manual review of vendor payment/listing status."""
    item = _control_owner_session_guard(request, mutating=True)
    import vendors as VND
    vendor = next((v for v in VND.VENDORS if str(v.get("id", "")) == vendor_id), None)
    if not vendor:
        raise HTTPException(404, "Vendor not found")
    data = payload or {}
    action = str(data.get("action", "")).strip().lower()
    if action in {"approve", "reject"} and vendor.get("status") != "pending":
        raise HTTPException(409, "Only pending vendor applications can be approved or rejected")
    if action == "approve":
        utr = str(data.get("utr", "")).strip()
        if not re.fullmatch(r"[A-Za-z0-9/-]{6,64}", utr):
            raise HTTPException(400, "Enter the actual payment reference from the reviewed receipt")
        result = activate_vendor(vendor_id, package=str(data.get("package", "")), utr=utr)
    elif action == "reject":
        reason = str(data.get("reason", "")).strip()
        if len(reason) < 5:
            raise HTTPException(400, "A clear rejection reason is required")
        result = reject_vendor(vendor_id, reason)
    elif action == "expire":
        previous = copy.deepcopy(vendor)
        vendor["status"] = "expired"
        if not vendors_save_state().get("ok"):
            vendor.clear()
            vendor.update(previous)
            result = {"ok": False, "reason": "persistence_failed",
                      "message_telugu": "⚠️ Vendor expiry could not be saved safely. Please try again."}
        else:
            result = {"ok": True, "vendor": vendor,
                      "message_telugu": "⏳ %s listing expire చేశాం" % vendor.get("business_name", "Vendor")}
    else:
        raise HTTPException(400, "Action must be approve, reject, or expire")
    if not result.get("ok"):
        status_code = 404 if result.get("reason") == "not_found" else 503 if result.get("reason") == "persistence_failed" else 400
        raise HTTPException(status_code, str(result.get("reason") or "Vendor action failed"))
    CONTROL_AUTH.audit("control_vendor_action", item["username"], request,
                       vendor_id=vendor_id, decision=action,
                       package=(result.get("vendor") or {}).get("package", ""))
    return {"success": True, **result}


@app.get("/api/control/ads")
def control_ads_list(request: Request, status: str = "all"):
    """Owner-only ad campaign management."""
    item = CONTROL_AUTH.require(request, roles=_CONTROL_OWNER_ROLES)
    cands = list(reversed(ADS.CAMPAIGNS))
    if status and status != "all":
        cands = [c for c in cands if c.get("status") == status]
    stats = ADS.ads_stats()
    return {"success": True, "campaigns": cands, "stats": stats, "count": len(cands)}


@app.post("/api/control/ads/create")
def control_ads_create(payload: dict, request: Request):
    """Create a pending campaign for a real, active vendor; never invent payment data."""
    item = _control_write_guard(request, roles=_CONTROL_OWNER_ROLES)
    d = payload or {}
    vendor_id = str(d.get("vendor_id", "")).strip()
    if not vendor_id:
        raise HTTPException(400, "An existing vendor ID is required")
    import vendors as VND
    vendor = next((v for v in VND.VENDORS if str(v.get("id", "")) == vendor_id), None)
    if not vendor_is_active_listing(vendor):
        raise HTTPException(404, "An active registered vendor was not found")

    try:
        days = req_int(d.get("days"), "days", ADS.RATES["min_days"], ADS.RATES["max_days"])
    except HTTPException:
        raise
    districts = d.get("districts") or []
    if isinstance(districts, str):
        districts = [part.strip() for part in districts.split(",") if part.strip()]
    if not isinstance(districts, list):
        raise HTTPException(400, "districts must be a list or comma-separated string")
    slots = d.get("slots") or ["matches_sidebar"]
    if not isinstance(slots, list):
        raise HTTPException(400, "slots must be a list")
    result = ADS.create_campaign(
        vendor_id=vendor_id,
        title=str(d.get("title", "")).strip(),
        level=str(d.get("level", "")).strip().lower(),
        days=days,
        districts=[str(value).strip() for value in districts if str(value).strip()],
        state=str(d.get("state", "")).strip(),
        slots=[str(value).strip() for value in slots],
        image_url=str(d.get("image_url", "")).strip(),
        banner_url=str(d.get("banner_url", "")).strip(),
        video_url=str(d.get("video_url", "")).strip(),
        offer=str(d.get("offer", "")).strip(),
        link=str(d.get("link", "")).strip(),
    )
    if not result.get("success"):
        raise HTTPException(400, result.get("message_telugu") or "Campaign could not be created")
    campaign = result["campaign"]
    CONTROL_AUTH.audit("control_create_ad", item["username"], request,
                       cid=campaign.get("id"), vendor_id=vendor_id, amount=campaign.get("amount"))
    return result


@app.post("/api/control/ads/{cid}/action")
def control_ads_action(cid: str, payload: dict, request: Request):
    """Owner-only ad campaign moderation and updates."""
    item = _control_write_guard(request, roles=_CONTROL_OWNER_ROLES)
    d = payload or {}
    action = str(d.get("action", "")).strip().lower()
    if action == "approve":
        campaign = ADS.get_campaign(cid)
        if not campaign:
            raise HTTPException(404, "Campaign not found")
        if campaign.get("status") != "pending":
            raise HTTPException(409, "Only pending campaigns can be approved")
        utr = str(d.get("utr", "")).strip()
        if not re.fullmatch(r"[A-Za-z0-9/-]{6,64}", utr):
            raise HTTPException(400, "Enter the actual payment reference (6–64 letters/numbers)")
        res = ADS.approve_campaign(cid, utr, int(d.get("days", 0) or 0))
    elif action in ["pause", "resume", "expire", "reject"]:
        res = ADS.campaign_action(cid, action, str(d.get("reason", "")))
    elif action == "update":
        res = ADS.update_campaign(cid, d.get("patch") or d)
    else:
        raise HTTPException(400, "Invalid action")
    if not res.get("success"):
        raise HTTPException(400, res.get("message_telugu") or "Failed")
    CONTROL_AUTH.audit("control_ad_action", item["username"], request, cid=cid, ad_action=action)
    return res


@app.get("/api/ads/list")
def api_ads_list(slot: str = "matches_sidebar", district: str = "", state: str = "", limit: int = 3):
    """Targeted multiple ads for district/state/slot."""
    return ADS.serve_list(slot, district, state, limit)




# 🌊 WAVE 26 — GLOBAL SAFETY NET: ekkada crash aina Telugu JSON (raw 500 never).
#    User ki easy message + ref code (support ki chepthe admin log lo chusthadu).
@app.exception_handler(Exception)
async def _telugu_500_handler(request: Request, exc: Exception):
    try:
        import traceback as _tb
        ref = "ERR-%s" % datetime.utcnow().strftime("%d%H%M%S")
        try:
            abuse_log("unhandled_500", request.url.path if request else "?", {"ref": ref, "err": str(exc)[:160]})
        except Exception:
            pass
        print(f"[500 {ref}] {request.url.path if request else '?'}: {exc!r}")
        print(_tb.format_exc()[-1500:])
    except Exception:
        ref = "ERR-?"
    return JSONResponse(status_code=500, content={
        "success": False, "error": "server_error", "ref": ref,
        "message_telugu": "⚠️ Konchem technical problem (ref: %s) — మళ్లీ try చెయ్యండి, kakapothe support కి ref code పంపండి 🙏" % ref})

# Generated cards and uploaded photos contain member data. Do not mount their
# storage directories as public StaticFiles: every filename would bypass profile,
# privacy, owner, and moderator checks. Voice assets remain a separate public feature.
try:
    from fastapi.staticfiles import StaticFiles
    os.makedirs(CARD_MEDIA_DIR, exist_ok=True)
    os.makedirs(PHOTO_MEDIA_DIR, exist_ok=True)
    os.makedirs(VOICE_MEDIA_DIR, exist_ok=True)                                      # 🎙️ WAVE 11
    app.mount("/voice", StaticFiles(directory=VOICE_MEDIA_DIR), name="voice")        # 🎙️ WAVE 11
except Exception as _e:
    print("[STATIC] mount skip:", _e)


def _has_profile_photo(profile: object) -> bool:
    """Truthful "this profile really has a photo" check 🖼️

    `photo_urls` is a list, and a profile registered without an upload used to be stored
    as `[""]` — a non-empty list, so `u.get("photo_urls")` was truthy and photo-less
    profiles were counted and filtered as if they had a photo (admin `photo_count`,
    `with_photo` / `no_photo` filters, public search `photo_only`). An empty string is
    not a photo, so only values with real content count.
    """
    if not isinstance(profile, dict):
        return False
    values = [profile.get("photo_url")]
    raw = profile.get("photo_urls")
    if isinstance(raw, list):
        values.extend(raw)
    elif raw:
        values.append(raw)
    return any(isinstance(value, str) and value.strip() for value in values)


def _media_filename(value: object, prefix: str) -> str:
    """Accept only a bare same-site media path; reject external URLs and traversal."""
    raw = str(value or "").strip()
    if not raw or len(raw) > 240 or "\\" in raw:
        return ""
    try:
        parsed = urllib.parse.urlsplit(raw)
    except ValueError:
        return ""
    if parsed.scheme or parsed.netloc or parsed.query or parsed.fragment:
        return ""
    match = re.fullmatch(re.escape(prefix) + r"([A-Za-z0-9._-]{1,180})", parsed.path)
    if not match:
        return ""
    filename = match.group(1)
    if filename in {".", ".."} or ".." in filename:
        return ""
    return filename


def _media_file(directory: str, filename: str) -> str:
    """Resolve a one-component media filename without allowing path escape."""
    root = os.path.realpath(directory)
    path = os.path.realpath(os.path.join(root, filename))
    if os.path.dirname(path) != root or not os.path.isfile(path):
        raise HTTPException(404, "Media not found")
    return path


_CARD_LOCK = threading.RLock()


def _regenerate_profile_card(profile: Dict[str, Any]) -> bool:
    """Serialize card replacement so concurrent upload/moderation cannot race the target file."""
    with _CARD_LOCK:
        return _regenerate_profile_card_locked(profile)


def _regenerate_profile_card_locked(profile: Dict[str, Any]) -> bool:
    """Build the card from the current moderation/privacy state.

    Durable profiles contain only ``/photos/...`` web references.  Pillow gets
    an internal path on a short-lived copy, never on the profile that is saved
    or returned by an API.  Pending/private/rejected media therefore produces a
    truthful monogram card, while approval can safely replace it with the
    reviewed photo.
    """
    tsap_id = str(profile.get("tsap_id") or "").strip().upper()
    if not tsap_id or not create_pro_card:
        return False
    try:
        os.makedirs(CARD_MEDIA_DIR, exist_ok=True)
    except Exception:
        profile["card_generated"] = False
        profile["card_url"] = ""
        profile["card_error"] = "card_storage_unavailable"
        return False
    target = os.path.join(CARD_MEDIA_DIR, f"{tsap_id}.png")
    temporary = f"{target}.tmp-{secrets.token_hex(8)}.png"
    card_input = copy.deepcopy(profile)
    card_input["photo_path"] = ""
    card_input["photo_url"] = ""

    is_public_photo = (
        bool(profile.get("is_approved"))
        and str(profile.get("photo_status") or "").lower() == "approved"
        and not bool(profile.get("photo_private") or profile.get("privacy_mode") == "private")
    )
    if is_public_photo:
        filename = _media_filename(profile.get("photo_url"), "/photos/")
        if not filename:
            profile["card_generated"] = False
            profile["card_url"] = ""
            profile["card_error"] = "approved_photo_missing"
            try:
                os.remove(target)
            except OSError:
                pass
            return False
        try:
            card_input["photo_path"] = _media_file(PHOTO_MEDIA_DIR, filename)
        except HTTPException:
            # Never silently replace an approved photo with a monogram and then
            # claim that the reviewed-photo card is live.
            profile["card_generated"] = False
            profile["card_url"] = ""
            profile["card_error"] = "approved_photo_missing"
            try:
                os.remove(target)
            except OSError:
                pass
            return False
        else:
            card_input["photo_url"] = ""  # internal path is the only image source

    try:
        create_pro_card(card_input, temporary)
        os.replace(temporary, target)
        profile["card_generated"] = True
        profile["card_url"] = f"/cards/{tsap_id}.png"
        profile["card_generated_at"] = datetime.utcnow().isoformat()
        profile.pop("card_error", None)
        return True
    except Exception:
        try:
            os.remove(temporary)
        except OSError:
            pass
        # Never leave an old photo-bearing card reachable after a privacy or
        # moderation transition failed to rebuild.
        try:
            os.remove(target)
        except OSError:
            pass
        profile["card_generated"] = False
        profile["card_url"] = ""
        # Keep storage topology out of durable/member-visible metadata.
        profile["card_error"] = "card_generation_failed"
        return False


@app.get("/photos/{filename}")
def guarded_profile_photo(filename: str, request: Request):
    """Serve approved public profile photos; keep private, pending, and selfie media gated."""
    if not re.fullmatch(r"[A-Za-z0-9._-]{1,180}", filename) or ".." in filename:
        raise HTTPException(404, "Photo not found")
    photo_owners, selfie_owners = [], []
    for profile in DB_USERS:
        if not isinstance(profile, dict):
            continue
        raw_values = profile.get("photo_urls", []) if isinstance(profile.get("photo_urls"), list) else []
        values = [profile.get("photo_url"), *raw_values]
        if any(_media_filename(value, "/photos/") == filename for value in values):
            photo_owners.append(profile)
        if _media_filename(profile.get("selfie_url"), "/photos/") == filename:
            selfie_owners.append(profile)
    owners = photo_owners + [u for u in selfie_owners if u not in photo_owners]
    cms_public_reference = False
    try:
        for page in CMS.list_pages(True):
            cms_public_reference |= any(_media_filename(value, "/photos/") == filename
                                        for value in (page.get("photos") or []))
        for story in CMS.list_stories("", True, 100):
            cms_public_reference |= _media_filename(story.get("photo"), "/photos/") == filename
    except Exception:
        cms_public_reference = False

    is_private = any(bool(u.get("photo_private") or u.get("privacy_mode") == "private") for u in owners)
    has_public_photo_reference = cms_public_reference or (
        not selfie_owners and not is_private
        and any(_is_approved_profile(u) and u.get("photo_status") == "approved" for u in photo_owners)
    )
    identity = token_from_request(request)
    owner_ids = {str(u.get("tsap_id", "")).strip().upper() for u in owners}
    is_owner = bool(identity and str(identity.get("tsap_id", "")).strip().upper() in owner_ids)
    if not has_public_photo_reference and not is_owner:
        try:
            require_admin(request, staff_ok=True)
        except HTTPException:
            # A uniform 404 avoids confirming whether a private/pending upload exists.
            raise HTTPException(404, "Photo not found")

    path = _media_file(PHOTO_MEDIA_DIR, filename)
    cache = "public, max-age=3600" if has_public_photo_reference else "private, no-store"
    return FileResponse(path, headers={"Cache-Control": cache, "X-Content-Type-Options": "nosniff"})


@app.get("/cards/{filename}")
def guarded_profile_card(filename: str, request: Request):
    """Serve a card only for an active public profile, its owner, or authorized staff."""
    if not re.fullmatch(r"[A-Za-z0-9-]{3,32}\.png", filename):
        raise HTTPException(404, "Card not found")
    tsap_id = filename[:-4].upper()
    profile = _find_user(tsap_id)
    if not profile or _is_synthetic_profile(profile):
        raise HTTPException(404, "Card not found")
    is_private = bool(profile.get("photo_private") or profile.get("privacy_mode") == "private")
    has_public_card = _is_approved_profile(profile) and not is_private
    identity = token_from_request(request)
    is_owner = bool(identity and str(identity.get("tsap_id", "")).strip().upper() == tsap_id)
    if not has_public_card and not is_owner:
        try:
            require_admin(request, staff_ok=True)
        except HTTPException:
            raise HTTPException(404, "Card not found")
    path = _media_file(CARD_MEDIA_DIR, filename)
    cache = "public, max-age=300" if has_public_card else "private, no-store"
    return FileResponse(path, media_type="image/png", headers={"Cache-Control": cache,
                                                                 "X-Content-Type-Options": "nosniff"})


async def _startup_publisher():
    # Never bring an unconfigured operations plane online in production.
    if _is_production_environment():
        _validate_production_storage()
        db_state = _validate_production_core_database()
        print("[DB] production persistence validated: users=%d records=%s file=%s" % (
            db_state["users"], "present" if db_state["has_records"] else "explicitly initialized empty",
            db_state["file"]))
        # Refuse unsafe operator flags too: a copied test env must never turn
        # auth off, disable rate limits, or auto-apply developer payment fixtures.
        if not auth_enforced():
            raise RuntimeError("Authentication bypass flags are forbidden in production")
        if str(os.getenv("TSAP_RATE_LIMIT", "")).strip().lower() in {"0", "false", "no", "off"}:
            raise RuntimeError("Rate limiting cannot be disabled in production")
        if str(os.getenv("MANA_TEST_PAYMENT_FIXTURES", "")).strip().lower() in {"1", "true", "yes", "on"}:
            raise RuntimeError("Test payment fixtures are forbidden in production")
        if not os.getenv("TSAP_AUTH_SECRET", "").strip() or len(os.getenv("TSAP_AUTH_SECRET", "")) < 32:
            raise RuntimeError("TSAP_AUTH_SECRET (32+ random chars) is required in production")
        if not os.getenv("ADMIN_KEY", "").strip() or len(os.getenv("ADMIN_KEY", "")) < 32:
            raise RuntimeError("ADMIN_KEY (32+ random chars) is required in production")
        if not CONTROL_AUTH._accounts():
            raise RuntimeError("No CONTROL owner/worker account configured in production")
        otp_ready = bool(os.getenv("MSG91_KEY", "").strip() or os.getenv("FAST2SMS_KEY", "").strip())
        otp_ready = otp_ready or (os.getenv("WHATSAPP_MODE", "").lower() == "bridge" and bool(os.getenv("WA_INSTANCES", "").strip() or os.getenv("WHATSAPP_BRIDGE_URL", "").strip()))
        if not otp_ready:
            raise RuntimeError("Production OTP provider is not configured (WhatsApp bridge or SMS provider required)")
    ok = start_worker()
    st = publish_status()
    start_wa_worker()
    wa = st["whatsapp_queue"]["antiban"]
    print(f"[PUBLISHER] worker={ok} | telegram={'ready' if st['telegram']['configured'] else 'dry-run'} "
          f"| whatsapp={st['whatsapp']['mode']} | routing_eligible={st['telegram']['routing_eligible_count']} (external status unchecked)")
    if not os.getenv("TSAP_API_KEY", "").strip():
        print("[AUTH] ⚠️ TSAP_API_KEY ledu — Telegram bot automation private API ki 401 (API+bot env lo same key pettandi)")
    print(f"[WHATSAPP-ANTIBAN] telegram mundu → whatsapp tarvata | gap={wa['random_gap']} | "
          f"cap={wa['daily_cap']}/day (today {wa['warmup_cap_today']}) | hour {wa['active_hours_ist'][0]}–{wa['active_hours_ist'][1]} IST")
    # 🌊 WAVE 22 — restart aina data povatledu: disk nunchi users/interests/payments restore
    try:
        _snap = DBSTORE.load()
        if not isinstance(_snap, dict) or (_is_production_environment() and not _snap):
            raise RuntimeError("core database did not load as a valid snapshot")
        if _snap:
            _u = _snap.get("users", [])
            # Restore only genuine member records. Prior demo/launch seed rows are
            # excluded before any operations or public endpoint can serialize them.
            _by_id, _seen_ph, _clean = {}, set(), []
            _removed_user_ids, _removed_phones = set(), set()
            for _x in _u:
                if not isinstance(_x, dict):
                    continue
                _tid = str(_x.get("tsap_id") or "").strip()
                _ph = str(_x.get("phone") or "").strip()
                if _is_synthetic_profile(_x):
                    if _tid:
                        _removed_user_ids.add(_tid)
                    if _ph:
                        _removed_phones.add(_ph)
                    continue
                if not _tid or _tid in _by_id:
                    continue
                if _ph:
                    if _ph in _seen_ph:
                        continue
                    _seen_ph.add(_ph)
                _by_id[_tid] = _x
                _clean.append(_x)
            _dropped = len(_u) - len(_clean)
            if _dropped and _is_production_environment():
                raise RuntimeError(
                    "production restore would discard %d profile rows; no database write was attempted" % _dropped
                )

            def _kept_records(key):
                rows = _snap.get(key, [])
                return [row for row in rows if isinstance(row, dict) and not any(
                    str(row.get(field, "")) in _removed_user_ids
                    for field in ("tsap_id", "user_id", "from_id", "to_id", "target_id", "owner_id")
                )]

            DB_USERS.extend(_clean)
            DB_INTERESTS.extend(_kept_records("interests"))
            DB_PAYMENTS.extend(_kept_records("payments"))
            DB_OTPS.update({k: v for k, v in (_snap.get("otps", {}) or {}).items() if str(k) not in _removed_phones})
            for _ph in _snap.get("verified_phones", []):
                if str(_ph) not in _removed_phones:
                    VERIFIED_PHONES.add(_ph)
            DB_VIEWS.extend(_kept_records("views"))
            DB_SAVES.extend(_kept_records("saves"))
            DB_DIGEST.extend(_kept_records("digest"))
            if _dropped:
                print("[DB] restore hygiene: removed %d duplicate or synthetic profile rows" % _dropped)
                DBSTORE.save(DBSTORE.snapshot(DB_USERS, DB_INTERESTS, DB_PAYMENTS, DB_OTPS,
                                              VERIFIED_PHONES, DB_VIEWS, DB_SAVES, DB_DIGEST), force=True)
            print("[DB] restored %d users, %d interests, %d payments from disk" % (
                len(DB_USERS), len(DB_INTERESTS), len(DB_PAYMENTS)))
    except Exception as e:
        print("[DB] restore failed:", str(e)[:120])
        if _is_production_environment():
            raise RuntimeError(
                "Production core database restore failed; startup is blocked and the source file was not intentionally replaced"
            ) from e
    # 🗑️ WAVE 40 — 3-year retention: restore tarvata ventane okasari + roju oosari
    # (money-safe: wallet/plan/boost active unna profiles skip; archive mundu — data poyedam ledu)
    try:
        _ret = _retention_cycle()
        if _ret.get("deleted"):
            print(f"[RETENTION] {_ret['deleted']} profiles (3+ years) archived+deleted → {_ret.get('archive','')}")
        RETENTION.start_daily(lambda: _retention_cycle())
    except Exception as e:
        print("[RETENTION] startup skip:", str(e)[:80])
    # Profiles are loaded only from the configured database or real registration flows.

    # Vendor persistence/expiry maintenance; never seed fictional vendors or leads.
    try:
        _vl = vendors_load_state()
        print("[VENDORS] state load: %s (vendors=%s, leads=%s)"
              % ("ok" if _vl.get("ok") else "new", _vl.get("vendors", 0), _vl.get("leads", 0)))
        _ex = expire_due_vendors()
        if _ex.get("expired"):
            print("[VENDORS] %d listings expired" % _ex["expired"])
    except Exception as e:
        print("[VENDORS] state load fail:", str(e)[:90])

    # 🤝 REFERRAL 2.0 startup: state file load (payouts/clicks restart lo kooda undali)
    try:
        _rl = referral_load_state()
        print("[REFERRAL] state load: %s (payouts=%s, clicks=%s)"
              % ("ok" if _rl.get("ok") else "new", _rl.get("payouts", 0), _rl.get("clicks", 0)))
    except Exception as e:
        print("[REFERRAL] state load fail:", str(e)[:90])
    # 🔑 Pranam prathi user ki UNIQUE referral code (seed data lo duplicates unnayi — 1042 shared by 2 users)
    try:
        for _u in DB_USERS:
            try:
                ensure_referrer_profile(_u, DB_USERS)
            except Exception:
                pass
        _codes = [u.get("referral_code") for u in DB_USERS if u.get("referral_code")]
        _dup = len(_codes) - len(set(_codes))
        print("[REFERRAL] %d users ki unique codes ready (duplicates: %d)" % (len(_codes), _dup))
        if _dup:
            seen, fixed = set(), 0
            for _u in DB_USERS:
                _c = str(_u.get("referral_code", "")).upper()
                if not _c:
                    continue
                if _c in seen:
                    _u["referral_code"] = ""
                    _new = ensure_referrer_profile(_u, DB_USERS)["code"]
                    print("[REFERRAL] duplicate fix: %s → %s" % (_c, _new))
                    _c = _new
                    fixed += 1
                seen.add(_c)
            print("[REFERRAL] duplicates fixed: %d" % fixed)
    except Exception as e:
        print("[REFERRAL] code assign fail:", str(e)[:90])

# ---------------------------------------------------------------------------
# VISIT TRACKING MIDDLEWARE — "site ki vachina vallu antha DB lo save avvali"
#    (page + API calls anni anonymous ga log: path, referrer, device, channel)
# ---------------------------------------------------------------------------
_SKIP_TRACK = ("/_next", "/static", "/favicon", "/cards/", "/photos/", "/health", "/robots", "/sitemap")


@app.middleware("http")
async def _track_visits_middleware(request: Request, call_next):
    try:
        path = request.url.path
        is_trackable = (request.method == "GET" and path not in ("", "/")
                        and not any(path.startswith(x) for x in _SKIP_TRACK))
        if is_trackable:
            # Use the same trusted-proxy policy as abuse limits.  Tracking an
            # attacker-supplied X-Forwarded-For value would poison analytics and
            # make the registration abuse trail unreliable.
            ip = client_ip(request)
            ua = request.headers.get("user-agent", "")
            ref = request.headers.get("referer", "")
            utm = request.url.query if "utm_" in str(request.url.query) else ""
            track_visit(ip, ua, path, ref, utm)
    except Exception:
        pass  # tracking eppudu main request ni aapakudadu
    return await call_next(request)


@app.middleware("http")
async def _security_middleware(request: Request, call_next):
    """
    🛡️ rate limit (abuse) + security headers + docs lock + no-store (PII cache leak fix).

    🐞 FIX (S06): /docs + /openapi.json production lo open ga unnayi (anni endpoints + models
    bayata kanipisthunnayi). Ippudu: dev/test lo matrame open, prod lo admin key tho matrame —
    lekapote 404 (info disclosure closed).
    🐞 FIX (S07): private API responses ki Cache-Control: no-store (proxy/browser lo PII cache avvakunda).
    """
    _priv = (request.url.path.startswith(("/api/interest", "/api/credits", "/api/views", "/api/saved",
                                          "/api/blocks", "/api/referral", "/api/leads", "/api/admin",
                                          "/api/verification", "/api/consent", "/api/auth"))
             or bool(request.headers.get("x-tsap-token")) or bool(request.headers.get("x-admin-key")))
    try:
        if request.method == "POST":
            limited = rate_limit_hit(request)
            if limited:
                resp = too_many(limited)
                apply_security_headers(resp.headers)
                return resp
    except Exception:
        pass
    if request.url.path in ("/docs", "/redoc", "/openapi.json") and not dev_mode() and not is_admin(request):
        resp = JSONResponse(status_code=404, content={
            "success": False, "error": "docs_disabled",
            "message_telugu": "🔒 API docs public గా లేదు — admin key (X-Admin-Key) తో మాత్రమే చూడొచ్చు"})
        apply_security_headers(resp.headers)
        return resp
    _t0 = None
    try:
        import time as _time
        _t0 = _time.time()
    except Exception:
        pass
    response = await call_next(request)
    try:
        if _t0 is not None:
            import time as _time
            response.headers["X-Process-Time"] = "%.3f" % (_time.time() - _t0)
    except Exception:
        pass
    try:
        # 🌊 WAVE 22 — mutation autosave (debounced 5s, 2xx only)
        if request.method in ("POST", "PUT", "PATCH", "DELETE") and 200 <= response.status_code < 300:
            DBSTORE.save(DBSTORE.snapshot(DB_USERS, DB_INTERESTS, DB_PAYMENTS, DB_OTPS,
                                           VERIFIED_PHONES, DB_VIEWS, DB_SAVES, DB_DIGEST))
    except Exception:
        pass
    try:
        apply_security_headers(response.headers)
        if _priv and request.method == "GET":
            response.headers.setdefault("Cache-Control", "no-store, no-cache, must-revalidate, private")
        if (request.headers.get("x-forwarded-proto") or "").lower() == "https":
            response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    except Exception:
        pass
    return response


# 🛡️ CORS FIX (P0, re-verified): mundu "*" + credentials (browser security hole).
# Ippudu strict env allowlist ONLY — the previous `allow_origin_regex=r".*"` here
# was a bug that silently re-opened the exact hole this comment claims to have
# fixed: Starlette's CORSMiddleware allows an origin if it matches EITHER
# `allow_origins` OR `allow_origin_regex`, so `r".*"` matched every possible
# Origin header, reflected it back, and paired it with
# `allow_credentials=True` — i.e. any website on the internet could make
# credentialed cross-origin requests to this API. Verified exploitable via
# `curl -H "Origin: https://evil-attacker-site.com"` before this fix (got
# `access-control-allow-origin: https://evil-attacker-site.com` +
# `access-control-allow-credentials: true` back). The real website never
# needed this: `frontend/next.config.mjs` proxies all `/api/*` calls
# server-side (Next.js rewrites), so the browser never makes a cross-origin
# call to this backend in production — CORS here only matters for direct
# API consumers (admin subdomain, mobile app, API testing), which the
# explicit `CORS_ORIGINS` env allowlist already covers.
_CORS_ORIGINS = [o.strip() for o in (os.getenv("CORS_ORIGINS") or
                "https://manavivaha.in,https://www.manavivaha.in,http://localhost:3000,"
                "http://127.0.0.1:3000,http://localhost:8000").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "*"],
    allow_headers=["*"],
)

# In-memory DB (real lo Postgres)
DB_USERS = []
DB_INTERESTS = []
DB_VIEWS = []          # {"tsap_id": who got viewed, "viewer_id": who viewed, "at": iso}
DB_SAVES = []          # shortlist: {"tsap_id": owner, "saved_id": saved profile, "at": iso}
DB_DIGEST = []         # daily digest log
DB_OTPS = {}           # {"phone": {"code_hash": HMAC, "expires": iso, "tries": n}}
_OTP_VERIFY_LOCK = threading.Lock()  # one login verification per OTP, even under concurrent retries
_OTP_SEND_LOCK = threading.Lock()  # one resend decision per phone, even under concurrent requests
VERIFIED_PHONES = set()  # OTP-verified numbers (legacy checks)
VERIFIED_PHONE_AT = {}  # recent verification timestamps for short-lived partner sessions
DB_REPORTS = safety.DB_REPORTS      # safety reports (moderation queue)
DB_BLOCKS = safety.DB_BLOCKS        # block list (search/interest lo respect avutundi)
DB_PAYMENTS = []


def _persist_core_state():
    """Persist user, payment, referral, and consent state after money mutations."""
    try:
        return DBSTORE.save(DBSTORE.snapshot(DB_USERS, DB_INTERESTS, DB_PAYMENTS, DB_OTPS,
                                             VERIFIED_PHONES, DB_VIEWS, DB_SAVES, DB_DIGEST), force=True)
    except Exception as exc:
        print("[DB] payment-state save failed:", str(exc)[:100])
        return False


def _restore_user_snapshot(before_values: List[Dict], before_refs: Optional[List[Dict]] = None) -> None:
    """Restore DB_USERS in place so cross-module references cannot retain a failed mutation."""
    refs = before_refs or []
    if refs and len(refs) == len(before_values):
        for ref, previous in zip(refs, before_values):
            ref.clear()
            ref.update(previous)
        DB_USERS[:] = refs
    else:
        DB_USERS[:] = before_values
    _reindex_users()


def _retention_save() -> bool:
    """🗑️ WAVE 40 — persist a retention change before reporting success."""
    try:
        saved = DBSTORE.save(DBSTORE.snapshot(DB_USERS, DB_INTERESTS, DB_PAYMENTS, DB_OTPS,
                                             VERIFIED_PHONES, DB_VIEWS, DB_SAVES, DB_DIGEST), force=True)
        if not saved:
            print("[RETENTION] save returned false")
        return bool(saved)
    except Exception as e:
        print("[RETENTION] save fail:", str(e)[:80])
        return False


def _retention_cycle(years: Optional[int] = None) -> dict:
    """Archive, delete, and durably commit retention as one reversible operation.

    The retention module mutates the live lists after creating its archive. If the
    core snapshot cannot be committed, restore those list contents immediately so
    a failed admin request or scheduled run cannot silently delete active records.
    """
    before = (list(DB_USERS), list(DB_INTERESTS), list(DB_VIEWS), list(DB_SAVES))
    result = RETENTION.run(DB_USERS, DB_INTERESTS, DB_VIEWS, DB_SAVES, years=years)
    if result.get("deleted"):
        if not _retention_save():
            DB_USERS[:] = before[0]
            DB_INTERESTS[:] = before[1]
            DB_VIEWS[:] = before[2]
            DB_SAVES[:] = before[3]
            _reindex_users()
            raise RuntimeError("retention archive was created but the active database could not be saved")
        _reindex_users()
    return result
DB_POSTS = []
DB_REFERRALS = []

# Helper — unique Profile ID (MV1001, MV1002, MV1003...)
def unique_tsap_id(caste: str = "") -> str:
    # Super Easy & Clean Profile ID: MV1001, MV1002, MV1003... (MV prefix + 4-digit sequence starting at 1001).
    prefix = "MV"
    existing = {str(u.get("tsap_id") or "").upper() for u in DB_USERS}
    
    highest = 1000
    for tid in existing:
        if tid.startswith("MV"):
            num_part = tid[2:]
            if num_part.isdigit():
                highest = max(highest, int(num_part))
        elif tid.startswith("TSAP-"):
            parts = tid.split("-")
            if parts and parts[-1].isdigit():
                highest = max(highest, int(parts[-1]))
        elif any(tid.startswith(c) for c in ["RED", "KAM", "KAP", "BRA", "VYS", "VEL"]):
            # Also read 3-letter codes
            num_part = tid[3:]
            if num_part.isdigit():
                highest = max(highest, int(num_part))

    next_num = highest + 1
    for _ in range(2000):
        candidate_id = f"{prefix}{next_num:04d}"
        if candidate_id not in existing:
            return candidate_id
        next_num += 1
    return f"{prefix}{random.randint(1001, 9999)}"


def verify_webhook_signature(header_sig: str, secret: str, payload: str = "") -> bool:
    """
    🐞 FIX (B02): Razorpay webhook HMAC-SHA256 — **raw body** pai verify (timing-safe).
    Mundu `payload or header_sig` hash cheyyadam valla verification always fail/wrong ayye
    (+ main.py lo `request` param lekapote NameError silent ga swallow avvadam valla check dead code).
    """
    import hmac as _hmac, hashlib as _hashlib
    if not secret or not header_sig or payload in (None, "", b""):
        return False
    try:
        raw = payload.encode("utf-8") if isinstance(payload, str) else bytes(payload)
        if not raw:
            return False
        expected = _hmac.new(secret.encode("utf-8"), raw, _hashlib.sha256).hexdigest()
        return _hmac.compare_digest(str(header_sig).strip().lower(), expected.lower())
    except Exception:
        return False


def _mask_queue_result(res: Dict[str, Any], phone: str = "") -> Dict[str, Any]:
    """
    🔒 Queue result lo raw phone numbers vaddhu (owner endpoint/register response lo kooda mask).
    numbers policy: personal contact data is masked before public responses
    """
    out = dict(res or {})
    if phone:
        out.pop("manual_text_phone", None)
    for key in ("targets",):
        if isinstance(out.get(key), list):
            out[key] = [mask_phone(str(x)) for x in out[key]]
    if out.get("target"):
        out["target"] = mask_phone(str(out["target"]))
    inner = out.get("wa_result")
    if isinstance(inner, dict):
        out["wa_result"] = _mask_queue_result(inner, phone)
    return out


def mask_pii(obj):
    """Public responses లో 10-digit numbers ని mask (values + dict KEYS + strings) — PII fix."""
    if isinstance(obj, dict):
        import re as _re
        out = {}
        for k, v in obj.items():
            _k = str(k)
            if _re.fullmatch(r"(?:\+?91)?[6-9]\d{9}", _k):
                _k = mask_phone(_k[-10:])
            out[_k] = mask_pii(v)
        return out
    if isinstance(obj, list):
        return [mask_pii(v) for v in obj]
    if isinstance(obj, str):
        import re as _re
        return _re.sub(r"(?<!\d)(?:\+?91[-\s]?)?([6-9]\d{9})(?!\d)", lambda m: mask_phone(m.group(1)), obj)
    return obj


@app.get("/")
def root():
    return {"message": "TSAP Matrimony API — Ultra Advanced, Deep, Never Before 🔥", "status": "LIVE", "version": "2.0", "chatting": False, "model": "Interest request + WhatsApp profile share",
            "endpoints": ["/api/register","/api/search/{id}","/api/matches/{id}","/api/plans","/api/credits/{id}",
                          "/api/credits/buy","/api/interest/send","/api/interest/inbox/{id}","/api/interest/sent/{id}",
                          "/api/interest/respond","/api/interest/status/{id}","/api/wa/status","/api/wa/pause","/api/wa/resume",
                          "/api/payment/webhook","/api/channels","/api/publish/status","/api/publish/log"]}

_REGISTER_LOCK = threading.Lock()  # WAVE 27: concurrent register same-ID ban
_INTEREST_LOCKS = defaultdict(threading.Lock)  # WAVE 27: per-sender lock (double-send ban)


def _registration_request_hash(value: str) -> str:
    """Hash a client retry key before it enters the durable profile record.

    The raw key is a browser recovery capability, not member data.  Keeping only
    a digest lets a lost registration response be safely replayed without making
    the key (or a reusable bearer token) visible through profile endpoints.
    """
    return hashlib.sha256(str(value or "").encode("utf-8")).hexdigest() if value else ""


def _registration_recovery_response(user: Dict[str, Any]) -> RegisterResponse:
    """Return a safe success response for a same-key registration retry.

    A mobile network can drop the original 2xx after the durable checkpoint. A
    retry must not create a second account or force the member into a misleading
    duplicate error. This deliberately does not rerun referral, card, or
    notification side effects; those were part of the original request.
    """
    tsap_id = str(user.get("tsap_id") or "").strip().upper()
    channels = user.get("auto_post_channels") if isinstance(user.get("auto_post_channels"), list) else []
    return RegisterResponse(
        tsap_id=tsap_id,
        auth_token=sign_token(tsap_id),
        phone_masked=mask_phone(str(user.get("phone") or "")),
        phone_verified=bool(user.get("phone_verified")),
        is_approved=bool(user.get("is_approved")),
        duplicate_phone=False,
        quality=profile_completeness(user),
        card_url=str(user.get("card_url") or ""),
        credits=int(user.get("credits", 3) or 0),
        message_telugu="✅ మీ నమోదు ఇప్పటికే భద్రంగా ఉంది. కనెక్షన్ తిరిగి ప్రయత్నించినందుకు అదే ప్రొఫైల్‌ను తెరిచాం; కొత్త అకౌంట్ సృష్టించలేదు.",
        message_plan_telugu="🔒 Contact details are private and become available only through the accepted-request account flow.",
        next_steps=["Profile review (timing may vary)", "Complete remaining details in My Profile", "Use your profile ID to sign in or recover this session"],
        auto_post_queue=[str(value) for value in channels],
        top_3_matches=[],
        publish_queued=bool(user.get("publish_queued")),
        publish_targets=list(user.get("publish_targets") or []),
        publish_reason=str(user.get("publish_reason") or "awaiting_profile_approval"),
        namaste_queued=bool((user.get("welcome_status") or {}).get("queued")),
        welcome_status=user.get("welcome_status") if isinstance(user.get("welcome_status"), dict) else None,
        share_kit=share_kit(user, tsap_id),
        share_text=build_share_text(user, tsap_id),
        referral={
            "my_code": user.get("referral_code", ""),
            "my_alias": user.get("referral_alias", ""),
            "my_link": user.get("referral_link", ""),
            "joined_with": {"ok": bool(user.get("referred_by")), "reason": "recovered_registration"},
            "dashboard": "/referral",
        },
        welcome_pack=None,
    )


def _early_registration_recovery(phone_value: str, password_value: str, registration_key_value: str):
    """Recover a committed registration before requiring the upload again.

    A browser refresh may lose the in-memory File object. The same key is still
    safe to recover without re-uploading because it must match the normalized
    phone and the stored password hash; it never authorizes a new profile.
    """
    key = clean(registration_key_value, 128, "registration_key")
    if not key:
        return None
    if not re.fullmatch(r"[A-Za-z0-9_-]{16,128}", key):
        raise HTTPException(400, "Registration retry key is invalid; please reload the form and try again")
    try:
        retry_phone = req_phone(phone_value, "phone")
    except HTTPException:
        return None
    password = str(password_value or "").strip()
    if not 6 <= len(password) <= 72:
        return None
    key_hash = _registration_request_hash(key)
    with _REGISTER_LOCK:
        key_user = next((u for u in DB_USERS
                         if key_hash and hmac.compare_digest(str(u.get("registration_key_hash") or ""), key_hash)), None)
        if key_user is None:
            return None
        if str(key_user.get("phone") or "") != retry_phone:
            raise HTTPException(409, "This registration retry key is already bound to another profile. Start a new registration.")
        if key_user.get("status") in {"deleted", "banned"} or not _check_password(password, str(key_user.get("password_hash") or "")):
            raise HTTPException(409, "This registration retry key cannot recover the profile with those credentials. Please sign in or start a new registration.")
        return _registration_recovery_response(key_user)


@app.post("/api/register", response_model=RegisterResponse)
async def register(
    gender: str = Form(...),
    height: str = Form(""),
    marital_status: str = Form(""),
    children: str = Form(""),
    caste: str = Form(...),
    caste_custom: str = Form(""),
    sub_caste: str = Form(""),
    sub_caste_custom: str = Form(""),
    gothram: str = Form(""),
    star: str = Form(""),
    education: str = Form(""),
    job: str = Form(""),
    salary: str = Form(""),
    state: str = Form(""),
    district: str = Form(""),
    mandal: str = Form(""),
    phone: str = Form(...),
    password: str = Form(""),
    referral_code: str = Form(""),
    referral_invite: str = Form(""),   # 💎 per-person invite token from /r/<code>?inv=TOKEN
    photo_private: bool = Form(True),
    expectations: str = Form(""),
    # Advanced fields - optional for backward compat
    full_name: str = Form(""),
    dob: str = Form(""),
    dob_correct: bool = Form(False),
    birth_time: str = Form(""),
    father_name: str = Form(""),
    mother_name: str = Form(""),
    father_occupation: str = Form(""),
    mother_occupation: str = Form(""),
    native_place: str = Form(""),
    education_detail: str = Form(""),
    work_location: str = Form(""),
    about_myself: str = Form(""),
    current_city: str = Form(""),
    email: str = Form(""),
    rasi: str = Form(""),
    dosham: str = Form(""),
    family_type: str = Form(""),
    company: str = Form(""),
    # Expectations builder
    exp_age_min: str = Form(""),
    exp_age_max: str = Form(""),
    exp_job: str = Form(""),
    exp_location: str = Form(""),
    exp_caste: str = Form(""),
    # Advanced optional — form anni fields API ki vellali (lekapothe card lo blank vasthundi)
    weight: str = Form(""),
    blood_group: str = Form(""),
    mother_tongue: str = Form(""),
    physical_status: str = Form(""),
    body_type: str = Form(""),
    complexion: str = Form(""),
    family_values: str = Form(""),
    family_status: str = Form(""),
    brothers: str = Form(""),
    brothers_married: str = Form(""),
    sisters: str = Form(""),
    sisters_married: str = Form(""),
    moola_nakshatram: str = Form(""),
    religion: str = Form(""),
    country: str = Form(""),
    college: str = Form(""),
    experience: str = Form(""),
    work_type: str = Form(""),
    pincode: str = Form(""),
    photo_url: str = Form(""),        # ignored: profile photos must be uploaded as a validated file
    photo_file: UploadFile | None = File(None),
    upload_token: str = Form(""),
    registration_key: str = Form(""),  # opaque client retry key; never trusted as identity
    phone_verified: bool = Form(False),  # ignored: client cannot attest server-side OTP verification
    consent_confirmed: bool = Form(False),
    photo_consent_confirmed: bool = Form(False),
):
    """
    Pin-to-Pin Register Flow:
    1. Validate OTP (mock)
    2. Generate ID: TSAP-M-2025-XXXX
    3. Store registration data; public serializers remove contact fields
    4. Generate card (Pillow)
    5. Referral code generate for this user
    6. Auto-post queue: Main 4 + Caste + Special
    7. Return up to three recent profile comparisons using member-entered facts
    8. Return ID + card + profile summaries
    """
    recovered = _early_registration_recovery(phone, password, registration_key)
    if recovered is not None:
        return recovered

    # 1. Validate & Smart Normalization
    if not req_bool(consent_confirmed):
        raise HTTPException(400, "Please confirm the profile-submission consent before registering")
    if not req_bool(photo_consent_confirmed):
        raise HTTPException(400, {
            "reason": "PHOTO_CONSENT_REQUIRED",
            "message_en": "Confirm that you have permission to upload this photo.",
            "message_telugu": "ఈ ఫోటోను అప్‌లోడ్ చేయడానికి మీకు అనుమతి ఉందని నిర్ధారించండి.",
            "en": "Confirm that you have permission to upload this photo.",
            "te": "ఈ ఫోటోను అప్‌లోడ్ చేయడానికి మీకు అనుమతి ఉందని నిర్ధారించండి.",
        })
    if photo_file is None:
        raise HTTPException(400, {
            "reason": "PHOTO_REQUIRED",
            "message_en": "A clear profile photo is required before registration.",
            "message_telugu": "నమోదుకు ముందు స్పష్టమైన ప్రొఫైల్ ఫోటోను జోడించండి.",
            "en": "A clear profile photo is required before registration.",
            "te": "నమోదుకు ముందు స్పష్టమైన ప్రొఫైల్ ఫోటోను జోడించండి.",
        })
    photo_data = await photo_file.read(5 * 1024 * 1024 + 1)
    photo_verdict = validate_photo(photo_data, photo_file.filename or "")
    if not photo_verdict["ok"]:
        raise HTTPException(422, {
            "reason": photo_verdict["reason"],
            "message_en": photo_verdict["en"],
            "message_telugu": photo_verdict["te"],
            "en": photo_verdict["en"],
            "te": photo_verdict["te"],
            "checks": photo_verdict["checks"],
        })
    try:
        photo_data = sanitize_photo(photo_data, photo_verdict["checks"]["format"])
        photo_verdict["checks"]["sanitized_bytes"] = len(photo_data)
    except ValueError:
        raise HTTPException(422, {
            "reason": "PHOTO_SANITIZE_FAILED",
            "message_en": "The photo could not be safely prepared. Please choose another image.",
            "message_telugu": "ఫోటోను సురక్షితంగా సిద్ధం చేయలేకపోయాం — మరో అసలు ఫోటోను ఎంచుకోండి.",
            "en": "The photo could not be safely prepared. Please choose another image.",
            "te": "ఫోటోను సురక్షితంగా సిద్ధం చేయలేకపోయాం — మరో అసలు ఫోటోను ఎంచుకోండి.",
            "checks": photo_verdict["checks"],
        })

    # The retry key is only an opaque client capability, not member data; it is
    # bound to the durable profile below and cannot attest phone verification or identity.
    registration_key = clean(registration_key, 128, "registration_key")
    if registration_key and not re.fullmatch(r"[A-Za-z0-9_-]{16,128}", registration_key):
        raise HTTPException(400, "Registration retry key is invalid; please reload the form and try again")
    registration_key_hash = _registration_request_hash(registration_key)

    # Referral inputs are bounded and allow-listed before they reach the referral
    # ledger.  Invalid codes simply fail the optional referral attachment later;
    # they cannot become an unbounded stored/logged string.
    referral_code = clean(referral_code, 80, "referral_code").upper()
    referral_invite = clean(referral_invite, 64, "referral_invite").upper()
    if referral_code and not re.fullmatch(r"[A-Z0-9_-]{1,80}", referral_code):
        raise HTTPException(400, "Referral code format is invalid")
    if referral_invite and not re.fullmatch(r"[A-Z0-9_-]{1,64}", referral_invite):
        raise HTTPException(400, "Referral invite format is invalid")

    # Never trust a caller-supplied external photo URL or preapproved status.
    photo_url = ""
    religion = req_choice(religion, "religion", MP.RELIGIONS)
    _g_clean = str(gender or "").strip().lower()
    if _g_clean in ["bride", "female", "f", "అమ్మాయి", "వధువు", "woman", "girl"] or "bride" in _g_clean or "female" in _g_clean:
        gender = "Bride"
    elif _g_clean in ["groom", "male", "m", "అబ్బాయి", "వరుడు", "man", "boy"] or "groom" in _g_clean or "male" in _g_clean:
        gender = "Groom"
    else:
        raise HTTPException(400, "⚠️ Gender must be Groom or Bride (వరుడు లేదా వధువు)")

    _ms_clean = str(marital_status or "").strip().lower()
    if is_never_married_status(_ms_clean):
        marital_status = "Pelli Kaledu"
    elif any(k in _ms_clean for k in ["divorc", "vidak", "విడాకు"]):
        marital_status = "Divorced"
    elif any(k in _ms_clean for k in ["widow", "vidh", "వితంతు", "విధురు"]):
        marital_status = "Widow" if gender == "Bride" else "Widower"
    elif any(k in _ms_clean for k in ["await", "separat", "నిరీక్షణ"]):
        marital_status = "Awaiting Divorce"

    phone = req_phone(phone, "phone")
    password = str(password or "").strip()
    if len(password) < 6:
        raise HTTPException(400, "🔑 Password minimum 6 characters")
    if len(password) > 72:
        raise HTTPException(400, "🔑 Password maximum 72 characters")
    full_name = req_text(full_name, "full_name", 2, 60, required=True,
                         pattern=NAME_RE, pattern_msg="⚠️ Name లో letters మాత్రమే (2-60 chars)")

    dob = req_text(dob, "dob", 10, 10, required=True)
    try:
        _dob_d = datetime.strptime(dob, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(400, "Enter a valid date of birth in YYYY-MM-DD format")
    if _dob_d.isoformat() != dob:
        raise HTTPException(400, "Enter a valid date of birth in YYYY-MM-DD format")
    _today_ist = datetime.now(timezone(timedelta(hours=5, minutes=30))).date()
    if _dob_d > _today_ist:
        raise HTTPException(400, "🎂 Date of birth cannot be in the future")
    age = _today_ist.year - _dob_d.year - ((_today_ist.month, _today_ist.day) < (_dob_d.month, _dob_d.day))
    minimum_age = 21 if gender == "Groom" else 18
    if age < minimum_age:
        raise HTTPException(400, f"⚠️ Minimum age is {minimum_age} for this profile")
    if age > 100:
        raise HTTPException(400, "Enter a valid date of birth")

    marital_options = ["Pelli Kaledu", "Divorced", "Awaiting Divorce", "Separated", "Widow" if gender == "Bride" else "Widower"]
    marital_status = req_choice(marital_status, "marital_status", marital_options, required=False, default="")
    # Ignore child counts sent by stale drafts/older clients for first-marriage profiles.
    children = "" if is_never_married_status(marital_status) else req_choice(
        children, "children", ["None", "1", "2", "3", "4+"], required=False, default="")

    community_options = MP.castes_for(religion)["castes"]
    if str(caste or "").strip() == "Other / self-described":
        caste = req_text(caste_custom, "caste_custom", 2, 100, required=True)
    else:
        caste = req_choice(caste, "caste", community_options)
    if str(sub_caste or "").strip() == "Other / self-described":
        sub_caste = req_text(sub_caste_custom, "sub_caste_custom", 2, 100, required=True)
    else:
        _known_subcastes = community_subcastes_for(religion, caste)
        if _known_subcastes and str(sub_caste or "").strip():
            sub_caste = req_choice(sub_caste, "sub_caste", _known_subcastes, required=False, default="")
        else:
            # Some communities have no reliable catalog entry; preserve member wording.
            sub_caste = req_text(sub_caste, "sub_caste", 0, 100, required=False)

    height = req_text(height, "height", 0, 12, required=False)
    education = req_text(education, "education", 0, 60, required=False)
    job = req_text(job, "job", 0, 100, required=False)
    _reject_groom_homemaker(gender, job, work_type)
    salary = req_text(salary, "salary", 0, 40, required=False)
    state = req_choice(state, "state", ["TS", "AP", "Other"])
    district = req_text(district, "district", 2, 80, required=True)
    district = canonicalize_district(state, district)
    if state == "TS" and district not in TS_DISTRICTS_LIST:
        raise HTTPException(400, "District does not match the selected state")
    if state == "AP" and district not in AP_DISTRICTS_LIST:
        raise HTTPException(400, "District does not match the selected state")

    family_status = req_choice(family_status, "family_status",
                               ["Middle Class", "Upper Middle Class", "Rich / Affluent (Elite)",
                                "Lower Middle", "Middle class", "Upper middle class", "Upper Middle",
                                "Rich", "Affluent"], required=False, default="")
    _fam_map = {"Lower Middle": "Middle Class", "Middle class": "Middle Class",
                "Upper middle class": "Upper Middle Class", "Upper Middle": "Upper Middle Class",
                "Rich": "Rich / Affluent (Elite)", "Affluent": "Rich / Affluent (Elite)"}
    family_status = _fam_map.get(family_status, family_status)

    # Optional profile attributes are stored only when actually supplied.
    birth_time = req_text(birth_time, "birth_time", 0, 30, required=False)
    gothram = req_text(gothram, "gothram", 0, 100, required=False)
    star = req_text(star, "star", 0, 50, required=False)
    rasi = req_text(rasi, "rasi", 0, 50, required=False)
    dosham = req_text(dosham, "dosham", 0, 80, required=False)
    family_type = req_text(family_type, "family_type", 0, 60, required=False)
    education_detail = req_text(education_detail, "education_detail", 0, 100, required=False)
    work_location = req_text(work_location, "work_location", 0, 100, required=False)
    about_myself = req_text(about_myself, "about_myself", 0, 600, required=False, allow_newlines=True)
    father_name = req_text(father_name, "father_name", 0, 60, required=False)
    mother_name = req_text(mother_name, "mother_name", 0, 60, required=False)
    father_occupation = req_text(father_occupation, "father_occupation", 0, 80, required=False)
    mother_occupation = req_text(mother_occupation, "mother_occupation", 0, 80, required=False)
    native_place = req_text(native_place, "native_place", 0, 100, required=False)
    current_city = req_text(current_city, "current_city", 0, 100, required=False)
    mandal = req_text(mandal, "mandal", 0, 100, required=False)
    company = req_text(company, "company", 0, 100, required=False)
    mother_tongue = req_text(mother_tongue, "mother_tongue", 0, 60, required=False)
    physical_status = req_text(physical_status, "physical_status", 0, 60, required=False)
    body_type = req_text(body_type, "body_type", 0, 60, required=False)
    complexion = req_text(complexion, "complexion", 0, 60, required=False)
    family_values = req_text(family_values, "family_values", 0, 100, required=False)
    weight = req_text(weight, "weight", 0, 20, required=False)
    blood_group = req_text(blood_group, "blood_group", 0, 10, required=False)
    college = req_text(college, "college", 0, 100, required=False)
    experience = req_text(experience, "experience", 0, 40, required=False)
    work_type = req_text(work_type, "work_type", 0, 80, required=False)
    pincode = req_text(pincode, "pincode", 0, 10, required=False)
    exp_age_min = req_text(exp_age_min, "exp_age_min", 0, 3, required=False)
    exp_age_max = req_text(exp_age_max, "exp_age_max", 0, 3, required=False)
    exp_job = req_text(exp_job, "exp_job", 0, 80, required=False)
    exp_location = req_text(exp_location, "exp_location", 0, 100, required=False)
    exp_caste = req_text(exp_caste, "exp_caste", 0, 100, required=False)
    brothers = req_text(brothers, "brothers", 0, 20, required=False)
    brothers_married = req_text(brothers_married, "brothers_married", 0, 20, required=False)
    sisters = req_text(sisters, "sisters", 0, 20, required=False)
    sisters_married = req_text(sisters_married, "sisters_married", 0, 20, required=False)
    moola_nakshatram = req_text(moola_nakshatram, "moola_nakshatram", 0, 60, required=False)
    expectations = req_text(expectations, "expectations", 0, 600, required=False, allow_newlines=True)
    email = req_text(email, "email", 0, 80, required=False)
    if email and not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        raise HTTPException(400, "Enter a valid email address")
    country = req_text(country, "country", 0, 60, required=False)
    _about = about_myself
    if _about and len(_about) < 50:
        raise HTTPException(400, "⚠️ About yourself — minimum 50 characters")
    if re.search(r"(?<!\d)(?:\+?91[\s-]?)?[6-9]\d{9}(?!\d)", _about) or ("@" in _about and "." in _about.split("@")[-1]):
        raise HTTPException(400, "🔒 Do not add a phone number or email to About — keep contact details private")

    # 2. ID Gen
    # WAVE 27 — ID-gen + append atomic (double-submit → rendu veru IDs, duplicate ID never)
    with _REGISTER_LOCK:
        # 🛡️ R9 — duplicate phone REJECT (same phone cannot create multiple accounts)
        _existing_phone_user = next((u for u in DB_USERS
                                     if u.get("phone") == phone and not u.get("seed_source")), None)
        _existing_key_user = next((u for u in DB_USERS
                                   if registration_key_hash
                                   and hmac.compare_digest(str(u.get("registration_key_hash") or ""), registration_key_hash)), None)
        if _existing_key_user is not None and _existing_key_user is not _existing_phone_user:
            # A session-storage key cannot be replayed to bind a second phone
            # or a second profile. This also closes the two-tab race where both
            # tabs share one key but submit different forms.
            raise HTTPException(409, "This registration retry key is already bound to another profile. Start a new registration.")
        _dup_phone = _existing_phone_user is not None
        if _dup_phone:
            # A browser retry after a lost response carries the same opaque key.
            # Recover the already-created account instead of returning a false
            # invitation to create another one.  A key never authorizes a
            # different phone or profile.
            if (_existing_phone_user.get("status") not in {"deleted", "banned"}
                    and registration_key_hash
                    and hmac.compare_digest(str(_existing_phone_user.get("registration_key_hash") or ""), registration_key_hash)
                    and _check_password(password, str(_existing_phone_user.get("password_hash") or ""))):
                return _registration_recovery_response(_existing_phone_user)
            abuse_log("duplicate_phone_register", phone[:3] + "****")
            abuse_count("duplicate_phone_registers")
            raise HTTPException(409, "📱 ఈ మొబైల్ నంబర్‌తో ప్రొఫైల్ ఇప్పటికే నమోదై ఉంది (already account exists with this mobile number). ఒకే వ్యక్తి ఒకే ప్రొఫైల్ నమోదు చేయగలరు — దయచేసి లాగిన్ అవ్వండి.")

        # 🛡️ SMART COMPOSITE DUPLICATE DETECTION — Prevent same person from registering again with different phone
        def _clean_str(s: str) -> str:
            return re.sub(r"[^a-z0-9]", "", str(s or "").lower())

        _norm_name = _clean_str(full_name)
        _norm_father = _clean_str(father_name)
        _norm_dob = str(dob or "").strip()[:10]

        _dup_person = False
        if _norm_name and len(_norm_name) >= 3 and _norm_dob and len(_norm_dob) == 10:
            for u in DB_USERS:
                if u.get("seed_source"):
                    continue
                u_name = _clean_str(u.get("full_name"))
                u_dob = str(u.get("dob") or "").strip()[:10]
                u_father = _clean_str(u.get("father_name"))
                u_district = str(u.get("district") or "").strip().lower()
                u_caste = str(u.get("caste") or "").strip().lower()
                req_district = str(district or "").strip().lower()
                req_caste = str(caste or "").strip().lower()

                # Duplicate screening requires exact normalized name + DOB plus
                # another matching field. It is a review signal, not proof of identity.
                if u_name == _norm_name and u_dob == _norm_dob:
                    same_father = bool(_norm_father and u_father and _norm_father == u_father)
                    same_district_caste = bool(req_district and u_district and req_district == u_district and req_caste and u_caste and req_caste == u_caste)
                    same_caste_only = bool(req_caste and u_caste and req_caste == u_caste and (not _norm_father or not u_father or _norm_father == u_father))

                    if same_father or same_district_caste or same_caste_only:
                        _dup_person = True
                        break

        if _dup_person:
            abuse_log("duplicate_identity_register", _norm_name)
            raise HTTPException(409, "⚠️ ఈ వివరాలతో (పూర్తి పేరు, పుట్టిన తేదీ, తండ్రి పేరు/ప్రాంతం) ప్రొఫైల్ ఇప్పటికే నమోదై ఉంది. ఒక వ్యక్తి ఒక్కసారి మాత్రమే నమోదు చేసుకోవచ్చు. దయచేసి మీ పాత అకౌంట్‌తో లాగిన్ అవ్వండి.")

        tsap_id = unique_tsap_id(caste)
        photo_ext = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}[photo_verdict["checks"]["format"]]
        safe_photo_id = re.sub(r"[^A-Z0-9-]", "", str(tsap_id).upper())[:32]
        photo_name = f"{safe_photo_id}-{secrets.token_hex(8)}.{photo_ext}"
        registration_photo_path = os.path.join(PHOTO_MEDIA_DIR, photo_name)
        try:
            os.makedirs(PHOTO_MEDIA_DIR, exist_ok=True)
            atomic_write_bytes(registration_photo_path, photo_data)
        except Exception as exc:
            raise HTTPException(500, "The photo could not be saved. Please try again.") from exc
        photo_url = f"/photos/{photo_name}"
        photo_uploaded_at = datetime.utcnow().isoformat()

        # referral code — TSAP ID nunchi derive (unique, deterministic) [FIX: mundu undefined `seq` tho crash avutundi]
        my_ref_code = ""   # ensure_referrer_profile() — name nunchi short code (CHA0001 style)

        # 3. Save DB - Advanced Full
        user = {
            "tsap_id": tsap_id,
            "full_name": full_name or f"{gender} User",
            "gender": gender,
            "dob": dob,
            "dob_correct": False,
            "consent_confirmed": True,
            "consent_confirmed_at": datetime.utcnow().isoformat(),
            "consent_version": "profile-data-v1",
            "photo_consent_confirmed": True,
            "photo_consent_confirmed_at": datetime.utcnow().isoformat(),
            "photo_consent_version": "profile-photo-v1",
            "birth_time": birth_time,
            "age": age,
            "height": height,
            "marital_status": marital_status,
            "children": children,
            "caste": caste,
            "sub_caste": sub_caste,
            "gothram": gothram,
            "star": star,
            "rasi": rasi,
            "dosham": dosham,
            "education": education,
            "education_detail": education_detail,
            "job": job,
            "company": company,
            "salary": salary,
            "work_location": work_location,
            "about_myself": about_myself,
            "father_name": father_name,
            "mother_name": mother_name,
            "father_occupation": father_occupation,
            "mother_occupation": mother_occupation,
            "family_type": family_type,
            "native_place": native_place,
            "weight": weight,
            "blood_group": blood_group,
            "mother_tongue": mother_tongue,
            "physical_status": physical_status,
            "body_type": body_type,
            "complexion": complexion,
            "family_values": family_values,
            "family_status": family_status,
            "brothers": brothers,
            "brothers_married": brothers_married,
            "sisters": sisters,
            "sisters_married": sisters_married,
            "moola_nakshatram": moola_nakshatram,
            "religion": religion,
            "country": country,
            "is_nri": _is_nri({"state": state, "country": country, "work_location": work_location, "current_city": current_city}),
            "college": college,
            "experience": experience,
            "work_type": work_type,
            "pincode": pincode,
            "state": state,
            "district": district,
            "mandal": mandal,
            "current_city": current_city,
            "email": email,
            "phone_last4": phone[-4:],
            "phone": phone,
            "password_hash": _hash_password(password) if password else "",
            "referral_code": my_ref_code,
            "referred_by": "",                    # attach_referral() validate chesi lock chestundi (kinda)
            "referred_by_raw": referral_code,     # form lo vachina code (audit)
            # Store only the digest; the raw browser retry capability never enters
            # the profile or any API response.
            "registration_key_hash": registration_key_hash,
            "photo_url": photo_url,
            "photo_urls": [photo_url] if photo_url else [],
            "photo_status": "pending",
            "photo_checks": photo_verdict["checks"],
            "photo_uploaded_at": photo_uploaded_at,
            "card_url": f"/cards/{tsap_id}.png",   # web URL (card files static mount lo undi)
            "is_verified": False,
            # 🌊 WAVE 23 — SECURITY: form nunchi phone_verified=true pampina nammamu!
            #    OTP verify ayithe matrame VERIFIED_PHONES lo untundi (bypass closed).
            "phone_verified": (phone in VERIFIED_PHONES),
            "is_approved": False,
            "photo_private": bool(photo_private),
            "privacy_mode": "private" if photo_private else "public",
            "credits": 3,
            "plan": "FREE",
            "created_at": datetime.utcnow().isoformat(),
            "wallet": 0,
            "referral_stats": {"total":0, "paid_count":0},
            "expectations": expectations,
            "exp_filters": {"ageMin": exp_age_min, "ageMax": exp_age_max, "job": exp_job, "location": exp_location, "caste": exp_caste},
        }
        # Generate the pending/monogram card before the first durable checkpoint
        # so a lost response cannot leave the profile committed without its
        # advertised card metadata.
        card_path = os.path.join(CARD_MEDIA_DIR, f"{tsap_id}.png")
        card_url = f"/cards/{tsap_id}.png"
        _regenerate_profile_card(user)
        DB_USERS.append(user)
        _reindex_users()
        # A successful registration must be on durable storage before the API can
        # return success. The generic request middleware is debounced for routine
        # writes; this explicit checkpoint closes that data-loss window.
        if not DBSTORE.save(DBSTORE.snapshot(DB_USERS, DB_INTERESTS, DB_PAYMENTS, DB_OTPS,
                                             VERIFIED_PHONES, DB_VIEWS, DB_SAVES, DB_DIGEST), force=True):
            DB_USERS.remove(user)
            _reindex_users()
            for artifact in (registration_photo_path, card_path):
                try:
                    os.remove(artifact)
                except OSError:
                    pass
            raise HTTPException(503, "Registration could not be saved safely. No registration was accepted; please retry.")

    # 4. The pending/monogram card was generated and checkpointed with the
    # profile above. Approval and photo moderation regenerate it from the
    # reviewed media path; the local card_path is used only by internal queues.

    # 5. 🤝 REFERRAL 2.0 — validate + lock + referee bonus credit (self-referral block kooda)
    referral_result = {"ok": False, "reason": "no_code"}
    if referral_code:
        try:
            # attach_referral() reads this to close the loop on a per-person invite.
            user["referral_invite_token"] = str(referral_invite or "").strip().upper()[:16]
            referral_result = attach_referral(user, referral_code, DB_USERS)
        except Exception as e:
            referral_result = {"ok": False, "reason": "error", "error": str(e)[:120]}
        finally:
            # Keep a token only when the referral actually locked; otherwise the
            # field would be a stray identifier with no meaning.
            if referral_result.get("ok"):
                user["referred_by_invite"] = user.get("referral_invite_token", "")
            user.pop("referral_invite_token", None)
    # ee user ki sontha referral code (share cheyyadaniki)
    my_referral = ensure_referrer_profile(user, DB_USERS)
    user["referred_by_final"] = user.get("referred_by") or referral_code

    # 5b. 🔔 Referrer ki instant WhatsApp update — "mee friend join ayyaru" (loop close)
    referral_notify = {"referrer_notified": False}
    if referral_result.get("ok"):
        try:
            _ref_user = next((u for u in DB_USERS
                              if str(u.get("referral_code", "")).upper() == str(referral_result.get("referrer_code", "")).upper()
                              or u.get("tsap_id") == referral_result.get("referrer_id")), None)
            if _ref_user:
                _ref_phone = str(_ref_user.get("phone") or "").strip()
                _txt = referrer_join_text(_ref_user, user)
                referral_notify["referrer_name"] = _ref_user.get("full_name", "")
                if _ref_phone and publish_config()["wa_mode"] != "off":
                    _q = enqueue_whatsapp([_ref_phone], _txt, priority=0, kind="referral_join")
                    referral_notify["referrer_notified"] = bool(_q.get("queued"))
                else:
                    referral_notify["manual_text"] = _txt
                    referral_notify["note"] = "WhatsApp bridge connect అయ్యాక automatic గా వెళ్తుంది"
            referral_result["notify"] = referral_notify
        except Exception as e:
            referral_result["notify_error"] = str(e)[:120]

    # 6. Auto-post queue — ADVANCED ROUTER (region + religion + caste + specials)
    route = route_profile({
        "gender": gender, "state": state, "caste": caste, "age": age,
        "marital_status": marital_status, "job": job, "education": education,
        "district": district, "photo_private": photo_private,
    })
    auto_queue = route["usernames"]
    user["auto_post_channels"] = auto_queue
    user["auto_post_reasons"] = route["reasons"]
    user["post_hashtags"] = route["hashtags"]

    # 6b. Publish only after moderation approval; a new registration is not approved yet.
    pub = {"queued": False, "targets": [], "reason": "awaiting_profile_approval"}
    if user.get("is_approved") and publish_config()["auto_post_on_approval"]:
        pub = enqueue(user, tsap_id,
                      photo_path=card_path if user.get("card_generated") and not photo_private else None)
        user["publish_targets"] = pub["targets"]
    user["publish_queued"] = bool(pub.get("queued"))

    # 6c. Optional WhatsApp welcome: queue only when the operator has explicitly
    # enabled a WhatsApp mode; otherwise return the prepared text without claiming delivery.
    welcome = {"queued": False, "admin_alert": False}
    try:
        cfg_wa = publish_config()
        _welcome_msg = namaste_text(user, tsap_id)
        if referral_result.get("ok"):
            # referral tho vachina user ki extra line (friend peru + mee sontha code)
            _ref_user2 = next((u for u in DB_USERS if u.get("tsap_id") == referral_result.get("referrer_id")), None)
            if _ref_user2:
                _welcome_msg = _welcome_msg + "\n\n" + referee_welcome_text(user, _ref_user2)
        welcome["manual_text"] = _welcome_msg

        if cfg_wa["wa_mode"] != "off" and phone:
            w1 = enqueue_whatsapp([phone], _welcome_msg, image_path=card_path,
                                  priority=0, kind="namaste_welcome")
            welcome["queued"] = bool(w1.get("queued"))
            welcome["wa_result"] = w1
            admin_no = os.getenv("ADMIN_WHATSAPP_NUMBER", "").strip()
            if admin_no:
                w2 = enqueue_whatsapp([admin_no], admin_new_profile_text(user, tsap_id, source="website"),
                                      image_path=card_path, priority=1, kind="admin_new_profile")
                welcome["admin_alert"] = bool(w2.get("queued"))
        elif phone:
            welcome["note"] = "WhatsApp mode is off; a welcome text is prepared but was not queued or sent."
        user["welcome_status"] = welcome
    except Exception as e:
        welcome["error"] = str(e)[:140]

    # 6d. VISITOR -> LEAD conversion (register chesinappudu lead ni close cheyyali)
    try:
        ok_lead, _kind, _lead = save_lead(user.get("full_name", ""), phone, gender=gender,
                                          district=district, caste=caste, age=str(age),
                                          source="register")
        if ok_lead and _lead:
            _lead["status"] = "converted"
            _lead["tsap_id"] = tsap_id
            user["lead_id"] = _lead["id"]
    except Exception:
        pass

    # 7. Candidate profiles for review. No synthetic compatibility score is generated.
    opposite = "Bride" if gender == "Groom" else "Groom"
    candidates = [
        u for u in DB_USERS
        if _is_approved_profile(u)
        and str((u or {}).get("gender", "")) == opposite
        and str((u or {}).get("tsap_id", "")) != tsap_id
    ]
    selected = topmatch.find_top_matches_v2(user, candidates, limit=3)
    top_matches = []
    for row in selected:
        cand = row.get("profile") or {}
        top_matches.append(MatchResult(
            matched_user_id=str(cand.get("tsap_id", "")),
            observations=(row.get("observations") or [])[:4],
        ))

    # 7b. 🎁 WELCOME PACK — "register avvagane mee WhatsApp ki 3 profiles + caste channel links"
    #     (numbers 🔒 — profile links + caste Telegram/WhatsApp channel links matrame)
    _cand_map = {str(c.get("tsap_id", "")): c for c in candidates}
    _pack_matches = [{"profile": _cand_map.get(m.matched_user_id, {})} for m in top_matches]
    welcome_pack = build_welcome_pack(user, tsap_id, _pack_matches, directory_links=_public_channel_links())
    pack_queue: Dict[str, Any] = {"queued": False, "kind": "welcome_pack_3profiles"}
    try:
        _cfg_wa3 = publish_config()
        if _cfg_wa3["wa_mode"] != "off" and phone:
            _wq = enqueue_whatsapp([phone], welcome_pack["message_text"], priority=0,
                                   kind="welcome_pack_3profiles")
            pack_queue["queued"] = bool(_wq.get("queued"))
            pack_queue["wa_result"] = _wq
            pack_queue["note_telugu"] = ("WhatsApp queueలో ఒక message పెట్టాం; delivery నిర్ధారణ లేదు.")
        else:
            pack_queue["note_telugu"] = ("WhatsApp mode off — message text responseలో ఉంది; queue లేదా delivery జరగలేదు.")
            pack_queue["manual_text"] = welcome_pack["message_text"]
    except Exception as _e:
        pack_queue["error"] = str(_e)[:140]
    pack_queue = _mask_queue_result(pack_queue, phone)   # 🔒 response lo raw phone vaddhu (mask matrame)
    welcome_pack["queue"] = pack_queue
    user["welcome_pack_queue"] = pack_queue

    # 🛡️ sanitize free-text (XSS / control chars / huge payload fix)
    for _k, _n in (("full_name", 60), ("about_myself", 600), ("about_family", 400), ("expectations", 400),
                   ("father_name", 60), ("mother_name", 60), ("father_occupation", 60), ("mother_occupation", 60),
                   ("native_place", 60), ("college", 80), ("company", 80), ("education_detail", 120),
                   ("work_location", 60), ("current_city", 40), ("pincode", 6), ("blood_group", 8),
                   ("weight", 12), ("experience", 12), ("exp_job", 60), ("exp_location", 60), ("exp_caste", 40),
                   ("mandal", 40), ("gothram", 40), ("sub_caste", 40), ("star", 30), ("rasi", 30)):
        if _k in user:
            user[_k] = clean(user.get(_k), _n, "register:" + _k)
    user["duplicate_phone"] = bool(_dup_phone)      # policy (v2.1): same phone multi-account OK — flag matrame
    # A bearer token is a response credential, never profile data. Keep it out
    # of the JSON snapshot even briefly so admin/export/recovery paths cannot
    # accidentally persist or expose a reusable session.
    auth_token = sign_token(tsap_id)
    user.pop("auth_token", None)
    user["quality"] = profile_completeness(user)
    _ref_bonus = int(referral_result.get("bonus_credits", 0)) if referral_result.get("ok") else 0
    _base_credits = 3 if user.get("credits", 3) == 3 else max(3, int(user.get("credits", 3)))
    _credits = _base_credits + (_ref_bonus if _ref_bonus and user.get("credits", 3) == 3 else 0)
    user["credits"] = max(int(user.get("credits", 3)), _credits)
    # Persist referral/card/status fields added after the durable profile checkpoint.
    # The original registration is already safely committed if this enrichment
    # write fails, so do not tell the user to retry and create a duplicate account.
    with _REGISTER_LOCK:
        if not DBSTORE.save(DBSTORE.snapshot(DB_USERS, DB_INTERESTS, DB_PAYMENTS, DB_OTPS,
                                             VERIFIED_PHONES, DB_VIEWS, DB_SAVES, DB_DIGEST), force=True):
            # The base profile checkpoint is already durable, so a retry with the
            # same registration key will recover it rather than create a second
            # member.  Do not claim a fully completed registration while the
            # referral/card/status enrichment is only in memory.
            raise HTTPException(503, "Registration was saved, but final profile processing could not be confirmed. Please retry the same form safely.")
    return RegisterResponse(
        tsap_id=tsap_id,
        auth_token=auth_token,
        phone_masked=mask_phone(phone),
        phone_verified=bool(user.get("phone_verified")),
        is_approved=bool(user.get("is_approved")),
        duplicate_phone=bool(user.get("duplicate_phone")),
        quality=profile_completeness(user),
        message_plan_telugu=("🆓 మొదటి 3 interest requests FREE · 🔒 Public search లో contact details చూపించము; profile owner accept చేసిన తర్వాత accepted-request account flows లో అందుబాటులో ఉంటాయి · Paid: ₹99 → 5 requests"),
        card_url=user.get("card_url", card_url),
        credits=user.get("credits", 3),
        message_telugu=("🎉 మీ ID: %s. మీ ప్రొఫైల్ సమీక్ష కోసం పంపబడింది; ఆమోదం వచ్చే వరకు ప్రచురించబడదు. %d సంభావ్య matches అందుబాటులో ఉన్నాయి.%s"
                        % (tsap_id, len(top_matches), (" మీ friend code తో +%d FREE credit వచ్చింది 🎁" % _ref_bonus) if _ref_bonus else "")),
        next_steps=["Profile review (timing may vary)", "Recent profiles with factual comparisons",
                    "₹99 pay → 5 interest requests (మొదటి 3 FREE)",
                    "🤝 Referral: ₹50 once may qualify only on the referee’s first eligible S_99/S_199/S_299/S_499 consumer-plan payment (minimum ₹99); exclusions and manual payout review apply. See /referral."],
        auto_post_queue=auto_queue,
        top_3_matches=top_matches,
        publish_queued=pub.get("queued", False),
        publish_targets=pub.get("targets", []),
        publish_reason=pub.get("reason", ""),
        namaste_queued=bool(welcome.get("queued")),
        welcome_status=welcome,
        welcome_pack=pack_public(welcome_pack),
        share_kit=share_kit(user, tsap_id),
        share_text=build_share_text(user, tsap_id),
        referral={
            "my_code": user.get("referral_code", ""),
            "my_alias": user.get("referral_alias", ""),
            "my_link": user.get("referral_link", ""),
            "joined_with": referral_result,
            "commission_offer": 50,
            "earn_telugu": "అర్హత ఉన్న first qualifying S_99/S_199/S_299/S_499 consumer-plan payment (కనీసం ₹99) పై మాత్రమే ఒక్కసారి ₹50 reward ఉండవచ్చు; మినహాయింపులు వర్తిస్తాయి.",
            "rule_telugu": ["Valid referral attachment అవసరం; signup credits cash కాదు.",
                            "Referee మొదటి qualifying S_99/S_199/S_299/S_499 consumer-plan payment కనీసం ₹99 కావాలి.",
                            "Add-ons, assisted services, boosts, gifts, renewals, complimentary grants మరియు B2B/non-consumer payments అర్హం కావు; payout request కు manual review ఉంటుంది."],
            "poster_url": "/api/referral/%s/poster.png" % tsap_id,
            "poster_status_url": "/api/referral/%s/poster.png?style=status" % tsap_id,
            "share_message": (
                "🙏 నమస్తే! నేను %s — మన వివాహ (TSAP) matrimony లో profile pettanu.\n"
                "మీ family/relatives/business circle లో పెళ్లి చూసుకునే వాళ్లకి ఈ link పంపండి 👇\n%s\n"
                "Free registration + 3 matches FREE. నా code: %s\n— మన వివాహ · manavivaha.in"
                % (user.get("full_name") or tsap_id, user.get("referral_link", ""), user.get("referral_code", ""))),
            "dashboard": "/referral",
        },
    )

@app.get("/api/free-plan")
def free_plan_clarity():
    """
    🆓 FREE vs PAID — crystal clear (Telugu).
    "3 profiles ఇస్తాం కానీ numbers ఇవ్వము — వాళ్లు pay chesaka numbers/contact"
    """
    decline_credit_note = (
        "🔁 Owner decline చేస్తే ఒక request credit తిరిగి account లో జమ అవుతుంది; ఇది cash refund కాదు."
        if INTEREST_REFUND_ON_DECLINE else
        "🔁 Owner decline చేస్తే request credit తిరిగి రాదు; no-response expiry పై ఒక credit తిరిగి వస్తుంది."
    )
    return {
        "success": True,
        "headline_telugu": "Register 100% FREE — 3 interest requests పంపొచ్చు. Contact details public search లో చూపించము; profile owner accept చేసిన తర్వాత account flows లో అందుబాటులోకి వస్తాయి.",
        "rule_telugu": "Public profile/search లో contact details చూపించము. Interest పంపిన తర్వాత profile owner ACCEPT చేస్తే, accepted-request account flows లో contact details అందుబాటులోకి వస్తాయి. Configured WhatsApp notifications queue కావచ్చు; delivery హామీ లేదు. Paid plans అదనపు interest-request credits మాత్రమే ఇస్తాయి; acceptance ను bypass చేయవు.",
        "free": {
            "price": 0,
            "profiles": 3,
            "requests": 3,
            "numbers": "❌ ఇవ్వము (locked)",
            "photo": "blur (photo privacy ఎంపిక private గా ఉన్న profiles)",
            "chat": "లేదు (in-site chat లేదు — interest requests మాత్రమే)",
            "validity": "365 days",
            "getting_started": ["Register (2 నిమిషాల form)", "Profile card free గా generate అవుతుంది",
                                "3 profiles చూడొచ్చు — 🔒 numbers locked",
                                "3 interest requests పంపొచ్చు; notifications configured services పై ఆధారపడతాయి",
                                "Profile owner accept చేసిన తర్వాత accepted-request account flows లో contact details కనిపిస్తాయి; WhatsApp delivery హామీ లేదు"]
        },
        "paid": [
            {"code": "S_99", "price": 99, "profiles": 5, "validity_days": 30, "telugu": "₹99 → 5 interest requests"},
            {"code": "S_199", "price": 199, "profiles": 12, "validity_days": 45, "telugu": "₹199 → 12 interest requests"},
            {"code": "S_299", "price": 299, "profiles": 25, "validity_days": 60, "telugu": "₹299 → 25 interest requests"},
            {"code": "S_499", "price": 499, "profiles": 50, "validity_days": 90, "telugu": "₹499 → 50 interest requests"},
        ],
        "numbers_rule_telugu": [
            "🔒 Free లో numbers public search లో కనిపించవు — 'contact locked' అని మాత్రమే కనిపిస్తుంది (98••••••45 style)",
            "💌 Interest request recipient కి కనిపిస్తుంది; notification configured service ద్వారా queue కావచ్చు, delivery హామీ లేదు",
            "✅ Profile owner accept చేసిన తర్వాత accepted-request account flows లో ఇరువురి contact details అందుబాటులోకి వస్తాయి",
            "❌ In-site chat లేదు. Unwanted behavior కోసం report/block controls వాడండి; external calls/messages ను service నియంత్రించదు",
            decline_credit_note,
        ],
        "why_telugu": [
            "📵 Phone number public గా చూపించము; unsolicited contact ప్రమాదాన్ని తగ్గించడానికి mask చేస్తాము",
            "🛡️ Contact access profile owner acceptance తర్వాతే వస్తుంది; paid credits consent ను bypass చేయవు",
            "🔐 Public profile/search responses contact fields ను omit లేదా mask చేస్తాయి; ఇది at-rest encryption హామీ కాదు",
        ],
        "faq_telugu": [
            {"q": "3 profiles FREE అంటే ఏంటి?", "a": "Register అయ్యాక 3 interest requests పంపొచ్చు — ఒక్క request కి ఒక profile. Public search లో numbers locked."},
            {"q": "Numbers ఎప్పుడు కనిపిస్తాయి?", "a": "మీరు interest పంపిన తర్వాత profile owner accept చేస్తే, accepted-request account flows లో contact details అందుబాటులోకి వస్తాయి. Paid plan acceptance ను bypass చేయదు."},
            {"q": "₹99 ఎందుకు ఇవ్వాలి?", "a": "మొదటి 3 ఉచిత interest requests తర్వాత ₹99 plan 5 credits ఇస్తుంది. Validity 30 రోజులు; credit refund policy account లో చూపినట్లు వర్తిస్తుంది."},
            {"q": "మీ number ఎవరికీ తెలుస్తుంది?", "a": "Public profile/search లో కాదు. Accepted request లో profile owner మరియు requester account flows లో contact details కనిపించవచ్చు; configured notification delivery guaranteed కాదు."},
        ],
        "cta": {"register": "/register", "pricing": "/pricing", "requests": "/requests", "demo": "/matches"},
        "instructions_telugu": "Register FREE చేసి interest request పంపండి. Profile owner accept చేసిన తర్వాత accepted-request account flows లో contact details కనిపిస్తాయి; WhatsApp notification delivery హామీ లేదు.",
    }


@app.get("/api/search/{tsap_id}")
def search_profile(tsap_id: str, viewer_id: Optional[str] = None, request: Request = None):
    """
    ID Search — Always Open (even if credits 0)
    Pin-to-Pin:
    - Search by TSAP-1042
    - Profile open; phone stays hidden until an interest is accepted
    - Factual, member-entered profile comparison only
    """
    user = _find_user(tsap_id)
    if not user or _is_synthetic_profile(user):
        # Never expose a deleted/fictional record through an ID-guessable public route.
        raise HTTPException(404, f"Profile ID దొరకలేదు: {tsap_id} — ID correct గా unda check చెయ్యండి")

    identity = token_from_request(request) if request else None
    authenticated_id = str((identity or {}).get("tsap_id", "")).strip().upper()
    viewer = _find_user(authenticated_id) if authenticated_id else None
    is_owner = bool(authenticated_id and authenticated_id == str(user.get("tsap_id", "")).strip().upper())
    if not is_owner and not _is_approved_profile(user):
        raise HTTPException(404, "Approved active profile not found")
    if viewer and not is_owner and safety.is_blocked(authenticated_id, str(user.get("tsap_id", "")), DB_BLOCKS):
        raise HTTPException(404, "Approved active profile not found")

    # Compare only facts supplied by an authenticated member; never calculate a compatibility score.
    observations, differences, preference_checks = [], [], []
    if viewer and str(viewer.get("tsap_id", "")) != str(user.get("tsap_id", "")):
        comparison = topmatch.score_match_v2(viewer, user)
        observations = comparison.get("observations", [])
        differences = comparison.get("differences", [])
        preference_checks = comparison.get("preferences", [])

    # Public profile response uses the explicit safe_user serializer; raw contact fields stay out.
    pub = dict(safe_user(user))
    pub["is_nri"] = _is_nri(user)              # 🌊 WAVE 14 — NRI badge
    pub["country"] = sanitize_public_text(user.get("country", "India"))
    pub["profession_label"] = sanitize_public_text(_prof_label(user))
    pub["radius"] = sanitize_public_text(user.get("radius", ""))
    pub["about_myself"] = sanitize_public_text(user.get("about_myself", ""))
    pub["family_details"] = sanitize_public_text(user.get("family_details", ""))
    private_photo = bool(user.get("photo_private") or user.get("privacy_mode") == "private")
    raw_photo_values = user.get("photo_urls", []) if isinstance(user.get("photo_urls"), list) else []
    approved_photos = [spotlight._profile_photo_url(value) for value in raw_photo_values]
    approved_photos = [value for value in approved_photos if value]
    primary_photo = spotlight._profile_photo_url(user.get("photo_url"))
    public_photos = (approved_photos or ([primary_photo] if primary_photo else [])) \
        if user.get("photo_status") == "approved" and not private_photo else []
    visible_photos = public_photos if not is_owner else [
        value for value in [primary_photo, *approved_photos] if value
    ]
    pub["photo_url"] = visible_photos[0] if visible_photos else ""
    pub["photo_urls"] = list(dict.fromkeys(visible_photos))
    pub["has_photo"] = bool(public_photos) if not is_owner else bool(visible_photos)
    # Review state and rejection reasons are available only through the owner-gated status route.
    pub["selfie_verified"] = bool(user.get("selfie_verified", False))
    pub["id_verified"] = bool(user.get("id_verified", False))
    pub["id_verification_method"] = user.get("id_verification_method", "") if pub["id_verified"] else ""
    return {
        "profile": pub,
        "can_view_profile": True,
        "can_view_number": False,          # 🔒 number eppudu direct ga ivvamu
        "can_view_number_reason": "🔒 Contact details కోసం interest పంపండి; profile owner accept చేసిన తర్వాత మాత్రమే share అవుతాయి. Paid plans అదనపు interest requests ఇస్తాయి; consent bypass చేయవు.",
        "contact_locked": True,
        "phone_masked": pub.get("phone_masked", ""),
        "unlock_telugu": ["1️⃣ Interest పంపండి (మొదటి 3 requests FREE)",
                          "2️⃣ Paid plans అదనపు interest requests ఇస్తాయి — ₹99 నుంచి",
                          "3️⃣ Profile owner accept చేసిన తర్వాత contact details accepted-request account views లో అందుబాటులోకి వస్తాయి"],
        "quality": profile_completeness(user),
        "consent_note_telugu": "🔒 Contact details are not public. They become available in accepted-request account views after profile-owner acceptance; notification delivery is not guaranteed. Independently verify member-provided details.",
        "is_photo_blur": bool(private_photo and not is_owner),
        "observations": observations,
        "differences": differences,
        "preference_checks": preference_checks,
        "credits_needed": 1,
        "viewer_credits": viewer.get("credits") if viewer else None
    }


def _clean_str(s: str) -> str:
    import re
    return re.sub(r"[^a-z0-9]", "", str(s or "").lower())


def _has_overlap(candidate_val: str, pref_list: list) -> bool:
    import re
    if not pref_list:
        return True
    c_clean = _clean_str(candidate_val)
    if not c_clean:
        return True
    for p in pref_list:
        p_clean = _clean_str(p)
        if not p_clean or p_clean in ["any", "all", "anni", "castenobar"]:
            return True
        if c_clean in p_clean or p_clean in c_clean:
            return True
        for sub in re.split(r"[/,|+&()]", str(p)):
            sub_c = _clean_str(sub)
            if sub_c and (c_clean in sub_c or sub_c in c_clean):
                return True
    return False


def _generate_default_preferences(user: dict) -> dict:
    """Generates smart partner preferences based on user gender, age, caste, and profession."""
    g = str(user.get("gender", "")).lower()
    u_age = int(user.get("age", 0) or 26)
    u_caste = user.get("caste") or ""
    u_subcaste = user.get("sub_caste") or ""
    u_dist = user.get("district") or "Hyderabad"
    u_marital = str(user.get("marital_status", "")).lower()

    is_remarriage = ("divorce" in u_marital) or ("widow" in u_marital) or ("విడాకులు" in u_marital) or ("రెండవ" in u_marital)
    marital_list = ["Divorced", "Widowed", "Separated"] if is_remarriage else ["Never Married"]

    if g in ["groom", "male", "అబ్బాయి"]:
        age_min = max(18, u_age - 6)
        age_max = max(21, u_age - 1)
        h_min = "5'0\""
        h_max = user.get("height") or "5'7\""
        edus = ["B.Tech / B.E.", "Degree / Post Graduate", "MBA / MCA", "M.Tech / M.E.", "MBBS / Medical"]
        jobs = ["Software / IT Professional", "Govt Employee / PSU", "Doctor / Medical", "Banking / Finance", "Private Firm", "Any Working"]
        min_sal = "Any"
    else:
        age_min = max(21, u_age + 1)
        age_max = u_age + 6
        h_min = user.get("height") or "5'4\""
        h_max = "6'2\""
        edus = ["B.Tech / B.E.", "M.Tech / M.E.", "MBA / PGDM", "MS (USA / Abroad)", "MBBS / MD / MS", "CA / CS"]
        jobs = ["Software / IT Professional", "Govt Employee / PSU", "Doctor / Medical", "Business / Self-Employed", "Banking / Finance"]
        min_sal = "₹5 - 7 Lakhs / year"

    dists = [u_dist, "Hyderabad", "Ranga Reddy", "Medchal-Malkajgiri"] if u_dist else ["Hyderabad", "Ranga Reddy"]
    castes = [u_caste] if u_caste else []
    subcastes = [u_subcaste] if u_subcaste else []

    return {
        "age_min": age_min,
        "age_max": age_max,
        "height_min": h_min,
        "height_max": h_max,
        "castes": castes,
        "sub_castes": subcastes,
        "caste_no_bar": False if castes else True,
        "educations": edus,
        "jobs": jobs,
        "min_salary": min_sal,
        "districts": list(dict.fromkeys(dists)),
        "states": ["TS", "AP"],
        "marital_statuses": marital_list,
        "diet": "Any",
        "notes": "",
    }


def _evaluate_partner_preferences_match(user: dict, prefs: dict, candidate: dict) -> tuple:
    """Apply explicit hard filters and return factual preference checks, never a score."""
    user = user if isinstance(user, dict) else {}
    prefs = prefs if isinstance(prefs, dict) else {}
    candidate = candidate if isinstance(candidate, dict) else {}
    gender = str(user.get("gender", "")).strip().lower()
    opposite = {"groom", "male", "man"} if gender in {"bride", "female", "woman"} else {"bride", "female", "woman"}
    if str(candidate.get("gender", "")).strip().lower() not in opposite:
        return False, []
    if str(candidate.get("tsap_id", "")).strip().upper() == str(user.get("tsap_id", "")).strip().upper():
        return False, []
    if candidate.get("is_banned") or candidate.get("is_approved") is False:
        return False, []
    if safety.is_blocked(str(user.get("tsap_id", "")), str(candidate.get("tsap_id", "")), DB_BLOCKS):
        return False, []

    checks: List[Dict[str, str]] = []

    def values(key: str) -> List[str]:
        raw = prefs.get(key, [])
        if not isinstance(raw, (list, tuple, set)):
            raw = [raw] if raw else []
        return [str(value).strip() for value in raw if str(value).strip()]

    def add_check(key: str, label: str, matches: bool, note: str) -> None:
        checks.append({"key": key, "label": label, "status": "met" if matches else "not_met", "note": note})

    # Explicit age and community selections are hard filters; missing candidate data stays unknown.
    try:
        age_min = int(prefs.get("age_min") or 18)
        age_max = int(prefs.get("age_max") or 70)
        cand_age = int(candidate.get("age") or 0)
    except (TypeError, ValueError, OverflowError):
        age_min, age_max, cand_age = 18, 70, 0
    if cand_age:
        age_ok = age_min <= cand_age <= age_max
        if not age_ok:
            return False, []
        add_check("age", "Age range", True, f"Member-entered age {cand_age} is within the selected range ({age_min}–{age_max}).")

    pref_castes = values("castes")
    cand_caste = str(candidate.get("caste") or "").strip()
    if pref_castes and not bool(prefs.get("caste_no_bar")) and cand_caste:
        if not _has_overlap(cand_caste, pref_castes):
            return False, []
        add_check("caste", "Community", True, f"Candidate lists {cand_caste}, which is in the selected community options.")

    pref_subcastes = values("sub_castes")
    cand_subcaste = str(candidate.get("sub_caste") or "").strip()
    if pref_subcastes and cand_subcaste:
        add_check("sub_caste", "Sub-community", _has_overlap(cand_subcaste, pref_subcastes),
                  f"Candidate lists {cand_subcaste}; compare it with the selected sub-community options.")

    pref_marital = values("marital_statuses")
    cand_marital = str(candidate.get("marital_status") or "").strip()
    if pref_marital and cand_marital:
        any_status = any(value.casefold() in {"any", "all", "అన్నీ"} for value in pref_marital)
        if not any_status and not _has_overlap(cand_marital, pref_marital):
            return False, []
        add_check("marital_status", "Marital status", True,
                  f"Candidate lists {cand_marital}, within the selected marital-status options.")

    # These are informational checks, not weighted or hidden ranking points.
    for key, label, profile_key in (
        ("educations", "Education", "education"),
        ("jobs", "Profession", "job"),
        ("districts", "District", "district"),
    ):
        requested, listed = values(key), str(candidate.get(profile_key) or "").strip()
        if requested and listed:
            matched = _has_overlap(listed, requested)
            add_check(key, label, matched,
                      f"Candidate lists {listed}; {'it is included in' if matched else 'it is not included in'} the selected {label.lower()} options.")

    return True, checks


@app.get("/api/profile/preferences")
def get_partner_preferences(tsap_id: str, request: Request):
    """Fetches user's saved partner preferences, default smart suggestions, and live match count."""
    clean_id = str(tsap_id or "").strip().upper()
    user = _find_user(clean_id)
    if not user:
        raise HTTPException(404, f"Profile {clean_id} not found")

    # 🛡️ P0 IDOR fix: own partner-preferences matrame — zero-auth read/write
    # of someone else's preferences (and the match preview list built from
    # them) ledu ippudu.
    require_owner(request, clean_id)

    prefs = user.get("partner_preferences")
    if not prefs or not isinstance(prefs, dict):
        prefs = _generate_default_preferences(user)
        user["partner_preferences"] = prefs

    # Apply explicit hard filters, show factual preference checks, and use recency only.
    matching_candidates = []
    for c in DB_USERS:
        is_match, checks = _evaluate_partner_preferences_match(user, prefs, c)
        if is_match:
            c_safe = safe_user(c)
            c_safe["preference_checks"] = checks
            matching_candidates.append((str(c.get("created_at") or ""), c_safe))
    matching_candidates.sort(key=lambda item: item[0], reverse=True)
    preview_matches = [row for _, row in matching_candidates[:6]]

    return {
        "success": True,
        "tsap_id": clean_id,
        "preferences": prefs,
        "matching_count": len(matching_candidates),
        "preview_matches": preview_matches,
        "ranking_basis": "creation_time_after_explicit_hard_filters",
        "compatibility_score_calculated": False,
    }


@app.post("/api/profile/preferences")
def save_partner_preferences(payload: dict, request: Request):
    """Saves user's custom multi-select partner preferences (Castes, Subcastes, Age, Height, Education, Jobs, Districts, Salary)."""
    clean_id = str(payload.get("tsap_id") or payload.get("id") or "").strip().upper()
    user = _find_user(clean_id)
    if not user:
        raise HTTPException(404, f"Profile {clean_id} not found")

    # 🛡️ P0 IDOR fix: own preferences matrame overwrite cheyyagalaru.
    require_owner(request, clean_id)

    prefs = {
        "age_min": int(payload.get("age_min") or 18),
        "age_max": int(payload.get("age_max") or 60),
        "height_min": str(payload.get("height_min") or "").strip(),
        "height_max": str(payload.get("height_max") or "").strip(),
        "castes": list(payload.get("castes") or []),
        "sub_castes": list(payload.get("sub_castes") or []),
        "caste_no_bar": bool(payload.get("caste_no_bar")),
        "educations": list(payload.get("educations") or []),
        "jobs": list(payload.get("jobs") or []),
        "min_salary": str(payload.get("min_salary") or "Any").strip(),
        "districts": list(payload.get("districts") or []),
        "states": list(payload.get("states") or ["TS", "AP"]),
        "marital_statuses": list(payload.get("marital_statuses") or ["Never Married"]),
        "diet": str(payload.get("diet") or "Any").strip(),
        "notes": str(payload.get("notes") or "").strip(),
        "saved_at": datetime.now().isoformat(),
    }

    user["partner_preferences"] = prefs
    user["exp_filters"] = {
        "ageMin": prefs["age_min"],
        "ageMax": prefs["age_max"],
        "job": ", ".join(prefs["jobs"][:2]),
        "location": ", ".join(prefs["districts"][:2]),
        "caste": "no bar" if prefs["caste_no_bar"] else ", ".join(prefs["castes"][:2]),
    }

    # Save to disk — P0 FIX (full-audit pass): this used to do a raw
    # open("data_db.json","w") + json.dump(DB_USERS, ...) which (a) is NOT
    # atomic (a crash mid-write corrupts/truncates the file) and (b) writes
    # a bare LIST to disk instead of the {"users":[...], "interests":[...],
    # ...} snapshot shape DBSTORE.load() expects — db_store.load() silently
    # treats a non-dict payload as empty ({}), which on the next restart
    # would wipe DB_INTERESTS/DB_PAYMENTS/DB_OTPS and fall back to demo
    # seed data. Now uses the same atomic tmp+rename DBSTORE.save() path
    # used everywhere else in this file.
    try:
        DBSTORE.save(DBSTORE.snapshot(DB_USERS, DB_INTERESTS, DB_PAYMENTS, DB_OTPS,
                                      VERIFIED_PHONES, DB_VIEWS, DB_SAVES, DB_DIGEST), force=True)
    except Exception:
        pass

    # Count candidates passing explicit hard filters; never assign preference points.
    matching_candidates = []
    for c in DB_USERS:
        is_match, checks = _evaluate_partner_preferences_match(user, prefs, c)
        if is_match:
            c_safe = safe_user(c)
            c_safe["preference_checks"] = checks
            matching_candidates.append((str(c.get("created_at") or ""), c_safe))
    matching_candidates.sort(key=lambda item: item[0], reverse=True)

    return {
        "success": True,
        "message_telugu": "✅ మీ పార్టనర్ ప్రిఫరెన్సెస్ భద్రపరచబడ్డాయి. అభ్యర్థులను మీరే పరిశీలించి నిర్ణయించండి.",
        "tsap_id": clean_id,
        "preferences": prefs,
        "matching_count": len(matching_candidates),
        "preview_matches": [row for _, row in matching_candidates[:6]],
        "ranking_basis": "creation_time_after_explicit_hard_filters",
        "compatibility_score_calculated": False,
    }


@app.get("/api/matches/partner-preferred")
def get_partner_preferred_matches(tsap_id: str, request: Request, limit: int = 50):
    """Owner-only list passing explicit preference filters; no synthetic ranking score."""
    clean_id = str(tsap_id or "").strip().upper()
    user = _find_user(clean_id)
    if not user:
        raise HTTPException(404, f"Profile {clean_id} not found")
    require_owner(request, clean_id)
    limit = clamp_int(limit, "limit", 1, 100, 50)

    prefs = user.get("partner_preferences") or _generate_default_preferences(user)
    matches = []
    for c in DB_USERS:
        is_match, checks = _evaluate_partner_preferences_match(user, prefs, c)
        if is_match:
            c_safe = safe_user(c)
            c_safe["preference_checks"] = checks
            matches.append((str(c.get("created_at") or ""), c_safe))

    matches.sort(key=lambda item: item[0], reverse=True)
    return {
        "success": True,
        "tsap_id": clean_id,
        "total_matches": len(matches),
        "matches": [row for _, row in matches[:limit]],
        "ranking_basis": "creation_time_after_explicit_hard_filters",
        "compatibility_score_calculated": False,
    }


@app.get("/api/profile/{tsap_id}")
def get_user_profile_for_edit(tsap_id: str, request: Request):
    """Fetch full profile data for self-editing and view completeness meter."""
    clean_id = tsap_id.strip().upper()
    user = _find_user(clean_id)
    if not user:
        raise HTTPException(404, f"Profile ID {tsap_id} not found")

    # 🛡️ P0 IDOR FIX: idi mundu ANY caller ki (zero auth) full raw user dict
    # ichedi — phone, password_hash, AND a live reusable auth_token (full
    # account takeover) anni leak ayyedi, just tsap_id telisthe chalu (IDs
    # sequential ga guess cheyyochu: MV1001, MV1002...). Ippudu owner token
    # తప్పనిసరి — ee page "self-editing" కోసమే, వేరే వాళ్ల profile fetch
    # cheyakudadu.
    require_owner(request, clean_id)

    core_keys = [
        "full_name", "gender", "dob", "height", "marital_status", "caste", "sub_caste",
        "gothram", "star", "rasi", "education", "education_detail", "job", "company", "salary",
        "work_type", "work_location", "father_name", "father_occupation", "mother_name",
        "native_place", "state", "district", "phone", "about_myself", "photo_url"
    ]
    filled = [k for k in core_keys if bool(str(user.get(k) or "").strip())]
    missing = [k for k in core_keys if not bool(str(user.get(k) or "").strip())]
    score = min(100, int((len(filled) / len(core_keys)) * 100))

    # 🛡️ Defense-in-depth: even for the verified owner, never echo the
    # password hash or a live bearer token back out of a GET response body.
    safe_profile = {k: v for k, v in user.items()
                    if k not in ("password_hash", "auth_token", "registration_key_hash")}
    safe_profile["is_verified"] = safety.has_verification_evidence(user)
    safe_profile["verified"] = safety.has_verification_evidence(user)
    safe_profile["phone_verified"] = bool(user.get("phone_verified"))
    safe_profile["photo_verified"] = bool(user.get("selfie_verified") or user.get("photo_status") == "approved")
    safe_profile["id_verified"] = bool(user.get("id_verified"))

    return {
        "success": True,
        "profile": safe_profile,
        "completeness_score": score,
        "filled_count": len(filled),
        "total_fields": len(core_keys),
        "missing_fields": missing,
        "referral_code": user.get("my_code") or user.get("referral_code") or clean_id,
        "credits": user.get("credits", 3),
        "is_verified": safety.has_verification_evidence(user),
        "verification": safety.verification_badge(user)["level"],
    }


@app.post("/api/profile/update")
def update_user_profile(payload: dict, request: Request):
    """Allows user to update profile anytime, increasing completeness to 100%."""
    tsap_id = str(payload.get("tsap_id") or payload.get("id") or "").strip().upper()
    user = _find_user(tsap_id)
    if not user:
        raise HTTPException(404, f"Profile {tsap_id} not found")

    # 🛡️ P0 IDOR FIX: idi mundu ANY caller ki — just tsap_id tho (body lo
    # attacker-controlled) — ANY other user's profile field-by-field
    # overwrite cheyyagaligedi, zero auth. Ippudu owner token తప్పనిసరి.
    require_owner(request, tsap_id)
    user_before = copy.deepcopy(user)

    updatable_fields = [
        "full_name", "dob", "birth_time", "height", "weight", "marital_status", "children", "caste",
        "sub_caste", "gothram", "star", "rasi", "dosham", "education", "education_detail",
        "job", "company", "salary", "work_type", "work_location", "father_name",
        "father_occupation", "mother_name", "mother_occupation", "brothers", "sisters",
        "native_place", "state", "district", "mandal", "current_city", "about_myself", "expectations",
        "exp_age_min", "exp_age_max", "exp_caste", "exp_education", "exp_job", "exp_location", "exp_salary",
        "family_type", "family_status", "family_values", "mother_tongue", "physical_status",
        "country", "citizenship", "visa_status", "is_nri",
        # Photo bytes and media paths are changed only through the authenticated
        # /api/photo/upload flow.  Accepting photo_url/photo_urls here would let
        # an owner point their profile at another member's approved media.
        "photo_private", "blood_group", "complexion", "body_type"
    ]
    # Normalize before mutating the profile so an invalid string cannot leave a
    # partially changed in-memory record behind a 400 response.
    photo_private_value = None
    if "photo_private" in payload and payload["photo_private"] is not None:
        photo_private_value = req_bool_strict(payload["photo_private"], "photo_private")
    for k in updatable_fields:
        if k in payload and payload[k] is not None and k != "photo_private":
            user[k] = payload[k]

    # Keep the privacy boolean and its legacy mode in sync.  Do not let a JSON
    # string such as "false" become truthy and silently make a photo private.
    if photo_private_value is not None:
        user["photo_private"] = photo_private_value
        user["privacy_mode"] = "private" if photo_private_value else "public"

    # 🏡 A Groom can never be *set* to the "Housewife / గృహిణి" occupation,
    # whichever client sends the update. Existing stored values are left alone so
    # a member with older data can always come back and correct it.
    _reject_groom_homemaker(user.get("gender"), payload.get("job"), payload.get("work_type"))

    # 🛡️ P0 FIX (Phase 13): registration already runs every free-text field
    # through clean() (strips HTML tags + javascript:/onerror=/<script
    # patterns — see "register:" sanitize loop above) but THIS endpoint was
    # setting fields straight from payload with zero sanitization, so a
    # logged-in user could set e.g. about_myself="<script>...</script>" on
    # their OWN profile (no IDOR needed — require_owner already gates this
    # to the owner) and have it persist raw. Any other visitor who later
    # viewed that profile and used a raw-HTML code path (e.g. the
    # printBiodata() document.write() bug fixed this same pass) would then
    # run the attacker's script. Close the gap at the source too: sanitize
    # the same way registration does, for every free-text field this
    # endpoint allows updating.
    _free_text_max = {
        "full_name": 60, "height": 12, "marital_status": 30, "caste": 40, "sub_caste": 40,
        "gothram": 40, "star": 30, "rasi": 30, "dosham": 30, "education": 60, "education_detail": 120,
        "job": 60, "company": 80, "salary": 24, "work_type": 40, "work_location": 60,
        "father_name": 60, "father_occupation": 60, "mother_name": 60, "mother_occupation": 60,
        "native_place": 60, "district": 40, "mandal": 40, "current_city": 40,
        "about_myself": 600, "expectations": 400, "exp_caste": 40, "exp_education": 60,
        "exp_job": 60, "exp_location": 60, "exp_salary": 24, "family_type": 30, "family_status": 40,
        "family_values": 40, "mother_tongue": 30, "physical_status": 40, "country": 60,
        "citizenship": 40, "visa_status": 40, "blood_group": 8, "complexion": 30, "body_type": 30,
    }
    for _k, _n in _free_text_max.items():
        if _k in payload and payload[_k] is not None and _k in user:
            user[_k] = clean(user.get(_k), _n, "profile_update:" + _k)

    if payload.get("dob"):
        try:
            from datetime import datetime, date
            dob_dt = datetime.strptime(str(payload["dob"])[:10], "%Y-%m-%d").date()
            today = date.today()
            age = today.year - dob_dt.year - ((today.month, today.day) < (dob_dt.month, dob_dt.day))
            if age >= 18:
                user["age"] = age
        except Exception:
            pass
    
    core_keys = [
        "full_name", "gender", "dob", "height", "marital_status", "caste", "sub_caste",
        "gothram", "star", "rasi", "education", "education_detail", "job", "company", "salary",
        "work_type", "work_location", "father_name", "father_occupation", "mother_name",
        "native_place", "state", "district", "phone", "about_myself", "photo_url"
    ]
    filled = [k for k in core_keys if bool(str(user.get(k) or "").strip())]
    missing = [k for k in core_keys if not bool(str(user.get(k) or "").strip())]
    user["completeness_score"] = min(100, int((len(filled) / len(core_keys)) * 100))
    
    if "photo_private" in payload and payload["photo_private"] is not None:
        # Privacy transitions must also rebuild the owner-visible card so a
        # previously public photo is not retained in a stale artifact.
        if not _regenerate_profile_card(user):
            user.clear()
            user.update(user_before)
            _regenerate_profile_card(user)
            raise HTTPException(503, "Privacy change could not be applied safely. Please try again.")

    # Profile edits are durable state transitions.  Do not report success after
    # an in-memory-only mutation that would disappear on restart.
    if not _persist_core_state():
        user.clear()
        user.update(user_before)
        _regenerate_profile_card(user)
        raise HTTPException(503, "Profile changes could not be saved safely. Please try again.")

    return {
        "success": True,
        "message_telugu": "✅ మీ ప్రొఫైల్ వివరాలు విజయవంతంగా అప్‌డేట్ అయ్యాయి!",
        "completeness_score": user["completeness_score"],
        "missing_fields": missing,
        "profile": safe_user(user)
    }


@app.post("/api/user/delete-account")
@app.post("/api/profile/{tsap_id}/delete")
def delete_user_account(payload: dict, request: Request, tsap_id: Optional[str] = None):
    """Self-service profile deactivation/public-listing removal and marriage status flow.
    This marks the account inactive; it does not erase all profile, payment, audit, or archive records.
    """
    clean_id = str(tsap_id or payload.get("tsap_id") or payload.get("id") or payload.get("user_id") or "").strip().upper()
    user = _find_user(clean_id)
    if not user:
        raise HTTPException(404, f"Profile ID '{clean_id}' not found")

    # 🛡️ P0 IDOR FIX: idi mundu ANY caller ki — just tsap_id telisthe chalu —
    # ANY other user's account ni deactivate/delete cheyyagaligedi, zero auth
    # (sequential IDs valla mass-delete script kuda possible). Ippudu owner
    # token తప్పనిసరి.
    require_owner(request, clean_id)

    reason = str(payload.get("reason", "married_via_manavivaha")).strip()
    partner_name = str(payload.get("partner_name", "")).strip()
    feedback = str(payload.get("feedback", "")).strip()
    
    is_married_here = reason in ("married_via_manavivaha", "found_match_here", "pelli_kudhirindi")
    is_married_offline = reason in ("married_elsewhere", "offline_match", "other_portal")
    
    # Update status to deleted / married_fixed
    user["status"] = "deleted"
    user["is_approved"] = False
    user["is_active"] = False
    user["deleted_at"] = datetime.utcnow().isoformat()
    user["deletion_reason"] = reason
    user["deletion_feedback"] = feedback
    user["partner_name"] = partner_name
    
    if is_married_here:
        user["status"] = "married_fixed"
        user["marriage_fixed_at"] = datetime.utcnow().isoformat()
        msg = f"🎉 హృదయపూర్వక శుభాకాంక్షలు {user.get('full_name')} గారు! మన వివాహ ద్వారా మీకు వివాహం నిశ్చయమైనందుకు ఎంతో సంతోషిస్తున్నాము. మీ వైవాహిక జీవితం సుఖసంతోషాలతో వర్ధిల్లాలని మనస్ఫూర్తిగా కోరుకుంటున్నాం! 💐"
    elif is_married_offline:
        msg = f"💐 శుభాకాంక్షలు {user.get('full_name')} గారు! మీ వివాహం నిశ్చయమైనందుకు సంతోషం. మీ ప్రొఫైల్ active public search నుంచి దాచబడింది."
    else:
        msg = f"✅ {user.get('full_name')} గారు, మీ ప్రొఫైల్ active public search నుంచి దాచబడింది. Stored records erase request కోసం /privacy లోని contact ను సంప్రదించండి."
    msg += " ముందే accepted request ద్వారా ఇచ్చిన contact access ఈ చర్యతో revoke కాదు; బయట save చేసిన copies ను తిరిగి తీసుకోలేము."

    try:
        DBSTORE.save(DBSTORE.snapshot(DB_USERS, DB_INTERESTS, DB_PAYMENTS, DB_OTPS,
                                      VERIFIED_PHONES, DB_VIEWS, DB_SAVES, DB_DIGEST), force=True)
    except Exception:
        pass

    return {
        "success": True,
        "tsap_id": clean_id,
        "message_telugu": msg,
        "message_en": (("Congratulations. Your profile is hidden from active public search. For a separate data-erasure request, use the privacy contact on /privacy."
                        if is_married_here or is_married_offline else
                        "Your profile is hidden from active public search. This action does not erase all stored records; use the privacy contact on /privacy for an erasure request.")
                       + " It does not revoke contact access already granted through accepted requests or recall copies already saved/shared."),
        "profile_visibility": "hidden",
        "is_married": is_married_here or is_married_offline,
        "congratulations": is_married_here
    }


@app.get("/api/matches/smart-alerts")
@app.get("/api/smart-alerts")
def smart_matches_alerts(tsap_id: Optional[str] = None, caste: Optional[str] = None,
                        gender: Optional[str] = None, request: Request = None):
    """Share available approved profile listings; never predict compatibility."""
    user = _find_user(str(tsap_id or "").strip().upper()) if tsap_id else None
    if tsap_id and not user:
        raise HTTPException(404, "Profile not found")
    if user:
        require_owner(request, str(user.get("tsap_id", "")))

    target_gender = "Groom" if user and user.get("gender") == "Bride" else (
        "Bride" if user and user.get("gender") == "Groom" else gender)
    target_caste = user.get("caste") if user else caste
    all_candidates = [
        profile for profile in DB_USERS
        if _is_approved_profile(profile)
        and (not target_gender or profile.get("gender") == target_gender)
        and (not user or (profile.get("tsap_id") != user.get("tsap_id")
                          and not safety.is_blocked(user.get("tsap_id", ""), profile.get("tsap_id", ""), DB_BLOCKS)))
    ]
    candidates = [profile for profile in all_candidates
                  if not target_caste or profile.get("caste") == target_caste]
    candidates.sort(key=lambda profile: (str(profile.get("created_at") or ""),
                                         str(profile.get("tsap_id") or "")), reverse=True)
    recent_cutoff = datetime.now(timezone.utc) - timedelta(days=14)
    recent_count = 0
    for profile in candidates:
        try:
            created = profile.get("created_at")
            created = created if isinstance(created, datetime) else datetime.fromisoformat(str(created).replace("Z", "+00:00"))
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            recent_count += created >= recent_cutoff
        except (TypeError, ValueError, OverflowError):
            continue

    top_picks = [_daily_row(profile) for profile in candidates[:4]]
    caste_label = target_caste or "All communities"
    digest_msg_te = f"🔔 మన వివాహ: పరిశీలించడానికి {len(top_picks)} ప్రొఫైళ్లు ఉన్నాయి. వివరాలు సభ్యులు అందించినవి; వాటిని స్వతంత్రంగా నిర్ధారించండి."
    digest_msg_en = f"🔔 Mana Vivaha: {len(top_picks)} profiles are available to review. Details are member-provided; please verify them independently."
    wa_text = f"💍 మన వివాహ — అందుబాటులో ఉన్న profiles\n{digest_msg_te}\n\n👉 వివరాలు చూడండి: https://manavivaha.in/matches"

    return {
        "success": True,
        "user_id": user.get("tsap_id") if user else None,
        "candidate_count": len(candidates),
        "recent_profiles_count": recent_count,
        "target_caste": caste_label,
        "target_gender": target_gender or "All",
        "top_picks": top_picks,
        "ranking_basis": "creation_time_descending",
        "compatibility_score_calculated": False,
        "digest_message_telugu": digest_msg_te,
        "digest_message_en": digest_msg_en,
        "whatsapp_share_url": f"https://wa.me/?text={urllib.parse.quote(wa_text)}",
    }


def _approved_profile_404() -> HTTPException:
    """🌐 Telugu-first 404 for approved-member routes (English gloss kept for operators)."""
    return HTTPException(404, "⚠️ Approved member profile not found — ఆమోదించబడిన ప్రొఫైల్ దొరకలేదు. TSAP ID check చెయ్యండి.")


# 🏡 "Housewife / Homemaker (గృహిణి)" describes a woman's work. A Groom profile
# must never carry it — the UI hides the option per gender, and this guard keeps
# stale clients, cached pages and direct API calls from storing it anyway.
_HOMEMAKER_TERMS = ("housewife", "homemaker", "\u0c17\u0c43\u0c39\u0c3f\u0c23\u0c3f")


def _is_homemaker_occupation(value: object) -> bool:
    text = str(value or "").strip().lower()
    return any(term in text for term in _HOMEMAKER_TERMS)


def _reject_groom_homemaker(gender: object, job: object = "", work_type: object = "") -> None:
    """Block the one occupation that can only ever belong to a bride."""
    if str(gender or "").strip().lower() != "groom":
        return
    if _is_homemaker_occupation(job) or _is_homemaker_occupation(work_type):
        raise HTTPException(
            400,
            "\u26a0\ufe0f Housewife / Homemaker (\u0c17\u0c43\u0c39\u0c3f\u0c23\u0c3f) does not apply to a Groom profile — "
            "\u0c35\u0c30\u0c41\u0c21\u0c3f \u0c2a\u0c4d\u0c30\u0c4a\u0c2b\u0c48\u0c32\u0c4d\u0c15\u0c41 \u2018\u0c17\u0c43\u0c39\u0c3f\u0c23\u0c3f / Housewife\u2019 "
            "\u0c0e\u0c02\u0c2a\u0c3f\u0c15 \u0c35\u0c30\u0c4d\u0c24\u0c3f\u0c02\u0c1a\u0c26\u0c41. "
            "Choose the work that describes this member — "
            "\u0c0e \u0c35\u0c4d\u0c2f\u0c15\u0c4d\u0c24\u0c3f\u0c15\u0c3f \u0c38\u0c30\u0c2f\u0c47 \u0c09\u0c26\u0c4d\u0c2f\u0c4b\u0c17\u0c02 \u0c0e\u0c02\u0c1a\u0c41\u0c15\u0c4b\u0c02\u0c21\u0c3f.",
        )


@app.get("/api/matches/{tsap_id}")
def get_matches(tsap_id: str, min_score: int = 70, limit: int = 20, caste_filter: Optional[str] = None,
                education: Optional[str] = None, district: Optional[str] = None, salary_min: int = 0,
                salary_max: int = 0, verified_only: bool = False, photo_only: bool = False,
                marital_status: Optional[str] = None, dosham: Optional[str] = None, offset: int = 0,
                request: Request = None):
    """Owner-only candidate list; explicit preferences and recency, never compatibility points."""
    clean_id = str(tsap_id or "").strip().upper()
    user = _find_user(clean_id)
    if not _is_approved_profile(user):
        raise _approved_profile_404()
    require_owner(request, clean_id)

    # Keep old query parameters bounded for clients, but deliberately do not use a score threshold.
    clamp_int(min_score, "min_score", 0, 100, 70)
    limit = clamp_int(limit, "limit", 1, 50, 20)
    offset = clamp_int(offset, "offset", 0, 10000, 0)

    all_profiles = [p for p in DB_USERS if _is_approved_profile(p)
                    and not safety.is_blocked(clean_id, p.get("tsap_id", ""), DB_BLOCKS)
                    and p.get("tsap_id") != clean_id]
    if caste_filter:
        all_profiles = [p for p in all_profiles if p.get("caste") == caste_filter]
    filters = {"education": education, "district": district, "marital_status": marital_status, "dosham": dosham,
               "salary_min": salary_min or None, "salary_max": salary_max or None,
               "verified_only": bool(verified_only), "photo_only": bool(photo_only)}
    if any(value for value in filters.values()):
        all_profiles = [p for p in all_profiles if matches_filters(p, filters)]

    rows = topmatch.find_top_matches_v2(user, all_profiles, limit=limit + offset)[offset:]
    safe_rows = []
    for match in rows:
        profile = match.get("profile") or {}
        row = dict(safe_user(profile))
        private_photo = bool(profile.get("photo_private") or profile.get("privacy_mode") == "private")
        raw_photo_values = profile.get("photo_urls", []) if isinstance(profile.get("photo_urls"), list) else []
        approved_photo_values = [spotlight._profile_photo_url(value) for value in [
            *raw_photo_values, profile.get("photo_url")
        ]]
        public_photo_values = list(dict.fromkeys(value for value in approved_photo_values if value)) \
            if profile.get("photo_status") == "approved" and not private_photo else []
        row.update({
            "observations": match.get("observations", []),
            "differences": match.get("differences", []),
            "preference_checks": match.get("preferences", []),
            "has_photo": bool(public_photo_values),
            "photo_urls": public_photo_values,
            "photo_url": public_photo_values[0] if public_photo_values else "",
            "is_verified": safety.has_verification_evidence(profile),
            "verification": safety.verification_badge(profile)["level"],
            "quality_percent": profile_completeness(profile).get("percent", 0),
        })
        safe_rows.append(row)

    return {"user_id": clean_id, "total_found": len(safe_rows), "matches": safe_rows,
            "filter": caste_filter or "All", "ranking_basis": "creation_time_descending",
            "compatibility_score_calculated": False, "min_score_ignored": True,
            "contact_locked": True,
            "contact_note_telugu": "🔒 Public profile లో contact details చూపించము. Profile owner accept చేసిన తర్వాత accepted-request account views లో అందుబాటులోకి వస్తాయి; paid plan consent‌ను bypass చేయదు."}

@app.post("/api/credits/deduct/{tsap_id}")
def deduct_credit_api(tsap_id: str, target_id: str = "", request: Request = None):
    """
    🐞 FIX (policy "numbers ivvavu"): mundu ee endpoint credit teesukuni **fake number "98480xxxxx"** ichedi.
    Ippudu numbers credit tho ammamu — credit kooda deduct avvadu.
    """
    require_owner(request, tsap_id)   # 🛡️ IDOR fix
    return JSONResponse(status_code=410, content={
        "success": False, "deprecated": True,
        "message_telugu": ("🔒 Contact details కు paid credits నేరుగా access ఇవ్వవు. Interest పంపండి; profile owner accept చేసిన తర్వాత accepted-request account flows లో వివరాలు అందుబాటులోకి వస్తాయి."),
        "how_to_unlock": ["1️⃣ Interest పంపండి (మొదటి 3 requests FREE)", "2️⃣ Profile owner స్వయంగా accept చేయాలి (consent)",
                          "3️⃣ Accept అయిన request లో contact details చూడండి; WhatsApp notification delivery హామీ లేదు"],
        "pay_url": "/pricing"})

@app.post("/api/payment/webhook")
async def payment_webhook(user_id: str = "", amount: int = 0, razorpay_payment_id: str = "",
                          referral_code: str = "", plan_code: str = "", signature_verified: bool = False,
                          request: Request = None):
    """
    💰 Razorpay webhook → signature verify → payment fulfillment; one-time referral reward only for consumer plans.

    🛡️ WAVE 9 FIXES:
      • B01 `signature_verified=true` query bypass → ippudu admin/automation key tho matrame (free ₹499 plan hack closed)
      • B02 real HMAC-SHA256 **raw body** verification (mundu dead code — NameError silent swallow)
      • B03 prod lo RAZORPAY_WEBHOOK_SECRET lekapote unsigned webhook **reject** (fail-closed)
      • B04 Razorpay JSON webhook body support (payload.payment.entity → user_id/amount/payment_id notes nunchi)
      • B05 plan_code price != amount → 400 (₹1 + VIP plan mismatch hack)
    """
    raw_body = b""
    try:
        raw_body = await request.body()      # signature verify ki raw bytes kavali
    except Exception:
        raw_body = b""
    body: Dict[str, Any] = {}
    if raw_body:
        try:
            body = json.loads(raw_body.decode("utf-8")) or {}
        except Exception:
            body = {}
    entity = {}
    if isinstance(body, dict):
        entity = (((body.get("payload") or {}).get("payment") or {}).get("entity") or {}) or {}
    if entity:
        _notes = entity.get("notes") or {}
        user_id = user_id or str(_notes.get("user_id") or _notes.get("tsap_id") or "")
        if not amount:
            amount = int(int(entity.get("amount") or 0) // 100)      # paise → rupees
        razorpay_payment_id = razorpay_payment_id or str(entity.get("id") or "")
        referral_code = referral_code or str(_notes.get("referral_code") or "")
        plan_code = plan_code or str(_notes.get("plan_code") or "")

    user_id = req_text(user_id, "user_id", 3, 60)
    user = next((u for u in DB_USERS if u["tsap_id"] == user_id), None)
    if not user:
        raise HTTPException(404, "⚠️ User దొరకలేదు — TSAP ID check చెయ్యండి")

    sig_header = ""
    try:
        sig_header = (request.headers.get("x-razorpay-signature") or "").strip()
    except Exception:
        sig_header = ""
    _wh_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET", "").strip()
    _bridge = is_admin(request) or is_automation(request)          # internal bridge (x-api-key/admin key)
    _sig_ok = bool(_wh_secret) and verify_webhook_signature(sig_header, _wh_secret, raw_body)

    if _wh_secret and not _sig_ok:
        abuse_log("webhook_signature_fail", user_id)
        abuse_count("webhook_rejected")
        return JSONResponse(status_code=401, content={
            "success": False, "error": "signature_invalid",
            "message_telugu": "⚠️ Webhook signature verify కాలేదు — payment accept చెయ్యలేదు (RAZORPAY_WEBHOOK_SECRET chusukondi)"})
    # 🛡️ fail-closed **gateway live** unnappudu matrame (Razorpay keys unte):
    #    keys unte kaani secret ledu ante → unsigned webhook reject (misconfiguration).
    #    Gateway inka configure avvakapote (keys ledu) → legacy/dev flow ki allow (abuse ledger lo log).
    _gateway_live = bool((os.getenv("RAZORPAY_KEY_ID") or "").strip()) or \
        str(os.getenv("PAYMENTS_LIVE", "")).strip().lower() in ("1", "true", "yes", "on")
    if not _wh_secret and not dev_mode() and _gateway_live:
        abuse_log("webhook_secret_missing", user_id)
        abuse_count("webhook_rejected")
        return JSONResponse(status_code=503, content={
            "success": False, "error": "webhook_secret_missing",
            "message_telugu": "⚠️ Payment gateway keys ఉన్నాయి కానీ webhook secret లేదు — safe side reject చేశాం (RAZORPAY_WEBHOOK_SECRET set చెయ్యండి)"})
    if not _wh_secret and not _gateway_live:
        abuse_log("webhook_unsigned_no_gateway", user_id)
    if signature_verified and not _bridge:
        abuse_log("webhook_fake_signature_flag", user_id)
        abuse_count("admin_denied")
        return JSONResponse(status_code=403, content={
            "success": False, "error": "signature_verified_forbidden",
            "message_telugu": "🔒 signature_verified flag client నుంచి ivvakoodadu — gateway signature మాత్రమే"})
    if not razorpay_payment_id and not _sig_ok and not (_bridge and signature_verified):
        return JSONResponse(status_code=400, content={
            "success": False, "error": "payment_proof_missing",
            "message_telugu": "⚠️ Payment proof లేదు — order id + payment id పంపండి"})

    amount = req_int(amount, "amount", 1, 1_000_000)
    razorpay_payment_id = clean(razorpay_payment_id, 60, "payment_id")
    _code_in = (plan_code or "").strip().upper()
    if _code_in:
        _known = next((_p for _p in (list(INTEREST_PLANS.values()) + list(ADDONS.values()) + list(RENEWALS.values()))
                       if str(_p.get("code", "")).upper() == _code_in), None)
        if _known and int(_known.get("price", 0)) != int(amount):
            abuse_log("webhook_amount_mismatch", f"{_code_in}:{amount}")
            abuse_count("webhook_rejected")
            return JSONResponse(status_code=400, content={
                "success": False, "error": "amount_mismatch",
                "expected_amount": _known.get("price"),
                "message_telugu": f"⚠️ {_code_in} price ₹{_known.get('price')} — మీకు ₹{amount} వచ్చింది. Match avvatledu."})
    if not dev_mode() and razorpay_payment_id and not razorpay_payment_id.startswith(("pay_", "order_", "upi_", "txn_")):
        abuse_log("webhook_bad_payment_id", user_id)
        return JSONResponse(status_code=400, content={
            "success": False, "error": "bad_payment_id",
            "message_telugu": "⚠️ Razorpay payment id format tappu (pay_xxxx laga ఉండాలి)"})
    if razorpay_payment_id and idem_seen("pay:" + razorpay_payment_id):
        abuse_log("webhook_replay", razorpay_payment_id)
        abuse_count("webhook_replay")
        return {"success": True, "duplicate": True, "user_id": user_id, "payment_id": razorpay_payment_id,
                "message_telugu": "✅ ఈ payment ముందు already apply అయ్యింది — double credit ఇవ్వము (idempotent)",
                "total_credits": user.get("credits", 0), "plan": user.get("plan", "FREE")}

    applied = apply_payment(user, amount, plan_code)
    if not applied["ok"]:
        return JSONResponse(status_code=400, content={
            "success": False, **applied,
            "message_telugu": "⚠️ ఈ amount కి plan లేదు — /api/pricing chusi correct amount పంపండి",
            "valid_amounts": [p["price"] for p in plan_list()] + [a["price"] for a in addon_list()]})

    # 🧾 payment record (audit)
    payment_record = {"at": datetime.utcnow().isoformat(), "tsap_id": user_id, "amount": amount,
                      "plan": applied["plan"]["code"], "kind": applied["kind"],
                      "payment_id": razorpay_payment_id, "referral_code": referral_code}
    DB_PAYMENTS.append(payment_record)

    # 🤝 Only a paid consumer request-plan purchase can earn the one-time referral reward.
    referral_result = None
    qualifying_plan_code = str(applied["plan"].get("code") or "").upper()
    if applied.get("kind") == "plan" and qualifying_plan_code in QUALIFYING_PLAN_CODES and user.get("referred_by"):
        referral_result = process_referral_payment(
            user, user["referred_by"], amount, DB_USERS,
            payment_id=razorpay_payment_id, plan_code=qualifying_plan_code,
        )
        payment_record["referral"] = {"success": bool(referral_result.get("success")),
                                      "commission": referral_result.get("commission", 0),
                                      "reason": referral_result.get("reason", "")}
        if referral_result.get("success"):
            try:
                _r = next((u for u in DB_USERS if u.get("tsap_id") == referral_result.get("referrer_id")), None)
                if _r:
                    _rtxt = referrer_commission_text(_r, user, referral_result)
                    _rphone = str(_r.get("phone") or "").strip()
                    if _rphone and publish_config()["wa_mode"] != "off":
                        _q = enqueue_whatsapp([_rphone], _rtxt, priority=0, kind="referral_commission")
                        referral_result["referrer_notified"] = bool(_q.get("queued"))
                    else:
                        referral_result["referrer_message"] = _rtxt
            except Exception as e:
                referral_result["notify_error"] = str(e)[:120]

    try:
        DBSTORE.save(DBSTORE.snapshot(DB_USERS, DB_INTERESTS, DB_PAYMENTS, DB_OTPS,
                                      VERIFIED_PHONES, DB_VIEWS, DB_SAVES, DB_DIGEST), force=True)
    except Exception:
        pass

    return {
        "success": True, "user_id": user_id, "amount": amount,
        "plan": applied["plan"]["code"], "kind": applied["kind"],
        "profiles_added": applied["profiles_added"], "total_credits": applied["credits"],
        "plan_expiry": applied["expiry"], "perks": applied["plan"].get("perks", []),
        "referral_commission": referral_result,
        "gst_note": "Tax/GST invoice availability depends on the applicable billing record. Ask through the configured support contact; delivery timing is not guaranteed.",
        "message_telugu": applied["message_telugu"],
    }

@app.get("/api/referral/leaderboard")
def leaderboard(period: str = "all", limit: int = 10, me: str = ""):
    """🏆 Top referrers — period: all | week | month | today (telugu labels తో).
    💎 R12 — me=TSAP-ID iste 'you' lo mee rank kuda (board lo lekapoyna)."""
    # 🐞 FIX (B08): period='JUNK' accept ayye (empty board) + limit=-5/1e9 unvalidated
    period = req_choice(period or "all", "period", ("all", "today", "week", "month"), required=False, default="all")
    limit = clamp_int(limit, "limit", 1, 50, 10)
    board, you = get_leaderboard(DB_USERS, limit=limit, period=period, me=(me or "").strip(), full=True)
    return {"success": True, "period": period, "leaderboard": board, "total_users": len(DB_USERS),
            "you": you,
            "reward_note": "Leaderboard is for recognition; no additional cash prize is promised.",
            # 🏆 Telugu lo kuda ade honest line — leaderboard recognition eh, cash prize kaadu.
            "prize_telugu": "ఈ leaderboard గుర్తింపు కోసం మాత్రమే. దీని వల్ల అదనపు నగదు బహుమతి లేదా హామీ ఏదీ లేదు."}


# ═══════════════════ 🤝 REFERRAL 2.0 — DASHBOARD / SHARE / PAYOUT ═══════════════════

@app.get("/api/referral/lookup")
def referral_lookup(q: str = ""):
    """Quick lookup by mobile phone number, TSAP ID, or referral code."""
    query = str(q or "").strip()
    if not query:
        raise HTTPException(400, "Phone or TSAP ID query required")
    raw_upper = query.upper()
    digits_only = re.sub(r"[^0-9]", "", query)
    clean_alpha = re.sub(r"[^a-zA-Z0-9]", "", query).upper()
    
    # 1. Match by phone (digits)
    target = None
    if len(digits_only) >= 7:
        target = next((u for u in DB_USERS if digits_only in re.sub(r"[^0-9]", "", str(u.get("phone", "")))), None)
    # 2. Match by TSAP ID (exact or stripped)
    if not target:
        target = next((u for u in DB_USERS if str(u.get("tsap_id", "")).upper() == raw_upper or
                       re.sub(r"[^a-zA-Z0-9]", "", str(u.get("tsap_id", ""))).upper() == clean_alpha), None)
    # 3. Match by Referral Code
    if not target:
        target = next((u for u in DB_USERS if str(u.get("referral_code", "")).upper() == raw_upper or
                       re.sub(r"[^a-zA-Z0-9]", "", str(u.get("referral_code", ""))).upper() == clean_alpha), None)
        
    if not target:
        raise HTTPException(404, f"'{query}' నంబర్ లేదా ID తో ఏ ప్రొఫైల్ దొరకలేదు. దయచేసి రిజిస్టర్ అవ్వండి.")
        
    ensure_referrer_profile(target, DB_USERS)
    return {
        "success": True,
        "tsap_id": target.get("tsap_id"),
        "full_name": target.get("full_name") or target.get("name", ""),
        "referral_code": target.get("referral_code"),
        "referral_link": target.get("referral_link") or f"https://manavivaha.in/r/{target.get('referral_code')}",
    }


def _user_or_404(tsap_id: str) -> Dict:
    raw = (tsap_id or "").strip()
    u = next((x for x in DB_USERS if x.get("tsap_id", "").upper() == raw.upper()), None)
    if u:
        return u
    # Check by referral code
    u = next((x for x in DB_USERS if str(x.get("referral_code", "")).upper() == raw.upper()), None)
    if u:
        return u
    # Check by phone
    clean_p = re.sub(r"\D", "", raw)
    if len(clean_p) >= 10:
        u = next((x for x in DB_USERS if str(x.get("phone", "")).endswith(clean_p[-10:])), None)
        if u:
            return u
    # Check via referral module finder
    try:
        u = referral_find_referrer(raw, DB_USERS)
        if u:
            return u
    except Exception:
        pass
    raise HTTPException(404, "User not found — ID లేదా రిఫరల్ కోడ్ సరిచూసుకోండి")


@app.get("/api/referral/earnings-card")
def referral_earnings_card_public(
    code: str = "",
    name: str = "",
    amount: int = 0,
    paid_count: int = 0,
    tier: str = "",
    format: str = "story",
):
    """Legacy URL now returns a real referral QR poster; caller display fields are ignored."""
    # Do not let query parameters manufacture earnings, payout proof, tiers, or names.
    owner = _user_or_404(code)
    owner_id = str(owner.get("tsap_id") or owner.get("partner_id") or code)
    return referral_poster(owner_id, "status" if format.lower() in ("story", "status") else "square")

@app.get("/api/referral/terms")
def referral_terms():
    """📜 Referral rules — one-time qualifying-plan reward, exclusions, and payout review."""
    return {"success": True, **referral_terms_telugu()}


@app.get("/api/referral/{tsap_id}")
def referral_home(tsap_id: str, request: Request = None):
    """
    📊 Mee referral dashboard — code, link, clicks, registrations, payments, wallet,
    tier, next milestone, ledger, payouts. (Tenant-safe: mee ID matrame chudochu.)
    """
    user = _user_or_404(tsap_id)
    require_owner(request, tsap_id)
    d = referral_dashboard(user, DB_USERS)
    d["share_kit"] = referral_share_kit(user)
    return d


@app.get("/api/referral/{tsap_id}/wallet")
def referral_wallet(tsap_id: str, request: Request = None, types: str = "", limit: int = 100):
    """💎 Wallet statement — every entry with a running balance and an identity check."""
    user = _user_or_404(tsap_id)
    require_owner(request, tsap_id)
    parts = [t for t in re.split(r"[^a-z_]+", (types or "").lower()) if t]
    return REFERRAL.wallet_statement(user, types=parts or None,
                                     limit=clamp_int(limit, "limit", 1, 500, 100))


@app.get("/api/referral/{tsap_id}/wallet.csv")
def referral_wallet_csv(tsap_id: str, request: Request = None):
    """💎 The same statement as a CSV a member can keep or hand to their CA.

    Identical numbers to the JSON statement — including the reconciliation —
    so an exported file can never tell a different story from the screen.
    """
    import csv
    import io

    user = _user_or_404(tsap_id)
    require_owner(request, tsap_id)
    data = REFERRAL.wallet_statement(user, types=None, limit=500)
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["date", "type", "description", "amount_inr", "balance_after_inr",
                     "from_profile", "plan", "reference"])
    for row in data.get("entries", []):
        writer.writerow([
            row.get("at", ""), row.get("type", ""), row.get("label_en", ""),
            row.get("amount", 0), row.get("balance_after", 0),
            row.get("from_name", "") or row.get("from", ""),
            ("%s %s" % (row.get("plan_code", ""), row.get("plan_amount", ""))).strip(),
            row.get("utr", "") or row.get("id", ""),
        ])
    identity = data.get("identity", {})
    writer.writerow([])
    writer.writerow(["reconciles", "yes" if identity.get("reconciles") else "no"])
    writer.writerow(["identity", identity.get("formula_en", "")])
    writer.writerow(["note", data.get("note_en", "")])
    body = buf.getvalue()
    return Response(
        content=body,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition":
                 f'attachment; filename="manavivaha-referral-wallet-{str(tsap_id).upper()}.csv"'},
    )


@app.get("/api/referral/{tsap_id}/earnings")
def referral_earnings(tsap_id: str, request: Request = None):
    """💎 Per-friend earnings explainer — stage, why, and what would have to happen next."""
    user = _user_or_404(tsap_id)
    require_owner(request, tsap_id)
    return REFERRAL.earnings_explainer(user, DB_USERS)


@app.get("/api/referral/{tsap_id}/insights")
def referral_insights_api(tsap_id: str, request: Request = None):
    """💎 What actually worked for this referrer — own data only, small samples labelled."""
    user = _user_or_404(tsap_id)
    require_owner(request, tsap_id)
    return REFERRAL.referral_insights(user, DB_USERS)


@app.get("/api/referral/{tsap_id}/invites")
def referral_invites(tsap_id: str, request: Request = None, limit: int = 100):
    """💎 Per-person invites with their stage (sent → opened → joined → rewarded)."""
    user = _user_or_404(tsap_id)
    require_owner(request, tsap_id)
    return REFERRAL.invite_list(user, limit=clamp_int(limit, "limit", 1, 300, 100))


@app.post("/api/referral/{tsap_id}/invite")
def referral_invite_create(tsap_id: str, payload: dict, request: Request = None):
    """💎 Create one tracked invite for one person.

    Nothing is delivered server-side: the response carries a wa.me / telegram /
    sms link with a personalised, policy-accurate message, and the member taps
    send in their own app.
    """
    user = _user_or_404(tsap_id)
    require_owner(request, tsap_id)
    d = payload or {}
    res = REFERRAL.invite_create(
        user,
        name=str(d.get("name", "")),
        phone=str(d.get("phone", "")),
        channel=str(d.get("channel", "whatsapp")),
        variant=d.get("variant", 0),
        all_users=DB_USERS,
    )
    if not res.get("ok"):
        return JSONResponse(status_code=400,
                            content={"success": False, "reason": res.get("reason"),
                                     "message_en": res.get("message_en", ""),
                                     "message_telugu": res.get("message_telugu", "")})
    return {"success": True, **res}


@app.get("/api/referral/{tsap_id}/share-kit")
def referral_share(tsap_id: str):
    """📲 5 ready WhatsApp messages + Telegram + SMS + poster text (Telugu)."""
    user = _user_or_404(tsap_id)
    kit = referral_share_kit(user)
    return {"success": True, **kit}


@app.get("/api/referral/{tsap_id}/earnings-card.png")
def referral_earnings_card_user(tsap_id: str, format: str = "story"):
    """Legacy endpoint returns the user's referral QR poster, never an earnings proof."""
    return referral_poster(tsap_id, "status" if format.lower() in ("story", "status") else "square")

@app.get("/api/referral/{tsap_id}/poster.png")
def referral_poster(tsap_id: str, style: str = "square"):
    """🖼️ Referral poster (QR తో) — square (1080×1080) leda status (1080×1920)."""
    user = _user_or_404(tsap_id)
    ensure_referrer_profile(user, DB_USERS)
    try:
        import referral_kit
        path = referral_kit.poster_card(user, style=("status" if style == "status" else "square"))
        return FileResponse(path, media_type="image/png",
                            filename="manavivaha-referral-%s-%s.png" % (user.get("referral_code", "mv"), style))
    except Exception as e:
        raise HTTPException(500, "Poster generate avvaledu: %s" % str(e)[:120])


@app.post("/api/referral/click/{code}")
def referral_click(code: str, source: str = "link", inv: str = "", request: Request = None):
    """/r/<code> link click — funnel tracking (clicks → registrations → payments).

    `inv` is a per-person invite token: when present, that one invite is marked
    opened so the referrer can see which of their people actually looked.
    """
    code = clean(code, 80, "referral_click:code").upper()
    source = clean(source, 40, "referral_click:source").lower() or "link"
    allowed_sources = {"link", "telegram", "whatsapp", "channel", "share", "register_direct", "invite", "website", "test"}
    if source not in allowed_sources:
        source = "other"
    inv = clean(inv, 64, "referral_click:invite").upper()
    if not code or not re.fullmatch(r"[A-Z0-9_-]{1,80}", code):
        raise HTTPException(404, "Referral link not found")
    if inv and not re.fullmatch(r"[A-Z0-9_-]{1,64}", inv):
        raise HTTPException(400, "Invite link is invalid")

    known = validate_referral(code, DB_USERS)
    kind = "user"
    partner = None
    try:
        partner = RP19.get_partner(code)
    except Exception:
        partner = None
    if not known.get("ok") and not partner:
        # Do not let arbitrary codes inflate click analytics or consume an
        # invite-click write before the optional code is even known.  Preserve
        # the landing-page response shape so old clients can show an invalid
        # referral without treating it as a server failure.
        return {"success": True, "code": code, "valid_code": False,
                "referrer_name": "", "bonus_credits": 0, "kind": "unknown",
                "clicks_total": 0}

    request_id = ""
    if request is not None:
        request_id = re.sub(r"[^A-Za-z0-9._:-]", "", request.headers.get("x-request-id", ""))[:96]
    # Browser refreshes have no request ID, so use a short identity window. A
    # caller-provided request ID is still bound to the code/token and cannot be
    # replayed for another referral.
    identity = client_ip(request) if request is not None else "unknown"
    user_agent = str(request.headers.get("user-agent", ""))[:160] if request is not None else ""
    dedupe_key = "|".join((request_id or f"window:{int(time.time() // 600)}", identity, user_agent, code, inv))
    st = track_click(code, source, dedupe_key=dedupe_key)
    if not st.get("ok"):
        raise HTTPException(503, "Referral click could not be recorded safely. Please try again.")
    if inv and not st.get("duplicate") and not REFERRAL.invite_record_click(code, inv, DB_USERS):
        raise HTTPException(503, "Invite click could not be recorded safely. Please try again.")
    if partner and not st.get("duplicate"):
        if not RP19.record_click(code):
            raise HTTPException(503, "Partner click could not be recorded safely. Please try again.")
        kind = "partner"
    return {"success": True, **st, "valid_code": known.get("ok", False),
            "referrer_name": known.get("referrer_name", ""),
            "bonus_credits": known.get("bonus_credits", 0), "kind": kind}


@app.get("/api/referral/validate/{code}")
def referral_validate(code: str):
    """Register form / landing page — 'ee code pani chestunda?' + bonus info."""
    return {"success": True, **validate_referral(code, DB_USERS)}


@app.post("/api/referral/payout")
def referral_payout(tsap_id: str, amount: int, method: str = "upi", upi_id: str = "",
                    account_no: str = "", ifsc: str = "", holder: str = "", request: Request = None):
    """
    Create a referral-wallet payout request (minimum configured in referral terms).
    Requests enter manual admin review; no fixed processing time is promised.
    """
    user = _user_or_404(tsap_id)
    require_owner(request, tsap_id)   # 🛡️ IDOR: mee payout matrame
    bank = {"account_no": account_no, "ifsc": ifsc, "holder": holder} if method == "bank" else None
    res = payout_request(user, amount, method=method, upi_id=upi_id, bank=bank)
    if not res.get("ok"):
        status_code = 503 if res.get("reason") == "persistence_failed" else 400
        return JSONResponse(status_code=status_code, content={"success": False, **res})
    return {"success": True, **res}


@app.post("/api/referral/partner/register")
def referral_partner_register(payload: dict):
    """🤝🌊 WAVE 19 — Partner profile create (name/phone/phonepe/address/state/district) → ID + link + sheet."""
    d = payload or {}
    res = RP19.register_partner(str(d.get("name", "")), str(d.get("phone", "")),
                                str(d.get("phonepe", "")), str(d.get("address", "")),
                                str(d.get("state", "")), str(d.get("district", "")))
    if not res.get("success"):
        raise HTTPException(400, res.get("message_telugu"))
    RP19.record_click(res["partner_id"])  # self-view counts as first touch (funnel start)
    return res


@app.get("/api/referral/partner/{pid}")
def referral_partner_public(pid: str):
    """Public-safe partner metrics only; no names, identities, wallet, or payout totals."""
    res = RP19.partner_public(pid, DB_USERS)
    if not res.get("success"):
        raise HTTPException(404, res.get("message_telugu"))
    return res


def _require_partner_token(request: Request, partner_id: str) -> None:
    raw = (request.headers.get("x-partner-token") or "").strip()
    ident = verify_token(raw) if raw else None
    if (not ident or ident.get("scope") != "partner"
            or ident.get("tsap_id") != f"partner:{partner_id}"):
        raise HTTPException(401, "🔒 Verify the partner's registered mobile to view wallet or request a payout")


@app.post("/api/referral/partner/{pid}/auth")
def referral_partner_auth(pid: str, payload: dict):
    """Issue a short-lived partner dashboard token after fresh OTP verification."""
    partner = RP19.get_partner(pid)
    if not partner:
        raise HTTPException(404, "⚠️ Partner ID దొరకలేదు")
    phone = req_phone((payload or {}).get("phone", ""))
    verified_at = int(VERIFIED_PHONE_AT.get(phone, 0) or 0)
    if (phone != partner.get("phone") or phone not in VERIFIED_PHONES
            or not verified_at or int(time.time()) - verified_at > 600):
        raise HTTPException(401, "🔒 Partner phone verification expired or does not match; request and verify a fresh OTP")
    token = sign_token(f"partner:{partner['partner_id']}", ttl_seconds=3600, scope="partner")
    return {"success": True, "partner_token": token, "expires_in_seconds": 3600}


@app.get("/api/referral/partner/{pid}/private")
def referral_partner_private(pid: str, request: Request):
    """Financial partner dashboard protected by the short-lived OTP-derived token."""
    partner = RP19.get_partner(pid)
    if not partner:
        raise HTTPException(404, "⚠️ Partner ID దొరకలేదు")
    _require_partner_token(request, partner["partner_id"])
    return RP19.partner_private(partner["partner_id"], DB_USERS)


@app.post("/api/referral/partner/click/{pid}")
def referral_partner_click(pid: str):
    """🤝 Partner link click tracking."""
    RP19.record_click(pid)
    track_click(pid, "partner_link")
    return {"success": True, "partner_id": pid}


@app.post("/api/referral/partner/payout")
def referral_partner_payout(payload: dict, request: Request):
    """Create a reviewed payout request using the OTP-derived partner session."""
    d = payload or {}
    p = RP19.get_partner(str(d.get("partner_id", "")))
    if not p:
        raise HTTPException(404, "⚠️ Partner ID దొరకలేదు")
    _require_partner_token(request, p["partner_id"])
    amount = req_int(d.get("amount"), "amount", 1, 1_000_000)
    res = payout_request(p, amount, method=str(d.get("method", "upi")),
                         upi_id=str(d.get("upi_id", "")), bank=d.get("bank"),
                         note="partner:" + p["partner_id"])
    if not res.get("ok"):
        status_code = 503 if res.get("reason") == "persistence_failed" else 400
        raise HTTPException(status_code, res.get("message_telugu"))
    return {"success": True, **res}


@app.get("/api/admin/referrals/report")
def admin_referrals_report(request: Request):
    """🤝🌊 WAVE 19 ADMIN — ఎవరికీ entha + evari referral లో ఎవరు (partners + users, earning sort)."""
    require_admin(request)
    return RP19.admin_report(DB_USERS)



@app.get("/api/admin/referrals/ledger")
def admin_referrals_ledger(code: str = "", request: Request = None):
    """🤝🌊 WAVE 20 — ADMIN per-join commission drilldown: evaru join, eppudu,
    pay chesara, commission entha, wallet/paid status. Manual payout ki mundhu chuse ledger."""
    require_admin(request)
    probe = (code or "").strip()
    if not probe:
        raise HTTPException(400, "code ఇవ్వండి (?code=CHARAN519)")
    ref = referral_find_referrer(probe, DB_USERS)
    if not ref:
        raise HTTPException(404, "⚠️ Referrer dorakaledu")
    is_partner = bool(ref.get("partner_id"))
    rcode = ref.get("partner_id") if is_partner else referral_code_of(ref)
    st = referral_stats_of(ref)
    eligible_commissions = referral_qualifying_commissions(st)
    # Joins under this referrer; only active, auditable qualifying entries count as rewards.
    joins = []
    for u in DB_USERS:
        rb = str(u.get("referred_by", "") or "")
        if rb.lower() != str(rcode).lower():
            continue
        comm = next((l for l in eligible_commissions if str(l.get("from")) == str(u.get("tsap_id"))), None)
        earned = FIRST_PAY_COMMISSION if comm else 0
        joins.append({"tsap_id": u.get("tsap_id", ""), "name": u.get("full_name") or u.get("name", ""),
                      "phone_masked": ("••••••" + str(u.get("phone", ""))[-2:]) if u.get("phone") else "",
                      "joined": u.get("referred_at", ""), "paid": bool(comm),
                      "commission": earned,
                      "status": ("Recorded qualifying reward: ₹%s" % earned) if comm else "No qualifying reward recorded; eligibility depends on the first eligible consumer-plan payment."})
    joins.sort(key=lambda j: j["joined"] or "", reverse=True)
    return {"success": True, "kind": "partner" if is_partner else "user",
            "id": rcode, "name": ref.get("full_name") or ref.get("name", ""),
            "wallet": st.get("wallet", 0), "lifetime_earned": st.get("lifetime_earned", 0),
            "pending_payout": st.get("pending_payout", 0), "paid_out": st.get("paid_out", 0),
            "registrations": len(joins), "paid_count": sum(1 for j in joins if j["paid"]),
            "joins": joins,
            "message_telugu": "📒 %s joins — chusi payout queue లో manual approve చెయ్యండి" % len(joins)}

@app.get("/api/admin/referrals/partners.csv")
def admin_referrals_csv(request: Request):
    """🤝 ADMIN — partners SHEET download (Excel/Sheets-ready CSV)."""
    require_admin(request)
    from fastapi.responses import FileResponse
    if not os.path.exists(RP19.CSV_FILE):
        raise HTTPException(404, "Partners ఇంకా leru — sheet khali")
    return FileResponse(RP19.CSV_FILE, media_type="text/csv", filename="referral_partners.csv")


# ============================================================================
# 🗓️ WAVE 40 — MATCHES OF THE DAY + RETENTION + EXCEL EXPORTS (admin power)
# ============================================================================
DAILY_FILE = os.environ.get("MANA_VIVAHA_DAILY_MATCHES_FILE", os.path.join(os.path.dirname(os.path.abspath(__file__)), "daily_matches.json"))


def _load_daily() -> dict:
    try:
        with open(DAILY_FILE, encoding="utf-8") as f:
            d = json.load(f)
            return d if isinstance(d, dict) else {}
    except Exception:
        return {}


def _daily_row(u: dict) -> dict:
    """Public featured-profile summary; no contact details or compatibility score."""
    private_photo = bool(u.get("photo_private") or u.get("privacy_mode") == "private")
    approved_photo = u.get("photo_status") == "approved"
    raw_photo_values = u.get("photo_urls", []) if isinstance(u.get("photo_urls"), list) else []
    candidates = [u.get("photo_url"), *raw_photo_values]
    public_photo = ""
    if approved_photo and not private_photo:
        public_photo = next((spotlight._profile_photo_url(value) for value in candidates
                             if spotlight._profile_photo_url(value)), "")
    now_iso = datetime.utcnow().isoformat()
    return {"tsap_id": sanitize_public_text(u.get("tsap_id", "")),
            "full_name": sanitize_public_text(u.get("full_name", "")),
            "gender": sanitize_public_text(u.get("gender", "")), "age": u.get("age"),
            "caste": sanitize_public_text(u.get("caste", "")),
            "district": sanitize_public_text(u.get("district", "")),
            "state": sanitize_public_text(u.get("state", "")),
            "education": sanitize_public_text(u.get("education", "")),
            "job": sanitize_public_text(u.get("job", "")),
            "salary": sanitize_public_text(u.get("salary", "")),
            "marital_status": sanitize_public_text(u.get("marital_status", "")),
            "star": sanitize_public_text(u.get("star", "")), "has_photo": bool(public_photo),
            "photo_url": public_photo,
            "card_url": "" if private_photo else u.get("card_url", ""),
            "boosted": str(u.get("boost_until") or "") > now_iso,
            "placement_label": "Sponsored placement" if str(u.get("boost_until") or "") > now_iso else "Featured profile"}


@app.get("/api/daily-matches")
def daily_matches_public():
    """Public, admin-curated featured profiles; not compatibility or identity matches."""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    ids = _load_daily().get(today, [])
    rows = []
    for tid in ids:
        u = _find_user(tid)
        if _is_approved_profile(u):
            rows.append(_daily_row(u))
    return {"success": True, "date": today, "count": len(rows), "featured_profiles": rows,
            "curation": "Admin-selected featured profiles; not a compatibility ranking.",
            "identity_verification": "not_performed",
            "note_telugu": "🗓️ ఇవి admin ఎంపిక చేసిన featured profiles మాత్రమే; compatibility ranking లేదా identity verification కాదు."}


@app.get("/api/admin/daily-matches/candidates")
def daily_matches_candidates(request: Request, limit: int = 60):
    """Owner/admin tool: approved non-synthetic profiles, with sponsored placement disclosed."""
    require_admin(request, staff_ok=True)
    limit = clamp_int(limit, "limit", 1, 200, 60)
    now_iso = datetime.utcnow().isoformat()
    candidates = [u for u in DB_USERS if _is_approved_profile(u)]
    boosted = [u for u in candidates if str(u.get("boost_until") or "") > now_iso]
    boosted_ids = {id(u) for u in boosted}
    others = [u for u in candidates if id(u) not in boosted_ids]
    others.sort(key=lambda u: str(u.get("created_at", "")), reverse=True)
    rows = []
    for u in (boosted + others)[:limit]:
        rows.append({**_daily_row(u), "boost_active": id(u) in boosted_ids})
    today = datetime.utcnow().strftime("%Y-%m-%d")
    return {"success": True, "today": _load_daily().get(today, []), "boosted_count": len(boosted),
            "count": len(rows), "candidates": rows,
            "ordering": "Active paid boost placement, then recency; not a compatibility ranking.",
            "note_telugu": "ఆమోదించిన profiles మాత్రమే. Active paid boost ఉంటే sponsored placement గా గుర్తించి, తర్వాత recency క్రమంలో చూపిస్తాం; ఇది compatibility ranking కాదు."}


@app.post("/api/admin/daily-matches")
async def daily_matches_set(payload: dict, request: Request):
    """Set today's admin-curated featured profiles; external publishing is explicit."""
    require_admin(request, staff_ok=True)
    raw_ids = (payload or {}).get("profile_ids", [])
    if not isinstance(raw_ids, list):
        raise HTTPException(400, "profile_ids must be a list")
    ids = list(dict.fromkeys(str(x).strip().upper() for x in raw_ids if str(x).strip()))[:30]
    if not ids:
        raise HTTPException(400, "profile_ids list is required")
    users = []
    for tid in ids:
        u = _find_user(tid)
        if not u or _is_synthetic_profile(u):
            raise HTTPException(404, "Profile not found")
        if not _is_approved_profile(u):
            raise HTTPException(409, "Only approved, active profiles can be featured")
        users.append(u)

    # Metadata-only selection is the safe default. Posting is a separate, explicit action.
    do_post = bool((payload or {}).get("post_to_channels", False))
    posted, would_post, queued, failed = [], [], [], []
    if do_post:
        for u in users:
            try:
                result = await publish_profile(u, u["tsap_id"])
                if not isinstance(result, dict):
                    raise RuntimeError("Publisher returned an invalid result")
                tg_results = result.get("telegram", [])
                wa_results = (result.get("whatsapp", {}).get("results", [])
                              if isinstance(result, dict) else [])
                wa_queued = any(row.get("queued") for row in wa_results if isinstance(row, dict))
                dry_run_targets = any(row.get("dry_run") for row in tg_results if isinstance(row, dict))
                if result.get("dry_run"):
                    if dry_run_targets or wa_queued:
                        would_post.append(u["tsap_id"])
                    else:
                        failed.append({"id": u["tsap_id"], "error": "No configured publishing route."})
                    continue
                accepted = [row for row in tg_results
                            if isinstance(row, dict) and row.get("ok") and not row.get("dry_run")
                            and not row.get("skipped")]
                if accepted:
                    posted.append({"id": u["tsap_id"], "accepted_by_api": len(accepted)})
                if wa_queued:
                    queued.append(u["tsap_id"])
                if not accepted and not wa_queued:
                    failed.append({"id": u["tsap_id"], "error": "No publishing API accepted or queued a post."})
            except Exception as e:
                failed.append({"id": u["tsap_id"], "error": str(e)[:80]})

    today = datetime.utcnow().strftime("%Y-%m-%d")
    data = _load_daily()
    data[today] = ids
    try:
        atomic_json_dump(DAILY_FILE, {k: v for k, v in sorted(data.items())[-60:]},
                         ensure_ascii=False, default=str)
    except Exception as e:
        print("[DAILY] save fail:", str(e)[:80])
    return {"success": True, "date": today, "selected": ids,
            "posting_attempted": do_post, "posted": posted, "would_post": would_post,
            "queued": queued, "failed": failed, "external_delivery_verified": False,
            "message_telugu": f"🗓️ {len(ids)} profiles featured జాబితాలో సేవ్ అయ్యాయి. API accepted: {len(posted)}; queue accepted: {len(queued)}; dry-run: {len(would_post)}; failed: {len(failed)}. Delivery/read confirmation లేదు."}


@app.get("/api/admin/whoami")
def admin_whoami(request: Request):
    """👤 WAVE 41 — current role: owner (full) | staff (limited tabs). Frontend tab gating."""
    role = require_admin(request, staff_ok=True)  # owner | staff (lekapote 403)
    return {"success": True, "role": role,
            "staff_key_configured": bool(os.getenv("STAFF_KEY", "").strip()),
            "message_telugu": "👤 Owner — అన్ని sections" if role == "owner" else "👤 Staff — limited sections (money/data లేదు)"}


# ============================================================================
# 🎊 WAVE 41 — WEEKLY CASTE SHOWCASE (వారానికి ఒక కులం — vivaha parichayam)
# ============================================================================
SHOWCASE_FILE = os.environ.get("MANA_VIVAHA_WEEKLY_SHOWCASE_FILE", os.path.join(os.path.dirname(os.path.abspath(__file__)), "weekly_showcase.json"))
SHOWCASE_MAX = 12  # okka week ki max profiles


def _load_showcase() -> dict:
    try:
        with open(SHOWCASE_FILE, encoding="utf-8") as f:
            d = json.load(f)
            return d if isinstance(d, dict) else {}
    except Exception:
        return {}


def _week_key() -> str:
    return datetime.utcnow().strftime("%G-W%V")


def _caste_rotation(all_castes, last_caste):
    """Okko varam okko caste — list order lo rotation (next after last)."""
    if not all_castes:
        return ""
    if last_caste in all_castes:
        i = all_castes.index(last_caste)
        return all_castes[(i + 1) % len(all_castes)]
    return all_castes[0]


@app.get("/api/showcase")
def showcase_public():
    """Public weekly showcase; re-checks each selected profile's current active/approval state."""
    data = _load_showcase()
    wk = _week_key()
    cur = data.get(wk) or {}
    ids = cur.get("ids", [])
    rows = []
    for tid in ids:
        u = _find_user(tid)
        if _is_approved_profile(u):
            rows.append(_daily_row(u))
    prev_wk = None
    return {"success": True, "week": wk, "caste": cur.get("caste", ""), "count": len(rows),
            "matches": rows, "next_rotation": cur.get("next_caste", ""),
            "note_telugu": "🎊 ఈ వారం %s caste showcase — వారానికి ఒక కులం, ఆ caste best profiles ఇక్కడ" % (cur.get("caste") or "—")}


@app.get("/api/admin/showcase/candidates")
def showcase_candidates(request: Request, caste: str = "", limit: int = 40):
    """Admin/Staff — one community's approved profiles, ordered by reviewed photo then recency."""
    require_admin(request, staff_ok=True)
    limit = clamp_int(limit, "limit", 1, 100, 40)
    caste = (caste or "").strip()
    if not caste:
        raise HTTPException(400, "caste param కావాలి (ex: ?caste=Reddy)")
    rows = [u for u in DB_USERS if str(u.get("caste", "")).lower() == caste.lower()
            and _is_approved_profile(u)]
    rows.sort(key=lambda u: (
        bool(u.get("photo_status") == "approved" and u.get("photo_url")
             and not (u.get("photo_private") or u.get("privacy_mode") == "private")),
        str(u.get("created_at") or ""),
    ), reverse=True)
    data = _load_showcase()
    wk = _week_key()
    last = None
    for k in sorted(data.keys(), reverse=True):
        if data[k].get("caste"):
            last = data[k]["caste"]
            break
    all_castes = sorted({str(u.get("caste", "")).strip() for u in DB_USERS if u.get("caste")})
    nxt = _caste_rotation(all_castes, caste)
    return {"success": True, "week": wk, "caste": caste, "count": len(rows),
            "current_week": data.get(wk, {}),
            "next_caste_suggestion": nxt, "last_caste": last or "",
            "candidates": [_daily_row(u) for u in rows[:limit]],
            "note_telugu": "🎊 వారానికి ఒక caste — ఈ వారం %s. Approved public photos appear first; ties use recent profile creation." % caste}


@app.post("/api/admin/showcase")
async def showcase_set(payload: dict, request: Request):
    """Admin/Staff — select active approved on-site showcase profiles; channel posting requires explicit opt-in."""
    require_admin(request, staff_ok=True)
    d = payload or {}
    caste = str(d.get("caste", "")).strip()
    if not caste:
        raise HTTPException(400, "caste ఇవ్వండి (ex: Reddy)")
    ids = [str(x).strip().upper() for x in d.get("profile_ids", []) if str(x).strip()]
    if not ids:
        raise HTTPException(400, "profile_ids list ఇవ్వండి")
    ids = ids[:SHOWCASE_MAX]
    users = []
    for tid in ids:
        u = _find_user(tid)
        if not u:
            raise HTTPException(404, f"ID {tid} దొరకలేదు")
        if not _is_approved_profile(u):
            raise HTTPException(409, f"ID {tid} is not an active, approved profile")
        if str(u.get("caste", "")).lower() != caste.lower():
            raise HTTPException(400, f"ID {tid} caste {u.get('caste')} — showcase caste {caste} కాదు")
        users.append(u)
    # Publishing externally is opt-in; omitting the flag only saves the on-site selection.
    do_post = d.get("post_to_channels") is True
    posted, failed = [], []
    if do_post:
        for u in users:
            try:
                await publish_profile(u, u["tsap_id"])
                posted.append(u["tsap_id"])
            except Exception as e:
                failed.append({"id": u["tsap_id"], "error": str(e)[:80]})
    all_castes = sorted({str(u.get("caste", "")).strip() for u in DB_USERS if u.get("caste")})
    data = _load_showcase()
    wk = _week_key()
    data[wk] = {"caste": caste, "ids": ids, "set_at": datetime.utcnow().isoformat(),
                "next_caste": _caste_rotation(all_castes, caste)}
    try:
        atomic_json_dump(SHOWCASE_FILE, dict(sorted(data.items())[-104:]),
                         ensure_ascii=False, default=str)
    except Exception as e:
        print("[SHOWCASE] save fail:", str(e)[:80])
    return {"success": True, "week": wk, "caste": caste, "selected": ids,
            "posted": posted, "failed": failed, "next_caste": data[wk]["next_caste"],
            "message_telugu": f"🎊 ఈ వారం {caste} showcase — {len(ids)} profiles ({len(posted)} caste channels lo post)"}


# ============================================================================
# 🌟 WAVE 42 — PROFILES OF THE DAY & PAID SPOTLIGHT PROMOTION API
# ============================================================================
@app.get("/api/spotlight/rates")
def spotlight_rates():
    """Public — paid sponsored profile-spotlight rates and disclosed on-site terms."""
    return {"success": True, "tiers": spotlight.SPOTLIGHT_TIERS,
            "headline_te": "🌟 చెల్లింపు స్పాన్సర్డ్ ప్రొఫైల్ ప్రమోషన్ కోసం దరఖాస్తు చేయండి",
            "headline_en": "Apply for a paid sponsored profile placement"}


def _current_public_spotlights(limit: int = 12) -> list:
    """Re-check the current profile state so deactivated/private records stop being promoted."""
    rows = spotlight.get_active_spotlights(limit=30)
    public = []
    for row in rows:
        user = _find_user(str(row.get("tsap_id") or ""))
        if not _is_approved_profile(user):
            continue
        status = str(user.get("status") or "").strip().lower()
        active_flag = str(user.get("is_active", "true")).strip().lower()
        if status in {"pending", "deleted", "married_fixed", "banned", "rejected"} or active_flag in {"0", "false", "no", "off"}:
            continue
        current_photo = ""
        if (user.get("photo_status") == "approved"
                and not (user.get("photo_private") or user.get("privacy_mode") == "private")):
            current_photo = spotlight._profile_photo_url(user.get("photo_url"))
        safe_row = dict(row)
        if not current_photo or current_photo != str(row.get("photo_url") or ""):
            safe_row["photo_url"] = ""
        public.append(safe_row)
        if len(public) >= limit:
            break
    return public


@app.get("/api/spotlight/active")
@app.get("/api/spotlight/today")
def spotlight_active(limit: int = 12):
    """Public — currently approved, paid, unexpired placements on active profiles; not identity-verified."""
    limit = max(1, min(int(limit), 30))
    active = _current_public_spotlights(limit=limit)
    return {"success": True, "count": len(active), "items": active,
            "message_telugu": f"🌟 ప్రస్తుతం ఆమోదించిన sponsored profiles: {len(active)} (గుర్తింపు స్వతంత్రంగా నిర్ధారించబడదు)"}


@app.post("/api/spotlight/apply")
def spotlight_apply(payload: dict, request: Request):
    """Registered owner submits a real UTR; listing remains hidden until payment and media are reviewed."""
    d = payload or {}
    tsap_id = str(d.get("tsap_id") or "").strip().upper()
    require_owner(request, tsap_id)
    user = _find_user(tsap_id)
    if not user:
        raise HTTPException(404, "Registered profile not found.")

    pay_cfg = PP.pay_config()
    if pay_cfg.get("mode") != "manual_upi" or not pay_cfg.get("upi_id"):
        raise HTTPException(503, "Spotlight manual payment is unavailable until a verified merchant UPI destination is configured.")

    try:
        entry = spotlight.create_spotlight_submission(
            user=user,
            plan_code=str(d.get("plan_code") or "SPOT_3").strip().upper(),
            headline=str(d.get("headline") or "").strip(),
            pitch_text=str(d.get("pitch_text") or "").strip(),
            photo_url=str(d.get("photo_url") or "").strip(),
            video_url=str(d.get("video_url") or "").strip(),
            payment_mode="manual_upi",
            payment_ref=str(d.get("payment_ref") or "").strip(),
            contact_opt=str(d.get("contact_opt") or "send_interest").strip(),
            consent_confirmed=req_bool(d.get("consent_confirmed")),
            auto_approve=False,
        )
        return {"success": True, "item": entry,
                "message_en": "Application received. It stays private until the UTR is matched to the bank statement and the submitted profile/media review is recorded.",
                "message_telugu": "మీ దరఖాస్తు అందింది. UTR ను బ్యాంక్ స్టేట్‌మెంట్‌తో సరిపోల్చి, ప్రొఫైల్/మీడియా సమీక్ష నమోదు చేసే వరకు ఇది public లో కనిపించదు."}
    except Exception as e:
        raise HTTPException(400, str(e))


@app.post("/api/spotlight/track/{promo_id}")
def spotlight_track(promo_id: str, kind: str = "click"):
    """Track view/click/interest for analytics."""
    spotlight.record_spotlight_interaction(promo_id, kind=kind)
    return {"success": True}


@app.get("/api/admin/spotlight/queue")
def admin_spotlight_queue(request: Request, status: str = "all", limit: int = 50):
    """Owner-only review queue for paid spotlight submissions and UTR references."""
    require_admin(request)
    limit = clamp_int(limit, "limit", 1, 100, 50)
    all_promos = spotlight._load_spotlights()
    if status != "all":
        filtered = [p for p in all_promos if p.get("status") == status]
    else:
        filtered = all_promos
    filtered.sort(key=lambda x: str(x.get("submitted_at", "")), reverse=True)
    return {"success": True, "items": filtered[:limit], "total": len(filtered)}


@app.post("/api/admin/spotlight/{promo_id}/action")
def admin_spotlight_action(promo_id: str, payload: dict, request: Request):
    """Owner-only payment verification and approval actions for spotlight promotions."""
    moderator = require_admin(request)
    d = payload or {}
    action = str(d.get("action", "")).strip().lower()
    notes = str(d.get("notes", "")).strip()
    override_days = int(d.get("days", 0)) or None
    try:
        updated = spotlight.moderate_spotlight(
            promo_id=promo_id,
            action=action,
            moderator=f"admin ({moderator})",
            notes=notes,
            override_days=override_days
        )
        return {"success": True, "item": updated,
                "message_telugu": f"✅ ప్రమోషన్ {action} పూర్తయింది"}
    except Exception as e:
        raise HTTPException(400, str(e))


@app.get("/api/admin/retention/preview")
def admin_retention_preview(request: Request, years: int = 0):
    """🗑️ Admin — 3-year policy: ye profiles delete avtayi (dry preview)."""
    require_admin(request)
    p = RETENTION.preview(DB_USERS, years or None)
    return {"success": True, **p, "policy_years": RETENTION.RETENTION_YEARS,
            "note_telugu": "Money/plan active ఉన్న profiles skip — archive ముందే జరుగుతుంది, డేటా పోదు"}


@app.post("/api/admin/retention/run")
def admin_retention_run(payload: dict, request: Request):
    """🗑️ Admin — retention run NOW (archive → delete → save)."""
    require_admin(request)
    years = int((payload or {}).get("years", 0) or 0) or None
    try:
        res = _retention_cycle(years)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc
    return {"success": True, **res}


def _csv_response(header, rows, filename):
    import csv
    import io as _io
    def safe_cell(value):
        text = "" if value is None else str(value)
        # Excel/Sheets execute member-entered cells beginning with these
        # characters as formulas, even when csv.writer quotes them.
        if text.startswith(("=", "+", "-", "@")):
            text = "'" + text
        return text
    buf = _io.StringIO()
    w = csv.writer(buf)
    w.writerow(header)
    for r in rows:
        w.writerow([safe_cell(v) for v in r])
    return Response("\ufeff" + buf.getvalue(), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@app.get("/api/admin/export/users.csv")
def admin_export_users(request: Request):
    """📤 ADMIN — FULL profiles sheet (Excel-ready CSV, Telugu BOM tho)."""
    require_admin(request)
    hdr = ["profile_id", "name", "gender", "age", "phone", "caste", "religion", "district", "state",
           "education", "job", "salary", "marital_status", "height", "star", "raasi", "created_at",
           "credits", "plan", "wallet", "lifetime_earned", "phone_verified", "has_photo", "boost_until", "banned"]
    rows = [[u.get("tsap_id"), u.get("full_name"), u.get("gender"), u.get("age"), u.get("phone"),
             u.get("caste"), u.get("religion"), u.get("district"), u.get("state"),
             u.get("education"), u.get("job"), u.get("salary"), u.get("marital_status"), u.get("height"),
             u.get("star"), u.get("raasi"), u.get("created_at"), u.get("credits"), u.get("plan"),
             u.get("wallet", 0), u.get("lifetime_earned", 0), bool(u.get("phone_verified")),
             bool(u.get("photo_url") or u.get("photo_path")), u.get("boost_until", ""), bool(u.get("is_banned"))]
            for u in DB_USERS]
    return _csv_response(hdr, rows, "manavivaha_profiles.csv")


@app.get("/api/admin/export/payments.csv")
def admin_export_payments(request: Request):
    """📤 ADMIN — payments sheet (orders + status + UTR)."""
    require_admin(request)
    hdr = ["order_id", "profile_id", "plan", "amount", "status", "utr", "at"]
    rows = [[p.get("order_id"), p.get("tsap_id"), p.get("plan") or p.get("kind"), p.get("amount"),
             p.get("status"), p.get("utr", ""), p.get("at")] for p in DB_PAYMENTS]
    return _csv_response(hdr, rows, "manavivaha_payments.csv")


@app.get("/api/admin/export/leads.csv")
def admin_export_leads(request: Request):
    """📤 ADMIN — leads sheet (name/phone/source/status)."""
    require_admin(request)
    hdr = ["name", "phone", "source", "status", "touches", "at", "note"]
    rows = [[l.get("name", ""), l.get("phone", ""), l.get("source", ""), l.get("status", ""),
             l.get("touches", 1), l.get("at", ""), l.get("note", "")] for l in growth.DB_LEADS]
    return _csv_response(hdr, rows, "manavivaha_leads.csv")


@app.get("/api/referral/{tsap_id}/payouts")
def referral_payouts(tsap_id: str, request: Request = None):
    """మీ payout history — request → paid/rejected + UTR."""
    require_owner(request, tsap_id)   # 🛡️ WAVE 9: IDOR fix — own data matrame
    user = _user_or_404(tsap_id)
    st = referral_stats_of(user)
    mine = [p for p in payout_queue("")["items"] if p.get("tsap_id") == tsap_id]
    return {"success": True, "wallet": st.get("wallet", 0), "pending": st.get("pending_payout", 0),
            "paid_out": st.get("paid_out", 0), "min_payout": MIN_PAYOUT, "count": len(mine),
            "payouts": [referral_mask_payout(p) for p in list(reversed(mine))[:20]],
            "message_telugu": f"💸 Min ₹{MIN_PAYOUT}. Request admin review లో ఉంటుంది; fixed processing time హామీ లేదు."}




# ---------------------------------------------------------------------------
# 🔐 ADMIN GUARD — payout approve/reject lo MONEY move avutundi, kabatti token
#    ADMIN_TOKEN env set cheste aa token lekunda evaru kooda cheyyaledu.
#    (dev/preview lo env lekapote open — kaani response lo warning untundi)
# ---------------------------------------------------------------------------
def _admin_guard(token: str = ""):
    expected = os.getenv("ADMIN_TOKEN", "").strip()
    if expected and token.strip() != expected:
        return JSONResponse(status_code=401, content={
            "success": False, "reason": "unauthorized",
            "message_telugu": "🔐 Admin token అవసరం — ADMIN_TOKEN header/query పంపండి"})
    return None


@app.get("/api/admin/payouts")
def admin_payout_list(status: str = "requested", token: str = "", request: Request = None):
    """👮 Admin — payout queue (approve/reject). ADMIN_TOKEN set అయితే token కావాలి."""
    require_admin(request)   # 🛡️ WAVE 9: admin key lekunda 403 (PII/money/)
    _g = _admin_guard(token)
    if _g:
        return _g
    res = payout_queue(status)
    res["guard"] = "token_required" if os.getenv("ADMIN_TOKEN", "").strip() else "open_dev_mode"
    if not os.getenv("ADMIN_TOKEN", "").strip():
        res["warning_telugu"] = "⚠️ ADMIN_TOKEN env set చెయ్యండి — appudu admin endpoints lock అవుతాయి"
    return {"success": True, **res}


@app.post("/api/admin/payouts/{request_id}/action")
def admin_payout_action(request_id: str, action: str, utr: str = "", reason: str = "", token: str = "", request: Request = None):
    """✅ Approve (UTR required) leda ❌ Reject (wallet కి మళ్లీ credit)."""
    require_admin(request)   # 🛡️ WAVE 9: admin key lekunda 403 (PII/money/)
    _g = _admin_guard(token)
    if _g:
        return _g
    res = payout_action(request_id, action, DB_USERS, utr=utr, reason=reason)
    if not res.get("ok"):
        status_code = 503 if res.get("reason") == "persistence_failed" else 400
        return JSONResponse(status_code=status_code, content={"success": False, **res})
    _rq = res.get("request", {}) or {}
    MAUD.audit("payout_" + str(_rq.get("status", action)), "admin",
               {"request_id": request_id, "amount": _rq.get("amount"), "utr": _rq.get("utr", ""),
                "tsap_id": _rq.get("tsap_id", ""), "partner_id": _rq.get("partner_id", "")})
    return {"success": True, **res}


@app.post("/api/admin/referrals/pay-full")
def admin_pay_wallet_full(payload: dict, request: Request):
    """🌊 WAVE 21 — ADMIN manual pay: PhonePe/bank lo amount pampaka → wallet ₹0.
    Body: {code, utr, method?, note?}. User + partner iddariki."""
    require_admin(request)
    d = payload or {}
    res = pay_wallet_full(str(d.get("code", "")), DB_USERS, utr=str(d.get("utr", "")),
                          method=str(d.get("method", "upi")), note=str(d.get("note", "")))
    if not res.get("ok"):
        status_code = 503 if res.get("reason") == "persistence_failed" else 400
        raise HTTPException(status_code, res.get("message_telugu"))
    _rq = res.get("request", {}) or {}
    MAUD.audit("wallet_paid_full", "admin", {"code": str(d.get("code", "")), "amount": _rq.get("amount"),
                                             "utr": _rq.get("utr", "")})
    return {"success": True, **res}


@app.post("/api/admin/refund/{tsap_id}")
def admin_refund(tsap_id: str, amount: int = 0, reason: str = "refund", token: str = "", request: Request = None):
    """
    ↩️ Refund → referral commission clawback (referrer wallet nunchi theesestham).
    Customer refund adigithe idi kooda cheyyali — lekapote referrer double profit.
    """
    require_admin(request)   # 🛡️ WAVE 9: admin key lekunda 403 (PII/money/)
    _g = _admin_guard(token)
    if _g:
        return _g
    user = _user_or_404(tsap_id)
    if not user.get("referred_by"):
        return {"success": True, "reason": "no_referral", "message_telugu": "ఈ user కి referral లేదు"}
    if int(amount or 0) <= 0:
        raise HTTPException(400, "An explicit original paid amount is required for referral refund reversal")
    res = reverse_referral_payment(user, amount, DB_USERS, reason=reason)
    if res.get("reason") == "persistence_failed":
        raise HTTPException(503, res.get("message_telugu"))
    if res.get("success"):
        MAUD.audit("refunded", "admin", {"tsap_id": tsap_id, "amount": amount,
                                         "reversed": res.get("reversed"), "reason": reason})
    return {"success": bool(res.get("success")), **res}


@app.get("/api/referral/{tsap_id}/fraud-check")
def referral_fraud_check(tsap_id: str, request: Request = None):
    """🕵️ Self-check: మీ account లో emanna referral issue unda?"""
    require_owner(request, tsap_id)   # 🛡️ WAVE 9: IDOR fix — own data matrame
    user = _user_or_404(tsap_id)
    st = referral_stats_of(user)
    issues = list(st.get("flags", []))
    if user.get("referred_by") and str(user.get("referral_code", "")).upper() == str(user.get("referred_by", "")).upper():
        issues.append("self_referral_locked")
    return {"success": True, "tsap_id": tsap_id, "issues": issues,
            "clean": not issues, "paid_count": st.get("paid_count", 0),
            "wallet": st.get("wallet", 0),
            "message_telugu": "✅ Clean — మీ account లో ఏం problem లేదు" if not issues
            else "⚠️ Issues: %s" % ", ".join(issues)}




@app.post("/api/admin/approve/{tsap_id}")
def admin_approve(tsap_id: str, request: Request):
    """Admin approval; publication is queued separately and delivery is not implied."""
    require_admin(request, staff_ok=True)
    user = next((u for u in DB_USERS if u["tsap_id"] == tsap_id), None)
    if not user:
        raise HTTPException(404, "⚠️ Dorakaledu — ID check చెయ్యండి")
    user_before = copy.deepcopy(user)
    user["is_approved"] = True
    user["status"] = "approved"
    if not _regenerate_profile_card(user):
        user.clear()
        user.update(user_before)
        raise HTTPException(503, "Profile card could not be regenerated safely. Please try again.")

    route = route_profile(user)
    user["post_hashtags"] = route["hashtags"]
    user["posted_channels"] = []
    if not _persist_core_state():
        user.clear()
        user.update(user_before)
        _regenerate_profile_card(user)
        raise HTTPException(503, "Profile approval could not be saved safely. Please try again.")
    publication = _queue_approved_profile_publication(user)
    caption = build_caption(user, tsap_id)
    targets = publication.get("targets", [])

    MAUD.audit("profile_approve", "admin", {
        "tsap_id": tsap_id, "queued": bool(publication.get("queued")), "targets": targets,
    })
    message = (f"Approved; queued for {len(targets)} configured destinations. Delivery is not confirmed."
               if publication.get("queued") else f"Approved; not queued ({publication.get('reason')}).")
    return {"success": True, "tsap_id": tsap_id, "posted_to": [], "publish_targets": targets,
            "publish_queued": bool(publication.get("queued")), "publish_reason": publication.get("reason"),
            "count": len(targets), "hashtags": route["hashtags"],
            "caption_preview": caption, "message": message}

@app.post("/api/admin/make_premium/{tsap_id}")
def admin_make_premium(tsap_id: str, gift_credits: int = 10, request: Request = None):
    """Legacy endpoint retained as a credit gift; it cannot fabricate a paid plan or verification."""
    require_admin(request)
    user = _find_user(tsap_id)
    if not user:
        raise HTTPException(404, "⚠️ Dorakaledu — ID check చెయ్యండి")
    gift_credits = req_int(gift_credits, "gift_credits", 1, 500)
    previous_credits = int(user.get("credits", 0) or 0)
    previous_history = list(user.get("credit_history") or [])
    user["credits"] = previous_credits + gift_credits
    user.setdefault("credit_history", []).append({
        "at": datetime.utcnow().isoformat(), "change": gift_credits,
        "reason": "admin_gift_interest_requests", "by": "admin",
    })
    if not _persist_core_state():
        user["credits"] = previous_credits
        user["credit_history"] = previous_history
        raise HTTPException(503, "Credit gift could not be saved safely. Please try again.")
    return {"success": True, "tsap_id": user.get("tsap_id"), "new_credits": user["credits"],
            "credits_added": gift_credits,
            "message_telugu": f"🎁 {gift_credits} interest-request credits జోడించబడ్డాయి. ఇది paid plan లేదా identity verification కాదు."}


@app.post("/api/admin/grant-plan")
@app.post("/api/admin/upgrade-user")
def api_admin_grant_plan(payload: dict, request: Request = None):
    """Admin grant for one of the current paid packs; complimentary grants are recorded separately."""
    role = require_admin(request, staff_ok=True)
    d = payload or {}
    ident = str(d.get("tsap_id") or d.get("id") or d.get("user_id") or d.get("phone") or "").strip()
    if not ident:
        raise HTTPException(400, "tsap_id / profile ID is required")
    user = _find_user(ident)
    if not user:
        raise HTTPException(404, f"Profile ID / User '{ident}' not found")

    plan_code = str(d.get("plan", "S_99")).strip().upper()
    paid_codes = {"S_99", "S_199", "S_299", "S_499"}
    if plan_code not in paid_codes:
        raise HTTPException(400, "Only the current S_99/S_199/S_299/S_499 plans can be activated here")
    plan = INTEREST_PLANS[plan_code]
    user_refs_before = list(DB_USERS)
    users_before = copy.deepcopy(DB_USERS)
    payments_before = copy.deepcopy(DB_PAYMENTS)
    pay_orders_before = copy.deepcopy(PP.PAY_ORDERS)
    credits_to_add = int(plan["profiles"])
    if d.get("credits") is not None:
        try:
            submitted_credits = int(d["credits"])
        except (TypeError, ValueError):
            raise HTTPException(400, "Plan credits must be a number")
        if submitted_credits != credits_to_add:
            raise HTTPException(400, f"{plan_code} includes exactly {credits_to_add} interest-request credits")
    payment_method = str(d.get("method") or d.get("payment_method") or "").strip().upper()
    allowed_payment_methods = {"UPI_QR", "PHONEPE", "GPAY", "BANK_TRANSFER", "CASH", "ADMIN_COMPLIMENTARY"}
    if payment_method not in allowed_payment_methods:
        raise HTTPException(400, "Choose a recognized payment source before activating a plan")
    is_comped = payment_method == "ADMIN_COMPLIMENTARY"
    amount = 0 if is_comped else int(plan["price"])
    try:
        submitted_amount = int(d["amount"]) if d.get("amount") is not None else amount
    except (TypeError, ValueError):
        raise HTTPException(400, "Payment amount must be a number")
    if not is_comped and submitted_amount != amount:
        raise HTTPException(400, f"{plan_code} price is ₹{amount}; amount mismatch")
    notes = str(d.get("notes") or d.get("note") or "").strip()
    proof = str(d.get("utr") or d.get("payment_proof") or "").strip()
    if is_comped:
        if len(notes) < 8:
            raise HTTPException(400, "A reason of at least 8 characters is required for a complimentary grant")
        proof = ""
    elif not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9 ./_:-]{5,63}", proof) or not any(ch.isdigit() for ch in proof):
        raise HTTPException(400, "A valid UTR, receipt, or payment-proof reference is required for paid activation")
    duplicate_proof = any(
        str(row.get("utr", "") or "").strip().upper() == proof.upper()
        and str(row.get("status", "")).lower() not in {"refunded", "reversed"}
        for row in DB_PAYMENTS if proof
    ) or any(
        str(row.get("utr", "") or "").strip().upper() == proof.upper()
        and str(row.get("status", "")).lower() not in {"refunded", "reversed"}
        for row in PP.PAY_ORDERS if proof
    )
    if duplicate_proof:
        raise HTTPException(409, "This payment proof reference was already recorded; reconcile it before retrying")

    user["plan"] = plan_code
    user["is_premium"] = True
    if not is_comped:
        user["has_paid"] = True
    user["credits"] = int(user.get("credits", 0) or 0) + credits_to_add
    user["plan_expiry"] = (datetime.utcnow() + timedelta(days=int(plan["validity_days"]))).isoformat()
    user.setdefault("credit_history", []).append({
        "at": datetime.utcnow().isoformat(), "change": credits_to_add,
        "reason": ("admin_complimentary_plan_" if is_comped else "admin_grant_") + plan_code,
        "by": role, "note": notes,
    })

    order_id = f"ADM-GRANT-{int(time.time())}-{random.randint(100, 999)}"
    payment_record = {
        "order_id": order_id, "user_id": user.get("tsap_id"), "tsap_id": user.get("tsap_id"),
        "amount": amount, "plan": plan_code, "purpose": "credits",
        "status": "comped" if is_comped else "paid",
        "method": payment_method, "utr": proof, "payment_proof": proof,
        "payment_proof_status": "operator_recorded" if not is_comped else "not_applicable_complimentary",
        "notes": notes, "created_at": datetime.utcnow().isoformat(),
        "paid_at": "" if is_comped else datetime.utcnow().isoformat(), "fulfilled": True,
    }
    DB_PAYMENTS.append(payment_record)
    PP.PAY_ORDERS.append({
        "id": order_id, "pay_order_id": order_id, "tsap_id": user.get("tsap_id"),
        "purpose": "credits", "ref": plan_code, "amount": amount,
        "final_amount": amount, "discount": 0, "offer_code": "",
        "status": "comped" if is_comped else "paid", "mode": payment_method,
        "paid_via": payment_method, "utr": proof, "payment_id": order_id,
        "created_at": payment_record["created_at"], "paid_at": payment_record["paid_at"],
        "receipt": None, "operator": role,
    })

    ref_msg = ""
    if not is_comped and bool(d.get("trigger_referral", True)) and user.get("referred_by"):
        try:
            r_res = process_referral_payment(user, user["referred_by"], amount, DB_USERS,
                                             payment_id=order_id, plan_code=plan_code)
            if r_res.get("success"):
                ref_msg = f" • Referrer ({user['referred_by']}) కి ₹50 wallet reward జమైంది."
        except Exception:
            pass

    if not _persist_core_state() or not PP._persist():
        _restore_user_snapshot(users_before, user_refs_before)
        DB_PAYMENTS[:] = payments_before
        PP.PAY_ORDERS[:] = pay_orders_before
        _persist_core_state()
        PP._persist()
        raise HTTPException(503, "Plan grant could not be saved safely. Please try again.")
    MAUD.audit("admin_grant_plan", role, {"tsap_id": user.get("tsap_id"), "plan": plan_code,
                                           "credits": credits_to_add, "comped": is_comped})

    return {
        "success": True, "tsap_id": user.get("tsap_id"), "full_name": user.get("full_name"),
        "plan": plan_code, "credits": user.get("credits"), "credits_added": credits_to_add,
        "plan_expiry": user.get("plan_expiry"), "comped": is_comped,
        "is_verified": safety.has_verification_evidence(user),
        "verification": safety.verification_badge(user),
        "message_telugu": f"{user.get('tsap_id')} కి {plan['label']} (₹{plan['price']}) plan active అయ్యింది (+{credits_to_add} interest-request credits). Verification వేరుగా ఉంటుంది.{ref_msg}",
        "message": f"Activated {plan_code} for {user.get('tsap_id')} (+{credits_to_add} interest-request credits)",
    }


def _public_channel_links() -> dict:
    """Owner-configured links for public listings only; private registry rows stay internal."""
    return {key: value for key, value in CHAN.public_links().items() if is_public_channel(key)}


def _channel_stats_public() -> dict:
    """Counts for the public directory, excluding operator-hidden listings."""
    return public_channel_stats()


def _channel_public(key: str, ch: dict) -> dict:
    """Registry entry using only explicit usernames/invite links; no inferred status."""
    username = str(ch.get("username") or "").strip().lstrip("@")
    configured_links = channel_links(key)
    mapped_links = _public_channel_links().get(key)
    if mapped_links is not None:
        public_link = str(mapped_links.get("telegram") or "")
        public_whatsapp = str(mapped_links.get("whatsapp") or "")
    elif key in getattr(CHAN, "OVERRIDES", {}):
        # An explicit admin override may intentionally disable a base link.
        public_link = ""
        public_whatsapp = ""
    else:
        public_link = str(configured_links.get("telegram") or "")
        public_whatsapp = str(configured_links.get("whatsapp") or "")
    route = ch.get("route") if isinstance(ch.get("route"), dict) else {}
    routing_eligible = _routing_is_explicit(ch)
    return {
        "key": key,
        "tier": ch.get("tier"),
        "name": ch.get("name"),
        "username": "@" + username if username else "",
        "link": public_link,
        "whatsapp_link": public_whatsapp,
        # No bot deep-link contract is configured for channel joins.
        "deep_link": "",
        "desc": ch.get("desc"),
        "hashtags": ch.get("hashtags", []),
        "wave": ch.get("wave"),
        "routing_eligible": routing_eligible,
        "destination_configured": bool(ch.get("routing_destination")),
        "external_status_checked": False,
        "status": ("Explicit destination configured; external availability and bot permissions unchecked"
                   if routing_eligible else "No posting destination configured"),
        "photo": f"/api/channels/photo/{key}.png",
        "caste": (route or {}).get("caste", ""),
        "gender": (route or {}).get("gender", ""),
    }

@app.get("/api/channels/photo/{key}.png")
def channel_photo(key: str):
    """Serve a maintained channel asset; a public GET never creates or replaces artwork."""
    import setup_channels as SC
    if not is_public_channel(key):
        raise HTTPException(404, "Channel listing not found")
    path = os.path.join(SC.ASSET_DIR, "%s.png" % key)
    if not os.path.isfile(path):
        raise HTTPException(404, "No maintained channel artwork is available for this listing")
    return FileResponse(path, media_type="image/png", headers={"Cache-Control": "public, max-age=86400"})


@app.get("/api/channels/{key}/kit")
def channel_kit(key: str):
    """ఒక్క channel కి full kit — description + 📌 pinned post + rules + share text (website నుంచి copy)."""
    import channel_content as CC
    ch = CHANNELS.get(key)
    if not ch or not is_public_channel(key):
        raise HTTPException(404, "Channel దొరకలేదు: %s" % key)
    public_channel = _channel_public(key, ch)
    return {"key": key, "name": CC.perfect_title(key, ch), "desc": CC.perfect_description(key, ch),
            "pinned_post": CC.pinned_welcome(key, ch), "rules_post": CC.rules_post(key),
            "share_text": CC.share_text(key, ch, telegram_link=public_channel["link"]), "dp_text": CC.dp_text(key),
            "hashtags": ch.get("hashtags", []), "username": public_channel["username"],
            "link": public_channel["link"], "photo": f"/api/channels/photo/{key}.png",
            "routing_eligible": public_channel["routing_eligible"],
            "destination_configured": public_channel["destination_configured"], "wave": ch.get("wave"),
            "external_status_checked": False, "deep_link": "",
            "status": public_channel["status"],
            "how_to_setup_telugu": [
                "1) Use only an owner-confirmed exact posting destination or public invite URL. Blank values are intentional; do not guess a replacement.",
                "2) Posting is disabled unless the exact destination is explicitly configured. A bot identity or admin permission is not assumed.",
                "3) If the operator separately enables posting, run the read-only --check for the exact destination and review results before any mutation.",
                "4) --apply may change metadata, upload artwork, create an invite, send and pin; use only with separate explicit operator approval.",
            ]}


@app.get("/api/channels/setup-plan")
def channels_setup_plan(wave: Optional[int] = None):
    """Public-facing setup summary for directory-listed channels only."""
    plan = [row for row in channels_config_setup_plan(wave) if is_public_channel(row.get("key", ""))]
    problems = [row for row in channel_health_report() if is_public_channel(row.get("key", ""))]
    return {"plan": plan, "config_problems": problems, "stats": _channel_stats_public(),
            "message_telugu": "Public directory order లోని listings మాత్రమే చూపిస్తున్నాం. External availability లేదా delivery నిర్ధారించబడదు."}


@app.get("/api/channels")
def channels(tier: Optional[str] = None):
    """Canonical channel directory; external usernames and permissions are not checked here."""
    tiers = channels_by_tier()
    out_tiers = {
        tier_key: public_rows
        for tier_key, items in tiers.items()
        if (public_rows := [_channel_public(channel["key"], channel)
                            for channel in items if is_public_channel(channel["key"])])
    }
    stats = _channel_stats_public()
    if tier:
        items = out_tiers.get(tier, [])
        return {"tier": tier, "channels": items, "count": len(items), "stats": stats}
    return {
        "brand": "మన వివాహ | Mana Vivaha",
        "site": "https://manavivaha.in",
        "stats": stats,
        "tiers": {
            tier_key: label for tier_key, label in {
                "L0_OFFICIAL": "Official service-information listing",
                "L1_REGION": "Telangana, Andhra Pradesh and NRI directory listings",
                "L2_RELIGION": "Religion and community directory listings",
                "L3_CASTE": "Selected community and gender listings",
                "L4_SPECIAL": "Additional member-submitted profile categories",
            }.items() if tier_key in out_tiers
        },
        "channels_by_tier": out_tiers,
        "routing_eligible": [_channel_public(c["key"], c) for c in live_channels() if is_public_channel(c["key"])],
        "not_routing_eligible": [_channel_public(c["key"], c) for c in pending_channels() if is_public_channel(c["key"])],
        "external_status_checked": False,
        "total_routing_eligible": stats["routing_eligible"],
        "total_listed": stats["total"],
    }

@app.post("/api/channels/route")
def channels_route(payload: dict):
    """
    Profile → ee channels lo post avutundi (preview). Bot + website iddariki same logic.
    Body: {"gender":"Bride","state":"TS","caste":"Reddy","age":24,"job":"Software Engineer", ...}
    """
    r = route_profile(payload)
    return {
        "success": True,
        "channels": r["usernames"],
        "keys": r["keys"],
        "reasons": r["reasons"],
        "hashtags": r["hashtags"],
        "count": r["count"],
        "notes": r["notes"],
        "preview_caption": build_caption(payload, str(payload.get("tsap_id") or "")),
    }

@app.get("/api/publish/status")
def publish_status_endpoint(request: Request = None):
    """Telegram + WhatsApp auto-publish status (dry-run? tokens unnai? enni targets?).

    🔒 WAVE 9: mundu ee endpoint lo anti-ban event details lo FULL phone numbers vachedi (public leak).
    Ippudu public ki mask (98••••••45), admin key unte full details.
    """
    st = {"success": True, **publish_status(), "worker_running": worker_running()}
    if not is_admin(request):
        st = mask_pii(st)
        st["pii_masked"] = True
        st["note_telugu"] = "🔒 Numbers mask చేశాం — admin key తో full queue details (X-Admin-Key)"
    return st

@app.get("/api/publish/log")
def publish_log_endpoint(limit: int = 20, request: Request = None):
    """ఈ varaku publish అయిన profiles log (audit). 🔒 WAVE 9: public కి PII mask."""
    limit = clamp_int(limit, "limit", 1, 200, 20)
    out = {"success": True, "count": limit, "log": read_log(limit)}
    if not is_admin(request):
        out = mask_pii(out)
        out["pii_masked"] = True
    return out

@app.post("/api/publish/now/{tsap_id}")
async def publish_now(tsap_id: str, request: Request = None):
    """Manual re-post (admin) — already register అయిన profile ని మళ్లీ channels కి pampu."""
    require_admin(request, staff_ok=True)   # 🛡️ WAVE 9: admin key lekunda 403 (PII/money/)
    user = next((u for u in DB_USERS if u["tsap_id"] == tsap_id), None)
    if not user:
        raise HTTPException(404, "Profile not found")
    res = await publish_profile(user, tsap_id)
    return {"success": True, **res}

@app.post("/api/publish/preview")
def publish_preview(payload: dict):
    """Post avvakunda — caption + WhatsApp text + targets chudu."""
    profile = payload or {}
    tsap_id = str(profile.get("tsap_id") or "")
    return {
        "success": True,
        "telegram_caption": build_caption(profile, tsap_id),
        "whatsapp_text": build_whatsapp_text(profile, tsap_id),
        "share_text": build_share_text(profile, tsap_id),
        "targets": post_targets(profile),
    }

@app.get("/api/channels/routing-eligible")
def channels_routing_eligible():
    rows = [_channel_public(c["key"], c) for c in live_channels() if is_public_channel(c["key"])]
    return {"routing_eligible": rows, "count": len(rows),
            "external_status_checked": False,
            "status": "Registry eligibility only; external availability and bot permissions are unchecked"}


# ===========================================================================
# 💌 INTEREST / REQUEST + 💳 CREDITS + 🛡️ WHATSAPP ANTI-BAN CONTROL
# ===========================================================================
_USERS_ID_MAP: dict = {}
_USERS_PHONE_MAP: dict = {}

def _ensure_db_initialized():
    global DB_USERS
    if not DB_USERS:
        try:
            _snap = DBSTORE.load()
            if _snap and _snap.get("users"):
                DB_USERS.extend(u for u in _snap["users"] if isinstance(u, dict) and not _is_synthetic_profile(u))
                _reindex_users()
        except Exception:
            pass

def _reindex_users():
    global _USERS_ID_MAP, _USERS_PHONE_MAP
    real_users = [u for u in DB_USERS if isinstance(u, dict) and not _is_synthetic_profile(u)]
    _USERS_ID_MAP = {str(u.get("tsap_id", "")).upper(): u for u in real_users if u.get("tsap_id")}
    _USERS_PHONE_MAP = {str(u.get("phone", "")).strip(): u for u in real_users if u.get("phone")}

def _find_user(tsap_id: str):
    if not tsap_id:
        return None
    _ensure_db_initialized()
    raw = str(tsap_id).strip().upper()
    if raw in _USERS_ID_MAP:
        return _USERS_ID_MAP[raw]
    # 1. Exact match on tsap_id
    found = next((u for u in DB_USERS if not _is_synthetic_profile(u) and str(u.get("tsap_id", "")).upper() == raw), None)
    if found:
        _USERS_ID_MAP[raw] = found
        return found
    # 2. Number-only match (e.g. searching '1001' or '5059')
    if raw.isdigit():
        found = next((u for u in DB_USERS if not _is_synthetic_profile(u) and (str(u.get("tsap_id", "")).endswith(raw) or raw in str(u.get("phone", "")))), None)
        if found:
            return found
    # 3. Match with MV prefix or strip non-alphanumeric
    if raw.startswith("MV") and raw[2:].isdigit():
        num_part = raw[2:]
        found = next((u for u in DB_USERS if not _is_synthetic_profile(u) and str(u.get("tsap_id", "")).endswith(num_part)), None)
        if found:
            return found
    # 4. Phone or Name match
    found = next((u for u in DB_USERS if not _is_synthetic_profile(u) and (raw in str(u.get("phone", "")) or raw.lower() in str(u.get("full_name", "")).lower())), None)
    return found


@app.get("/api/plans")
def plans_endpoint():
    """Pricing ladder: FREE 3 → ₹99=5 → ₹199=12 → ₹299=25 → ₹499=50 (VIP) + add-ons."""
    return {
        "currency": "INR",
        "chatting": False,
        "model": "Interest requests; contact sharing only after the profile owner accepts (chatting లేదు)",
        "free_first": 3,
        "plans": plan_list_with_free(),
        "addons": addon_list(),
        "renewal": renewal_offer(),
        "bureau": bureau_list(),  # WAVE 29: pricing B2B single-source (page fallback tho match)
        "value_ladder": [f"₹{p['price']} → {p['profiles']} interest requests (₹{p['per_profile']}/request)" for p in plan_list()],
        "note_telugu": "ఒక్క interest request కు 1 credit. Public search లో contact details ఉండవు; profile owner accept చేసిన తర్వాత accepted-request account flows లో అందుబాటులోకి వస్తాయి. WhatsApp notification delivery హామీ లేదు. Decline అయితే account లో చూపిన credit policy వర్తిస్తుంది. "
                       "₹299, ₹499 plans active ఉన్నప్పుడు Who-viewed names అందుబాటులో ఉంటాయి. Match లేదా response హామీ లేదు.",
    }


@app.get("/api/credits/{tsap_id}")
def credits_endpoint(tsap_id: str, request: Request = None):
    require_owner(request, tsap_id)   # 🛡️ WAVE 9: IDOR fix — own data matrame
    u = _find_user(tsap_id)
    if not u:
        raise HTTPException(404, "⚠️ User దొరకలేదు — TSAP ID check చెయ్యండి")
    sent = [i for i in DB_INTERESTS if i["from_id"] == tsap_id]
    return {
        "tsap_id": tsap_id,
        "credits": u.get("credits", 0),
        "plan": u.get("plan", "FREE"),
        "plan_label": get_plan(u.get("plan", "FREE"))["label"],
        "requests_sent": len(sent),
        "pending": len([i for i in sent if i["status"] == "pending"]),
        "accepted": len([i for i in sent if i["status"] == "accepted"]),
        "refunded": len([i for i in sent if i.get("credit_refunded")]),
        "plans": plan_list(),
        "message_telugu": ("✅ మీ దగ్గర %d interest-request credits ఉన్నాయి" % u.get("credits", 0)) if u.get("credits", 0) > 0
                          else "⚠️ Credits అయిపోయాయి — ₹99 plan లో 5 interest requests ఉన్నాయి",
    }


@app.post("/api/credits/buy")
def credits_buy(payload: dict, request: Request):
    """Compatibility purchase route: an explicit isolated test fixture or verified PayPro order."""
    d = payload or {}
    tsap_id = str(d.get("tsap_id") or "").strip().upper()
    require_owner(request, tsap_id)
    user = _find_user(tsap_id)
    if not user:
        raise HTTPException(404, "User not found — register first.")
    plan_code = str(d.get("plan") or d.get("plan_id") or "S_99").strip().upper()
    plan = get_plan(plan_code)
    if plan.get("code") == "FREE" or int(plan.get("price", 0) or 0) <= 0:
        raise HTTPException(400, "Choose a valid paid plan or add-on.")

    # Explicit fixture mode is test-only; normal dev/preview and production stay fail-closed.
    if _test_payment_fixtures_enabled():
        applied = apply_payment(user, int(plan["price"]), plan_code)
        if not applied.get("ok"):
            raise HTTPException(400, applied.get("error", "Plan could not be applied."))
        order_id = "DEV-" + datetime.utcnow().strftime("%y%m%d%H%M%S") + str(len(DB_PAYMENTS) + 1).zfill(3)
        order = {
            "order_id": order_id,
            "tsap_id": tsap_id,
            "plan": plan_code,
            "amount": int(plan["price"]),
            "credits_added": int(applied.get("profiles_added", 0) or 0),
            "at": datetime.utcnow().isoformat(),
            "status": "paid",
            "kind": applied.get("kind", "plan"),
            "development_fixture": True,
        }
        DB_PAYMENTS.append(order)
        return {"success": True, "order": order, "credits_now": user.get("credits", 0),
                "plan": plan, "message_telugu": applied.get("message_telugu", "Development payment applied.")}

    result = PP.create_pay_order(tsap_id, "credits", plan_code)
    if not result.get("success"):
        raise HTTPException(503, result.get("message_telugu", "Payment is not configured."))
    pay_order = result["pay_order"]
    return {"success": True, "order": {"order_id": pay_order["id"], "tsap_id": tsap_id,
            "plan": plan_code, "amount": pay_order["final_amount"], "status": pay_order["status"],
            "payment_required": True}, "pay_order": pay_order, "credits_now": user.get("credits", 0),
            "plan": plan, "message_telugu": result.get("message_telugu", "Payment order created.")}


@app.post("/api/interest/send")
async def interest_send(payload: dict, request: Request = None):
    """
    💌 Interest pampu — 1 credit. Owner ki WhatsApp lo REQUESTER PROFILE + card veltundi.
    (idi user adigina core flow: chatting ledu, WhatsApp lo profile share matrame)
    """
    d = payload or {}
    from_id = d.get("from_id", "").strip()
    to_id = d.get("to_id", "").strip()
    note = d.get("note", "")
    require_owner(request, from_id)   # 🛡️ IDOR: mee ID tarvupuna matrame interest pampali
    note = clean(note, 300, "interest_note", allow_newlines=True)

    frm, to = _find_user(from_id), _find_user(to_id)
    if not frm:
        raise HTTPException(404, f"మీ TSAP ID దొరకలేదు: {from_id} — ముందు register చెయ్యండి")
    if not to:
        raise HTTPException(404, f"Profile దొరకలేదు: {to_id}")
    if not _is_approved_profile(frm):
        raise HTTPException(403, "Only an approved active member can send an interest request")
    if not _is_approved_profile(to):
        # Do not let guessed IDs send requests to hidden, pending, or synthetic profiles.
        raise HTTPException(404, f"Active approved profile not found: {to_id}")

    if safety.is_blocked(from_id, to_id, DB_BLOCKS):
        # 🐞 FIX: mundu block unna kooda "gender tappu" error vachedi (misleading message)
        abuse_log("blocked_interest_attempt", f"{from_id}→{to_id}")
        abuse_count("blocked_interest")
        return JSONResponse(status_code=400, content={
            "success": False, "reason": "blocked_user", "blocked": True,
            "message_telugu": "🚫 ఈ profile తో contact block అయ్యింది — vere profiles చూడండి (safety first)"})
    if to.get("is_banned"):
        raise HTTPException(400, "ఈ profile moderation లో teesesaru — interest pampaleeru")

    if expire_old(DB_INTERESTS, DB_USERS):
        _persist_core_state()
    # 💬 ready-made Telugu template (optional)
    _tpl = str(d.get("template_id", "")).strip()
    if _tpl and not note:
        note = next((t["text"] for t in quality_templates() if t["id"] == _tpl), "")
    # WAVE 27 — check+deduct+append atomic per sender (double-click → okati matrame)
    with _INTEREST_LOCKS[from_id]:
        ok, reason = can_send_interest(frm, to, DB_INTERESTS)
        if not ok:
            if reason == "credits_ledu":
                return JSONResponse(status_code=402, content={
                    "success": False, "reason": "credits_ledu", "credits": frm.get("credits", 0),
                    "plans": plan_list(), "pay_url": "/requests#plans",
                    "message_telugu": "⚠️ Credits అయిపోయాయి — ₹99 తో 5, ₹199 తో 12, ₹299 తో 25 interest requests పొందండి",
                })
            return JSONResponse(status_code=400, content={"success": False, "reason": reason,
                                                          "message_telugu": reason})

        sender_before = copy.deepcopy(frm)
        comparison = {}
        observations = []
        try:
            comparison = topmatch.score_match_v2(frm, to)
            observations = (comparison.get("observations", []) + comparison.get("preference_notes", []))[:4]
        except Exception:
            observations = []

        rec = create_interest(frm, to, note=note, observations=observations,
                              channel=d.get("channel", "website"))
        deduct = deduct_credit(frm)
        if not deduct.get("success"):
            return JSONResponse(status_code=402, content={"success": False, "plans": plan_list(),
                                                          "message_telugu": deduct.get("message_telugu", "Credits లేదు")})
        DB_INTERESTS.append(rec)
        if not _persist_core_state():
            if rec in DB_INTERESTS:
                DB_INTERESTS.remove(rec)
            frm.clear()
            frm.update(sender_before)
            raise HTTPException(503, "Interest request could not be saved safely. Please try again.")

    # ── WhatsApp: owner ki requester profile (+ card image) | requester ki confirmation ──
    # Astrology is intentionally absent from interest notifications. An interest
    # request must never carry an unverified score, dosha flag, or horoscope claim.
    owner_text = interest_to_owner_text(frm, to, rec)
    notify_text = interest_notify_text(frm, to, rec)
    owner_phone = to.get("phone", "")
    frm_phone = frm.get("phone", "")
    wa_plan = enqueue_whatsapp([owner_phone], owner_text, image_id=from_id, priority=0,
                               kind="interest_to_owner")
    wa_plan2 = enqueue_whatsapp([frm_phone], notify_text, image_id=to_id, priority=0,
                                kind="interest_confirm")
    rec["notification_queue"] = {
        "owner_queued": bool(wa_plan.get("queued")),
        "requester_queued": bool(wa_plan2.get("queued")),
        "delivery_confirmed": False,
        "recorded_at": datetime.utcnow().isoformat(),
    }
    _persist_core_state()
    if not wa_plan.get("queued"):
        start_wa_worker()

    return {
        "success": True,
        "request_id": rec["request_id"],
        "status": rec["status"],
        "expires_in_days": INTEREST_EXPIRY_DAYS,
        "comparison": {
            "observations": comparison.get("observations", []),
            "differences": comparison.get("differences", []),
            "preferences": comparison.get("preferences", []),
            "notice": comparison.get("notice", "Member-entered profile details only; no compatibility score is calculated."),
        },
        "observations": observations,
        "credits_left": frm.get("credits", 0),
        "sent_to": safe_user(to),
        "whatsapp": {
            "mode": publish_config()["wa_mode"],
            "owner_queued": wa_plan.get("queued", False),
            "requester_queued": wa_plan2.get("queued", False),
            # Never return a click-to-chat URL containing the recipient's phone before consent.
            "owner_link_manual": "",
            "manual_notification_note": "No manual recipient link is exposed before owner acceptance; queue status does not confirm delivery.",
            "anti_ban": f"{int(WA_ENGINE.cfg()['min_gap_interest'])}–{int(WA_ENGINE.cfg()['max_gap_interest'])}s random gap (fast lane)",
        },
        "owner_message_preview": owner_text,
        "message_telugu": (f"💌 Interest request {safe_user(to)['full_name']} కి నమోదు అయ్యింది. "
                           "Configured notification queue కావచ్చు; delivery హామీ లేదు. Accept చేస్తే accepted-request account flows లో contact details అందుబాటులోకి వస్తాయి. "
                           f"మిగిలిన credits: {frm.get('credits', 0)}"),
    }


@app.get("/api/interest/inbox/{tsap_id}")
def interest_inbox(tsap_id: str, request: Request = None):
    require_owner(request, tsap_id)   # 🛡️ WAVE 9: IDOR fix — own data matrame
    u = _find_user(tsap_id)
    if not u:
        raise HTTPException(404, "⚠️ User దొరకలేదు — TSAP ID check చెయ్యండి")
    if expire_old(DB_INTERESTS, DB_USERS):
        _persist_core_state()
    data = inbox_for(u, DB_USERS, DB_INTERESTS)
    data["credits"] = u.get("credits", 0)
    data["model"] = "owner acceptance → contact access in accepted-request account views; notification delivery is not guaranteed"
    return data


@app.get("/api/interest/sent/{tsap_id}")
def interest_sent(tsap_id: str, request: Request = None):
    require_owner(request, tsap_id)   # 🛡️ WAVE 9: IDOR fix — own data matrame
    u = _find_user(tsap_id)
    if not u:
        raise HTTPException(404, "⚠️ User దొరకలేదు — TSAP ID check చెయ్యండి")
    if expire_old(DB_INTERESTS, DB_USERS):
        _persist_core_state()
    data = sent_for(u, DB_USERS, DB_INTERESTS)
    data["credits"] = u.get("credits", 0)
    return data


@app.post("/api/interest/respond")
async def interest_respond(payload: dict, request: Request = None):
    """Record the owner's decision; acceptance grants in-service contact access, not delivery proof."""
    d = payload or {}
    tsap_id = d.get("tsap_id", "")
    request_id = d.get("request_id", "")
    action = (d.get("action", "") or "").lower()
    require_owner(request, tsap_id)   # 🛡️ IDOR: ee request owner ki matrame
    owner = _find_user(tsap_id)
    if not owner:
        raise HTTPException(404, "⚠️ User దొరకలేదు — TSAP ID check చెయ్యండి")
    rec = next((i for i in DB_INTERESTS if i["request_id"] == request_id), None)
    if not rec:
        raise HTTPException(404, f"Request దొరకలేదు: {request_id}")
    if rec["to_id"] != tsap_id:
        raise HTTPException(403, "Ee request meeku కాదు")
    requester = _find_user(rec["from_id"])
    rec_before = copy.deepcopy(rec)
    requester_before = copy.deepcopy(requester) if requester is not None else None
    consent_before = copy.deepcopy(CONSENT_LEDGER)
    res = respond_interest(rec, owner, requester or {}, action)
    if not res.get("success"):
        return JSONResponse(status_code=400, content=res)

    wa = {"queued": False, "delivery_confirmed": False}
    if action == "accept" and requester:
        requester_text = interest_accepted_text(requester, owner, rec)
        owner_text = interest_accepted_owner_text(owner, requester, rec)
        requester_wa = enqueue_whatsapp([requester.get("phone", "")], requester_text,
                                       image_id=owner["tsap_id"], priority=0, kind="interest_accepted")
        owner_wa = enqueue_whatsapp([owner.get("phone", "")], owner_text,
                                    image_id=requester["tsap_id"], priority=0, kind="interest_accepted_owner")
        wa = {
            "queued": bool(requester_wa.get("queued") or owner_wa.get("queued")),
            "requester_queued": bool(requester_wa.get("queued")),
            "owner_queued": bool(owner_wa.get("queued")),
            "delivery_confirmed": False,
            "note": "Queue state only; external WhatsApp delivery was not checked.",
        }
        res["contact"] = {"name": requester.get("full_name"), "phone": requester.get("phone", "")}
        # This records the access grant from owner acceptance, not message delivery.
        try:
            log_consent("interest_accepted", owner.get("tsap_id", ""), requester.get("tsap_id", ""),
                        request_id=request_id, contact_access_granted=True,
                        note="Owner acceptance enabled contact access in accepted-request views.")
        except RuntimeError as exc:
            if str(exc).startswith("persistence_failed"):
                rec.clear()
                rec.update(rec_before)
                if requester is not None and requester_before is not None:
                    requester.clear()
                    requester.update(requester_before)
                raise HTTPException(503, "Consent event could not be saved safely. Please try again.")
            raise
        res["consent_record_telugu"] = "📜 Owner acceptance వల్ల accepted-request account views లో contact access ఇచ్చిన event నమోదు అయింది; message delivery proof కాదు."
    elif action == "decline":
        try:
            log_consent("interest_declined", owner.get("tsap_id", ""), (requester or {}).get("tsap_id", ""),
                        request_id=request_id, contact_access_granted=False,
                        note="Request declined; contact access not granted.")
        except RuntimeError as exc:
            if str(exc).startswith("persistence_failed"):
                rec.clear()
                rec.update(rec_before)
                if requester is not None and requester_before is not None:
                    requester.clear()
                    requester.update(requester_before)
                raise HTTPException(503, "Consent event could not be saved safely. Please try again.")
            raise
        if rec.get("credit_refunded"):
            requester and requester.update({"credits": int(requester.get("credits", 0)) + 1})
        if requester:
            txt = interest_declined_text(requester, owner, rec)
            decline_wa = enqueue_whatsapp([requester.get("phone", "")], txt, priority=0,
                                          kind="interest_declined")
            wa = {"queued": bool(decline_wa.get("queued")), "delivery_confirmed": False,
                  "note": "Queue state only; external WhatsApp delivery was not checked."}
    elif action == "withdraw":
        rec["credit_refunded"] = True
        if requester:
            requester.update({"credits": int(requester.get("credits", 0)) + 1})

    if not _persist_core_state():
        rec.clear()
        rec.update(rec_before)
        if requester is not None and requester_before is not None:
            requester.clear()
            requester.update(requester_before)
        CONSENT_LEDGER[:] = consent_before
        save_consent_ledger()
        raise HTTPException(503, "Interest response could not be saved safely. Please try again.")
    return {"success": True, "request": rec, "whatsapp": wa, "result": res,
            "message_telugu": res.get("message"), "credits": owner.get("credits", 0)}


@app.get("/api/interest/status/{request_id}")
def interest_status(request_id: str, request: Request):
    rec = next((i for i in DB_INTERESTS if i["request_id"] == request_id), None)
    if not rec:
        raise HTTPException(404, "Request not found")
    # 🛡️ WAVE 25: full names + private note — sender/receiver (leda admin) matrame
    try:
        require_owner(request, rec.get("from_id", ""))
    except HTTPException:
        require_owner(request, rec.get("to_id", ""))
    queue_state = rec.get("notification_queue") if isinstance(rec.get("notification_queue"), dict) else None
    status = str(rec.get("status", "pending"))
    response_done = status in {"accepted", "declined", "expired", "withdrawn"}
    contact_granted = bool(rec.get("contact_shared")) and status == "accepted"
    owner_queued = bool(queue_state and queue_state.get("owner_queued"))
    queue_label_en = ("Owner notification queued" if owner_queued else
                      "Owner notification was not queued" if queue_state else
                      "Owner notification queue status not recorded")
    queue_label_te = ("Owner notification queue లో చేర్చబడింది" if owner_queued else
                      "Owner notification queue కాలేదు" if queue_state else
                      "Owner notification queue స్థితి నమోదు కాలేదు")
    steps = [
        {"step": "Interest request recorded", "step_telugu": "Interest request నమోదు అయ్యింది", "done": True},
        {"step": queue_label_en, "step_telugu": queue_label_te, "done": owner_queued,
         "note": "Queue state only; external delivery is not confirmed."},
        {"step": f"Owner response: {status}", "step_telugu": f"Owner response: {status}", "done": response_done},
        {"step": "Contact access in accepted-request account views", "step_telugu": "Accepted-request account views లో contact access", "done": contact_granted},
    ]
    return {"request": rec, "steps": steps,
            "notification_queue": queue_state or {"status_recorded": False, "delivery_confirmed": False},
            "note": "WhatsApp queue status does not confirm external delivery or reading.",
            "note_telugu": "WhatsApp queue స్థితి మాత్రమే; external delivery లేదా message చదివినట్లు నిర్ధారణ కాదు."}


# ============================================================================
#  🧠 MEMBER INTELLIGENCE (WAVE 43) — explainable, fact-only, owner-private
# ============================================================================
@app.get("/api/verification/{tsap_id}/progress")
def api_verification_progress(tsap_id: str, request: Request = None):
    """Every recorded check for this profile, what it means, and the next step."""
    require_owner(request, tsap_id)
    user = _find_user(tsap_id)
    if not user:
        raise HTTPException(404, "Profile dorakaledu")
    return member_intel.verification_progress(user)


@app.get("/api/matches/{viewer_id}/insights/{profile_id}")
def api_profile_insights(viewer_id: str, profile_id: str, request: Request = None):
    """Why a profile appears: shared facts, differences, unknowns, saved-search overlap."""
    require_owner(request, viewer_id)
    viewer = _find_user(viewer_id)
    if not viewer:
        raise HTTPException(404, "Mee profile dorakaledu")
    profile = _find_user(profile_id)
    if not profile or not _is_approved_profile(profile):
        raise _approved_profile_404()
    try:
        searches = quality.saved_for(viewer_id)
    except Exception:
        searches = []
    return member_intel.profile_insights(viewer, profile, searches)


@app.get("/api/interest/coach")
def api_interest_coach(from_id: str = "", to_id: str = "", request: Request = None):
    """What sending this request really does — checked before any credit is spent."""
    from_id, to_id = from_id.strip().upper(), to_id.strip().upper()
    if not from_id or not to_id:
        validation_error("from_id", "⚠️ from_id and to_id are required")
    require_owner(request, from_id)
    sender = _find_user(from_id)
    if not sender:
        raise HTTPException(404, "Mee profile dorakaledu")
    owner = _find_user(to_id)
    if not owner or not _is_approved_profile(owner):
        raise _approved_profile_404()
    blocked = safety.is_blocked(from_id, to_id, DB_BLOCKS)
    return member_intel.interest_coach(
        sender, owner, DB_INTERESTS, blocked=blocked,
        plans=plan_list(), daily_limit=INTEREST_MAX_PER_DAY,
    )


@app.get("/api/interest/{request_id}/timeline")
def api_interest_timeline(request_id: str, request: Request = None):
    """Status steps with the timestamps that were actually recorded."""
    rec = next((i for i in DB_INTERESTS if i.get("request_id") == request_id), None)
    if not rec:
        raise HTTPException(404, "Request not found")
    try:
        require_owner(request, rec.get("from_id", ""))
    except HTTPException:
        require_owner(request, rec.get("to_id", ""))
    return member_intel.request_timeline(rec)


@app.get("/api/me/{tsap_id}/activity")
def api_member_activity(tsap_id: str, request: Request = None):
    """This member's own request counts and response times — no forecasts."""
    require_owner(request, tsap_id)
    user = _find_user(tsap_id)
    if not user:
        raise HTTPException(404, "Mee profile dorakaledu")
    return member_intel.member_activity(user, DB_INTERESTS)


# ---------------------------------------------------------------- WhatsApp control
@app.get("/api/wa/status")
def wa_status():
    """Anti-ban live status: gap, caps, queue, quiet hours, cooldown + per-number instances."""
    return {"ok": True, **wa_queue_stats(),
            "instances": wa_pool.wa_health(),
            "per_number": {i["name"]: {"sent_today": i["sent_today"], "cap": i["daily_cap"],
                                       "status": i["status"], "available": i["available"]}
                           for i in wa_pool.wa_health()["instances"]}}


@app.get("/api/system/health")
def system_health():
    """
    🩺 FULL SYSTEM HEALTH — bots (failover order) + WhatsApp numbers + queue + dead-letters.
    Dashboard lo idi chudandi: okati down ayithe pakkadi automatic ga pani chestundi.
    """
    bt = bot_pool.bot_health()
    wa = wa_pool.wa_health()
    dead = dead_letters(5)
    problems = []
    if bt["configured"] == 0:
        problems.append("Telegram bots configure చెయ్యలేదు (BOT_TOKEN)")
    elif bt["available"] == 0:
        problems.append("అన్నీ Telegram bots cooldown/dead లో ఉన్నాయి")
    if wa["configured"] == 0:
        problems.append("WhatsApp instances లేదు (WA_INSTANCES / WHATSAPP_BRIDGE_URL)")
    elif wa["available"] == 0:
        problems.append("అన్నీ WhatsApp numbers unavailable (QR/caps/cooldown)")
    return {"ok": not problems, "problems": problems,
            "bots": bt, "whatsapp": wa,
            "queue": {"pending": len(WA_QUEUE), "dead": len(WA_DEAD)},
            "dead_letters_preview": dead["items"],
            "message_telugu": ("అన్నీ healthy ✅ — okati fail aina pakkadi వెంటనే pampistundi"
                               if not problems else " ⚠️ ".join(problems))}


@app.get("/api/wa/dead")
def wa_dead(limit: int = 50, request: Request = None):
    """💀 Dead-letter list — 3 tries అయ్యాక కూడా deliver కానీ messages (bridge problem)."""
    require_admin(request)   # 🛡️ WAVE 9: admin key lekunda 403 (PII/money/)
    return dead_letters(limit)


@app.post("/api/wa/dead/requeue")
def wa_dead_requeue(limit: int = 20, request: Request = None):
    """Bridge fix అయ్యాక dead-letters ని మళ్లీ queue లో vey."""
    require_admin(request)   # 🛡️ WAVE 9: admin key lekunda 403 (PII/money/)
    return requeue_dead(limit)


@app.get("/api/bots/health")
def bots_health(request: Request = None):
    """🤖 Telegram bots health + failover order (primary → backup → alert)."""
    require_admin(request)   # 🛡️ WAVE 9: admin key lekunda 403 (PII/money/)
    return {"ok": True, **bot_pool.bot_health()}


@app.post("/api/wa/pause")
def wa_pause(reason: str = "manual", request: Request = None):
    require_admin(request)   # 🛡️ WAVE 9: admin key lekunda 403 (PII/money/)
    result = WA_ENGINE.pause(reason)
    if not result.get("ok", True):
        raise HTTPException(503, "WhatsApp pause state could not be saved safely. Please try again.")
    return result


@app.post("/api/wa/resume")
def wa_resume(request: Request = None):
    require_admin(request)   # 🛡️ WAVE 9: admin key lekunda 403 (PII/money/)
    result = WA_ENGINE.resume()
    if not result.get("ok", True):
        raise HTTPException(503, "WhatsApp resume state could not be saved safely. Please try again.")
    return result


@app.post("/api/wa/reset_day")
def wa_reset_day(request: Request = None):
    """Test tip: ee రోజు counters reset (caps fresh). Production లో వద్దు."""
    require_admin(request)   # 🛡️ WAVE 9: admin key lekunda 403 (PII/money/)
    result = WA_ENGINE.reset_today()
    if not result.get("ok", True):
        raise HTTPException(503, "WhatsApp day reset could not be saved safely. Please try again.")
    return result


@app.get("/api/admin/wa/numbers")
def admin_wa_numbers(request: Request):
    """📱🌊 WAVE 19 ADMIN — 3 numbers health (otp/channels/personal lanes + orders + caps)."""
    require_admin(request)
    h = wa_pool.wa_health()
    return {"success": True, **h,
            "lanes_telugu": {"otp": "🔑 OTP number (OTP lu మాత్రమే, fast 25–60s)",
                             "channels": "📢 Channels number (posts, 120–170s gaps)",
                             "personal": "💬 Personal number (interest/referral DMs, 60–120s)",
                             "both": "🛟 Backup (purpose number down అయితే)"}}


@app.post("/api/admin/wa/numbers")
def admin_wa_number_add(payload: dict, request: Request):
    """📱 ADMIN — number add (name, bridge url, lane, cap, token, number)."""
    require_admin(request)
    d = payload or {}
    if not str(d.get("url", "")).strip():
        raise HTTPException(400, "Bridge URL ఇవ్వండి (http://wa-otp:3000 lanti)")
    result = wa_pool.get_pool().add_instance(
        str(d.get("name", "")), str(d.get("url", "")), str(d.get("lane", "both")),
        int(d.get("daily_cap", 60) or 60), str(d.get("token", "")), str(d.get("number", "")))
    if not result.get("success"):
        raise HTTPException(503 if result.get("reason") == "persistence_failed" else 400,
                            result.get("message_telugu"))
    return result


@app.post("/api/admin/wa/numbers/{name}")
def admin_wa_number_update(name: str, payload: dict, request: Request):
    """📱 ADMIN — number update/pause/resume (url/lane/cap/token/number/paused)."""
    require_admin(request)
    d = payload or {}
    kw = {k: d[k] for k in ("url", "lane", "daily_cap", "token", "number", "paused") if k in d}
    res = wa_pool.get_pool().update_instance(name, **kw)
    if not res.get("success"):
        raise HTTPException(503 if res.get("reason") == "persistence_failed" else 404,
                            res.get("message_telugu"))
    return res


@app.delete("/api/admin/wa/numbers/{name}")
def admin_wa_number_delete(name: str, request: Request):
    """📱 ADMIN — number remove."""
    require_admin(request)
    res = wa_pool.get_pool().remove_instance(name)
    if not res.get("success"):
        raise HTTPException(503 if res.get("reason") == "persistence_failed" else 404,
                            res.get("message_telugu"))
    return res


@app.post("/api/demo/seed")
def retired_demo_seed(request: Request = None):
    """Retired: live-facing endpoints never create fictional member records."""
    if request is not None:
        require_admin(request)
    raise HTTPException(410, "Demo profile seeding is retired")


def _jathakam_result_unavailable(bride_id: str = "", groom_id: str = "") -> Dict:
    """Shared fail-closed response for retired star-only live calculations."""
    evidence = {}
    for label, value in (("bride", bride_id), ("groom", groom_id)):
        if value:
            evidence[label] = AST.jathakam_status(value).get("state")
    return {
        "available": False,
        "calculation_available": False,
        "status": "jathakam_required",
        "evidence": evidence,
        "reason_en": "No Porutham result is generated from star/rasi fields alone. Upload the authentic horoscope documents for both people and obtain an appropriate professional review; missing chart data is never guessed.",
        "reason": "star/rasi వివరాల ఆధారంగా మాత్రమే Porutham ఫలితం తయారు చేయము. ఇద్దరి అసలైన జాతక పత్రాలను upload చేసి తగిన professional review పొందండి; లేని chart వివరాలను ఊహించము.",
        "passed_checks": None, "total_checks": None, "items": [], "doshas": [], "doshas_en": [],
    }


@app.get("/api/porutham")
def porutham_by_id(bride: str = "", groom: str = "", boy_star: str = "", girl_star: str = "",
                   groom_star: str = "", bride_star: str = "", star1: str = "", star2: str = "",
                   boy_rasi: str = "", girl_rasi: str = "", groom_rasi: str = "", bride_rasi: str = ""):
    """Retired live calculation route: return evidence-required state only."""
    if any((boy_star, girl_star, groom_star, bride_star, star1, star2, boy_rasi, girl_rasi, groom_rasi, bride_rasi)):
        return _jathakam_result_unavailable()
    b = _find_user(bride)
    g = _find_user(groom)
    if not b or not g or not _is_approved_profile(b) or not _is_approved_profile(g):
        raise HTTPException(404, "Active approved Bride/Groom profile IDs are required")
    return _jathakam_result_unavailable(b.get("tsap_id", ""), g.get("tsap_id", ""))


@app.post("/api/porutham")
def porutham_raw(payload: dict):
    """Retired star-only endpoint; never turns arbitrary input into a result."""
    d = payload or {}
    return _jathakam_result_unavailable(str(d.get("bride_id", "")), str(d.get("groom_id", "")))


@app.post("/api/lagna-patrika/generate")
def api_generate_lagna_patrika(payload: dict):
    """
    🪔 Traditional Telugu Marriage Lagna Patrika Generator API.
    Returns structured Sanskrit slokas, muhurtham details, and WhatsApp ready invitation text.
    """
    d = payload or {}
    # ✅ One route, one contract: names are required, everything else has a traditional default.
    bride_name = str(d.get("bride_name", "") or "").strip()
    groom_name = str(d.get("groom_name", "") or "").strip()
    if not bride_name or not groom_name:
        raise HTTPException(400, "⚠️ వధూవరుల పేర్లు తప్పనిసరిగా ఇవ్వాలి")
    bride_gothram = str(d.get("bride_gothram", "") or "").strip() or "జనకుల"
    bride_parents = d.get("bride_parents", "తల్లిదండ్రులు")
    bride_native = d.get("bride_native", "విజయవాడ")

    groom_gothram = str(d.get("groom_gothram", "") or "").strip() or "కాశ్యపస"
    groom_parents = d.get("groom_parents", "తల్లిదండ్రులు")
    groom_native = d.get("groom_native", "హైదరాబాద్")

    muhurtham_date = d.get("muhurtham_date", "2026 నవంబర్ 18")
    muhurtham_time = d.get("muhurtham_time", "ఉదయం 09:15 గంటలకు")
    muhurtham_lagnam = d.get("muhurtham_lagnam", "ధనూ లగ్నం")
    muhurtham_star = d.get("muhurtham_star", "ఉత్తరాభాద్ర")
    venue = d.get("venue", "శ్రీ వేంకటేశ్వర కల్యాణ మండపం")
    inviter = d.get("inviter", "వధూవరుల తల్లిదండ్రులు మరియు బంధుమిత్రులు")
    theme = d.get("theme", "royal_gold")

    wa_text = (
        f"🪔 *మన వివాహ — శుభ లగ్న పత్రిక* 🪔\n\n"
        f"🙏 *శ్రీరస్తు - శుభమస్తు - అవిఘ్నమస్తు*\n\n"
        f"👰 *వధువు:* {bride_name} ({bride_gothram} గోత్రం)\n"
        f"తల్లిదండ్రులు: {bride_parents} · స్వస్థలం: {bride_native}\n\n"
        f"🤵 *వరుడు:* {groom_name} ({groom_gothram} గోత్రం)\n"
        f"తల్లిదండ్రులు: {groom_parents} · స్వస్థలం: {groom_native}\n\n"
        f"🗓️ *వివాహ తేదీ:* {muhurtham_date}\n"
        f"⏰ *శుభ ముహూర్తం:* {muhurtham_time} ({muhurtham_lagnam})\n"
        f"🌟 *నక్షత్రం:* {muhurtham_star}\n"
        f"🏛️ *కల్యాణ వేదిక:* {venue}\n\n"
        f"✨ అందరూ విచ్చేసి నూతన వధూవరులను ఆశీర్వదించగలరు 💐\n\n"
        f"🌐 మన వివాహ | manavivaha.in/lagna-patrika"
    )

    return {
        "success": True,
        "theme": theme,
        "bride": {"name": bride_name, "gothram": bride_gothram, "parents": bride_parents, "native": bride_native},
        "groom": {"name": groom_name, "gothram": groom_gothram, "parents": groom_parents, "native": groom_native},
        "muhurtham": {
            "date": muhurtham_date,
            "time": muhurtham_time,
            "lagnam": muhurtham_lagnam,
            "star": muhurtham_star,
            "venue": venue,
            "inviter": inviter,
        },
        "whatsapp_share_text": wa_text,
        # Compatibility aliases for clients that read the flat keys.
        "whatsapp_text": wa_text,
        "whatsapp_url": "https://wa.me/?text=" + urllib.parse.quote(wa_text),
        "bride_name": bride_name,
        "groom_name": groom_name,
        "muhurtham_date": muhurtham_date,
        "muhurtham_time": muhurtham_time,
        "venue": venue,
        "message_telugu": "🌸 శుభ లగ్న పత్రిక విజయవంతంగా రూపొందించబడింది",
    }

@app.get("/api/matches/compatibility-radar/{applicant_id}/{candidate_id}")
def api_compatibility_radar(applicant_id: str, candidate_id: str, request: Request = None):
    """Return factual profile observations for the authenticated applicant; no compatibility score."""
    left_id, right_id = applicant_id.strip().upper(), candidate_id.strip().upper()
    if not left_id or not right_id or left_id == right_id:
        raise HTTPException(400, "Provide two different profile IDs")
    require_owner(request, left_id)
    app_user = next((u for u in DB_USERS if str(u.get("tsap_id", "")).strip().upper() == left_id), None)
    candidate = next((u for u in DB_USERS if str(u.get("tsap_id", "")).strip().upper() == right_id), None)
    if not app_user or not candidate or app_user.get("is_approved") is False or candidate.get("is_approved") is False:
        raise HTTPException(404, "An approved profile was not found")
    if app_user.get("is_banned") or candidate.get("is_banned") or safety.is_blocked(left_id, right_id, DB_BLOCKS):
        raise HTTPException(404, "Profile pair is unavailable")
    comparison = topmatch.score_match_v2(app_user, candidate)
    return {
        "success": True,
        "applicant_id": left_id,
        "candidate_id": right_id,
        "observations": comparison.get("observations", []),
        "differences": comparison.get("differences", []),
        "preferences": comparison.get("preferences", []),
        "notice": "Profile fields are member-provided. These observations are not a compatibility or identity verdict.",
    }

@app.post("/api/view")
def record_view(payload: dict, request: Request = None):
    """
    Profile view record — "ఎవరు chusaru" feature (top matrimony sites lo idi paid).
    Same viewer 6 గంటల్లో malli chuste duplicate ga count avvadu.
    """
    d = payload or {}
    tsap_id = (d.get("tsap_id") or "").strip()
    viewer_id = (d.get("viewer_id") or "").strip()
    require_owner(request, viewer_id)   # 🛡️ IDOR: view mee peru tarvupuna
    if not tsap_id:
        raise HTTPException(400, "tsap_id కావాలి")
    if viewer_id and viewer_id == tsap_id:
        return {"success": True, "self_view": True, "counted": False}
    # duplicate debounce (6h)
    now = datetime.utcnow()
    for v in reversed(DB_VIEWS[-500:]):
        if v["tsap_id"] == tsap_id and v.get("viewer_id") == viewer_id:
            try:
                if (now - datetime.fromisoformat(v["at"])).total_seconds() < 6 * 3600:
                    # 🐞 FIX (R12): duplicate-skip response lo kuda stats keys —
                    # client shape consistent (mundu keys levu → frontend 0/false confusion)
                    _tot = len([x for x in DB_VIEWS if x["tsap_id"] == tsap_id])
                    return {"success": True, "counted": False, "note": "6h లో duplicate view skip",
                            "total_views": _tot, "views_total": _tot,
                            "unique_viewers": len({x.get("viewer_id") for x in DB_VIEWS
                                                   if x["tsap_id"] == tsap_id and x.get("viewer_id")})}
            except Exception:
                pass
    if not _find_user(tsap_id):
        raise HTTPException(404, "ఈ profile దొరకలేదు (view record చెయ్యలేదు)")
    DB_VIEWS.append({"tsap_id": tsap_id, "viewer_id": viewer_id, "at": now.isoformat()})
    total = len([v for v in DB_VIEWS if v["tsap_id"] == tsap_id])
    # 🐞 FIX: mundu key mismatch (`total_views` vs `views_total`) — frontend lo 0 kanipinchedu. Ippudu rendu keys.
    return {"success": True, "counted": True, "total_views": total, "views_total": total,
            "unique_viewers": len({v.get("viewer_id") for v in DB_VIEWS if v["tsap_id"] == tsap_id and v.get("viewer_id")})}


@app.get("/api/views/{tsap_id}")
def views_for(tsap_id: str, request: Request = None):
    """
    Views summary. FREE users ki count + city/caste level info;
    paid (credits/plan) unte **names tho** full list (whoviewed add-on leda ₹299+ plan).
    """
    require_owner(request, tsap_id)   # 🛡️ WAVE 9: IDOR fix — own data matrame
    u = _find_user(tsap_id)
    mine = [v for v in DB_VIEWS if v["tsap_id"] == tsap_id]
    unique_viewers = []
    for v in mine:
        vid = v.get("viewer_id")
        if vid and vid not in [x["tsap_id"] for x in unique_viewers]:
            vu = _find_user(vid)
            if vu:
                unique_viewers.append(vu)
    plan = (u or {}).get("plan", "FREE")
    whoviewed_until = str((u or {}).get("whoviewed_until") or "").strip()
    addon_active = False
    if whoviewed_until:
        try:
            expiry = datetime.fromisoformat(whoviewed_until.replace("Z", "+00:00"))
            if expiry.tzinfo is None:
                expiry = expiry.replace(tzinfo=timezone.utc)
            addon_active = expiry > datetime.now(timezone.utc)
        except (TypeError, ValueError):
            addon_active = False
    plan_expiry = str((u or {}).get("plan_expiry") or "").strip()
    plan_active = False
    if plan in ("S_299", "S_499", "PREMIUM_299", "VIP_999") and plan_expiry:
        try:
            expiry = datetime.fromisoformat(plan_expiry.replace("Z", "+00:00"))
            if expiry.tzinfo is None:
                expiry = expiry.replace(tzinfo=timezone.utc)
            plan_active = expiry > datetime.now(timezone.utc)
        except (TypeError, ValueError):
            plan_active = False
    whoviewed = addon_active or plan_active
    return {
        "tsap_id": tsap_id,
        "total_views": len(mine),
        "views_total": len(mine),                    # 🐞 FIX: frontend ee key expect chestundi (alias)
        "unique_viewers": len(unique_viewers),
        "today": len([v for v in mine if str(v["at"]).startswith(datetime.utcnow().strftime("%Y-%m-%d"))]),
        "whoviewed_unlocked": whoviewed,
        "viewers": [safe_user(v) for v in unique_viewers[-20:]] if whoviewed else [],
        "viewers_masked": [{"caste": v.get("caste", "—"), "district": v.get("district", "—"),
                            "age": v.get("age", "—")} for v in unique_viewers[-20:]] if not whoviewed else [],
        "unlock_addon": ADDONS["WHOVIEWED_49"],
        "message_telugu": (f"👀 మీ profile ని {len(mine)} sarlu chusaru ({len(unique_viewers)} మంది)"
                           + ("" if whoviewed else " — ఎవరు chusaro telusukovali అంటే ₹49 (30 days)")),
    }


@app.post("/api/save")
def toggle_save(payload: dict, request: Request = None):
    """❤️ Shortlist — profile save/remove (top matrimony sites లో idi must feature)."""
    d = payload or {}
    tsap_id = clean(d.get("tsap_id"), 30, "tsap_id")
    saved_id = clean(d.get("saved_id") or d.get("target_id"), 30, "saved_id")   # 🐞 FIX: target_id alias
    require_owner(request, tsap_id)   # 🛡️ IDOR: mee shortlist matrame
    if not tsap_id or not saved_id:
        raise HTTPException(400, "tsap_id + saved_id (leda target_id) కావాలి")
    if tsap_id == saved_id:
        raise HTTPException(400, "మీ profile ని మీరు save cheyyakkarledu 🙂")
    if not _find_user(saved_id):
        raise HTTPException(404, "Save cheyyalsina profile దొరకలేదు")
    if safety.is_blocked(tsap_id, saved_id, DB_BLOCKS):
        raise HTTPException(403, "🚫 Blocked profile ని shortlist cheyyaleeru")
    existing = next((x for x in DB_SAVES if x["tsap_id"] == tsap_id and x["saved_id"] == saved_id), None)
    if existing:
        DB_SAVES.remove(existing)
        # 🧊 WAVE 41: the shortlist used to live only in memory, so every entry
        # disappeared on restart. Persist both directions like the payment state.
        _persist_core_state()
        return {"success": True, "saved": False, "message_telugu": "Shortlist నుంచి teesesaaru",
                "total_saved": len([x for x in DB_SAVES if x["tsap_id"] == tsap_id])}
    DB_SAVES.append({"tsap_id": tsap_id, "saved_id": saved_id, "at": datetime.utcnow().isoformat(),
                     "note": "", "note_at": ""})
    _persist_core_state()
    return {"success": True, "saved": True, "message_telugu": "❤️ Shortlist లో save అయ్యింది",
            "total_saved": len([x for x in DB_SAVES if x["tsap_id"] == tsap_id])}


@app.get("/api/saved/{tsap_id}")
def saved_list(tsap_id: str, request: Request = None):
    require_owner(request, tsap_id)   # 🛡️ WAVE 9: IDOR fix — own data matrame
    rows = [x for x in DB_SAVES if x["tsap_id"] == tsap_id]
    out = []
    for r in rows:
        u = _find_user(r["saved_id"])
        if u:
            out.append({"saved_at": r["at"], "profile": safe_user(u),
                        "note": str(r.get("note") or ""), "note_at": str(r.get("note_at") or ""),
                        "porutham": None})
    # Saved profiles contain no astrology result. The Jathakam review flow is
    # separate and never derives a score from profile fields.
    return {"tsap_id": tsap_id, "count": len(out), "saved": out[::-1],
            "message_telugu": f"❤️ {len(out)} profiles shortlist లో ఉన్నాయి"}


# Members keep their own private reminders on a shortlisted profile. The note is
# only ever readable by the owner (owner-gated read and write), is sanitized with
# the same `clean()` pass used for profile text, and is capped so it can never be
# used as a general-purpose storage field.
SHORTLIST_NOTE_MAX = 280


@app.post("/api/saved/{tsap_id}/{saved_id}/note")
def saved_note_set(tsap_id: str, saved_id: str, payload: dict = Body(default={}), request: Request = None):
    """📝 Private note on a shortlisted profile — owner-only, sanitized, capped."""
    tsap_id = clean(tsap_id, 30, "tsap_id")
    saved_id = clean(saved_id, 30, "saved_id")
    require_owner(request, tsap_id)   # 🛡️ IDOR: mee note matrame
    if not tsap_id or not saved_id:
        raise HTTPException(400, "tsap_id + saved_id కావాలి")
    record = next((x for x in DB_SAVES if x["tsap_id"] == tsap_id and x["saved_id"] == saved_id), None)
    if not record:
        raise HTTPException(404, "Shortlist లో ఈ profile లేదు")
    raw = payload.get("note") if isinstance(payload, dict) else ""
    note = clean(raw if isinstance(raw, str) else "", SHORTLIST_NOTE_MAX, "note")
    record["note"] = note
    record["note_at"] = datetime.utcnow().isoformat()
    _persist_core_state()
    return {"success": True, "saved_id": saved_id, "note": note, "note_at": record["note_at"],
            "message_telugu": "నోట్ save అయ్యింది" if note else "నోట్ తీసివేశారు"}




# ===========================================================================
# 📱 OTP VERIFY (phone) + 🔎 ADVANCED SEARCH FILTERS
# ===========================================================================
@app.post("/api/photo/upload")
async def photo_upload(file: UploadFile = File(...), tsap_id: str = Form(""), request: Request = None):
    """
    📸 Real photo upload — phone lo camera/gallery nunchi.
    Validation: decoded JPEG/PNG/WebP image, max 5 MB, safe dimensions and clarity checks.
    Member uploads stay private until staff approval and the member's privacy choice allow visibility.
    """
    # Authenticate the target before reading or validating uploaded bytes.
    _tid = re.sub(r"[^A-Z0-9-]", "", (tsap_id or "").strip().upper())[:24]
    if _tid:
        _owner = _find_user(_tid)
        if not _owner:
            raise HTTPException(404, "Profile not found")
        require_owner(request, _tid)
    else:
        # Unattached CMS/media uploads are an admin operation, never anonymous storage.
        require_admin(request)
    data = await file.read(5 * 1024 * 1024 + 1)
    # 🌊 WAVE 17 — Layer-1 automatic validation (thappu photo iste asalu thisukovaddu)
    verdict = validate_photo(data, file.filename or "")
    if not verdict["ok"]:
        raise HTTPException(422, {"reason": verdict["reason"], "en": verdict["en"],
                                  "te": verdict["te"],
                                  "message_telugu": f"📸 {verdict['te']}",
                                  "checks": verdict["checks"]})
    try:
        data = sanitize_photo(data, verdict["checks"]["format"])
        verdict["checks"]["sanitized_bytes"] = len(data)
    except ValueError:
        raise HTTPException(422, {
            "reason": "PHOTO_SANITIZE_FAILED",
            "en": "The photo could not be safely prepared. Please choose another image.",
            "te": "ఫోటోను సురక్షితంగా సిద్ధం చేయలేకపోయాం — మరో అసలు ఫోటోను ఎంచుకోండి.",
            "message_telugu": "ఫోటోను సురక్షితంగా సిద్ధం చేయలేకపోయాం — మరో అసలు ఫోటోను ఎంచుకోండి.",
            "checks": verdict["checks"],
        })
    # Use the decoded image format, never the user-controlled filename extension.
    ext = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}[verdict["checks"]["format"]]
    os.makedirs(PHOTO_MEDIA_DIR, exist_ok=True)
    safe_owner = _tid or "admin"
    token = safe_owner + "-" + datetime.utcnow().strftime("%y%m%d%H%M%S") + "-" + secrets.token_hex(6)
    name = f"{token}.{ext}"
    path = os.path.join(PHOTO_MEDIA_DIR, name)
    try:
        atomic_write_bytes(path, data)
    except Exception as e:
        raise HTTPException(500, f"Photo save failed: {str(e)[:80]}")
    if _tid:
        owner_before = copy.deepcopy(_owner)
        _owner["photo_url"] = f"/photos/{name}"
        _owner["photo_urls"] = [f"/photos/{name}"]
        _owner["photo_status"] = "pending"  # A human review is still required.
        _owner["photo_checks"] = verdict["checks"]
        _owner["photo_uploaded_at"] = datetime.utcnow().isoformat()
        # A replacement upload must not leave the old photo-bearing card live.
        # The pending card is rebuilt as a monogram until the new photo is reviewed.
        _regenerate_profile_card(_owner)
        if not _persist_core_state():
            _owner.clear()
            _owner.update(owner_before)
            _regenerate_profile_card(_owner)
            try:
                os.remove(path)
            except OSError:
                pass
            raise HTTPException(503, "Photo could not be saved safely. Please try again.")
    return {"success": True, "url": f"/photos/{name}", "bytes": len(data),
            "kb": round(len(data) / 1024, 1),
            "status": "pending", "checks": verdict["checks"],
            "message_telugu": f"📸 Photo clear గా ఉంది ({round(len(data)/1024)} KB) — admin approval కి వెళ్లింది ✅"}


@app.get("/api/photo/status/{tsap_id}")
def photo_status(tsap_id: str, request: Request):
    """Owner-only photo/selfie review status; never expose moderation reasons by guessed ID."""
    u = _find_user(tsap_id)
    if not u:
        raise HTTPException(404, "Profile dorakaledu")
    require_owner(request, str(u.get("tsap_id", "")))
    photo_filename = _media_filename(u.get("photo_url"), "/photos/")
    return {"success": True, "tsap_id": u.get("tsap_id", tsap_id),
            "photo_url": f"/photos/{photo_filename}" if photo_filename else "",
            "photo_status": u.get("photo_status", "none"),
            "photo_reason": u.get("photo_reason", ""), "photo_reason_te": u.get("photo_reason_te", ""),
            "selfie_status": u.get("selfie_status", "none"),
            "selfie_verified": bool(u.get("selfie_verified", False))}


@app.post("/api/verify/selfie")
async def verify_selfie(file: UploadFile = File(...), tsap_id: str = Form(""), request: Request = None):
    """Live-selfie upload path for technical checks and separately recorded admin review status."""
    u = next((x for x in DB_USERS if x.get("tsap_id") == (tsap_id or "").strip()), None)
    if not u:
        raise HTTPException(404, "Profile దొరకలేదు — ముందు register అవ్వండి")
    require_owner(request, u["tsap_id"])  # 🌊 WAVE 23 — vere vaalla peru tho selfie vaddu
    data = await file.read(5 * 1024 * 1024 + 1)
    verdict = validate_photo(data, file.filename or "", selfie=True)
    if not verdict["ok"]:
        raise HTTPException(422, {"reason": verdict["reason"], "en": verdict["en"],
                                  "te": verdict["te"],
                                  "message_telugu": f"🤳 {verdict['te']}",
                                  "checks": verdict["checks"]})
    try:
        data = sanitize_photo(data, verdict["checks"]["format"])
        verdict["checks"]["sanitized_bytes"] = len(data)
    except ValueError:
        raise HTTPException(422, {
            "reason": "PHOTO_SANITIZE_FAILED",
            "en": "The selfie could not be safely prepared. Please choose another image.",
            "te": "సెల్ఫీని సురక్షితంగా సిద్ధం చేయలేకపోయాం — మరో ఫోటోను ఎంచుకోండి.",
            "message_telugu": "సెల్ఫీని సురక్షితంగా సిద్ధం చేయలేకపోయాం — మరో ఫోటోను ఎంచుకోండి.",
            "checks": verdict["checks"],
        })
    os.makedirs(PHOTO_MEDIA_DIR, exist_ok=True)
    name = f"{u['tsap_id']}-selfie-" + datetime.utcnow().strftime("%y%m%d%H%M%S") + "-" + secrets.token_hex(6) + ".jpg"
    selfie_path = os.path.join(PHOTO_MEDIA_DIR, name)
    try:
        atomic_write_bytes(selfie_path, data)
    except Exception as exc:
        raise HTTPException(500, f"Selfie save failed: {str(exc)[:80]}") from exc
    previous = {key: u.get(key) for key in ("selfie_url", "selfie_status", "selfie_checks")}
    u["selfie_url"] = f"/photos/{name}"
    u["selfie_status"] = "pending"
    u["selfie_checks"] = verdict["checks"]
    if not _persist_core_state():
        for key, value in previous.items():
            if value is None:
                u.pop(key, None)
            else:
                u[key] = value
        try:
            os.remove(selfie_path)
        except OSError:
            pass
        raise HTTPException(503, "Selfie could not be saved safely. Please try again.")
    return {"success": True, "url": u["selfie_url"], "status": "pending", "checks": verdict["checks"],
            "message_telugu": "🤳 Selfie upload అయింది — staff review పూర్తయ్యాక status update అవుతుంది. ఇది అన్ని profile వివరాలను verify చేయదు."}


@app.get("/api/admin/photos/pending")
def admin_photos_pending(request: Request):
    """📸 ADMIN — photo + selfie moderation queue (Layer-2 human review)."""
    require_admin(request, staff_ok=True)
    q = []
    for u in DB_USERS:
        _first = str(u.get("full_name", "")).split()[0] if str(u.get("full_name", "")).split() else ""
        if u.get("photo_status") == "pending":
            q.append({"kind": "photo", "tsap_id": u.get("tsap_id"), "name": _first,
                      "url": f"/api/admin/photos/{urllib.parse.quote(str(u.get('tsap_id', '')), safe='')}/content?kind=photo",
                      "checks": u.get("photo_checks", {}), "at": u.get("photo_uploaded_at", "")})
        if u.get("selfie_status") == "pending":
            q.append({"kind": "selfie", "tsap_id": u.get("tsap_id"), "name": _first,
                      "url": f"/api/admin/photos/{urllib.parse.quote(str(u.get('tsap_id', '')), safe='')}/content?kind=selfie",
                      "checks": u.get("selfie_checks", {}), "at": ""})
    return {"success": True, "count": len(q), "queue": q}


@app.get("/api/admin/photos/{tsap_id}/content")
def admin_photo_content(tsap_id: str, request: Request, kind: str = "photo"):
    """Admin/staff-only binary access to pending review media; never publish storage URLs."""
    require_admin(request, staff_ok=True)
    profile = _find_user(str(tsap_id or "").strip().upper())
    if not profile:
        raise HTTPException(404, "Photo not found")
    media_kind = str(kind or "photo").strip().lower()
    if media_kind == "photo":
        status, media_url = profile.get("photo_status"), profile.get("photo_url")
    elif media_kind == "selfie":
        status, media_url = profile.get("selfie_status"), profile.get("selfie_url")
    else:
        raise HTTPException(400, "kind must be photo or selfie")
    if status != "pending":
        raise HTTPException(404, "Pending review media not found")
    filename = _media_filename(media_url, "/photos/")
    if not filename:
        raise HTTPException(404, "Pending review media not found")
    path = _media_file(PHOTO_MEDIA_DIR, filename)
    if not os.path.isfile(path):
        raise HTTPException(404, "Pending review media not found")
    return FileResponse(path, headers={"Cache-Control": "private, no-store",
                                       "X-Content-Type-Options": "nosniff"})


@app.post("/api/admin/photos/review")
def admin_photos_review(payload: dict, request: Request):
    """📸 ADMIN — approve/reject photo or selfie (wrong-person/group/celebrity → reject)."""
    require_admin(request, staff_ok=True)
    d = payload or {}
    u = next((x for x in DB_USERS if x.get("tsap_id") == str(d.get("tsap_id", ""))), None)
    if not u:
        raise HTTPException(404, "Profile dorakaledu")
    kind = str(d.get("kind", "photo"))
    decision = str(d.get("decision", ""))
    if kind not in ("photo", "selfie") or decision not in ("approved", "rejected"):
        raise HTTPException(400, "kind=photo/selfie, decision=approved/rejected ఇవ్వండి")
    user_before = copy.deepcopy(u)
    te_reason = str(d.get("reason_te", "") or d.get("reason", "")).strip()
    if kind == "photo":
        previous = {key: u.get(key) for key in ("photo_status", "has_photo", "photo_urls", "photo_reason", "photo_reason_te")}
        u["photo_status"] = decision
        if decision == "approved":
            u["has_photo"] = True
            u["photo_urls"] = [u.get("photo_url", "")] if u.get("photo_url") else []
            u["photo_reason"] = ""
            u["photo_reason_te"] = ""
        else:
            u["has_photo"] = False
            u["photo_reason"] = str(d.get("reason", "Photo not approved") or "Photo not approved")
            u["photo_reason_te"] = te_reason or "ఈ ఫోటో approve కాలేదు — మీ clear original ఫోటో మళ్లీ పంపండి"
    else:
        previous = {key: u.get(key) for key in ("selfie_status", "selfie_verified")}
        u["selfie_status"] = decision
        u["selfie_verified"] = (decision == "approved")
    if kind == "photo" and not _regenerate_profile_card(u):
        u.clear()
        u.update(user_before)
        _regenerate_profile_card(u)
        raise HTTPException(503, "Profile card could not be regenerated safely. Please try again.")
    if not _persist_core_state():
        u.clear()
        u.update(user_before)
        _regenerate_profile_card(u)
        raise HTTPException(503, "Photo review could not be saved safely. Please try again.")
    return {"success": True, "tsap_id": u["tsap_id"], "kind": kind, "decision": decision,
            "message_telugu": ("✅ Approve అయ్యింది" if decision == "approved" else "❌ Reject అయ్యింది — user కి reason వెళ్లింది")}


# ---------------------------------------------------------------------------
# 🌊 WAVE 18 — PASSWORD AUTH (number + password login, forgot/reset via OTP)
# pbkdf2_hmac-sha256 + random salt (stdlib only — bcrypt dependency vaddu).
# ---------------------------------------------------------------------------
import hashlib as _hashlib
import secrets as _secrets

PW_LOCKS: Dict[str, Dict[str, Any]] = {}   # phone → {fails, locked_until}
_PW_LOCK = threading.RLock()


def _hash_password(pw: str) -> str:
    # 🛡️ Phase 15: OWASP Password Storage Cheat Sheet (2023) recommends
    # >=600,000 iterations for PBKDF2-HMAC-SHA256 (this repo's prior default
    # of 120,000 was the older 2017-era guidance). The iteration count is
    # now stamped into the stored hash itself (4-part format) so it can be
    # bumped again in the future without invalidating hashes created today.
    salt = _secrets.token_hex(16)
    iterations = PBKDF2_ITERATIONS
    h = _hashlib.pbkdf2_hmac("sha256", pw.encode("utf-8"), bytes.fromhex(salt), iterations)
    return f"pbkdf2${iterations}${salt}${h.hex()}"


PBKDF2_ITERATIONS = 600_000
PBKDF2_ITERATIONS_LEGACY = 120_000  # 🛡️ pre-Phase-15 hashes (3-part format, no stamped count)


def _check_password(pw: str, stored: str) -> bool:
    try:
        parts = (stored or "").split("$")
        if len(parts) == 4:
            # current format: pbkdf2$<iterations>$<salt>$<hash>
            algo, iters_s, salt, hexh = parts
            iterations = int(iters_s)
        elif len(parts) == 3:
            # 🛡️ backward compat: hashes created before Phase 15 didn't stamp
            # the iteration count — they were always hashed with the old
            # default. Verify against that fixed count so existing users'
            # passwords (set before this change shipped) keep working.
            algo, salt, hexh = parts
            iterations = PBKDF2_ITERATIONS_LEGACY
        else:
            return False
        if algo != "pbkdf2":
            return False
        h = _hashlib.pbkdf2_hmac("sha256", pw.encode("utf-8"), bytes.fromhex(salt), iterations)
        return _secrets.compare_digest(h.hex(), hexh)
    except Exception:
        return False


def _pw_locked(phone: str) -> str:
    with _PW_LOCK:
        rec = PW_LOCKS.get(phone) or {}
        try:
            if rec.get("locked_until") and datetime.fromisoformat(rec["locked_until"]) > datetime.utcnow():
                return rec["locked_until"]
        except Exception:
            pass
        return ""


def _pw_fail(phone: str) -> int:
    with _PW_LOCK:
        rec = PW_LOCKS.get(phone) or {"fails": 0}
        rec["fails"] = int(rec.get("fails", 0)) + 1
        if rec["fails"] >= 5:
            rec["locked_until"] = (datetime.utcnow() + timedelta(minutes=15)).isoformat()
            rec["fails"] = 0
            abuse_log("pw_locked", phone[-4:])
        PW_LOCKS[phone] = rec
        return rec["fails"]


@app.post("/api/auth/login-password")
def auth_login_password(payload: dict):
    """🔑 Number + password login (OTP alternative). 5 wrong → 15 min lock."""
    d = payload or {}
    phone = "".join(ch for ch in str(d.get("phone", "")) if ch.isdigit())
    pw = str(d.get("password", ""))
    if len(phone) != 10 or not pw:
        raise HTTPException(400, "10-digit number + password ఇవ్వండి")
    if _pw_locked(phone):
        raise HTTPException(429, "🔒 5 sarlu tappu — 15 నిమిషాల్లో మళ్లీ try చెయ్యండి (leda OTP తో login)")
    u = next((x for x in DB_USERS if x.get("phone") == phone), None)
    if not u or not u.get("password_hash") or not _check_password(pw, u["password_hash"]):
        left = 5 - _pw_fail(phone)
        raise HTTPException(401, f"❌ Number/Password tappu (migilindi: {max(left, 0)} tries) — leda OTP తో login చెయ్యండి")
    with _PW_LOCK:
        PW_LOCKS.pop(phone, None)
    return {"success": True, "tsap_id": u["tsap_id"], "auth_token": sign_token(u["tsap_id"]),
            "has_account": True, "profile": safe_user(u),
            "message_telugu": f"✅ Welcome back, {str(u.get('full_name', '')).split()[0] if str(u.get('full_name', '')).split() else ''}! 🙏"}


@app.post("/api/auth/forgot")
def auth_forgot(payload: dict):
    """🔑 Forgot password — reset OTP (purpose=reset) pampistham."""
    d = dict(payload or {})
    d["purpose"] = "reset"
    phone = "".join(ch for ch in str(d.get("phone", "")) if ch.isdigit())
    if len(phone) != 10:
        raise HTTPException(400, "10 digit mobile number ఇవ్వండి")
    return otp_send(d)


@app.post("/api/auth/reset")
def auth_reset(payload: dict):
    # Consume the reset OTP, mutate credentials, and invalidate sessions as one
    # serialized authentication transition.
    with _OTP_VERIFY_LOCK:
        return _auth_reset_locked(payload)


def _auth_reset_locked(payload: dict):
    """🔑 Reset password — OTP verify + కొత్త password set."""
    d = payload or {}
    phone = req_phone(d.get("phone", ""))
    code = str(d.get("code", "")).strip()
    new_pw = str(d.get("new_password", ""))
    if not re.fullmatch(r"\d{4}", code):
        raise HTTPException(400, "Enter the four-digit OTP")
    if len(new_pw) < 8 or len(new_pw) > 72:
        raise HTTPException(400, "Password must be between 8 and 72 characters")
    rec = DB_OTPS.get(phone)
    if not rec or rec.get("purpose") != "reset":
        raise HTTPException(400, "மుందు password reset OTP పంపండి")
    rec_before = copy.deepcopy(rec)
    try:
        if datetime.fromisoformat(rec["expires"]) < datetime.utcnow():
            DB_OTPS.pop(phone, None)
            raise HTTPException(400, "OTP expire అయ్యింది — మళ్లీ పంపండి")
    except HTTPException:
        raise
    except (KeyError, TypeError, ValueError):
        DB_OTPS.pop(phone, None)
        raise HTTPException(400, "OTP invalid లేదా expire అయ్యింది — మళ్లీ పంపండి")
    rec["tries"] = int(rec.get("tries", 0)) + 1
    if rec["tries"] > 5:
        DB_OTPS.pop(phone, None)
        if not _persist_core_state():
            DB_OTPS[phone] = rec_before
            raise HTTPException(503, "OTP lock state could not be saved safely. Please try again.")
        abuse_log("otp_locked", phone[-4:])
        raise HTTPException(429, "చాలా సార్లు ప్రయత్నించారు — కొత్త OTP తీసుకోండి")
    expected = str(rec.get("code_hash", ""))
    if not expected or not hmac.compare_digest(_otp_digest(code), expected):
        if not _persist_core_state():
            DB_OTPS[phone] = rec_before
            raise HTTPException(503, "OTP attempt could not be saved safely. Please try again.")
        raise HTTPException(400, "❌ OTP తప్పు లేదా invalid — మళ్లీ ప్రయత్నించండి")
    u = next((x for x in DB_USERS if x.get("phone") == phone), None)
    if not u:
        raise HTTPException(404, "ఈ number తో account లేదు — ముందు register అవ్వండి")
    user_before = copy.deepcopy(u)
    was_verified = phone in VERIFIED_PHONES
    previous_verified_at = VERIFIED_PHONE_AT.get(phone)
    with _PW_LOCK:
        previous_pw_lock = copy.deepcopy(PW_LOCKS.get(phone))
    u["password_hash"] = _hash_password(new_pw)
    u["phone_verified"] = True
    VERIFIED_PHONES.add(phone)
    DB_OTPS.pop(phone, None)
    with _PW_LOCK:
        PW_LOCKS.pop(phone, None)
    # 🔐 Phase 14: a password reset is a security event — invalidate every
    # token issued before this moment (any device/session that was logged
    # in with the old credentials, or any token an attacker may have
    # obtained, stops working immediately). The fresh token below is signed
    # *after* the bump so it carries the new version and keeps working.
    revoke_all_tokens(u["tsap_id"])
    if not _persist_core_state():
        u.clear()
        u.update(user_before)
        if rec_before:
            DB_OTPS[phone] = rec_before
        else:
            DB_OTPS.pop(phone, None)
        if not was_verified:
            VERIFIED_PHONES.discard(phone)
        if previous_verified_at is None:
            VERIFIED_PHONE_AT.pop(phone, None)
        else:
            VERIFIED_PHONE_AT[phone] = previous_verified_at
        with _PW_LOCK:
            if previous_pw_lock is None:
                PW_LOCKS.pop(phone, None)
            else:
                PW_LOCKS[phone] = previous_pw_lock
        raise HTTPException(503, "Password reset could not be saved safely. Please try again.")
    return {"success": True, "tsap_id": u["tsap_id"], "auth_token": sign_token(u["tsap_id"]),
            "message_telugu": "✅ Password మారింది — పాత sessions అన్నీ logout అయ్యాయి, ఇప్పుడు number + password తో login చెయ్యండి 🔑"}


_OTP_HASH_KEY = os.getenv("TSAP_AUTH_SECRET", "").encode("utf-8") or secrets.token_bytes(32)


def _otp_digest(code: str) -> str:
    return hmac.new(_OTP_HASH_KEY, str(code).encode("utf-8"), hashlib.sha256).hexdigest()


@app.post("/api/otp/send")
def otp_send(payload: dict):
    # Serialize the cooldown/history reservation and delivery result per phone;
    # two concurrent resends must not both pass the same 60-second check.
    with _OTP_SEND_LOCK:
        return _otp_send_locked(payload)


def _otp_send_locked(payload: dict):
    """Send a short-lived login/reset OTP through a configured delivery channel."""
    d = payload or {}
    phone = req_phone(d.get("phone", ""))
    purpose = str(d.get("purpose", "login")).strip().lower()
    if purpose not in {"login", "reset"}:
        raise HTTPException(400, "Unsupported OTP purpose")

    now = datetime.utcnow()
    previous = DB_OTPS.get(phone) or {}
    if previous.get("sent_at"):
        try:
            age = (now - datetime.fromisoformat(previous["sent_at"])).total_seconds()
            if age < 60:
                retry_after = max(1, int(60 - age))
                return JSONResponse(status_code=429, content={
                    "success": False,
                    "retry_after": retry_after,
                    "message_telugu": f"⏳ {retry_after} sec తర్వాత మళ్లీ ప్రయత్నించండి",
                })
        except (TypeError, ValueError):
            pass

    cutoff = (now - timedelta(hours=1)).isoformat()
    history = [stamp for stamp in previous.get("history", [])
               if isinstance(stamp, str) and stamp > cutoff]
    if len(history) >= 5:
        abuse_log("otp_hour_limit", phone[-4:])
        return JSONResponse(status_code=429, content={
            "success": False,
            "message_telugu": "⚠️ గంటలో 5 OTP పరిమితి చేరుకుంది; తర్వాత మళ్లీ ప్రయత్నించండి",
        })

    code = str(secrets.randbelow(9000) + 1000)
    sent_at = now.isoformat()
    DB_OTPS[phone] = {
        "code_hash": _otp_digest(code),
        "expires": (now + timedelta(minutes=10)).isoformat(),
        "tries": 0,
        "sent_at": sent_at,
        "purpose": purpose,
        "history": (history + [sent_at])[-10:],
    }

    delivery = otp_channel_send(phone, code, DB_USERS)
    if not isinstance(delivery, dict) or not delivery.get("ok"):
        DB_OTPS.pop(phone, None)
        raise HTTPException(503, "OTP delivery is temporarily unavailable; please try again later")

    DB_OTPS[phone]["channel"] = str(delivery.get("channel", "configured"))[:40]
    # Do not return 200 for an OTP that would disappear on restart.  The code
    # itself is stored as a digest, and the delivery response never includes it.
    if not _persist_core_state():
        DB_OTPS.pop(phone, None)
        raise HTTPException(503, "OTP could not be saved safely. Please try again.")
    return {
        "success": True,
        "phone": f"XXXXXX{phone[-4:]}",
        "expires_in_min": 10,
        "channel": DB_OTPS[phone]["channel"],
        "purpose": purpose,
        "message_telugu": f"📱 OTP పంపించాం (+91 XXXXXX{phone[-4:]}). 10 నిమిషాల్లో నమోదు చేయండి.",
    }


@app.post("/api/otp/verify")
def otp_verify(payload: dict):
    d = payload or {}
    phone = req_phone(d.get("phone", ""))
    code = str(d.get("code", "")).strip()
    if not re.fullmatch(r"\d{4}", code):
        raise HTTPException(400, "Enter the four-digit OTP")

    # Lookup, attempt counting, digest comparison, and consume are one atomic
    # operation. Concurrent retries cannot all reuse the same login code.
    with _OTP_VERIFY_LOCK:
        rec = DB_OTPS.get(phone)
        if not rec or rec.get("purpose") != "login":
            raise HTTPException(400, "Request a login OTP first")
        try:
            if datetime.fromisoformat(rec["expires"]) < datetime.utcnow():
                DB_OTPS.pop(phone, None)
                raise HTTPException(400, "OTP expire అయ్యింది — మళ్లీ పంపండి")
        except HTTPException:
            raise
        except (KeyError, TypeError, ValueError):
            DB_OTPS.pop(phone, None)
            raise HTTPException(400, "OTP invalid లేదా expire అయ్యింది — మళ్లీ పంపండి")

        previous_otp = copy.deepcopy(rec)
        rec["tries"] = int(rec.get("tries", 0)) + 1
        if rec["tries"] > 5:
            DB_OTPS.pop(phone, None)
            if not _persist_core_state():
                DB_OTPS[phone] = previous_otp
                raise HTTPException(503, "OTP lock state could not be saved safely. Please try again.")
            abuse_log("otp_locked", phone[-4:])
            abuse_count("otp_locked")
            raise HTTPException(429, "చాలా సార్లు ప్రయత్నించారు — కొత్త OTP తీసుకోండి")

        expected = str(rec.get("code_hash", ""))
        valid = bool(expected) and hmac.compare_digest(_otp_digest(code), expected)
        if not valid:
            if not _persist_core_state():
                DB_OTPS[phone] = previous_otp
                raise HTTPException(503, "OTP attempt could not be saved safely. Please try again.")
            return JSONResponse(status_code=400, content={
                "success": False,
                "error": "invalid_otp",
                "message_telugu": "❌ OTP తప్పు లేదా invalid — సరైన OTP నమోదు చేయండి",
                "tries_left": max(0, 5 - rec["tries"]),
            })

        was_verified = phone in VERIFIED_PHONES
        previous_verified_at = VERIFIED_PHONE_AT.get(phone)
        u = next((x for x in DB_USERS if x.get("phone") == phone), None)
        previous_phone_verified = u.get("phone_verified") if u else None

        VERIFIED_PHONES.add(phone)
        VERIFIED_PHONE_AT[phone] = int(time.time())
        DB_OTPS.pop(phone, None)
        if u:
            u["phone_verified"] = True

        # Phone verification is an authentication state transition, not a
        # best-effort analytics write.  Persist it before issuing the token and
        # restore every in-memory mutation if storage is unavailable.
        if not _persist_core_state():
            if previous_otp:
                DB_OTPS[phone] = previous_otp
            else:
                DB_OTPS.pop(phone, None)
            if not was_verified:
                VERIFIED_PHONES.discard(phone)
            if previous_verified_at is None:
                VERIFIED_PHONE_AT.pop(phone, None)
            else:
                VERIFIED_PHONE_AT[phone] = previous_verified_at
            if u:
                if previous_phone_verified is None:
                    u.pop("phone_verified", None)
                else:
                    u["phone_verified"] = previous_phone_verified
            raise HTTPException(503, "Phone verification could not be saved safely. Please try again.")

        tsap_id = (u or {}).get("tsap_id", "")
        return {
            "success": True,
            "phone_verified": True,
            "tsap_id": tsap_id,
            "auth_token": sign_token(tsap_id) if tsap_id else "",
            "has_account": bool(u),
            "profile": safe_user(u) if u else None,
            "quality": profile_completeness(u) if u else None,
            "message_telugu": ("✅ Number verify అయ్యింది"
                               if u else "✅ Number verify అయ్యింది — ఇప్పుడు register చేయండి"),
        }


@app.get("/api/home/teasers")
def home_teasers(limit: int = 8):
    """Homepage preview from approved, non-synthetic records; no identity claim."""
    pool = [u for u in DB_USERS if _is_approved_profile(u)]
    random.shuffle(pool)
    rows = []
    for u in pool[:max(1, min(int(limit or 8), 12))]:
        r = safe_user(u)
        r["blur"] = True
        r["photo_url"] = ""          # teaser lo clear photo vaddu — attract kosam blur tile
        rows.append(r)
    return {"success": True, "count": len(rows), "teasers": rows,
            "cta_telugu": "🔒 Full details + photo chudali అంటే REGISTER (FREE) చెయ్యండి."}


@app.get("/api/search")
def advanced_search(
    gender: Optional[str] = None, caste: Optional[str] = None, sub_caste: Optional[str] = None,
    district: Optional[str] = None, state: Optional[str] = None, job: Optional[str] = None,
    education: Optional[str] = None,
    age_min: int = 18, age_max: int = 60, salary_min: int = 0,
    marital_status: Optional[str] = None, children: Optional[str] = None,
    second_marriage: bool = False,
    verified_only: bool = False, photo_only: bool = False,
    religion: Optional[str] = None, q: Optional[str] = None,
    sort: str = "new", viewer_id: Optional[str] = None, limit: int = 30, offset: int = 0,
    nri_only: bool = False, profession_first: bool = False,
    salary_max: int = 0, height_min: str = "", height_max: str = "", dosham: Optional[str] = None,
    star: Optional[str] = None, rasi: Optional[str] = None, min_completeness: int = 0, exclude_viewed: bool = False,
    exclude_interested: bool = False, with_facets: bool = False,
    request: Request = None,
):
    """
    🔎 Advanced filters — caste / district / age range / salary / job / verified / photo / search text.
    Frontend /matches page idi use chestundi; an approved-member-empty result stays empty (no demo fallback).
    """
    # 🛡️ WAVE 9 — clamp + sanitize (mundu limit=-1 → 75 rows; age_min>age_max silently 0 results)
    limit = clamp_int(limit, "limit", 1, 100, 30)
    offset = clamp_int(offset, "offset", 0, 100000, 0)
    for _b in (verified_only, photo_only, exclude_viewed, exclude_interested, with_facets):
        pass  # bool params — FastAPI coerce chestundi
    age_min = clamp_int(age_min, "age_min", 18, 70, 18)
    age_max = clamp_int(age_max, "age_max", 18, 70, 60)
    if age_min > age_max:
        validation_error("age_min", "⚠️ age_min < age_max ఉండాలి (age range tappu)")
    salary_min = clamp_int(salary_min, "salary_min", 0, 100_000_000, 0)
    legacy_porutham_sort_ignored = sort == "porutham"
    if legacy_porutham_sort_ignored:
        sort = "new"
    if sort not in ("new", "age", "boosted"):
        validation_error("sort", "⚠️ sort కి valid values: new | age | boosted")
    q = clean(q, 60, "q") if q else None
    for _f in (gender, caste, sub_caste, district, state, job, education, marital_status, children, religion, dosham, star, rasi):
        if _f and len(str(_f)) > 500:
            validation_error("filter", "⚠️ Filter value చాలా పెద్దది (500 chars max)")
    if min_completeness:
        min_completeness = req_int(min_completeness, "min_completeness", 0, 100, default=0)

    # Never trust a caller-supplied profile ID as viewer identity.
    identity = token_from_request(request) if request else None
    viewer_id = str(identity.get("tsap_id", "")).strip().upper() if identity else ""

    items = [u for u in DB_USERS if _is_approved_profile(u)]
    if viewer_id:
        items = [u for u in items if not safety.is_blocked(viewer_id, u.get("tsap_id", ""), DB_BLOCKS)]
    else:
        items = [u for u in items if not u.get("is_banned")]
    if gender:
        _g = {"male": "groom", "female": "bride"}.get(gender.lower(), gender.lower())  # WAVE 29: male/female alias
        items = [u for u in items if str(u.get("gender", "")).lower() == _g]
    if caste:
        c_list = [c.strip().lower() for c in str(caste).split(",") if c.strip()]
        if c_list:
            items = [u for u in items if any(c in str(u.get("caste", "")).lower() or c in str(u.get("sub_caste", "")).lower() for c in c_list)]
    if sub_caste:
        sc_list = [sc.strip().lower() for sc in str(sub_caste).split(",") if sc.strip()]
        if sc_list:
            items = [u for u in items if any(sc in str(u.get("sub_caste", "")).lower() for sc in sc_list)]
    if district:
        d_list = [d.strip().lower() for d in str(district).split(",") if d.strip()]
        if d_list:
            items = [u for u in items if any(d in str(u.get("district", "")).lower() or d in str(u.get("current_city", "")).lower() for d in d_list)]
    if state:
        s_list = [s.strip().upper() for s in str(state).split(",") if s.strip()]
        if s_list:
            items = [u for u in items if any(s == str(u.get("state", "")).upper() for s in s_list)]
    if job:
        j_list = [j.strip().lower() for j in str(job).split(",") if j.strip()]
        if j_list:
            items = [u for u in items if any(
                j in str(u.get("job", "")).lower() or
                j in str(u.get("work_type", "")).lower() or
                (("housewife" in j or "homemaker" in j or "గృహిణి" in j or "not working" in j) and
                 (not str(u.get("job", "")).strip() or any(hk in str(u.get("job", "")).lower() for hk in ["housewife", "homemaker", "not working", "student", "గృహిణి", "none", "no job"])))
                for j in j_list
            )]
    if education:
        e_list = [e.strip().lower() for e in str(education).split(",") if e.strip()]
        if e_list:
            items = [u for u in items if any(e in str(u.get("education", "")).lower() for e in e_list)]
    # 💍 First/second marriage labels are normalized through one alias-aware policy.
    _marital_raw = str(marital_status or "").lower()
    _second_marriage_filter = second_marriage or any(
        marker in _marital_raw for marker in ("second_marriage", "second marriage", "remarriage", "punarvivaham", "punar vivaham")
    )
    if _second_marriage_filter:
        items = [u for u in items
                 if str(u.get("marital_status", "")).strip()
                 and not is_never_married_status(u.get("marital_status"))]
    elif marital_status:
        m_list = [m.strip().lower() for m in str(marital_status).split(",") if m.strip()]

        def _matches_marital_filter(profile_status, selected):
            actual = str(profile_status or "").strip().lower()
            if is_never_married_status(selected):
                return is_never_married_status(actual)
            if is_never_married_status(actual):
                return False
            if selected in ("divorced", "vidakuulu"):
                return any(k in actual for k in ("divorc", "vidak", "విడాకు"))
            if selected in ("widow", "widower", "widowed", "vidhava", "vidhurudu"):
                return any(k in actual for k in ("widow", "vidh", "వితంతు", "విధురు"))
            if selected in ("awaiting divorce", "separated"):
                return any(k in actual for k in ("awaiting", "separat", "విడాకుల", "నిరీక్షణ"))
            return bool(selected and selected in actual)

        if m_list:
            items = [u for u in items
                     if any(_matches_marital_filter(u.get("marital_status"), selected) for selected in m_list)]
    selected_marital_values = [value.strip() for value in str(marital_status or "").split(",") if value.strip()]
    children_filter_ignored = bool(selected_marital_values) and all(
        is_never_married_status(value) for value in selected_marital_values
    )
    if children and not children_filter_ignored:
        c_str = str(children).strip().lower()

        def _children_count(value):
            raw = str(value or "").strip().lower()
            if raw in ("none", "no", "no children", "0", "పిల్లలు లేరు"):
                return 0
            match = re.search(r"\d+", raw)
            return int(match.group()) if match else None

        def _has_children_match(profile, predicate):
            # Old rows may contain stale counts. First-marriage profiles never
            # participate in child-count searches, regardless of legacy values.
            return (not is_never_married_status(profile.get("marital_status"))
                    and predicate(_children_count(profile.get("children"))))

        if c_str in ("none", "no", "no children", "0", "పిల్లలు లేరు"):
            items = [u for u in items if _has_children_match(u, lambda count: count == 0)]
        elif c_str in ("with_children", "has_children", "yes", "పిల్లలు ఉన్నారు"):
            items = [u for u in items if _has_children_match(u, lambda count: (count or 0) > 0)]
        elif c_str.endswith("+") and c_str[:-1].isdigit():
            minimum = int(c_str[:-1])
            items = [u for u in items if _has_children_match(u, lambda count: count is not None and count >= minimum)]
        elif c_str.isdigit():
            target_count = int(c_str)
            items = [u for u in items if _has_children_match(u, lambda count: count == target_count)]
        else:
            items = [u for u in items if _has_children_match(
                u, lambda count: c_str in str(u.get("children", "")).lower())]
    if religion:
        religion_terms = [term.strip().casefold() for term in str(religion).split(",") if term.strip()]
        if religion_terms:
            items = [u for u in items if str(u.get("religion", "")).strip().casefold() in religion_terms]
    if nri_only:                                    # 🌊 WAVE 14 — NRI-only browse
        items = [u for u in items if _is_nri(u)]
    if verified_only:
        items = [u for u in items if safety.has_verification_evidence(u)]
    if photo_only:
        items = [u for u in items if u.get("photo_status") == "approved"
                 and not (u.get("photo_private") or u.get("privacy_mode") == "private")
                 and any(spotlight._profile_photo_url(value) for value in (
                     (u.get("photo_urls") if isinstance(u.get("photo_urls"), list) else []) + [u.get("photo_url")]
                 ))]
    items = [u for u in items if age_min <= int(u.get("age", 0) or 0) <= age_max]
    if salary_max:
        def _sal_max(u):
            raw = str(u.get("salary", "")).lower().replace("l", "00000").replace("k", "000")
            digits = "".join(ch for ch in raw if ch.isdigit())
            return int(digits) if digits else 0
        items = [u for u in items if 0 < _sal_max(u) <= salary_max]
    if height_min or height_max:
        from quality import _height_cm
        lo_cm, hi_cm = _height_cm(height_min) if height_min else 0, _height_cm(height_max) if height_max else 999
        items = [u for u in items if _height_cm(u.get("height")) and lo_cm <= _height_cm(u.get("height")) <= hi_cm]
    if dosham:
        dosham_terms = [term.strip().lower() for term in str(dosham).split(",") if term.strip()]
        if dosham_terms:
            # Missing member-entered data stays unknown; do not infer "No dosham".
            items = [u for u in items if any(
                term in str(u.get("dosham", "")).lower() for term in dosham_terms
            )]
    if star:
        st_list = [st.strip().lower() for st in str(star).split(",") if st.strip()]
        if st_list:
            items = [u for u in items if any(st in str(u.get("star", "")).lower() for st in st_list)]
    if rasi:
        rasi_terms = [term.strip().lower() for term in str(rasi).split(",") if term.strip()]
        if rasi_terms:
            items = [u for u in items if any(
                term in str(u.get("rasi", "")).lower() for term in rasi_terms
            )]
    if min_completeness:
        items = [u for u in items if profile_completeness(u)["percent"] >= min_completeness]
    if exclude_viewed and viewer_id:
        viewed = {v.get("tsap_id") for v in DB_VIEWS if v.get("viewer_id") == viewer_id}
        items = [u for u in items if u.get("tsap_id") not in viewed]
    if exclude_interested and viewer_id:
        touched = {i.get("to_id") for i in DB_INTERESTS if i.get("from_id") == viewer_id}
        touched |= {i.get("from_id") for i in DB_INTERESTS if i.get("to_id") == viewer_id}
        items = [u for u in items if u.get("tsap_id") not in touched]
    if salary_min:
        def _sal(u):
            raw = str(u.get("salary", "")).lower().replace("l", "00000").replace("k", "000")
            digits = "".join(ch for ch in raw if ch.isdigit())
            return int(digits) if digits else 0
        items = [u for u in items if _sal(u) >= salary_min]
    if q:
        ql = q.casefold()
        searchable_fields = ("tsap_id", "full_name", "district", "current_city", "caste", "sub_caste",
                             "job", "education", "gothram")
        items = [u for u in items if any(ql in str(u.get(field, "")).casefold() for field in searchable_fields)]

    viewer = _find_user(viewer_id) if viewer_id else None
    out = []
    for u in items:
        row = safe_user(u)
        row["phone_verified"] = bool(u.get("phone_verified"))
        row["is_verified"] = safety.has_verification_evidence(u)
        row["id_verified"] = bool(u.get("id_verified"))
        row["has_photo"] = bool(row.get("photo_url"))
        row["boosted"] = bool(u.get("boost_until"))
        row["marital_status"] = u.get("marital_status", "—")
        row["salary"] = sanitize_public_text(u.get("salary", "—"))
        row["company"] = sanitize_public_text(u.get("company", ""))
        row["sub_caste"] = sanitize_public_text(u.get("sub_caste", ""))
        row["moola_nakshatram"] = sanitize_public_text(u.get("moola_nakshatram", ""))
        row["is_nri"] = _is_nri(u)
        row["profession_label"] = sanitize_public_text(_prof_label(u))
        row["country"] = sanitize_public_text(u.get("country", ""))
        row["_sort_created_at"] = u.get("created_at", "")
        row["boosted"] = A11.is_boosted(u)
        badge = safety.verification_badge(u)
        row["verification"] = badge["level"]
        row["verification_telugu"] = badge["telugu"]
        if viewer and viewer.get("gender") != u.get("gender"):
            try:
                comparison = topmatch.score_match_v2(viewer, u)
                row["observations"] = comparison.get("observations", [])
                row["differences"] = comparison.get("differences", [])
                row["preference_checks"] = comparison.get("preferences", [])
            except Exception:
                row["observations"] = []
                row["differences"] = []
                row["preference_checks"] = []
            # Astrology is not inferred from search fields. Keep this separate
            # from owner-uploaded Jathakam evidence and professional review.
            row["jathakam_status"] = "review_required"
        out.append(row)

    if sort == "age":
        out.sort(key=lambda x: int(x.get("age", 99) or 99))
    elif sort == "boosted":
        out.sort(key=lambda x: str(x.get("_sort_created_at", "")), reverse=True)
        out.sort(key=lambda x: not x.get("boosted"))
    else:
        out.sort(key=lambda x: str(x.get("_sort_created_at", "")), reverse=True)
    for row in out:
        row.pop("_sort_created_at", None)
    if profession_first and viewer:
        out = MP.rerank_profession(viewer, out)

    return {
        "total": len(out), "count": len(out[offset:offset + limit]), "offset": offset, "limit": limit,
        "sort": sort,
        "legacy_porutham_sort_ignored": legacy_porutham_sort_ignored,
        "filters": {"gender": gender, "caste": caste, "district": district, "state": state, "job": job,
                    "education": education, "age": [age_min, age_max], "salary_min": salary_min,
                    "marital_status": marital_status, "verified_only": verified_only, "photo_only": photo_only,
                    "religion": religion, "q": q},
        "results": out[offset:offset + limit],
        "facets": search_facets(out, 10) if with_facets else {},
        "message_telugu": f"🔎 {len(out)} profiles dorikayi (filters: caste={caste or 'Any'}, district={district or 'Any'}, age={age_min}-{age_max})",
    }


@app.get("/api/recently-viewed/{viewer_id}")
def recently_viewed_profiles(viewer_id: str, request: Request, limit: int = 12):
    """Profiles this member viewed recently — private, deduplicated, safe fields only."""
    viewer_id = str(viewer_id or "").strip().upper()
    require_owner(request, viewer_id)
    if not _find_user(viewer_id):
        raise HTTPException(404, "మీ profile దొరకలేదు")
    limit = clamp_int(limit, "limit", 1, 24, 12)
    seen, rows = set(), []
    for event in reversed(DB_VIEWS):
        target_id = str(event.get("tsap_id", "")).upper()
        if event.get("viewer_id") != viewer_id or not target_id or target_id in seen:
            continue
        seen.add(target_id)
        profile = _find_user(target_id)
        if not profile or profile.get("is_banned") or safety.is_blocked(viewer_id, target_id, DB_BLOCKS):
            continue
        row = dict(safe_user(profile))
        private_photo = bool(profile.get("privacy_mode") == "private" or profile.get("photo_private"))
        photo_candidates = profile.get("photo_urls", []) if isinstance(profile.get("photo_urls"), list) else []
        photo_candidates = [profile.get("photo_url"), *photo_candidates]
        public_photo = ""
        if profile.get("photo_status") == "approved" and not private_photo:
            public_photo = next((spotlight._profile_photo_url(value) for value in photo_candidates
                                 if spotlight._profile_photo_url(value)), "")
        row.update({
            "viewed_at": event.get("at", ""),
            "id_verified": bool(profile.get("id_verified")),
            "has_photo": bool(public_photo),
            "photo_url": public_photo,
        })
        rows.append(row)
        if len(rows) >= limit:
            break
    return {"success": True, "count": len(rows), "profiles": rows,
            "message_telugu": "ఇటీవల మీరు చూసిన ప్రొఫైళ్లు"}


@app.get("/api/profiles/{tsap_id}/similar")
def similar_profiles(tsap_id: str, limit: int = 8):
    """Legacy route returning more approved profiles of the same gender, newest first."""
    target = _find_user(str(tsap_id or "").strip().upper())
    if not _is_approved_profile(target):
        raise HTTPException(404, "Approved active profile not found")
    limit = clamp_int(limit, "limit", 1, 12, 8)
    target_gender = str(target.get("gender") or "").strip().casefold()
    candidates = [
        profile for profile in DB_USERS
        if isinstance(profile, dict) and profile.get("tsap_id") != target.get("tsap_id")
        and str(profile.get("gender") or "").strip().casefold() == target_gender
        and _is_approved_profile(profile)
    ] if target_gender else []
    candidates.sort(key=lambda profile: (str(profile.get("created_at") or ""),
                                         str(profile.get("tsap_id") or "")), reverse=True)
    rows = []
    for candidate in candidates[:limit]:
        row = dict(safe_user(candidate))
        row.update({
            "id_verified": bool(candidate.get("id_verified")),
            "has_photo": bool(row.get("photo_url")),
        })
        rows.append(row)
    return {
        "success": True,
        "profile_id": target.get("tsap_id"),
        "count": len(rows),
        "profiles": rows,
        "ranking_basis": "creation_time_descending",
        "similarity_calculated": False,
        "message_telugu": "ఇదే gender category లోని తాజా profiles — compatibility లేదా similarity score లెక్కించలేదు.",
    }


@app.get("/api/digest/preview")
def digest_preview():
    """
    📅 Daily 9AM digest — Telegram + WhatsApp ki pampadaniki ready text.
    (Cron/scheduler ee endpoint ni pilichi post cheyyali — anti-ban queue lo veltundi)
    """
    today = datetime.utcnow().strftime("%Y-%m-%d")
    approved_profiles = [u for u in DB_USERS if _is_approved_profile(u)]
    brides = [u for u in approved_profiles if u.get("gender") == "Bride"]
    grooms = [u for u in approved_profiles if u.get("gender") == "Groom"]
    by_caste: Dict[str, int] = {}
    for u in approved_profiles:
        c = u.get("caste") or "Other"
        by_caste[c] = by_caste.get(c, 0) + 1
    top = sorted(by_caste.items(), key=lambda x: -x[1])[:6]
    text = (
        f"🌅 *MANA VIVAHA — Nedu కొత్త Profiles* ({today})\n"
        f"━━━━━━━━━━━━━━━━\n"
        f"👰 Brides: *{len(brides)}*   🤵 Grooms: *{len(grooms)}*\n"
        f"🔥 Top castes: " + ", ".join(f"{c} ({n})" for c, n in top) + "\n"
        f"━━━━━━━━━━━━━━━━\n"
        f"💌 Interest pampu → WhatsApp లో మీ profile share\n"
        f"🎁 మొదటి 3 requests FREE • ₹99 → 5 profiles\n"
        f"📝 FREE register: {os.getenv('SITE_URL', 'https://manavivaha.in')}/register"
    )
    entry = {"at": datetime.utcnow().isoformat(), "brides": len(brides), "grooms": len(grooms)}
    DB_DIGEST.append(entry)
    return {"success": True, "text": text, "brides": len(brides), "grooms": len(grooms),
            "top_castes": top,
            "how_to_post": "POST /api/publish/digest చెయ్యండి → Telegram + WhatsApp (anti-ban gap తో) వెళ్తుంది"}


@app.post("/api/publish/digest")
async def publish_digest(request: Request = None):
    """Digest ని Telegram live channels + WhatsApp queue కి (anti-ban gap తో) pampu."""
    require_admin(request)   # 🛡️ WAVE 9: admin key lekunda 403 (PII/money/)
    prev = digest_preview()
    text = prev["text"].replace("*", "*")  # WhatsApp formatting ki same
    targets = cfg_live = [c["chat_id"] for c in live_channels() if c.get("chat_id")]
    res = enqueue_whatsapp(publish_config()["wa_bridge_targets"], text, priority=1, kind="digest")
    tg = []
    for chat in targets:
        tg.append(await _send_telegram_public(chat, text))
    return {"success": True, "telegram": tg, "whatsapp": res, "text": text}


async def _send_telegram_public(chat: str, text: str):
    try:
        from publisher import _send_telegram as _st  # type: ignore
        return await _st(chat, text, None, publish_config())
    except Exception as e:
        return {"ok": False, "channel": chat, "error": str(e)[:120]}






# ============================================================================
#  📬 PERSONALIZED DAILY DIGEST (digest_engine.py)
#  Existing /api/digest = GLOBAL broadcast. These = PER-USER personalized.
#  🛡️ Generation NEVER sends; real WhatsApp send is gated behind
#     DIGEST_PERSONAL_SEND=1 AND WHATSAPP_MODE (queue no-ops when wa off).
# ============================================================================
def _digest_send_enabled() -> bool:
    return str(os.getenv("DIGEST_PERSONAL_SEND", "0")).lower() in ("1", "true", "yes", "on")


def _personal_digest_batch(lang: str = "te", engaged_only: bool = True):
    """Generate today's personalized-digest queue from current approved member profiles."""
    approved_members = [u for u in DB_USERS if _is_approved_profile(u)]
    return digest_engine.run_personal_digests(
        approved_members, approved_members, DB_INTERESTS, DB_VIEWS, DB_SAVES,
        saved_searches=SAVED_SEARCHES, new_matches_fn=new_matches_for,
        consent_fn=consent_for, lang=lang, engaged_only=engaged_only)


@app.get("/api/digest/personal/preview")
def digest_personal_preview(request: Request = None, lang: str = "te"):
    """🛡️ ADMIN — dry run: ఎంతమందికి personalized digest వెళ్తుంది, sample texts.
    No state change, no send. Review చేసి తర్వాత run చెయ్యండి."""
    require_admin(request)
    language = "en" if str(lang or "").lower() == "en" else "te"
    batch = _personal_digest_batch(language, True)
    return {"success": True, "dry_run": True, "lang": language, "counts": batch["counts"],
            "queued": batch["queued"], "samples": batch["samples"],
            "send_gated": not _digest_send_enabled(),
            "wa_mode": publish_config()["wa_mode"],
            "how_to_send": "POST /api/digest/personal/run (DIGEST_PERSONAL_SEND=1 + WHATSAPP_MODE on ఉంటేనే పంపుతుంది)",
            "how_to_send_en": "Send only when DIGEST_PERSONAL_SEND=1 and WhatsApp is configured and enabled."}


@app.post("/api/digest/personal/run")
def digest_personal_run(payload: dict = Body(default={}), request: Request = None):
    """🛡️ ADMIN — personalized digest queue generate + log. Send ONLY if
    DIGEST_PERSONAL_SEND=1 AND wa_mode != off (default OFF → live site కి safe)."""
    require_admin(request)
    d = payload or {}
    lang = "en" if str(d.get("lang", "te")).lower() == "en" else "te"
    engaged_only = req_bool(d.get("engaged_only", True))
    batch = _personal_digest_batch(lang, engaged_only)

    # log summary to the persisted digest history (kind=personal)
    DB_DIGEST.append({"at": batch["at"], "kind": "personal", "lang": lang,
                      "queued": batch["queued"], "counts": batch["counts"]})

    send_enabled = _digest_send_enabled()
    wa_on = publish_config()["wa_mode"] != "off"
    if send_enabled and wa_on:
        def _send(rec):
            u = _find_user(rec.get("tsap_id", "")) or {}
            phone = str(u.get("phone", "") or "")
            if len(phone) < 10:
                return {"tsap_id": rec.get("tsap_id"), "queued": False, "reason": "no_phone"}
            q = enqueue_whatsapp([phone], rec.get("text", ""), priority=1, kind="personal_digest")
            # dedup for next run: mark the saved searches that produced hits
            hits = {s["search_id"]: s.get("ids", []) for s in rec.get("saved_searches", []) if s.get("ids")}
            if hits:
                for sr in saved_for(rec.get("tsap_id", "")):
                    ids = hits.get(sr.get("search_id"))
                    if ids:
                        mark_alerted(sr, ids)
            return {"tsap_id": rec.get("tsap_id"), **q}
        send_result = digest_engine.send_digest_queue(batch["queue"], _send)
        send_result["skipped"] = False
    else:
        send_result = {"sent": 0, "failed": 0, "skipped": True,
                       "reason": "gated_off" if not send_enabled else "wa_mode_off"}

    return {"success": True, "counts": batch["counts"], "queued": batch["queued"],
            "samples": batch["samples"], "send_enabled": send_enabled, "wa_on": wa_on,
            "send": send_result,
            "message_telugu": ("📬 Personalized digest queue సిద్ధం (%d మంది). Send gated — "
                               "DIGEST_PERSONAL_SEND=1 + WhatsApp on ఉంటేనే పంపుతుంది." % batch["queued"]),
            "message_en": ("Personalized digest queue prepared for %d recipients. Sending is gated and requires DIGEST_PERSONAL_SEND=1 plus configured WhatsApp."
                           % batch["queued"])}


@app.get("/api/assistant/digest/{tsap_id}")
def api_assistant_digest(tsap_id: str, request: Request = None):
    """🧠 OWNER — మీ personal digest preview (ఈ రోజు మీకు ఏమి పంపుతామో). Owner-guarded."""
    require_owner(request, tsap_id)
    me = _find_user(tsap_id)
    if not me:
        raise HTTPException(404, "మీ ప్రొఫైల్ దొరకలేదు")
    public_candidates = [u for u in DB_USERS if _is_approved_profile(u)]
    rec = digest_engine.build_personal_digest(
        me, public_candidates, DB_INTERESTS, DB_VIEWS, DB_SAVES,
        saved_searches=SAVED_SEARCHES, new_matches_fn=new_matches_for,
        consent_rows=consent_for(tsap_id), engaged_only=False)  # owner preview: always show
    return {"success": True, **rec}


# ============================================================================
#  VISITOR + LEAD CAPTURE  ("chusina vallu antha DB lo save")
# ============================================================================
@app.post("/api/track")
def api_track(payload: dict, request: Request):
    """Accept a small analytics beacon without trusting client-supplied IP/UA or returning visitor IDs."""
    p = payload or {}
    ua = request.headers.get("user-agent", "")
    ref = request.headers.get("referer", "")
    rec = track_visit(
        client_ip(request), ua, str(p.get("path", "/")), ref,
        str(p.get("utm", "")), "",
        extra={"screen": p.get("screen", ""), "lang": p.get("lang", ""),
               "seconds": p.get("seconds", "")},
    )
    return {"success": True, "channel": rec["channel"]}


@app.post("/api/leads/quick")
def api_lead_quick(payload: dict):
    """Save a callback request only after explicit, purpose-limited contact consent."""
    p = payload or {}
    if p.get("contact_consent") is not True:
        raise HTTPException(400, "Explicit consent to registration-assistance follow-up is required.")
    # 🛡️ validation: phone 10-digit, name sanitize (mundu "x" phone tho junk leads vachevi)
    _pname = clean(p.get("name", ""), 60, "lead_name")
    _pphone = req_phone(p.get("phone", ""), "phone")
    ok, kind, lead = save_lead(_pname, _pphone,
                               gender=str(p.get("gender", "")), district=str(p.get("district", "")),
                               caste=str(p.get("caste", "")), age=str(p.get("age", "")),
                               source=str(p.get("source", "quick_form")), notes=str(p.get("notes", "")),
                               contact_consent=True)
    if not ok:
        raise HTTPException(400, kind)
    cfg = publish_config()
    queued = {"queued": False}
    if cfg["wa_mode"] != "off" and kind == "new_lead" and lead.get("contact_consent") is True:
        queued = enqueue_whatsapp([lead["phone"]], lead_followup_text(lead), priority=0, kind="lead_followup")
        if queued.get("queued"):
            lead["followup"] = "whatsapp_queued"
            lead["followup_queued_at"] = datetime.utcnow().isoformat()
    return {"success": True, "lead_id": lead["id"], "kind": kind, "lead_status": lead.get("status"),
            "followup_queued": bool(queued.get("queued")), "wa_mode": cfg["wa_mode"],
            "message_en": "Your request is recorded. A registration-assistance follow-up may be attempted using the contact method you approved; timing is not guaranteed. Your number is not shown publicly.",
            "message_telugu": "మీ అభ్యర్థన నమోదు అయింది. మీరు అంగీకరించిన contact method ద్వారా registration సహాయం కోసం ప్రయత్నించవచ్చు; సమయం హామీ కాదు. మీ number public లో చూపించము."}


@app.get("/api/leads")
def api_leads(status: str = "", limit: int = 100, request: Request = None):
    """Admin — leads list (follow-up కి). Deploy లో ADMIN_TOKEN env తో protect చెయ్యాలి."""
    require_admin(request)   # 🛡️ WAVE 9: admin key lekunda 403 (PII/money/)
    return leads_list(status, limit)


@app.get("/api/leads/stats")
def api_lead_stats(request: Request = None):
    """Traffic + conversion dashboard: visits, channels, top pages, lead sources, inventory."""
    require_admin(request)   # 🛡️ WAVE 9: admin key lekunda 403 (PII/money/)
    st = lead_stats()
    st["inventory"] = inventory_status(len(DB_USERS))
    st["whatsapp"] = wa_queue_stats()
    # 🐞 FIX: mundu ee endpoint lo user/lead phone numbers (10-digit) public ga vachedi → mask
    if not is_admin(request):
        st = mask_pii(st)
        st["pii_masked"] = True
    return st


@app.post("/api/leads/followup/{lead_id}")
def api_lead_followup(lead_id: str, request: Request = None):
    """Queue one registration-assistance message only when this lead explicitly opted in."""
    require_admin(request)   # 🛡️ WAVE 9: admin key lekunda 403 (PII/money/)
    lead = next((l for l in growth.DB_LEADS if l["id"] == lead_id), None)
    if not lead:
        raise HTTPException(404, "Lead dorakaledu")
    if lead.get("contact_consent") is not True:
        raise HTTPException(409, "Lead did not consent to contact; do not send a follow-up.")
    if lead.get("followup_queued_at"):
        raise HTTPException(409, "A follow-up is already queued for this request.")
    cfg = publish_config()
    if cfg["wa_mode"] == "off":
        raise HTTPException(503, "WhatsApp follow-up is not configured.")
    res = enqueue_whatsapp([lead["phone"]], lead_followup_text(lead), priority=0, kind="lead_followup")
    if not res.get("queued"):
        return {"success": False, "lead_id": lead["id"], "whatsapp": res, "wa_mode": cfg["wa_mode"],
                "message_en": "Follow-up was not queued. No message delivery is confirmed.",
                "message_telugu": "Follow-up queue కాలేదు; message చేరినట్లు నిర్ధారణ లేదు."}
    lead["status"] = "contacted"
    lead["followup"] = "whatsapp_queued"
    lead["followup_queued_at"] = datetime.utcnow().isoformat()
    lead["touches"] = int(lead.get("touches", 1)) + 1
    lead["contacted_at"] = datetime.utcnow().isoformat()
    return {"success": True, "lead_id": lead["id"], "whatsapp": res, "wa_mode": cfg["wa_mode"],
            "message_en": "One opt-in registration-assistance message was queued; delivery is not confirmed.",
            "message_telugu": "మీ opt-in ప్రకారం ఒక registration-assistance message queue అయింది; delivery నిర్ధారణ లేదు."}


# ============================================================================
#  SHARE KIT — member-directed share text; no reach guarantee
# ============================================================================
@app.get("/api/share/kit/{tsap_id}")
def api_share_kit(tsap_id: str, request: Request = None):
    u = _find_user(tsap_id) or _find_user(tsap_id.upper())
    if not u or u.get("is_banned") or _is_synthetic_profile(u):
        raise HTTPException(404, "Profile dorakaledu")
    require_owner(request, str(u.get("tsap_id") or ""))
    return share_kit(u, u["tsap_id"], hashtags=u.get("post_hashtags"))


@app.get("/api/inventory")
def api_inventory():
    """Aggregate current member records; hidden/deactivated accounts are excluded."""
    hidden_statuses = {"deleted", "married_fixed", "banned", "inactive", "hidden", "rejected"}
    members = [u for u in DB_USERS if isinstance(u, dict) and not _is_synthetic_profile(u)
               and not u.get("is_banned")
               and str(u.get("status", "")).strip().lower() not in hidden_statuses
               and (u.get("is_active") is None or str(u.get("is_active")).strip().lower() in {"1", "true", "yes", "on", "active", "approved"})]
    approved = [u for u in members if _is_approved_profile(u)]
    pending = [u for u in members if not _is_approved_profile(u)
               and (u.get("is_approved") is False or str(u.get("status", "")).strip().lower() == "pending")]
    return {
        "success": True,
        **inventory_status(len(members)),
        "approved_profiles": len(approved),
        "pending_profiles": len(pending),
        "brides": len([u for u in approved if u.get("gender") == "Bride"]),
        "grooms": len([u for u in approved if u.get("gender") == "Groom"]),
        "castes_covered": len({str(u.get("caste", "")).strip() for u in approved if str(u.get("caste", "")).strip()}),
        "districts_covered": len({canonicalize_district(str(u.get("state", "")), str(u.get("district", ""))) for u in approved if str(u.get("district", "")).strip()}),
        "recorded_checks": len([u for u in approved if safety.has_verification_evidence(u)]),
        "photos": len([u for u in approved if u.get("photo_status") == "approved" and u.get("photo_url")
                        and not u.get("photo_private") and u.get("privacy_mode") != "private"]),
    }


# Synthetic profile imports and launch seeding were retired. Keep explicit tombstones
# so old deploy scripts fail clearly instead of loading fictional member records.
@app.post("/api/admin/bulk-profiles")
@app.post("/api/admin/seed-launch")
def retired_profile_seed_routes(request: Request = None):
    if request is not None:
        require_admin(request)
    raise HTTPException(410, "Synthetic profile imports are retired; register real members with consent")


# ============================================================================
#  LEGACY MATCH-SCORE ROUTE — factual profile comparisons only (no score)
# ============================================================================
@app.get("/api/match/score")
def api_match_score(a: str, b: str, request: Request = None):
    """Legacy URL returning factual profile comparisons only; no compatibility score/verdict."""
    a = str(a or "").strip().upper()
    b = str(b or "").strip().upper()
    require_owner(request, a)
    me, other = _find_user(a), _find_user(b)
    if not _is_approved_profile(me) or not _is_approved_profile(other):
        raise HTTPException(404, "రెండు active, approved TSAP profiles అవసరం")
    if safety.is_blocked(a, b, DB_BLOCKS):
        raise HTTPException(404, "Profile pair unavailable")
    res = topmatch.score_match_v2(me, other)
    res["viewer"] = a
    res["other"] = sanitize_public_payload({"tsap_id": other.get("tsap_id"), "full_name": other.get("full_name"),
                                           "verification": safety.verification_badge(other)})
    res["compatibility_score_calculated"] = False
    res["comparison_basis"] = "member_entered_profile_facts_and_explicit_preferences"
    return res


@app.post("/api/match/score")
def api_match_score_raw(payload: dict):
    """Legacy raw-dictionary preview; returns factual observations, never a score."""
    d = payload or {}
    a, b = d.get("a") or {}, d.get("b") or {}
    if not isinstance(a, dict) or not isinstance(b, dict) or not a or not b:
        raise HTTPException(400, "a + b (profile dicts) కావాలి")
    result = topmatch.score_match_v2(a, b)
    result["compatibility_score_calculated"] = False
    result["comparison_basis"] = "member_entered_profile_facts_and_explicit_preferences"
    return result


@app.get("/api/top-matches/{tsap_id}")
def api_top_matches(tsap_id: str, limit: int = 10, min_score: int = 65, include_same_gothram: int = 0,
                      include_same_surname: int = 0, include_age_block: int = 0, nri_only: int = 0,
                      request: Request = None):
    """Return owner-only approved candidates; active paid placement then recency, not compatibility."""
    require_owner(request, tsap_id)  # 🌊 WAVE 23 — naa match ranking naake (privacy)
    me = _find_user(tsap_id)
    if not _is_approved_profile(me):
        raise _approved_profile_404()
    pool = [u for u in DB_USERS if _is_approved_profile(u)
            and not safety.is_blocked(tsap_id, u.get("tsap_id", ""), DB_BLOCKS)
            and str(u.get("tsap_id", "")) != str(me.get("tsap_id", ""))]
    # Legacy exclusion flags remain accepted for old clients but never decide eligibility.
    if nri_only:
        pool = [c for c in pool if _is_nri(c)]
    rows = topmatch.find_top_matches_v2(me, pool, limit=limit, min_score=min_score)
    # Paid promotion is kept separate from profile observations.
    rows.sort(key=lambda r: A11.boost_rank_key(r.get("profile", {})), reverse=True)
    out = []
    for r in rows:
        prof = r.pop("profile")
        r["tsap_id"] = prof.get("tsap_id")
        r["full_name"] = prof.get("full_name")
        r["age"] = prof.get("age")
        r["caste"] = prof.get("caste")
        r["district"] = prof.get("district")
        r["state"] = prof.get("state")
        r["education"] = prof.get("education")
        r["job"] = prof.get("job")
        r["star"] = prof.get("star")
        r["verification"] = safety.verification_badge(prof)["level"]
        r["boosted"] = A11.is_boosted(prof)
        r["voice_url"] = prof.get("voice_url", "")
        r["has_voice"] = bool(prof.get("voice_url"))
        r["children"] = "" if is_never_married_status(prof.get("marital_status")) else prof.get("children", "")
        r["is_nri"] = _is_nri(prof)
        r["profession_label"] = _prof_label(prof)
        out.append(sanitize_public_payload(r))
    return {"tsap_id": tsap_id, "count": len(out),
            "nri_only": bool(nri_only), "ranking_basis": "active_paid_boost_then_recency",
            "compatibility_score_calculated": False, "min_score_ignored": True,
            "legacy_exclusion_flags_ignored": True,
            "results": out,
            "message_telugu": f"{len(out)} approved profiles — active paid boost placement, then recency; name/gothram/age-based eligibility and compatibility scores are not inferred."}


# ============================================================================
#  🧠 SMART MATCH ASSISTANT — personalized daily briefing + actionable tips
#  (matchbot.py: factual profile observations + completeness nudge + activity counts)
# ============================================================================
@app.get("/api/assistant/briefing/{tsap_id}")
def api_assistant_briefing(tsap_id: str, limit: int = 3, request: Request = None):
    """🧠 "ఈ రోజు మీ కోసం" — per-user smart digest: top NEW/mutual matches
    (explainable why), who noticed you (interests received + views), profile
    nudge. Owner-guarded (IDOR). Output privacy-safe (safe_user — no raw phone)."""
    require_owner(request, tsap_id)
    me = _find_user(tsap_id)
    if not me:
        raise HTTPException(404, "మీ ప్రొఫైల్ దొరకలేదు")
    lim = clamp_int(limit, "limit", 1, 6, 3)
    # Candidate details are member-facing: only current active, approved, real profiles enter.
    pool = [u for u in DB_USERS if _is_approved_profile(u)
            and not safety.is_blocked(tsap_id, u.get("tsap_id", ""), DB_BLOCKS)]
    brief = matchbot.daily_briefing(me, pool, DB_INTERESTS, DB_VIEWS, DB_SAVES,
                                    blocks=DB_BLOCKS, limit=lim)
    brief["tips"] = matchbot.assistant_tips(me, brief)
    return brief


@app.get("/api/assistant/tips/{tsap_id}")
def api_assistant_tips(tsap_id: str, request: Request = None):
    """🧠 Actionable next-steps only (profile complete / photo / respond / verify)."""
    require_owner(request, tsap_id)
    me = _find_user(tsap_id)
    if not me:
        raise HTTPException(404, "మీ ప్రొఫైల్ దొరకలేదు")
    pool = [u for u in DB_USERS if _is_approved_profile(u)
            and not safety.is_blocked(tsap_id, u.get("tsap_id", ""), DB_BLOCKS)]
    brief = matchbot.daily_briefing(me, pool, DB_INTERESTS, DB_VIEWS, DB_SAVES,
                                    blocks=DB_BLOCKS, limit=3)
    return {"success": True, "tsap_id": tsap_id.upper(),
            "tips": matchbot.assistant_tips(me, brief),
            "summary_telugu": brief.get("summary_telugu", "")}


# ============================================================================
#  TRUST & SAFETY — report / block / verify / moderation
# ============================================================================
@app.get("/api/safety/tips")
def api_safety_tips():
    return {"tips": safety.safety_tips(),
            "verify_levels": [{"level": k, "telugu": v, "english": safety.VERIFY_ENGLISH[k]} for k, v in safety.VERIFY_TELUGU.items()],
            "report_categories": [{"key": k, **v} for k, v in safety.REPORT_CATEGORIES.items()],
            "message_telugu": "Safety first: advance money వద్దు, public లో kalthi, video call తో verify 🙏"}


@app.post("/api/report")
def api_report(payload: dict, request: Request = None):
    d = payload or {}
    require_owner(request, str(d.get("reporter_id", "")))   # 🛡️ IDOR: report mee peru tarvupuna
    _reporter = clean(d.get("reporter_id"), 30, "reporter_id")
    _target = clean(d.get("target_id"), 30, "target_id")
    if _reporter and _target and _reporter == _target:
        validation_error("target_id", "⚠️ మీ profile ని మీరు report cheyyakkarledu")
    _detail = clean(d.get("detail", ""), 500, "detail", allow_newlines=True)
    _cat = clean(d.get("category", ""), 40, "category")
    dup = next((r for r in DB_REPORTS if r.get("reporter_id") == _reporter and r.get("target_id") == _target
                and str(r.get("category", "")) == _cat and r.get("status", "open") == "open"), None)
    if dup:
        return {"success": True, "kind": "already_reported", "report": dup,
                "message_telugu": "ℹ️ ఈ profile‌ను మీరు ముందు report చేశారు — review కొనసాగుతుంది; చర్య సమయం మారవచ్చు."}
    ok, kind, rec = safety.submit_report(_reporter, _target, _cat, _detail,
                                         reports=DB_REPORTS, users=DB_USERS)
    if not ok:
        raise HTTPException(400, kind)
    return {"success": True, "kind": kind, "report": rec,
            "auto_hidden": bool(rec.get("auto_flagged")),
            "ack_telugu": safety.report_ack_text(),
            "stats": safety.report_stats(DB_REPORTS)}


@app.get("/api/moderation/queue")
def api_moderation_queue(limit: int = 50, request: Request = None):
    require_admin(request)   # 🛡️ WAVE 9: admin key lekunda 403 (PII/money/)
    return safety.moderation_queue(DB_REPORTS, DB_USERS, limit)


@app.post("/api/moderation/resolve/{report_id}")
def api_moderation_resolve(report_id: str, payload: dict = None, request: Request = None):
    require_admin(request)   # 🛡️ WAVE 9: admin key lekunda 403 (PII/money/)
    d = payload or {}
    ok, msg, rec = safety.resolve_report(report_id, str(d.get("action", "")), str(d.get("note", "")),
                                         reports=DB_REPORTS, users=DB_USERS)
    if not ok:
        raise HTTPException(400, msg)
    return {"success": True, "action": msg, "report": rec, "queue": safety.report_stats(DB_REPORTS)}


@app.post("/api/block")
def api_block(payload: dict, request: Request = None):
    """🚫 Block — safety first (blocked వల్ల profile/interest రెండు vaipula hide అవుతాయి)."""
    d = payload or {}
    me = clean(d.get("tsap_id") or d.get("owner"), 30, "tsap_id")
    you = clean(d.get("block_id") or d.get("blocked") or d.get("target_id"), 30, "block_id")
    require_owner(request, me)                     # 🛡️ WAVE 9: IDOR fix
    if not me or not you:
        validation_error("block_id", "⚠️ tsap_id + block_id (leda owner + blocked) పంపండి")
    if me == you:
        validation_error("block_id", "⚠️ మీరే మీకు block ఎందుకు 🙂")
    if not _find_user(me) or not _find_user(you):
        raise HTTPException(404, "Profile దొరకలేదు — TSAP ID check చెయ్యండి")
    _already = next((b for b in DB_BLOCKS
                     if (b.get("tsap_id") or b.get("owner")) == me
                     and (b.get("block_id") or b.get("blocked")) == you), None)
    if _already:
        return {"success": True, "already_blocked": True, "block": _already,
                "total_blocks": len(safety.block_list(me, DB_BLOCKS)),
                "message_telugu": "🚫 ఈ profile ముందు nunche block లో ఉంది"}
    ok, kind, rec = safety.block_user(me, you, clean(d.get("reason", ""), 120, "reason"), DB_BLOCKS)
    if not ok:
        raise HTTPException(400, kind)
    rec.setdefault("block_id", you)                 # safety module 'blocked' key vadachu — rendu unchey
    return {"success": True, "kind": kind, "block": rec,
            "total_blocks": len(safety.block_list(me, DB_BLOCKS)),
            "message_telugu": "🚫 Block చేశారు — వాళ్లు మీ profile chudalenu, interest కూడా pampalenru"}


@app.post("/api/unblock")
def api_unblock(payload: dict, request: Request = None):
    d = payload or {}
    me = clean(d.get("tsap_id") or d.get("owner"), 30, "tsap_id")
    you = clean(d.get("block_id") or d.get("blocked") or d.get("target_id"), 30, "block_id")  # WAVE 29: target_id alias (block tho consistency, silent no-op ban)
    require_owner(request, me)                     # 🛡️ WAVE 9: IDOR fix
    ok, msg = safety.unblock_user(me, you, DB_BLOCKS)
    return {"success": ok, "kind": msg, "total_blocks": len(safety.block_list(me, DB_BLOCKS)),
            "message_telugu": "✅ Unblock అయ్యింది — ఇప్పుడు interest కూడా పంపొచ్చు" if ok else "ఈ user block list లో లేదు"}


@app.get("/api/blocks/{tsap_id}")
def api_blocks(tsap_id: str, request: Request = None):
    require_owner(request, tsap_id)   # 🛡️ WAVE 9: IDOR fix — own data matrame
    rows = safety.block_list(tsap_id, DB_BLOCKS)
    return {"tsap_id": tsap_id, "count": len(rows), "items": rows}


@app.post("/api/verify/request")
def api_verify_request(payload: dict):
    """Phone / Photo / ID verification level penchadam (photo/ID కి admin approve కావాలి — dev లో auto)."""
    d = payload or {}
    u = _find_user(str(d.get("tsap_id", "")))
    if not u:
        raise HTTPException(404, "Profile dorakaledu")
    kind = str(d.get("kind", "")).lower()
    ok, msg, _ = safety.set_verification(u, kind)
    if not ok:
        raise HTTPException(400, msg)
    badge = safety.verification_badge(u)
    return {"success": True, "kind": msg, "verification": badge,
            "message_telugu": "✅ %s — %s" % (badge["telugu"], badge["next_step_telugu"])}


@app.get("/api/verification/{tsap_id}")
def api_verification(tsap_id: str, request: Request = None):
    require_owner(request, tsap_id)   # 🛡️ WAVE 9: IDOR fix — own data matrame
    u = _find_user(tsap_id)
    if not u:
        raise HTTPException(404, "Profile dorakaledu")
    b = safety.verification_badge(u)
    return {"tsap_id": tsap_id, **b}


# ============================================================================
#  SOCIAL PREVIEW IMAGES (WhatsApp/Telegram link preview — reach booster)
# ============================================================================
@app.get("/api/og/profile/{tsap_id}.png")
def api_og_profile(tsap_id: str):
    u = _find_user(tsap_id)
    if not _is_approved_profile(u):
        raise HTTPException(404, "Active approved profile not found")
    path = preview.og_profile_png(u)
    if not path or not os.path.exists(path):
        raise HTTPException(500, "Preview generate avvaledu (Pillow/font check చెయ్యండి)")
    return FileResponse(path, media_type="image/png", headers={"Cache-Control": "public, max-age=0, must-revalidate"})


@app.get("/api/og/porutham/{bride}/{groom}.png")
def api_og_porutham(bride: str, groom: str):
    """Retired: do not create a shareable image from an incomplete chart."""
    raise HTTPException(410, "Porutham preview images are retired; upload a real Jathakam for review")


@app.get("/api/og/site.png")
def api_og_site(title: str = "మన వివాహ — Telugu Matrimony", subtitle: str = "Telugu community options • TS + AP"):
    path = preview.og_generic_png(title, subtitle, name="site")
    if not path or not os.path.exists(path):
        raise HTTPException(500, "Preview generate avvaledu")
    return FileResponse(path, media_type="image/png", headers={"Cache-Control": "public, max-age=3600"})



# ---------------------------------------------------------------------------
# 🏪 VENDOR ADS + PROMOTIONS — catering / photography / decorations / halls...
#    "Pelli sambandham related vaallaki promotions kooda cheyyali bestga"
# ---------------------------------------------------------------------------
# ============================================================================
# 🛡️ WAVE 9 — HARDENING / TRUST / ADVANCED ENDPOINTS
# ============================================================================
@app.get("/api/security/posture")
def security_posture_endpoint():
    """Public security posture (trust page కి): auth, headers, rate limit, numbers policy."""
    p = security_posture()
    p["numbers_policy_telugu"] = ("🔒 Public profile/search responses లో phone number చూపించము; accepted interest తర్వాత మాత్రమే "
                                  "restricted account flows లో contact access వస్తుంది. WhatsApp delivery హామీ లేదు.")
    p["data_practices_telugu"] = [
        "Public profile/search serializers contact fields ను omit లేదా mask చేస్తాయి; ఇది database/backups at-rest encryption హామీ కాదు.",
        "Consent log owner acceptance వల్ల contact access grant అయిన event ను నమోదు చేస్తుంది; WhatsApp delivery proof కాదు.",
        "Rate limits మరియు OTP checks abuse తగ్గించేందుకు controls మాత్రమే; అన్ని spam లేదా unwanted contact ను అడ్డుకుంటాయని హామీ లేదు.",
        "Admin routes role/key protected; production storage, backups మరియు access permissions ను operator వేరుగా secure చేయాలి.",
    ]
    return p


@app.get("/api/auth/verify")
def auth_verify(request: Request = None):
    """Token valid aa? Frontend login state కి (ఎవరికీ token undo cheptundi, PII లేదు)."""
    ident = token_from_request(request)
    if not ident:
        return JSONResponse(status_code=401, content={"success": False, "valid": False,
                                                      "message_telugu": "🔒 Token లేదు/expire — OTP login చెయ్యండి"})
    u = _find_user(ident["tsap_id"])
    return {"success": True, "valid": True, "tsap_id": ident["tsap_id"],
            "expires_in_hours": int((ident["exp"] - datetime.utcnow().timestamp()) // 3600),
            "user": safe_user(u) if u else None,
            "admin_key_ok": is_admin(request)}


@app.post("/api/auth/demo-token")
def retired_demo_token(payload: dict = Body(default={}), request: Request = None):
    """Demo tokens could impersonate members; this endpoint is retired."""
    raise HTTPException(410, "Demo sign-in is retired. Use phone OTP or password login.")


@app.post("/api/auth/logout-everywhere")
def auth_logout_everywhere(payload: dict, request: Request):
    """🔐 Phase 14 — user-initiated "log out of all devices": invalidates
    EVERY token issued to this account so far (phone lost/stolen, suspected
    account compromise, or just routine hygiene), not just the current
    session's cookie/localStorage. Requires the caller to already hold a
    currently-valid token for this exact account (require_owner) — this is
    a self-service action, not a way to log someone else out."""
    tsap_id = str((payload or {}).get("tsap_id") or "").strip().upper()
    if not tsap_id:
        raise HTTPException(400, "tsap_id ఇవ్వండి")
    u = _find_user(tsap_id)
    if not u:
        raise HTTPException(404, "Profile దొరకలేదు")
    require_owner(request, tsap_id)
    new_version = revoke_all_tokens(tsap_id)
    return {"success": True, "tsap_id": tsap_id, "token_version": new_version,
            "auth_token": sign_token(tsap_id),  # caller's own session keeps working
            "message_telugu": "🔐 అన్ని devices నుండి logout అయ్యారు — ఈ session మాత్రం active గా ఉంటుంది"}


@app.post("/api/admin/users/{tsap_id}/force-logout")
def admin_force_logout(tsap_id: str, request: Request):
    """🔐 Phase 14 — ADMIN: force-logout every session for a specific
    account (incident response for a reported/compromised profile) without
    needing the user's own credentials."""
    require_admin(request, staff_ok=True)
    u = _find_user(tsap_id)
    if not u:
        raise HTTPException(404, "Profile దొరకలేదు")
    new_version = revoke_all_tokens(tsap_id)
    return {"success": True, "tsap_id": tsap_id, "token_version": new_version,
            "message_telugu": f"🔐 {tsap_id} — అన్ని sessions force-logout అయ్యాయి"}


@app.get("/api/profile/{tsap_id}/quality")
def profile_quality(tsap_id: str):
    """Return profile-completeness guidance only; it is not an identity or match score."""
    u = _find_user(tsap_id)
    if not u:
        raise HTTPException(404, "Profile dorakaledu")
    comp = profile_completeness(u)
    return {"tsap_id": tsap_id, "completeness": comp,
            "grade_telugu": "Profile‌లో సభ్యుడు అందించిన fields మాత్రమే completeness‌లో లెక్కించబడతాయి; అవి స్వతంత్రంగా verify చేయబడవు.",
            "grade_en": "Completeness counts profile fields supplied by the member; it does not independently verify them.",
            "photo_tip_telugu": "📸 స్పష్టమైన ఫోటో profile‌ను గుర్తించడంలో సహాయపడవచ్చు; visibility మీ privacy settings‌పై ఆధారపడి ఉంటుంది. ఫలితాలు మారవచ్చు.",
            "photo_tip_en": "📸 A clear photo may help identify the profile. Visibility depends on your privacy settings; results may vary."}


@app.get("/api/facets")
def search_facets_endpoint(gender: Optional[str] = None, limit: int = 12):
    """🔎 Search UI chips కి counts (caste/district/education/job) — advanced filter UX."""
    limit = clamp_int(limit, "limit", 1, 30, 12)
    items = [u for u in DB_USERS if _is_approved_profile(u)]
    if gender:
        items = [u for u in items if str(u.get("gender", "")).lower() == clean(gender, 10).lower()]
    return {"total": len(items), "facets": search_facets(items, limit),
            "note_telugu": "ఈ counts ఇప్పుడు ఉన్న profiles batti — filter click చేసి చూడండి"}


@app.get("/api/templates/interest")
def interest_template_list():
    """💬 Ready-made Telugu interest messages (spam తక్కువ, response ఎక్కువ)."""
    return {"templates": quality_templates(),
            "tip_telugu": "సందేశాన్ని సంక్షిప్తంగా, గౌరవంగా మీ మాటల్లో రాయండి; పునరావృత సందేశాలు spam‌గా పరిగణించబడవచ్చు. Reply వస్తుందనే హామీ లేదు.",
            "rule_telugu": "Copy చేసి మీ style లో edit cheskovachu — numbers ee stage లో ఇవ్వము (consent తో తర్వాత)"}


@app.post("/api/saved-searches")
def saved_search_create(payload: dict = Body(default={}), request: Request = None):
    """Save owner-private search criteria; notifications require explicit opt-in."""
    d = payload or {}
    tsap_id = clean(d.get("tsap_id"), 30, "tsap_id")
    require_owner(request, tsap_id)
    if not _find_user(tsap_id):
        raise HTTPException(404, "Mee profile dorakaledu")
    alert_enabled = req_bool(d.get("alert", False))
    if alert_enabled and not req_bool(d.get("alert_consent_confirmed", False)):
        validation_error("alert_consent_confirmed", "⚠️ WhatsApp alerts కోసం స్పష్టమైన సమ్మతి అవసరం")
    try:
        rec = save_search(tsap_id, d.get("name", ""), d.get("filters") or {}, alert=alert_enabled)
    except RuntimeError as exc:
        if str(exc).startswith("persistence_failed"):
            raise HTTPException(503, "Saved search could not be saved safely. Please try again.")
        raise
    message_telugu = ("🔔 Search save అయ్యింది — మీరు alerts‌కు సమ్మతి ఇచ్చారు"
                      if alert_enabled else "🔒 Search మీ ఖాతాలో మాత్రమే save అయ్యింది; notifications ఆఫ్‌లో ఉన్నాయి")
    message_en = ("Search saved. Alerts were explicitly enabled."
                  if alert_enabled else "Search saved privately to your account; notifications are off.")
    return {"success": True, "search": rec, "total": len(saved_for(tsap_id)),
            "message_telugu": message_telugu, "message_en": message_en,
            "alert_enabled": alert_enabled}


def _saved_search_candidates(owner_id: str):
    """Mirror public search visibility for previews and alerts; never expose pending or blocked members."""
    return [u for u in DB_USERS if _is_approved_profile(u)
            and not safety.is_blocked(owner_id, str(u.get("tsap_id") or ""), DB_BLOCKS)]


@app.get("/api/saved-searches/{tsap_id}")
def saved_search_list(tsap_id: str, request: Request = None):
    require_owner(request, tsap_id)
    rows = saved_for(tsap_id)
    candidates = _saved_search_candidates(tsap_id)
    out = []
    for r in rows:
        fresh = new_matches_for(r, candidates, exclude=[tsap_id], limit=5)
        out.append({**r, "new_matches": len(fresh), "sample": [safe_user(x) for x in fresh[:3]]})
    return {"tsap_id": tsap_id, "count": len(out), "searches": out}


@app.put("/api/saved-searches/{tsap_id}/{search_id}")
def saved_search_update(tsap_id: str, search_id: str, payload: dict = Body(default={}), request: Request = None):
    require_owner(request, tsap_id)
    d = payload or {}
    if "alert" not in d:
        validation_error("alert", "⚠️ Alert setting ఇవ్వండి")
    alert_enabled = req_bool(d.get("alert"))
    if alert_enabled and not req_bool(d.get("alert_consent_confirmed", False)):
        validation_error("alert_consent_confirmed", "⚠️ WhatsApp alerts కోసం స్పష్టమైన సమ్మతి అవసరం")
    try:
        rec = set_search_alert(tsap_id, search_id, alert_enabled)
    except RuntimeError as exc:
        if str(exc).startswith("persistence_failed"):
            raise HTTPException(503, "Saved-search alert setting could not be saved safely. Please try again.")
        raise
    if not rec:
        raise HTTPException(404, "Ee search dorakaledu")
    enabled = bool(rec.get("alert"))
    return {"success": True, "search_id": search_id, "alert_enabled": enabled,
            "message_telugu": ("🔔 ఈ search‌కు alerts ఆన్ చేశారు" if enabled else "🔒 ఈ search‌కు notifications ఆఫ్ చేశారు"),
            "message_en": ("Alerts are enabled for this search." if enabled else "Notifications are off for this search.")}


@app.delete("/api/saved-searches/{tsap_id}/{search_id}")
def saved_search_delete(tsap_id: str, search_id: str, request: Request = None):
    require_owner(request, tsap_id)
    try:
        ok = delete_search(tsap_id, search_id)
    except RuntimeError as exc:
        if str(exc).startswith("persistence_failed"):
            raise HTTPException(503, "Saved search could not be deleted safely. Please try again.")
        raise
    if not ok:
        raise HTTPException(404, "Ee search dorakaledu")
    return {"success": True, "message_telugu": "🗑️ Search delete అయ్యింది", "message_en": "Saved search deleted."}


@app.post("/api/saved-searches/{tsap_id}/alerts")
def saved_search_alerts(tsap_id: str, request: Request = None):
    """కొత్త matches ని WhatsApp కి pampu (anti-ban gap తో) — 'saved search alert'."""
    require_owner(request, tsap_id)
    u = _find_user(tsap_id)
    if not u:
        raise HTTPException(404, "Mee profile dorakaledu")
    total = 0
    skipped = 0
    details = []
    candidates = _saved_search_candidates(tsap_id)
    wa_mode = publish_config()["wa_mode"]
    for r in saved_for(tsap_id):
        alert_enabled = r.get("alert") in (True, 1, "1", "true", "yes", "on")
        if not alert_enabled or not str(r.get("alert_consent_at") or "").strip():
            skipped += 1
            continue
        fresh = new_matches_for(r, candidates, exclude=[tsap_id], limit=5)
        if not fresh:
            continue
        total += len(fresh)
        names = ", ".join(x.get("full_name", x.get("tsap_id", "")) for x in fresh[:3])
        txt = (f"🔔 {r['name']} — మీ saved search కి {len(fresh)} కొత్త profiles dorikayi!\n{names}\n"
               f"Chudataniki: manavivaha.in/matches?search={r['search_id']}")
        q = {"queued": False}
        if wa_mode != "off":
            q = enqueue_whatsapp([u.get("phone", "")], txt, priority=1, kind="saved_search_alert")
        if q.get("queued"):
            try:
                mark_alerted(r, [x["tsap_id"] for x in fresh])
            except RuntimeError as exc:
                if str(exc).startswith("persistence_failed"):
                    raise HTTPException(503, "Saved-search alert state could not be saved safely. Please try again.")
                raise
        details.append({"search_id": r["search_id"], "new_matches": len(fresh), "queued": bool(q.get("queued")),
                        "text": txt})
    alerts_queued = sum(1 for item in details if item.get("queued"))
    if alerts_queued:
        message_telugu = f"🔔 {alerts_queued} saved search alerts WhatsApp queue లో పెట్టాం"
        message_en = f"{alerts_queued} saved-search alert(s) queued for WhatsApp."
    elif total and wa_mode == "off":
        message_telugu = "ℹ️ కొత్త matches ఉన్నాయి, కానీ WhatsApp ప్రస్తుతం ఆఫ్‌లో ఉంది — queue చేయలేదు"
        message_en = "New matches are available, but WhatsApp is off; no alerts were queued."
    elif skipped:
        message_telugu = "🔒 Alerts ఆఫ్‌లో ఉన్నాయి లేదా స్పష్టమైన సమ్మతి లేదు; ఏ notification పంపలేదు"
        message_en = "Alerts are off or explicit consent is missing; no notifications were sent."
    else:
        message_telugu = "ℹ️ ఇప్పుడు కొత్త matches లేవు — filters మార్చి మళ్లీ చూడండి"
        message_en = "There are no new saved-search matches right now."
    return {"success": True, "alerts_sent": alerts_queued, "alerts_queued": alerts_queued,
            "alerts_skipped": skipped, "new_matches_total": total, "details": details,
            "message_telugu": message_telugu, "message_en": message_en}


@app.get("/api/consent/log/{tsap_id}")
def consent_log_endpoint(tsap_id: str, request: Request = None):
    """
    Owner-only record of contact-access grants/declines; this does not prove WhatsApp delivery.
    """
    require_owner(request, tsap_id)
    rows = consent_for(tsap_id)
    safe_rows = [{"at": r.get("at"), "action": r.get("action"),
                  "with": mask_phone(str(r.get("other_id", ""))[-10:]) if str(r.get("other_id", "")).isdigit() else r.get("other_id"),
                  "request_id": r.get("request_id"),
                  "contact_access_granted": bool(r.get("contact_access_granted", r.get("numbers_exchanged", False)))}
                 for r in rows]
    return {"tsap_id": tsap_id, "count": len(safe_rows), "consents": safe_rows,
            "policy_telugu": "ఈ operational ledger owner acceptance వల్ల contact access ఇచ్చిన/నిరాకరించిన events మాత్రమే చూపిస్తుంది; WhatsApp delivery proof కాదు. గరిష్ఠంగా తాజా 5,000 events నిల్వ ఉంటాయి; age-based auto-purge అమలు కాలేదు.",
            "your_rights_telugu": ["Stored-data access/correction/erasure request కోసం /privacy లోని contact ను సంప్రదించండి; request స్వయంగా instant erasure కాదు",
                                   "Block చేసిన profiles కు మీ data కనిపించదు; ఇది stored records erase చేయదు",
                                   "Contact details public profile/search లో ఉండవు; accepted request తర్వాత account flows లో కనిపించవచ్చు"]}


@app.get("/api/admin/abuse")
def admin_abuse(request: Request = None):
    """🚨 Abuse dashboard — rate limits, OTP locks, webhook attacks, validation errors."""
    require_admin(request)
    snap = abuse_snapshot()
    snap["otp_active"] = len(DB_OTPS)
    snap["verified_phones"] = len(VERIFIED_PHONES)
    snap["duplicate_phone_accounts"] = len([u for u in DB_USERS if u.get("duplicate_phone")])
    snap["consent_events"] = len(CONSENT_LEDGER)
    snap["message_telugu"] = "🚨 ఈ numbers periguthunte attack/spam — rate limit tight చెయ్యండి (TSAP_RATE_LIMIT)"
    return snap


@app.get("/api/trust/board")
def trust_board():
    """Retired: synthetic trust leaderboards overstated what profile checks establish."""
    raise HTTPException(410, "This trust leaderboard has been retired. Verification checks are listed individually.")


@app.get("/api/vendors/categories")
def vendor_categories():
    """18 vendor categories (Telugu names తో) + active counts."""
    return {"success": True, "count": len(VENDOR_CATEGORIES), "categories": VENDOR_CATEGORIES,
            "headline": "పెళ్లి సంబంధం related అన్నీ services — ఒకటే chota"}


@app.get("/api/vendors/stats")
def vendor_stats_api():
    return {"success": True, **vendor_stats()}


@app.get("/api/vendors/packages")
def vendor_packages():
    """🏷️ Share kits, directory listings and placements with separate terms, plus add-ons/slots."""
    return {"success": True, **vendor_packages_public()}


@app.get("/api/vendors/ads")
def vendor_ads(slot: str = "home_top_banner", limit: int = 2, track: bool = True):
    """📢 Ad rotation (paid-first weighted). Site home/strips లో vaadutunnam."""
    result = ad_rotation(slot, limit=min(max(limit, 1), 6), track=track)
    if not result.get("ok", True):
        raise HTTPException(503, result.get("message_telugu", "Ad metrics could not be saved safely."))
    return {"success": True, **result}


@app.get("/api/vendors")
def vendor_list(category: str = "", district: str = "", city: str = "", q: str = "",
                limit: int = 60, include_inactive: bool = False):
    """🏪 Vendor directory — category/district/city/search filters (paid-first order)."""
    # WAVE 25: public = active-approved ONLY (pending/spam numbers leak avvakudadu)
    return {"success": True, **vendors_directory(category=category, district=district, city=city,
                                                 q=q, limit=min(max(limit, 1), 200),
                                                 include_inactive=False)}


@app.post("/api/vendors/register")
def vendor_register(payload: Dict[str, Any] = Body(default={})):
    """
    🏪 Vendor signup (catering/photography/decoration/hall...) → pending → admin approve.
    Body: {business_name, category, phone, city, district, state, package, about, price_range...}
    """
    res = register_vendor(payload or {})
    if res.get("ok"):
        # 🔐 WAVE 9 — vendor dashboard token (X-Vendor-Token) — own data matrame chudochu
        # 🐞 FIX: register_vendor() "vendor_id" ni **top-level** lo isthundi (res["vendor"] lo కాదు)
        _vid = (res.get("vendor_id") or (res.get("vendor") or {}).get("vendor_id")
                or (res.get("vendor") or {}).get("id") or "")
        if _vid:
            res["vendor_token"] = vendor_token(_vid)
            res.setdefault("note_telugu", "🔐 ఈ vendor_token save చెయ్యండి — మీ dashboard (impressions/clicks/leads) కి కావాలి")
    if not res.get("ok"):
        return JSONResponse(status_code=400, content={"success": False, **res})
    # Optional admin notification queue; enqueue is not a delivery confirmation.
    try:
        admin_no = os.getenv("ADMIN_WHATSAPP_NUMBER", "").strip()
        v = res["vendor"]
        _txt = ("🏪 *NEW VENDOR REQUEST*\n%s (%s)\n📍 %s, %s\n📞 %s\n💼 Package: %s = ₹%d\n"
                "Vendor ID: %s\n\nOwner operations portal లో receipt/bank record సరిపోల్చి review చేయండి. "
                "Owner session + CSRF అవసరం; payment/listing review identity verification కాదు." %
                (v["business_name"], v["category_te"], v["city"], v["district"],
                 v["phone"], res["package"]["name"], res["amount"], v["id"]))
        if admin_no and publish_config()["wa_mode"] != "off":
            _admin_queue = enqueue_whatsapp([admin_no], _txt, priority=0, kind="vendor_request")
            res["admin_notification_queued"] = bool(_admin_queue.get("queued"))
        else:
            res["admin_notification_queued"] = False
    except Exception as e:
        res["notify_error"] = str(e)[:100]
    return {"success": True, **res}


def _require_active_public_vendor(vendor_id: str) -> dict:
    """Resolve only a currently active, unexpired vendor listing for public routes."""
    import vendors as VND
    vendor = next((x for x in VND.VENDORS if x.get("id") == vendor_id), None)
    if not VND.is_active_listing(vendor):
        raise HTTPException(404, "Active vendor listing not found")
    return vendor


@app.get("/api/vendors/{vendor_id}")
def vendor_detail(vendor_id: str, track: bool = False):
    """Public detail for active vendor listings only."""
    v = _require_active_public_vendor(vendor_id)
    if track:
        result = track_vendor_click(vendor_id, source="detail")
        if not result.get("ok"):
            raise HTTPException(404, "Active vendor listing not found")
    same_cat = [x for x in __import__("vendors").VENDORS
                if x.get("category") == v.get("category") and vendor_is_active_listing(x) and x.get("id") != vendor_id][:4]
    return {"success": True, "vendor": public_vendor(v), "package": VENDOR_PACKAGES and
            {p["code"]: p for p in VENDOR_PACKAGES}.get(v.get("package"), {}),
            "similar": [public_vendor(x) for x in same_cat],
            "review_note_telugu": "ఈ directory customer-review/rating certification కాదు. Booking ముందు vendor వివరాలు, ధర, లభ్యతను నేరుగా నిర్ధారించండి."}


@app.get("/api/vendors/{vendor_id}/dashboard")
def vendor_dash(vendor_id: str, request: Request = None):
    """📊 Vendor performance: impressions, clicks, enquiries, days left, upsell."""
    require_vendor(request, vendor_id)   # 🛡️ WAVE 9: vendor token lekunda 401 (vendor data leak fix)
    d = vendor_dashboard(vendor_id)
    if not d.get("ok"):
        raise HTTPException(404, "Vendor dorakaledi")
    return {"success": True, **d}


@app.get("/api/vendors/{vendor_id}/kit")
def vendor_share_kit(vendor_id: str, variant: int = 0, request: Request = None):
    """Owner-only share-kit materials; a promo-kit purchase is not a public listing."""
    require_vendor(request, vendor_id)
    import vendors as VND
    vendor = next((x for x in VND.VENDORS if x.get("id") == vendor_id), None)
    if not vendor or str(vendor.get("package", "")).upper() not in VENDOR_SHARE_KIT_CODES:
        raise HTTPException(404, "Share kit not found")
    if vendor.get("status") != "kit_ready":
        raise HTTPException(409, "Share kit is not ready; payment-reference review may still be pending")
    if not VND.is_ready_share_kit(vendor):
        raise HTTPException(410, "Private share-kit access has expired")
    result = promo_post(vendor, variant=variant)
    result.update({
        "success": True,
        "kit_ready": True,
        "package": VND.PACKAGE_MAP.get(vendor.get("package"), {}),
        "vendor": public_vendor(vendor),
        "expires_at": vendor.get("expires_at", ""),
        "poster_square": "/api/vendors/%s/kit/poster.png?style=square" % vendor_id,
        "poster_status": "/api/vendors/%s/kit/poster.png?style=status" % vendor_id,
    })
    return result


@app.get("/api/vendors/{vendor_id}/kit/poster.png")
def vendor_share_kit_poster(vendor_id: str, style: str = "square", request: Request = None):
    """Owner-only PNG generation for an approved share-kit package."""
    require_vendor(request, vendor_id)
    import vendors as VND
    vendor = next((x for x in VND.VENDORS if x.get("id") == vendor_id), None)
    if (not vendor or str(vendor.get("package", "")).upper() not in VENDOR_SHARE_KIT_CODES
            or vendor.get("status") != "kit_ready"):
        raise HTTPException(404, "Ready share kit not found")
    if not VND.is_ready_share_kit(vendor):
        raise HTTPException(410, "Private share-kit access has expired")
    try:
        import vendor_kit
        path = vendor_kit.vendor_poster(vendor, style=("status" if style == "status" else "square"))
        return FileResponse(path, media_type="image/png",
                            filename="manavivaha-share-kit-%s-%s.png" % (vendor_id, style))
    except Exception as e:
        raise HTTPException(500, "Poster generate avvaledu: %s" % str(e)[:120])


@app.get("/api/vendors/{vendor_id}/promo")
def vendor_promo(vendor_id: str, variant: int = 0):
    """📝 Telugu promo post (Telegram + WhatsApp ready) + poster text."""
    v = _require_active_public_vendor(vendor_id)
    return {"success": True, **promo_post(v, variant=variant),
            "poster_square": "/api/vendors/%s/poster.png?style=square" % vendor_id,
            "poster_status": "/api/vendors/%s/poster.png?style=status" % vendor_id}


@app.get("/api/vendors/{vendor_id}/poster.png")
def vendor_poster_png(vendor_id: str, style: str = "square"):
    """🖼️ Vendor promo poster (QR తో) — square / status."""
    v = _require_active_public_vendor(vendor_id)
    try:
        import vendor_kit
        path = vendor_kit.vendor_poster(v, style=("status" if style == "status" else "square"))
        return FileResponse(path, media_type="image/png",
                            filename="manavivaha-vendor-%s-%s.png" % (v.get("id"), style))
    except Exception as e:
        raise HTTPException(500, "Poster generate avvaledu: %s" % str(e)[:120])


@app.post("/api/vendors/{vendor_id}/lead")
def vendor_lead_api(vendor_id: str, payload: Dict[str, Any] = Body(default={})):
    """Store an enquiry; WhatsApp notifications are queued only when explicitly configured."""
    res = vendor_lead(vendor_id, payload or {})
    if not res.get("ok"):
        if res.get("reason") == "persistence_failed":
            return JSONResponse(status_code=503, content={"success": False, **res})
        status_code = 404 if res.get("reason") in {"not_found", "not_active"} else 400
        return JSONResponse(status_code=status_code, content={"success": False, **res})
    try:
        v = res["vendor"]
        _to_vendor = res["vendor_whatsapp_text"]
        _phone = "".join(ch for ch in str(v.get("whatsapp_link", "")) if ch.isdigit())[2:12]
        _vend = next((x for x in __import__("vendors").VENDORS if x.get("id") == vendor_id), None)
        vnum = vendor_whatsapp_number(_vend or {})
        if vnum and publish_config()["wa_mode"] != "off":
            _vendor_queue = enqueue_whatsapp([vnum], _to_vendor, priority=0, kind="vendor_lead")
            res["vendor_notification_queued"] = bool(_vendor_queue.get("queued"))
        else:
            res["vendor_notification_queued"] = False
        admin_no = os.getenv("ADMIN_WHATSAPP_NUMBER", "").strip()
        if admin_no and publish_config()["wa_mode"] != "off":
            _admin_queue = enqueue_whatsapp([admin_no], "📩 Vendor enquiry: %s ← %s (%s)"
                                            % (v.get("business_name"), payload.get("name"), payload.get("phone")),
                                            priority=1, kind="vendor_lead_admin")
            res["admin_notification_queued"] = bool(_admin_queue.get("queued"))
    except Exception as e:
        res["notify_error"] = str(e)[:100]
    # Return additional matching vendor listings when available; no outbound message is implied.
    try:
        import vendors as _vmod
        _v = next((x for x in _vmod.VENDORS if x.get("id") == vendor_id), None)
        if _v:
            _more = [public_vendor(x) for x in _vmod.VENDORS
                     if x.get("category") == _v.get("category") and vendor_is_active_listing(x)
                     and x.get("id") != vendor_id][:3]
            res["more_options"] = _more
            if _more:
                res["compare_telugu"] = "Rate compare చెయ్యండి — %s category లో ఇంకా %d vendors ఉన్నారు మన side" % (
                    _v.get("category_te"), len(_more))
    except Exception:
        pass
    return {"success": True, **res}


@app.post("/api/vendors/{vendor_id}/click")
def vendor_click(vendor_id: str, source: str = ""):
    res = track_vendor_click(vendor_id, source)
    if not res.get("ok"):
        raise HTTPException(404, "Active vendor listing not found")
    return {"success": True, **res}


@app.get("/api/admin/vendors")
def admin_vendor_list(status: str = "pending", token: str = "", request: Request = None):
    """Legacy alias: vendor-review data still requires an owner session cookie."""
    _control_owner_session_guard(request)
    return {"success": True, **vendor_queue(status)}


@app.post("/api/admin/vendors/{vendor_id}/action")
def admin_vendor_action(vendor_id: str, action: str, package: str = "", utr: str = "",
                        reason: str = "", token: str = "", request: Request = None):
    """Legacy alias: every vendor-review mutation requires owner session + CSRF."""
    _control_owner_session_guard(request, mutating=True)
    if action == "approve":
        res = activate_vendor(vendor_id, package=package, utr=utr)
    elif action == "reject":
        res = reject_vendor(vendor_id, reason)
    elif action == "expire":
        v = next((x for x in __import__("vendors").VENDORS if x.get("id") == vendor_id), None)
        if not v:
            raise HTTPException(404, "Vendor dorakaledi")
        previous = copy.deepcopy(v)
        v["status"] = "expired"
        if not vendors_save_state().get("ok"):
            v.clear()
            v.update(previous)
            res = {"ok": False, "reason": "persistence_failed",
                   "message_telugu": "⚠️ Vendor expiry could not be saved safely. Please try again."}
        else:
            res = {"ok": True, "vendor": v, "message_telugu": "⏳ %s listing expire చేశాం" % v.get("business_name")}
    else:
        return JSONResponse(status_code=400, content={"success": False, "reason": "bad_action"})
    if not res.get("ok"):
        status_code = 503 if res.get("reason") == "persistence_failed" else 400
        return JSONResponse(status_code=status_code, content={"success": False, **res})
    return {"success": True, **res}


@app.get("/api/admin/vendors/revenue/summary")
def admin_vendor_revenue(token: str = "", request: Request = None):
    """Legacy alias: vendor revenue is owner-session protected."""
    _control_owner_session_guard(request)
    return {"success": True, **vendor_revenue()}


@app.get("/api/welcome-pack/{tsap_id}")
def welcome_pack_get(tsap_id: str, request: Request = None):
    """
    🎁 Mee welcome pack — 3 profiles + caste channel links (Telegram + WhatsApp).
    Owner-only (mee token tho). WhatsApp tho pampina message kooda ikkada chudochu.
    """
    user = _user_or_404(tsap_id)
    require_owner(request, tsap_id)
    opposite = "Bride" if user.get("gender") == "Groom" else "Groom"
    cands = [u for u in DB_USERS if str(u.get("gender", "")) == opposite
             and str(u.get("tsap_id", "")) != tsap_id
             and _is_approved_profile(u)
             and not safety.is_blocked(tsap_id, str(u.get("tsap_id", "")), DB_BLOCKS)]
    rows = [{"profile": row["profile"]}
            for row in topmatch.find_top_matches_v2(user, cands, limit=3)]
    pack = build_welcome_pack(user, tsap_id, rows, directory_links=_public_channel_links())
    pack["queue"] = user.get("welcome_pack_queue", {"queued": False,
                                                    "note_telugu": "Register లో queue avvaledu — resend చెయ్యండి"})
    return {"success": True, **pack_public(pack)}


@app.post("/api/welcome-pack/{tsap_id}/resend")
def welcome_pack_resend(tsap_id: str, request: Request = None):
    """🔁 3 profiles + caste channel links ని మళ్లీ మీ WhatsApp కి pampu (owner-only)."""
    user = _user_or_404(tsap_id)
    require_owner(request, tsap_id)
    opposite = "Bride" if user.get("gender") == "Groom" else "Groom"
    cands = [u for u in DB_USERS if str(u.get("gender", "")) == opposite
             and str(u.get("tsap_id", "")) != tsap_id
             and _is_approved_profile(u)
             and not safety.is_blocked(tsap_id, str(u.get("tsap_id", "")), DB_BLOCKS)]
    rows = [{"profile": row["profile"]}
            for row in topmatch.find_top_matches_v2(user, cands, limit=3)]
    pack = build_welcome_pack(user, tsap_id, rows, directory_links=_public_channel_links())
    phone = str(user.get("phone") or "").strip()
    res: Dict[str, Any] = {"queued": False}
    try:
        if phone and publish_config()["wa_mode"] != "off":
            res = enqueue_whatsapp([phone], pack["message_text"], priority=0, kind="welcome_pack_resend")
        else:
            res = {"queued": False, "reason": "whatsapp_mode_off" if phone else "phone_ledu",
                   "message_telugu": "WHATSAPP_MODE=bridge చేసి bridge connect చెయ్యండి — appudu resend pani చేస్తుంది"}
    except Exception as e:
        res = {"queued": False, "error": str(e)[:140]}
    res = _mask_queue_result(res, phone)
    user["welcome_pack_queue"] = res
    return {"success": True, "tsap_id": tsap_id, "queued": bool(res.get("queued")), "wa_result": res,
            "profiles": pack["profiles"], "channels": pack["channels"],
            "message_preview": pack["message_preview"],
            "message_telugu": ("✅ 3 profiles + caste channel links మళ్లీ పంపిస్తున్నాం"
                               if res.get("queued") else "⚠️ WhatsApp queue off — message ఇక్కడ చూడొచ్చు")}


@app.post("/api/admin/vendors/{vendor_id}/token")
def admin_vendor_token(vendor_id: str, request: Request = None):
    """
    🔐 Admin → vendor dashboard token (vendor token pogottukunte support ivvadaniki).
    Admin key tho matrame (X-Admin-Key). Vendor ki WhatsApp/phone tho pampistham.
    """
    require_admin(request)
    import vendors as _vmod_tok
    vendor = next((v for v in _vmod_tok.VENDORS if v.get("vendor_id") == vendor_id or v.get("id") == vendor_id), None)
    if not vendor:
        raise HTTPException(404, f"Vendor దొరకలేదు: {vendor_id}")
    _vid = vendor.get("vendor_id") or vendor.get("id")
    return {"success": True, "vendor_id": _vid, "vendor_token": vendor_token(_vid),
            "note_telugu": "🔐 ఈ token vendor కి పంపండి — వాళ్లు /vendors/" + str(_vid) + " లో dashboard చూడొచ్చు (token ఎవరికీ ivvakoodadu)"}


@app.get("/api/channels/links")
def channels_links(caste: str = "", gender: str = "", state: str = "", district: str = "",
                   religion: str = "Hindu", limit: int = 5):
    """📢 Caste-based channel links (Telegram + WhatsApp) — website లో చూపించడానికి (public, PII లేదు)."""
    prof = {"caste": clean(caste, 40, "caste"), "gender": clean(gender, 20, "gender"),
            "state": clean(state, 10, "state"), "district": clean(district, 40, "district"),
            "religion": clean(religion, 20, "religion")}
    public_directory_links = _public_channel_links()
    links = caste_channel_links(prof, limit=clamp_int(limit, "limit", 1, 10, 5),
                                directory_links=public_directory_links)
    if not str(caste or "").strip():
        note = "కమ్యూనిటీ, లింగం ఎంచుకుంటే registry లో configured URLs చూపిస్తాం; బయట availability తనిఖీ చేయలేదు."
    else:
        note = "ఇవి repository/admin configuration లోని URLs మాత్రమే; external channel availability లేదా posting frequency హామీ కాదు."
    return {"success": True, "channels": links, "stats": wa_links_stats(directory_links=public_directory_links),
            "external_status_checked": False, "note_telugu": note}


# ============================================================================
#  🚀 WAVE 11 — additional tools (gothram text comparison · stories · streak · push ·
#              voice · gamify · boost · support)
# ============================================================================
@app.get("/api/gothram/check")
def gothram_check(a: str, b: str):
    """Compare only active public profiles; never expose their raw gothram or decide eligibility."""
    a_id, b_id = str(a or "").strip().upper(), str(b or "").strip().upper()
    me, other = _find_user(a_id), _find_user(b_id)
    if (not _is_approved_profile(me) or not _is_approved_profile(other)
            or safety.is_blocked(a_id, b_id, DB_BLOCKS)):
        raise HTTPException(404, "రెండు active, approved public profile IDs అవసరం")
    comparison = A11.gothram_check(me, other)
    return {"success": True, "a": a_id, "b": b_id,
            "same": comparison.get("same"), "blocked": False,
            "reason": comparison.get("reason", "details_unavailable"),
            "note_telugu": comparison.get("note_telugu", ""),
            "notice": comparison.get("notice", "Member-entered text comparison only; not a compatibility verdict.")}


# A story nudge is shown to members who have been here long enough, or who have a
# mutual connection, to have something real to share. It is a prompt, never a
# claim: nothing here says a match happened, that anyone was verified, or that a
# submitted story will be published.
STORY_PROMPT_MIN_DAYS = 30


@app.get("/api/stories/prompt")
def story_prompt(request: Request, tsap_id: str = ""):
    """Owner-only context for the "share your story" nudge.

    Answers only what the member's own record can answer: how long the profile
    has existed, whether an interest was mutually accepted, and what happened
    to stories they already sent. An unknown registration date stays unknown
    instead of being counted as time served.
    """
    tid = str(tsap_id or "").strip().upper()
    require_owner(request, tid)
    u = _find_user(tid)
    if not u:
        raise HTTPException(404, "మీ profile దొరకలేదు — ముందు register చెయ్యండి")

    raw_created = str(u.get("created_at", "") or "")
    try:
        member_days = (datetime.utcnow() - datetime.fromisoformat(raw_created.replace("Z", ""))).days
        days_known = member_days >= 0
    except Exception:
        member_days, days_known = 0, False

    accepted = 0
    for _row in DB_INTERESTS:
        if str(_row.get("status", "")).strip().lower() != "accepted":
            continue
        if tid in {str(_row.get("from_id", "")).strip().upper(), str(_row.get("to_id", "")).strip().upper()}:
            accepted += 1

    summary = A11.story_summary(tid)
    if summary["pending"]:
        reason = "already_pending"
    elif summary["approved"]:
        reason = "already_approved"
    elif accepted >= 1:
        reason = "accepted_interest"
    elif days_known and member_days >= STORY_PROMPT_MIN_DAYS:
        reason = "member_long_enough"
    else:
        reason = "not_yet"

    can_submit = reason in {"accepted_interest", "member_long_enough"}
    prompt = {
        "not_yet": (
            "💑 మీ story ఇంకా పంపలేదు",
            "You have not shared your story yet",
            "Members who have used the service for a while, or whose interest was accepted on "
            "both sides, get an invite to share theirs. Nothing is published without review.",
        ),
        "member_long_enough": (
            f"💑 {member_days} రోజులుగా మన వివాహలో ఉన్నారు — మీ story పంపండి",
            f"You have been here {member_days} days — share your story",
            "Members who have been here a while sometimes share how it went. It is optional, "
            "and it is reviewed before anything appears on the stories page.",
        ),
        "accepted_interest": (
            "💑 మీ interest ఒకరితో accept అయింది — జరిగింది చెప్పండి",
            "An interest was accepted on both sides — tell us how it went",
            "Only shares what your own account records: an accepted interest. Nothing about the "
            "conversation, the outcome or the other member is assumed or published.",
        ),
        "already_pending": (
            "⏳ మీ story review లో ఉంది",
            "Your story is in review",
            "Review timing is not guaranteed, and review is not a promise to publish. You will "
            "see it on the stories page only if it is approved.",
        ),
        "already_approved": (
            "✅ మీ story stories page లో ఉంది — ధన్యవాదాలు",
            "Your story is on the stories page — thank you",
            "Shared stories keep only the words, names and district the member chose to give.",
        ),
    }[reason]

    return {
        "success": True,
        "tsap_id": tid,
        "member_days": member_days if days_known else None,
        "days_known": days_known,
        "min_days": STORY_PROMPT_MIN_DAYS,
        "accepted_interests": accepted,
        "stories": summary,
        "can_submit": can_submit,
        "reason": reason,
        "title_telugu": prompt[0],
        "title_en": prompt[1],
        "note_en": prompt[2],
        "note_telugu": {
            "not_yet": "కొంత కాలం పాటు వాడిన వారికి, లేదా interest రెండు వైపులా accept అయిన వారికి ఈ ఆహ్వానం కనిపిస్తుంది. Review లేకుండా ఏదీ ప్రచురించబడదు.",
            "member_long_enough": "ఇది ఐచ్ఛికం. Review తర్వాతే stories page లో కనిపిస్తుంది — ప్రచురణ హామీ కాదు.",
            "accepted_interest": "మీ account లో ఉన్నదే చూపిస్తాం: accept అయిన interest. సంభాషణ, ఫలితం, ఇతర సభ్యుల వివరాలు ఊహించి రాయము.",
            "already_pending": "Review సమయం హామీ కాదు; approve అయితేనే stories page లో కనిపిస్తుంది.",
            "already_approved": "Story లో మీరు ఇచ్చిన మాటలు, పేర్లు, జిల్లా మాత్రమే ఉంటాయి.",
        }[reason],
        "share_url": "/stories",
        "verified_claim": False,
        "external_status_checked": False,
    }


@app.post("/api/stories/submit")
def story_submit(payload: dict, request: Request = None):
    """Accept a member-shared story for moderation; submission is not identity verification."""
    d = payload or {}
    require_owner(request, str(d.get("tsap_id", "")))
    u = _find_user(str(d.get("tsap_id", "")))
    if not u:
        raise HTTPException(404, "మీ profile దొరకలేదు — ముందు register చెయ్యండి")
    try:
        rec = A11.submit_story(str(d.get("tsap_id", "")), str(d.get("text", "")),
                               partner_id=str(d.get("partner_id", "")),
                               couple_names=str(d.get("couple_names", "")),
                               photo_url=str(d.get("photo_url", "")),
                               district=str(d.get("district", "")))
    except RuntimeError as exc:
        if str(exc).startswith("persistence_failed"):
            raise HTTPException(503, "Story could not be saved safely. Please try again.")
        raise
    return {"success": True, "story": rec,
            "message_telugu": "💑 మీ story review కోసం పంపబడింది. Approve అయితే /stories page‌లో కనిపిస్తుంది; review సమయం, ప్రచురణ హామీ కాదు."}


def _public_story(rec: dict) -> dict:
    """Public story view: a submitter's profile identifiers never leave the server.

    The admin queue keeps them because moderators need to know who submitted a
    story; the public feed only needs the story, the names the submitter chose
    to give, and the district.
    """
    row = dict(rec or {})
    for key in ("tsap_id", "partner_id"):
        row.pop(key, None)
    return row


@app.get("/api/stories")
def stories_list(limit: int = 20):
    """Public member-submitted stories that were approved for display; approval is not verification."""
    rows = A11.approved_stories(clamp_int(limit, "limit", 1, 50, 20))
    return {"success": True, "count": len(rows), "stories": [_public_story(row) for row in rows],
            "publication_note": "Stories are member-submitted and moderated for publication; identity and relationship details are not independently verified."}


@app.post("/api/stories/{story_id}/like")
def story_like(story_id: str):
    try:
        result = A11.like_story(story_id)
    except RuntimeError as exc:
        if str(exc).startswith("persistence_failed"):
            raise HTTPException(503, "Story like could not be saved safely. Please try again.")
        raise
    return {"success": True, **result}


@app.post("/api/admin/stories/{story_id}/action")
def admin_story_action(story_id: str, payload: dict = None, request: Request = None):
    """💑 Admin: story approve/reject (approve → share text ready)."""
    require_admin(request)
    d = payload or {}
    if not next((s for s in A11.STORIES if s.get("story_id") == story_id), None):
        raise HTTPException(404, "Story dorakaledu: %s" % story_id)
    try:
        rec = A11.review_story(story_id, str(d.get("action", "")), str(d.get("note", "")))
    except RuntimeError as exc:
        if str(exc).startswith("persistence_failed"):
            raise HTTPException(503, "Story review could not be saved safely. Please try again.")
        raise
    out = {"success": True, "story": rec}
    if rec.get("status") == "approved":
        out["share_text"] = A11.story_share_text(rec)
        out["share_note_telugu"] = "📢 Share చేయడం ఐచ్ఛికం. కథనం/పేర్లను సంబంధితుల స్పష్టమైన సమ్మతితో మాత్రమే పంచుకోండి; destinations ముందుగా operator స్వయంగా నిర్ధారించాలి. Review గుర్తింపును verify చేయదు."
    return out


@app.get("/api/support/faq")
def support_faq(q: str = "", limit: int = 5):
    """💬 Telugu support Q&A — ?q=price అని search (widget + bot common)."""
    rows = A11.search_faq(q, clamp_int(limit, "limit", 1, 12, 5))
    return {"success": True, "count": len(rows), "faqs": rows,
            "human_telugu": "Contact options ఉన్నచోట వాటిని చూడండి. WhatsApp support contact configure కానప్పుడు ఆ link చూపించము; response time హామీ కాదు."}


@app.get("/api/streak/{tsap_id}")
def streak_get(tsap_id: str, request: Request = None):
    """🔥 Streak status (count, best, repu bonus)."""
    require_owner(request, tsap_id)
    u = _find_user(tsap_id)
    if not u:
        raise HTTPException(404, "Mee profile dorakaledu")
    return {"success": True, "tsap_id": tsap_id, **A11.streak_status(u)}


@app.post("/api/streak/claim")
def streak_claim(payload: dict, request: Request = None):
    """🔥 Daily bonus claim — rojoo okasari (streak penchithe bonus ఎక్కువ)."""
    tsap_id = str((payload or {}).get("tsap_id", ""))
    require_owner(request, tsap_id)
    u = _find_user(tsap_id)
    if not u:
        raise HTTPException(404, "Mee profile dorakaledu")
    previous = {key: u.get(key) for key in ("streak_last", "streak_count", "streak_best", "credits")}
    result = A11.claim_daily(u)
    if result.get("success") and not _persist_core_state():
        for key, value in previous.items():
            if value is None:
                u.pop(key, None)
            else:
                u[key] = value
        raise HTTPException(503, "Daily bonus could not be saved safely. Please try again.")
    return {"success": True, "tsap_id": tsap_id, **result}


@app.get("/api/push/vapid")
def push_vapid():
    """Expose a browser key only when server-side push sending is fully configured."""
    ready = A11.vapid_delivery_ready()
    key = A11.vapid_public_key() if ready else ""
    return {"success": True, "vapid_public_key": key,
            "vapid_ready": ready, "mode": "live-ready" if ready else "preview",
            "note_telugu": "🔔 Alerts ON చెయ్యండి — కొత్త matches వస్తే notification" if ready
                           else "ℹ️ Owner-configured VAPID keys, sender, contact లేకపోవడంతో alerts preview మాత్రమే.",
            "note_en": "Push alerts are available to enable." if ready
                       else "Push alerts remain in preview until owner-configured VAPID keys, sender, and contact are available."}


@app.post("/api/push/subscribe")
def push_subscribe(payload: dict, request: Request = None):
    """🔔 Browser push subscribe (matches page 🔔 button నుంచి)."""
    d = payload or {}
    tsap_id = str(d.get("tsap_id", ""))
    require_owner(request, tsap_id)
    if not _find_user(tsap_id):
        raise HTTPException(404, "Mee profile dorakaledu")
    result = A11.push_subscribe(tsap_id, str(d.get("endpoint", "")),
                                d.get("keys") or {}, ua=str(d.get("ua", "")))
    if not result.get("success") and result.get("reason") == "persistence_failed":
        raise HTTPException(503, result.get("message_telugu"))
    return result


@app.post("/api/push/unsubscribe")
def push_unsubscribe(payload: dict, request: Request = None):
    d = payload or {}
    tsap_id = str(d.get("tsap_id", ""))
    if tsap_id:
        require_owner(request, tsap_id)
    result = A11.push_unsubscribe(tsap_id=tsap_id, endpoint=str(d.get("endpoint", "")))
    if not result.get("success") and result.get("reason") == "persistence_failed":
        raise HTTPException(503, result.get("message_telugu"))
    return result


@app.post("/api/push/notify/{tsap_id}")
def push_notify(tsap_id: str, payload: dict, request: Request = None):
    """🔔 Notify pampu — owner (self digest) leda admin (broadcast)."""
    if not is_admin(request):
        require_owner(request, tsap_id)
    if not _find_user(tsap_id):
        raise HTTPException(404, "Profile dorakaledu")
    d = payload or {}
    result = A11.push_notify(
        tsap_id, str(d.get("title", "💍 మన వివాహ — కొత్త matches!")),
        str(d.get("body", "మీకు 2 కొత్త matches vachayi — చూడండి!")),
        str(d.get("url", "/matches")))
    if not result.get("success") and result.get("reason") == "persistence_failed":
        raise HTTPException(503, result.get("message_telugu"))
    return {"tsap_id": tsap_id, **result}


@app.get("/api/admin/push/queue")
def admin_push_queue(request: Request = None):
    require_admin(request)
    return {"success": True, "subs": len(A11.PUSH_SUBS),
            "queue": A11.PUSH_QUEUE[-30:][::-1],
            "vapid_ready": A11.vapid_delivery_ready()}


@app.post("/api/voice/upload")
async def voice_upload(request: Request, file: UploadFile = File(...), tsap_id: str = Form("")):
    """
    🎙️ Voice intro upload (30 sec) — phone recorder nunchi.
    MP3/WAV/OGG/M4A, max 2MB. Matches lo ▶️ play avutundi.
    """
    tid = (tsap_id or "").strip().upper()
    if tid:
        require_owner(request, tid)  # 🛡️ WAVE 25: vere vaalla profile ki voice spam ban
        u = _find_user(tid)
        if not u:
            raise HTTPException(404, "Profile dorakaledu")
    else:
        # An unowned upload is an anonymous storage/DoS vector, even if the file
        # is a valid audio clip. CMS/media uploads need an explicit admin key.
        require_admin(request)
        u = None
    data = await file.read(2 * 1024 * 1024 + 1)
    chk = A11.voice_validate(file.filename or "", len(data))
    if not chk.get("ok"):
        raise HTTPException(400, chk["error_telugu"])
    os.makedirs(VOICE_MEDIA_DIR, exist_ok=True)
    # 🛡️ P2 hardening (consistency w/ WAVE 23 fix on /api/photo/upload): tid is
    # always server-generated at registration so this isn't reachable today,
    # but sanitize anyway rather than relying on that invariant forever.
    _safe_tid = re.sub(r"[^A-Z0-9-]", "", tid.strip().upper())[:24]
    token = (_safe_tid or "admin") + "-" + datetime.utcnow().strftime("%y%m%d%H%M%S") + "-" + secrets.token_hex(6)
    name = f"{token}.{chk['ext']}"
    path = os.path.join(VOICE_MEDIA_DIR, name)
    try:
        atomic_write_bytes(path, data)
    except Exception as e:
        raise HTTPException(500, f"Voice save avvaledu: {str(e)[:80]}")
    url = f"/voice/{name}"
    if u is not None:
        previous = {key: u.get(key) for key in ("voice_url", "voice_at")}
        u["voice_url"] = url
        u["voice_at"] = datetime.utcnow().isoformat()
        if not _persist_core_state():
            for key, value in previous.items():
                if value is None:
                    u.pop(key, None)
                else:
                    u[key] = value
            try:
                os.remove(path)
            except OSError:
                pass
            raise HTTPException(503, "Voice intro could not be saved safely. Please try again.")
    return {"success": True, "url": url, "tsap_id": tid, "bytes": len(data),
            "message_telugu": f"🎙️ Voice intro upload అయ్యింది! Matches లో మీ voice vintaru ({round(len(data)/1024)} KB)"}


@app.get("/api/voice/{tsap_id}")
def voice_get(tsap_id: str):
    u = _find_user(tsap_id)
    if not u:
        raise HTTPException(404, "Profile dorakaledu")
    url = str(u.get("voice_url", "") or "")
    return {"success": True, "tsap_id": tsap_id, "voice_url": url, "has_voice": bool(url),
            "uploaded_at": str(u.get("voice_at", "") or ""),
            "note_telugu": "🎙️ Voice clip వినడం pronunciation గురించి తెలియజేయవచ్చు; replies లేదా matches హామీ కాదు." if url
                           else "ℹ️ Voice intro లేదు — 30 sec record చేసి పంపండి"}


@app.post("/api/profile/complete-bonus/{tsap_id}")
def complete_bonus(tsap_id: str, request: Request = None):
    """🎮 Profile 90%+ → 2 credits FREE (okasari మాత్రమే — gamification)."""
    require_owner(request, tsap_id)
    u = _find_user(tsap_id)
    if not u:
        raise HTTPException(404, "Mee profile dorakaledu")
    pct = profile_completeness(u)["percent"]
    previous = {key: u.get(key) for key in ("complete_bonus_claimed", "credits")}
    res = A11.claim_complete_bonus(u, pct)
    if res.get("success") and not _persist_core_state():
        for key, value in previous.items():
            if value is None:
                u.pop(key, None)
            else:
                u[key] = value
        raise HTTPException(503, "Profile bonus could not be saved safely. Please try again.")
    return {"success": res.get("success", False), "tsap_id": tsap_id,
            "completeness": pct, **res}


@app.get("/api/boost/packs")
def boost_packs():
    """⚡ Boost packs list (B_1/B_3/B_7) + మీ boost status కోసం ?tsap_id=."""
    return {"success": True, "packs": list(A11.BOOST_PACKS.values()),
            "note_telugu": "⚡ Boost active అయితే matches + postings లో మీ profile TOP లో"}


@app.post("/api/boost/buy")
def boost_buy(payload: dict, request: Request):
    """Compatibility route: explicit isolated test fixture or real PayPro order, never a live fabricated payment."""
    d = payload or {}
    tsap_id = str(d.get("tsap_id") or "").strip().upper()
    require_owner(request, tsap_id)
    user = _find_user(tsap_id)
    if not user:
        raise HTTPException(404, "User not found — register first.")
    pack_code = str(d.get("pack") or d.get("pack_id") or "B_1").strip().upper()
    if pack_code not in A11.BOOST_PACKS:
        raise HTTPException(400, "Choose boost pack B_1, B_3, or B_7.")

    if _test_payment_fixtures_enabled():
        previous = {"boost_until": user.get("boost_until"), "payment_count": len(DB_PAYMENTS)}
        effect = A11.apply_boost(user, pack_code)
        order_id = "DEV-BOOST-" + datetime.utcnow().strftime("%y%m%d%H%M%S") + str(len(DB_PAYMENTS) + 1).zfill(3)
        order = {"order_id": order_id, "tsap_id": tsap_id, "plan": pack_code,
                 "kind": "boost", "amount": A11.BOOST_PACKS[pack_code]["price"],
                 "at": datetime.utcnow().isoformat(), "status": "paid", "development_fixture": True}
        DB_PAYMENTS.append(order)
        if not _persist_core_state():
            if previous["boost_until"] is None:
                user.pop("boost_until", None)
            else:
                user["boost_until"] = previous["boost_until"]
            del DB_PAYMENTS[previous["payment_count"]:]
            raise HTTPException(503, "Boost could not be saved safely. Please try again.")
        return {"success": True, "order": order, "boost_until": str(user.get("boost_until", "") or ""),
                "boosted": A11.is_boosted(user), "message_telugu": effect.get("message_telugu", "Development boost applied.")}

    result = PP.create_pay_order(tsap_id, "boost", pack_code)
    if not result.get("success"):
        raise HTTPException(503, result.get("message_telugu", "Payment is not configured."))
    order = result["pay_order"]
    return {"success": True, "order": {"order_id": order["id"], "tsap_id": tsap_id,
            "plan": pack_code, "kind": "boost", "amount": order["final_amount"],
            "status": order["status"], "payment_required": True},
            "pay_order": order, "boost_until": str(user.get("boost_until", "") or ""),
            "boosted": A11.is_boosted(user), "message_telugu": result.get("message_telugu", "Payment order created.")}


# ============================================================================
# 🔒 WAVE 12 — SMART REVEAL (masked channels + unlock + ₹500 assisted console)
# ============================================================================
@app.post("/api/link-telegram")
def api_link_telegram(payload: dict, request: Request = None):
    """🔗 Bot /link — Telegram chat_id ni profile tho link (personal delivery kosam).
    🌊 WAVE 22 — hijack fix: production lo automation key + phone last-4 match tappanidi."""
    d = payload or {}
    u = _find_user(str(d.get("tsap_id", "")).upper())
    if not u:
        raise HTTPException(404, "ID దొరకలేదు — website login లో మీ TSAP ID చూడండి")
    last4 = "".join(ch for ch in str(d.get("phone_last4", "")) if ch.isdigit())[-4:]
    if auth_enforced():
        if not is_automation(request):
            raise HTTPException(401, "🔒 Bot నుంచి మాత్రమే link అవుతుంది")
        if len(last4) != 4 or not str(u.get("phone", "")).endswith(last4):
            raise HTTPException(400, "⚠️ Phone last-4 digits tappu — /link ID LAST4 (register చేసిన numberivi)")
    elif last4 and not str(u.get("phone", "")).endswith(last4):
        raise HTTPException(400, "⚠️ Phone last-4 digits tappu")
    previous = {key: u.get(key) for key in ("telegram_chat_id", "telegram_linked_at")}
    u["telegram_chat_id"] = str(d.get("chat_id", ""))[:120]
    u["telegram_linked_at"] = datetime.utcnow().isoformat()
    if not _persist_core_state():
        for key, value in previous.items():
            if value is None:
                u.pop(key, None)
            else:
                u[key] = value
        raise HTTPException(503, "Telegram link could not be saved safely. Please try again.")
    return {"success": True, "tsap_id": u["tsap_id"],
            "message_telugu": f"✅ Link అయ్యింది! {u['tsap_id']} — ఇప్పుడు /unlock, /mylist vadachu"}


@app.post("/api/unlock")
def api_unlock(payload: dict, request: Request = None):
    """
    🔒 Contact reveal requires an accepted interest; credits never bypass contact consent.
    🌊 WAVE 22 — IDOR fix: viewer token match (website) leda automation key (bot) tappanidi.
    """
    d = payload or {}
    _vid = str(d.get("viewer_id", "")).upper()
    require_owner(request, _vid)
    viewer = _find_user(_vid)
    target = _find_user(str(d.get("target_id", "")).upper())
    if not viewer:
        raise HTTPException(404, "మీ profile దొరకలేదు — /link తో link చెయ్యండి")
    if not target:
        raise HTTPException(404, f"ID దొరకలేదు: {d.get('target_id', '')}")
    viewer_id = str(viewer.get("tsap_id", "")).upper()
    target_id = str(target.get("tsap_id", "")).upper()
    consented = viewer_id == target_id or any(
        str(i.get("status", "")).lower() == "accepted"
        and {str(i.get("from_id", "")).upper(), str(i.get("to_id", "")).upper()} == {viewer_id, target_id}
        for i in DB_INTERESTS
    )
    if not consented:
        result = S12.unlock_number(viewer, target, consent_granted=False)
        return JSONResponse(status_code=409, content=result)

    # Accepted interest is the consent gate; credits are only for sending requests, never for bypassing consent.
    res = S12.unlock_number(viewer, target, consent_granted=True)
    if res.get("success"):
        res["target"] = {"tsap_id": target["tsap_id"],
                         "name": S12.first_masked(target.get("full_name", "")),
                         "age": target.get("age"), "caste": target.get("caste")}
    elif res.get("reason") == "persistence_failed":
        raise HTTPException(503, res.get("message_telugu", "Contact access could not be saved safely."))
    return res


@app.get("/api/unlocks/{viewer_id}")
def api_my_unlocks(viewer_id: str, request: Request = None):
    """📋 నా unlocked list — MASKED (full number per-unlock మాత్రమే, logged)."""
    require_owner(request, viewer_id)  # 🌊 WAVE 22 — IDOR fix
    me = _find_user(viewer_id.upper())
    if not me:
        raise HTTPException(404, "Profile dorakaledu")
    me_id = str(me.get("tsap_id", "")).upper()
    accepted_targets = set()
    for interest in DB_INTERESTS:
        if str(interest.get("status", "")).lower() != "accepted":
            continue
        from_id = str(interest.get("from_id", "")).upper()
        to_id = str(interest.get("to_id", "")).upper()
        if from_id == me_id:
            accepted_targets.add(to_id)
        elif to_id == me_id:
            accepted_targets.add(from_id)
    out = S12.my_unlocks(me["tsap_id"], DB_USERS, accepted_targets=accepted_targets)
    out["credits"] = me.get("credits", 0)
    return out


# --- ₹500 assisted orders (admin) --------------------------------------------
@app.post("/api/admin/assist-orders")
def api_assist_create(payload: dict, request: Request):
    require_admin(request)  # financial order creation is owner-only
    d = payload or {}
    buyer = _find_user(str(d.get("buyer_id", "")).upper())
    if not buyer:
        raise HTTPException(404, f"Buyer ID దొరకలేదు: {d.get('buyer_id', '')}")
    try:
        order = S12.create_order(buyer["tsap_id"], S12.ASSISTED_PRICE,
                                 str(d.get("note", "")))
    except OSError:
        raise HTTPException(503, "Assisted order could not be saved safely. Please try again.")
    return {"success": True, "order": order,
            "message_telugu": f"✅ Order {order['id']} — ₹{order['amount']} (UTR vachhaka paid చెయ్యండి)"}


@app.get("/api/admin/assist-orders")
def api_assist_list(request: Request, status: str = ""):
    require_admin(request)  # order records may contain payment references
    items = [o for o in S12.ORDERS if not status or o.get("status") == status]
    return {"success": True, "count": len(items), "orders": list(reversed(items))}


@app.post("/api/admin/assist-orders/{order_id}/paid")
def api_assist_paid(order_id: str, payload: dict, request: Request):
    require_admin(request)  # payment-reference review is owner-only
    res = S12.mark_order_paid(order_id, str((payload or {}).get("utr", "")))
    if not res.get("success"):
        raise HTTPException(400, res.get("message_telugu"))
    return res


@app.post("/api/admin/assist-orders/{order_id}/profiles")
def api_assist_attach(order_id: str, payload: dict, request: Request):
    require_admin(request, staff_ok=True)
    order = S12.get_order(order_id)
    if not order:
        raise HTTPException(404, "Assisted order not found")
    ids = list(dict.fromkeys(str(x).strip().upper() for x in (payload or {}).get("profile_ids", []) if str(x).strip()))
    if not ids or len(ids) > S12.ASSISTED_DEFAULT_COUNT:
        raise HTTPException(400, f"Select 1–{S12.ASSISTED_DEFAULT_COUNT} profiles")
    missing = [i for i in ids if not _find_user(i)]
    if missing:
        raise HTTPException(404, f"IDs dorakalevu: {', '.join(missing)}")
    if any(not _is_approved_profile(_find_user(i)) for i in ids):
        raise HTTPException(404, "Inactive or unapproved profiles cannot be attached to a shortlist")
    if order.get("amount") != S12.ASSISTED_PRICE:
        raise HTTPException(400, "Assisted shortlist price mismatch")
    res = S12.attach_order_profiles(order_id, ids)
    if not res.get("success"):
        raise HTTPException(400, res.get("message_telugu"))
    return res


# --- 🎯 Match & Send console (admin) ------------------------------------------
@app.get("/api/admin/match-send/copy-list")
def api_copy_list(request: Request, buyer: str = "", ids: str = "", order_id: str = ""):
    """Admin copy of shortlisted profile summaries; contact details remain consent-gated."""
    require_admin(request, staff_ok=True)
    b = _find_user(buyer.upper())
    if not b:
        raise HTTPException(404, f"Buyer ID దొరకలేదు: {buyer}")
    wanted = list(dict.fromkeys(x.strip().upper() for x in (ids or "").split(",") if x.strip()))
    if not wanted or len(wanted) > S12.ASSISTED_DEFAULT_COUNT:
        raise HTTPException(400, f"Select 1–{S12.ASSISTED_DEFAULT_COUNT} profiles")
    targets = [_find_user(i) for i in wanted]
    if any(t is None for t in targets):
        raise HTTPException(404, "కొన్ని IDs dorakalevu — list సరి చూడండి")
    if any(_is_synthetic_profile(t) for t in targets):
        raise HTTPException(400, "Demo/test profile ను shortlist copy లో చేర్చలేరు")
    if any(not _is_approved_profile(t) for t in targets):
        raise HTTPException(404, "Inactive or unapproved profiles are not available for shortlist copy")
    if order_id:
        order = S12.get_order(order_id)
        if not order:
            raise HTTPException(404, "Assisted order not found")
        if order.get("buyer_id") != b.get("tsap_id") or int(order.get("amount", 0) or 0) != S12.ASSISTED_PRICE:
            raise HTTPException(403, "ఈ buyer/order pair సరిపోలలేదు")
        if order.get("status") not in ("paid", "delivered"):
            raise HTTPException(400, "Payment confirm అయిన తర్వాత మాత్రమే paid-service copy తయారు చేయండి")
    try:
        text = S12.build_copy_list(b, sanitize_public_payload(targets), order_id)
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    return {"success": True, "count": len(targets), "contact_access": "owner_acceptance_required",
            "text": sanitize_public_text(text)}


@app.get("/api/admin/match-send/{buyer_id}")
def api_match_send(buyer_id: str, request: Request, limit: int = 20, min_score: int = 0,
                     include_same_surname: int = 0, include_age_block: int = 0, nri_only: int = 0,
                     age_min: int = 0, age_max: int = 0, castes: str = "", districts: str = "",
                     state: str = "", religion: str = "", education: str = "", jobs: str = "",
                     salary_min: int = 0, marital: str = "", children: str = "",
                     photo_only: int = 0, verified_only: int = 0, nri_exclude: int = 0):
    """
    Admin-only filtered profile list for manual review; no synthetic score or suitability ranking.
    Candidate contact data stays locked until profile-owner acceptance.
    """
    role = require_admin(request, staff_ok=True)
    me = _find_user(buyer_id.upper())
    if not me:
        raise HTTPException(404, f"Buyer ID దొరకలేదు: {buyer_id}")
    pool = [u for u in DB_USERS if u.get("tsap_id") != me["tsap_id"]
            and _is_approved_profile(u)
            and not safety.is_blocked(me["tsap_id"], u.get("tsap_id", ""), DB_BLOCKS)]
    # Legacy exclusions remain accepted for old clients but do not decide eligibility.
    kept = list(pool)
    if nri_only:
        kept = [c for c in kept if _is_nri(c)]
    if nri_exclude:
        kept = [c for c in kept if not _is_nri(c)]
    # Advanced filters are explicit member-selected filters, not a suitability verdict.
    _fstate = (state or "").strip()
    _frel = (religion or "").strip()
    _fmari = [x.strip() for x in (marital or "").split(",") if x.strip()]
    _fkids = (children or "").strip()
    _children_filter_ignored = bool(_fmari) and all(is_never_married_status(value) for value in _fmari)
    _fcastes = [x.strip().lower() for x in (castes or "").split(",") if x.strip()]
    _fdists = [x.strip().lower() for x in (districts or "").split(",") if x.strip()]
    _fedu = [x.strip().lower() for x in (education or "").split(",") if x.strip()]
    _fjobs = [x.strip().lower() for x in (jobs or "").split(",") if x.strip()]

    def _sal_num(v):
        try:
            return float(str(v).replace(",", "").strip().split()[0])
        except Exception:
            return 0.0

    _f19skip = 0

    def _f19_ok(c):
        try:
            _age = int(c.get("age", 0) or 0)
        except Exception:
            _age = 0
        if age_min and _age and _age < age_min:
            return False
        if age_max and _age and _age > age_max:
            return False
        if _fcastes and str(c.get("caste", "")).lower() not in _fcastes:
            return False
        if _fdists and str(c.get("district", "")).lower() not in _fdists:
            return False
        if _fstate and str(c.get("state", "")) != _fstate:
            return False
        if _frel and str(c.get("religion", "")) != _frel:
            return False
        if _fedu and str(c.get("education", "")).lower() not in _fedu:
            return False
        if _fjobs and str(c.get("job", "")).lower() not in _fjobs:
            return False
        if salary_min and _sal_num(c.get("salary", 0)) < salary_min:
            return False
        if _fmari and str(c.get("marital_status", "")) not in _fmari:
            return False
        if _fkids and not _children_filter_ignored:
            if is_never_married_status(c.get("marital_status")):
                return False
            if str(c.get("children", "None")) != _fkids:
                return False
        if photo_only and not (c.get("has_photo") or c.get("photo_url")):
            return False
        if verified_only and not safety.has_verification_evidence(c):
            return False
        return True

    _before = len(kept)
    kept = [c for c in kept if _f19_ok(c)]
    _f19skip = _before - len(kept)
    # ``min_score`` is accepted for legacy clients but is intentionally ignored.
    rows = topmatch.find_top_matches_v2(me, kept, limit=min(limit, 100))
    # A separately purchased active boost may affect placement; it is not a compatibility signal.
    rows.sort(key=lambda row: A11.boost_rank_key(row.get("profile", {})), reverse=True)
    out = []
    for r in rows:
        prof = r.pop("profile")
        # Authenticated admin/staff shortlist UI needs the internal profile ID to
        # select and deliver profiles; phone and other contact data stay locked.
        r.update({"tsap_id": prof.get("tsap_id"),
                  "full_name": prof.get("full_name"),
                  "contact_access": "owner_acceptance_required",
                  "age": prof.get("age"), "gender": prof.get("gender"), "caste": prof.get("caste"),
                  "sub_caste": prof.get("sub_caste", ""), "district": prof.get("district"),
                  "state": prof.get("state"), "education": prof.get("education"),
                  "job": prof.get("job"), "salary": prof.get("salary", ""),
                  "marital_status": prof.get("marital_status", ""),
                  "children": "" if is_never_married_status(prof.get("marital_status")) else prof.get("children", ""),
                  "star": prof.get("star", ""),
                  "height": prof.get("height", ""),
                  "verification": safety.verification_badge(prof)["level"],
                  "phone_verified": bool(prof.get("phone_verified")),
                  "is_verified": safety.has_verification_evidence(prof),
                  "has_photo": bool(prof.get("photo_urls")),
                  "is_nri": _is_nri(prof),
                  "profession_label": _prof_label(prof)})
        out.append(sanitize_public_payload(r))
    buyer_summary = {"tsap_id": sanitize_public_text(me.get("tsap_id", "")),
                     "name": sanitize_public_text(me.get("full_name", ""))}
    if role == "owner":
        buyer_summary.update({"phone": me.get("phone", ""), "credits": me.get("credits", 0),
                              "telegram_chat_id": me.get("telegram_chat_id", ""),
                              "telegram_linked": bool(me.get("telegram_chat_id"))})
    return {"buyer": buyer_summary, "role": role, "sensitive_fields_visible": role == "owner",
            "count": len(out), "nri_only": bool(nri_only), "nri_excluded": bool(nri_exclude),
            "filters_skipped": _f19skip, "legacy_exclusion_flags_ignored": True,
            "ranking_basis": "active_paid_boost_then_recency",
            "results": out,
            "message_telugu": f"🎯 {len(out)} profiles — explicit filters applied; no name/gothram/age eligibility rule or compatibility score is inferred" + (" · ✈️ NRI-only" if nri_only else "") + (f" · 🔍 filters {_f19skip} skip" if _f19skip else "")}


@app.post("/api/admin/match-send/deliver")
async def api_match_deliver(payload: dict, request: Request):
    """Deliver profile summaries only; neither payment nor admin selection reveals member contacts."""
    role = require_admin(request, staff_ok=True)
    d = payload or {}
    buyer = _find_user(str(d.get("buyer_id", "")).upper())
    if not buyer:
        raise HTTPException(404, f"Buyer ID దొరకలేదు: {d.get('buyer_id', '')}")
    ids = list(dict.fromkeys(str(x).strip().upper() for x in d.get("profile_ids", []) if str(x).strip()))
    if not ids or len(ids) > S12.ASSISTED_DEFAULT_COUNT:
        raise HTTPException(400, f"Select 1–{S12.ASSISTED_DEFAULT_COUNT} profiles")
    targets = [_find_user(i) for i in ids]
    if any(t is None for t in targets):
        raise HTTPException(404, "కొన్ని profile IDs dorakalevu")
    for target in targets:
        if target.get("tsap_id") == buyer.get("tsap_id"):
            raise HTTPException(400, "మీ స్వంత profile ను shortlist చేయలేరు")
        if _is_synthetic_profile(target):
            raise HTTPException(400, "Demo/test profile ను member shortlist లో పంపలేరు")
        if not _is_approved_profile(target):
            raise HTTPException(404, "Inactive or unapproved profiles cannot be delivered in a shortlist")
        if safety.is_blocked(buyer["tsap_id"], target.get("tsap_id", ""), DB_BLOCKS):
            raise HTTPException(400, "Blocked profile ను shortlist చేయలేరు")

    order_id = str(d.get("order_id", "") or "").strip()
    order_before = None
    via = str(d.get("via", "both") or "both").lower()
    if via not in {"both", "telegram", "whatsapp"}:
        raise HTTPException(400, "Delivery method must be telegram, whatsapp, or both")
    if order_id:
        order = S12.get_order(order_id)
        if not order:
            raise HTTPException(404, f"Order దొరకలేదు: {order_id}")
        if order.get("buyer_id") != buyer.get("tsap_id"):
            raise HTTPException(403, "ఈ order వేరే buyer కి చెందింది")
        if int(order.get("amount", 0) or 0) != S12.ASSISTED_PRICE:
            raise HTTPException(400, f"Assisted service ధర ₹{S12.ASSISTED_PRICE} మాత్రమే")
        if order.get("status") not in ("paid", "delivered"):
            raise HTTPException(400, "Order paid కాకపోతే shortlist పంపలేరు — ముందుగా UTR/payment verify చేయండి")
        if order.get("status") == "delivered" and set(ids) != set(order.get("profile_ids", [])):
            raise HTTPException(409, "Delivered order లో shortlisted profile list మార్చలేరు")
        if order.get("status") == "paid":
            order_before = copy.deepcopy(order)
            order["profile_ids"] = ids
            order["via"] = [via]
            if not S12._persist():
                order.clear()
                order.update(order_before)
                raise HTTPException(503, "Assisted shortlist could not be saved safely. Please try again.")

    try:
        res = await S12.deliver_personal(buyer, sanitize_public_payload(targets), via=via, order_id=order_id)
    except ValueError as exc:
        raise HTTPException(422, sanitize_public_text(str(exc)))
    if role != "owner":
        telegram_result = res.get("telegram") if isinstance(res.get("telegram"), dict) else {}
        whatsapp_result = res.get("whatsapp") if isinstance(res.get("whatsapp"), dict) else {}
        res = {
            "ok": bool(res.get("ok")),
            "via": str(res.get("via", via)),
            "messages": int(res.get("messages", 0) or 0),
            "telegram": {"wanted": bool(telegram_result.get("wanted")),
                         "sent": int(telegram_result.get("sent", 0) or 0),
                         "failed": "delivery_unconfirmed" if telegram_result.get("failed") else ""},
            "whatsapp": {"wanted": bool(whatsapp_result.get("wanted")),
                         "queued": int(whatsapp_result.get("queued", 0) or 0),
                         "failed": "delivery_unconfirmed" if whatsapp_result.get("failed") else ""},
            "copy_list": sanitize_public_text(res.get("copy_list", "")),
            "message_telugu": sanitize_public_text(res.get("message_telugu", "")),
            "recipient_details_visible": False,
        }
    if order_id and res.get("ok"):
        order = S12.get_order(order_id)
        delivered_before = copy.deepcopy(order)
        order["status"] = "delivered"
        order["delivered_at"] = S12._now_iso()
        if not S12._persist():
            order.clear()
            order.update(delivered_before)
            raise HTTPException(503, "Assisted delivery status could not be saved safely. Please contact support before retrying.")
    MAUD.audit("assisted_shortlist_delivery", role, {
        "buyer_id": buyer["tsap_id"], "profile_ids": ids, "order_id": order_id,
        "delivery_ok": bool(res.get("ok")), "contact_access": "owner_acceptance_required",
    })
    res.update({"success": True, "buyer_id": buyer["tsap_id"], "shortlisted_count": len(ids),
                "contact_access": "owner_acceptance_required", "order_id": order_id, "role": role,
                "recipient_details_visible": role == "owner",
                "delivery_status": "sent_or_queued" if res.get("ok") else "preview_or_delivery_unavailable"})
    return res


@app.post("/api/admin/link-telegram")
def api_admin_link_tg(payload: dict, request: Request):
    """🔗 Admin manual link — buyer /myid chepthe ఇక్కడ link (DM delivery కోసం)."""
    require_admin(request)
    d = payload or {}
    u = _find_user(str(d.get("buyer_id", "")).upper())
    if not u:
        raise HTTPException(404, "Buyer ID dorakaledu")
    u["telegram_chat_id"] = str(d.get("chat_id", ""))
    u["telegram_linked_at"] = datetime.utcnow().isoformat()
    return {"success": True, "tsap_id": u["tsap_id"], "telegram_chat_id": u["telegram_chat_id"],
            "message_telugu": "✅ Telegram link అయ్యింది — personal DM ready"}


# ============================================================================
# 🪐 WAVE 13 — ASTROLOGY EVIDENCE (Jathakam upload + review status)
# ============================================================================
@app.get("/api/astro/guna")
def api_guna(bride_id: str = "", groom_id: str = ""):
    """Return an honest unavailable state instead of a profile-field score.

    The old endpoint calculated 36-guna from editable star/rasi fields. Those
    fields are not a complete, verified birth chart, so a live request must not
    turn them into a score or verdict. The pure reference tables remain in the
    module for historical/test tooling, but this product endpoint is fail-closed.
    """
    a = _find_user(bride_id.upper()) if bride_id else None
    b = _find_user(groom_id.upper()) if groom_id else None
    if not a or not b:
        raise HTTPException(404, "రెండు profile IDs ఇవ్వండి (bride_id + groom_id)")
    if a.get("gender") == "Groom" and b.get("gender") == "Bride":
        bride, groom = b, a
    elif a.get("gender") == "Bride" and b.get("gender") == "Groom":
        bride, groom = a, b
    else:
        raise HTTPException(400, "Bride + Groom రెండు వేరు genders ayi ఉండాలి")
    bride_state = AST.jathakam_status(bride.get("tsap_id", ""))
    groom_state = AST.jathakam_status(groom.get("tsap_id", ""))
    return {
        "available": False,
        "calculation_available": False,
        "status": "jathakam_review_required",
        "bride_id": bride.get("tsap_id"), "groom_id": groom.get("tsap_id"),
        "evidence": {"bride": bride_state.get("state"), "groom": groom_state.get("state")},
        "reason_en": "No 36-guna result is generated from member-entered star/rasi fields. Submit both real horoscope documents and obtain an appropriate professional review first.",
        "reason": "సభ్యులు నమోదు చేసిన star/rasi వివరాల నుంచి 36-guna ఫలితం తయారు చేయము. ఇద్దరి నిజమైన జాతక పత్రాలను సమర్పించి తగిన professional review పొందండి.",
    }


@app.get("/api/astro/report/download")
def api_download_astro_report(bride_id: str = "", groom_id: str = "", bride_star: str = "", bride_rasi: str = "", groom_star: str = "", groom_rasi: str = ""):
    """Retired: no PDF is generated from incomplete or unverified horoscope data."""
    raise HTTPException(410, "Porutham PDF is unavailable until an appropriate real-chart review exists")

def _astro_profile_or_404(tsap_id: str, request: Request = None) -> Dict:
    """Astrology routes expose only active public profiles or the authenticated owner's own record."""
    u = _find_user(str(tsap_id or "").strip().upper())
    if not u or _is_synthetic_profile(u):
        raise HTTPException(404, "Profile dorakaledu")
    identity = token_from_request(request) if request else None
    viewer_id = str((identity or {}).get("tsap_id", "")).strip().upper()
    owner_id = str(u.get("tsap_id", "")).strip().upper()
    if viewer_id != owner_id:
        if not _is_approved_profile(u) or (viewer_id and safety.is_blocked(viewer_id, owner_id, DB_BLOCKS)):
            raise HTTPException(404, "Active approved profile not found")
    return u


@app.get("/api/astro/dosha/{tsap_id}")
def api_dosha(tsap_id: str, request: Request = None):
    """Return pending/unavailable state; never infer dosha from profile fields."""
    u = _astro_profile_or_404(tsap_id, request)
    evidence = AST.jathakam_status(u["tsap_id"])
    return {
        "success": True, "available": False, "calculation_available": False,
        "status": "jathakam_review_required", "tsap_id": u["tsap_id"],
        "evidence_state": evidence.get("state"), "flags": [], "verdict_telugu": "",
        "message_en": "No dosha screening is generated from unverified profile fields. A real chart and qualified review are required.",
        "message_telugu": "Verify కాని profile వివరాల నుంచి dosha screening తయారు చేయము. నిజమైన chart మరియు qualified review అవసరం.",
    }


@app.get("/api/astro/chart/{tsap_id}")
def api_astro_chart(tsap_id: str, request: Request = None):
    """Return evidence status, never a star/rasi-only chart."""
    u = _astro_profile_or_404(tsap_id, request)
    evidence = AST.jathakam_status(u["tsap_id"])
    return {
        "success": False, "available": False, "calculation_available": False,
        "status": "jathakam_review_required", "tsap_id": u["tsap_id"],
        "evidence_state": evidence.get("state"), "style": None, "houses": [],
        "message_en": "A complete chart is unavailable. Member-entered star/rasi fields are not converted into a horoscope.",
        "message_telugu": "పూర్తి chart అందుబాటులో లేదు. సభ్యులు నమోదు చేసిన star/rasi వివరాలను జాతకంగా మార్చము.",
        "note_en": "Upload the real document from the owner account; missing birth time, place, lagna, and planetary positions are never guessed.",
        "note_telugu": "Owner account నుంచి నిజమైన పత్రాన్ని upload చేయండి; లేని birth time, place, lagna, గ్రహస్థానాలను ఊహించము.",
    }


@app.post("/api/astro/jathakam/upload")
async def api_jathakam_upload(file: UploadFile = File(...), tsap_id: str = Form(""), request: Request = None):
    """📜 Jathakam upload (photo/PDF, max 8MB) → pandit queue."""
    u = _find_user(tsap_id.strip().upper())
    if not u:
        raise HTTPException(404, "TSAP ID దొరకలేదు — ముందు register")
    require_owner(request, u["tsap_id"])  # 🌊 WAVE 23 — vere vaalla jathakam vaddu
    ext = (file.filename or "").split(".")[-1].lower()
    if ext not in {"jpg", "jpeg", "png", "webp", "pdf"}:
        raise HTTPException(400, "Jathakam photo (JPG/PNG) leda PDF మాత్రమే")
    data = await file.read(8 * 1024 * 1024 + 1)
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(413, "File 8MB kanna ఎక్కువ — compress చేసి పంపండి")
    if len(data) < 1024:
        raise HTTPException(400, "File khaali — మళ్లీ upload చెయ్యండి")
    os.makedirs(JATHAKAM_MEDIA_DIR, exist_ok=True)
    name = f"{u['tsap_id']}-{datetime.utcnow().strftime('%y%m%d%H%M%S')}-{secrets.token_hex(4)}.{ext}"
    atomic_write_bytes(os.path.join(JATHAKAM_MEDIA_DIR, name), data)
    j = AST.submit_jathakam(u["tsap_id"], name, "pdf" if ext == "pdf" else "photo")
    if not j.get("success"):
        try:
            os.remove(os.path.join(JATHAKAM_MEDIA_DIR, name))
        except OSError:
            pass
        raise HTTPException(503, j.get("message_telugu", "Jathakam could not be saved safely."))
    return {"success": True, "jathakam_id": j["id"],
            "state": "pending_review", "calculation_available": False,
            "message_en": f"The horoscope document was received ({j['id']}) and is pending review.",
            "message_telugu": f"✅ Jathakam వచ్చింది ({j['id']}) — pandit verify chesaka 🪐 badge వస్తుంది 🙏"}


@app.get("/api/astro/jathakam/{tsap_id}")
def api_jathakam_status(tsap_id: str, request: Request = None):
    """Owner-only evidence state; never returns a generated chart or result."""
    u = _find_user(tsap_id.strip().upper())
    if not u:
        raise HTTPException(404, "Profile dorakaledu")
    require_owner(request, u["tsap_id"])
    return AST.jathakam_status(u["tsap_id"])


@app.get("/api/admin/astro/queue")
def api_astro_queue(request: Request, status: str = ""):
    require_admin(request)
    items = [j for j in AST.JATHAKAMS if not status or j.get("status") == status]
    return {"success": True, "count": len(items), "items": list(reversed(items))}


@app.get("/api/admin/astro/queue/{jid}/file")
def api_astro_jathakam_file(jid: str, request: Request):
    """📜 Admin/pandit: securely retrieve an uploaded jathakam file for review.
    🐞 FIX (completeness gap): jathakam upload stored the file but there was no way
    for the pandit/admin to actually view it before verify/reject — admin-gated here,
    filename is looked up server-side (never taken from the client), path-traversal safe."""
    require_admin(request)
    j = next((x for x in AST.JATHAKAMS if x.get("id") == jid), None)
    if not j:
        raise HTTPException(404, "Jathakam దొరకలేదు")
    filename = os.path.basename(str(j.get("file", "")))
    if not filename:
        raise HTTPException(404, "Jathakam file దొరకలేదు")
    path = _media_file(JATHAKAM_MEDIA_DIR, filename)
    if not os.path.isfile(path):
        raise HTTPException(404, "Jathakam file disk మీద దొరకలేదు (expired/cleared?)")
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    media = {"pdf": "application/pdf", "jpg": "image/jpeg", "jpeg": "image/jpeg",
             "png": "image/png", "webp": "image/webp"}.get(ext, "application/octet-stream")
    return FileResponse(path, media_type=media, filename=filename,
                         headers={"Cache-Control": "no-store"})


@app.post("/api/admin/astro/verify/{jid}")
def api_astro_verify(jid: str, payload: dict, request: Request):
    require_admin(request)
    d = payload or {}
    queued = next((item for item in AST.JATHAKAMS if item.get("id") == jid), None)
    if not queued:
        raise HTTPException(404, "⚠️ Jathakam దొరకలేదు")
    u = _find_user(queued.get("tsap_id", ""))
    if not u:
        raise HTTPException(404, "Jathakam owner profile not found")
    profile_before = copy.deepcopy(u)
    astro_before = copy.deepcopy(queued)
    res = AST.verify_jathakam(jid, req_bool(d.get("ok", True)), str(d.get("note", "")))
    if not res.get("success"):
        raise HTTPException(503 if "safely" in str(res.get("message_telugu", "")).lower() else 404,
                            res.get("message_telugu"))
    j = res["jathakam"]
    u["jathakam_verified"] = (j["status"] == "verified")
    if not _persist_core_state():
        u.clear()
        u.update(profile_before)
        queued.clear()
        queued.update(astro_before)
        # AST was committed before the profile store. Restore that record so a
        # failed cross-store commit cannot advertise a verification badge.
        AST._persist()
        raise HTTPException(503, "Jathakam verification could not be saved safely. Please try again.")
    return res


@app.get("/api/admin/astro/stats")
def api_astro_stats(request: Request):
    require_admin(request)
    return {"success": True, **AST.astro_stats(DB_USERS)}


# ============================================================================
# 📢 WAVE 13 — VENDOR ADS (campaigns + targeting + slots)
# ============================================================================
@app.get("/api/ads/rates")
def api_ads_rates():
    """💰 Public ad rates (vendor ki mundhe telustundi)."""
    return {"success": True, "rates": ADS.RATES, "slots": ADS.SLOTS, "slot_telugu": ADS.SLOT_TE}


@app.post("/api/ads/quote")
def api_ads_quote(payload: dict):
    d = payload or {}
    q = ADS.quote(str(d.get("level", "")), int(d.get("days", 0) or 0),
                  d.get("districts") or [], d.get("slots") or [], bool(d.get("video_url")))
    if not q.get("ok"):
        return JSONResponse(status_code=400, content={"success": False, **q})
    return {"success": True, **q}


@app.get("/api/ads")
def api_ads_serve(slot: str = "matches_sidebar", district: str = "", state: str = ""):
    """🎯 Targeted ad serve (slot + user district/state). No ad → house promo signal."""
    return ADS.serve(slot, district, state)


@app.post("/api/ads/{cid}/click")
def api_ads_click(cid: str):
    return ADS.track_click(cid)


@app.post("/api/vendors/{vendor_id}/campaigns")
def api_vendor_campaign_create(vendor_id: str, payload: dict, request: Request):
    """📢 Vendor campaign request (payment + admin approve తర్వాత live)."""
    require_vendor(request, vendor_id)
    import vendors as VND
    v = next((x for x in VND.VENDORS if x.get("id") == vendor_id), None)
    if not v:
        raise HTTPException(404, "Vendor dorakaledu")
    d = payload or {}
    res = ADS.create_campaign(vendor_id, str(d.get("title", "")), str(d.get("level", "")),
                              int(d.get("days", 0) or 0), d.get("districts") or [],
                              str(d.get("state", "")), d.get("slots") or [],
                              str(d.get("image_url", "")), str(d.get("banner_url", "")),
                              str(d.get("video_url", "")), str(d.get("offer", "")),
                              str(d.get("link", "")))
    if not res.get("success"):
        return JSONResponse(status_code=400, content=res)
    return res


@app.get("/api/vendors/{vendor_id}/campaigns")
def api_vendor_campaigns(vendor_id: str, request: Request):
    require_vendor(request, vendor_id)
    items = ADS.vendor_campaigns(vendor_id)
    return {"success": True, "count": len(items),
            "campaigns": list(reversed(items)),
            "totals": {"impressions": sum(int(c.get("impressions", 0) or 0) for c in items),
                       "clicks": sum(int(c.get("clicks", 0) or 0) for c in items),
                       "spent": sum(int(c.get("amount", 0) or 0) for c in items if c.get("utr"))}}


@app.get("/api/admin/ads")
def api_admin_ads(request: Request, status: str = ""):
    require_admin(request)
    items = [c for c in ADS.CAMPAIGNS if not status or c.get("status") == status]
    return {"success": True, "count": len(items), "campaigns": list(reversed(items))}


@app.post("/api/admin/ads/{cid}/approve")
def api_admin_ads_approve(cid: str, payload: dict, request: Request):
    require_admin(request)
    d = payload or {}
    res = ADS.approve_campaign(cid, str(d.get("utr", "")), int(d.get("days", 0) or 0))
    if not res.get("success"):
        raise HTTPException(400, res.get("message_telugu"))
    return res


@app.post("/api/admin/ads/{cid}/action")
def api_admin_ads_action(cid: str, payload: dict, request: Request):
    require_admin(request)
    d = payload or {}
    res = ADS.campaign_action(cid, str(d.get("action", "")), str(d.get("reason", "")))
    if not res.get("success"):
        raise HTTPException(400, res.get("message_telugu"))
    return res


@app.get("/api/admin/ads/stats")
def api_admin_ads_stats(request: Request):
    require_admin(request)
    return {"success": True, **ADS.ads_stats()}


# ============================================================================
#  🌊 WAVE 14 — META (religion→caste) + SAFE-PAY (Razorpay) + FESTIVAL OFFERS
# ============================================================================
@app.get("/api/meta/religions")
def api_meta_religions():
    return {"success": True, "religions": MP.RELIGIONS}


@app.get("/api/meta/castes")
def api_meta_castes(religion: str = "Hindu"):
    info = MP.castes_for(religion)
    return {"success": True, **info, "allow_custom": True, "is_exhaustive": False,
            "note": "Community labels are optional aids, not an official exhaustive classification. Self-described names are accepted.",
            "message_telugu": f"🙏 {info['religion']} — {len(info['castes'])} supported options (A–Z); custom names accepted"}


@app.get("/api/meta/subcastes")
def api_meta_subcastes(religion: str = "Hindu", caste: str = ""):
    """Parent-dependent subcommunity labels with an explicit self-description path."""
    info = MP.castes_for(religion)
    selected = str(caste or "").strip()
    if selected and selected not in info["castes"] and selected != "Other / self-described":
        raise HTTPException(400, "Choose a community from the selected religion first")
    values = community_subcastes_for(info["religion"], selected)
    if selected and selected != "Other / self-described":
        values = sorted(set([*values, "Other / self-described"]), key=lambda value: (value.casefold(), value))
    return {
        "success": True,
        "religion": info["religion"],
        "caste": selected,
        "subcastes": values,
        "allow_custom": True,
        "is_exhaustive": False,
        "note": "Optional community-reported labels only; use a self-description when the correct label is not listed.",
    }


@app.get("/api/meta/home-stats")
def api_meta_home_stats():
    """Homepage aggregates use public listings and current plans; hidden operator rows stay internal."""
    ch = public_channel_stats()
    by_tier = ch.get("by_tier", {}) or {}
    plans = [{"code": p.get("code"), "price": p.get("price"), "profiles": p.get("profiles"),
              "label": p.get("label"), "telugu": p.get("telugu"), "badge": p.get("badge")}
             for p in plan_list_with_free()]
    _stats = real_platform_stats()
    return {"success": True,
            "channels_total": ch.get("total", 0), "channels_routing_eligible": ch.get("routing_eligible", 0),
            "channels_by_tier": by_tier,
            "castes_covered": len(MP.castes_for("Hindu").get("castes", [])),
            # 🛡️ HONEST live numbers — homepage/hero/trust-band ee values chupistundi
            # (10,000+ constant kaadu). Frontend `useLiveStats()` idi consume chestundi.
            "profiles_count": _stats.get("profiles_count", 0),
            "brides_count": _stats.get("brides_count", 0),
            "grooms_count": _stats.get("grooms_count", 0),
            "profiles_with_recorded_check": _stats.get("profiles_with_recorded_check", 0),
            "profiles_with_phone_otp": _stats.get("profiles_with_phone_otp", 0),
            "profiles_with_photo_review": _stats.get("profiles_with_photo_review", 0),
            "profiles_with_id_review": _stats.get("profiles_with_id_review", 0),
            "recorded_check_percentage": _stats.get("recorded_check_percentage", 0),
            "verification_scope": _stats.get("verification_scope", "Recorded checks only; no identity guarantee."),
            "districts_with_profiles": _stats.get("districts_with_profiles", 0),
            "castes_with_profiles": _stats.get("castes_with_profiles", 0),
            "interests_sent": _stats.get("interests_sent", 0),
            "stats_are_live": True,
            "free_first": 3,
            "plans": plans,
            "addons": [{"code": a.get("code"), "price": a.get("price"),
                        "label": a.get("label"), "telugu": a.get("telugu")}
                       for a in addon_list()],
            "renewal": {"price": renewal_offer().get("price"),
                        "profiles": renewal_offer().get("profiles")},
            "bureau": bureau_list(),
            "referral": {"per_pay": FIRST_PAY_COMMISSION,
                         "milestones": [{"paid": m.get("paid"), "title": m.get("title"),
                                         "telugu": m.get("telugu")}
                                        for m in REFERRAL_MILESTONES]},
            "message_telugu": "✅ Homepage numbers అన్నీ live — backend నుంచి"}


@app.get("/api/health")
def api_health():
    """🌊 WAVE 26 — EASY debug: server live? data ok? workers on? (no secrets)."""
    try:
        import publisher as _PUB
        wa_q = len(getattr(_PUB, "WA_QUEUE", []) or [])
    except Exception:
        wa_q = -1
    return {"success": True, "service": "manavivaha-api", "version": "2.0-w26",
            "time": datetime.utcnow().isoformat(),
            "pay_mode": PP.pay_config().get("mode", ""),
            "counts": {"users": len(DB_USERS), "interests": len(DB_INTERESTS),
                       "payments": len(DB_PAYMENTS), "orders": len(PP.PAY_ORDERS)},
            "wa_queue": wa_q,
            "message_telugu": "✅ Server bane ఉంది"}


@app.get("/api/admin/audit")
def api_admin_audit(request: Request, event: str = "", limit: int = 100, since: str = ""):
    """🌊 WAVE 26 — Money audit trail (admin): approve/pay/payout/refund history."""
    require_admin(request)
    items = MAUD.read_audit(event=(event or "").strip(), limit=limit, since=(since or "").strip())
    return {"success": True, "count": len(items), "events": items,
            "message_telugu": f"🧾 {len(items)} audit records"}


@app.get("/api/pay/config")
def api_pay_config():
    """Public: Razorpay key_id (publishable) + plans + active offers. Secret NEVER."""
    return {"success": True, **PP.pay_config(), "plans": plan_list_with_free(),
            "offers": PP.active_offers()}


@app.post("/api/pay/order")
def api_pay_order(payload: dict, request: Request):
    """Create pay order — amount SERVER computes (client amount trust cheyyam)."""
    d = payload or {}
    tsap = str(d.get("tsap_id", "")).upper()
    require_owner(request, tsap)  # 🛡️ WAVE 25: vere vaalla peruna orders vaddu
    if not _find_user(tsap):  # 🌊 WAVE 34: fail fast — user lekapothe dangling paid order vaddu
        raise HTTPException(404, "⚠️ User దొరకలేదు — ముందు register చెయ్యండి")
    res = PP.create_pay_order(tsap, str(d.get("purpose", "credits")),
                              str(d.get("ref", "")), str(d.get("offer_code", "") or ""))
    if not res.get("success"):
        raise HTTPException(400, res.get("message_telugu"))
    return res


@app.post("/api/pay/verify")
def api_pay_verify(payload: dict, request: Request):
    """Razorpay verify → signature OK అయితే ONLY fulfill. Idempotent."""
    d = payload or {}
    oid = str(d.get("order_id", "") or d.get("pay_order_id", ""))
    po = PP.get_pay_order(oid)
    if po:
        require_owner(request, po.get("tsap_id", ""))  # 🛡️ WAVE 25: mee order ke verify
    res = PP.verify_payment(oid,
                            str(d.get("razorpay_order_id", "")), str(d.get("razorpay_payment_id", "")),
                            str(d.get("razorpay_signature", "")))
    if not res.get("success"):
        raise HTTPException(400, res.get("message_telugu"))
    if not res.get("duplicate"):
        _rc = res.get("receipt", {}) or {}
        MAUD.audit("pay_verified", str(_rc.get("tsap_id", "") or (po.get("tsap_id", "") if po else "")),
                   {"order_id": oid, "payment_id": _rc.get("payment_id", ""), "amount": _rc.get("amount")})
        _persist_core_state()
    return res


@app.get("/api/pay/status/{order_id}")
def api_pay_status(order_id: str, request: Request):
    po = PP.get_pay_order(order_id)
    if not po:
        raise HTTPException(404, "Order dorakaledu")
    require_owner(request, po.get("tsap_id", ""))  # 🛡️ WAVE 25: order enum + UTR scrape ban
    safe = {k: v for k, v in po.items() if k not in ("signature", "payment_id")}
    return {"success": True, "order": safe}


@app.post("/api/pay/claim")
def api_pay_claim(payload: dict, request: Request):
    """🌊 WAVE 25 — USER submits UTR in-app (claim ≠ confirm — admin verifies statement)."""
    d = payload or {}
    oid = str(d.get("order_id", "") or d.get("pay_order_id", ""))
    po = PP.get_pay_order(oid)
    if not po:
        raise HTTPException(404, "Order dorakaledu")
    require_owner(request, po.get("tsap_id", ""))
    res = PP.claim_utr(oid, po.get("tsap_id", ""), str(d.get("utr", "") or ""))
    if not res.get("success"):
        raise HTTPException(400, res.get("message_telugu"))
    return res


@app.post("/api/pay/webhook")
async def api_pay_webhook(request: Request):
    """🌊 WAVE 25 — Razorpay webhook: HMAC verify → auto-fulfill (signature = auth)."""
    raw = await request.body()
    sig = request.headers.get("X-Razorpay-Signature", "")
    if not PP.verify_webhook_signature(raw, sig):
        raise HTTPException(401, "Bad webhook signature")
    try:
        event = json.loads(raw.decode("utf-8") or "{}")
    except Exception:
        raise HTTPException(400, "Bad webhook body")
    res = PP.handle_razorpay_webhook(event)
    if res.get("ok") and not res.get("duplicate") and not res.get("ignored"):
        _rc = res.get("receipt", {}) or {}
        MAUD.audit("webhook_fulfilled", "razorpay", {"order_id": _rc.get("pay_order_id", ""),
                                                     "payment_id": _rc.get("payment_id", ""),
                                                     "amount": _rc.get("amount")})
        _persist_core_state()
    return {"success": bool(res.get("ok")), **res}


@app.get("/api/admin/payments")
def api_admin_payments(request: Request, status: str = ""):
    require_admin(request)
    items = [o for o in PP.PAY_ORDERS if not status or o.get("status") == status]
    return {"success": True, "count": len(items), "orders": list(reversed(items)),
            "stats": PP.pay_stats()}


@app.post("/api/admin/payments/{order_id}/confirm")
def api_admin_pay_confirm(order_id: str, payload: dict, request: Request):
    """Manual-UPI fallback: admin UTR verify చేసి confirm → fulfill."""
    require_admin(request)
    res = PP.confirm_manual(order_id, str((payload or {}).get("utr", "")))
    if not res.get("success"):
        raise HTTPException(400, res.get("message_telugu"))
    if not res.get("duplicate"):
        _rc = res.get("receipt", {}) or {}
        MAUD.audit("pay_confirmed", "admin", {"order_id": order_id, "utr": _rc.get("utr", ""),
                                              "amount": _rc.get("amount"), "tsap_id": _rc.get("tsap_id", "")})
        _persist_core_state()
    return res


@app.post("/api/admin/payments/{order_id}/refund")
def api_admin_pay_refund(order_id: str, payload: dict, request: Request):
    """WAVE 34 PREMIUM - REAL refund: Razorpay API (auto) leda manual-UPI (note+proof).
    Money back + benefits reverse (credits/boost/campaign/assist) + commission clawback."""
    require_admin(request)
    d = payload or {}
    res = PP.refund_order(order_id, str(d.get("reason", "") or ""), str(d.get("note", "") or ""))
    if not res.get("success"):
        raise HTTPException(400, res.get("message_telugu"))
    if not res.get("duplicate"):
        MAUD.audit("pay_refunded", "admin", {"order_id": order_id, "refund_id": res.get("refund_id", ""),
                                             "via": res.get("via", ""), "reversed": res.get("reversed", [])})
        _persist_core_state()
    return res


# ============================================================================
# WAVE 35 - ADMIN OPS (profiles queue + ban + stories queue)
# ============================================================================
@app.get("/api/admin/profiles")
def api_admin_profiles(
    request: Request,
    status: str = "pending",
    q: str = "",
    paid_status: str = "all",
    date_filter: str = "all",
    start_date: str = "",
    end_date: str = "",
    limit: int = 30,
    offset: int = 0,
):
    """ADMIN-ONLY profile queue — with date filtering, paid/unpaid status, and WhatsApp follow-up conversion."""
    require_admin(request, staff_ok=True)
    status = (status or "pending").strip().lower()
    if status not in ("pending", "approved", "banned", "all"):
        raise HTTPException(400, "status: pending/approved/banned/all")
    limit = clamp_int(limit, "limit", 1, 100, 30)
    offset = clamp_int(offset, "offset", 0, 100000, 0)
    items = list(DB_USERS)

    if status == "pending":
        items = [u for u in items if not u.get("is_approved") and not u.get("is_banned")]
    elif status == "approved":
        items = [u for u in items if u.get("is_approved") and not u.get("is_banned")]
    elif status == "banned":
        items = [u for u in items if u.get("is_banned")]

    # Paid vs Unpaid filter
    paid_status = (paid_status or "all").strip().lower()
    if paid_status == "paid":
        items = [u for u in items if str(u.get("plan", "FREE")).upper() not in ("FREE", "") or int(u.get("credits", 0) or 0) > 3]
    elif paid_status == "unpaid":
        items = [u for u in items if str(u.get("plan", "FREE")).upper() in ("FREE", "") and int(u.get("credits", 0) or 0) <= 3]

    # Date Filtering (Today / Yesterday / 7 Days / Custom Range)
    now_ist = datetime.utcnow() + timedelta(hours=5, minutes=30)
    today_ist = now_ist.strftime("%Y-%m-%d")
    today_utc = datetime.utcnow().strftime("%Y-%m-%d")
    yesterday_ist = (now_ist - timedelta(days=1)).strftime("%Y-%m-%d")
    week_ago_ist = (now_ist - timedelta(days=7)).strftime("%Y-%m-%d")

    date_filter = (date_filter or "all").strip().lower()
    if date_filter == "today":
        items = [u for u in items if str(u.get("created_at", ""))[:10] in (today_ist, today_utc)]
    elif date_filter == "yesterday":
        items = [u for u in items if str(u.get("created_at", ""))[:10] == yesterday_ist]
    elif date_filter == "7d":
        items = [u for u in items if str(u.get("created_at", ""))[:10] >= week_ago_ist]
    elif date_filter == "range" and (start_date or end_date):
        if start_date:
            items = [u for u in items if str(u.get("created_at", ""))[:10] >= start_date[:10]]
        if end_date:
            items = [u for u in items if str(u.get("created_at", ""))[:10] <= end_date[:10]]

    if q.strip():
        ql = q.strip().lower()
        items = [u for u in items if ql in str(u.get("tsap_id", "")).lower() or ql in str(u.get("full_name", "")).lower()
                 or ql in str(u.get("phone", "")) or ql in str(u.get("caste", "")).lower()
                 or ql in str(u.get("district", "")).lower()]

    items.sort(key=lambda u: str(u.get("created_at", "")), reverse=(status != "pending"))
    total = len(items)
    rows = []
    for u in items[offset:offset + limit]:
        ph = u.get("phone", "")
        fn = u.get("full_name", "గారు")
        plan_name = u.get("plan", "FREE")
        is_paid = str(plan_name).upper() not in ("FREE", "") or int(u.get("credits", 0) or 0) > 3
        
        # Follow-up WhatsApp pre-filled text
        wa_text = f"నమస్తే {fn} గారు, మన వివాహ లో మీ ప్రొఫైల్ ({u.get('tsap_id')}) నమోదు చేయబడింది. మీ profile details review చేయండి: https://manavivaha.in/matches. వివరాలు సభ్యులు అందించినవి; స్వతంత్రంగా నిర్ధారించండి."
        wa_followup = f"https://wa.me/91{ph}?text={quote(wa_text)}" if ph else ""

        rows.append({"tsap_id": u.get("tsap_id"), "full_name": u.get("full_name"), "gender": u.get("gender"),
                     "age": u.get("age"), "caste": u.get("caste"), "district": u.get("district"), "state": u.get("state"),
                     "phone": ph, "phone_verified": bool(u.get("phone_verified")),
                     "photo_verified": bool(u.get("selfie_verified") or u.get("photo_status") == "approved"),
                     "verification_level": safety.verification_badge(u)["level"],
                     "is_verified": safety.has_verification_evidence(u), "id_verified": bool(u.get("id_verified")),
                     "id_verification_method": u.get("id_verification_method", ""),
                     "id_verified_at": u.get("id_verified_at", ""), "is_approved": bool(u.get("is_approved")),
                     "is_banned": bool(u.get("is_banned")), "warnings": int(u.get("warnings", 0) or 0),
                     "credits": u.get("credits", 0), "plan": plan_name, "is_paid_member": is_paid,
                     "has_photo": bool(u.get("photo_urls")), "photo_status": u.get("photo_status", "none"),
                     "created_at": u.get("created_at", ""), "card_url": u.get("card_url", ""),
                     "wa_followup_url": wa_followup})

    return {"success": True, "status": status, "total": total, "count": len(rows), "offset": offset, "limit": limit,
            "paid_status": paid_status, "date_filter": date_filter,
            "profiles": rows,
            "message_telugu": "👥 %d profiles (%s • %s)" % (total, status, paid_status)}


@app.post("/api/admin/manual-plan-activate")
def api_admin_manual_plan_activate_body(payload: dict, request: Request):
    """ADMIN - Manual plan activation alias with payload body."""
    data = payload or {}
    tsap_id = str(data.get("tsap_id") or data.get("id") or "").strip()
    if not tsap_id:
        raise HTTPException(400, "tsap_id is required in payload")
    return api_admin_activate_plan(tsap_id, data, request)


@app.post("/api/admin/profiles/{tsap_id}/activate-plan")
def api_admin_activate_plan(tsap_id: str, payload: dict, request: Request):
    """Compatibility alias for the audited current-plan grant workflow.

    The old endpoint accepted arbitrary plan IDs, client-chosen credits, and a
    missing payment proof. Keep the URL for existing operators, but route it
    through the same bounded accounting path as the control portal.
    """
    require_admin(request, staff_ok=False)
    data = payload or {}
    legacy_map = {
        "SAMBANDHAM_99": "S_99",
        "VIP_199": "S_199",
        "PREMIUM_499": "S_499",
    }
    requested_plan = str(data.get("plan_id") or data.get("plan") or "").strip().upper()
    plan_code = legacy_map.get(requested_plan, requested_plan)
    if plan_code not in {"S_99", "S_199", "S_299", "S_499"}:
        raise HTTPException(400, "This legacy URL supports only the current S_99/S_199/S_299/S_499 plans")
    forwarded = dict(data)
    forwarded.update({
        "tsap_id": tsap_id,
        "plan": plan_code,
        "method": data.get("method") or data.get("payment_method") or data.get("payment_mode"),
        "notes": data.get("notes") or data.get("note") or "",
        "utr": data.get("utr") or data.get("payment_proof") or "",
    })
    # api_admin_grant_plan performs the recognized-mode, proof/reason, fixed
    # amount/credit, duplicate-reference, and rollback checks.
    return api_admin_grant_plan(forwarded, request)


@app.post("/api/admin/profiles/{tsap_id}/id-verification")
def api_admin_id_verification(tsap_id: str, payload: dict, request: Request):
    """Manual government-ID review. Stores only the decision metadata, never the ID number/image."""
    require_admin(request, staff_ok=True)
    user = _find_user(str(tsap_id or "").upper())
    if not user:
        raise HTTPException(404, "Profile dorakaledu")
    data = payload or {}
    verified = bool(data.get("verified", True))
    method = str(data.get("method", "government_id") or "government_id").strip().lower()
    if method not in ("government_id", "aadhaar_offline", "passport", "driving_licence", "voter_id", "manual_review"):
        raise HTTPException(400, "Unsupported verification method")
    note = clean(str(data.get("note", "") or ""), 160)
    now = datetime.utcnow().isoformat()
    user["id_verified"] = verified
    user["id_verification_method"] = method if verified else ""
    user["id_verified_at"] = now if verified else ""
    user["id_verified_by"] = "admin" if verified else ""
    # No document identifiers or images are persisted by this action.
    MAUD.audit("id_verified" if verified else "id_verification_revoked", "admin",
               {"tsap_id": user.get("tsap_id"), "method": method, "note": note})
    DBSTORE.save(DBSTORE.snapshot(DB_USERS, DB_INTERESTS, DB_PAYMENTS, DB_OTPS,
                                  VERIFIED_PHONES, DB_VIEWS, DB_SAVES, DB_DIGEST), force=True)
    return {"success": True, "tsap_id": user.get("tsap_id"), "id_verified": verified,
            "method": user.get("id_verification_method", ""), "verified_at": user.get("id_verified_at", ""),
            "message_telugu": ("🪪 Government ID review status recorded; other profile details are not verified by this check." if verified
                                else "Government ID review status revoked")}


@app.post("/api/admin/profiles/{tsap_id}/ban")
def api_admin_ban(tsap_id: str, payload: dict, request: Request):
    """ADMIN - profile ban (search/matches/channels నుంచి పోతుంది) + audit."""
    require_admin(request, staff_ok=True)
    u = _find_user(tsap_id.upper())
    if not u:
        raise HTTPException(404, "Profile dorakaledu")
    u["is_banned"] = True
    u["is_approved"] = False
    u["banned_at"] = datetime.utcnow().isoformat()
    u["banned_reason"] = str((payload or {}).get("reason", "") or "")[:200]
    MAUD.audit("profile_ban", "admin", {"tsap_id": u["tsap_id"], "reason": u["banned_reason"]})
    return {"success": True, "tsap_id": u["tsap_id"], "banned": True,
            "message_telugu": "\u26D4 %s ban - search/matches/channels నుంచి పోతుంది" % u["tsap_id"]}


@app.post("/api/admin/profiles/{tsap_id}/unban")
def api_admin_unban(tsap_id: str, request: Request):
    """ADMIN - unban + approve (malli live) + audit."""
    require_admin(request, staff_ok=True)
    u = _find_user(tsap_id.upper())
    if not u:
        raise HTTPException(404, "Profile dorakaledu")
    u["is_banned"] = False
    u["is_approved"] = True
    u["unbanned_at"] = datetime.utcnow().isoformat()
    MAUD.audit("profile_unban", "admin", {"tsap_id": u["tsap_id"]})
    return {"success": True, "tsap_id": u["tsap_id"], "banned": False,
            "message_telugu": "\u2705 %s unban + approve - malli live" % u["tsap_id"]}


@app.get("/api/admin/stories")
def api_admin_stories(request: Request, status: str = "pending", limit: int = 50):
    """ADMIN - user success stories queue (approve -> /stories page + channels)."""
    require_admin(request)
    status = (status or "").strip().lower()
    if status and status not in ("pending", "approved", "rejected"):
        raise HTTPException(400, "status: pending/approved/rejected (khali = anni)")
    limit = clamp_int(limit, "limit", 1, 200, 50)
    items = [s for s in A11.STORIES if not status or s.get("status") == status]
    items = list(reversed(items[-limit:]))
    return {"success": True, "status": status or "all", "count": len(items), "stories": items,
            "message_telugu": "\U0001F491 %d stories (%s)" % (len(items), status or "all")}


# ============================================================================
# WAVE 38 — OWNER DASHBOARD (business numbers: revenue + funnel + system)
# ============================================================================
@app.get("/api/owner/summary")
def api_owner_summary(request: Request):
    """👑 Owner business summary — ADMIN KEY ONLY (revenue/funnel/system).
    Prathi section defensive (okati fail ayina migathavi vastayi — never 500)."""
    require_admin(request)
    out: dict = {"success": True, "at": datetime.utcnow().isoformat()}
    try:
        ps = PP.pay_stats()
        paid = [o for o in PP.PAY_ORDERS if o.get("status") == "paid"]
        by_mode: dict = {}
        for o in paid:
            m = str(o.get("mode", "manual_upi") or "manual_upi")
            by_mode[m] = by_mode.get(m, 0) + int(o.get("final_amount", 0) or 0)
        days: dict = {}
        for o in paid:
            d = str(o.get("paid_at", "") or "")[:10] or "unknown"
            days[d] = days.get(d, 0) + int(o.get("final_amount", 0) or 0)
        series = [{"date": k, "collected": v} for k, v in sorted(days.items())[-7:]]
        out["revenue"] = {"orders": ps.get("orders", 0), "paid": ps.get("paid", 0),
                          "pending": ps.get("pending", 0), "refunded": ps.get("refunded", 0),
                          "collected": ps.get("collected", 0), "by_mode": by_mode,
                          "series_7d": series, "offers_live": ps.get("offers_live", 0),
                          "pay_mode": PP.pay_config().get("mode", "")}
    except Exception:
        out["revenue"] = {"orders": 0, "paid": 0, "error": True}
    try:
        users = list(DB_USERS)
        out["users"] = {"total": len(users),
                        "approved": len([u for u in users if u.get("is_approved") and not u.get("is_banned")]),
                        "pending": len([u for u in users if not u.get("is_approved") and not u.get("is_banned")]),
                        "banned": len([u for u in users if u.get("is_banned")]),
                        "brides": len([u for u in users if u.get("gender") == "Bride"]),
                        "grooms": len([u for u in users if u.get("gender") == "Groom"]),
                        "recorded_checks": len([u for u in users if safety.has_verification_evidence(u)]),
                        "nri": len([u for u in users if _is_nri(u)]),
                        "with_photo": len([u for u in users if u.get("photo_urls")]),
                        "with_voice": len([u for u in users if u.get("voice_url")]),
                        "boosted": len([u for u in users if A11.is_boosted(u)]),
                        "credits_out": sum(int(u.get("credits", 0) or 0) for u in users),
                        "wallet_out": sum(int(u.get("wallet", 0) or 0) for u in users)}
    except Exception:
        out["users"] = {"total": 0, "error": True}
    try:
        ins = list(DB_INTERESTS)
        by_st: dict = {}
        for r in ins:
            s = str(r.get("status", "?"))
            by_st[s] = by_st.get(s, 0) + 1
        unlocks = sum(len(v) for v in (S12.UNLOCKS or {}).values()) if isinstance(S12.UNLOCKS, dict) else 0
        out["funnel"] = {"interests": len(ins), "by_status": by_st,
                         "accept_rate": round(100 * by_st.get("accepted", 0) / max(1, len(ins))),
                         "unlocks": unlocks}
    except Exception:
        out["funnel"] = {"interests": 0, "error": True}
    try:
        subs = list(A11.PUSH_SUBS or [])
        streakers = [u for u in DB_USERS if int(u.get("streak_count", 0) or 0) > 0]
        out["engagement"] = {"push_subs": len(subs), "push_queued": len(A11.PUSH_QUEUE or []),
                             "streak_users": len(streakers),
                             "jathakam_pending": len([j for j in (AST.JATHAKAMS or []) if j.get("status") == "pending"])}
    except Exception:
        out["engagement"] = {"push_subs": 0, "error": True}
    try:
        cov = CHAN.coverage()
        out["channels"] = {"by_tier": cov.get("by_tier", {}), "gaps": cov.get("critical_gaps", [])[:8]}
    except Exception:
        out["channels"] = {"by_tier": {}, "error": True}
    try:
        out["referral"] = {"paid_referrals": sum(int((u.get("referral_stats") or {}).get("paid_count", 0) or 0) for u in DB_USERS),
                           "referrers": len([u for u in DB_USERS if int((u.get("referral_stats") or {}).get("paid_count", 0) or 0) > 0])}
    except Exception:
        out["referral"] = {"paid_referrals": 0, "error": True}
    try:
        out["system"] = {"wa_queue": len(WA_QUEUE or []), "dead_letters": len(WA_DEAD or []),
                         "worker": bool(worker_running()),
                         "pay_mode": PP.pay_config().get("mode", ""),
                         "vapid_ready": A11.vapid_delivery_ready(),
                         "telegram_routing_eligible": publish_status().get("telegram", {}).get("routing_eligible_count", 0),
                         "telegram_external_status_checked": False}
    except Exception:
        out["system"] = {"error": True}
    return out


@app.get("/api/pay/qr/{order_id}.png")
def api_pay_qr_png(order_id: str, token: str = ""):
    """Generate a QR only with the per-order capability returned to its owner.

    An order ID is not a secret: it can appear in support messages, browser
    history, or logs. Requiring the high-entropy token prevents unauthenticated
    enumeration of merchant UPI destinations and exact payment amounts.
    """
    import io
    from urllib.parse import urlencode
    import qrcode
    from fastapi.responses import Response

    po = PP.get_pay_order(order_id)
    if not po:
        raise HTTPException(404, "Payment order not found")
    expected_token = str(po.get("qr_token", "") or "")
    if not expected_token or not token or not hmac.compare_digest(token, expected_token):
        raise HTTPException(403, "A valid payment-order QR token is required")
    cfg = PP.pay_config()
    if po.get("mode") != "manual_upi" or not cfg.get("upi_id"):
        raise HTTPException(409, "UPI QR is unavailable for this payment order")
    upi_uri = "upi://pay?" + urlencode({
        "pa": cfg["upi_id"],
        "pn": "Mana Vivaha",
        "am": str(int(po["final_amount"])),
        "cu": "INR",
        "tn": f"ManaVivaha {order_id}",
    })
    qr = qrcode.QRCode(version=1, box_size=8, border=2)
    qr.add_data(upi_uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#7A0C2E", back_color="#FFFDF7")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return Response(content=buf.getvalue(), media_type="image/png")


@app.get("/api/legal/acceptance")
def api_legal_acceptance():
    """Retired: this service does not publish an evidence-backed acceptance certificate."""
    raise HTTPException(
        status_code=410,
        detail="No evidence-backed owner acceptance record is published by this service.",
    )


@app.get("/api/admin/backup/export")
def api_admin_backup_export(request: Request):
    """💾 WAVE 39 — anni data files ZIP download (ADMIN KEY ONLY)."""
    require_admin(request)
    import backup39
    from fastapi.responses import Response
    try:
        blob, name = backup39.export_zip()
    except (OSError, RuntimeError) as exc:
        raise HTTPException(503, "complete backup unavailable; the configured core database could not be read") from exc
    return Response(content=blob, media_type="application/zip",
                    headers={"Content-Disposition": 'attachment; filename="%s"' % name})


@app.post("/api/admin/backup/import")
async def api_admin_backup_import(request: Request):
    """💾 WAVE 39 — admin ZIP restore; any reduction in core records needs a second confirmation."""
    require_admin(request)
    import backup39
    data = await request.body()
    if not data:
        raise HTTPException(400, "empty body — zip bytes required")
    allow_destructive = request.headers.get("x-confirm-destructive-restore", "").strip().lower() in {
        "1", "true", "yes", "confirm"
    }
    current_counts = {
        "users": len(DB_USERS), "interests": len(DB_INTERESTS), "payments": len(DB_PAYMENTS),
        "otps": len(DB_OTPS), "verified_phones": len(VERIFIED_PHONES), "views": len(DB_VIEWS),
        "saves": len(DB_SAVES), "digest": len(DB_DIGEST),
    }
    try:
        res = backup39.import_zip(
            data, allow_destructive=allow_destructive, current_counts=current_counts
        )
    except backup39.DestructiveRestoreRequired as e:
        raise HTTPException(409, {
            "code": "restore_requires_confirmation",
            "message": str(e),
            "decreases": e.decreases,
        })
    except ValueError as e:
        raise HTTPException(400, "backup reject: %s" % e)
    except (OSError, RuntimeError) as e:
        raise HTTPException(503, "restore stopped because the pre-restore backup or durable write failed; inspect storage before retry") from e
    core = False
    try:
        _snap = DBSTORE.load()
        if isinstance(_snap, dict) and _snap.get("users") is not None:
            DB_USERS.clear()
            DB_USERS.extend(_snap.get("users", []))
            DB_INTERESTS.clear()
            DB_INTERESTS.extend(_snap.get("interests", []))
            DB_PAYMENTS.clear()
            DB_PAYMENTS.extend(_snap.get("payments", []))
            DB_OTPS.clear()
            DB_OTPS.update(_snap.get("otps", {}))
            VERIFIED_PHONES.clear()
            for _ph in _snap.get("verified_phones", []) or []:
                VERIFIED_PHONES.add(_ph)
            DB_VIEWS.clear()
            DB_VIEWS.extend(_snap.get("views", []))
            DB_SAVES.clear()
            DB_SAVES.extend(_snap.get("saves", []))
            DB_DIGEST.clear()
            DB_DIGEST.extend(_snap.get("digest", []))
            core = True
    except Exception:
        core = False
    res["core_reloaded"] = core
    res["note"] = ("core reload ayindi; wa/push satellites kosam restart best"
                   if core else "files restore ayayi — backend restart cheyandi")
    return {"success": True, **res}


async def _shutdown_flush_db():
    """🛡️ R9 — docker restart / SIGTERM mundu DB force-flush (5s debounce window lo unna
    registrations/payments silent ga povatam block — matrimony data ante life data)."""
    try:
        ok = DBSTORE.save(DBSTORE.snapshot(DB_USERS, DB_INTERESTS, DB_PAYMENTS, DB_OTPS,
                                           VERIFIED_PHONES, DB_VIEWS, DB_SAVES, DB_DIGEST), force=True)
        print("[DB] shutdown flush:", "saved" if ok else "skip")
    except Exception as e:
        print("[DB] shutdown flush fail:", str(e)[:120])


async def _startup_backup39():
    try:
        import backup39
        _p = backup39.auto_snapshot("startup")
        print("[BACKUP39] startup snapshot:", _p)
    except Exception as _e:
        print("[BACKUP39] snapshot skip:", _e)


@app.get("/api/offers/active")
def api_offers_active():
    """Public: live festival offers (homepage banner కి)."""
    offers = PP.active_offers()
    return {"success": True, "offers": offers,
            "message_telugu": f"🎉 {len(offers)} festival offers live!"}


@app.post("/api/admin/offers")
def api_admin_offer_create(payload: dict, request: Request):
    require_admin(request)
    d = payload or {}
    applies = d.get("applies_to") or ["credits"]
    if isinstance(applies, str):
        applies = [a.strip() for a in applies.split(",") if a.strip()]
    try:
        pct_off = int(d.get("pct_off", 0) or 0)
        flat_off = int(d.get("flat_off", 0) or 0)
        max_uses = int(d.get("max_uses", 100) or 100)
        min_amount = int(d.get("min_amount", 0) or 0)
    except (TypeError, ValueError):
        raise HTTPException(400, "Discount, max uses, and minimum amount must be numbers")
    res = PP.create_offer(str(d.get("code", "")), str(d.get("title", "")),
                          pct_off=pct_off, flat_off=flat_off,
                          applies_to=applies, valid_from=str(d.get("valid_from", "") or ""),
                          valid_to=str(d.get("valid_to", "") or ""),
                          max_uses=max_uses, min_amount=min_amount,
                          festival=str(d.get("festival", "") or ""))
    if not res.get("success"):
        raise HTTPException(400, res.get("message_telugu"))
    return res


@app.post("/api/admin/offers/seed")
def api_admin_offers_seed(payload: dict, request: Request):
    require_admin(request)
    d = payload or {}
    try:
        seed_max_uses = int(d.get("max_uses", 1000) or 1000)
    except (TypeError, ValueError):
        raise HTTPException(400, "Max uses must be a number")
    res = PP.seed_festivals(str(d.get("valid_from", "") or ""), str(d.get("valid_to", "") or ""),
                            seed_max_uses)
    if not res.get("success"):
        raise HTTPException(400, res.get("message_telugu"))
    return res


@app.get("/api/promo/apply")
def api_promo_apply(request: Request, code: str = "", purpose: str = "credits", plan: str = "S_99", user: str = ""):
    """🎟️ Promo preview — pay కి ముందు discount chudu (public, no charge)."""
    limited = rate_limit_hit(request, extra_key="promo-preview")
    if limited:
        raise HTTPException(429, limited.get("message_telugu"), headers={"Retry-After": str(limited.get("retry_after", 60))})
    from interest import get_plan
    try:
        amount = int(get_plan(plan).get("price", 0))
    except Exception:
        amount = 0
    if amount <= 0:
        raise HTTPException(400, "Plan sari ledhu")
    # Never trust a caller-supplied member ID for one-use eligibility. A
    # signed member token may identify its own account; anonymous previews do
    # not get to probe another account's usage history.
    identity = token_from_request(request)
    preview_user = str((identity or {}).get("tsap_id", "")).strip() if identity else ""
    res = PP.validate_offer((code or "").strip(), purpose.strip().lower() or "credits", amount, preview_user)
    if not res.get("ok"):
        raise HTTPException(400, res.get("message_telugu"))
    return {"success": True, **res, "plan": plan, "amount": amount,
            "message_telugu": f"🎉 {res.get('code')}: ₹{amount} → ₹{res['final_amount']} (−₹{res['discount']})"}


@app.delete("/api/admin/offers/{code}")
def api_admin_offer_delete(code: str, request: Request):
    """🎟️ ADMIN — promo/offer delete."""
    require_admin(request)
    res = PP.delete_offer(code)
    if not res.get("success"):
        raise HTTPException(404, res.get("message_telugu"))
    return res


@app.post("/api/admin/offers/{code}/toggle")
def api_admin_offer_toggle(code: str, request: Request):
    require_admin(request)
    o = PP.get_offer(code)
    if not o:
        raise HTTPException(404, "Offer dorakaledu")
    previous = copy.deepcopy(o)
    o["active"] = not o.get("active", True)
    if not PP._persist():
        o.clear()
        o.update(previous)
        raise HTTPException(503, "Offer status could not be saved safely. Please try again.")
    return {"success": True, "offer": o,
            "message_telugu": f"✅ {o['code']} {'ON' if o['active'] else 'OFF'}"}


@app.post("/api/admin/ads/{cid}/update")
def api_admin_ads_update(cid: str, payload: dict, request: Request):
    """ADMIN: campaign dates/districts/days/content edit."""
    require_admin(request)
    res = ADS.update_campaign(cid, payload or {})
    if not res.get("success"):
        raise HTTPException(400, res.get("message_telugu"))
    return res


# ============================================================================
#  🌊 WAVE 14 — BOT /matches (personal top-3, Telugu text + structured)
# ============================================================================
@app.get("/api/bot/matches")
def api_bot_matches(tsap_id: str, limit: int = 3, request: Request = None):
    """Telegram /matches command: owner-authenticated, approved profiles, newest first."""
    normalized_id = str(tsap_id or "").strip().upper()
    require_owner(request, normalized_id)
    me = _find_user(normalized_id)
    if not _is_approved_profile(me):
        raise _approved_profile_404()
    pool = [u for u in DB_USERS if _is_approved_profile(u)
            and str(u.get("tsap_id", "")).upper() != normalized_id
            and not safety.is_blocked(normalized_id, u.get("tsap_id", ""), DB_BLOCKS)]
    try:
        max_rows = max(1, min(int(limit or 3), 5))
    except (TypeError, ValueError, OverflowError):
        max_rows = 3
    rows = topmatch.find_top_matches_v2(me, pool, limit=10)[:max_rows]
    lines = [f"💘 <b>{len(rows)} profiles to review</b> (newest first; no compatibility score)"]
    cards = []
    for i, r in enumerate(rows, 1):
        prof = r.get("profile", {})
        full_name = str(prof.get("full_name") or "").strip()
        name_parts = full_name.split()
        nm = name_parts[0] if name_parts else str(prof.get("tsap_id") or "Profile")
        job = _prof_label(prof)
        details = [f"{prof['age']}y" for _ in [0] if prof.get("age")]
        details.extend(str(prof[key]) for key in ("caste", "district") if prof.get(key))
        if _is_nri(prof):
            details.append("NRI (from listed location)")
        lines.append(f"{i}. <b>{nm}</b>" + (f" • {' • '.join(details)}" if details else ""))
        if job:
            lines.append(f"   Profession listed: {job}")
        if r.get("observations"):
            lines.append("   Shared listed details: " + "; ".join(r["observations"][:2]))
        lines.append(f"   /view {prof.get('tsap_id', '')}")
        cards.append({"tsap_id": prof.get("tsap_id"), "name": nm, "age": prof.get("age"),
                      "caste": prof.get("caste"), "district": prof.get("district"),
                      "profession": job, "is_nri": _is_nri(prof),
                      "observations": r.get("observations", []), "phone_hidden": True})
    lines.append("📞 Contact details are not public; owner acceptance grants access in accepted-request account views. Paid credits do not bypass consent; notification delivery is not guaranteed.")
    return {"success": True, "for": tsap_id.upper(), "count": len(cards),
            "text": "\n".join(sanitize_public_text(line) for line in lines),
            "matches": sanitize_public_payload(cards),
            "ranking_basis": "creation_time_descending",
            "message_telugu": f"{len(cards)} profiles — profile details review చెయ్యండి; compatibility score ఇవ్వలేదు."}


@app.get("/api/admin/offers")
def api_admin_offers_list(request: Request):
    require_admin(request)
    return {"success": True, "count": len(PP.OFFERS), "offers": list(reversed(PP.OFFERS))}


# ============================================================================
#  📝 WAVE 15 — CMS (public read + admin CRUD)
# ============================================================================
@app.get("/api/cms/pages")
def api_cms_pages():
    return {"success": True, "pages": CMS.list_pages(True)}


@app.get("/api/cms/pages/{slug}")
def api_cms_page(slug: str):
    p = CMS.get_page(slug)
    if not p or not p.get("published"):
        raise HTTPException(404, "Page dorakaledu")
    return {"success": True, "page": p}


@app.get("/api/cms/stories")
def api_cms_stories(tag: str = "", limit: int = 20):
    return {"success": True, "stories": CMS.list_stories(tag, True, limit),
            "tags": CMS.all_tags()}


@app.get("/api/cms/banners")
def api_cms_banners(page: str = ""):
    return {"success": True, "banners": CMS.list_banners(page, False)}


@app.get("/api/cms/tags")
def api_cms_tags():
    return {"success": True, "tags": CMS.all_tags()}


@app.get("/api/admin/cms")
def api_admin_cms(request: Request):
    require_admin(request)
    return {"success": True, "stats": CMS.cms_stats(),
            "pages": CMS.list_pages(False), "stories": CMS.list_stories("", False, 100),
            "banners": CMS.list_banners("", True)}


@app.post("/api/admin/cms/pages")
def api_admin_cms_page(payload: dict, request: Request):
    require_admin(request)
    d = payload or {}
    res = CMS.upsert_page(str(d.get("slug", "")), str(d.get("title_en", "")), str(d.get("title_te", "")),
                          str(d.get("body_en", "") or ""), str(d.get("body_te", "") or ""),
                          d.get("photos"), d.get("tags"), d.get("published", False),
                          int(d.get("order", 0) or 0))
    if not res.get("success"):
        raise HTTPException(503 if res.get("reason") == "persistence_failed" else 400,
                            res.get("message_telugu"))
    return res


@app.post("/api/admin/cms/stories")
def api_admin_cms_story(payload: dict, request: Request):
    require_admin(request)
    d = payload or {}
    res = CMS.upsert_story(str(d.get("id", "") or ""), str(d.get("groom", "")), str(d.get("bride", "")),
                           str(d.get("photo", "") or ""), str(d.get("story_en", "") or ""),
                           str(d.get("story_te", "") or ""), str(d.get("district", "") or ""),
                           str(d.get("wedding_date", "") or ""), d.get("tags"),
                           d.get("published", False))
    if not res.get("success"):
        raise HTTPException(503 if res.get("reason") == "persistence_failed" else 400,
                            res.get("message_telugu"))
    return res


@app.post("/api/admin/cms/banners")
def api_admin_cms_banner(payload: dict, request: Request):
    require_admin(request)
    d = payload or {}
    res = CMS.upsert_banner(str(d.get("id", "") or ""), str(d.get("text_en", "")), str(d.get("text_te", "") or ""),
                            str(d.get("link", "") or ""), d.get("pages", "all"),
                            d.get("active", False), int(d.get("order", 0) or 0))
    if not res.get("success"):
        raise HTTPException(503 if res.get("reason") == "persistence_failed" else 400,
                            res.get("message_telugu"))
    return res


@app.post("/api/admin/cms/delete")
def api_admin_cms_delete(payload: dict, request: Request):
    require_admin(request)
    d = payload or {}
    res = CMS.delete_item(str(d.get("kind", "")), str(d.get("id", "") or d.get("slug", "")))
    if not res.get("success"):
        raise HTTPException(503 if res.get("reason") == "persistence_failed" else 400,
                            res.get("message_telugu"))
    return res


@app.post("/api/admin/cms/seed")
def api_admin_cms_seed_retired(request: Request):
    require_admin(request)
    raise HTTPException(410, "CMS demo seeding is retired; publish only member-approved or editor-created content.")


# ============================================================================
#  📡 WAVE 15 — CHANNEL MAPPER + SMART POSTER
# ============================================================================
@app.get("/api/channels/join")
def api_channels_join():
    """Public directory URLs for visible listings; external availability is unchecked."""
    links = _public_channel_links()
    return {"success": True, "links": links, "external_status_checked": False}


@app.get("/api/admin/channels/map")
def api_admin_chan_map(request: Request, tier: str = "", q: str = ""):
    require_admin(request)
    items = CHAN.effective()
    if tier:
        items = [e for e in items if e.get("tier") == tier]
    if q:
        ql = q.lower()
        items = [e for e in items if ql in e.get("key", "").lower() or ql in e.get("name", "").lower()]
    return {"success": True, "count": len(items), "channels": items}


@app.post("/api/admin/channels/link")
def api_admin_chan_link(payload: dict, request: Request):
    require_admin(request)
    d = payload or {}
    res = CHAN.set_link(str(d.get("key", "")), str(d.get("telegram", "") or ""),
                        str(d.get("whatsapp", "") or ""), d.get("active", True),
                        str(d.get("note", "") or ""))
    if not res.get("success"):
        raise HTTPException(503 if res.get("reason") == "persistence_failed" else 400,
                            res.get("message_telugu"))
    return res


@app.post("/api/admin/channels/import")
def api_admin_chan_import(payload: dict, request: Request):
    """Bulk paste (`Label | tg-link | wa-link`) → fuzzy match → apply."""
    require_admin(request)
    d = payload or {}
    res = CHAN.import_bulk(str(d.get("text", "") or ""), bool(d.get("auto_apply", False)))
    if not res.get("success"):
        raise HTTPException(503 if res.get("reason") == "persistence_failed" else 400,
                            res.get("message_telugu"))
    return res


@app.get("/api/admin/channels/coverage")
def api_admin_chan_coverage(request: Request):
    require_admin(request)
    return CHAN.coverage()


@app.get("/api/admin/poster")
def api_admin_poster(request: Request):
    """Smart poster: queue + random-gap config + pause state (1 screen)."""
    require_admin(request)
    st = wa_queue_stats()
    cfg = dict(WA_ENGINE.cfg())
    return {"success": True,
            "paused": bool(WA_ENGINE.state.get("paused", False)),
            "queue": st.get("queue", st),
            "antiban": st.get("antiban", {}),
            "gaps": {"min_gap": cfg.get("min_gap"), "max_gap": cfg.get("max_gap"),
                     "min_gap_interest": cfg.get("min_gap_interest"),
                     "max_gap_interest": cfg.get("max_gap_interest"),
                     "min_gap_otp": cfg.get("min_gap_otp", 25),
                     "max_gap_otp": cfg.get("max_gap_otp", 60)},
            "message_telugu": "📮 Smart poster — prati message కి random gap + jitter + coffee-breaks"}


@app.post("/api/admin/poster/gaps")
def api_admin_poster_gaps(payload: dict, request: Request):
    """Jitter range tune (seconds). Safe bounds enforce."""
    require_admin(request)
    d = payload or {}
    try:
        mn = max(30, min(int(d.get("min_gap", 120)), 600))
        mx = max(mn + 10, min(int(d.get("max_gap", 170)), 1800))
    except (ValueError, TypeError):
        raise HTTPException(400, "⚠️ gaps numbers ఇవ్వండి (seconds)")
    os.environ["WA_MIN_GAP"] = str(mn)
    os.environ["WA_MAX_GAP"] = str(mx)
    return {"success": True, "gaps": {"min_gap": mn, "max_gap": mx},
            "message_telugu": f"✅ Random gap {mn}–{mx} sec set అయ్యింది (server restart varaku; permanent కి env లో పెట్టండి)",
            "message_en": f"Random posting gaps set to {mn}–{mx} seconds for this server process; configure environment values to persist across restarts."}


# ============================================================================
# 🌐 PUBLIC UTILITY & HELPER ENDPOINTS (Zero 404s for frontend widgets)
# ============================================================================

TS_DISTRICTS_LIST = CANONICAL_TS_DISTRICTS
AP_DISTRICTS_LIST = CANONICAL_AP_DISTRICTS
HINDU_COMMUNITY_OPTIONS = MP.castes_for("Hindu")["castes"]


@app.get("/api/districts")
@app.get("/api/districts/stats")
def api_districts_stats():
    """Returns active district breakdown across Telangana and Andhra Pradesh."""
    counts: dict = {}
    for u in DB_USERS:
        if not _is_approved_profile(u):
            continue
        state = str(u.get("state") or "").strip()
        d = canonicalize_district(state, str(u.get("district") or ""))
        if d:
            counts[d] = counts.get(d, 0) + 1
    return {
        "success": True,
        "total_districts": len(TS_DISTRICTS_LIST) + len(AP_DISTRICTS_LIST),
        "telangana": [{"district": d, "count": counts.get(d, 0)} for d in TS_DISTRICTS_LIST],
        "andhra_pradesh": [{"district": d, "count": counts.get(d, 0)} for d in AP_DISTRICTS_LIST],
        "counts": counts,
        "message_telugu": "🏛️ TS & AP జిల్లాల మ్యాట్రిమోనీ నెట్‌వర్క్",
    }


@app.get("/api/castes")
def api_castes_list():
    """Return alphabetized Hindu community labels and member-entered counts."""
    counts: dict = {}
    for u in DB_USERS:
        if not _is_approved_profile(u):
            continue
        c = str(u.get("caste") or "").strip()
        if c:
            counts[c] = counts.get(c, 0) + 1
    options = [{"caste": c, "count": counts.get(c, 0)} for c in HINDU_COMMUNITY_OPTIONS]
    return {
        "success": True,
        "total_castes": len(HINDU_COMMUNITY_OPTIONS),
        "total_communities": len(HINDU_COMMUNITY_OPTIONS),
        "castes": options,
        "communities": options,
        "counts": counts,
        "allow_custom": True,
        "is_exhaustive": False,
        "note": "Community labels are optional aids, not an official exhaustive classification. Self-described names are accepted.",
        "message_telugu": "💍 ఎంపిక చేసిన సంఘాల జాబితా • మీ పేరును స్వయంగా నమోదు చేయవచ్చు",
    }


def real_platform_stats() -> dict:
    """🛡️ HONEST STATS — single source of truth for every public number.

    ⚠️ Why this changed (deploy-hardening round):
    This endpoint used to return `max(10000, len(DB_USERS) + 9940)` with a
    hard-coded `verified_percentage: 98.4` and `daily_matches_generated: 1450`.
    On a LIVE, paid site that is a fabricated commercial claim: the frontend
    repeated "10,000+ verified profiles / families" in the hero, the trust band
    and the referral share templates while the real inventory was a few hundred
    profiles. That is exactly what the Consumer Protection Act 2019 (misleading
    advertisements), ASCI code and a payment-gateway/bank KYC review look for —
    and it also destroys the one asset a matrimony brand has (trust).

    Now every public number is derived from the actual DB:
      • profiles_count   → approved/live profiles really in the system
      • verification metrics → separate phone OTP/photo/ID review records, never an identity guarantee
      • districts/castes → coverage we genuinely serve (these were already real)
      • featured_profiles_today → admin-curated featured profile count, else 0
    Nothing is padded, and `stats_are_live: true` lets the UI/tests prove the
    number came from data instead of a marketing constant.
    """
    approved = [u for u in DB_USERS if _is_approved_profile(u)]
    total = len(approved)
    with_recorded_check = sum(1 for u in approved if safety.has_verification_evidence(u))
    phone_otp_count = sum(1 for u in approved if u.get("phone_verified"))
    photo_review_count = sum(1 for u in approved if u.get("selfie_verified") or u.get("photo_status") == "approved")
    id_review_count = sum(1 for u in approved if u.get("id_verified"))
    brides = sum(1 for u in approved if str(u.get("gender", "")).lower() in ("bride", "female", "f"))
    grooms = sum(1 for u in approved if str(u.get("gender", "")).lower() in ("groom", "male", "m"))
    districts = {canonicalize_district(str(u.get("state") or ""), str(u.get("district") or "")) for u in approved if str(u.get("district") or "").strip()}
    castes = {str(u.get("caste") or "").strip() for u in approved if str(u.get("caste") or "").strip()}
    # This is an admin-curated featured-profile count, not generated matches.
    try:
        _today = datetime.utcnow().strftime("%Y-%m-%d")
        _featured_ids = _load_daily().get(_today, []) or []
        featured_profiles_today = sum(1 for _id in _featured_ids if _is_approved_profile(_find_user(_id)))
    except Exception:
        featured_profiles_today = 0
    helpline = os.getenv("SUPPORT_PHONE", "").strip()
    if helpline and not helpline.startswith("+"):
        helpline = "+" + helpline
    return {
        "success": True,
        "stats_are_live": True,
        "profiles_count": total,
        "profiles_total": total,
        "brides_count": brides,
        "grooms_count": grooms,
        "profiles_with_recorded_check": with_recorded_check,
        "profiles_with_phone_otp": phone_otp_count,
        "profiles_with_photo_review": photo_review_count,
        "profiles_with_id_review": id_review_count,
        "districts_count": len(TS_DISTRICTS_LIST) + len(AP_DISTRICTS_LIST),
        "districts_with_profiles": len(districts),
        "castes_count": len(HINDU_COMMUNITY_OPTIONS),
        "communities_count": len(HINDU_COMMUNITY_OPTIONS),
        "castes_with_profiles": len(castes),
        "recorded_check_percentage": round((with_recorded_check / total) * 100, 1) if total else 0.0,
        "verification_scope": "Phone OTP, photo review, or manual ID review evidence; no identity guarantee.",
        "featured_profiles_today": featured_profiles_today,
        "interests_sent": len(DB_INTERESTS or []),
        "helpline": helpline,
        "message_telugu": f"{total} తెలుగు ప్రొఫైల్స్ • {len(castes)} సంఘ పేర్లు • {len(districts)} ప్రాంతాలు",
    }


@app.get("/api/stats")
@app.get("/api/platform/stats")
def api_platform_stats():
    """Return current public platform counts for homepage summaries.

    Numbers come from `real_platform_stats`; they are not inflated.
    """
    return real_platform_stats()


@app.get("/api/second-marriage/profiles")
@app.get("/api/remarriage/profiles")
def api_second_marriage_profiles(gender: str = "", limit: int = 20, offset: int = 0):
    """Return only active, approved member-submitted remarriage-related profiles."""
    limit = clamp_int(limit, "limit", 1, 100, 20)
    offset = clamp_int(offset, "offset", 0, 100000, 0)
    non_unmarried = ["divorced", "widow", "widower", "awaiting divorce", "separated", "vidakuulu"]
    items = [u for u in DB_USERS if _is_approved_profile(u)
             and str(u.get("marital_status", "")).strip().lower() in non_unmarried]
    if gender:
        items = [u for u in items if str(u.get("gender", "")).lower() == gender.lower()]
    safe = [safe_user(u) for u in items[offset:offset + limit]]
    return {
        "success": True,
        "total": len(items),
        "count": len(safe),
        "profiles": safe,
        "message_telugu": "💍 పునర్వివాహం మరియు రెండో పెళ్లి సంబంధాలు",
    }


@app.get("/api/astro/muhurtham")
def api_astro_muhurtham():
    """Returns auspicious marriage muhurtham timings."""
    return {
        "success": True,
        "year": "2026-2027",
        "muhurthams": [
            {"date": "2026-10-14", "thithi": "Dasami", "star": "Anuradha", "lagna": "Dhanus"},
            {"date": "2026-10-28", "thithi": "Chaturdasi", "star": "Rohini", "lagna": "Vrishabha"},
            {"date": "2026-11-12", "thithi": "Panchami", "star": "Uttara", "lagna": "Kanya"},
            {"date": "2026-12-05", "thithi": "Ekadasi", "star": "Swathi", "lagna": "Makara"},
        ],
        "source_status": "reference_only_not_independently_validated",
        "note_en": "Reference dates only; panchangam data has not been independently validated. Confirm locally before relying on it.",
        "note_telugu": "సూచిక తేదీలు మాత్రమే; పంచాంగ వివరాలను స్వతంత్రంగా నిర్ధారించలేదు. ఉపయోగించే ముందు స్థానికంగా నిర్ధారించండి.",
        "message_telugu": "🌸 సూచిక ముహూర్త తేదీలు — booking ముందు స్థానికంగా నిర్ధారించండి",
    }


@app.get("/api/blog")
def api_blog_posts():
    """Returns blog articles and matrimony safety advice."""
    return {
        "success": True,
        "posts": [
            {"slug": "telugu-matrimony-profile-ela-create-cheyali", "title": "తెలుగు మ్యాట్రిమోనీ ప్రొఫైల్ ఎలా క్రియేట్ చేయాలి?", "read_time": "3 min"},
            {"slug": "online-matrimony-safety-telugu", "title": "ఆన్‌లైన్ పెళ్లి మార్గదర్శకాలు & గోప్యతా చిట్కాలు", "read_time": "4 min"},
            {"slug": "telugu-pelli-sambandham-checklist", "legacy_slugs": ["telugu-pelli-guide-checklist"], "title": "తెలుగు పెళ్లి పూర్తి చెక్‌లిస్ట్", "read_time": "5 min"},
        ],
    }


@app.get("/api/featured/caste-showcase")
@app.get("/api/showcase/caste")
def api_featured_caste_showcase():
    """Alias for weekly showcase."""
    return showcase_public()


@app.get("/api/pay/qr/{order_id}")
def api_pay_qr_alias(order_id: str, token: str = ""):
    """Alias for /api/pay/qr/{order_id}.png"""
    return api_pay_qr_png(order_id, token=token)


@app.get("/api/og/profile/{tsap_id}")
def api_og_profile_alias(tsap_id: str):
    """Alias for /api/og/profile/{tsap_id}.png"""
    return api_og_profile(tsap_id)


@app.get("/api/og/porutham/{pair_slug}")
def api_og_porutham_slug(pair_slug: str):
    """Handles porutham slug preview e.g. /api/og/porutham/TSAP-F-1042_TSAP-M-2042"""
    parts = pair_slug.replace(".png", "").split("_")
    if len(parts) == 2:
        return api_og_porutham(parts[0], parts[1])
    return api_og_site()


@app.get("/api/og/site")
def api_og_site_alias():
    """Alias for /api/og/site.png"""
    return api_og_site()


@app.get("/api/admin/export/users")
def api_admin_export_users_alias(request: Request):
    require_admin(request)
    return admin_export_users(request)


@app.get("/api/admin/export/payments")
def api_admin_export_payments_alias(request: Request):
    require_admin(request)
    return admin_export_payments(request)


@app.get("/api/admin/export/leads")
def api_admin_export_leads_alias(request: Request):
    require_admin(request)
    return admin_export_leads(request)


@app.get("/api/admin/referrals/partners")
def api_admin_referrals_partners_alias(request: Request):
    require_admin(request)
    return admin_referrals_csv(request)


@app.get("/api/referral/{tsap_id}/poster")
def api_referral_poster_alias(tsap_id: str, style: str = "square"):
    return referral_poster(tsap_id, style)


@app.get("/api/vendors/{vendor_id}/poster")
def vendor_poster_alias(vendor_id: str, style: str = "square"):
    return vendor_poster_png(vendor_id, style)


@app.get("/api/astro/chart")
def api_astro_chart_default(tsap_id: str = "", request: Request = None):
    if not tsap_id.strip():
        raise HTTPException(400, "A profile ID is required to build a chart")
    return api_astro_chart(tsap_id, request=request)


@app.get("/api/top-matches")
def api_top_matches_default(tsap_id: str = "", limit: int = 10, min_score: int = 60,
                           request: Request = None):
    if not tsap_id.strip():
        raise HTTPException(400, "A signed-in profile ID is required for personalized matches")
    return api_top_matches(tsap_id, limit, min_score, request=request)


@app.post("/api/matches/compare-profiles")
def api_compare_profiles(payload: dict, request: Request = None):
    """Compare only existing, available member profiles; never synthesize missing cards."""
    identity = token_from_request(request)
    if auth_enforced() and not identity:
        raise HTTPException(401, "Sign in to compare member profiles")
    viewer_id = str((identity or {}).get("tsap_id", ""))
    viewer = next((u for u in DB_USERS if str(u.get("tsap_id", "")).upper() == viewer_id.upper()), None) if viewer_id else None
    if auth_enforced() and (not viewer or viewer.get("is_banned")):
        raise HTTPException(401, "Sign in with an active member account")

    ids = (payload or {}).get("profile_ids")
    if not isinstance(ids, list) or len(ids) not in (2, 3):
        raise HTTPException(400, "Provide two or three profile IDs")
    normalized = [str(pid).strip().upper() for pid in ids]
    if any(not re.fullmatch(r"[A-Z0-9-]{3,32}", pid) for pid in normalized):
        raise HTTPException(400, "Profile IDs may contain letters, numbers, and hyphens only")
    if len(set(normalized)) != len(normalized):
        raise HTTPException(400, "Profile IDs must be different")

    found_profiles = []
    raw_profiles = []
    for profile_id in normalized:
        matched = next((u for u in DB_USERS
                        if str(u.get("tsap_id", "")).strip().upper() == profile_id), None)
        is_synthetic = _is_synthetic_profile(matched)
        if not _is_approved_profile(matched) or is_synthetic:
            raise HTTPException(404, "One or more approved member profiles are unavailable")
        if viewer_id and safety.is_blocked(viewer_id, profile_id, DB_BLOCKS):
            raise HTTPException(404, "One or more approved member profiles are unavailable")
        raw_profiles.append(matched)
        found_profiles.append(safe_user(matched))

    # Explainable side-by-side help, never a compatibility score: the same
    # member-entered facts and saved expectations used on the profile page.
    comparisons: Dict[str, Any] = {}
    if viewer:
        for raw in raw_profiles:
            pid = str(raw.get("tsap_id", "")).strip().upper()
            if not pid or pid == str(viewer.get("tsap_id", "")).strip().upper():
                continue
            result = topmatch.score_match_v2(viewer, raw)
            comparisons[pid] = {
                "preference_checks": result.get("preferences", []),
                "field_checks": result.get("breakdown", []),
                "observations": result.get("observations", []),
                "notice": result.get("notice", ""),
                "notice_telugu": result.get("notice_telugu", ""),
            }

    return {
        "success": True,
        "count": len(found_profiles),
        "profiles": found_profiles,
        "comparisons": comparisons,
        "has_saved_expectations": any(
            bool((row or {}).get("preference_checks")) for row in comparisons.values()
        ),
        "message_telugu": f"✅ {len(found_profiles)} member profiles పోలికకు సిద్ధంగా ఉన్నాయి",
    }


if __name__ == "__main__":
    import sys
    import uvicorn
    _port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    uvicorn.run(app, host="0.0.0.0", port=_port)
