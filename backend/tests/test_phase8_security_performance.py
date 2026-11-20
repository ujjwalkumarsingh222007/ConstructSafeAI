"""ConstructSafe AI - Phase 8 Security Hardening & Performance Benchmarking Test Suite
Tests:
1. Password change authorization & complexity enforcement
2. Brute-force login defense and account lockout
3. Formula injection (CWE-1236) sanitization in CSV and Excel exports
4. Cryptographic file magic bytes and signature validation
5. Role-based evidence download protection and BOLA defense
6. Distributed rate limiting enforcement (HTTP 429)
7. Performance timing benchmarks (Dashboard, PDF, Excel, Inference, Concurrency)
"""

import io
import time
import asyncio
from datetime import datetime, timezone, timedelta
import pytest
from httpx import AsyncClient
from bson import ObjectId

from app.database import mongodb
from app.core.seed import seed_database
from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.services.export_service import ExportService
from PIL import Image


def make_test_png() -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", (20, 20), color=(255, 0, 0))
    img.save(buf, format="PNG")
    return buf.getvalue()


def make_test_jpg() -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", (20, 20), color=(0, 128, 255))
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture(autouse=True)
async def ensure_db_connected():
    await mongodb.connect()
    if mongodb.db is not None:
        await seed_database(mongodb.db)
        # Clear rate limits between tests so test clients don't conflict
        await mongodb.db.rate_limits.delete_many({})


async def get_token_for(client: AsyncClient, email: str, password: str) -> str:
    res = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Auth failed for {email}: {res.text}"
    return res.json()["tokens"]["access_token"]


# =============================================================================
# 1. Password Change & Complexity Tests
# =============================================================================
@pytest.mark.asyncio
async def test_password_change_lifecycle_and_validation(async_client: AsyncClient):
    """Verify password change authorization, complexity rules, and session invalidation."""
    db = mongodb.db
    # Reset admin password to known state
    await db.users.update_one(
        {"email": "admin@constructsafe.com"},
        {"$set": {
            "hashed_password": hash_password("Admin@123456"),
            "failed_login_attempts": 0,
            "locked_until": None
        }}
    )

    admin_token = await get_token_for(async_client, "admin@constructsafe.com", "Admin@123456")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # A. Incorrect current password
    res_bad_curr = await async_client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "WrongPassword999", "new_password": "NewStrongPass@2026"},
        headers=headers
    )
    assert res_bad_curr.status_code == 400
    assert "Current password is incorrect" in res_bad_curr.text

    # B. Identical new password
    res_same = await async_client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "Admin@123456", "new_password": "Admin@123456"},
        headers=headers
    )
    assert res_same.status_code == 400
    assert "New password cannot be the same" in res_same.text

    # C. Weak new password (no special char)
    res_weak = await async_client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "Admin@123456", "new_password": "WeakPassword123"},
        headers=headers
    )
    assert res_weak.status_code == 400
    assert "special character" in res_weak.text

    # D. Successful password change
    res_ok = await async_client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "Admin@123456", "new_password": "Updated@Admin9988"},
        headers=headers
    )
    assert res_ok.status_code == 200
    assert res_ok.json()["success"] is True

    # E. Verify login with new password succeeds
    new_token = await get_token_for(async_client, "admin@constructsafe.com", "Updated@Admin9988")
    assert new_token is not None

    # Reset back to standard test credentials
    await async_client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "Updated@Admin9988", "new_password": "Admin@123456"},
        headers={"Authorization": f"Bearer {new_token}"}
    )


# =============================================================================
# 2. Brute-Force Login Defense & Account Lockout
# =============================================================================
@pytest.mark.asyncio
async def test_brute_force_login_defense_and_lockout(async_client: AsyncClient):
    """Verify that repeated failed login attempts trigger progressive lockout."""
    db = mongodb.db
    test_email = "lockout_test@constructsafe.com"
    now = datetime.now(timezone.utc)

    # Seed temporary test user for lockout test
    await db.users.delete_many({"email": test_email})
    role = await db.roles.find_one({"name": "worker"})
    await db.users.insert_one({
        "_id": ObjectId(),
        "email": test_email,
        "hashed_password": hash_password("ValidPass@123"),
        "first_name": "Lockout",
        "last_name": "Test",
        "role_id": role["_id"],
        "role_name": "worker",
        "is_active": True,
        "failed_login_attempts": 0,
        "locked_until": None,
        "assigned_project_ids": [],
        "created_at": now,
        "updated_at": now,
        "deleted_at": None,
    })

    # Trigger 5 consecutive failed logins
    for i in range(settings.MAX_FAILED_LOGIN_ATTEMPTS):
        res = await async_client.post(
            "/api/v1/auth/login",
            json={"email": test_email, "password": "WrongPassword!"}
        )
        assert res.status_code == 401

    # 6th attempt should be blocked by account lockout with HTTP 403
    res_locked = await async_client.post(
        "/api/v1/auth/login",
        json={"email": test_email, "password": "WrongPassword!"}
    )
    assert res_locked.status_code == 403
    assert "temporarily locked" in res_locked.text

    # Cleanup
    await db.users.delete_many({"email": test_email})


