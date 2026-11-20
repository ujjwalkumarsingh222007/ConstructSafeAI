import uuid
import pytest
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
async def test_admin_create_and_manage_project():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        admin_token = await get_auth_token(client, "admin@constructsafe.com", "Admin@123456")
        headers = {"Authorization": f"Bearer {admin_token}"}

        test_code = f"PRJ-APEX-{uuid.uuid4().hex[:4].upper()}"

        # 1. Create a new project
        payload = {
            "name": "Apex Industrial Complex",
            "code": test_code,
            "client_name": "Apex Holdings",
            "description": "Logistics hub and cold storage facility.",
            "location": {
                "address": "400 Logistics Blvd",
                "city": "Newark",
                "state": "NJ",
                "country": "US"
            },
            "status": "active",
            "safety_target_rate": 97.0
        }
        res = await client.post("/api/v1/projects", json=payload, headers=headers)
        assert res.status_code == 201
        data = res.json()
        assert data["code"] == test_code
        assert data["name"] == "Apex Industrial Complex"
        assert data["status"] == "active"
        project_id = data["id"]

        # 2. Get project details
        get_res = await client.get(f"/api/v1/projects/{project_id}", headers=headers)
        assert get_res.status_code == 200
        assert get_res.json()["id"] == project_id

        # 3. Update project details
        patch_res = await client.patch(
            f"/api/v1/projects/{project_id}",
            json={"name": "Apex Logistics Hub", "status": "paused"},
            headers=headers
        )
        assert patch_res.status_code == 200
        assert patch_res.json()["name"] == "Apex Logistics Hub"
        assert patch_res.json()["status"] == "paused"

        # 4. Soft-delete project
        del_res = await client.delete(f"/api/v1/projects/{project_id}", headers=headers)
        assert del_res.status_code == 204

        # 5. Confirm project is no longer returned in list
        list_res = await client.get("/api/v1/projects", headers=headers)
        codes = [p["code"] for p in list_res.json()["items"]]
        assert test_code not in codes

@pytest.mark.asyncio
async def test_duplicate_project_code_rejected():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        admin_token = await get_auth_token(client, "admin@constructsafe.com", "Admin@123456")
        headers = {"Authorization": f"Bearer {admin_token}"}

        # PRJ-HUDSON-01 was seeded
        res = await client.post("/api/v1/projects", json={
            "name": "Duplicate Project",
            "code": "PRJ-HUDSON-01",
            "client_name": "Test Client"
        }, headers=headers)
        assert res.status_code == 409
        assert "already exists" in get_error_message(res)

@pytest.mark.asyncio
async def test_invalid_objectid_handling():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        admin_token = await get_auth_token(client, "admin@constructsafe.com", "Admin@123456")
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Invalid project ID
        res = await client.get("/api/v1/projects/not-a-valid-id", headers=headers)
        assert res.status_code == 400
        assert "Invalid Project ID format" in get_error_message(res)

        # Invalid worker ID
        res_w = await client.get("/api/v1/workers/not-a-valid-id", headers=headers)
        assert res_w.status_code == 400
        assert "Invalid Worker ID format" in get_error_message(res_w)

