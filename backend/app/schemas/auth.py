from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field

class LoginRequest(BaseModel):
    email: EmailStr = Field(..., json_schema_extra={"example": "admin@constructsafe.com"})
    password: str = Field(..., min_length=6, json_schema_extra={"example": "Admin@123456"})

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(description="Access token lifetime in seconds")

class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., description="Valid JWT refresh token")

class UserSummary(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    role_name: str
    phone: Optional[str] = None
    permissions: List[str] = Field(default_factory=list)
    assigned_project_ids: List[str] = Field(default_factory=list)

class LoginResponse(BaseModel):
    success: bool = True
    user: UserSummary
    tokens: TokenResponse

class LogoutResponse(BaseModel):
    success: bool = True
    message: str = "Logged out successfully. Refresh token invalidated."

class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=6, description="Existing password")
    new_password: str = Field(
        ...,
        min_length=8,
        description="New password (min 8 chars, must include uppercase, lowercase, digit, special char)"
    )

class ChangePasswordResponse(BaseModel):
    success: bool = True
    message: str = "Password changed successfully. All active sessions have been revoked."

class UpdateProfileRequest(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=25)

class UpdateProfileResponse(BaseModel):
    success: bool = True
    message: str = "Profile updated successfully."
    user: UserSummary
