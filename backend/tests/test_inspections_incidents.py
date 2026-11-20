import io
import uuid
import pytest
from PIL import Image
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import mongodb
from app.core.seed import seed_database

@pytest.fixture(autouse=True)
async def setup_db():
    await mongodb.connect()
    assert mongodb.db is not None
    await seed_database(mongodb.db)

async def get_auth_token(client: AsyncClient, email: str, password: str) -> str:
    res = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["tokens"]["access_token"]

def get_error_message(res) -> str:
    data = res.json()
    if "error" in data and "message" in data["error"]:
        return data["error"]["message"]
    return data.get("detail", "")

@pytest.mark.asyncio
async def test_inspection_creation_and_scoring():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        insp_token = await get_auth_token(client, "inspector@constructsafe.com", "Inspector@123456")
        headers = {"Authorization": f"Bearer {insp_token}"}

        # 1. Get Hudson project
        res_projs = await client.get("/api/v1/projects", headers=headers)
        assert res_projs.status_code == 200
        hudson_id = next(p["id"] for p in res_projs.json()["items"] if p["code"] == "PRJ-HUDSON-01")

        # 2. Create inspection with checklist
        checklist = [
            {"item_id": "C-1", "category": "PPE", "description": "Helmets worn", "status": "pass", "photos": []},
            {"item_id": "C-2", "category": "Heights", "description": "Harness tied off", "status": "pass", "photos": []},
            {"item_id": "C-3", "category": "Housekeeping", "description": "Pathway clear", "status": "fail", "notes": "Debris present", "photos": []},
            {"item_id": "C-4", "category": "Signage", "description": "Warning signs", "status": "na", "photos": []}
        ]
        payload = {
            "title": "Weekly Safety Audit - East Wing",
            "project_id": hudson_id,
            "checklist_items": checklist,
            "notes": "Initial walk-through checklist."
        }
        res_create = await client.post("/api/v1/inspections", json=payload, headers=headers)
        assert res_create.status_code == 201
        data = res_create.json()
        assert data["title"] == "Weekly Safety Audit - East Wing"
        assert data["project_id"] == hudson_id
        # 2 pass, 1 fail out of 3 scorable items -> 66.7%
        assert data["overall_score"] == 66.7
        insp_id = data["id"]

        # 3. Update checklist item C-3 to pass and mark completed
        checklist[2]["status"] = "pass"
        res_update = await client.patch(
            f"/api/v1/inspections/{insp_id}",
            json={"checklist_items": checklist, "status": "completed"},
            headers=headers
        )
        assert res_update.status_code == 200
        updated_data = res_update.json()
        assert updated_data["status"] == "completed"
        # 3 pass out of 3 scorable -> 100.0%
        assert updated_data["overall_score"] == 100.0
        assert updated_data["completed_at"] is not None

