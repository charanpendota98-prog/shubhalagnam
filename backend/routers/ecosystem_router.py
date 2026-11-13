"""
Modular FastAPI router for Ecosystem 3.0 endpoints (extracted from backend/main.py
to keep main.py lean while preserving 100% route & payload compatibility).
"""
from __future__ import annotations

from typing import Any, Callable, Dict
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

import ecosystem3 as ECOSYSTEM3
import safety
import topmatch


def build_ecosystem_router(ctx: Dict[str, Callable[..., Any] | Any]) -> APIRouter:
    router = APIRouter(tags=["ecosystem3"])

    clean = ctx["clean"]
    find_user = ctx["find_user"]
    require_owner = ctx["require_owner"]
    require_admin = ctx["require_admin"]
    is_admin = ctx["is_admin"]
    token_from_request = ctx["token_from_request"]
    persist_core_state = ctx["persist_core_state"]
    log_consent = ctx["log_consent"]
    media_filename = ctx["media_filename"]
    is_approved_profile = ctx["is_approved_profile"]
    safe_user = ctx["safe_user"]
    vendor_is_active_listing = ctx["vendor_is_active_listing"]
    get_state = ctx["get_state"]

    @router.get("/api/verification/{tsap_id}/badges")
    def api_member_badges(tsap_id: str, request: Request = None):
        tid = clean(tsap_id, 40, "tsap_id").upper()
        u = find_user(tid)
        if not u:
            raise HTTPException(404, "Profile not found")
        data = ECOSYSTEM3.member_badges(u)
        ident = token_from_request(request)
        is_self = bool(ident and str(ident.get("tsap_id", "")).upper() == tid)
        if not is_self and not is_admin(request):
            data["submissions"] = []
        return {"success": True, **data}

    @router.post("/api/verification/{tsap_id}/submit")
    def api_submit_verification_evidence(tsap_id: str, payload: dict, request: Request = None):
        tid = clean(tsap_id, 40, "tsap_id").upper()
        require_owner(request, tid)
        u = find_user(tid)
        if not u:
            raise HTTPException(404, "Profile not found")
        d = payload or {}
        summary = str(d.get("summary") or d.get("evidence_note") or "")
        doc_type = str(d.get("document_type") or d.get("badge_type") or "")
        ok, msg, rec = ECOSYSTEM3.submit_verification_evidence(
            u,
            badge_type=str(d.get("badge_type", "")),
            summary=summary,
            document_type=doc_type,
        )
        if not ok:
            raise HTTPException(400, msg)
        return {
            "success": True,
            "status": msg,
            "record": rec,
            "message_en": "Submitted for manual staff review. Badges are granted only after verification.",
            "message_telugu": "✅ మాన్యువల్ సమీక్ష కోసం నమోదు అయింది — బృందం పరిశీలించిన తర్వాతే బ్యాడ్జ్ వస్తుంది.",
        }

    @router.get("/api/admin/verification/queue")
    def api_admin_verification_queue(status: str = "pending", request: Request = None):
        require_admin(request, staff_ok=True)
        norm = "pending" if status in ("pending", "pending_review") else status
        items = ECOSYSTEM3.list_verification_queue(norm)
        return {"success": True, "count": len(items), "items": items}

    @router.post("/api/admin/verification/{record_id}/review")
    def api_admin_verification_review(record_id: str, payload: dict, request: Request = None):
        role = require_admin(request, staff_ok=True)
        d = payload or {}
        st = get_state()
        ok, msg, rec = ECOSYSTEM3.review_verification_evidence(
            record_id,
            decision=str(d.get("decision", "")),
            reviewer=str(d.get("reviewer") or role),
            rejection_reason=str(d.get("rejection_reason") or d.get("reason") or ""),
            users=st["users"],
        )
        if not ok:
            raise HTTPException(400, msg)
        persist_core_state()
        return {"success": True, "decision": msg, "record": rec}

    @router.post("/api/safety/appeal")
    def api_submit_appeal(payload: dict, request: Request = None):
        d = payload or {}
        tid = clean(d.get("tsap_id", ""), 40, "tsap_id").upper()
        require_owner(request, tid)
        u = find_user(tid)
        if not u:
            raise HTTPException(404, "Profile not found")
        reason = str(d.get("reason") or d.get("statement") or "")
        ctx_note = str(d.get("context_note") or d.get("statement") or "")
        ok, msg, rec = ECOSYSTEM3.submit_appeal(u, reason, ctx_note)
        if not ok:
            raise HTTPException(400, msg)
        return {
            "success": True,
            "kind": msg,
            "appeal": rec,
            "message_en": "Appeal recorded for human moderation review.",
            "message_telugu": "✅ మీ అప్పీల్ మాన్యువల్ సమీక్ష కోసం నమోదు అయింది.",
        }

    @router.get("/api/safety/appeals/{tsap_id}")
    def api_member_appeals(tsap_id: str, request: Request = None):
        tid = clean(tsap_id, 40, "tsap_id").upper()
        require_owner(request, tid)
        items = ECOSYSTEM3.list_member_appeals(tid)
        return {"success": True, "count": len(items), "items": items, "appeals": items}

    @router.get("/api/admin/appeals")
    def api_admin_appeals(status: str = "open", request: Request = None):
        require_admin(request, staff_ok=True)
        norm = "open" if status in ("open", "pending") else status
        items = ECOSYSTEM3.list_admin_appeals(norm)
        return {"success": True, "count": len(items), "items": items, "appeals": items}

    @router.post("/api/admin/appeals/{appeal_id}/resolve")
    def api_admin_resolve_appeal(appeal_id: str, payload: dict, request: Request = None):
        role = require_admin(request, staff_ok=True)
        d = payload or {}
        st = get_state()
        outcome = str(d.get("outcome") or d.get("decision") or "")
        ok, msg, rec = ECOSYSTEM3.resolve_appeal(
            appeal_id,
            outcome=outcome,
            reviewer=str(d.get("reviewer") or role),
            note=str(d.get("note", "")),
            users=st["users"],
        )
        if not ok:
            raise HTTPException(400, msg)
        persist_core_state()
        return {"success": True, "outcome": msg, "appeal": rec}

    @router.post("/api/photo/access/request")
    def api_photo_access_request(payload: dict, request: Request = None):
        d = payload or {}
        vid = clean(d.get("viewer_id", ""), 40, "viewer_id").upper()
        oid = clean(d.get("owner_id", ""), 40, "owner_id").upper()
        require_owner(request, vid)
        if not find_user(vid) or not find_user(oid):
            raise HTTPException(404, "Profile not found")
        st = get_state()
        if safety.is_blocked(vid, oid, st["blocks"]):
            raise HTTPException(403, "Action unavailable")
        ok, msg, rec = ECOSYSTEM3.request_photo_access(vid, oid, str(d.get("note", "")))
        if not ok:
            raise HTTPException(400, msg)
        log_consent("photo_access_requested", vid, oid, note="Member requested private photo viewing permission.")
        return {"success": True, "status": msg, "grant": rec}

    @router.post("/api/photo/access/respond")
    def api_photo_access_respond(payload: dict, request: Request = None):
        d = payload or {}
        oid = clean(d.get("owner_id", ""), 40, "owner_id").upper()
        require_owner(request, oid)
        ok, msg, rec = ECOSYSTEM3.respond_photo_access(
            oid,
            grant_id=clean(d.get("grant_id", ""), 40, "grant_id"),
            decision=str(d.get("decision", "")),
            days=int(d.get("days", 7) or 7),
        )
        if not ok:
            raise HTTPException(400, msg)
        log_consent(f"photo_access_{msg}", oid, str(rec.get("viewer_id", "")), note=f"Owner set private photo access to {msg}.")
        return {"success": True, "status": msg, "grant": rec}

    @router.get("/api/photo/access/{tsap_id}")
    def api_photo_access_list(tsap_id: str, request: Request = None):
        tid = clean(tsap_id, 40, "tsap_id").upper()
        require_owner(request, tid)
        return {"success": True, **ECOSYSTEM3.list_photo_access_for_member(tid)}

    @router.post("/api/photo/access/signed-url")
    def api_photo_signed_url(payload: dict, request: Request = None):
        d = payload or {}
        vid = clean(d.get("viewer_id", ""), 40, "viewer_id").upper()
        oid = clean(d.get("owner_id", ""), 40, "owner_id").upper()
        require_owner(request, vid)
        owner = find_user(oid)
        st = get_state()
        if not owner or safety.is_blocked(vid, oid, st["blocks"]):
            raise HTTPException(404, "Photo not found")
        if vid != oid and not ECOSYSTEM3.has_photo_access(vid, oid):
            raise HTTPException(403, "Photo access has not been granted by the profile owner.")
        fn = media_filename(owner.get("photo_url"), "/photos/")
        if not fn:
            raise HTTPException(404, "Photo not found")
        ttl = max(60, min(3600, int(d.get("ttl_seconds", 1800) or 1800)))
        tok = ECOSYSTEM3.create_signed_photo_token(fn, vid, oid, ttl_seconds=ttl)
        return {"success": True, "signed_url": f"/photos/{fn}?access_token={tok}", "expires_in_seconds": ttl}

    @router.get("/api/credits/{tsap_id}/ledger")
    def api_member_credit_ledger(tsap_id: str, request: Request = None):
        tid = clean(tsap_id, 40, "tsap_id").upper()
        require_owner(request, tid)
        u = find_user(tid)
        if not u:
            raise HTTPException(404, "Profile not found")
        data = ECOSYSTEM3.member_credit_ledger(u)
        persist_core_state()
        return {"success": True, **data}

    @router.get("/api/payments/{tsap_id}/receipts")
    def api_member_receipts(tsap_id: str, request: Request = None):
        tid = clean(tsap_id, 40, "tsap_id").upper()
        require_owner(request, tid)
        u = find_user(tid)
        if not u:
            raise HTTPException(404, "Profile not found")
        st = get_state()
        receipts = ECOSYSTEM3.build_member_receipts(u, st["payments"], st["paypro_orders"])
        return {"success": True, "tsap_id": tid, "count": len(receipts), "receipts": receipts}

    @router.post("/api/family/{tsap_id}/invite")
    def api_family_invite(tsap_id: str, payload: dict, request: Request = None):
        tid = clean(tsap_id, 40, "tsap_id").upper()
        require_owner(request, tid)
        u = find_user(tid)
        if not u:
            raise HTTPException(404, "Profile not found")
        d = payload or {}
        ok, msg, inv = ECOSYSTEM3.invite_family_member(
            u,
            collaborator_name=str(d.get("name", "")),
            relation=str(d.get("relation", "parent")),
            can_shortlist=bool(d.get("can_shortlist", True)),
            can_suggest=bool(d.get("can_suggest", True)),
            can_draft_preferences=bool(d.get("can_draft_preferences", False)),
        )
        if not ok:
            raise HTTPException(400, msg)
        log_consent("family_invite_created", tid, tid, note=f"Owner invited {inv['collaborator_name']} ({inv['relation']}).")
        return {"success": True, "invite": inv}

    @router.post("/api/family/accept-invite")
    def api_family_accept_invite(payload: dict):
        d = payload or {}
        ok, msg, res = ECOSYSTEM3.accept_family_invite(str(d.get("invite_code", "")))
        if not ok:
            raise HTTPException(400, msg)
        collab = res["collaborator"]
        log_consent("family_invite_accepted", collab["owner_tsap_id"], collab["owner_tsap_id"],
                    note=f"Family collaborator {collab['name']} accepted invite.")
        return {"success": True, **res}

    @router.get("/api/family/{tsap_id}")
    def api_family_hub(tsap_id: str, request: Request = None):
        tid = clean(tsap_id, 40, "tsap_id").upper()
        ident = token_from_request(request)
        is_family_collab = bool(
            ident and str(ident.get("scope", "")) == "family"
            and str(ident.get("tsap_id", "")).startswith(f"family:{tid}:")
        )
        if not is_family_collab:
            require_owner(request, tid)
        if not find_user(tid):
            raise HTTPException(404, "Profile not found")
        return {"success": True, **ECOSYSTEM3.family_hub_snapshot(tid)}

    @router.post("/api/family/{tsap_id}/revoke/{collaborator_id}")
    def api_family_revoke(tsap_id: str, collaborator_id: str, request: Request = None):
        tid = clean(tsap_id, 40, "tsap_id").upper()
        require_owner(request, tid)
        ok, msg = ECOSYSTEM3.revoke_family_member(tid, collaborator_id)
        if not ok:
            raise HTTPException(404, msg)
        log_consent("family_collaborator_revoked", tid, tid, note=f"Revoked collaborator {collaborator_id}.")
        return {"success": True, "status": msg}

    @router.post("/api/family/{tsap_id}/suggest")
    def api_family_suggest_match(tsap_id: str, payload: dict, request: Request = None):
        tid = clean(tsap_id, 40, "tsap_id").upper()
        d = payload or {}
        ident = token_from_request(request)
        actor = "Owner"
        if ident and str(ident.get("scope", "")) == "family" and str(ident.get("tsap_id", "")).startswith(f"family:{tid}:"):
            collab_id = str(ident.get("tsap_id", "")).split(":")[-1]
            snap = ECOSYSTEM3.family_hub_snapshot(tid)
            active = next((c for c in snap["collaborators"] if c.get("collaborator_id") == collab_id and c.get("status") == "active"), None)
            if not active or not active.get("permissions", {}).get("can_suggest", True):
                raise HTTPException(403, "Collaborator access revoked or lacks suggest permission.")
            actor = f"{active.get('name')} ({active.get('relation')})"
        else:
            require_owner(request, tid)
        cid = clean(d.get("candidate_tsap_id", ""), 40, "candidate_tsap_id").upper()
        if not find_user(cid):
            raise HTTPException(404, "Candidate profile not found")
        ok, msg, rec = ECOSYSTEM3.suggest_match_for_family(tid, cid, actor, str(d.get("note", "")))
        if not ok:
            raise HTTPException(400, msg)
        return {"success": True, "suggestion": rec}

    @router.post("/api/support/tickets")
    def api_create_support_ticket(payload: dict, request: Request = None):
        d = payload or {}
        tid = clean(d.get("tsap_id", ""), 40, "tsap_id").upper()
        require_owner(request, tid)
        u = find_user(tid)
        if not u:
            raise HTTPException(404, "Profile not found")
        ok, msg, rec = ECOSYSTEM3.create_support_ticket(
            u,
            category=str(d.get("category", "general")),
            subject=str(d.get("subject", "")),
            message=str(d.get("message", "")),
        )
        if not ok:
            raise HTTPException(400, msg)
        return {"success": True, "ticket": rec}

    @router.get("/api/support/tickets/{tsap_id}")
    def api_member_support_tickets(tsap_id: str, request: Request = None):
        tid = clean(tsap_id, 40, "tsap_id").upper()
        require_owner(request, tid)
        items = ECOSYSTEM3.list_member_tickets(tid)
        return {"success": True, "count": len(items), "tickets": items}

    @router.get("/api/admin/support/tickets")
    def api_admin_support_tickets(status: str = "open", request: Request = None):
        require_admin(request, staff_ok=True)
        items = ECOSYSTEM3.list_admin_tickets(status)
        return {"success": True, "count": len(items), "tickets": items}

    @router.post("/api/admin/support/tickets/{ticket_id}/reply")
    def api_admin_reply_support_ticket(ticket_id: str, payload: dict, request: Request = None):
        role = require_admin(request, staff_ok=True)
        d = payload or {}
        ok, msg, rec = ECOSYSTEM3.reply_support_ticket(
            ticket_id,
            reply_text=str(d.get("reply", "")),
            responder=str(d.get("responder") or role),
            status=str(d.get("status", "answered")),
        )
        if not ok:
            raise HTTPException(400, msg)
        return {"success": True, "ticket": rec}

    @router.post("/api/vendors/{vendor_id}/quote")
    def api_vendor_quote_request(vendor_id: str, payload: dict, request: Request = None):
        d = payload or {}
        tid = clean(d.get("tsap_id", ""), 40, "tsap_id").upper()
        require_owner(request, tid)
        member = find_user(tid)
        if not member:
            raise HTTPException(404, "Member profile not found")
        vid_clean = clean(vendor_id, 40, "vendor_id").upper()
        st = get_state()
        v_row = next(
            (x for x in st["vendors"]
             if str(x.get("id", "")).upper() == vid_clean and vendor_is_active_listing(x)),
            None,
        )
        if not v_row:
            raise HTTPException(404, "Active vendor not found")
        ok, msg, rec = ECOSYSTEM3.submit_vendor_quote_request(
            member,
            v_row,
            event_date=str(d.get("event_date", "")),
            city=str(d.get("city", "")),
            guest_count=int(d.get("guest_count", 0) or 0),
            budget_range=str(d.get("budget_range") or d.get("budget_inr") or ""),
            notes=str(d.get("notes") or d.get("requirements") or ""),
        )
        if not ok:
            raise HTTPException(400, msg)
        return {"success": True, "quote": rec}

    @router.get("/api/vendors/{vendor_id}/reviews")
    def api_list_vendor_reviews(vendor_id: str):
        return {"success": True, **ECOSYSTEM3.list_vendor_reviews(vendor_id)}

    @router.post("/api/vendors/{vendor_id}/reviews")
    def api_submit_vendor_review(vendor_id: str, payload: dict, request: Request = None):
        d = payload or {}
        tid = clean(d.get("tsap_id", ""), 40, "tsap_id").upper()
        require_owner(request, tid)
        member = find_user(tid)
        if not member:
            raise HTTPException(404, "Member profile not found")
        vid_clean = clean(vendor_id, 40, "vendor_id").upper()
        st = get_state()
        v_row = next(
            (x for x in st["vendors"]
             if str(x.get("id", "")).upper() == vid_clean and vendor_is_active_listing(x)),
            None,
        )
        if not v_row:
            raise HTTPException(404, "Active vendor not found")
        review_text = str(d.get("review_text") or d.get("comment") or "")
        ok, msg, rec = ECOSYSTEM3.submit_verified_vendor_review(
            member, vid_clean, int(d.get("rating", 0) or 0), review_text, vendor_leads=st["vendor_leads"]
        )
        if not ok:
            raise HTTPException(403, msg)
        return {"success": True, "kind": msg, "review": rec}

    @router.get("/api/matches/{tsap_id}/categories")
    def api_categorized_matches(tsap_id: str, per_category: int = 12, request: Request = None):
        tid = clean(tsap_id, 40, "tsap_id").upper()
        require_owner(request, tid)
        u = find_user(tid)
        if not u:
            raise HTTPException(404, "Profile not found")
        st = get_state()
        eligible = [
            p for p in st["users"]
            if is_approved_profile(p) and not safety.is_blocked(tid, str(p.get("tsap_id", "")), st["blocks"])
        ]
        my_saved = [s for s in st["saved_searches"] if str(s.get("tsap_id", "")).upper() == tid]
        raw = topmatch.categorize_matches_v3(u, eligible, saved_searches=my_saved, per_category_limit=per_category)
        for cat in raw.get("categories", {}).values():
            for row in cat.get("items", []):
                if isinstance(row.get("profile"), dict):
                    row["profile"] = safe_user(row["profile"])
        return {"success": True, "tsap_id": tid, **raw}

    @router.get("/api/me/{tsap_id}/data-export")
    def api_member_data_export(tsap_id: str, request: Request = None):
        tid = clean(tsap_id, 40, "tsap_id").upper()
        require_owner(request, tid)
        u = find_user(tid)
        if not u:
            raise HTTPException(404, "Profile not found")
        log_consent("member_data_export", tid, tid, note="Member downloaded self-service JSON data export.")
        st = get_state()
        export_payload = ECOSYSTEM3.build_member_data_export(
            u,
            interests=st["interests"],
            payments=st["payments"],
            saved_searches=st["saved_searches"],
            consent_ledger=st["consent_ledger"],
            blocks=st["blocks"],
        )
        return JSONResponse(
            content=export_payload,
            headers={
                "Content-Disposition": f'attachment; filename="mana-vivaha-data-{tid}.json"',
                "Cache-Control": "private, no-store",
            },
        )

    return router
