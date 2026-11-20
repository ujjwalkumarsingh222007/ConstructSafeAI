"""ConstructSafe AI - Reports & Data Export Router
Implements PDF generation (ReportLab) and tabular exports (CSV & OpenPyXL Excel XLSX)
with strict role-based access control, project scoping, and client confidentiality.
"""

from datetime import datetime, timezone
from typing import Annotated, Optional, Dict, Any, List
from bson import ObjectId

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pymongo import DESCENDING
from pymongo.asynchronous.database import AsyncDatabase

from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.mongodb import UserDocument
from app.services.pdf_report_service import PDFReportService
from app.services.export_service import ExportService
from app.routers.analytics import get_authorized_project_ids, parse_date_filters, validate_object_id
from app.core.rate_limiter import rate_limit_exports

router = APIRouter(tags=["Reports & Data Exports"])


# =============================================================================
# 1. GET /api/v1/reports/project/{project_id}/pdf
# =============================================================================
@router.get(
    "/reports/project/{project_id}/pdf",
    dependencies=[Depends(rate_limit_exports)]
)
async def export_project_safety_report_pdf(
    project_id: str,
    current_user: Annotated[UserDocument, Depends(get_current_user)],
    db: Annotated[AsyncDatabase, Depends(get_db)],
    date_range: Optional[str] = Query(default="all"),
    start_date: Optional[str] = Query(default=None),
    end_date: Optional[str] = Query(default=None)
):
    """
    Generate downloadable Executive Project Safety Audit PDF report.
    Includes project overview, hazard summary, incident records, inspection results, and CAPA progress.
    """
    authorized_proj_ids = await get_authorized_project_ids(current_user, db, project_id)
    p_oid = validate_object_id(project_id, "Project")

    project = await db.projects.find_one({"_id": p_oid, "deleted_at": None})
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

    date_filter = parse_date_filters(date_range, start_date, end_date)
    base_proj_filter: Dict[str, Any] = {"project_id": p_oid, "deleted_at": None}

    # Gather Hazards
    h_filter = dict(base_proj_filter)
    if date_filter:
        h_filter["created_at"] = date_filter
    hazards = [doc async for doc in db.hazard_reports.find(h_filter).sort("created_at", DESCENDING).limit(50)]

    # Gather Incidents
    inc_filter = dict(base_proj_filter)
    if date_filter:
        inc_filter["occurred_at"] = date_filter
    incidents = [doc async for doc in db.incidents.find(inc_filter).sort("occurred_at", DESCENDING).limit(50)]

    # Gather Inspections
    insp_filter = dict(base_proj_filter)
    if date_filter:
        insp_filter["scheduled_date"] = date_filter
    inspections = [doc async for doc in db.inspections.find(insp_filter).sort("scheduled_date", DESCENDING).limit(50)]

    # Gather CAPAs
    capa_filter = dict(base_proj_filter)
    if date_filter:
        capa_filter["created_at"] = date_filter
    capas = [doc async for doc in db.corrective_actions.find(capa_filter).sort("created_at", DESCENDING).limit(50)]

    # Calculate KPIs
    total_hazards = len(hazards)
    total_incidents = len(incidents)
    total_capas = len(capas)
    comp_capas = sum(1 for c in capas if c.get("status") in ("completed", "closed"))
    capa_closure_rate = round((comp_capas / total_capas) * 100.0, 1) if total_capas > 0 else 0.0

    # Inspection pass rate
    scorable_items = 0
    passed_items = 0
    for insp in inspections:
        for it in insp.get("checklist_items", []):
            if it.get("status") in ("pass", "fail"):
                scorable_items += 1
                if it.get("status") == "pass":
                    passed_items += 1
    insp_pass_rate = round((passed_items / scorable_items) * 100.0, 1) if scorable_items > 0 else (100.0 if inspections else 0.0)

    # Resolution time
    res_times = []
    for c in capas:
        if c.get("status") in ("completed", "closed"):
            end_t = c.get("completed_at") or c.get("verified_at")
            start_t = c.get("created_at")
            if end_t and start_t:
                diff_days = (end_t - start_t).total_seconds() / (3600.0 * 24.0)
                if diff_days >= 0:
                    res_times.append(diff_days)
    avg_res_days = round(sum(res_times) / len(res_times), 1) if res_times else 0.0

    kpis = {
        "total_hazards": total_hazards,
        "total_incidents": total_incidents,
        "inspection_pass_rate": insp_pass_rate,
        "capa_closure_rate": capa_closure_rate,
        "average_resolution_time_days": avg_res_days
    }

    conf_label = "CONFIDENTIAL - CLIENT AUDIT" if current_user.role_name == "client" else "CONFIDENTIAL - EXECUTIVE AUDIT"
    gen_by = f"{current_user.first_name} {current_user.last_name} ({current_user.role_name.replace('_', ' ').title()})"

    pdf_bytes = PDFReportService.generate_project_safety_report(
        project=project,
        kpis=kpis,
        hazards=hazards,
        incidents=incidents,
        inspections=inspections,
        capas=capas,
        confidentiality_label=conf_label,
        generated_by=gen_by
    )

    filename = f"Project_Safety_Report_{project.get('code', 'PRJ')}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