@pytest.mark.asyncio
async def test_worker_hazard_reporting_and_project_scoping():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        worker_token = await get_auth_token(client, "worker@constructsafe.com", "Worker@123456")
        admin_token = await get_auth_token(client, "admin@constructsafe.com", "Admin@123456")

        # Get Hudson project (assigned to worker) and Harbor project (unassigned)
        res_admin = await client.get("/api/v1/projects?size=100", headers={"Authorization": f"Bearer {admin_token}"})
        hudson_id = next(p["id"] for p in res_admin.json()["items"] if p["code"] == "PRJ-HUDSON-01")
        harbor_id = next(p["id"] for p in res_admin.json()["items"] if p["code"] == "PRJ-HARBOR-03")

        # 1. Worker submits hazard observation on assigned project
        payload = {
            "title": "Loose scaffolding clamp near hoist line",
            "project_id": hudson_id,
            "incident_category": "near_miss",
            "severity": "minor_injury",
            "description": "Observed loose bolt on scaffolding bay 4 while transporting material.",
            "location_details": "Scaffold Bay 4 - Floor 12"
        }
        res_report = await client.post(
            "/api/v1/incidents",
            json=payload,
            headers={"Authorization": f"Bearer {worker_token}"}
        )
        assert res_report.status_code == 201
        report_data = res_report.json()
        assert report_data["incident_category"] == "near_miss"
        assert report_data["status"] == "reported"
        incident_id = report_data["id"]

        # 2. Worker can inspect their own report
        res_view = await client.get(
            f"/api/v1/incidents/{incident_id}",
            headers={"Authorization": f"Bearer {worker_token}"}
        )
        assert res_view.status_code == 200
        assert res_view.json()["id"] == incident_id

        # 3. Worker attempting to report on unassigned project is rejected with 403
        payload_unauth = {
            "title": "Illegal report on unassigned site",
            "project_id": harbor_id,
            "incident_category": "unsafe_working_condition",
            "severity": "near_miss",
            "description": "Worker has no badge on Harbor project."
        }
        res_unauth = await client.post(
            "/api/v1/incidents",
            json=payload_unauth,
            headers={"Authorization": f"Bearer {worker_token}"}
        )
        assert res_unauth.status_code == 403
        assert "not authorized" in get_error_message(res_unauth).lower() or "only report incidents" in get_error_message(res_unauth).lower()

@pytest.mark.asyncio
async def test_evidence_file_upload_restrictions():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        insp_token = await get_auth_token(client, "inspector@constructsafe.com", "Inspector@123456")
        headers = {"Authorization": f"Bearer {insp_token}"}

        # 1. Valid image upload (PNG)
        buf = io.BytesIO()
        Image.new("RGB", (10, 10), color="green").save(buf, format="PNG")
        valid_png_content = buf.getvalue()
        files = {"file": ("hazard_evidence.png", io.BytesIO(valid_png_content), "image/png")}
        res_upload = await client.post("/api/v1/storage/upload", files=files, headers=headers)
        assert res_upload.status_code == 200
        data = res_upload.json()
        assert data["success"] is True
        assert data["url"].startswith("/api/v1/storage/files/")
        assert data["filename"].endswith(".png")

        # 2. Retrieve uploaded file
        res_get_file = await client.get(data["url"], headers=headers)
        assert res_get_file.status_code == 200
        assert res_get_file.content == valid_png_content

        # 3. Invalid file type rejected (.sh script)
        bad_files = {"file": ("exploit.sh", io.BytesIO(b"echo 'malicious'"), "application/x-sh")}
        res_bad = await client.post("/api/v1/storage/upload", files=bad_files, headers=headers)
        assert res_bad.status_code == 400
        assert "Unsupported file extension" in get_error_message(res_bad)

        # 4. Oversized file rejected (>10MB)
        oversized_data = b"0" * (10 * 1024 * 1024 + 1024)
        large_files = {"file": ("huge_photo.jpg", io.BytesIO(oversized_data), "image/jpeg")}
        res_large = await client.post("/api/v1/storage/upload", files=large_files, headers=headers)
        assert res_large.status_code == 413