@pytest.mark.asyncio
async def test_role_scoped_project_access():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        admin_token = await get_auth_token(client, "admin@constructsafe.com", "Admin@123456")
        pm_token = await get_auth_token(client, "pm@constructsafe.com", "Manager@123456")
        inspector_token = await get_auth_token(client, "inspector@constructsafe.com", "Inspector@123456")
        client_token = await get_auth_token(client, "client@constructsafe.com", "Client@123456")
        worker_token = await get_auth_token(client, "worker@constructsafe.com", "Worker@123456")

        # Admin sees all 3 seeded projects
        res_admin = await client.get("/api/v1/projects?size=100", headers={"Authorization": f"Bearer {admin_token}"})
        assert res_admin.status_code == 200
        admin_codes = {p["code"] for p in res_admin.json()["items"]}
        assert "PRJ-HUDSON-01" in admin_codes
        assert "PRJ-METRO-02" in admin_codes
        assert "PRJ-HARBOR-03" in admin_codes

        # PM sees only assigned projects (HUDSON and METRO), not HARBOR
        res_pm = await client.get("/api/v1/projects?size=100", headers={"Authorization": f"Bearer {pm_token}"})
        assert res_pm.status_code == 200
        pm_codes = {p["code"] for p in res_pm.json()["items"]}
        assert "PRJ-HUDSON-01" in pm_codes
        assert "PRJ-METRO-02" in pm_codes
        assert "PRJ-HARBOR-03" not in pm_codes

        # Inspector sees only assigned HUDSON
        res_insp = await client.get("/api/v1/projects?size=100", headers={"Authorization": f"Bearer {inspector_token}"})
        assert res_insp.status_code == 200
        insp_codes = {p["code"] for p in res_insp.json()["items"]}
        assert "PRJ-HUDSON-01" in insp_codes
        assert "PRJ-HARBOR-03" not in insp_codes

        # Client sees only assigned HUDSON
        res_client = await client.get("/api/v1/projects?size=100", headers={"Authorization": f"Bearer {client_token}"})
        assert res_client.status_code == 200
        client_codes = {p["code"] for p in res_client.json()["items"]}
        assert "PRJ-HUDSON-01" in client_codes
        assert "PRJ-HARBOR-03" not in client_codes

        # Worker sees only assigned HUDSON
        res_worker = await client.get("/api/v1/projects?size=100", headers={"Authorization": f"Bearer {worker_token}"})
        assert res_worker.status_code == 200
        worker_codes = {p["code"] for p in res_worker.json()["items"]}
        assert "PRJ-HUDSON-01" in worker_codes
        assert "PRJ-HARBOR-03" not in worker_codes

        # Non-admin attempting to create a project is forbidden
        res_forbidden = await client.post(
            "/api/v1/projects",
            json={"name": "Unauthorized Site", "code": "PRJ-UNAUTH-99", "client_name": "Test"},
            headers={"Authorization": f"Bearer {pm_token}"}
        )
        assert res_forbidden.status_code == 403

@pytest.mark.asyncio
async def test_cross_project_access_restrictions():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        admin_token = await get_auth_token(client, "admin@constructsafe.com", "Admin@123456")
        pm_token = await get_auth_token(client, "pm@constructsafe.com", "Manager@123456")
        client_token = await get_auth_token(client, "client@constructsafe.com", "Client@123456")

        # Get HARBOR project ID from admin list (unassigned to PM and Client)
        res_admin = await client.get("/api/v1/projects?size=100", headers={"Authorization": f"Bearer {admin_token}"})
        harbor_proj = next(p for p in res_admin.json()["items"] if p["code"] == "PRJ-HARBOR-03")
        harbor_id = harbor_proj["id"]

        # PM attempting to view unassigned project details receives 403
        res_pm = await client.get(f"/api/v1/projects/{harbor_id}", headers={"Authorization": f"Bearer {pm_token}"})
        assert res_pm.status_code == 403
        assert "not authorized" in get_error_message(res_pm).lower()

        # Client attempting to view unassigned project details receives 403
        res_client = await client.get(f"/api/v1/projects/{harbor_id}", headers={"Authorization": f"Bearer {client_token}"})
        assert res_client.status_code == 403

        # PM attempting to update unassigned project receives 403
        res_update = await client.patch(
            f"/api/v1/projects/{harbor_id}",
            json={"name": "Hacked Harbor"},
            headers={"Authorization": f"Bearer {pm_token}"}
        )
        assert res_update.status_code == 403