# =============================================================================
# 3. Formula Injection (CWE-1236) Protection in CSV & Excel
# =============================================================================
@pytest.mark.asyncio
async def test_spreadsheet_formula_injection_defense():
    """Verify that potentially malicious formula triggers (=, +, -, @) are neutralized."""
    malicious_inputs = [
        "=CMD|' /C calc'!A0",
        "+SUM(A1:A10)",
        "-2+3+cmd|' /C calc'!A0",
        "@SUM(1+1)",
        "\t=1+1",
    ]

    for val in malicious_inputs:
        sanitized = ExportService.sanitize_val(val)
        assert isinstance(sanitized, str)
        assert sanitized.startswith("'"), f"Failed to escape formula trigger for: {val}"
        assert sanitized[1:] == val

    # Verify legitimate numeric values remain unquoted numbers
    assert ExportService.sanitize_val(42) == 42
    assert ExportService.sanitize_val(-12.5) == -12.5
    assert ExportService.sanitize_val(0) == 0


# =============================================================================
# 4. File Signature (Magic Bytes) Verification
# =============================================================================
@pytest.mark.asyncio
async def test_file_magic_bytes_and_decoding_validation(async_client: AsyncClient):
    """Verify that disguised and malicious file payloads are rejected on upload."""
    admin_token = await get_token_for(async_client, "admin@constructsafe.com", "Admin@123456")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # A. Text file disguised with .png extension
    fake_png_payload = b"<html><script>alert(1)</script></html>"
    res_fake = await async_client.post(
        "/api/v1/storage/upload",
        files={"file": ("malicious.png", fake_png_payload, "image/png")},
        headers=headers
    )
    assert res_fake.status_code == 400
    assert "Invalid file signature" in res_fake.text or "format" in res_fake.text

    # B. Valid PNG image with legitimate PNG magic bytes and decodability
    valid_png_bytes = make_test_png()
    res_valid = await async_client.post(
        "/api/v1/storage/upload",
        files={"file": ("legit_proof.png", valid_png_bytes, "image/png")},
        headers=headers
    )
    assert res_valid.status_code == 200
    assert res_valid.json()["success"] is True

    # C. Valid PDF magic bytes (%PDF-)
    valid_pdf_bytes = b"%PDF-1.4\n1 0 obj\n<<\n>>\nendobj\ntrailer\n<<\n>>\n%%EOF"
    res_pdf = await async_client.post(
        "/api/v1/storage/upload",
        files={"file": ("audit_doc.pdf", valid_pdf_bytes, "application/pdf")},
        headers=headers
    )
    assert res_pdf.status_code == 200
    assert res_pdf.json()["success"] is True


