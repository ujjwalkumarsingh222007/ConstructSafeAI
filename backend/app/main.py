import logging
import sys
from pathlib import Path
from contextlib import asynccontextmanager

# Ensure monorepo root is on python path for ai_engine imports
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.seed import seed_database
from app.database import mongodb
from app.routers import (
    health,
    auth,
    projects,
    workers,
    assignments,
    inspections,
    incidents,
    corrective_actions,
    storage,
    notifications,
    hazards,
    analytics,
    reports,
)

# Setup logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s - [%(levelname)s] - %(name)s - %(message)s"
)
logger = logging.getLogger("constructsafe.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION} [{settings.ENVIRONMENT}]")
    # Connect to MongoDB on application startup
    await mongodb.connect()
    
    # Seed default roles, permissions, and demo users idempotently
    if mongodb.db is not None:
        try:
            await seed_database(mongodb.db)
            logger.info("Database default roles and permissions verified.")
        except Exception as e:
            logger.warning(f"Database seed notice: {str(e)}")

    yield

    # Close MongoDB connection pool on shutdown
    await mongodb.close()
    logger.info(f"Shutting down {settings.PROJECT_NAME}")

def create_app() -> FastAPI:
    app = FastAPI(
        title=f"{settings.PROJECT_NAME} API",
        version=settings.VERSION,
        description="ConstructSafe AI — Enterprise Construction Safety Management Platform API (MongoDB Edition)",
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        docs_url=f"{settings.API_V1_STR}/docs",
        redoc_url=f"{settings.API_V1_STR}/redoc",
        lifespan=lifespan
    )

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register Centralized Exception Handlers
    register_exception_handlers(app)

    # Register API Routers
    app.include_router(health.router, prefix=settings.API_V1_STR)
    app.include_router(auth.router, prefix=settings.API_V1_STR)
    app.include_router(projects.router, prefix=settings.API_V1_STR)
    app.include_router(workers.router, prefix=settings.API_V1_STR)
    app.include_router(assignments.router, prefix=settings.API_V1_STR)
    app.include_router(inspections.router, prefix=settings.API_V1_STR)
    app.include_router(incidents.router, prefix=settings.API_V1_STR)
    app.include_router(corrective_actions.router, prefix=settings.API_V1_STR)
    app.include_router(storage.router, prefix=settings.API_V1_STR)
    app.include_router(notifications.router, prefix=settings.API_V1_STR)
    app.include_router(hazards.router, prefix=settings.API_V1_STR)
    app.include_router(analytics.router, prefix=settings.API_V1_STR)
    app.include_router(reports.router, prefix=settings.API_V1_STR)

    @app.get("/", tags=["Root"])
    async def root():
        return {
            "name": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "status": "operational",
            "database": "MongoDB Community (PyMongo Async)",
            "auth": "JWT + Argon2 + RBAC (5 Roles)",
            "docs": f"{settings.API_V1_STR}/docs",
            "api": settings.API_V1_STR
        }

    return app

app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
