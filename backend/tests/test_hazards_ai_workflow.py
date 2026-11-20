"""ConstructSafe AI - Phase 5 AI Photo Hazard Analysis & Verification Tests
Validates static image inference, model truthfulness, format validation,
RBAC project scoping, human-in-the-loop inspector submission, MongoDB persistence,
audit logging, and in-app admin notifications.
"""

import io
import os
import pytest
from datetime import datetime, timezone
from PIL import Image
from httpx import AsyncClient, ASGITransport
from bson import ObjectId

from app.main import app
from app.database import mongodb
from app.core.seed import seed_database
from ai_engine.detector import HazardDetector, MAX_IMAGE_SIZE_BYTES

@pytest.fixture(autouse=True)
async def ensure_db_seeded():
    await mongodb.connect()
    if mongodb.db is not None:
        await seed_database(mongodb.db)

# Helper to generate test JPEG in memory
def create_test_image(width: int = 640, height: int = 480, format: str = "JPEG", color=(100, 150, 200)) -> bytes:
    img = Image.new("RGB", (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()

async def get_auth_token(client: AsyncClient, email: str, password: str = "Admin@123456") -> str:
    res = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["tokens"]["access_token"]

# =============================================================================
# 1. AI Detector Unit Tests (Model Truthfulness, Device, Error Handling)
# =============================================================================
def test_detector_device_selection():
    """Verify detector correctly initializes CPU and validates device assignment."""
    detector_cpu = HazardDetector(device="cpu", force_demo_mode=True)
    assert detector_cpu.device == "cpu"
    assert detector_cpu.is_simulated is True
    assert "Demo/Testing Mode" in detector_cpu.model_name

def test_detector_model_truthfulness_and_disclaimer():
    """Verify that absent custom weights trigger explicit disclaimers and never fake AI results."""
    detector = HazardDetector(model_path="non_existent_weights.pt", force_demo_mode=True)
    assert detector.is_custom_hazard_model is False
    assert detector.is_simulated is True
    assert "DEMO / TESTING MODE" in detector.disclaimer

    # Test image analysis in demo mode
    img_bytes = create_test_image()
    res = detector.analyze_image(img_bytes)
    assert res["is_simulated"] is True
    assert res["is_custom_hazard_model"] is False
    assert len(res["detections"]) > 0
    for d in res["detections"]:
        assert "category" in d
        assert "confidence" in d
        assert "bbox" in d
        assert len(d["bbox"]) == 4
        assert "normalized_bbox" in d
        assert len(d["normalized_bbox"]) == 4
        # Normalized coords must be in [0, 1]
        for coord in d["normalized_bbox"]:
            assert 0.0 <= coord <= 1.0

def test_detector_invalid_image_validation():
    """Verify Pillow validator raises explicit ValueError on corrupted image bytes."""
    corrupted_bytes = b"NOT_A_VALID_IMAGE_DATA_STREAM_123456789"
    with pytest.raises(ValueError, match="Corrupted or unreadable image file"):
        HazardDetector.validate_image_bytes(corrupted_bytes)

def test_detector_oversized_image_validation():
    """Verify Pillow validator rejects oversized byte payloads."""
    huge_bytes = b"0" * (MAX_IMAGE_SIZE_BYTES + 1024)
    with pytest.raises(ValueError, match="exceeds maximum allowable size"):
        HazardDetector.validate_image_bytes(huge_bytes)

# =============================================================================
# 2. Integration Tests: POST /api/v1/hazards/analyze
# =============================================================================
@pytest.mark.asyncio
async def test_analyze_endpoint_valid_image():
    """Verify /api/v1/hazards/analyze successfully analyzes photo and returns canonical payload."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = await get_auth_token(client, "admin@constructsafe.com")
        headers = {"Authorization": f"Bearer {token}"}

        img_bytes = create_test_image(width=800, height=600, format="JPEG")
        files = {"file": ("site_photo.jpg", img_bytes, "image/jpeg")}
        data = {"force_demo": "true"}

        res = await client.post("/api/v1/hazards/analyze", headers=headers, files=files, data=data)
        assert res.status_code == 200, res.text
        payload = res.json()

        assert "photo_url" in payload
        assert payload["photo_url"].startswith("/api/v1/storage/files/hazard_")
        assert payload["width"] == 800
        assert payload["height"] == 600
        assert "ai_analysis" in payload

        ai_meta = payload["ai_analysis"]
        assert ai_meta["model_version"] == "v1.0"
        assert ai_meta["is_simulated"] is True
        assert len(ai_meta["raw_detections"]) > 0
        assert len(ai_meta["suggested_categories"]) > 0
        assert "disclaimer" in ai_meta

@pytest.mark.asyncio
async def test_analyze_endpoint_invalid_file_format():
    """Verify uploading a non-image file returns 400 Bad Request."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = await get_auth_token(client, "admin@constructsafe.com")
        headers = {"Authorization": f"Bearer {token}"}

        files = {"file": ("malicious_script.sh", b"#!/bin/bash\necho hello", "text/x-shellscript")}
        res = await client.post("/api/v1/hazards/analyze", headers=headers, files=files)
        assert res.status_code == 400
        data = res.json()
        error_msg = data.get("detail") or data.get("error", {}).get("message", "")
        assert "Unsupported file format" in error_msg

@pytest.mark.asyncio
async def test_analyze_endpoint_corrupted_image():
    """Verify uploading a file with JPG extension but corrupted payload returns 400."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = await get_auth_token(client, "admin@constructsafe.com")
        headers = {"Authorization": f"Bearer {token}"}

        files = {"file": ("broken.jpg", b"corrupted bytes inside fake image", "image/jpeg")}
        res = await client.post("/api/v1/hazards/analyze", headers=headers, files=files)
        assert res.status_code == 400
        data = res.json()
        error_msg = data.get("detail") or data.get("error", {}).get("message", "")
        assert "Corrupted or unreadable image" in error_msg

# =============================================================================
# 3. Integration Tests: POST /api/v1/hazards (Submission & Scoping)
# =============================================================================
@pytest.mark.asyncio
async def test_submit_hazard_report_as_inspector_success():
    """
    Test Safety Inspector submitting official hazard report with human-confirmed findings.
    Verifies:
      - Initial status is pending_admin_review
      - Unique HAZ-YYYY-NNNN code generated
      - Inspector confirmation record stored
      - Audit trail initial entry logged
      - In-app notification delivered to Admin
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Inspector token
        inspector_token = await get_auth_token(client, "inspector@constructsafe.com", "Inspector@123456")
        headers = {"Authorization": f"Bearer {inspector_token}"}

        # 2. Get assigned project for inspector
        projs_res = await client.get("/api/v1/projects", headers=headers)
        assert projs_res.status_code == 200
        assigned_projects = projs_res.json()["items"]
        assert len(assigned_projects) > 0
        target_project = assigned_projects[0]
        project_id = target_project["id"]

        # 3. Upload photo to analyze
        img_bytes = create_test_image(width=640, height=480)
        analyze_res = await client.post(
            "/api/v1/hazards/analyze",
            headers=headers,
            files={"file": ("scaffold_hazard.jpg", img_bytes, "image/jpeg")},
            data={"force_demo": "true"}
        )
        assert analyze_res.status_code == 200
        analysis_data = analyze_res.json()

        # 4. Submit official report
        submit_payload = {
            "project_id": project_id,
            "location_details": "Scaffold Platform Level 4, East Elevation",
            "category": "trip_hazard",
            "severity": "high",
            "description": "Loose scaffolding planks and unanchored materials observed adjacent to open floor edge.",
            "notes": "Workers advised to steer clear until guard rails and toe boards are repositioned.",
            "photo_url": analysis_data["photo_url"],
            "image_metadata": {
                "file_name": analysis_data["file_name"],
                "width": analysis_data["width"],
                "height": analysis_data["height"]
            },
            "ai_analysis": analysis_data["ai_analysis"],
            "confirmed_categories": ["trip_hazard", "no_safety_vest"],
            "rejected_ai_categories": ["no_hard_hat"],
            "inspector_comments": "Hard hat was present but partially obscured; trip hazard and vest violation confirmed."
        }

        submit_res = await client.post("/api/v1/hazards", headers=headers, json=submit_payload)
        assert submit_res.status_code == 201, submit_res.text
        report_out = submit_res.json()

        # Assertions
        assert report_out["report_number"].startswith("HAZ-")
        assert report_out["status"] == "pending_admin_review"
        assert report_out["category"] == "trip_hazard"
        assert report_out["severity"] == "high"
        assert report_out["location_details"] == "Scaffold Platform Level 4, East Elevation"
        assert report_out["inspector_confirmation"]["confirmed_categories"] == ["trip_hazard", "no_safety_vest"]
        assert report_out["inspector_confirmation"]["rejected_ai_categories"] == ["no_hard_hat"]
        
        # Verify audit trail
        assert len(report_out["audit_trail"]) >= 1
        assert report_out["audit_trail"][0]["action"] == "submitted_by_inspector"
        assert report_out["audit_trail"][0]["actor_role"] == "safety_inspector"

        # Verify admin in-app notification exists
        admin_token = await get_auth_token(client, "admin@constructsafe.com")
        notif_res = await client.get("/api/v1/notifications", headers={"Authorization": f"Bearer {admin_token}"})
        assert notif_res.status_code == 200
        notifications = notif_res.json()["items"]
        matching_notif = next((n for n in notifications if report_out["report_number"] in n["title"]), None)
        assert matching_notif is not None, "Admin did not receive in-app notification for submitted hazard report."
        assert matching_notif["type"] == "hazard"

@pytest.mark.asyncio
async def test_submit_hazard_report_unassigned_project_forbidden():
    """Verify Safety Inspector cannot submit a report for an unassigned project (RBAC boundary)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Admin creates an unassigned project
        admin_token = await get_auth_token(client, "admin@constructsafe.com")
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        new_proj_res = await client.post(
            "/api/v1/projects",
            headers=admin_headers,
            json={
                "name": "Restricted Unassigned Tower",
                "code": f"PRJ-RESTRICT-{datetime.now().strftime('%M%S')}",
                "client_name": "Metro Properties",
                "status": "active"
            }
        )
        assert new_proj_res.status_code == 201
        unassigned_project_id = new_proj_res.json()["id"]

        # Inspector tries to submit hazard report for this unassigned project
        inspector_token = await get_auth_token(client, "inspector@constructsafe.com", "Inspector@123456")
        inspector_headers = {"Authorization": f"Bearer {inspector_token}"}

        submit_payload = {
            "project_id": unassigned_project_id,
            "location_details": "Roof Deck Zone A",
            "category": "electrical_hazard",
            "severity": "critical",
            "description": "Unauthorized attempt to report on unassigned site.",
            "photo_url": "/api/v1/storage/files/fake.jpg",
            "confirmed_categories": ["electrical_hazard"]
        }

        res = await client.post("/api/v1/hazards", headers=inspector_headers, json=submit_payload)
        assert res.status_code == 403
        data = res.json()
        error_msg = data.get("detail") or data.get("error", {}).get("message", "")
        assert "not assigned as a Safety Inspector to this project" in error_msg

@pytest.mark.asyncio
async def test_submit_hazard_report_worker_role_forbidden():
    """Verify Worker role cannot submit official hazard reports (restricted to Inspector/Admin)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        worker_token = await get_auth_token(client, "worker@constructsafe.com", "Worker@123456")
        headers = {"Authorization": f"Bearer {worker_token}"}

        submit_payload = {
            "project_id": str(ObjectId()),
            "location_details": "Zone 1",
            "category": "spill_hazard",
            "severity": "medium",
            "description": "Worker attempting inspector submission",
            "photo_url": "/api/v1/storage/files/fake.jpg"
        }

        res = await client.post("/api/v1/hazards", headers=headers, json=submit_payload)
        assert res.status_code == 403
        data = res.json()
        error_msg = data.get("detail") or data.get("error", {}).get("message", "")
        assert "Only Safety Inspectors and Administrators" in error_msg

# =============================================================================
# 4. Integration Tests: GET /api/v1/hazards & GET /api/v1/hazards/{id}
# =============================================================================
@pytest.mark.asyncio
async def test_list_and_get_hazard_reports():
    """Verify list filtering and detailed single hazard report fetch."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        admin_token = await get_auth_token(client, "admin@constructsafe.com")
        headers = {"Authorization": f"Bearer {admin_token}"}

        # 1. List hazard reports
        res = await client.get("/api/v1/hazards", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] > 0
        first_report = data["items"][0]

        # 2. Get single report by ID
        detail_res = await client.get(f"/api/v1/hazards/{first_report['id']}", headers=headers)
        assert detail_res.status_code == 200
        detail = detail_res.json()
        assert detail["id"] == first_report["id"]
        assert detail["report_number"] == first_report["report_number"]
        assert "audit_trail" in detail
        assert "status" in detail

@pytest.mark.asyncio
async def test_get_hazard_report_not_found():
    """Verify 404 returned for non-existent hazard report ID."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        admin_token = await get_auth_token(client, "admin@constructsafe.com")
        headers = {"Authorization": f"Bearer {admin_token}"}

        fake_id = str(ObjectId())
        res = await client.get(f"/api/v1/hazards/{fake_id}", headers=headers)
        assert res.status_code == 404
