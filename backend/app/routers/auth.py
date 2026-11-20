import uuid
from datetime import datetime, timezone, timedelta
from typing import Annotated
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pymongo.asynchronous.database import AsyncDatabase
import jwt

from app.core.config import settings
from app.core.dependencies import get_current_user, require_roles, get_db
from app.core.rate_limiter import (
    rate_limit_login,
    rate_limit_refresh,
    rate_limit_password_change,
)
from app.core.security import (
    verify_password,
    hash_password,
    validate_password_strength,
    hash_token,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.models.mongodb import UserDocument
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    TokenResponse,
    RefreshTokenRequest,
    UserSummary,
    LogoutResponse,
    ChangePasswordRequest,
    ChangePasswordResponse,
    UpdateProfileRequest,
    UpdateProfileResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication & User Access"])

@router.post(
    "/login",
    response_model=LoginResponse,
    dependencies=[Depends(rate_limit_login)],
    summary="User Login",
    description="Authenticate with email and Argon2 password. Returns JWT access token and rotating refresh token."
)
async def login(
    payload: LoginRequest,
    request: Request,
    db: Annotated[AsyncDatabase, Depends(get_db)]
):
    now = datetime.now(timezone.utc)

    # 1. Fetch user by email
    user_data = await db.users.find_one({"email": payload.email.lower(), "deleted_at": None})
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # 2. Check brute-force lockout status
    locked_until = user_data.get("locked_until")
    if locked_until:
        if locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        if locked_until > now:
            remaining_mins = max(1, int((locked_until - now).total_seconds() / 60))
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account is temporarily locked due to multiple failed login attempts. Please try again in {remaining_mins} minutes.",
            )

    # 3. Verify password with Argon2id
    if not verify_password(payload.password, user_data["hashed_password"]):
        failed_count = user_data.get("failed_login_attempts", 0) + 1
        update_fields: dict = {"failed_login_attempts": failed_count}
        
        if failed_count >= settings.MAX_FAILED_LOGIN_ATTEMPTS:
            lock_time = now + timedelta(minutes=settings.ACCOUNT_LOCKOUT_MINUTES)
            update_fields["locked_until"] = lock_time
            await db.audit_logs.insert_one({
                "_id": ObjectId(),
                "actor_id": user_data["_id"],
                "actor_email": user_data["email"],
                "action": "SECURITY_ACCOUNT_LOCKED",
                "resource_type": "auth",
                "resource_id": str(user_data["_id"]),
                "ip_address": request.client.host if request.client else None,
                "details": f"Account locked for {settings.ACCOUNT_LOCKOUT_MINUTES} mins after {failed_count} failed attempts",
                "created_at": now,
            })

        await db.users.update_one({"_id": user_data["_id"]}, {"$set": update_fields})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # 4. Check account activation
    if not user_data.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact an administrator.",
        )

    # Reset failed attempts and lockout on success
    await db.users.update_one(
        {"_id": user_data["_id"]},
        {"$set": {"failed_login_attempts": 0, "locked_until": None, "last_login_at": now}}
    )

    user = UserDocument.model_validate(user_data)
    now = datetime.now(timezone.utc)

    # 4. Fetch Role and Permissions
    role_data = await db.roles.find_one({"_id": user.role_id})
    permissions = role_data.get("permission_names", []) if role_data else []

    # 5. Generate Tokens
    access_token = create_access_token(
        user_id=str(user.id),
        email=user.email,
        role_name=user.role_name,
        permissions=permissions,
    )
    refresh_token, family_id, refresh_expires_at = create_refresh_token(
        user_id=str(user.id),
        family_id=str(uuid.uuid4()),
    )

    # 6. Store Refresh Token in MongoDB
    token_record = {
        "_id": ObjectId(),
        "user_id": user.id,
        "token_hash": hash_token(refresh_token),
        "family_id": family_id,
        "expires_at": refresh_expires_at,
        "created_at": now,
        "is_revoked": False,
        "revoked_at": None,
        "replaced_by": None,
    }
    await db.refresh_tokens.insert_one(token_record)

    # 7. Update Last Login
    await db.users.update_one(
        {"_id": user.id},
        {"$set": {"last_login_at": now}}
    )

    # 8. Record Audit Log
    await db.audit_logs.insert_one({
        "_id": ObjectId(),
        "actor_id": user.id,
        "actor_email": user.email,
        "action": "USER_LOGIN_SUCCESS",
        "resource_type": "auth",
        "resource_id": str(user.id),
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
        "created_at": now,
    })

    return LoginResponse(
        success=True,
        user=UserSummary(
            id=str(user.id),
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            role_name=user.role_name,
            phone=user.phone,
            permissions=permissions,
            assigned_project_ids=[str(pid) for pid in user.assigned_project_ids],
        ),
        tokens=TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        ),
    )