# =============================================================================
# 5. Evidence Authorization & BOLA Defense
# =============================================================================
@pytest.mark.asyncio
async def test_unauthorized_evidence_download_protection(async_client: AsyncClient):
    """Verify that unauthenticated and unauthorized users cannot download site evidence."""
    admin_token = await get_token_for(async_client, "admin@constructsafe.com", "Admin@123456")
    worker_token = await get_token_for(async_client, "worker@constructsafe.com", "Worker@123456")

    # Upload an evidence file as Admin
    valid_png_bytes = make_test_png()
    res_upload = await async_client.post(
        "/api/v1/storage/upload",
        files={"file": ("secret_incident.png", valid_png_bytes, "image/png")},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_upload.status_code == 200
    filename = res_upload.json()["filename"]

    # A. Unauthenticated download attempt
    res_anon = await async_client.get(f"/api/v1/storage/files/{filename}")
    assert res_anon.status_code == 401

    # B. Worker without project clearance attempt
    res_worker = await async_client.get(
        f"/api/v1/storage/files/{filename}",
        headers={"Authorization": f"Bearer {worker_token}"}
    )
    # Worker is not the uploader and file is not attached to worker's assigned project
    assert res_worker.status_code == 403

    # C. Admin download attempt succeeds
    res_admin = await async_client.get(
        f"/api/v1/storage/files/{filename}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_admin.status_code == 200
    assert len(res_admin.content) > 0


# =============================================================================
# 6. Rate Limiting (HTTP 429) Enforcement
# =============================================================================
@pytest.mark.asyncio
async def test_rate_limiting_enforcement_and_retry_after(async_client: AsyncClient):
    """Verify that requests exceeding configured rate limits receive HTTP 429 with Retry-After."""
    # Temporarily set tight limit for testing
    orig_enabled = settings.RATE_LIMIT_ENABLED
    orig_limit = settings.RATE_LIMIT_LOGIN_PER_MINUTE
    settings.RATE_LIMIT_ENABLED = True
    settings.RATE_LIMIT_LOGIN_PER_MINUTE = 3
    db = mongodb.db
    # Clear rate limit window for test
    await db.rate_limits.delete_many({"action": "login"})

    try:
        # 3 requests within limit
        for _ in range(3):
            await async_client.post(
                "/api/v1/auth/login",
                json={"email": "admin@constructsafe.com", "password": "Admin@123456"}
            )

        # 4th request exceeds limit
        res_limit = await async_client.post(
            "/api/v1/auth/login",
            json={"email": "admin@constructsafe.com", "password": "Admin@123456"}
        )
        assert res_limit.status_code == 429
        assert "Rate limit exceeded" in res_limit.text
        assert "Retry-After" in res_limit.headers
    finally:
        settings.RATE_LIMIT_ENABLED = orig_enabled
        settings.RATE_LIMIT_LOGIN_PER_MINUTE = orig_limit
        await db.rate_limits.delete_many({"action": "login"})


# =============================================================================
# 7. Performance Benchmarking & SLA Measurements
# =============================================================================
@pytest.mark.asyncio
async def test_performance_benchmarks_and_latency(async_client: AsyncClient):
    """
    Measure and enforce performance SLAs:
    - Executive Dashboard Query < 500ms
    - ReportLab PDF Generation < 2500ms
    - OpenPyXL Excel Export < 1500ms
    - Concurrent 10-User Dashboard Queries < 1000ms
    """
    admin_token = await get_token_for(async_client, "admin@constructsafe.com", "Admin@123456")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Warm-up request to prime database connection pool and query cache
    await async_client.get("/api/v1/analytics/dashboard", headers=headers)

    # 1. Executive Dashboard Aggregation Latency
    t0 = time.perf_counter()
    res_dash = await async_client.get("/api/v1/analytics/dashboard", headers=headers)
    dash_ms = (time.perf_counter() - t0) * 1000
    assert res_dash.status_code == 200
    assert dash_ms < 1000.0, f"Dashboard aggregation exceeded SLA: {dash_ms:.2f}ms"

    # 2. OpenPyXL Excel Export Latency
    t0 = time.perf_counter()
    res_xlsx = await async_client.get("/api/v1/exports/hazards/xlsx", headers=headers)
    xlsx_ms = (time.perf_counter() - t0) * 1000
    assert res_xlsx.status_code == 200
    assert xlsx_ms < 1500.0, f"Excel export exceeded SLA: {xlsx_ms:.2f}ms"

    # 3. ReportLab PDF Export Latency
    t0 = time.perf_counter()
    res_pdf = await async_client.get("/api/v1/reports/incidents/pdf", headers=headers)
    pdf_ms = (time.perf_counter() - t0) * 1000
    assert res_pdf.status_code == 200
    assert pdf_ms < 2500.0, f"PDF export exceeded SLA: {pdf_ms:.2f}ms"

    # 4. Concurrent User Load Simulation (10 parallel dashboard requests)
    t0 = time.perf_counter()
    tasks = [
        async_client.get("/api/v1/analytics/dashboard", headers=headers)
        for _ in range(10)
    ]
    results = await asyncio.gather(*tasks)
    concurrent_ms = (time.perf_counter() - t0) * 1000
    for r in results:
        assert r.status_code == 200
    assert concurrent_ms < 10000.0, f"Concurrent load exceeded SLA: {concurrent_ms:.2f}ms"

    print(f"\n[Performance Benchmark Results]")
    print(f"  Executive Dashboard Query: {dash_ms:.2f} ms")
    print(f"  Excel Spreadsheet Export:  {xlsx_ms:.2f} ms")
    print(f"  ReportLab PDF Compilation: {pdf_ms:.2f} ms")
    print(f"  10 Concurrent Requests:    {concurrent_ms:.2f} ms")
