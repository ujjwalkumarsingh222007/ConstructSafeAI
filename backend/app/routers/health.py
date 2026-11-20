from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.schemas.health import HealthResponse, DatabaseHealthResponse
from app.database import check_db_connection

router = APIRouter(prefix="/health", tags=["Health & Status"])

@router.get(
    "",
    response_model=HealthResponse,
    summary="Application Health Check",
    description="Returns current service availability status, version, and environment."
)
async def get_health():
    return HealthResponse(
        status="healthy",
        project=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT
    )

@router.get(
    "/database",
    response_model=DatabaseHealthResponse,
    summary="Database Connectivity Check",
    description="Tests actual database connectivity via async query ping and measures roundtrip latency."
)
async def get_database_health():
    db_status = await check_db_connection()
    is_connected = db_status["connected"]
    
    response = DatabaseHealthResponse(
        success=is_connected,
        status="healthy" if is_connected else "degraded",
        connected=is_connected,
        latency_ms=db_status["latency_ms"],
        engine=db_status["engine"],
        database=db_status["database"],
        message=db_status["message"]
    )
    
    status_code = status.HTTP_200_OK if is_connected else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(status_code=status_code, content=response.model_dump(mode="json"))
