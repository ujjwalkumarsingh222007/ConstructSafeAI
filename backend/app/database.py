import time
import asyncio
import logging
from typing import AsyncGenerator, Dict, Any, Optional
from pymongo import AsyncMongoClient, ASCENDING, DESCENDING
from pymongo.asynchronous.database import AsyncDatabase
from app.core.config import settings

logger = logging.getLogger("constructsafe.database")

class MongoDBManager:
    """Manages asynchronous MongoDB connection lifecycle and collection access."""
    
    def __init__(self) -> None:
        self.client: Optional[AsyncMongoClient] = None
        self.db: Optional[AsyncDatabase] = None

    async def connect(self) -> None:
        """Establish asynchronous connection to MongoDB and ensure indexes."""
        current_loop = asyncio.get_running_loop()
        
        # If client already exists on a different loop (e.g. in pytest runs), reset it
        if self.client is not None:
            if getattr(self.client, "_loop", None) is not None and self.client._loop != current_loop:
                try:
                    await self.client.close()
                except Exception:
                    pass
                self.client = None
                self.db = None
            else:
                return

        logger.info(f"Connecting to MongoDB at {settings.MONGODB_URL}...")
        self.client = AsyncMongoClient(
            settings.MONGODB_URL,
            minPoolSize=settings.MONGODB_MIN_POOL_SIZE,
            maxPoolSize=settings.MONGODB_MAX_POOL_SIZE,
            serverSelectionTimeoutMS=settings.MONGODB_TIMEOUT_MS,
        )
        self.db = self.client[settings.MONGODB_DB_NAME]
        
        # Verify connection immediately
        try:
            await self.db.command("ping")
            logger.info(f"MongoDB connection established to database: {settings.MONGODB_DB_NAME}")
            # Ensure indexes in background
            await self.init_indexes()
        except Exception as e:
            logger.error(f"Failed to ping MongoDB on initial connection: {str(e)}")

    async def close(self) -> None:
        """Close MongoDB connection pool gracefully."""
        if self.client is not None:
            logger.info("Closing MongoDB connection pool...")
            try:
                await self.client.close()
            except Exception:
                pass
            self.client = None
            self.db = None
            logger.info("MongoDB connection pool closed.")

    async def ping(self) -> Dict[str, Any]:
        """Perform ping command to verify database availability and measure latency."""
        start_time = time.time()
        await self.connect()

        if self.db is None:
            return {
                "connected": False,
                "latency_ms": 0.0,
                "engine": "MongoDB Community (PyMongo Async)",
                "database": settings.MONGODB_DB_NAME,
                "message": "MongoDB not initialized"
            }

        try:
            await self.db.command("ping")
            latency_ms = round((time.time() - start_time) * 1000, 2)
            return {
                "connected": True,
                "latency_ms": latency_ms,
                "engine": "MongoDB Community (PyMongo Async)",
                "database": settings.MONGODB_DB_NAME,
                "message": "MongoDB ping successful"
            }
        except Exception as e:
            latency_ms = round((time.time() - start_time) * 1000, 2)
            return {
                "connected": False,
                "latency_ms": latency_ms,
                "engine": "MongoDB Community (PyMongo Async)",
                "database": settings.MONGODB_DB_NAME,
                "message": f"MongoDB ping failed: {str(e)}"
            }

    async def init_indexes(self) -> None:
        """Create foundational indexes across collections for performance and uniqueness."""
        if self.db is None:
            return
        
        try:
            logger.info("Initializing MongoDB collection indexes...")
            # 1. users: unique email
            await self.db.users.create_index([("email", ASCENDING)], unique=True)
            await self.db.users.create_index([("role_id", ASCENDING)])
            
            # 2. roles: unique role name
            await self.db.roles.create_index([("name", ASCENDING)], unique=True)
            
            # 3. permissions: unique permission name, module index
            await self.db.permissions.create_index([("name", ASCENDING)], unique=True)
            await self.db.permissions.create_index([("module", ASCENDING)])
            
            # 4. projects: unique project code, status index
            await self.db.projects.create_index([("code", ASCENDING)], unique=True)
            await self.db.projects.create_index([("status", ASCENDING)])
            await self.db.projects.create_index([("manager_ids", ASCENDING)])
            await self.db.projects.create_index([("inspector_ids", ASCENDING)])
            await self.db.projects.create_index([("deleted_at", ASCENDING)])
            
            # 5. workers: unique employee badge ID
            await self.db.workers.create_index([("employee_id", ASCENDING)], unique=True)
            await self.db.workers.create_index([("current_project_id", ASCENDING)])
            await self.db.workers.create_index([("assigned_project_ids", ASCENDING)])
            await self.db.workers.create_index([("status", ASCENDING)])
            await self.db.workers.create_index([("deleted_at", ASCENDING)])

            # 5b. project_assignments: compound and foreign key indexes
            await self.db.project_assignments.create_index([("project_id", ASCENDING), ("worker_id", ASCENDING)])
            await self.db.project_assignments.create_index([("project_id", ASCENDING), ("user_id", ASCENDING)])
            await self.db.project_assignments.create_index([("worker_id", ASCENDING)])
            await self.db.project_assignments.create_index([("user_id", ASCENDING)])
            
            # 6. cameras: project_id and status
            await self.db.cameras.create_index([("project_id", ASCENDING), ("status", ASCENDING)])
            
            # 7. ppe_detections: camera_id + timestamp, has_violation
            await self.db.ppe_detections.create_index([("camera_id", ASCENDING), ("timestamp", DESCENDING)])
            await self.db.ppe_detections.create_index([("has_violation", ASCENDING)])
            
            # 8. safety_violations: project_id + status, unique violation_code
            await self.db.safety_violations.create_index([("violation_code", ASCENDING)], unique=True)
            await self.db.safety_violations.create_index([("project_id", ASCENDING), ("status", ASCENDING)])
            
            # 9. incidents: unique incident number
            await self.db.incidents.create_index([("incident_number", ASCENDING)], unique=True)
            await self.db.incidents.create_index([("project_id", ASCENDING)])
            await self.db.incidents.create_index([("reported_by", ASCENDING)])
            await self.db.incidents.create_index([("status", ASCENDING)])
            await self.db.incidents.create_index([("severity", ASCENDING)])
            
            # 10. inspections: unique inspection number
            await self.db.inspections.create_index([("inspection_number", ASCENDING)], unique=True)
            await self.db.inspections.create_index([("project_id", ASCENDING)])
            await self.db.inspections.create_index([("inspector_id", ASCENDING)])
            await self.db.inspections.create_index([("status", ASCENDING)])
            
            # 11. corrective_actions: unique action number and unique hazard source linkage
            await self.db.corrective_actions.create_index([("action_number", ASCENDING)], unique=True)
            await self.db.corrective_actions.create_index([("project_id", ASCENDING)])
            await self.db.corrective_actions.create_index([("assigned_to", ASCENDING)])
            await self.db.corrective_actions.create_index([("status", ASCENDING)])
            await self.db.corrective_actions.create_index([("due_date", ASCENDING)])
            await self.db.corrective_actions.create_index(
                [("source_type", ASCENDING), ("source_id", ASCENDING)],
                unique=True,
                partialFilterExpression={"source_type": "hazard", "deleted_at": None}
            )
            
            # 12. notifications: recipient_id + is_read
            await self.db.notifications.create_index([("recipient_id", ASCENDING), ("is_read", ASCENDING)])
            
            # 13. refresh_tokens: TTL index for automatic token expiration and family lookup
            await self.db.refresh_tokens.create_index([("expires_at", ASCENDING)], expireAfterSeconds=0)
            await self.db.refresh_tokens.create_index([("token_hash", ASCENDING)], unique=True)
            await self.db.refresh_tokens.create_index([("user_id", ASCENDING)])
            await self.db.refresh_tokens.create_index([("family_id", ASCENDING)])
            
            # 14. audit_logs: created_at range index
            await self.db.audit_logs.create_index([("created_at", DESCENDING)])

            # 15. hazard_reports: unique report_number, project_id, status, submitted_by, created_at
            await self.db.hazard_reports.create_index([("report_number", ASCENDING)], unique=True)
            await self.db.hazard_reports.create_index([("project_id", ASCENDING)])
            await self.db.hazard_reports.create_index([("submitted_by", ASCENDING)])
            await self.db.hazard_reports.create_index([("status", ASCENDING)])
            await self.db.hazard_reports.create_index([("category", ASCENDING)])
            await self.db.hazard_reports.create_index([("severity", ASCENDING)])
            await self.db.hazard_reports.create_index([("created_at", DESCENDING)])
            await self.db.hazard_reports.create_index([("deleted_at", ASCENDING)])

            # 16. rate_limits: key index and TTL index for automatic expiration
            await self.db.rate_limits.create_index([("key", ASCENDING)], unique=True)
            await self.db.rate_limits.create_index([("expires_at", ASCENDING)], expireAfterSeconds=0)
            
            logger.info("MongoDB indexes verified successfully.")
        except Exception as e:
            logger.warning(f"Non-critical index initialization warning: {str(e)}")

# Global MongoDB manager singleton
mongodb = MongoDBManager()

async def get_db() -> AsyncGenerator[AsyncDatabase, None]:
    """FastAPI dependency for accessing the active MongoDB database."""
    await mongodb.connect()
    if mongodb.db is None:
        raise RuntimeError("MongoDB is not connected")
    yield mongodb.db

async def check_db_connection() -> Dict[str, Any]:
    """Helper for health check endpoint."""
    return await mongodb.ping()