@router.post(
    "/refresh",
    response_model=TokenResponse,
    dependencies=[Depends(rate_limit_refresh)],
    summary="Refresh Access Token with Rotation & Reuse Detection",
    description="Rotates the refresh token. If a previously-used or revoked token is reused, all tokens in the family are instantly revoked."
)
async def refresh_access_token(
    payload: RefreshTokenRequest,
    db: Annotated[AsyncDatabase, Depends(get_db)]
):
    # 1. Decode refresh token signature and claims
    try:
        decoded = decode_token(payload.refresh_token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired. Please sign in again.",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid refresh token: {str(e)}",
        )

    if decoded.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type: Expected refresh token",
        )

    incoming_hash = hash_token(payload.refresh_token)
    now = datetime.now(timezone.utc)

    # 2. Look up token in database
    token_doc = await db.refresh_tokens.find_one({"token_hash": incoming_hash})
    if not token_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not recognized or already purged",
        )

    family_id = token_doc["family_id"]
    user_id = token_doc["user_id"]

    # 3. REUSE DETECTION: If token was already revoked, a breach/replay attack has occurred!
    if token_doc.get("is_revoked", False):
        # Invalidate ALL tokens in this family immediately
        await db.refresh_tokens.update_many(
            {"family_id": family_id},
            {"$set": {"is_revoked": True, "revoked_at": now}}
        )
        # Log critical security alert
        await db.audit_logs.insert_one({
            "_id": ObjectId(),
            "actor_id": user_id,
            "action": "SECURITY_REFRESH_TOKEN_REUSE_DETECTED",
            "resource_type": "security",
            "resource_id": family_id,
            "changes": {"revoked_family": family_id},
            "created_at": now,
        })
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Security breach detected: Refresh token was already used. All sessions have been revoked.",
        )

    # 4. Fetch User and Role
    user_data = await db.users.find_one({"_id": user_id, "deleted_at": None, "is_active": True})
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Associated user account is no longer active",
        )

    role_data = await db.roles.find_one({"_id": user_data["role_id"]})
    permissions = role_data.get("permission_names", []) if role_data else []

    # 5. ROTATE: Generate new access token and new refresh token in the SAME family
    new_access_token = create_access_token(
        user_id=str(user_id),
        email=user_data["email"],
        role_name=user_data["role_name"],
        permissions=permissions,
    )
    new_refresh_token, _, new_expires_at = create_refresh_token(
        user_id=str(user_id),
        family_id=family_id,
    )
    new_hash = hash_token(new_refresh_token)

    # 6. Invalidate current token and link to replacement
    await db.refresh_tokens.update_one(
        {"_id": token_doc["_id"]},
        {"$set": {
            "is_revoked": True,
            "revoked_at": now,
            "replaced_by": new_hash
        }}
    )

    # 7. Insert new refresh token in the same family
    await db.refresh_tokens.insert_one({
        "_id": ObjectId(),
        "user_id": user_id,
        "token_hash": new_hash,
        "family_id": family_id,
        "expires_at": new_expires_at,
        "created_at": now,
        "is_revoked": False,
        "revoked_at": None,
        "replaced_by": None,
    })

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

