# Security Plan — ConstructSafe AI

**Document Version:** 2.0 (Updated: Phase 2 Authentication & RBAC Implementation Verified)  
**Date:** 2026-11-17  
**Author:** Security Architecture Team  
**Classification:** Internal — Confidential  
**Status:** Phase 2 Core Implemented & Live Verified

> [!NOTE]
> **Phase 2 Implementation Verified:**
> - **Password Hashing:** Argon2id (`argon2-cffi`, memory cost 64MB, 2 passes) replacing legacy algorithms.
> - **JWT Tokens:** HS256 access tokens (15-min TTL) and refresh tokens (7-day TTL).
> - **Refresh Token Rotation & Reuse Detection:** Built with `family_id` tracking in MongoDB. If an already-rotated token is reused, all tokens in the family are revoked automatically.
> - **Backend RBAC:** Role and permission validation dependencies enforced on all endpoints across all 5 roles (`admin`, `project_manager`, `safety_inspector`, `worker`, `client`).
> - **Database Layer:** PyMongo AsyncMongoClient on MongoDB Community Edition with TTL indexes.

---

## Table of Contents

1. [Security Architecture Overview](#1-security-architecture-overview)
2. [Authentication Security](#2-authentication-security)
3. [Authorization: RBAC Matrix](#3-authorization-rbac-matrix)
4. [Password Security](#4-password-security)
5. [API Security](#5-api-security)
6. [File Upload Security](#6-file-upload-security)
7. [Camera / RTSP Security](#7-camera--rtsp-security)
8. [Database Security](#8-database-security)
9. [WebSocket Security](#9-websocket-security)
10. [Infrastructure Security](#10-infrastructure-security)
11. [Logging and Audit Trail](#11-logging-and-audit-trail)
12. [Data Privacy](#12-data-privacy)
13. [Vulnerability Management](#13-vulnerability-management)
14. [Authentication & Authorization Flow Diagram](#14-authentication--authorization-flow-diagram)
15. [Security Layer Stack Diagram](#15-security-layer-stack-diagram)
16. [Incident Response Plan](#16-incident-response-plan)
17. [Security Testing Checklist](#17-security-testing-checklist)

---

## 1. Security Architecture Overview

ConstructSafe AI handles sensitive construction-site video surveillance, worker safety data, and organizational operational data. A defense-in-depth approach is applied across all layers.

### Security Principles

| Principle | Implementation |
|-----------|---------------|
| **Least Privilege** | RBAC with minimal permissions per role; DB user has no DDL rights in production |
| **Defense in Depth** | Security controls at network, application, database, and storage layers |
| **Zero Trust** | Every request authenticated and authorized; no implicit trust between services |
| **Secure by Default** | All sensitive features off by default; must be explicitly enabled |
| **Fail Secure** | On authentication errors, deny access; never grant by default |
| **Auditability** | All security-relevant events logged with tamper-resistant audit trail |
| **Data Minimization** | Collect and retain only what is necessary; purge on schedule |

### Threat Model Summary

| Threat Category | Risk Level | Primary Mitigations |
|----------------|------------|-------------------|
| Unauthorized access to live camera feeds | CRITICAL | JWT auth, RBAC, RTSP credential isolation |
| Stolen JWT tokens | HIGH | Short expiry (15 min), httpOnly cookies, rotation |
| SQL injection | HIGH | SQLAlchemy ORM, Pydantic validation |
| Account takeover (brute force) | HIGH | Rate limiting, account lockout |
| Malicious file uploads | MEDIUM | MIME validation, size limits, isolated storage |
| Insider threat (privileged user) | MEDIUM | Audit logging, role separation |
| Cross-site scripting (XSS) | MEDIUM | CSP headers, output encoding |
| Data exfiltration | MEDIUM | Egress monitoring, access logging |
| Dependency vulnerabilities | MEDIUM | Automated scanning, pinned versions |

---

## 2. Authentication Security

### 2.1 JWT Implementation Details

ConstructSafe AI uses a **dual-token JWT strategy** with short-lived access tokens and longer-lived refresh tokens.

#### Token Configuration

| Token Type | Algorithm | Expiry | Storage | Payload |
|-----------|-----------|--------|---------|---------|
| **Access Token** | RS256 (RSA-256) | 15 minutes | Memory (JS) | user_id, role, project_ids, jti |
| **Refresh Token** | RS256 (RSA-256) | 7 days | httpOnly cookie | user_id, jti, token_family |

> [!IMPORTANT]
> **Use RS256 (asymmetric), not HS256 (symmetric).** RS256 allows the AI engine and other microservices to verify tokens using the public key without needing access to the signing secret. This is critical for a multi-service architecture.

#### Key Management

```python
# Generate RSA key pair (2048-bit minimum; 4096-bit recommended)
# Run once during initial setup; store securely

from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

private_key = rsa.generate_private_key(public_exponent=65537, key_size=4096)

# Save private key (backend only — never expose)
with open("secrets/jwt_private_key.pem", "wb") as f:
    f.write(private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.TraditionalOpenSSL,
        encryption_algorithm=serialization.BestAvailableEncryption(b"passphrase_from_env")
    ))

# Save public key (can be shared with internal services)
with open("secrets/jwt_public_key.pem", "wb") as f:
    f.write(private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ))
```

#### Access Token Payload

```json
{
  "sub": "user_uuid_here",
  "role": "safety_inspector",
  "project_ids": ["proj_uuid_1", "proj_uuid_2"],
  "iat": 1700000000,
  "exp": 1700000900,
  "jti": "unique_token_id_uuid"
}
```

#### Token Generation (FastAPI)

```python
import jwt
from datetime import datetime, timedelta, timezone
from uuid import uuid4

def create_access_token(user_id: str, role: str, project_ids: list) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "project_ids": project_ids,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
        "jti": str(uuid4()),
    }
    return jwt.encode(payload, PRIVATE_KEY, algorithm="RS256")

def create_refresh_token(user_id: str, token_family: str) -> str:
    payload = {
        "sub": user_id,
        "token_family": token_family,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "jti": str(uuid4()),
    }
    return jwt.encode(payload, PRIVATE_KEY, algorithm="RS256")
```

### 2.2 Secure Storage

| Token | Client Storage | Rationale |
|-------|---------------|-----------|
| Access Token | JavaScript memory (not localStorage) | Cannot be read by other scripts; cleared on tab close |
| Refresh Token | `httpOnly`, `Secure`, `SameSite=Strict` cookie | Not accessible to JavaScript; prevents XSS theft |

```python
# Set refresh token as httpOnly cookie in FastAPI response
from fastapi import Response

def set_refresh_cookie(response: Response, token: str):
    response.set_cookie(
        key="refresh_token",
        value=token,
        httponly=True,          # Not accessible via document.cookie
        secure=True,            # HTTPS only
        samesite="strict",      # CSRF protection
        max_age=7 * 24 * 3600,  # 7 days in seconds
        path="/api/v1/auth/",   # Restrict cookie scope to auth endpoints
    )
```

### 2.3 Token Rotation (Refresh Token Rotation)

Refresh tokens are **rotated on every use**. This prevents token replay attacks:

1. Client sends refresh token → server validates
2. Server **invalidates** old refresh token (marks JTI as used in Redis)
3. Server issues **new** access token + **new** refresh token
4. If a used refresh token is detected → entire token family is revoked (session theft detection)

```python
async def rotate_refresh_token(old_jti: str, token_family: str, user_id: str):
    # Check if JTI already used (replay attack detection)
    if await redis.exists(f"used_refresh:{old_jti}"):
        # Potential token theft — revoke entire family
        await redis.delete(f"token_family:{token_family}")
        raise HTTPException(401, "Session compromised. Please log in again.")

    # Mark old JTI as used (keep for 7 days to detect replays)
    await redis.setex(f"used_refresh:{old_jti}", 7 * 24 * 3600, "1")

    # Issue new tokens
    new_access  = create_access_token(user_id, ...)
    new_refresh = create_refresh_token(user_id, token_family)
    return new_access, new_refresh
```

### 2.4 Brute Force Protection

```python
# Rate limiting on login endpoint (per IP)
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/login")
@limiter.limit("5/minute")       # 5 attempts per minute per IP
@limiter.limit("20/hour")        # 20 attempts per hour per IP
async def login(credentials: LoginSchema, request: Request):
    ...
```

**Account lockout policy:**
- 5 consecutive failed attempts → account locked for 15 minutes
- 10 consecutive failed attempts → account locked for 1 hour; admin notified
- Lockout state stored in Redis with TTL

```python
async def check_lockout(user_id: str):
    attempts = await redis.get(f"login_attempts:{user_id}")
    if attempts and int(attempts) >= 5:
        ttl = await redis.ttl(f"login_attempts:{user_id}")
        raise HTTPException(429, f"Account locked. Try again in {ttl} seconds.")

async def record_failed_attempt(user_id: str):
    key = f"login_attempts:{user_id}"
    await redis.incr(key)
    await redis.expire(key, 900)  # 15-minute window
```

---

## 3. Authorization: RBAC Matrix

Five roles are defined. The matrix shows permissions across all major features and API endpoint groups.

### Role Definitions

| Role | Description |
|------|-------------|
| **Admin** | Full system access; manages users, roles, system config |
| **Project Manager** | Manages projects, teams, views all reports within their projects |
| **Safety Inspector** | Reviews detections, creates violations, conducts inspections |
| **Worker** | View own safety records; receive personal alerts |
| **Client** | Read-only access to project safety dashboards (no PII, no live feeds) |

### RBAC Permission Matrix

| Feature / Endpoint | Admin | Project Manager | Safety Inspector | Worker | Client |
|-------------------|:-----:|:---------------:|:----------------:|:------:|:------:|
| **User Management** | | | | | |
| Create / Edit / Delete users | ✅ | ❌ | ❌ | ❌ | ❌ |
| View all users | ✅ | ✅ (own project) | ✅ (own project) | ❌ | ❌ |
| Change user roles | ✅ | ❌ | ❌ | ❌ | ❌ |
| Reset any user password | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Project Management** | | | | | |
| Create / Delete projects | ✅ | ❌ | ❌ | ❌ | ❌ |
| Edit project details | ✅ | ✅ (own) | ❌ | ❌ | ❌ |
| View project list | ✅ | ✅ (own) | ✅ (assigned) | ✅ (assigned) | ✅ (assigned) |
| Assign workers to project | ✅ | ✅ (own) | ❌ | ❌ | ❌ |
| **Camera Management** | | | | | |
| Add / Delete cameras | ✅ | ✅ (own) | ❌ | ❌ | ❌ |
| Edit RTSP credentials | ✅ | ✅ (own) | ❌ | ❌ | ❌ |
| View live camera feeds | ✅ | ✅ (own) | ✅ (assigned) | ❌ | ❌ |
| View camera feed thumbnails | ✅ | ✅ (own) | ✅ (assigned) | ❌ | ✅ (own project, delayed) |
| **AI Detection** | | | | | |
| Trigger video analysis | ✅ | ✅ (own) | ✅ (assigned) | ❌ | ❌ |
| View detection results | ✅ | ✅ (own) | ✅ (assigned) | ✅ (own only) | ✅ (summary only) |
| Approve / Reject detections | ✅ | ✅ (own) | ✅ (assigned) | ❌ | ❌ |
| Download evidence (snapshots/clips) | ✅ | ✅ (own) | ✅ (assigned) | ❌ | ❌ |
| Configure AI thresholds | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Safety Violations** | | | | | |
| Create violations | ✅ | ✅ (own) | ✅ (assigned) | ❌ | ❌ |
| Edit violations | ✅ | ✅ (own) | ✅ (own created) | ❌ | ❌ |
| Delete violations | ✅ | ❌ | ❌ | ❌ | ❌ |
| View all violations | ✅ | ✅ (own) | ✅ (assigned) | ✅ (own) | ✅ (summary) |
| **Safety Inspections** | | | | | |
| Create / Edit inspections | ✅ | ✅ (own) | ✅ (assigned) | ❌ | ❌ |
| Delete inspections | ✅ | ✅ (own) | ❌ | ❌ | ❌ |
| View inspections | ✅ | ✅ (own) | ✅ (assigned) | ✅ (own) | ✅ (summary) |
| **Reports & Analytics** | | | | | |
| View system-wide analytics | ✅ | ❌ | ❌ | ❌ | ❌ |
| View project analytics | ✅ | ✅ (own) | ✅ (assigned) | ❌ | ✅ (own, no PII) |
| Export reports (PDF/CSV) | ✅ | ✅ (own) | ✅ (assigned) | ❌ | ✅ (limited) |
| **Notifications** | | | | | |
| Receive real-time alerts | ✅ | ✅ (own) | ✅ (assigned) | ✅ (personal) | ❌ |
| Configure alert rules | ✅ | ✅ (own) | ❌ | ❌ | ❌ |
| **System Configuration** | | | | | |
| View system settings | ✅ | ❌ | ❌ | ❌ | ❌ |
| Edit system settings | ✅ | ❌ | ❌ | ❌ | ❌ |
| View audit logs | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage AI models | ✅ | ❌ | ❌ | ❌ | ❌ |

### RBAC Enforcement in FastAPI

```python
from fastapi import Depends, HTTPException
from functools import wraps

def require_roles(*allowed_roles: str):
    """Decorator to enforce role-based access on FastAPI endpoints."""
    def dependency(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Role '{current_user.role}' is not authorized for this action."
            )
        return current_user
    return Depends(dependency)

# Usage example:
@router.get("/admin/users")
async def list_all_users(user: User = require_roles("admin")):
    ...

@router.post("/violations/")
async def create_violation(user: User = require_roles("admin", "project_manager", "safety_inspector")):
    ...
```

---

## 4. Password Security

### 4.1 Bcrypt Hashing

```python
from passlib.context import CryptContext

# Configuration: bcrypt with cost factor 12 (adjustable; higher = slower = more secure)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
```

> [!NOTE]
> Bcrypt with 12 rounds takes ~250ms per hash on modern hardware — slow enough to resist brute force but fast enough for normal login UX.

### 4.2 Password Strength Requirements

| Requirement | Rule |
|-------------|------|
| Minimum length | 12 characters |
| Uppercase | At least 1 uppercase letter |
| Lowercase | At least 1 lowercase letter |
| Digit | At least 1 numeric digit |
| Special character | At least 1 special character (`!@#$%^&*()-_+=`) |
| No common passwords | Check against top-10,000 password list |
| No username in password | Reject passwords containing the user's username |
| No repeated characters | No more than 3 consecutive identical characters |

```python
import re

COMMON_PASSWORDS = set(open("resources/top10k_passwords.txt").read().splitlines())

def validate_password_strength(password: str, username: str) -> list[str]:
    errors = []
    if len(password) < 12:
        errors.append("Password must be at least 12 characters.")
    if not re.search(r"[A-Z]", password):
        errors.append("Password must contain at least one uppercase letter.")
    if not re.search(r"[a-z]", password):
        errors.append("Password must contain at least one lowercase letter.")
    if not re.search(r"\d", password):
        errors.append("Password must contain at least one digit.")
    if not re.search(r"[!@#$%^&*()\-_+=]", password):
        errors.append("Password must contain at least one special character.")
    if password.lower() in COMMON_PASSWORDS:
        errors.append("Password is too common. Please choose a unique password.")
    if username.lower() in password.lower():
        errors.append("Password must not contain your username.")
    return errors
```

### 4.3 Password Reset Flow

```
1. User requests reset → POST /api/v1/auth/reset-request
   - Validate email exists (but always return success to prevent email enumeration)
   - Generate 32-byte cryptographically random token
   - Hash token with SHA-256; store hash + user_id + expiry (1 hour) in DB
   - Send email with link: https://app.constructsafe.ai/reset?token=<raw_token>

2. User clicks link → GET /reset?token=<raw_token>
   - Frontend presents new password form

3. User submits new password → POST /api/v1/auth/reset-confirm
   - Hash submitted token; look up in DB; check expiry
   - Validate password strength
   - Hash new password; update user record
   - Delete all reset tokens for this user (single-use enforcement)
   - Invalidate all existing sessions (revoke all refresh token families)
   - Send confirmation email
```

---

## 5. API Security

### 5.1 Rate Limiting

```python
# Global rate limiting configuration (slowapi + Redis backend)

RATE_LIMITS = {
    # Auth endpoints (strictest)
    "POST /api/v1/auth/login":          "5/minute, 20/hour",
    "POST /api/v1/auth/register":       "3/minute, 10/hour",
    "POST /api/v1/auth/reset-request":  "3/minute, 5/hour",

    # AI endpoints (resource-intensive)
    "POST /api/v1/detections/analyze":  "10/minute, 50/hour",

    # General API (per authenticated user)
    "GET  /api/v1/*":                   "100/minute",
    "POST /api/v1/*":                   "30/minute",
    "PUT  /api/v1/*":                   "30/minute",
    "DELETE /api/v1/*":                 "10/minute",

    # Global per IP (unauthenticated)
    "* (unauthenticated)":              "30/minute",
}
```

### 5.2 Input Validation with Pydantic

All request bodies are validated using Pydantic models with strict field constraints:

```python
from pydantic import BaseModel, Field, EmailStr, validator
import re

class UserCreateSchema(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")
    email: EmailStr
    password: str = Field(..., min_length=12, max_length=128)
    full_name: str = Field(..., min_length=2, max_length=100)
    role: Literal["admin", "project_manager", "safety_inspector", "worker", "client"]

    @validator("password")
    def password_strength(cls, v, values):
        errors = validate_password_strength(v, values.get("username", ""))
        if errors:
            raise ValueError("; ".join(errors))
        return v

    class Config:
        # Forbid extra fields not defined in the schema
        extra = "forbid"
```

### 5.3 SQL Injection Prevention

All database queries use **SQLAlchemy ORM** or **parameterized queries**. Raw SQL strings are **never** constructed with user input:

```python
# ✅ CORRECT — parameterized ORM query
user = db.query(User).filter(User.email == email_input).first()

# ✅ CORRECT — parameterized raw SQL (if needed)
result = db.execute(text("SELECT * FROM users WHERE email = :email"), {"email": email_input})

# ❌ WRONG — NEVER DO THIS
result = db.execute(f"SELECT * FROM users WHERE email = '{email_input}'")
```

### 5.4 XSS Prevention

| Measure | Implementation |
|---------|---------------|
| Output encoding | All user-generated content HTML-encoded before rendering (React does this by default; never use `dangerouslySetInnerHTML`) |
| Content-Security-Policy header | Restrict script sources; disallow inline scripts |
| X-XSS-Protection header | Enabled (legacy browser fallback) |
| HTTPOnly cookies | Prevents cookie theft via XSS |

**CSP Header configuration:**
```python
# FastAPI middleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline'; "  # Allow inline styles for Tailwind
        "img-src 'self' data: blob:; "         # Allow data URIs for canvas snapshots
        "connect-src 'self' wss://; "          # Allow WebSocket connections
        "frame-ancestors 'none';"              # Clickjacking protection
    )
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response
```

### 5.5 CORS Configuration

```python
from fastapi.middleware.cors import CORSMiddleware

ALLOWED_ORIGINS = [
    "http://localhost:5173",        # Vite dev server
    "https://app.constructsafe.ai", # Production frontend
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,          # Required for httpOnly cookie exchange
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    max_age=600,                     # Cache preflight for 10 minutes
)
```

> [!WARNING]
> Never use `allow_origins=["*"]` with `allow_credentials=True`. This is rejected by browsers and is a security misconfiguration.

---

## 6. File Upload Security

### 6.1 Allowed File Types

| Category | Allowed Extensions | Allowed MIME Types |
|----------|------------------|-------------------|
| Video | `.mp4`, `.avi`, `.mov` | `video/mp4`, `video/x-msvideo`, `video/quicktime` |
| Image | `.jpg`, `.jpeg`, `.png` | `image/jpeg`, `image/png` |

### 6.2 File Size Limits

| File Type | Max Size | Rationale |
|-----------|---------|-----------|
| Video upload | 500 MB | Typical 10-min 1080p construction footage |
| Image upload | 10 MB | High-res site photos |
| Profile avatar | 2 MB | Display size requirements |

### 6.3 Validation Implementation

```python
import magic  # python-magic for MIME detection
import hashlib

ALLOWED_MIME_TYPES = {
    "video/mp4", "video/x-msvideo", "video/quicktime",
    "image/jpeg", "image/png"
}
MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024  # 500 MB
MAX_IMAGE_SIZE_BYTES = 10  * 1024 * 1024  # 10 MB

async def validate_upload(file: UploadFile) -> str:
    # Read first 8KB for MIME detection
    header = await file.read(8192)
    await file.seek(0)

    # Check MIME type by magic bytes (not just extension)
    detected_mime = magic.from_buffer(header, mime=True)
    if detected_mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(400, f"File type '{detected_mime}' is not allowed.")

    # Check file size
    content = await file.read()
    size = len(content)
    if detected_mime.startswith("video/") and size > MAX_VIDEO_SIZE_BYTES:
        raise HTTPException(413, "Video file exceeds 500 MB limit.")
    if detected_mime.startswith("image/") and size > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(413, "Image file exceeds 10 MB limit.")

    await file.seek(0)
    return detected_mime
```

### 6.4 Secure File Paths

- Uploaded files are stored **outside the web root** — never directly accessible via HTTP
- Files are served through an authenticated API endpoint (`GET /api/v1/files/{file_id}`) that checks authorization before streaming
- Filenames are **never** taken from user input; generated UUID-based paths:
  ```
  storage/uploads/{project_id}/{year}/{month}/{uuid4()}.{ext}
  ```
- Directory traversal is prevented by normalizing paths and validating they remain within the storage root

### 6.5 Virus Scanning Recommendation

> [!NOTE]
> Integrate ClamAV for open-source virus scanning of uploaded files. Run `clamscan` on the file after upload and before processing. Quarantine any flagged files and alert the admin.

```bash
# Install ClamAV
apt-get install clamav clamav-daemon
freshclam  # Update virus definitions

# Scan uploaded file
clamscan --no-summary /path/to/uploaded/file.mp4
# Exit code 0 = clean, 1 = virus found, 2 = error
```

---

## 7. Camera / RTSP Security

### 7.1 Credential Storage

RTSP stream credentials (username, password, IP) **must never** be stored in plaintext in the database. Storage approach:

| Data | Storage Method |
|------|---------------|
| RTSP URL (without credentials) | Database (plaintext) |
| RTSP credentials (username/password) | Encrypted in DB using Fernet symmetric encryption |
| Encryption key | Environment variable `RTSP_ENCRYPTION_KEY` |

```python
from cryptography.fernet import Fernet

RTSP_KEY = Fernet(os.environ["RTSP_ENCRYPTION_KEY"].encode())

def encrypt_rtsp_credentials(username: str, password: str) -> str:
    data = f"{username}:{password}".encode()
    return RTSP_KEY.encrypt(data).decode()

def decrypt_rtsp_credentials(encrypted: str) -> tuple[str, str]:
    data = RTSP_KEY.decrypt(encrypted.encode()).decode()
    username, password = data.split(":", 1)
    return username, password

def build_rtsp_url(base_url: str, encrypted_credentials: str) -> str:
    """Build full RTSP URL with credentials — only in AI engine memory."""
    username, password = decrypt_rtsp_credentials(encrypted_credentials)
    # Insert credentials into URL: rtsp://user:pass@192.168.1.100/stream
    return base_url.replace("rtsp://", f"rtsp://{username}:{password}@")
```

### 7.2 Network Security

- RTSP cameras must be on a **dedicated VLAN** isolated from public internet
- Backend AI engine accesses cameras directly; frontend never accesses RTSP URLs
- Use VPN or private network for camera-to-server communication
- Recommend RTSP over TLS (RTSPS) where cameras support it
- Change default camera credentials immediately on deployment

### 7.3 RTSP Stream Authentication

- The API endpoint that returns RTSP streams to authenticated users returns a **proxy stream URL**, not the raw RTSP URL with credentials
- The backend acts as an RTSP proxy; frontend receives an HLS or WebRTC stream

---

## 8. Database Security

### 8.1 Connection String Management

```bash
# .env (never commit to version control)
DATABASE_URL=postgresql://constructsafe_app:StrongPwd123!@localhost:5432/constructsafe_db

# .gitignore — always include
.env
*.env
.env.*
secrets/
```

### 8.2 Least-Privilege Database User

```sql
-- Create application user with minimal privileges
CREATE USER constructsafe_app WITH PASSWORD 'StrongPwd123!';

-- Grant only necessary privileges on the application database
GRANT CONNECT ON DATABASE constructsafe_db TO constructsafe_app;
GRANT USAGE ON SCHEMA public TO constructsafe_app;

-- Table-level permissions (no CREATE TABLE, DROP TABLE, ALTER TABLE)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO constructsafe_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO constructsafe_app;

-- Alembic migrations run as a separate privileged user (not the app user)
CREATE USER constructsafe_migrate WITH PASSWORD 'MigratePwd456!';
GRANT ALL PRIVILEGES ON DATABASE constructsafe_db TO constructsafe_migrate;
```

### 8.3 Row-Level Security (RLS) Considerations

For multi-project data isolation, implement PostgreSQL Row Level Security:

```sql
-- Enable RLS on violations table (example)
ALTER TABLE violations ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see violations from their assigned projects
CREATE POLICY violations_project_isolation ON violations
    USING (project_id = ANY(
        SELECT project_id FROM user_projects WHERE user_id = current_setting('app.current_user_id')::uuid
    ));
```

> [!NOTE]
> RLS is enforced at the DB level as a defense-in-depth measure, even if the application layer already enforces project isolation via RBAC.

### 8.4 Backup Encryption

```bash
# Encrypted PostgreSQL backup using gpg
pg_dump constructsafe_db | gpg --symmetric --cipher-algo AES256 --output backup_$(date +%Y%m%d).sql.gpg

# Automated nightly backup (cron)
0 2 * * * /scripts/backup_db.sh >> /var/log/db_backup.log 2>&1
```

Backups stored in encrypted form; decryption key stored separately from backup files.

---

## 9. WebSocket Security

### 9.1 Authenticated WebSocket Connections

WebSocket connections require a valid JWT access token passed as a query parameter (since WS `connect` cannot carry Authorization headers in the browser):

```python
from fastapi import WebSocket, WebSocketDisconnect, Query
import jwt

@router.websocket("/ws/notifications")
async def ws_notifications(
    websocket: WebSocket,
    token: str = Query(...),  # ?token=<access_token>
):
    # Validate token before accepting connection
    try:
        payload = jwt.decode(token, PUBLIC_KEY, algorithms=["RS256"])
        user_id = payload["sub"]
        role = payload["role"]
    except jwt.ExpiredSignatureError:
        await websocket.close(code=4001, reason="Token expired")
        return
    except jwt.InvalidTokenError:
        await websocket.close(code=4003, reason="Invalid token")
        return

    await websocket.accept()
    # Register connection with user_id for targeted message delivery
    await connection_manager.connect(user_id, role, websocket)

    try:
        while True:
            data = await websocket.receive_text()
            # Validate incoming messages
            await handle_ws_message(user_id, role, data)
    except WebSocketDisconnect:
        connection_manager.disconnect(user_id, websocket)
```

### 9.2 Message Validation

All incoming WebSocket messages are validated against a schema:

```python
from pydantic import BaseModel
import json

class WSMessageSchema(BaseModel):
    type: Literal["subscribe_camera", "unsubscribe_camera", "ping"]
    payload: dict

async def handle_ws_message(user_id: str, role: str, raw_message: str):
    try:
        data = json.loads(raw_message)
        msg = WSMessageSchema(**data)
    except (json.JSONDecodeError, ValueError):
        # Invalid message — close connection
        return

    if msg.type == "subscribe_camera":
        camera_id = msg.payload.get("camera_id")
        # Verify user is authorized for this camera
        if not await is_authorized_for_camera(user_id, role, camera_id):
            return  # Silently ignore unauthorized subscriptions
```

### 9.3 WebSocket Rate Limiting

- Maximum **5 concurrent WebSocket connections per user** (prevent connection exhaustion)
- Messages processed at maximum **10 messages per second per connection**; excess messages are dropped

---

## 10. Infrastructure Security

### 10.1 Docker Security Best Practices

```dockerfile
# Backend Dockerfile — security-hardened

# Use specific digest instead of mutable tag
FROM python:3.11-slim-bullseye@sha256:<specific_digest>

# Run as non-root user (never run as UID 0 in production)
RUN groupadd -r appgroup && useradd -r -g appgroup -u 1001 appuser

# Set working directory
WORKDIR /app

# Copy and install dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY --chown=appuser:appgroup . .

# Drop to non-root
USER appuser

# Explicitly expose only the needed port
EXPOSE 8000

# No shell process — use exec form
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 10.2 Docker Compose Security

```yaml
# docker-compose.yml security settings
services:
  backend:
    security_opt:
      - no-new-privileges:true    # Prevent privilege escalation
    cap_drop:
      - ALL                        # Drop all Linux capabilities
    cap_add:
      - NET_BIND_SERVICE           # Only add back what is needed
    read_only: true                # Read-only root filesystem
    tmpfs:
      - /tmp                       # Writable temp in memory
    environment:
      - DATABASE_URL=${DATABASE_URL}       # From .env — never hardcode
      - JWT_PRIVATE_KEY=${JWT_PRIVATE_KEY}
    secrets:
      - jwt_private_key

secrets:
  jwt_private_key:
    file: ./secrets/jwt_private_key.pem
```

### 10.3 Secrets Management

| Secret | Storage Method | Rotation Policy |
|--------|---------------|-----------------|
| DB password | `.env` + Docker secret | Rotate every 90 days |
| JWT private key | Docker secret + mounted volume | Rotate every 365 days |
| RTSP encryption key | `.env` + Docker secret | Rotate every 180 days |
| Email SMTP credentials | `.env` | Rotate on compromise |
| Redis password | `.env` | Rotate every 90 days |

**Rules:**
- `.env` files committed to `.gitignore`
- Pre-commit hook to detect secret patterns (`detect-secrets` tool)
- Secrets never logged or printed
- Secrets never passed as CLI arguments (visible in process list)

---

## 11. Logging and Audit Trail

### 11.1 What to Log

| Event Category | Events Logged |
|----------------|-------------|
| **Authentication** | Login success, login failure (with IP), logout, password change, token refresh, account lockout, password reset request/completion |
| **Authorization** | Access denied events (403), role changes, permission grant/revoke |
| **User Management** | User created, user deleted, user updated, role assigned |
| **Data Modifications** | Project created/updated/deleted, violation created/updated/deleted, inspection submitted |
| **AI Detections** | Detection event created (camera, timestamp, classes, confidence), detection reviewed (approved/rejected), model version changed |
| **File Operations** | File uploaded (name, size, type, uploader), file downloaded, file deleted |
| **Camera Events** | Camera added, camera credentials updated, stream connected, stream disconnected |
| **System Events** | Service start/stop, model version deployed, configuration changes |
| **Security Events** | Brute force detected, SQL injection attempt detected, file type rejection, rate limit exceeded |

### 11.2 Log Format (Structured JSON)

```json
{
  "timestamp": "2026-11-17T10:15:30.123Z",
  "level": "INFO",
  "event_type": "auth.login.success",
  "request_id": "req_uuid",
  "user_id": "user_uuid",
  "user_role": "safety_inspector",
  "ip_address": "192.168.1.45",
  "user_agent": "Mozilla/5.0 ...",
  "resource": "/api/v1/auth/login",
  "method": "POST",
  "status_code": 200,
  "duration_ms": 243,
  "metadata": {
    "project_id": null,
    "additional_context": "..."
  }
}
```

### 11.3 Log Retention Policy

| Log Type | Retention | Storage |
|----------|-----------|---------|
| Security events (auth, access denied) | 2 years | Encrypted, append-only |
| Audit events (data modifications) | 1 year | Encrypted, append-only |
| AI detection events | 1 year | Database + log file |
| Application errors | 90 days | Log aggregator |
| Access logs (request/response) | 30 days | Log aggregator |

> [!CAUTION]
> Audit logs must be **append-only** and protected from modification — even by admins. Consider writing to a write-once storage (WORM) or external SIEM in high-compliance environments.

### 11.4 Log Implementation

```python
import structlog
import logging

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.stdlib.add_log_level,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.BoundLogger,
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
)

logger = structlog.get_logger()

# Usage in auth endpoint:
logger.info("auth.login.success",
            user_id=str(user.id),
            ip=request.client.host,
            user_agent=request.headers.get("User-Agent"))
```

---

## 12. Data Privacy

### 12.1 Worker Data Handling

| Data Element | Collection | Retention | Access |
|--------------|-----------|-----------|--------|
| Name, email, role | Yes — required for system use | Until account deleted | Admin, PM (own project) |
| Safety violations | Yes — legal compliance | 3 years minimum | Inspector, PM, Worker (own) |
| Detection snapshots (face visible) | Yes — safety evidence | 90 days (or until incident closed) | Inspector, PM only |
| Continuous video footage | Operational buffer only (30 seconds) | Not retained beyond violation clips | Inspector, PM only |
| Location data | Zone-level only (not GPS tracking) | Same as violation retention | Inspector, PM |

### 12.2 Camera Footage Retention Policy

| Footage Type | Retention Period | Rationale |
|-------------|-----------------|-----------|
| Live stream buffer | 30 seconds (rolling) | Near-real-time detection only |
| Violation clip (±5 seconds) | 90 days | Evidence for review |
| Violation clip (attached to formal incident) | 3 years | Legal/compliance requirement |
| Non-violation footage | Not stored | Data minimization |

### 12.3 GDPR-Like Considerations

| Principle | Implementation |
|-----------|---------------|
| **Lawful basis** | Legitimate interest (workplace safety) or worker consent; document the basis |
| **Data subject rights** | Workers can request access to their own violation records; API endpoint for data export |
| **Right to erasure** | Workers can request deletion of their data; blocked only if data is part of an open incident |
| **Privacy notices** | Display at system login and on-site signage explaining camera usage |
| **Data minimization** | Do not collect face biometrics; zone-level location only |
| **Data transfers** | If using cloud inference, ensure cloud provider is in an adequate jurisdiction or use appropriate safeguards |
| **DPO contact** | Designate a Data Protection Officer contact for worker inquiries |

---

## 13. Vulnerability Management

### 13.1 Dependency Scanning

```bash
# Python backend — scan with Safety
pip install safety
safety check -r requirements.txt --full-report

# Node.js frontend — scan with npm audit
npm audit --audit-level=moderate
npm audit fix

# Docker images — scan with Trivy
trivy image constructsafe-backend:latest
trivy image constructsafe-frontend:latest

# Schedule weekly scans in CI/CD pipeline
```

### 13.2 OWASP Top 10 Mitigations (2021)

| OWASP Risk | Mitigation Implemented |
|-----------|----------------------|
| **A01: Broken Access Control** | RBAC on all endpoints; project-level isolation; RLS in DB |
| **A02: Cryptographic Failures** | RS256 JWT; bcrypt passwords; AES-256 for RTSP credentials; HTTPS enforced |
| **A03: Injection** | Pydantic input validation; SQLAlchemy ORM; parameterized queries |
| **A04: Insecure Design** | Threat modeling; human review workflow; fail-secure authentication |
| **A05: Security Misconfiguration** | Security headers; Docker hardening; no default credentials; CSP |
| **A06: Vulnerable Components** | Weekly `safety` and `npm audit` scans; pinned dependency versions |
| **A07: Identity & Auth Failures** | JWT rotation; bcrypt; account lockout; httpOnly cookies |
| **A08: Software & Data Integrity** | Signed Docker images; checksums for model weights; CI pipeline signing |
| **A09: Logging & Monitoring Failures** | Structured JSON audit logs; real-time anomaly alerts; 2-year retention |
| **A10: SSRF** | No user-controlled URL fetching; RTSP URLs validated against allowlist of internal IPs |

---

## 14. Authentication & Authorization Flow Diagram

```mermaid
sequenceDiagram
    participant U as User Browser
    participant FE as Frontend (React)
    participant API as FastAPI Backend
    participant Redis as Redis Cache
    participant DB as PostgreSQL

    Note over U,DB: Login Flow
    U->>FE: Enter credentials
    FE->>API: POST /api/v1/auth/login {username, password}
    API->>Redis: Check lockout status
    Redis-->>API: Not locked
    API->>DB: SELECT user WHERE username = ?
    DB-->>API: User record (hashed password)
    API->>API: bcrypt.verify(password, hash)
    API->>DB: UPDATE last_login
    API->>API: Create access_token (15min, RS256)
    API->>API: Create refresh_token (7d, RS256)
    API->>Redis: Store refresh_token JTI
    API-->>FE: {access_token} + Set-Cookie: refresh_token (httpOnly)
    FE->>FE: Store access_token in memory

    Note over U,DB: Authenticated Request
    U->>FE: Navigate to protected resource
    FE->>API: GET /api/v1/violations (Authorization: Bearer <access_token>)
    API->>API: Decode & validate JWT (RS256 public key)
    API->>API: Check role permissions (RBAC)
    API->>DB: SELECT violations WHERE project_id IN (user_projects)
    DB-->>API: Violations data
    API-->>FE: 200 OK {violations}
    FE-->>U: Render violations

    Note over U,DB: Token Refresh
    FE->>API: POST /api/v1/auth/refresh (Cookie: refresh_token)
    API->>API: Decode refresh token
    API->>Redis: Check JTI used?
    Redis-->>API: Not used
    API->>Redis: Mark old JTI as used (7d TTL)
    API->>API: Issue new access_token + refresh_token
    API-->>FE: {new access_token} + Set-Cookie: new refresh_token
```

---

## 15. Security Layer Stack Diagram

```mermaid
flowchart TD
    A["Internet / Client"] --> B["HTTPS / TLS 1.3\n(Let's Encrypt / Nginx)"]
    B --> C["Nginx Reverse Proxy\n(Rate limit, DDoS buffer, static files)"]
    C --> D["CORS Middleware\n(Allowlisted origins only)"]
    D --> E["Security Headers Middleware\n(CSP, HSTS, X-Frame-Options)"]
    E --> F["Rate Limiting Middleware\n(slowapi + Redis)"]
    F --> G["JWT Authentication\n(RS256 token validation)"]
    G --> H["RBAC Authorization\n(role + project scope check)"]
    H --> I["Request Body Validation\n(Pydantic schemas)"]
    I --> J["FastAPI Route Handler\n(Business Logic)"]
    J --> K["SQLAlchemy ORM\n(Parameterized queries)"]
    K --> L["PostgreSQL\n(RLS, least-privilege user)"]
    J --> M["File Storage\n(Outside web root, UUID paths)"]
    J --> N["AI Engine\n(Isolated service, internal network)"]
    N --> O["Camera RTSP\n(Encrypted credentials, VLAN)"]

    style A fill:#f44336,color:#fff
    style B fill:#e65100,color:#fff
    style C fill:#ef6c00,color:#fff
    style D fill:#f57c00,color:#fff
    style E fill:#fb8c00,color:#fff
    style F fill:#ffa726,color:#333
    style G fill:#66bb6a,color:#333
    style H fill:#43a047,color:#fff
    style I fill:#388e3c,color:#fff
    style J fill:#1565c0,color:#fff
    style K fill:#1976d2,color:#fff
    style L fill:#0d47a1,color:#fff
    style M fill:#4527a0,color:#fff
    style N fill:#283593,color:#fff
    style O fill:#37474f,color:#fff
```

---

## 16. Incident Response Plan

### 16.1 Incident Classification

| Severity | Description | Examples | Response Time |
|----------|-------------|---------|--------------|
| **P1 — Critical** | Active breach; data exfiltration in progress | Live unauthorized access; ransomware; DB dump in progress | Immediate (< 15 min) |
| **P2 — High** | Confirmed breach (past event); significant exposure | JWT signing key compromised; mass credential stuffing success | < 1 hour |
| **P3 — Medium** | Potential breach; anomalous activity | Unusual login patterns; 10x spike in failed auth | < 4 hours |
| **P4 — Low** | Minor security event; no confirmed breach | Single brute force attempt; vulnerability reported | < 24 hours |

### 16.2 Response Procedures

#### Phase 1: Detection & Triage (0–15 min for P1)
- [ ] Alert triggers in monitoring system (or manual report received)
- [ ] Assign Incident Commander (IC) from Security team
- [ ] Assess severity classification
- [ ] Create incident channel (Slack/Teams) with key stakeholders
- [ ] Do NOT publicly disclose yet

#### Phase 2: Containment (15–60 min for P1)
- [ ] Isolate affected system (take Docker container offline if compromised)
- [ ] Revoke all active JWT tokens: flush Redis token store (`FLUSHDB` on JWT Redis instance)
- [ ] Force all users to re-authenticate
- [ ] Block suspicious IP ranges at Nginx / firewall level
- [ ] Preserve logs (snapshot before any system changes)
- [ ] Change compromised credentials immediately

#### Phase 3: Investigation
- [ ] Review audit logs for scope of access
- [ ] Determine initial access vector (phishing, vulnerability, insider)
- [ ] Identify all data that may have been accessed/exfiltrated
- [ ] Engage forensic specialist if needed
- [ ] Document timeline

#### Phase 4: Eradication
- [ ] Patch the exploited vulnerability
- [ ] Remove any attacker-placed backdoors or malware
- [ ] Rotate all secrets (DB passwords, JWT keys, RTSP encryption keys)
- [ ] Update dependencies if vulnerability was in a library
- [ ] Harden the specific attack vector

#### Phase 5: Recovery
- [ ] Restore service from clean backup if data integrity is in question
- [ ] Gradually re-enable affected systems under enhanced monitoring
- [ ] Monitor for recurrence for 72 hours
- [ ] Force password resets for affected users

#### Phase 6: Lessons Learned (within 7 days of P1 resolution)
- [ ] Post-incident review meeting
- [ ] Document what worked, what didn't
- [ ] Update security controls and runbooks
- [ ] Notify affected parties as legally required (GDPR: 72 hours to DPA)
- [ ] File incident report

### 16.3 Key Contacts

| Role | Responsibility |
|------|---------------|
| Incident Commander | Overall incident coordination |
| Security Lead | Technical investigation and containment |
| Backend Lead | Application-level containment and patching |
| DBA | Database security and backup restoration |
| Legal / DPO | Regulatory notification obligations |
| Communications | Internal and external communications |

---

## 17. Security Testing Checklist

### Authentication & Session Management
- [ ] JWT tokens expire at the correct time (15 min access, 7 days refresh)
- [ ] Expired tokens are rejected with 401
- [ ] Tampered JWT signatures are rejected
- [ ] Refresh token rotation works correctly
- [ ] Reuse of a rotated refresh token triggers family revocation
- [ ] Brute force lockout triggers after 5 failed attempts
- [ ] Account lockout releases correctly after TTL
- [ ] Logout properly invalidates the refresh token
- [ ] httpOnly cookie is set correctly (verify no JS access via `document.cookie`)
- [ ] Password reset link expires after 1 hour
- [ ] Password reset token cannot be reused

### Authorization
- [ ] Each RBAC matrix entry verified by API test
- [ ] Workers cannot access other workers' data
- [ ] Project-level isolation is enforced (PM cannot see other projects)
- [ ] Client cannot access live camera feeds
- [ ] Admin-only endpoints reject all other roles with 403

### Input Validation & Injection
- [ ] SQL injection tests on all string parameters (use `sqlmap`)
- [ ] XSS payloads rejected or encoded in all text inputs
- [ ] File upload rejects disallowed extensions
- [ ] File upload rejects files with manipulated MIME types (e.g., PHP file renamed to .jpg)
- [ ] File upload rejects oversized files
- [ ] Path traversal attempts on file serving endpoints (`../../etc/passwd`)
- [ ] Pydantic `extra="forbid"` verified — no extra fields accepted

### Transport Security
- [ ] HTTPS enforced; HTTP redirects to HTTPS (301)
- [ ] HSTS header present (`Strict-Transport-Security: max-age=31536000; includeSubDomains`)
- [ ] TLS 1.0 and 1.1 disabled
- [ ] Weak cipher suites disabled (verify with `nmap --script ssl-enum-ciphers`)
- [ ] Certificate validity and chain verified

### API Security
- [ ] Rate limiting triggers correctly on all configured endpoints
- [ ] CORS rejects requests from non-allowlisted origins
- [ ] All security headers present in responses
- [ ] No sensitive data in error messages (stack traces not exposed in production)
- [ ] API versioning correct (/api/v1/)

### WebSocket Security
- [ ] Unauthenticated WebSocket connections rejected (code 4003)
- [ ] Expired token WebSocket connections rejected (code 4001)
- [ ] Users cannot subscribe to cameras/projects they are not authorized for

### Infrastructure
- [ ] Docker containers run as non-root (verify with `docker inspect`)
- [ ] No secrets in Docker image layers (`docker history`)
- [ ] `.env` file not committed to Git (`git log --all -- .env`)
- [ ] `detect-secrets` pre-commit hook active
- [ ] Dependency scan passes (`safety check`, `npm audit`)
- [ ] Trivy image scan passes with no HIGH/CRITICAL vulnerabilities

### Logging & Monitoring
- [ ] Failed login attempts logged with IP
- [ ] 403 errors logged with user and resource
- [ ] Log injection attacks do not corrupt log format (log all fields in JSON, no string formatting with user input)
- [ ] Sensitive fields (passwords, tokens) are NOT logged

### Penetration Testing (Pre-launch)
- [ ] External penetration test by qualified third party
- [ ] OWASP ZAP automated scan on all API endpoints
- [ ] Burp Suite manual review of critical flows (login, file upload, detection API)
- [ ] Social engineering test with low-privilege test accounts

---

*Document End — SECURITY_PLAN.md*  
*ConstructSafe AI — Confidential — Internal Planning Document*