# =============================================================================
# 2. GET /api/v1/reports/incidents/pdf
# =============================================================================
@router.get(
    "/reports/incidents/pdf",
    dependencies=[Depends(rate_limit_exports)]
)
async def export_incidents_report_pdf(
    current_user: Annotated[UserDocument, Depends(get_current_user)],
    db: Annotated[AsyncDatabase, Depends(get_db)],
    incident_id: Optional[str] = Query(default=None),
    project_id: Optional[str] = Query(default=None),
    date_range: Optional[str] = Query(default="30d")
):
    """Generate detailed Incident Investigation PDF Report. Redacts witness statements for clients."""
    authorized_proj_ids = await get_authorized_project_ids(current_user, db, project_id)

    query: Dict[str, Any] = {"deleted_at": None}
    if authorized_proj_ids is not None:
        query["project_id"] = {"$in": authorized_proj_ids}

    if incident_id:
        inc_oid = validate_object_id(incident_id, "Incident")
        query["_id"] = inc_oid

    date_filter = parse_date_filters(date_range)
    if date_filter and not incident_id:
        query["occurred_at"] = date_filter

    incident = await db.incidents.find_one(query)
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No incident records found matching criteria.")

    project = await db.projects.find_one({"_id": incident.get("project_id")})
    capas = [
        c async for c in db.corrective_actions.find({
            "source_type": "incident",
            "source_id": incident["_id"],
            "deleted_at": None
        })
    ]

    is_client = (current_user.role_name == "client")
    conf_label = "CLIENT SAFETY BRIEFING" if is_client else "CONFIDENTIAL - SAFETY INVESTIGATION"

    pdf_bytes = PDFReportService.generate_incident_report(
        incident=incident,
        project=project,
        capas=capas,
        is_client=is_client,
        confidentiality_label=conf_label
    )

    filename = f"Incident_Report_{incident.get('incident_number', 'INC')}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


# =============================================================================
# 3. GET /api/v1/reports/inspections/pdf
# =============================================================================
@router.get(
    "/reports/inspections/pdf",
    dependencies=[Depends(rate_limit_exports)]
)
async def export_inspections_report_pdf(
    current_user: Annotated[UserDocument, Depends(get_current_user)],
    db: Annotated[AsyncDatabase, Depends(get_db)],
    inspection_id: Optional[str] = Query(default=None),
    project_id: Optional[str] = Query(default=None),
    date_range: Optional[str] = Query(default="30d")
):
    """Generate Safety Inspection Audit PDF Report with checklist breakdown and overall score."""
    authorized_proj_ids = await get_authorized_project_ids(current_user, db, project_id)

    query: Dict[str, Any] = {"deleted_at": None}
    if authorized_proj_ids is not None:
        query["project_id"] = {"$in": authorized_proj_ids}

    if inspection_id:
        insp_oid = validate_object_id(inspection_id, "Inspection")
        query["_id"] = insp_oid

    date_filter = parse_date_filters(date_range)
    if date_filter and not inspection_id:
        query["scheduled_date"] = date_filter

    inspection = await db.inspections.find_one(query)
    if not inspection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No inspection records found matching criteria.")

    project = await db.projects.find_one({"_id": inspection.get("project_id")})

    pdf_bytes = PDFReportService.generate_inspection_report(
        inspection=inspection,
        project=project,
        confidentiality_label="CONFIDENTIAL - SITE SAFETY AUDIT"
    )

    filename = f"Inspection_Report_{inspection.get('inspection_number', 'INS')}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


