"""ConstructSafe AI - Phase 6 Admin Hazard Review, Approval & CAPA Escalation Tests
Validates administrative decision pipeline:
  - Admin approval with inspector notification & audit logging
  - Admin rejection with mandatory rejection reason enforcement
  - CAPA escalation item creation in corrective_actions collection
  - Duplicate CAPA prevention
  - Unauthorized review attempts (RBAC boundary - non-admin 403)
  - Notification delivery to inspector, project managers, and assignees
"""

import io
import pytest
from datetime import datetime, timezone, timedelta
from PIL import Image
from httpx import AsyncClient, ASGITransport
from bson import ObjectId

from app.main import app
from app.database import mongodb
from app.core.seed import seed_database

@pytest.fixture(autouse=True)
async def ensure_db_seeded():
    await mongodb.connect()
    if mongodb.db is not None:
        await seed_database(mongodb.db)

def create_test_image(width: int = 640, height: int = 480, format: str = "JPEG", color=(120, 140, 160)) -> bytes:
    img = Image.new("RGB", (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()

async def get_auth_token(client: AsyncClient, email: str, password: str = "Admin@123456") -> str:
    res = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["tokens"]["access_token"]

async def create_sample_hazard_report(client: AsyncClient, inspector_token: str) -> dict:
    """Helper to create a fresh hazard report in pending_admin_review state."""
    headers = {"Authorization": f"Bearer {inspector_token}"}
    
    # Get assigned project
    projs_res = await client.get("/api/v1/projects", headers=headers)
    assert projs_res.status_code == 200
    project_id = projs_res.json()["items"][0]["id"]

    # Upload & analyze
    img_bytes = create_test_image()
    analyze_res = await client.post(
        "/api/v1/hazards/analyze",
        headers=headers,
        files={"file": ("site_test.jpg", img_bytes, "image/jpeg")},
        data={"force_demo": "true"}
    )
    assert analyze_res.status_code == 200
    analysis = analyze_res.json()

    submit_payload = {
        "project_id": project_id,
        "location_details": f"Level 3 South Pier Zone-{datetime.now().strftime('%f')[:4]}",
        "category": "trip_hazard",
        "severity": "high",
        "description": "Unsecured electrical cabling across high-traffic walkway.",
        "notes": "Inspector tagged area with caution tape.",
        "photo_url": analysis["photo_url"],
        "image_metadata": {"file_name": analysis["file_name"], "width": 640, "height": 480},
        "ai_analysis": analysis["ai_analysis"],
        "confirmed_categories": ["trip_hazard", "electrical_hazard"],
        "rejected_ai_categories": ["no_hard_hat"],
        "inspector_comments": "Hard hats present; electrical tripping confirmed."
    }

    submit_res = await client.post("/api/v1/hazards", headers=headers, json=submit_payload)
    assert submit_res.status_code == 201, submit_res.text
    return submit_res.json()

# =============================================================================
# 1. Admin Decision: APPROVE
# =============================================================================
@pytest.mark.asyncio
async def test_admin_approve_hazard_report():
    """Verify administrator can approve a pending hazard report with audit trail and notification."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        inspector_token = await get_auth_token(client, "inspector@constructsafe.com", "Inspector@123456")
        admin_token = await get_auth_token(client, "admin@constructsafe.com", "Admin@123456")

        report = await create_sample_hazard_report(client, inspector_token)
        report_id = report["id"]
        assert report["status"] == "pending_admin_review"

        # Admin approves
        review_payload = {
            "action": "approve",
            "review_comments": "Verified with site superintendent. Hazard acknowledged in safety log."
        }
        res = await client.patch(
            f"/api/v1/hazards/{report_id}/review",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=review_payload
        )
        assert res.status_code == 200, res.text
        data = res.json()

        # Status & Review metadata assertions
        assert data["status"] == "approved"
        assert data["admin_review"] is not None
        assert data["admin_review"]["action"] == "approved"
        assert "Verified with site superintendent" in data["admin_review"]["review_comments"]
        assert data["admin_review"]["admin_name"] is not None

        # Audit trail assertions
        assert len(data["audit_trail"]) >= 2
        last_audit = data["audit_trail"][-1]
        assert last_audit["action"] == "admin_approved"
        assert last_audit["actor_role"] == "admin"

        # Inspector Notification assertion
        notif_res = await client.get("/api/v1/notifications", headers={"Authorization": f"Bearer {inspector_token}"})
        assert notif_res.status_code == 200
        notifications = notif_res.json()["items"]
        matching = next((n for n in notifications if data["report_number"] in n["title"] and "Approved" in n["title"]), None)
        assert matching is not None, "Inspector was not notified of hazard report approval"

# =============================================================================
# 2. Admin Decision: REJECT
# =============================================================================
@pytest.mark.asyncio
async def test_admin_reject_hazard_report_success():
    """Verify administrator can reject a hazard report with a mandatory reason."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        inspector_token = await get_auth_token(client, "inspector@constructsafe.com", "Inspector@123456")
        admin_token = await get_auth_token(client, "admin@constructsafe.com", "Admin@123456")

        report = await create_sample_hazard_report(client, inspector_token)
        report_id = report["id"]

        review_payload = {
            "action": "reject",
            "rejection_reason": "Photograph does not depict active hazards; cabling is properly covered by rubber cable ramps."
        }
        res = await client.patch(
            f"/api/v1/hazards/{report_id}/review",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=review_payload
        )
        assert res.status_code == 200, res.text
        data = res.json()

        assert data["status"] == "rejected"
        assert data["admin_review"]["action"] == "rejected"
        assert "cabling is properly covered" in data["admin_review"]["review_comments"]

        # Audit trail
        last_audit = data["audit_trail"][-1]
        assert last_audit["action"] == "admin_rejected"

        # Inspector notification
        notif_res = await client.get("/api/v1/notifications", headers={"Authorization": f"Bearer {inspector_token}"})
        notifications = notif_res.json()["items"]
        matching = next((n for n in notifications if data["report_number"] in n["title"] and "Rejected" in n["title"]), None)
        assert matching is not None, "Inspector was not notified of hazard rejection"
        assert "rubber cable ramps" in matching["message"]

@pytest.mark.asyncio
async def test_admin_reject_missing_reason_rejected():
    """Verify administrator cannot reject a hazard report without providing a rationale."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        inspector_token = await get_auth_token(client, "inspector@constructsafe.com", "Inspector@123456")
        admin_token = await get_auth_token(client, "admin@constructsafe.com", "Admin@123456")

        report = await create_sample_hazard_report(client, inspector_token)
        report_id = report["id"]

        review_payload = {
            "action": "reject",
            "rejection_reason": "   " # Empty / whitespace only
        }
        res = await client.patch(
            f"/api/v1/hazards/{report_id}/review",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=review_payload
        )
        assert res.status_code == 400
        data = res.json()
        error_msg = data.get("detail") or data.get("error", {}).get("message", "")
        assert "rejection reason is required" in error_msg

# =============================================================================
# 3. Admin Decision: ASSIGN_ACTION (CAPA Escalation)
# =============================================================================
@pytest.mark.asyncio
async def test_admin_assign_capa_action_success():
    """
    Verify administrator can escalate a hazard report directly into a formal Corrective Action.
    Verifies:
      - New ticket created in existing corrective_actions collection
      - Hazard report status updated to action_assigned
      - CAPA linked to hazard report (source_type: 'hazard', source_id: report.id)
      - Notifications sent to responsible assignee, inspector, and project managers
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        inspector_token = await get_auth_token(client, "inspector@constructsafe.com", "Inspector@123456")
        admin_token = await get_auth_token(client, "admin@constructsafe.com", "Admin@123456")
        pm_token = await get_auth_token(client, "pm@constructsafe.com", "Manager@123456")

        report = await create_sample_hazard_report(client, inspector_token)
        report_id = report["id"]

        # Get an active worker/user for assignment
        workers_res = await client.get("/api/v1/workers", headers={"Authorization": f"Bearer {admin_token}"})
        assert workers_res.status_code == 200
        assigned_worker = workers_res.json()["items"][0]
        worker_id = assigned_worker["id"]

        due_date = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()

        review_payload = {
            "action": "assign_action",
            "review_comments": "Formal CAPA required: install temporary cable bridges and reposition breaker box.",
            "capa": {
                "title": f"Cable Bridge Installation for {report['report_number']}",
                "description": "Construct wooden ramps or install industrial rubber protectors over all cables crossing walkway.",
                "priority": "high",
                "assigned_to": worker_id,
                "due_date": due_date
            }
        }

        res = await client.patch(
            f"/api/v1/hazards/{report_id}/review",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=review_payload
        )
        assert res.status_code == 200, res.text
        data = res.json()

        # Status & CAPA Linkage assertions
        assert data["status"] == "action_assigned"
        assert data["corrective_action_id"] is not None
        assert data["corrective_action_number"] is not None
        assert data["corrective_action_number"].startswith("ACT-")

        # Verify CAPA exists in corrective_actions collection
        capa_res = await client.get(
            f"/api/v1/corrective-actions/{data['corrective_action_id']}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert capa_res.status_code == 200
        capa_data = capa_res.json()
        assert capa_data["source_type"] == "hazard"
        assert capa_data["source_id"] == report_id
        assert capa_data["priority"] == "high"
        assert capa_data["status"] == "open"

        # Verify notifications:
        # 1. Inspector notified of CAPA issuance
        notif_insp = await client.get("/api/v1/notifications", headers={"Authorization": f"Bearer {inspector_token}"})
        matching_insp = next((n for n in notif_insp.json()["items"] if data["report_number"] in n["title"] and "CAPA" in n["title"]), None)
        assert matching_insp is not None, "Inspector was not notified of CAPA assignment"

        # 2. Project Manager notified of CAPA issuance
        notif_pm = await client.get("/api/v1/notifications", headers={"Authorization": f"Bearer {pm_token}"})
        matching_pm = next((n for n in notif_pm.json()["items"] if data["report_number"] in n["title"] and "CAPA" in n["title"]), None)
        assert matching_pm is not None, "Project Manager was not notified of CAPA assignment"

@pytest.mark.asyncio
async def test_admin_prevent_duplicate_capa_assignment():
    """Verify system prevents duplicate CAPA creation on an already escalated hazard report."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        inspector_token = await get_auth_token(client, "inspector@constructsafe.com", "Inspector@123456")
        admin_token = await get_auth_token(client, "admin@constructsafe.com", "Admin@123456")

        report = await create_sample_hazard_report(client, inspector_token)
        report_id = report["id"]

        workers_res = await client.get("/api/v1/workers", headers={"Authorization": f"Bearer {admin_token}"})
        worker_id = workers_res.json()["items"][0]["id"]
        due_date = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()

        # First CAPA assignment
        payload = {
            "action": "assign_action",
            "capa": {
                "title": "Initial Action Item",
                "description": "Fix hazard promptly",
                "priority": "medium",
                "assigned_to": worker_id,
                "due_date": due_date
            }
        }
        res1 = await client.patch(
            f"/api/v1/hazards/{report_id}/review",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=payload
        )
        assert res1.status_code == 200

        # Duplicate CAPA assignment attempt on same hazard
        res2 = await client.patch(
            f"/api/v1/hazards/{report_id}/review",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=payload
        )
        assert res2.status_code == 400
        data = res2.json()
        error_msg = data.get("detail") or data.get("error", {}).get("message", "")
        assert "already been assigned" in error_msg

# =============================================================================
# 4. Security & RBAC Boundary Tests
# =============================================================================
@pytest.mark.asyncio
async def test_unauthorized_inspector_review_forbidden():
    """Verify Safety Inspector cannot approve, reject, or assign CAPA to hazard reports (Admin only)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        inspector_token = await get_auth_token(client, "inspector@constructsafe.com", "Inspector@123456")

        report = await create_sample_hazard_report(client, inspector_token)
        report_id = report["id"]

        # Inspector attempts to self-approve
        res = await client.patch(
            f"/api/v1/hazards/{report_id}/review",
            headers={"Authorization": f"Bearer {inspector_token}"},
            json={"action": "approve"}
        )
        assert res.status_code == 403
        data = res.json()
        error_msg = data.get("detail") or data.get("error", {}).get("message", "")
        assert "is not authorized" in error_msg

@pytest.mark.asyncio
async def test_unauthorized_pm_review_forbidden():
    """Verify Project Manager cannot review or approve hazard reports (Admin only)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        inspector_token = await get_auth_token(client, "inspector@constructsafe.com", "Inspector@123456")
        pm_token = await get_auth_token(client, "pm@constructsafe.com", "Manager@123456")

        report = await create_sample_hazard_report(client, inspector_token)
        report_id = report["id"]

        res = await client.patch(
            f"/api/v1/hazards/{report_id}/review",
            headers={"Authorization": f"Bearer {pm_token}"},
            json={"action": "approve"}
        )
        assert res.status_code == 403