@pytest.mark.asyncio
async def test_worker_management_and_rbac():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        admin_token = await get_auth_token(client, "admin@constructsafe.com", "Admin@123456")
        worker_token = await get_auth_token(client, "worker@constructsafe.com", "Worker@123456")
        client_token = await get_auth_token(client, "client@constructsafe.com", "Client@123456")

        res_admin = await client.get("/api/v1/projects?size=100", headers={"Authorization": f"Bearer {admin_token}"})
        hudson_id = next(p for p in res_admin.json()["items"] if p["code"] == "PRJ-HUDSON-01")["id"]

        emp_code = f"W-{uuid.uuid4().hex[:4].upper()}"

        new_worker_payload = {
            "employee_id": emp_code,
            "first_name": "Elena",
            "last_name": "Soto",
            "trade": "Safety Officer",
            "email": f"elena.{emp_code.lower()}@site.com",
            "phone": "+1-555-0988",
            "current_project_id": hudson_id,
            "assigned_project_ids": [hudson_id],
            "emergency_contact": {
                "name": "Marco Soto",
                "relation": "Brother",
                "phone": "+1-555-0999"
            },
            "status": "active",
            "training_status": "certified"
        }
        res_create = await client.post(
            "/api/v1/workers",
            json=new_worker_payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res_create.status_code == 201
        created_w = res_create.json()
        assert created_w["employee_id"] == emp_code
        assert created_w["full_name"] == "Elena Soto"
        worker_id = created_w["id"]

        # 2. Duplicate employee_id rejected with 409
        res_dup = await client.post(
            "/api/v1/workers",
            json=new_worker_payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res_dup.status_code == 409
        assert "already exists" in get_error_message(res_dup)

        # 3. Client cannot browse worker directory (403)
        res_client_workers = await client.get("/api/v1/workers", headers={"Authorization": f"Bearer {client_token}"})
        assert res_client_workers.status_code == 403

        # 4. Worker cannot browse worker directory (403)
        res_w_list = await client.get("/api/v1/workers", headers={"Authorization": f"Bearer {worker_token}"})
        assert res_w_list.status_code == 403

        # 5. Worker can access their own profile via /workers/me
        res_me = await client.get("/api/v1/workers/me", headers={"Authorization": f"Bearer {worker_token}"})
        assert res_me.status_code == 200
        assert res_me.json()["employee_id"] == "W-1001"
        assert res_me.json()["full_name"] == "David Miller"

        # 6. Worker cannot access another worker's profile (403)
        res_other = await client.get(f"/api/v1/workers/{worker_id}", headers={"Authorization": f"Bearer {worker_token}"})
        assert res_other.status_code == 403

        # 7. Admin updates worker status
        res_patch = await client.patch(
            f"/api/v1/workers/{worker_id}",
            json={"trade": "Senior Safety Lead", "status": "on_leave"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res_patch.status_code == 200
        assert res_patch.json()["trade"] == "Senior Safety Lead"
        assert res_patch.json()["status"] == "on_leave"

        # 8. Admin soft-deletes worker
        res_del = await client.delete(f"/api/v1/workers/{worker_id}", headers={"Authorization": f"Bearer {admin_token}"})
        assert res_del.status_code == 204

@pytest.mark.asyncio
async def test_assignments_endpoints():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        admin_token = await get_auth_token(client, "admin@constructsafe.com", "Admin@123456")
        headers = {"Authorization": f"Bearer {admin_token}"}

        # List existing assignments, or create one if empty
        res = await client.get("/api/v1/assignments", headers=headers)
        assert res.status_code == 200
        data = res.json()
        if data["total"] == 0:
            # Create a test assignment first
            projs_res = await client.get("/api/v1/projects", headers=headers)
            workers_res = await client.get("/api/v1/workers", headers=headers)
            proj_id = projs_res.json()["items"][0]["id"]
            worker_id = workers_res.json()["items"][0]["id"]
            create_assign = await client.post(
                "/api/v1/assignments",
                headers=headers,
                json={
                    "project_id": proj_id,
                    "worker_id": worker_id,
                    "role_in_project": "worker"
                }
            )
            assert create_assign.status_code == 201
            res = await client.get("/api/v1/assignments", headers=headers)
            data = res.json()

        assert data["total"] > 0
        assign_id = data["items"][0]["id"]

        # Delete assignment
        del_res = await client.delete(f"/api/v1/assignments/{assign_id}", headers=headers)
        assert del_res.status_code == 204
