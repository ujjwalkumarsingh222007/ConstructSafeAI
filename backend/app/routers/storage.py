"""ConstructSafe AI - Storage & Evidence Router
Implements secure evidence storage, MIME validation, file signature (magic bytes) verification,
Pillow image decoding validation, strict path traversal defense, and role/project authorization.
"""

import io
import re
import os
import uuid
from pathlib import Path
from typing import Optional, Annotated
from bson import ObjectId
from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Request, status, Depends
from fastapi.responses import FileResponse
from PIL import Image, UnidentifiedImageError
from pymongo.asynchronous.database import AsyncDatabase
from datetime import datetime, timezone

from app.core.config import settings
from app.core.dependencies import get_current_user, get_db
from app.core.security import decode_token
from app.core.rate_limiter import rate_limit_upload
from app.models.mongodb import UserDocument

router = APIRouter(prefix="/storage", tags=["Storage & Evidence"])

# Absolute path to storage/evidence
BASE_STORAGE_DIR = Path(__file__).resolve().parent.parent.parent.parent / "storage" / "evidence"
BASE_STORAGE_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}
ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf"
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

SAFE_FILENAME_REGEX = re.compile(r"^[a-zA-Z0-9_\-\.]+$")


def validate_file_signature_and_content(ext: str, contents: bytes) -> None:
    """
    Validate magic bytes and verify image decoding to defend against
    disguised polyglot payloads, embedded scripts, and corrupted uploads.
    """
    if ext in (".jpg", ".jpeg"):
        if not contents.startswith(b"\xFF\xD8\xFF"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file signature: Content does not match JPEG format."
            )
        try:
            img = Image.open(io.BytesIO(contents))
            img.verify()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Corrupted or invalid JPEG image: {str(e)}"
            )

    elif ext == ".png":
        if not contents.startswith(b"\x89PNG\r\n\x1a\n"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file signature: Content does not match PNG format."
            )
        try:
            img = Image.open(io.BytesIO(contents))
            img.verify()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Corrupted or invalid PNG image: {str(e)}"
            )

    elif ext == ".webp":
        if not (contents[:4] == b"RIFF" and contents[8:12] == b"WEBP"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file signature: Content does not match WebP format."
            )
        try:
            img = Image.open(io.BytesIO(contents))
            img.verify()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Corrupted or invalid WebP image: {str(e)}"
            )

    elif ext == ".pdf":
        if not contents.startswith(b"%PDF-"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file signature: Content does not match PDF format."
            )


@router.post(
    "/upload",
    dependencies=[Depends(rate_limit_upload)],
    summary="Upload Evidence File",
    description="Upload photographic or documentary evidence (max 10MB, JPG/PNG/WebP/PDF) with signature validation."
)
async def upload_evidence(
    file: UploadFile = File(...),
    current_user: UserDocument = Depends(get_current_user),
    db: AsyncDatabase = Depends(get_db)
):
    """Upload a photographic or documentary evidence file with cryptographic signature verification."""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a valid filename"
        )

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension '{ext}'. Allowed types: JPG, PNG, WEBP, PDF."
        )

    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported MIME type '{file.content_type}'"
        )

    # Read content and enforce size boundary
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="File size exceeds maximum allowable limit of 10 MB"
        )

    # Cryptographic magic byte and decoding validation
    validate_file_signature_and_content(ext, contents)

    # Generate secure random filename
    safe_filename = f"{uuid.uuid4().hex}{ext}"
    dest_path = BASE_STORAGE_DIR / safe_filename

    with open(dest_path, "wb") as f:
        f.write(contents)

    relative_url = f"/api/v1/storage/files/{safe_filename}"
    now = datetime.now(timezone.utc)

    # Track evidence ownership in MongoDB
    await db.evidence_files.insert_one({
        "_id": ObjectId(),
        "filename": safe_filename,
        "original_filename": file.filename,
        "size_bytes": len(contents),
        "content_type": file.content_type or f"image/{ext.lstrip('.')}",
        "uploaded_by": current_user.id,
        "created_at": now,
    })

    return {
        "success": True,
        "filename": safe_filename,
        "original_filename": file.filename,
        "size_bytes": len(contents),
        "content_type": file.content_type,
        "url": relative_url,
        "uploaded_by": str(current_user.id)
    }


@router.get("/files/{filename}", summary="Download Evidence File")
async def get_evidence_file(
    filename: str,
    request: Request,
    token: Optional[str] = Query(default=None),
    db: AsyncDatabase = Depends(get_db)
):
    """
    Serve stored evidence photograph or document.
    Enforces path traversal protection and role-scoped project access control.
    """
    # 1. Path traversal defense
    if not SAFE_FILENAME_REGEX.match(filename) or ".." in filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid filename characters detected"
        )

    safe_name = os.path.basename(filename)
    file_path = (BASE_STORAGE_DIR / safe_name).resolve()

    # Prevent symlink and directory escape
    if not file_path.is_relative_to(BASE_STORAGE_DIR.resolve()) or not file_path.exists() or not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requested evidence file was not found"
        )

    # 2. Authentication: Header or Query parameter
    raw_token = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        raw_token = auth_header[7:].strip()
    elif token:
        raw_token = token.strip()

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required to view site evidence."
        )

    try:
        payload = decode_token(raw_token)
        user_oid = ObjectId(payload["sub"])
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token."
        )

    user_data = await db.users.find_one({"_id": user_oid, "deleted_at": None, "is_active": True})
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is deactivated or not found."
        )

    role_name = user_data.get("role_name", "")

    # 3. Authorization check
    # Admins have global evidence clearance
    if role_name in ("admin", "super_admin"):
        pass
    else:
        # Check if user uploaded the file
        evidence_doc = await db.evidence_files.find_one({"filename": safe_name})
        is_owner = evidence_doc and evidence_doc.get("uploaded_by") == user_oid

        if not is_owner:
            assigned_pids = [
                ObjectId(str(p)) for p in user_data.get("assigned_project_ids", [])
                if ObjectId.is_valid(str(p))
            ]

            # Check if referenced in hazards, incidents, or inspections for assigned projects
            hazard_match = await db.hazard_reports.find_one({
                "photo_url": {"$regex": re.escape(safe_name)},
                "project_id": {"$in": assigned_pids},
                "deleted_at": None,
            })
            incident_match = await db.incidents.find_one({
                "evidence_photos": {"$regex": re.escape(safe_name)},
                "project_id": {"$in": assigned_pids},
                "deleted_at": None,
            })
            inspection_match = await db.inspections.find_one({
                "photos": {"$regex": re.escape(safe_name)},
                "project_id": {"$in": assigned_pids},
                "deleted_at": None,
            })

            if not (hazard_match or incident_match or inspection_match):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: You are not authorized to view evidence photographs for this project."
                )

    ext = file_path.suffix.lower()
    media_type = "application/pdf" if ext == ".pdf" else f"image/{ext.lstrip('.')}"
    if ext in (".jpg", ".jpeg"):
        media_type = "image/jpeg"

    return FileResponse(path=file_path, media_type=media_type, filename=safe_name)
