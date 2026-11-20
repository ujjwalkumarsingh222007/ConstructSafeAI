"""Base models module for MongoDB document schemas."""
from app.models.objectid import PyObjectId
from app.models.mongodb import (
    MongoBaseModel,
    UserDocument as User,
    RoleDocument as Role,
    PermissionDocument as Permission,
    ProjectDocument as Project,
)

__all__ = ["PyObjectId", "MongoBaseModel", "User", "Role", "Permission", "Project"]