@router.post(
    "/logout",
    response_model=LogoutResponse,
    summary="User Logout",
    description="Invalidate current refresh token and terminate active session."
)
async def logout(
    payload: RefreshTokenRequest,
    db: Annotated[AsyncDatabase, Depends(get_db)]
):
    token_hash = hash_token(payload.refresh_token)
    await db.refresh_tokens.update_one(
        {"token_hash": token_hash},
        {"$set": {"is_revoked": True, "revoked_at": datetime.now(timezone.utc)}}
    )
    return LogoutResponse(
        success=True,
        message="Logged out successfully. Refresh token invalidated."
    )

@router.post(
    "/change-password",
    response_model=ChangePasswordResponse,
    dependencies=[Depends(rate_limit_password_change)],
    summary="Change User Password",
    description="Securely change authenticated user password with current password verification, Argon2id re-hashing, and session invalidation."
)
async def change_password(
    payload: ChangePasswordRequest,
    current_user: Annotated[UserDocument, Depends(get_current_user)],
    request: Request,
    db: Annotated[AsyncDatabase, Depends(get_db)]
):
    # 1. Fetch user to verify current password
    user_data = await db.users.find_one({"_id": current_user.id, "deleted_at": None})
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account was not found"
        )

    # 2. Verify current password
    if not verify_password(payload.current_password, user_data["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    # 3. Disallow identical new password
    if payload.current_password == payload.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password cannot be the same as your current password"
        )

    # 4. Enforce complexity requirements
    is_valid, err_msg = validate_password_strength(payload.new_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err_msg
        )

    now = datetime.now(timezone.utc)
    new_hashed = hash_password(payload.new_password)

    # 5. Update user password in MongoDB
    await db.users.update_one(
        {"_id": current_user.id},
        {"$set": {
            "hashed_password": new_hashed,
            "password_changed_at": now,
            "updated_at": now,
            "failed_login_attempts": 0,
            "locked_until": None,
        }}
    )

    # 6. Invalidate all active refresh tokens for this user
    await db.refresh_tokens.update_many(
        {"user_id": current_user.id, "is_revoked": False},
        {"$set": {"is_revoked": True, "revoked_at": now}}
    )

    # 7. Record security audit log
    await db.audit_logs.insert_one({
        "_id": ObjectId(),
        "actor_id": current_user.id,
        "actor_email": current_user.email,
        "action": "USER_PASSWORD_CHANGE_SUCCESS",
        "resource_type": "auth",
        "resource_id": str(current_user.id),
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
        "created_at": now,
    })

    return ChangePasswordResponse(
        success=True,
        message="Password changed successfully. All active sessions have been revoked."
    )

@router.get(
    "/me",
    response_model=UserSummary,
    summary="Current User Profile",
    description="Returns authenticated user details, assigned role, and active permissions."
)
async def get_my_profile(
    current_user: Annotated[UserDocument, Depends(get_current_user)],
    db: Annotated[AsyncDatabase, Depends(get_db)]
):
    role_data = await db.roles.find_one({"_id": current_user.role_id})
    permissions = role_data.get("permission_names", []) if role_data else []

    return UserSummary(
        id=str(current_user.id),
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        role_name=current_user.role_name,
        phone=current_user.phone,
        permissions=permissions,
        assigned_project_ids=[str(pid) for pid in current_user.assigned_project_ids],
    )

@router.patch(
    "/me",
    response_model=UpdateProfileResponse,
    summary="Update Current User Profile",
    description="Updates first name, last name, and phone number for the authenticated user."
)
async def update_my_profile(
    payload: UpdateProfileRequest,
    current_user: Annotated[UserDocument, Depends(get_current_user)],
    request: Request,
    db: Annotated[AsyncDatabase, Depends(get_db)]
):
    now = datetime.now(timezone.utc)
    update_fields = {"updated_at": now}

    if payload.first_name is not None:
        clean_first = payload.first_name.strip()
        if clean_first:
            update_fields["first_name"] = clean_first

    if payload.last_name is not None:
        clean_last = payload.last_name.strip()
        if clean_last:
            update_fields["last_name"] = clean_last

    if payload.phone is not None:
        update_fields["phone"] = payload.phone.strip()

    if len(update_fields) > 1:
        await db.users.update_one(
            {"_id": current_user.id},
            {"$set": update_fields}
        )

        # Synchronize worker profile if this user has an associated worker record
        worker_update = {}
        if "first_name" in update_fields:
            worker_update["first_name"] = update_fields["first_name"]
        if "last_name" in update_fields:
            worker_update["last_name"] = update_fields["last_name"]
        if "phone" in update_fields:
            worker_update["phone"] = update_fields["phone"]

        if worker_update:
            worker_update["updated_at"] = now
            await db.workers.update_one(
                {"$or": [{"user_id": current_user.id}, {"email": current_user.email.lower()}]},
                {"$set": worker_update}
            )

        # Record audit log
        await db.audit_logs.insert_one({
            "_id": ObjectId(),
            "actor_id": current_user.id,
            "actor_email": current_user.email,
            "action": "USER_PROFILE_UPDATE",
            "resource_type": "user",
            "resource_id": str(current_user.id),
            "ip_address": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent"),
            "changes": {k: v for k, v in update_fields.items() if k != "updated_at"},
            "created_at": now,
        })

    # Fetch fresh updated document
    refreshed_user = await db.users.find_one({"_id": current_user.id})
    role_data = await db.roles.find_one({"_id": refreshed_user["role_id"]})
    permissions = role_data.get("permission_names", []) if role_data else []

    updated_summary = UserSummary(
        id=str(refreshed_user["_id"]),
        email=refreshed_user["email"],
        first_name=refreshed_user.get("first_name", ""),
        last_name=refreshed_user.get("last_name", ""),
        role_name=refreshed_user.get("role_name", ""),
        phone=refreshed_user.get("phone"),
        permissions=permissions,
        assigned_project_ids=[str(pid) for pid in refreshed_user.get("assigned_project_ids", [])],
    )

    return UpdateProfileResponse(
        success=True,
        message="Profile updated successfully.",
        user=updated_summary
    )

# =============================================================================
# Role-Based Access Control (RBAC) Verification Endpoints
# =============================================================================

@router.get(
    "/admin-only",
    summary="Admin Protected Resource",
    description="Only users with the 'admin' role can access this endpoint."
)
async def admin_only_endpoint(
    current_user: Annotated[UserDocument, Depends(require_roles("admin"))]
):
    return {
        "success": True,
        "message": f"Welcome Admin {current_user.first_name}! You have enterprise administrative clearance.",
        "role": current_user.role_name
    }

@router.get(
    "/pm-only",
    summary="Project Manager Protected Resource",
    description="Only users with 'project_manager' or 'admin' roles can access."
)
async def pm_only_endpoint(
    current_user: Annotated[UserDocument, Depends(require_roles("admin", "project_manager"))]
):
    return {
        "success": True,
        "message": f"Welcome PM {current_user.first_name}! Jobsite management authorized.",
        "role": current_user.role_name
    }

@router.get(
    "/inspector-only",
    summary="Safety Inspector Protected Resource",
    description="Only users with 'safety_inspector' or 'admin' roles can access."
)
async def inspector_only_endpoint(
    current_user: Annotated[UserDocument, Depends(require_roles("admin", "safety_inspector"))]
):
    return {
        "success": True,
        "message": f"Welcome Inspector {current_user.first_name}! Safety audit and PPE verification authorized.",
        "role": current_user.role_name
    }

@router.get(
    "/worker-profile",
    summary="Worker Protected Resource",
    description="Accessible by workers and admins to review safety training."
)
async def worker_profile_endpoint(
    current_user: Annotated[UserDocument, Depends(require_roles("admin", "worker"))]
):
    return {
        "success": True,
        "message": f"Worker profile active for {current_user.first_name} {current_user.last_name}.",
        "role": current_user.role_name
    }

@router.get(
    "/client-overview",
    summary="Client Protected Resource",
    description="Accessible by clients and admins for safety reporting overview."
)
async def client_overview_endpoint(
    current_user: Annotated[UserDocument, Depends(require_roles("admin", "client"))]
):
    return {
        "success": True,
        "message": f"Client portal view authorized for {current_user.first_name}.",
        "role": current_user.role_name
    }
