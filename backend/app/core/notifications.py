import logging
from datetime import datetime, timezone
from typing import Optional, List
from bson import ObjectId
from pymongo.asynchronous.database import AsyncDatabase

logger = logging.getLogger("constructsafe.notifications")

async def create_notification(
    db: AsyncDatabase,
    recipient_id: ObjectId,
    title: str,
    message: str,
    type: str = "alert",
    severity: str = "info",
    project_id: Optional[ObjectId] = None,
    link_url: Optional[str] = None
) -> ObjectId:
    """Insert a persisted notification document into the notifications collection."""
    notif_id = ObjectId()
    doc = {
        "_id": notif_id,
        "recipient_id": recipient_id,
        "project_id": project_id,
        "title": title,
        "message": message,
        "type": type,
        "severity": severity,
        "is_read": False,
        "read_at": None,
        "link_url": link_url,
        "created_at": datetime.now(timezone.utc)
    }
    await db.notifications.insert_one(doc)
    logger.info(f"Notification generated for user {recipient_id}: '{title}'")
    return notif_id

async def notify_incident_reported(
    db: AsyncDatabase,
    project_id: ObjectId,
    incident_number: str,
    title: str,
    severity: str
) -> None:
    """Notify assigned Project Managers and Safety Inspectors when a new safety incident is submitted."""
    proj = await db.projects.find_one({"_id": project_id})
    if not proj:
        return

    recipients = set()
    for m in proj.get("manager_ids", []):
        if ObjectId.is_valid(str(m)):
            recipients.add(ObjectId(str(m)))
    for i in proj.get("inspector_ids", []):
        if ObjectId.is_valid(str(i)):
            recipients.add(ObjectId(str(i)))

    # Also notify administrators
    admin_cursor = db.users.find({"role_name": "admin", "deleted_at": None})
    async for a in admin_cursor:
        recipients.add(a["_id"])

    notif_severity = "critical" if severity in ("major_injury", "critical", "fatality") else "warning"
    for r_id in recipients:
        await create_notification(
            db=db,
            recipient_id=r_id,
            project_id=project_id,
            title=f"New Safety Incident: {incident_number}",
            message=f"[{severity.upper()}] {title} reported at {proj.get('name')}.",
            type="incident",
            severity=notif_severity,
            link_url=f"/incidents/{incident_number}"
        )

async def notify_inspection_assigned(
    db: AsyncDatabase,
    inspector_id: ObjectId,
    project_id: ObjectId,
    inspection_number: str,
    title: str
) -> None:
    """Notify the assigned Safety Inspector about an upcoming site audit checklist."""
    proj = await db.projects.find_one({"_id": project_id})
    proj_name = proj.get("name") if proj else "Assigned Jobsite"
    await create_notification(
        db=db,
        recipient_id=inspector_id,
        project_id=project_id,
        title=f"Inspection Assigned: {inspection_number}",
        message=f"You have been assigned to conduct '{title}' at {proj_name}.",
        type="inspection",
        severity="info",
        link_url=f"/inspections/{inspection_number}"
    )

async def notify_corrective_action_assigned(
    db: AsyncDatabase,
    assigned_to: ObjectId,
    project_id: ObjectId,
    action_number: str,
    title: str,
    due_date_str: str
) -> None:
    """Notify responsible user when a corrective action item is issued."""
    await create_notification(
        db=db,
        recipient_id=assigned_to,
        project_id=project_id,
        title=f"Corrective Action Assigned: {action_number}",
        message=f"Action '{title}' assigned to you. Due date: {due_date_str}.",
        type="assignment",
        severity="warning",
        link_url=f"/corrective-actions/{action_number}"
    )

async def notify_action_resolved(
    db: AsyncDatabase,
    project_id: ObjectId,
    action_number: str,
    title: str
) -> None:
    """Notify project manager and inspectors that an action has been marked completed and ready for verification."""
    proj = await db.projects.find_one({"_id": project_id})
    if not proj:
        return

    recipients = set()
    for m in proj.get("manager_ids", []):
        if ObjectId.is_valid(str(m)):
            recipients.add(ObjectId(str(m)))
    for i in proj.get("inspector_ids", []):
        if ObjectId.is_valid(str(i)):
            recipients.add(ObjectId(str(i)))

    for r_id in recipients:
        await create_notification(
            db=db,
            recipient_id=r_id,
            project_id=project_id,
            title=f"Action Completed: {action_number}",
            message=f"Corrective action '{title}' has been submitted for inspector verification.",
            type="assignment",
            severity="info",
            link_url=f"/corrective-actions/{action_number}"
        )

async def notify_hazard_approved(
    db: AsyncDatabase,
    inspector_id: ObjectId,
    project_id: ObjectId,
    report_number: str,
    hazard_id: str,
    category: str
) -> None:
    """Notify submitting inspector that their hazard report has been approved by admin."""
    proj = await db.projects.find_one({"_id": project_id})
    proj_name = proj.get("name") if proj else "Construction Site"
    await create_notification(
        db=db,
        recipient_id=inspector_id,
        project_id=project_id,
        title=f"Hazard Report Approved: {report_number}",
        message=f"Your hazard report {report_number} ({category.replace('_', ' ')}) at {proj_name} has been approved by Administrator.",
        type="hazard",
        severity="info",
        link_url=f"/hazards/{hazard_id}"
    )

async def notify_hazard_rejected(
    db: AsyncDatabase,
    inspector_id: ObjectId,
    project_id: ObjectId,
    report_number: str,
    hazard_id: str,
    rejection_reason: str
) -> None:
    """Notify submitting inspector that their hazard report has been rejected with mandatory rationale."""
    proj = await db.projects.find_one({"_id": project_id})
    proj_name = proj.get("name") if proj else "Construction Site"
    await create_notification(
        db=db,
        recipient_id=inspector_id,
        project_id=project_id,
        title=f"Hazard Report Rejected: {report_number}",
        message=f"Hazard report {report_number} at {proj_name} was rejected. Reason: {rejection_reason}",
        type="hazard",
        severity="warning",
        link_url=f"/hazards/{hazard_id}"
    )

async def notify_hazard_action_assigned(
    db: AsyncDatabase,
    inspector_id: ObjectId,
    project_id: ObjectId,
    report_number: str,
    hazard_id: str,
    action_number: str,
    action_title: str,
    priority: str
) -> None:
    """Notify submitting inspector and assigned Project Managers that a CAPA was issued for the hazard."""
    proj = await db.projects.find_one({"_id": project_id})
    proj_name = proj.get("name") if proj else "Construction Site"

    recipients = {inspector_id}
    if proj:
        for m in proj.get("manager_ids", []):
            if ObjectId.is_valid(str(m)):
                recipients.add(ObjectId(str(m)))

    for r_id in recipients:
        await create_notification(
            db=db,
            recipient_id=r_id,
            project_id=project_id,
            title=f"CAPA Issued for Hazard: {report_number}",
            message=f"Action item {action_number} ('{action_title}', priority: {priority.upper()}) was assigned for hazard {report_number} at {proj_name}.",
            type="hazard",
            severity="warning" if priority in ("high", "critical") else "info",
            link_url=f"/hazards/{hazard_id}"
        )
