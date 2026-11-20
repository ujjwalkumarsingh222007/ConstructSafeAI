"""ConstructSafe AI - Distributed Rate Limiter
Implements high-performance, multi-instance rate limiting backed by MongoDB.
Uses atomic operations with sliding fixed-window counters and automatic TTL cleanup.
"""

import time
from datetime import datetime, timezone, timedelta
from typing import Optional, Callable
from fastapi import Request, HTTPException, status, Depends
from pymongo import ReturnDocument
from pymongo.asynchronous.database import AsyncDatabase

from app.core.config import settings
from app.database import get_db


def get_client_ip(request: Request) -> str:
    """Extract real client IP considering forwarded proxies."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


class RateLimiter:
    """Multi-instance distributed rate limiter utilizing MongoDB atomic counter documents."""

    def __init__(
        self,
        action: str,
        limit_or_getter: int | Callable[[], int],
        window_seconds: int = 60
    ):
        self.action = action
        self.limit_or_getter = limit_or_getter
        self.window_seconds = window_seconds

    def get_limit(self) -> int:
        if callable(self.limit_or_getter):
            return self.limit_or_getter()
        return self.limit_or_getter

    async def __call__(
        self,
        request: Request,
        db: AsyncDatabase = Depends(get_db)
    ) -> None:
        if not settings.RATE_LIMIT_ENABLED:
            return

        limit = self.get_limit()
        if limit <= 0:
            return

        ip = get_client_ip(request)
        now_ts = int(time.time())
        window_bucket = now_ts // self.window_seconds
        rate_key = f"{self.action}:{ip}:{window_bucket}"

        # Current timestamp and expiration
        now_dt = datetime.now(timezone.utc)
        expires_at = now_dt + timedelta(seconds=self.window_seconds * 2)

        try:
            doc = await db.rate_limits.find_one_and_update(
                {"key": rate_key},
                {
                    "$inc": {"count": 1},
                    "$setOnInsert": {
                        "action": self.action,
                        "ip": ip,
                        "window": window_bucket,
                        "created_at": now_dt,
                        "expires_at": expires_at,
                    }
                },
                upsert=True,
                return_document=ReturnDocument.AFTER
            )
            count = doc.get("count", 1) if doc else 1
        except Exception:
            # If database error during rate limiting check, fail open to prevent blocking service
            return

        if count > limit:
            remaining_seconds = self.window_seconds - (now_ts % self.window_seconds)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded for {self.action}. Please try again in {remaining_seconds} seconds.",
                headers={
                    "Retry-After": str(remaining_seconds),
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(remaining_seconds),
                }
            )


# Preconfigured Rate Limiter Dependencies
rate_limit_login = RateLimiter("login", lambda: settings.RATE_LIMIT_LOGIN_PER_MINUTE)
rate_limit_refresh = RateLimiter("refresh", lambda: settings.RATE_LIMIT_REFRESH_PER_MINUTE)
rate_limit_password_change = RateLimiter("password_change", lambda: settings.RATE_LIMIT_PASSWORD_CHANGE_PER_MINUTE)
rate_limit_ai_analysis = RateLimiter("ai_analysis", lambda: settings.RATE_LIMIT_AI_ANALYSIS_PER_MINUTE)
rate_limit_upload = RateLimiter("upload", lambda: settings.RATE_LIMIT_UPLOAD_PER_MINUTE)
rate_limit_exports = RateLimiter("exports", lambda: settings.RATE_LIMIT_EXPORTS_PER_MINUTE)
rate_limit_general = RateLimiter("general", lambda: settings.RATE_LIMIT_DEFAULT_PER_MINUTE)
