import hashlib
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError
from app.core.config import settings

# Initialize Argon2 Password Hasher with RFC-recommended parameters
hasher = PasswordHasher(
    time_cost=2,
    memory_cost=65536,
    parallelism=1,
    hash_len=32
)

def hash_password(password: str) -> str:
    """Hash plaintext password using Argon2id."""
    return hasher.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plaintext password against an Argon2id hash."""
    try:
        return hasher.verify(hashed_password, plain_password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False

def validate_password_strength(password: str) -> tuple[bool, Optional[str]]:
    """Validate password meets enterprise complexity requirements."""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter."
    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter."
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one digit."
    special_chars = set("!@#$%^&*()-_=+[]{}|;:,.<>?/")
    if not any(c in special_chars for c in password):
        return False, "Password must contain at least one special character."
    return True, None

def hash_token(token: str) -> str:
    """Compute SHA-256 hex digest of a token for safe database storage and index lookup."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

def create_access_token(
    user_id: str,
    email: str,
    role_name: str,
    permissions: List[str],
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create signed JWT access token with user claims."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "sub": user_id,
        "email": email,
        "role": role_name,
        "permissions": permissions,
        "type": "access",
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": expire,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def create_refresh_token(
    user_id: str,
    family_id: Optional[str] = None,
    expires_delta: Optional[timedelta] = None
) -> tuple[str, str, datetime]:
    """Create signed JWT refresh token and returns (token_string, family_id, expires_at)."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    token_family = family_id or str(uuid.uuid4())
    jti = str(uuid.uuid4())

    payload = {
        "sub": user_id,
        "family_id": token_family,
        "type": "refresh",
        "jti": jti,
        "iat": now,
        "exp": expire,
    }
    token_str = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return token_str, token_family, expire

def decode_token(token: str) -> Dict[str, Any]:
    """Decode and validate signature and expiry of a JWT token."""
    return jwt.decode(
        token,
        settings.JWT_SECRET,
        algorithms=[settings.JWT_ALGORITHM],
        options={"require": ["exp", "sub", "type"]}
    )