# =============================================================================
# 4. GET /api/v1/reports/capa/pdf
# =============================================================================
@router.get(
    "/reports/capa/pdf",
    dependencies=[Depends(rate_limit_exports)]
)
async def export_capa_closure_report_pdf(
    current_user: Annotated[UserDocument, Depends(get_current_user)],
    db: Annotated[AsyncDatabase, Depends(get_db)],
    action_id: Optional[str] = Query(default=None),
    project_id: Optional[str] = Query(default=None)
):
    """Generate formal Corrective Action (CAPA) Closure Audit PDF report."""
    authorized_proj_ids = await get_authorized_project_ids(current_user, db, project_id)

    query: Dict[str, Any] = {"deleted_at": None}
    if authorized_proj_ids is not None:
        query["project_id"] = {"$in": authorized_proj_ids}

    if action_id:
        act_oid = validate_object_id(action_id, "Corrective Action")
        query["_id"] = act_oid

    capa = await db.corrective_actions.find_one(query)
    if not capa:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No corrective action records found matching criteria.")

    project = await db.projects.find_one({"_id": capa.get("project_id")})

    pdf_bytes = PDFReportService.generate_capa_closure_report(
        capa=capa,
        project=project,
        confidentiality_label="CONFIDENTIAL - REMEDIATION AUDIT"
    )

    filename = f"CAPA_Closure_Report_{capa.get('action_number', 'ACT')}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


