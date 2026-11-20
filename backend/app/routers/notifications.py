from datetime import datetime, timezone
from typing import Annotated, List
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.asynchronous.database import AsyncDatabase

from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.mongodb import UserDocument
from app.schemas.notification import NotificationOut, NotificationListResponse

router = APIRouter(prefix="/notifications", tags=["Notifications"])

def validate_object_id(id_str: str, entity_name: str = "Resource") -> ObjectId:
    if not id_str or not ObjectId.is_valid(id_str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {entity_name} ID format: '{id_str}'"
        )
    return ObjectId(id_str)

@router.get("", response_model=NotificationListResponse)
async def list_user_notifications(
    current_user: Annotated[UserDocument, Depends(get_current_user)],
    db: Annotated[AsyncDatabase, Depends(get_db)]
):
    """Retrieve up to 100 recent notifications for the authenticated user."""
    cursor = db.notifications.find({"recipient_id": current_user.id}).sort("created_at", -1).limit(100)
    items: List[NotificationOut] = []
    unread_count = 0
    async for doc in cursor:
        if not doc.get("is_read", False):
            unread_count += 1
        items.append(NotificationOut(
            id=str(doc["_id"]),
            recipient_id=str(doc["recipient_id"]),
            project_id=str(doc["project_id"]) if doc.get("project_id") else None,
            title=doc.get("title", ""),
            message=doc.get("message", ""),
            type=doc.get("type", "alert"),
            severity=doc.get("severity", "info"),
            is_read=doc.get("is_read", False),
            read_at=doc.get("read_at"),
            link_url=doc.get("link_url"),
            created_at=doc.get("created_at", datetime.now(timezone.utc))
        ))

    return NotificationListResponse(
        items=items,
        unread_count=unread_count,
        total=len(items)
    )

@router.patch("/{notification_id}/read", status_code=status.HTTP_200_OK)
async def mark_notification_as_read(
    notification_id: str,
    current_user: Annotated[UserDocument, Depends(get_current_user)],
    db: Annotated[AsyncDatabase, Depends(get_db)]
):
    """Mark an individual notification as read."""
    n_oid = validate_object_id(notification_id, "Notification")
    now = datetime.now(timezone.utc)
    res = await db.notifications.update_one(
        {"_id": n_oid, "recipient_id": current_user.id},
        {"$set": {"is_read": True, "read_at": now}}
    )
    if res.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found or does not belong to your user account"
        )
    return {"success": True, "id": notification_id, "is_read": True}

@router.patch("/read-all", status_code=status.HTTP_200_OK)
@router.post("/read-all", status_code=status.HTTP_200_OK)
async def mark_all_notifications_as_read(
    current_user: Annotated[UserDocument, Depends(get_current_user)],
    db: Annotated[AsyncDatabase, Depends(get_db)]
):
    """Mark all unread notifications for the current user as read."""
    now = datetime.now(timezone.utc)
    res = await db.notifications.update_many(
        {"recipient_id": current_user.id, "is_read": False},
        {"$set": {"is_read": True, "read_at": now}}
    )
    return {"success": True, "marked_count": res.modified_count}
