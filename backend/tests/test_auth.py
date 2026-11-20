import pytest
from httpx import AsyncClient
from app.database import mongodb
from app.core.seed import seed_database

@pytest.fixture(autouse=True)
async def ensure_db_seeded():
    await mongodb.connect()
    if mongodb.db is not None:
        await seed_database(mongodb.db)

@pytest.mark.asyncio
async def test_login_success_all_five_roles(async_client: AsyncClient):
    """Verify that all five roles can authenticate with their Argon2 passwords."""
    credentials = [
        ("admin@constructsafe.com", "Admin@123456", "admin"),
        ("pm@constructsafe.com", "Manager@123456", "project_manager"),
        ("inspector@constructsafe.com", "Inspector@123456", "safety_inspector"),
        ("worker@constructsafe.com", "Worker@123456", "worker"),
        ("client@constructsafe.com", "Client@123456", "client"),
    ]

    for email, password, expected_role in credentials:
        response = await async_client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password}
        )
        assert response.status_code == 200, f"Login failed for {email}: {response.text}"
        data = response.json()
        assert data["success"] is True
        assert data["user"]["email"] == email
        assert data["user"]["role_name"] == expected_role
        assert "access_token" in data["tokens"]
        assert "refresh_token" in data["tokens"]
        assert data["tokens"]["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login_invalid_password(async_client: AsyncClient):
    response = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "admin@constructsafe.com", "password": "WrongPassword999"}
    )
    assert response.status_code == 401
    data = response.json()
    assert "Invalid email or password" in data["error"]["message"]

@pytest.mark.asyncio
async def test_login_nonexistent_user(async_client: AsyncClient):
    response = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent@constructsafe.com", "password": "Password123"}
    )
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_get_current_user_me(async_client: AsyncClient):
    # 1. Login as Inspector
    login_res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "inspector@constructsafe.com", "password": "Inspector@123456"}
    )
    token = login_res.json()["tokens"]["access_token"]

    # 2. Query /me endpoint
    me_res = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_res.status_code == 200
    user_info = me_res.json()
    assert user_info["email"] == "inspector@constructsafe.com"
    assert user_info["role_name"] == "safety_inspector"
    assert "detections:verify" in user_info["permissions"]

@pytest.mark.asyncio
async def test_refresh_token_rotation(async_client: AsyncClient):
    """Verify refresh-token rotation issues new access and refresh tokens."""
    # 1. Login
    login_res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "pm@constructsafe.com", "password": "Manager@123456"}
    )
    tokens = login_res.json()["tokens"]
    old_refresh_token = tokens["refresh_token"]

    # 2. Refresh token
    refresh_res = await async_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": old_refresh_token}
    )
    assert refresh_res.status_code == 200
    new_tokens = refresh_res.json()
    assert "access_token" in new_tokens
    assert "refresh_token" in new_tokens
    assert new_tokens["refresh_token"] != old_refresh_token

@pytest.mark.asyncio
async def test_token_reuse_detection(async_client: AsyncClient):
    """Verify that reusing an already-rotated refresh token triggers a security breach alert."""
    # 1. Login
    login_res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "admin@constructsafe.com", "password": "Admin@123456"}
    )
    old_refresh_token = login_res.json()["tokens"]["refresh_token"]

    # 2. First refresh (legitimate rotation)
    first_refresh = await async_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": old_refresh_token}
    )
    assert first_refresh.status_code == 200

    # 3. Second refresh using the SAME old token (Replay attack attempt)
    reuse_attempt = await async_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": old_refresh_token}
    )
    # Must reject with 401 Unauthorized
    assert reuse_attempt.status_code == 401
    err = reuse_attempt.json()
    assert "breach" in err["error"]["message"].lower() or "reuse" in err["error"]["message"].lower()

@pytest.mark.asyncio
async def test_logout_invalidation(async_client: AsyncClient):
    # 1. Login
    login_res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "worker@constructsafe.com", "password": "Worker@123456"}
    )
    refresh_token = login_res.json()["tokens"]["refresh_token"]

    # 2. Logout
    logout_res = await async_client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": refresh_token}
    )
    assert logout_res.status_code == 200
    assert logout_res.json()["success"] is True

    # 3. Attempting to use logged-out token must fail
    refresh_after_logout = await async_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token}
    )
    assert refresh_after_logout.status_code == 401

