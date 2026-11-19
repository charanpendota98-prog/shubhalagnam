"""
Modular FastAPI router for Phases 3–12 Enterprise Platform Architecture.
"""
from __future__ import annotations

import base64
from typing import Any, Callable, Dict
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import JSONResponse

import ecosystem3 as ECOSYSTEM3
import enterprise_ops as EOPS
import enterprise_sql as ESQL
import identity_repo as IDENTITY_REPO
import phase2_store as PHASE2


def _consented_count(payload: dict, field: str, minimum: int, maximum: int, default: int | None = None) -> int:
    """Only an explicit JSON true records consent; never coerce text or counts."""
    if payload.get("consent_confirmed") is not True:
        raise HTTPException(400, "Explicit consent is required.")
    value = payload.get(field, default)
    if type(value) is not int or not minimum <= value <= maximum:
        raise HTTPException(400, f"{field} must be an integer from {minimum} to {maximum}.")
    return value


def build_enterprise_router(ctx: Dict[str, Callable[..., Any] | Any]) -> APIRouter:
    router = APIRouter(tags=["phases3_to_12"])

    clean = ctx["clean"]
    find_user = ctx["find_user"]
    require_owner = ctx["require_owner"]
    require_admin = ctx["require_admin"]
    token_from_request = ctx["token_from_request"]
    log_consent = ctx["log_consent"]
    is_approved_profile = ctx["is_approved_profile"]
    get_state = ctx["get_state"]
    token_version = ctx["token_version"]

    # ------------------------------------------------------------------
    # PHASE 3 — MEDIA QUARANTINE SCANNER, BUNDLES, EVENTS, ORGS, K-ANON INSIGHTS
    # ------------------------------------------------------------------
    @router.post("/api/media/{tsap_id}/inspect")
    def api_inspect_media(tsap_id: str, payload: dict, request: Request = None):
        tid = clean(tsap_id, 40, "tsap_id").upper()
        require_owner(request, tid)
        d = payload or {}
        b64 = str(d.get("content_base64") or "").strip()
        if "," in b64 and b64.startswith("data:"):
            b64 = b64.split(",", 1)[1]
        try:
            raw_bytes = base64.b64decode(b64, validate=True) if b64 else b""
        except Exception:
            raw_bytes = b""
        rec = ESQL.inspect_and_quarantine_image(tid, str(d.get("filename") or "photo.jpg"), raw_bytes)
        return {"success": True, "inspection": rec}

    @router.get("/api/admin/media/quarantine")
    def api_admin_media_quarantine(status: str = "all", limit: int = 50, request: Request = None):
        require_admin(request, staff_ok=True)
        items = ESQL.list_media_quarantine(status=status, limit=limit)
        return {"success": True, "count": len(items), "items": items}

    @router.get("/api/bundles")
    def api_list_vendor_bundles():
        return {"success": True, "bundles": EOPS.list_vendor_bundles()}

    @router.post("/api/bundles/enquire")
    def api_submit_bundle_enquiry(payload: dict, request: Request = None):
        d = payload or {}
        tid = clean(d.get("tsap_id", ""), 40, "tsap_id").upper()
        require_owner(request, tid)
        if not find_user(tid):
            raise HTTPException(404, "Member profile not found")
        guest_count = _consented_count(d, "guest_count", 10, 5000, default=100)
        ok, msg, rec = EOPS.submit_bundle_enquiry(
            tsap_id=tid,
            bundle_id=str(d.get("bundle_id", "")),
            city=str(d.get("city", "")),
            event_date=str(d.get("event_date", "")),
            guest_count=guest_count,
            consent_confirmed=True,
            notes=str(d.get("notes", "")),
        )
        if not ok:
            raise HTTPException(400, msg)
        log_consent("vendor_bundle_enquiry", tid, tid, note=f"Bundle {rec['bundle_id']} enquiry.")
        return {"success": True, "enquiry": rec}

    @router.get("/api/events")
    def api_list_events():
        return {"success": True, "events": EOPS.list_community_events()}

    @router.post("/api/admin/events")
    def api_admin_create_event(payload: dict, request: Request = None):
        role = require_admin(request, staff_ok=True)
        d = payload or {}
        ok, msg, ev = EOPS.create_community_event(
            title_en=str(d.get("title_en", "")),
            title_te=str(d.get("title_te", "")),
            city=str(d.get("city", "")),
            event_date=str(d.get("event_date", "")),
            organizer=str(d.get("organizer", "")),
            community_focus=str(d.get("community_focus", "All Telugu Families")),
            mode=str(d.get("mode", "in_person")),
            capacity=int(d.get("capacity", 100) or 100),
            actor=role,
        )
        if not ok:
            raise HTTPException(400, msg)
        return {"success": True, "event": ev}

    @router.post("/api/events/{event_id}/rsvp")
    def api_rsvp_event(event_id: str, payload: dict, request: Request = None):
        d = payload or {}
        tid = clean(d.get("tsap_id", ""), 40, "tsap_id").upper()
        require_owner(request, tid)
        if not find_user(tid):
            raise HTTPException(404, "Profile not found")
        attendee_count = _consented_count(d, "attendee_count", 1, 6)
        ok, msg, ev = EOPS.rsvp_community_event(
            event_id,
            tsap_id=tid,
            attendee_count=attendee_count,
            consent_confirmed=True,
        )
        if not ok:
            raise HTTPException(400, msg)
        log_consent("community_event_rsvp", tid, tid, note=f"RSVP to {event_id}.")
        return {"success": True, "status": msg, "event": ev}

    @router.get("/api/orgs")
    def api_list_orgs():
        return {"success": True, "portals": EOPS.list_org_portals()}

    @router.post("/api/admin/orgs")
    def api_admin_create_org(payload: dict, request: Request = None):
        require_admin(request, staff_ok=False)
        d = payload or {}
        ok, msg, rec = EOPS.create_org_portal(
            slug=str(d.get("slug", "")),
            org_name_en=str(d.get("org_name_en", "")),
            org_name_te=str(d.get("org_name_te", "")),
            community_filter=str(d.get("community_filter", "")),
            district_focus=str(d.get("district_focus", "")),
            about_en=str(d.get("about_en", "")),
            about_te=str(d.get("about_te", "")),
            verified_contact_note=str(d.get("verified_contact_note", "")),
        )
        if not ok:
            raise HTTPException(400, msg)
        return {"success": True, "portal": rec}

    @router.get("/api/orgs/{slug}")
    def api_get_org_portal(slug: str):
        st = get_state()
        approved = [u for u in st["users"] if is_approved_profile(u)]
        portal = EOPS.get_org_portal(slug, approved)
        if not portal:
            raise HTTPException(404, "Community organization portal not found.")
        return {"success": True, "portal": portal}

    @router.get("/api/insights/demand")
    def api_k_anonymous_demand_insights():
        st = get_state()
        return {"success": True, **EOPS.compute_k_anonymous_demand_insights(st["users"], k_floor=5)}

    # ------------------------------------------------------------------
    # PHASE 4 — LIVE CONTACT GRANT RE-VERIFICATION & OUTBOX DISPATCHER
    # ------------------------------------------------------------------
    @router.get("/api/contact/authorize-check")
    def api_live_contact_authorize_check(viewer_id: str, owner_id: str, request: Request = None):
        vid = clean(viewer_id, 40, "viewer_id").upper()
        oid = clean(owner_id, 40, "owner_id").upper()
        require_owner(request, vid)
        st = get_state()
        ESQL.sync_interests_and_blocks(st["interests"], st["blocks"])
        verdict = ESQL.check_live_contact_authorization(vid, oid)
        return {"success": True, **verdict}

    @router.post("/api/admin/outbox/enqueue")
    def api_admin_enqueue_outbox(payload: dict, request: Request = None):
        require_admin(request, staff_ok=True)
        d = payload or {}
        rec = ESQL.enqueue_outbox_event(
            topic=str(d.get("topic", "digest")),
            recipient_id=str(d.get("recipient_id", "")),
            payload=d.get("payload") if isinstance(d.get("payload"), dict) else {},
        )
        return {"success": True, "event": rec}

    @router.post("/api/admin/outbox/dispatch")
    def api_admin_dispatch_outbox(limit: int = 25, request: Request = None):
        require_admin(request, staff_ok=True)
        res = ESQL.process_outbox_batch(limit=limit)
        return {"success": True, **res}

    # ------------------------------------------------------------------
    # PHASE 5 — REFUNDS & CHARGEBACK RECONCILIATION DESK
    # ------------------------------------------------------------------
    @router.post("/api/refunds/request")
    def api_request_refund(payload: dict, request: Request = None):
        d = payload or {}
        tid = clean(d.get("tsap_id", ""), 40, "tsap_id").upper()
        require_owner(request, tid)
        st = get_state()
        ESQL.sync_payment_orders(st["payments"])
        ok, msg, rec = ESQL.create_refund_case(
            tid,
            order_id=str(d.get("order_id", "")),
            amount_inr=int(d.get("amount_inr", 0) or 0),
            kind=str(d.get("kind", "refund")),
            reason=str(d.get("reason", "")),
        )
        if not ok:
            raise HTTPException(400, msg)
        log_consent("refund_requested", tid, tid, note=f"Refund case {rec['refund_id']} opened.")
        return {"success": True, "refund": rec}

    @router.get("/api/refunds/{tsap_id}")
    def api_member_refunds(tsap_id: str, request: Request = None):
        tid = clean(tsap_id, 40, "tsap_id").upper()
        require_owner(request, tid)
        items = ESQL.list_refund_cases(tsap_id=tid)
        return {"success": True, "count": len(items), "refunds": items}

    @router.get("/api/admin/refunds")
    def api_admin_refunds(status: str = "all", request: Request = None):
        require_admin(request, staff_ok=False)
        items = ESQL.list_refund_cases(status=status)
        return {"success": True, "count": len(items), "refunds": items}

    @router.post("/api/admin/refunds/{refund_id}/resolve")
    def api_admin_resolve_refund(refund_id: str, payload: dict, request: Request = None):
        role = require_admin(request, staff_ok=False)
        d = payload or {}
        ok, msg, rec = ESQL.resolve_refund_case(
            refund_id,
            status=str(d.get("status", "")),
            handled_by=role,
            staff_note=str(d.get("staff_note", "")),
        )
        if not ok:
            raise HTTPException(400, msg)
        return {"success": True, "refund": rec}

    # ------------------------------------------------------------------
    # PHASE 6 — INDEXED SEARCH V2 WITH KEYSET CURSOR & ETAG (304)
    # ------------------------------------------------------------------
    @router.post("/api/admin/search-v2/rebuild")
    def api_admin_rebuild_search_v2(request: Request = None):
        require_admin(request, staff_ok=True)
        st = get_state()
        ESQL.sync_interests_and_blocks(st["interests"], st["blocks"])
        cnt = ESQL.rebuild_search_projection(st["users"], ECOSYSTEM3.parse_salary_bounds_inr)
        return {"success": True, "indexed_profiles": cnt}

    @router.get("/api/v2/search")
    def api_search_v2(
        gender: str = "",
        age_min: int = 18,
        age_max: int = 60,
        caste: str = "",
        district: str = "",
        state: str = "",
        mother_tongue: str = "",
        salary_min: int = 0,
        nri_only: bool = False,
        cursor: str = "",
        limit: int = 24,
        request: Request = None,
    ):
        st = get_state()
        ESQL.rebuild_search_projection(st["users"], ECOSYSTEM3.parse_salary_bounds_inr)
        ident = token_from_request(request)
        viewer_id = str(ident.get("tsap_id") or "") if ident else ""
        if viewer_id:
            ESQL.sync_interests_and_blocks(st["interests"], st["blocks"])

        res = ESQL.query_indexed_search_v2(
            gender=gender,
            age_min=age_min,
            age_max=age_max,
            caste=caste,
            district=district,
            state=state,
            mother_tongue=mother_tongue,
            salary_min=salary_min,
            nri_only=nri_only,
            cursor=cursor,
            limit=limit,
            viewer_id=viewer_id,
        )
        etag = res["etag"]
        inm = (request.headers.get("if-none-match") or "").strip() if request else ""
        if inm and inm == etag:
            return Response(status_code=304, headers={"ETag": etag, "Cache-Control": "private, max-age=15"})
        return JSONResponse(
            content={"success": True, **res},
            headers={"ETag": etag, "Cache-Control": "private, max-age=15"},
        )

    # ------------------------------------------------------------------
    # PHASE 7 — LEGAL HOLDS & DISASTER-RECOVERY DRILL
    # ------------------------------------------------------------------
    @router.get("/api/admin/legal-holds")
    def api_admin_list_legal_holds(status: str = "active", request: Request = None):
        require_admin(request, staff_ok=False)
        holds = EOPS.list_legal_holds(status=status)
        return {"success": True, "count": len(holds), "holds": holds}

    @router.post("/api/admin/legal-holds")
    def api_admin_place_legal_hold(payload: dict, request: Request = None):
        role = require_admin(request, staff_ok=False)
        d = payload or {}
        tid = clean(d.get("tsap_id", ""), 40, "tsap_id").upper()
        ok, msg, rec = EOPS.place_legal_hold(tid, str(d.get("reason", "")), actor=role)
        if not ok:
            raise HTTPException(400, msg)
        return {"success": True, "hold": rec}

    @router.post("/api/admin/legal-holds/{hold_id}/release")
    def api_admin_release_legal_hold(hold_id: str, request: Request = None):
        role = require_admin(request, staff_ok=False)
        ok, msg = EOPS.release_legal_hold(hold_id, actor=role)
        if not ok:
            raise HTTPException(404, msg)
        return {"success": True, "status": msg}

    @router.post("/api/admin/dr/drill")
    def api_admin_dr_drill(request: Request = None):
        role = require_admin(request, staff_ok=False)
        st = get_state()
        IDENTITY_REPO.sync_from_users(st["users"], token_version_fn=token_version)
        proof = EOPS.run_disaster_recovery_drill(
            st["users"], st["interests"], st["payments"], token_version_fn=token_version, actor=role
        )
        return {"success": True, "drill": proof}

    # ------------------------------------------------------------------
    # PHASE 8 — FEATURE FLAGS, COARSE FUNNEL TELEMETRY & AMBASSADORS
    # ------------------------------------------------------------------
    @router.get("/api/flags")
    def api_get_flags():
        data = EOPS.get_feature_flags()
        return {"success": True, "flags": {k: bool(v.get("enabled")) for k, v in data["flags"].items()}}

    @router.get("/api/admin/flags")
    def api_admin_get_flags(request: Request = None):
        require_admin(request, staff_ok=True)
        return {"success": True, **EOPS.get_feature_flags()}

    @router.post("/api/admin/flags")
    def api_admin_set_flag(payload: dict, request: Request = None):
        role = require_admin(request, staff_ok=False)
        d = payload or {}
        ok, msg, rec = EOPS.set_feature_flag(
            str(d.get("flag", "")),
            bool(d.get("enabled", False)),
            owner=str(d.get("owner", "platform-ops")),
            actor=role,
        )
        if not ok:
            raise HTTPException(400, msg)
        return {"success": True, "flag": rec}

    @router.post("/api/analytics/coarse-event")
    def api_record_coarse_event(payload: dict):
        d = payload or {}
        recorded = EOPS.record_coarse_funnel_event(
            str(d.get("event", "")), consent_granted=bool(d.get("consent", True))
        )
        return {"success": True, "recorded": recorded}

    @router.get("/api/admin/analytics/funnel")
    def api_admin_funnel_summary(request: Request = None):
        require_admin(request, staff_ok=True)
        return {"success": True, **EOPS.get_funnel_summary()}

    @router.post("/api/ambassadors/apply")
    def api_apply_ambassador(payload: dict, request: Request = None):
        d = payload or {}
        tid = clean(d.get("tsap_id", ""), 40, "tsap_id").upper()
        require_owner(request, tid)
        ok, msg, rec = EOPS.apply_ambassador(
            tid,
            district=str(d.get("district", "")),
            community=str(d.get("community", "")),
            statement=str(d.get("statement", "")),
        )
        if not ok:
            raise HTTPException(400, msg)
        return {"success": True, "application": rec}

    # ------------------------------------------------------------------
    # PHASE 9 — AI ASSIST TRIAGE (PII REDACTION + KILL SWITCH + HUMAN ONLY)
    # ------------------------------------------------------------------
    @router.post("/api/admin/ai-assist/kill-switch")
    def api_admin_ai_kill_switch(payload: dict, request: Request = None):
        role = require_admin(request, staff_ok=False)
        d = payload or {}
        state = EOPS.set_ai_kill_switch(bool(d.get("enabled", False)), actor=role, reason=str(d.get("reason", "")))
        return {"success": True, "enabled": state["enabled"], "calls_today": state["calls_today"]}

    @router.post("/api/admin/ai-assist/triage")
    def api_admin_ai_triage(payload: dict, request: Request = None):
        role = require_admin(request, staff_ok=True)
        d = payload or {}
        ok, msg, res = EOPS.triage_moderation_or_support(
            kind=str(d.get("kind", "moderation")),
            raw_text=str(d.get("text", "")),
            distinct_reporters=int(d.get("distinct_reporters", 0) or 0),
            actor=role,
        )
        if not ok:
            raise HTTPException(503, msg)
        return {"success": True, "triage": res}

    # ------------------------------------------------------------------
    # PHASE 10 — BUREAU V2 SETTINGS, SSRF-SAFE CRM WEBHOOKS & SCOPED EXPORT
    # ------------------------------------------------------------------
    @router.post("/api/v2/bureaus/{bureau_id}/settings")
    def api_bureau_v2_settings(bureau_id: str, payload: dict, request: Request = None):
        bid = clean(bureau_id, 32, "bureau_id").upper()
        d = payload or {}
        key = (request.headers.get("x-bureau-key") or str(d.get("bureau_key") or "")).strip() if request else ""
        authed, role, _ = PHASE2.authenticate_bureau(bid, key)
        if not authed or role != "owner":
            raise HTTPException(403, "Only the authenticated bureau owner can configure v2 settings.")
        ok, msg, rec = EOPS.configure_bureau_v2_settings(
            bid,
            sla_tier=str(d.get("sla_tier", "standard")),
            webhook_url=str(d.get("webhook_url", "")),
        )
        if not ok:
            raise HTTPException(400, msg)
        return {"success": True, "settings": rec}

    @router.get("/api/v2/bureaus/{bureau_id}/export")
    def api_bureau_v2_export(bureau_id: str, request: Request = None):
        bid = clean(bureau_id, 32, "bureau_id").upper()
        key = (request.headers.get("x-bureau-key") or "").strip() if request else ""
        authed, role, _ = PHASE2.authenticate_bureau(bid, key)
        if not authed:
            raise HTTPException(403, "Unauthorized bureau access key.")
        ws = PHASE2.get_bureau_workspace(bid, viewer_role=role)
        if not ws:
            raise HTTPException(404, "Bureau tenant not found.")
        bundle = EOPS.export_bureau_tenant_bundle(ws)
        return JSONResponse(
            content=bundle,
            headers={
                "Content-Disposition": f'attachment; filename="mana-vivaha-bureau-{bid}.json"',
                "Cache-Control": "private, no-store",
            },
        )

    # ------------------------------------------------------------------
    # PHASE 11 & 12 — TRANSPARENT PUBLIC SYSTEM STATUS & SLO MONITOR
    # ------------------------------------------------------------------
    @router.get("/api/status")
    def api_public_system_status():
        st = get_state()
        IDENTITY_REPO.sync_from_users(st["users"], token_version_fn=token_version)
        parity = IDENTITY_REPO.reconcile(st["users"], token_version_fn=token_version)
        indexed = ESQL.rebuild_search_projection(st["users"], ECOSYSTEM3.parse_salary_bounds_inr)
        report = EOPS.build_public_status_report(
            sql_parity_ok=bool(parity.get("parity_ok")),
            indexed_profiles=indexed,
        )
        return {"success": True, **report}

    return router
