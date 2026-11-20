import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_root_endpoint(async_client: AsyncClient):
    response = await async_client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "ConstructSafe AI"
    assert data["status"] == "operational"
    assert data["api"] == "/api/v1"
    assert "MongoDB" in data["database"]

@pytest.mark.asyncio
async def test_api_health_endpoint(async_client: AsyncClient):
    response = await async_client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["status"] == "healthy"
    assert data["project"] == "ConstructSafe AI"
    assert data["version"] == "1.0.0"
    assert "timestamp" in data

@pytest.mark.asyncio
async def test_database_health_endpoint(async_client: AsyncClient):
    response = await async_client.get("/api/v1/health/database")
    # Response code will be 200 since MongoDB is running and pingable
    assert response.status_code in [200, 503]
    data = response.json()
    assert "connected" in data
    assert "latency_ms" in data
    assert "engine" in data
    assert "database" in data
    assert "status" in data
    if response.status_code == 200:
        assert data["connected"] is True
        assert data["status"] == "healthy"
        assert "MongoDB" in data["engine"]

@pytest.mark.asyncio
async def test_not_found_exception_envelope(async_client: AsyncClient):
    response = await async_client.get("/api/v1/non_existent_route")
    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "NOT_FOUND"
    assert "message" in data["error"]