@pytest.mark.asyncio
async def test_rbac_cross_role_access_restrictions(async_client: AsyncClient):
    """Test RBAC across all 5 roles verifying authorization and restrictions."""
    # Helper to get access token for a user
    async def get_token_for(email: str, password: str) -> str:
        res = await async_client.post("/api/v1/auth/login", json={"email": email, "password": password})
        return res.json()["tokens"]["access_token"]

    admin_token = await get_token_for("admin@constructsafe.com", "Admin@123456")
    pm_token = await get_token_for("pm@constructsafe.com", "Manager@123456")
    inspector_token = await get_token_for("inspector@constructsafe.com", "Inspector@123456")
    worker_token = await get_token_for("worker@constructsafe.com", "Worker@123456")
    client_token = await get_token_for("client@constructsafe.com", "Client@123456")

    # 1. /admin-only: Only admin allowed
    assert (await async_client.get("/api/v1/auth/admin-only", headers={"Authorization": f"Bearer {admin_token}"})).status_code == 200
    assert (await async_client.get("/api/v1/auth/admin-only", headers={"Authorization": f"Bearer {pm_token}"})).status_code == 403
    assert (await async_client.get("/api/v1/auth/admin-only", headers={"Authorization": f"Bearer {inspector_token}"})).status_code == 403
    assert (await async_client.get("/api/v1/auth/admin-only", headers={"Authorization": f"Bearer {worker_token}"})).status_code == 403
    assert (await async_client.get("/api/v1/auth/admin-only", headers={"Authorization": f"Bearer {client_token}"})).status_code == 403

    # 2. /pm-only: PM and Admin allowed
    assert (await async_client.get("/api/v1/auth/pm-only", headers={"Authorization": f"Bearer {pm_token}"})).status_code == 200
    assert (await async_client.get("/api/v1/auth/pm-only", headers={"Authorization": f"Bearer {admin_token}"})).status_code == 200
    assert (await async_client.get("/api/v1/auth/pm-only", headers={"Authorization": f"Bearer {worker_token}"})).status_code == 403
    assert (await async_client.get("/api/v1/auth/pm-only", headers={"Authorization": f"Bearer {client_token}"})).status_code == 403

    # 3. /inspector-only: Inspector and Admin allowed
    assert (await async_client.get("/api/v1/auth/inspector-only", headers={"Authorization": f"Bearer {inspector_token}"})).status_code == 200
    assert (await async_client.get("/api/v1/auth/inspector-only", headers={"Authorization": f"Bearer {admin_token}"})).status_code == 200
    assert (await async_client.get("/api/v1/auth/inspector-only", headers={"Authorization": f"Bearer {pm_token}"})).status_code == 403
    assert (await async_client.get("/api/v1/auth/inspector-only", headers={"Authorization": f"Bearer {worker_token}"})).status_code == 403

    # 4. /worker-profile: Worker and Admin allowed
    assert (await async_client.get("/api/v1/auth/worker-profile", headers={"Authorization": f"Bearer {worker_token}"})).status_code == 200
    assert (await async_client.get("/api/v1/auth/worker-profile", headers={"Authorization": f"Bearer {admin_token}"})).status_code == 200

    # 5. /client-overview: Client and Admin allowed
    assert (await async_client.get("/api/v1/auth/client-overview", headers={"Authorization": f"Bearer {client_token}"})).status_code == 200
    assert (await async_client.get("/api/v1/auth/client-overview", headers={"Authorization": f"Bearer {admin_token}"})).status_code == 200
    assert (await async_client.get("/api/v1/auth/client-overview", headers={"Authorization": f"Bearer {inspector_token}"})).status_code == 403

    # 6. Unauthenticated requests must be rejected with 401
    assert (await async_client.get("/api/v1/auth/admin-only")).status_code == 401
    assert (await async_client.get("/api/v1/auth/inspector-only")).status_code == 401