@pytest.mark.asyncio
async def test_corrective_action_full_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        pm_token = await get_auth_token(client, "pm@constructsafe.com", "Manager@123456")
        insp_token = await get_auth_token(client, "inspector@constructsafe.com", "Inspector@123456")
        worker_token = await get_auth_token(client, "worker@constructsafe.com", "Worker@123456")

        # 1. PM creates a corrective action
        res_projs = await client.get("/api/v1/projects", headers={"Authorization": f"Bearer {pm_token}"})
        hudson = next(p for p in res_projs.json()["items"] if p["code"] == "PRJ-HUDSON-01")

        # Get PM's user ID
        res_me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {pm_token}"})
        pm_user_id = res_me.json()["id"]

        action_payload = {
            "title": "Install secondary barricade along elevator hoistway",
            "description": "Construct high-visibility wooden barrier per standard detail S-104.",
            "project_id": hudson["id"],
            "source_type": "hazard",
            "source_id": str(uuid.uuid4().hex[:24]),
            "priority": "high",
            "assigned_to": pm_user_id,
            "due_date": "2026-11-25T17:00:00Z"
        }
        res_create = await client.post(
            "/api/v1/corrective-actions",
            json=action_payload,
            headers={"Authorization": f"Bearer {pm_token}"}
        )
        assert res_create.status_code == 201
        action_data = res_create.json()
        assert action_data["status"] == "open"
        action_id = action_data["id"]

        # 2. Update to pending verification with resolution notes
        res_patch = await client.patch(
            f"/api/v1/corrective-actions/{action_id}",
            json={
                "status": "pending_verification",
                "resolution_notes": "Barricade constructed and anchored with yellow caution flags."
            },
            headers={"Authorization": f"Bearer {pm_token}"}
        )
        assert res_patch.status_code == 200
        assert res_patch.json()["status"] == "pending_verification"

        # 3. Worker attempting to close/verify without inspector clearance is rejected (403)
        res_worker_close = await client.patch(
            f"/api/v1/corrective-actions/{action_id}",
            json={"status": "completed"},
            headers={"Authorization": f"Bearer {worker_token}"}
        )
        assert res_worker_close.status_code == 403

        # 4. Inspector verifies and closes the action
        res_verify = await client.patch(
            f"/api/v1/corrective-actions/{action_id}",
            json={
                "status": "completed",
                "verification_notes": "On-site inspection completed. Barricade is sturdy and compliant."
            },
            headers={"Authorization": f"Bearer {insp_token}"}
        )
        assert res_verify.status_code == 200
        verified_data = res_verify.json()
        assert verified_data["status"] == "completed"
        assert verified_data["verified_by"] is not None
        assert verified_data["verification_notes"] == "On-site inspection completed. Barricade is sturdy and compliant."

@pytest.mark.asyncio
async def test_client_incident_confidentiality_protection():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        client_token = await get_auth_token(client, "client@constructsafe.com", "Client@123456")
        admin_token = await get_auth_token(client, "admin@constructsafe.com", "Admin@123456")

        # Admin lists incidents
        res_admin = await client.get("/api/v1/incidents?size=100", headers={"Authorization": f"Bearer {admin_token}"})
        assert res_admin.status_code == 200
        inc = next(i for i in res_admin.json()["items"] if i["incident_number"] == "INC-2026-0001")
        # Admin sees witness statements in investigation
        assert inc["investigation"] is not None
        assert len(inc["investigation"]["witness_statements"]) > 0

        # Client lists incidents
        res_client = await client.get("/api/v1/incidents?size=100", headers={"Authorization": f"Bearer {client_token}"})
        assert res_client.status_code == 200
        client_inc = next(i for i in res_client.json()["items"] if i["incident_number"] == "INC-2026-0001")
        # Client sees incident summary and root cause, but confidential witness statements are stripped
        assert client_inc["title"] == inc["title"]
        assert len(client_inc["investigation"]["witness_statements"]) == 0
        assert len(client_inc["witness_details"]) == 0

@pytest.mark.asyncio
async def test_notification_endpoints():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        pm_token = await get_auth_token(client, "pm@constructsafe.com", "Manager@123456")
        headers = {"Authorization": f"Bearer {pm_token}"}

        # 1. List user notifications
        res = await client.get("/api/v1/notifications", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "items" in data
        assert "unread_count" in data

        if data["items"]:
            first_notif_id = data["items"][0]["id"]
            # 2. Mark single notification as read
            res_read = await client.patch(f"/api/v1/notifications/{first_notif_id}/read", headers=headers)
            assert res_read.status_code == 200
            assert res_read.json()["is_read"] is True

        # 3. Mark all as read
        res_read_all = await client.patch("/api/v1/notifications/read-all", headers=headers)
        assert res_read_all.status_code == 200
        assert res_read_all.json()["success"] is True
