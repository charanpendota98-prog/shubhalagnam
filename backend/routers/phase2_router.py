"""
Modular FastAPI router for Phase 2 capabilities:
  1. Transactional Identity & Session SQL Slice (`identity_repo.py`) + Admin Parity Reconciliation
  2. Multi-Seat Bureau Tenant Workspace (`phase2_store.py`) with strict tenant isolation
  3. Private Shareable Elder Profile Review Links (`/review/{token}`)
  4. Saved-Search Opt-In Digest & Quiet-Hours Alert Preferences
  5. Assisted Matchmaker Appointments
"""
from __future__ import annotations

import secrets
from typing import Any, Callable, Dict
from fastapi import APIRouter, HTTPException, Request, Response

import identity_repo as IDENTITY_REPO
import phase2_store as PHASE2


def build_phase2_router(ctx: Dict[str, Callable[..., Any] | Any]) -> APIRouter:
    router = APIRouter(tags=["phase2"])

    clean = ctx["clean"]
    find_user = ctx["find_user"]
    require_owner = ctx["require_owner"]
    require_admin = ctx["require_admin"]
    log_consent = ctx["log_consent"]
    get_state = ctx["get_state"]
    token_version = ctx["token_version"]
    revoke_all_tokens = ctx["revoke_all_tokens"]
    sign_token = ctx["sign_token"]
    token_ttl_seconds = int(ctx["token_ttl_seconds"])
    member_session_cookie = str(ctx["member_session_cookie"])
    member_csrf_cookie = str(ctx["member_csrf_cookie"])
    production = bool(ctx["production"])

    # ------------------------------------------------------------------
    # 1. ADMIN IDENTITY SQL PARITY & RECONCILIATION
    # ------------------------------------------------------------------
    @router.get("/api/admin/identity/reconcile")
    def api_admin_identity_reconcile(request: Request = None):
        require_admin(request, staff_ok=False)
        st = get_state()
        report = IDENTITY_REPO.reconcile(st["users"], token_version_fn=token_version)
        return {"success": True, **report}

    @router.post("/api/admin/identity/sync")
    def api_admin_identity_sync(request: Request = None):
        require_admin(request, staff_ok=False)
        st = get_state()
        sync_res = IDENTITY_REPO.sync_from_users(st["users"], token_version_fn=token_version)
        report = IDENTITY_REPO.reconcile(st["users"], token_version_fn=token_version)
        return {"success": True, "sync": sync_res, "reconcile": report}

    # ------------------------------------------------------------------
    # 2. MEMBER SESSIONS, COOKIE UPGRADE & DEVICE REVOCATION
    # ------------------------------------------------------------------
    @router.get("/api/me/{tsap_id}/sessions")
    def api_member_sessions(tsap_id: str, request: Request = None):
        tid = clean(tsap_id, 40, "tsap_id").upper()
        require_owner(request, tid)
        u = find_user(tid)
        if not u:
            raise HTTPException(404, "Profile not found")
        tv = int(token_version(tid))
        IDENTITY_REPO.upsert_member_from_dict(u, token_ver=tv)
        cookie_present = bool(request and request.cookies.get(member_session_cookie))
        sessions = IDENTITY_REPO.list_sessions(tid, current_token_ver=tv)
        return {
            "success": True,
            "tsap_id": tid,
            "token_version": tv,
            "cookie_session_active": cookie_present,
            "sessions": sessions,
        }

    @router.post("/api/me/{tsap_id}/sessions/register")
    def api_register_member_session(
        tsap_id: str,
        payload: dict,
        request: Request = None,
        response: Response = None,
    ):
        tid = clean(tsap_id, 40, "tsap_id").upper()
        require_owner(request, tid)
        u = find_user(tid)
        if not u:
            raise HTTPException(404, "Profile not found")
        d = payload or {}
        enable_cookie = bool(d.get("enable_cookie", True))
        tv = int(token_version(tid))
        ua = request.headers.get("user-agent", "") if request else ""
        ip_addr = (request.client.host if request and request.client else "") or ""
        rec = IDENTITY_REPO.register_session(
            u,
            device_label=str(d.get("device_label") or "Web Browser"),
            ip_addr=ip_addr,
            user_agent=ua,
            cookie_mode=enable_cookie,
            token_ver=tv,
            ttl_seconds=token_ttl_seconds,
        )
        csrf_token = ""
        if enable_cookie and response is not None:
            fresh_tok = sign_token(tid, ttl_seconds=token_ttl_seconds)
            csrf_token = secrets.token_urlsafe(24)
            response.set_cookie(
                key=member_session_cookie,
                value=fresh_tok,
                max_age=token_ttl_seconds,
                httponly=True,
                secure=production,
                samesite="lax",
                path="/",
            )
            response.set_cookie(
                key=member_csrf_cookie,
                value=csrf_token,
                max_age=token_ttl_seconds,
                httponly=False,
                secure=production,
                samesite="lax",
                path="/",
            )
        return {"success": True, "session": rec, "csrf_token": csrf_token}

    @router.post("/api/me/{tsap_id}/sessions/{session_id}/revoke")
    def api_revoke_single_session(tsap_id: str, session_id: str, request: Request = None):
        tid = clean(tsap_id, 40, "tsap_id").upper()
        require_owner(request, tid)
        sid = clean(session_id, 40, "session_id").upper()
        ok = IDENTITY_REPO.revoke_session(tid, sid)
        if not ok:
            raise HTTPException(404, "Active session not found")
        log_consent("member_session_revoked", tid, tid, note=f"Revoked session {sid}.")
        return {"success": True, "revoked_session_id": sid}

    @router.post("/api/me/{tsap_id}/sessions/revoke-all")
    def api_revoke_all_member_sessions(tsap_id: str, request: Request = None, response: Response = None):
        tid = clean(tsap_id, 40, "tsap_id").upper()
        require_owner(request, tid)
        new_tv = int(revoke_all_tokens(tid))
        revoked_count = IDENTITY_REPO.revoke_all_sessions(tid, new_tv)
        if response is not None:
            response.delete_cookie(member_session_cookie, path="/")
            response.delete_cookie(member_csrf_cookie, path="/")
        log_consent("member_logout_everywhere", tid, tid, note=f"Revoked all tokens (v={new_tv}).")
        return {
            "success": True,
            "tsap_id": tid,
            "new_token_version": new_tv,
            "revoked_sessions": revoked_count,
        }

    # ------------------------------------------------------------------
    # 3. BUREAU MULTI-SEAT TENANT ISOLATION (#5, #6)
    # ------------------------------------------------------------------
    def _bureau_key_from_request(request: Request, payload: dict | None = None) -> str:
        if request is not None:
            hdr = (request.headers.get("x-bureau-key") or "").strip()
            if hdr:
                return hdr
        if isinstance(payload, dict):
            return str(payload.get("bureau_key") or "").strip()
        return ""

    @router.post("/api/bureaus/create")
    def api_create_bureau(payload: dict):
        d = payload or {}
        ok, msg, res = PHASE2.create_bureau_tenant(
            business_name=str(d.get("business_name", "")),
            owner_name=str(d.get("owner_name", "")),
            district=str(d.get("district", "")),
            contact_phone=str(d.get("contact_phone", "")),
        )
        if not ok:
            raise HTTPException(400, msg)
        return {"success": True, **res}

    @router.get("/api/bureaus/{bureau_id}/workspace")
    def api_get_bureau_workspace(bureau_id: str, request: Request = None):
        bid = clean(bureau_id, 32, "bureau_id").upper()
        key = _bureau_key_from_request(request)
        authed, role, _ = PHASE2.authenticate_bureau(bid, key)
        if not authed:
            raise HTTPException(403, "Invalid or unauthorized bureau access key for this tenant.")
        ws = PHASE2.get_bureau_workspace(bid, viewer_role=role)
        if not ws:
            raise HTTPException(404, "Bureau tenant not found.")
        return {"success": True, **ws}

    @router.post("/api/bureaus/{bureau_id}/seats")
    def api_add_bureau_seat(bureau_id: str, payload: dict, request: Request = None):
        bid = clean(bureau_id, 32, "bureau_id").upper()
        d = payload or {}
        key = _bureau_key_from_request(request, d)
        authed, role, actor = PHASE2.authenticate_bureau(bid, key)
        if not authed or role != "owner":
            raise HTTPException(403, "Only the bureau tenant owner can create operator seats.")
        ok, msg, seat = PHASE2.add_bureau_seat(
            bid,
            seat_name=str(d.get("name", "")),
            role=str(d.get("role", "coordinator")),
            actor_label=actor,
        )
        if not ok:
            raise HTTPException(400, msg)
        return {"success": True, "seat": seat}

    @router.post("/api/bureaus/{bureau_id}/seats/{seat_id}/revoke")
    def api_revoke_bureau_seat(bureau_id: str, seat_id: str, payload: dict = None, request: Request = None):
        bid = clean(bureau_id, 32, "bureau_id").upper()
        sid = clean(seat_id, 32, "seat_id").upper()
        key = _bureau_key_from_request(request, payload or {})
        authed, role, actor = PHASE2.authenticate_bureau(bid, key)
        if not authed or role != "owner":
            raise HTTPException(403, "Only the bureau tenant owner can revoke seats.")
        ok, msg = PHASE2.revoke_bureau_seat(bid, sid, actor_label=actor)
        if not ok:
            raise HTTPException(404, msg)
        return {"success": True, "status": msg}

    @router.post("/api/bureaus/{bureau_id}/clients")
    def api_add_bureau_client(bureau_id: str, payload: dict, request: Request = None):
        bid = clean(bureau_id, 32, "bureau_id").upper()
        d = payload or {}
        key = _bureau_key_from_request(request, d)
        authed, role, actor = PHASE2.authenticate_bureau(bid, key)
        if not authed or role not in {"owner", "coordinator"}:
            raise HTTPException(403, "Owner or coordinator seat permission is required to record client notes.")
        cid = clean(d.get("client_tsap_id", ""), 40, "client_tsap_id").upper()
        member = find_user(cid)
        ok, msg, rec = PHASE2.add_bureau_client(
            bid,
            client_tsap_id=cid,
            client_label=str(d.get("client_label", "")),
            notes=str(d.get("notes", "")),
            consent_confirmed=bool(d.get("consent_confirmed", False)),
            actor_label=actor,
            member_exists=bool(member),
        )
        if not ok:
            raise HTTPException(400, msg)
        return {"success": True, "client": rec}

    # ------------------------------------------------------------------
    # 4. PRIVATE SHAREABLE ELDER REVIEW LINKS (#21)
    # ------------------------------------------------------------------
    @router.post("/api/me/{tsap_id}/review-links")
    def api_create_review_link(tsap_id: str, payload: dict, request: Request = None):
        tid = clean(tsap_id, 40, "tsap_id").upper()
        require_owner(request, tid)
        u = find_user(tid)
        if not u:
            raise HTTPException(404, "Profile not found")
        d = payload or {}
        rec = PHASE2.create_review_link(
            u,
            label=str(d.get("label", "Family Elder Review")),
            ttl_hours=int(d.get("ttl_hours", 72) or 72),
            max_views=int(d.get("max_views", 15) or 15),
        )
        log_consent("elder_review_link_created", tid, tid, note=f"Created private review link {rec['link_id']}.")
        return {"success": True, "review_link": rec}

    @router.get("/api/me/{tsap_id}/review-links")
    def api_list_review_links(tsap_id: str, request: Request = None):
        tid = clean(tsap_id, 40, "tsap_id").upper()
        require_owner(request, tid)
        links = PHASE2.list_review_links(tid)
        return {"success": True, "count": len(links), "links": links}

    @router.post("/api/me/{tsap_id}/review-links/{link_id}/revoke")
    def api_revoke_review_link(tsap_id: str, link_id: str, request: Request = None):
        tid = clean(tsap_id, 40, "tsap_id").upper()
        require_owner(request, tid)
        lid = clean(link_id, 40, "link_id").upper()
        if not PHASE2.revoke_review_link(tid, lid):
            raise HTTPException(404, "Review link not found")
        log_consent("elder_review_link_revoked", tid, tid, note=f"Revoked private review link {lid}.")
        return {"success": True, "revoked_link_id": lid}

    @router.get("/api/review-links/{token}")
    def api_resolve_public_review_link(token: str):
        ok, msg, data = PHASE2.resolve_review_link(token, find_user, increment_view=True)
        if not ok:
            raise HTTPException(404, msg)
        return {"success": True, **data}

    @router.post("/api/review-links/{token}/feedback")
    def api_submit_review_link_feedback(token: str, payload: dict):
        d = payload or {}
        ok, msg = PHASE2.submit_elder_feedback(
            token,
            reviewer_name=str(d.get("reviewer_name", "")),
            relation=str(d.get("relation", "Family Elder")),
            note=str(d.get("note", "")),
        )
        if not ok:
            raise HTTPException(400, msg)
        return {"success": True, "status": msg}

    # ------------------------------------------------------------------
    # 5. SAVED-SEARCH OPT-IN ALERTS & DIGEST (#19)
    # ------------------------------------------------------------------
    @router.get("/api/me/{tsap_id}/alert-preferences")
    def api_get_alert_preferences(tsap_id: str, request: Request = None):
        tid = clean(tsap_id, 40, "tsap_id").upper()
        require_owner(request, tid)
        return {"success": True, "preferences": PHASE2.get_alert_preferences(tid)}

    @router.post("/api/me/{tsap_id}/alert-preferences")
    def api_update_alert_preferences(tsap_id: str, payload: dict, request: Request = None):
        tid = clean(tsap_id, 40, "tsap_id").upper()
        require_owner(request, tid)
        d = payload or {}
        enabled = bool(d.get("enabled", False))
        rec = PHASE2.update_alert_preferences(
            tid,
            enabled=enabled,
            frequency=str(d.get("frequency", "weekly")),
            quiet_hours_start=str(d.get("quiet_hours_start", "21:00")),
            quiet_hours_end=str(d.get("quiet_hours_end", "08:00")),
        )
        log_consent(
            "saved_search_alerts_opt_in" if rec["enabled"] else "saved_search_alerts_opt_out",
            tid,
            tid,
            note=f"Alert frequency set to {rec['frequency']}.",
        )
        return {"success": True, "preferences": rec}

    @router.get("/api/me/{tsap_id}/saved-search-digest")
    def api_saved_search_digest(tsap_id: str, request: Request = None):
        tid = clean(tsap_id, 40, "tsap_id").upper()
        require_owner(request, tid)
        u = find_user(tid)
        if not u:
            raise HTTPException(404, "Profile not found")
        st = get_state()
        my_saved = [s for s in st["saved_searches"] if str(s.get("tsap_id", "")).upper() == tid]
        digest = PHASE2.compute_saved_search_digest(u, my_saved, st["users"], st["blocks"])
        return {"success": True, **digest}

    # ------------------------------------------------------------------
    # 6. ASSISTED MATCHMAKER APPOINTMENTS (#14)
    # ------------------------------------------------------------------
    @router.post("/api/appointments/book")
    def api_book_appointment(payload: dict, request: Request = None):
        d = payload or {}
        tid = clean(d.get("tsap_id", ""), 40, "tsap_id").upper()
        require_owner(request, tid)
        u = find_user(tid)
        if not u:
            raise HTTPException(404, "Profile not found")
        ok, msg, rec = PHASE2.book_appointment(
            u,
            preferred_date=str(d.get("preferred_date", "")),
            preferred_slot=str(d.get("preferred_slot", "evening_17_19")),
            language=str(d.get("language", "te")),
            topic=str(d.get("topic", "profile_shortlist_guidance")),
            family_notes=str(d.get("family_notes", "")),
        )
        if not ok:
            raise HTTPException(400, msg)
        log_consent("assisted_appointment_booked", tid, tid, note=f"Appointment {rec['appointment_id']} requested.")
        return {"success": True, "appointment": rec}

    @router.get("/api/appointments/{tsap_id}")
    def api_member_appointments(tsap_id: str, request: Request = None):
        tid = clean(tsap_id, 40, "tsap_id").upper()
        require_owner(request, tid)
        items = PHASE2.list_member_appointments(tid)
        return {"success": True, "count": len(items), "appointments": items}

    @router.get("/api/admin/appointments")
    def api_admin_appointments(status: str = "all", request: Request = None):
        require_admin(request, staff_ok=True)
        items = PHASE2.list_admin_appointments(status)
        return {"success": True, "count": len(items), "appointments": items}

    @router.post("/api/admin/appointments/{appointment_id}/status")
    def api_admin_update_appointment(appointment_id: str, payload: dict, request: Request = None):
        role = require_admin(request, staff_ok=True)
        d = payload or {}
        ok, msg, rec = PHASE2.update_appointment_status(
            appointment_id,
            status=str(d.get("status", "")),
            staff_note=str(d.get("staff_note", "")),
            actor=str(d.get("actor") or role),
        )
        if not ok:
            raise HTTPException(400, msg)
        return {"success": True, "appointment": rec}

    return router