# =============================================================================
# 5. DATA EXPORTS (CSV & XLSX)
# =============================================================================
async def prepare_export_rows(
    report_type: str,
    current_user: UserDocument,
    db: AsyncDatabase,
    project_id: Optional[str] = None,
    date_range: Optional[str] = "30d",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status_filter: Optional[str] = None,
    severity: Optional[str] = None
) -> Dict[str, Any]:
    """Helper to query and format tabular data for CSV/XLSX export."""
    authorized_proj_ids = await get_authorized_project_ids(current_user, db, project_id)
    date_filter = parse_date_filters(date_range, start_date, end_date)
    is_client = (current_user.role_name == "client")

    # Map project names in memory
    proj_map = {}
    async for p in db.projects.find({}, {"_id": 1, "name": 1, "code": 1}):
        proj_map[str(p["_id"])] = f"{p.get('name', '')} ({p.get('code', '')})"

    # User names in memory
    user_map = {}
    async for u in db.users.find({}, {"_id": 1, "first_name": 1, "last_name": 1}):
        user_map[str(u["_id"])] = f"{u.get('first_name', '')} {u.get('last_name', '')}".strip()

    rows: List[Dict[str, Any]] = []

    if report_type == "hazards":
        q: Dict[str, Any] = {"deleted_at": None}
        if authorized_proj_ids is not None:
            q["project_id"] = {"$in": authorized_proj_ids}
        if date_filter:
            q["created_at"] = date_filter
        if status_filter:
            q["status"] = status_filter
        if severity:
            q["severity"] = severity

        cursor = db.hazard_reports.find(q).sort("created_at", DESCENDING).limit(1000)
        async for doc in cursor:
            rows.append({
                "report_number": doc.get("report_number"),
                "project": proj_map.get(str(doc.get("project_id")), "Unknown"),
                "category": doc.get("category", "").replace("_", " ").title(),
                "severity": doc.get("severity", "").upper(),
                "status": doc.get("status", "").replace("_", " ").title(),
                "location": doc.get("location_details") or "-",
                "inspector": doc.get("inspector_name") or "-",
                "capa_number": doc.get("corrective_action_number") or "-",
                "created_at": doc.get("created_at")
            })

        columns = ["report_number", "project", "category", "severity", "status", "location", "inspector", "capa_number", "created_at"]
        labels = {
            "report_number": "Report #",
            "project": "Project",
            "category": "Hazard Category",
            "severity": "Severity",
            "status": "Review Status",
            "location": "Location Details",
            "inspector": "Inspector",
            "capa_number": "Linked CAPA #",
            "created_at": "Report Date"
        }
        return {"columns": columns, "labels": labels, "rows": rows, "sheet_name": "Hazard Reports"}

    elif report_type == "incidents":
        q: Dict[str, Any] = {"deleted_at": None}
        if authorized_proj_ids is not None:
            q["project_id"] = {"$in": authorized_proj_ids}
        if date_filter:
            q["occurred_at"] = date_filter
        if status_filter:
            q["status"] = status_filter
        if severity:
            q["severity"] = severity

        cursor = db.incidents.find(q).sort("occurred_at", DESCENDING).limit(1000)
        async for doc in cursor:
            rc = (doc.get("investigation") or {}).get("root_cause") or "-"
            rows.append({
                "incident_number": doc.get("incident_number"),
                "project": proj_map.get(str(doc.get("project_id")), "Unknown"),
                "category": doc.get("incident_category", "").replace("_", " ").title(),
                "severity": doc.get("severity", "").replace("_", " ").upper(),
                "title": doc.get("title"),
                "status": doc.get("status", "").replace("_", " ").title(),
                "occurred_at": doc.get("occurred_at"),
                "location": doc.get("location_details") or "-",
                "reporter": user_map.get(str(doc.get("reported_by")), "-") if not is_client else "Confidential",
                "root_cause": rc if not is_client else "-"
            })

        columns = ["incident_number", "project", "category", "severity", "title", "status", "occurred_at", "location", "reporter", "root_cause"]
        labels = {
            "incident_number": "Incident #",
            "project": "Project",
            "category": "Category",
            "severity": "Severity",
            "title": "Title",
            "status": "Investigation Status",
            "occurred_at": "Occurred Date",
            "location": "Location",
            "reporter": "Reported By",
            "root_cause": "Root Cause"
        }
        return {"columns": columns, "labels": labels, "rows": rows, "sheet_name": "Incidents"}

    elif report_type == "inspections":
        q: Dict[str, Any] = {"deleted_at": None}
        if authorized_proj_ids is not None:
            q["project_id"] = {"$in": authorized_proj_ids}
        if date_filter:
            q["scheduled_date"] = date_filter
        if status_filter:
            q["status"] = status_filter

        cursor = db.inspections.find(q).sort("scheduled_date", DESCENDING).limit(1000)
        async for doc in cursor:
            items = doc.get("checklist_items", [])
            tot = len(items)
            passed = sum(1 for it in items if it.get("status") == "pass")
            failed = sum(1 for it in items if it.get("status") == "fail")

            rows.append({
                "inspection_number": doc.get("inspection_number"),
                "project": proj_map.get(str(doc.get("project_id")), "Unknown"),
                "title": doc.get("title"),
                "status": doc.get("status", "").upper(),
                "score": f"{doc.get('overall_score'):.1f}%" if doc.get("overall_score") is not None else "-",
                "total_items": tot,
                "passed_items": passed,
                "failed_items": failed,
                "scheduled_date": doc.get("scheduled_date"),
                "completed_at": doc.get("completed_at")
            })

        columns = ["inspection_number", "project", "title", "status", "score", "total_items", "passed_items", "failed_items", "scheduled_date", "completed_at"]
        labels = {
            "inspection_number": "Inspection #",
            "project": "Project",
            "title": "Inspection Title",
            "status": "Status",
            "score": "Overall Score",
            "total_items": "Total Checklist Items",
            "passed_items": "Passed Items",
            "failed_items": "Failed Items",
            "scheduled_date": "Scheduled Date",
            "completed_at": "Completed At"
        }
        return {"columns": columns, "labels": labels, "rows": rows, "sheet_name": "Inspections"}

    elif report_type == "capa":
        q: Dict[str, Any] = {"deleted_at": None}
        if authorized_proj_ids is not None:
            q["project_id"] = {"$in": authorized_proj_ids}
        if date_filter:
            q["created_at"] = date_filter
        if status_filter:
            q["status"] = status_filter
        if severity:
            q["priority"] = severity

        cursor = db.corrective_actions.find(q).sort("created_at", DESCENDING).limit(1000)
        async for doc in cursor:
            rows.append({
                "action_number": doc.get("action_number"),
                "project": proj_map.get(str(doc.get("project_id")), "Unknown"),
                "title": doc.get("title"),
                "source_type": doc.get("source_type", "").upper(),
                "priority": doc.get("priority", "").upper(),
                "status": doc.get("status", "").replace("_", " ").title(),
                "assignee": user_map.get(str(doc.get("assigned_to")), "-"),
                "due_date": doc.get("due_date"),
                "completed_at": doc.get("completed_at"),
                "verified_at": doc.get("verified_at")
            })

        columns = ["action_number", "project", "title", "source_type", "priority", "status", "assignee", "due_date", "completed_at", "verified_at"]
        labels = {
            "action_number": "Action #",
            "project": "Project",
            "title": "Title",
            "source_type": "Source Type",
            "priority": "Priority",
            "status": "Status",
            "assignee": "Assigned Personnel",
            "due_date": "Due Date",
            "completed_at": "Completed At",
            "verified_at": "Verified At"
        }
        return {"columns": columns, "labels": labels, "rows": rows, "sheet_name": "Corrective Actions"}

    elif report_type == "projects":
        q: Dict[str, Any] = {"deleted_at": None}
        if authorized_proj_ids is not None:
            q["_id"] = {"$in": authorized_proj_ids}
        if status_filter:
            q["status"] = status_filter

        cursor = db.projects.find(q).sort("created_at", DESCENDING).limit(500)
        async for doc in cursor:
            loc = doc.get("location") or {}
            rows.append({
                "code": doc.get("code"),
                "name": doc.get("name"),
                "client_name": doc.get("client_name"),
                "status": doc.get("status", "").upper(),
                "city": loc.get("city", "-"),
                "state": loc.get("state", "-"),
                "safety_target_rate": f"{doc.get('safety_target_rate', 95.0)}%",
                "start_date": doc.get("start_date"),
                "completion_date": doc.get("expected_completion_date")
            })

        columns = ["code", "name", "client_name", "status", "city", "state", "safety_target_rate", "start_date", "completion_date"]
        labels = {
            "code": "Project Code",
            "name": "Project Name",
            "client_name": "Client",
            "status": "Status",
            "city": "City",
            "state": "State",
            "safety_target_rate": "Target Safety Rate",
            "start_date": "Start Date",
            "completion_date": "Expected Completion"
        }
        return {"columns": columns, "labels": labels, "rows": rows, "sheet_name": "Projects"}

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported report type '{report_type}'. Allowed types: hazards, incidents, inspections, capa, projects."
        )


