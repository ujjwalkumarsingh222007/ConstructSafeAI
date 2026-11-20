from datetime import datetime, timezone
from pydantic import BaseModel, Field

class BaseResponse(BaseModel):
    success: bool = True
    message: str = "Operation completed successfully"

class HealthResponse(BaseModel):
    success: bool = True
    status: str = Field(default="healthy", description="Application service status")
    project: str = Field(default="ConstructSafe AI")
    version: str = Field(default="1.0.0")
    environment: str = Field(default="development")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DatabaseHealthResponse(BaseModel):
    success: bool = True
    status: str = Field(description="Database connectivity status: healthy or degraded")
    connected: bool = Field(description="True if ping command succeeded")
    latency_ms: float = Field(description="Ping latency in milliseconds")
    engine: str = Field(default="MongoDB Community (PyMongo Async)")
    database: str = Field(description="Target database name")
    message: str = Field(description="Status description or error message")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
