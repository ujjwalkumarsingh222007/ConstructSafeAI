from typing import Annotated, List, Callable
from bson import ObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from pymongo.asynchronous.database import AsyncDatabase
from app.database import get_db
from app.core.security import decode_token
from app.models.mongodb import UserDocument

security_scheme = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security_scheme)],
    db: Annotated[AsyncDatabase, Depends(get_db)],
) -> UserDocument:
    """Validate JWT access token and return current active user from MongoDB."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    try:
        payload = decode_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except (jwt.InvalidTokenError, Exception) as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Validate token type
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type: Expected access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id_str = payload.get("sub")
    if not user_id_str or not ObjectId.is_valid(user_id_str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token: Invalid user identifier",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_data = await db.users.find_one({"_id": ObjectId(user_id_str), "deleted_at": None})
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists or has been deactivated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user_data.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Contact an administrator.",
        )

    return UserDocument.model_validate(user_data)

def require_roles(*allowed_roles: str) -> Callable:
    """Enforce backend RBAC by requiring the current user to possess at least one of the allowed roles."""
    async def role_checker(
        current_user: Annotated[UserDocument, Depends(get_current_user)]
    ) -> UserDocument:
        if current_user.role_name not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Role '{current_user.role_name}' is not authorized to access this resource",
            )
        return current_user
    return role_checker

def require_permissions(*required_permissions: str) -> Callable:
    """Enforce backend RBAC by requiring the current user's role to possess all specified permissions."""
    async def permission_checker(
        current_user: Annotated[UserDocument, Depends(get_current_user)],
        db: Annotated[AsyncDatabase, Depends(get_db)]
    ) -> UserDocument:
        # Load permissions for the user's role
        role = await db.roles.find_one({"_id": current_user.role_id})
        if not role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User role definition not found",
            )
        
        user_perms = set(role.get("permission_names", []))
        missing = [p for p in required_permissions if p not in user_perms]
        
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Missing required permission(s): {', '.join(missing)}",
            )
        return current_user
    return permission_checker