@router.get(
    "/exports/{report_type}/csv",
    dependencies=[Depends(rate_limit_exports)]
)
async def export_data_csv(
    report_type: str,
    current_user: Annotated[UserDocument, Depends(get_current_user)],
    db: Annotated[AsyncDatabase, Depends(get_db)],
    project_id: Optional[str] = Query(default=None),
    date_range: Optional[str] = Query(default="30d"),
    start_date: Optional[str] = Query(default=None),
    end_date: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    severity: Optional[str] = Query(default=None)
):
    """Export filtered dataset in CSV format with UTF-8 encoding and standard delimiters."""
    export_spec = await prepare_export_rows(
        report_type=report_type.lower(),
        current_user=current_user,
        db=db,
        project_id=project_id,
        date_range=date_range,
        start_date=start_date,
        end_date=end_date,
        status_filter=status_filter,
        severity=severity
    )

    csv_data = ExportService.export_csv(
        data=export_spec["rows"],
        columns=export_spec["columns"],
        column_labels=export_spec["labels"]
    )

    filename = f"ConstructSafe_{report_type.title()}_{datetime.now().strftime('%Y%m%d')}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get(
    "/exports/{report_type}/xlsx",
    dependencies=[Depends(rate_limit_exports)]
)
async def export_data_xlsx(
    report_type: str,
    current_user: Annotated[UserDocument, Depends(get_current_user)],
    db: Annotated[AsyncDatabase, Depends(get_db)],
    project_id: Optional[str] = Query(default=None),
    date_range: Optional[str] = Query(default="30d"),
    start_date: Optional[str] = Query(default=None),
    end_date: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    severity: Optional[str] = Query(default=None)
):
    """Export filtered dataset in formatted OpenPyXL Excel (.xlsx) format with styling and auto-width columns."""
    export_spec = await prepare_export_rows(
        report_type=report_type.lower(),
        current_user=current_user,
        db=db,
        project_id=project_id,
        date_range=date_range,
        start_date=start_date,
        end_date=end_date,
        status_filter=status_filter,
        severity=severity
    )

    sheets = {
        export_spec["sheet_name"]: {
            "columns": export_spec["columns"],
            "labels": export_spec["labels"],
            "rows": export_spec["rows"]
        }
    }
    xlsx_bytes = ExportService.export_xlsx(sheets, title=f"ConstructSafe {report_type.title()}")

    filename = f"ConstructSafe_{report_type.title()}_{datetime.now().strftime('%Y%m%d')}.xlsx"
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
