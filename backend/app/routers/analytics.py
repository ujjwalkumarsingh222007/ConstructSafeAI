"""ConstructSafe AI - Executive Safety Analytics Router
Implements high-performance MongoDB aggregation pipelines for real-time safety KPIs,
chart trend series, project comparisons, and role-scoped intelligence.
"""

import math
from datetime import datetime, timezone, timedelta
from typing import Annotated, Optional, List, Dict, Any
from bson import ObjectId

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pymongo import ASCENDING, DESCENDING
from pymongo.asynchronous.database import AsyncDatabase

from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.mongodb import UserDocument
from app.schemas.analytics import (
    DashboardAnalyticsResponse,
    DashboardKPIs,
    MonthlyTrendItem,
    DistributionItem,
    InspectionTrendItem,
    CAPATrendItem,
    ProjectSafetyComparison,
    HazardAnalyticsResponse,
    IncidentAnalyticsResponse,
    InspectionAnalyticsResponse,
    CAPAAnalyticsResponse
)

router = APIRouter(prefix="/analytics", tags=["Analytics & Executive Dashboards"])


def validate_object_id(id_str: str, entity_name: str = "Resource") -> ObjectId:
    if not id_str or not ObjectId.is_valid(id_str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {entity_name} ID format: '{id_str}'"
        )
    return ObjectId(id_str)


async def get_authorized_project_ids(
    current_user: UserDocument,
    db: AsyncDatabase,
    requested_project_id: Optional[str] = None
) -> Optional[List[ObjectId]]:
    """
    Returns list of authorized project ObjectIds for the current user, or None if admin.
    Enforces strict backend RBAC:
      - Workers cannot access organization analytics (403).
      - Project Managers / Inspectors / Clients are restricted to assigned projects.
      - Admins / Super Admins have unrestricted access.
    """
    role = current_user.role_name
    if role == "worker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Workers are not authorized to access organization-wide safety analytics."
        )

    if role in ("admin", "super_admin"):
        if requested_project_id:
            p_oid = validate_object_id(requested_project_id, "Project")
            return [p_oid]
        return None

    # Scoped roles: project_manager, safety_inspector, client
    assigned_oids = [
        ObjectId(str(p)) for p in getattr(current_user, "assigned_project_ids", [])
        if ObjectId.is_valid(str(p))
    ]

    query: Dict[str, Any] = {
        "deleted_at": None,
        "$or": [
            {"_id": {"$in": assigned_oids}},
            {"manager_ids": current_user.id},
            {"inspector_ids": current_user.id},
            {"client_id": current_user.id}
        ]
    }
    cursor = db.projects.find(query, {"_id": 1})
    authorized = [doc["_id"] async for doc in cursor]

    if requested_project_id:
        p_oid = validate_object_id(requested_project_id, "Project")
        if p_oid not in authorized:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not authorized to view analytics for this project."
            )
        return [p_oid]

    return authorized


def parse_date_filters(
    date_range: Optional[str] = "30d",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> Dict[str, datetime]:
    """Parse relative range or explicit ISO dates into datetime bounds."""
    now = datetime.now(timezone.utc)
    res: Dict[str, datetime] = {}

    if start_date:
        try:
            res["$gte"] = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        except ValueError:
            try:
                res["$gte"] = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            except ValueError:
                pass

    if end_date:
        try:
            res["$lte"] = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
        except ValueError:
            try:
                res["$lte"] = datetime.strptime(end_date, "%Y-%m-%d").replace(tzinfo=timezone.utc, hour=23, minute=59, second=59)
            except ValueError:
                pass

    if not res.get("$gte") and date_range and date_range != "all":
        if date_range == "7d":
            res["$gte"] = now - timedelta(days=7)
        elif date_range == "30d":
            res["$gte"] = now - timedelta(days=30)
        elif date_range == "90d":
            res["$gte"] = now - timedelta(days=90)
        elif date_range == "1y":
            res["$gte"] = now - timedelta(days=365)

    return res


# =============================================================================
# 1. GET /api/v1/analytics/dashboard - Executive Safety Dashboard
# =============================================================================
@router.get("/dashboard", response_model=DashboardAnalyticsResponse)
async def get_dashboard_analytics(
    current_user: Annotated[UserDocument, Depends(get_current_user)],
    db: Annotated[AsyncDatabase, Depends(get_db)],
    project_id: Optional[str] = Query(default=None, description="Optional project filter"),
    date_range: Optional[str] = Query(default="30d", description="7d, 30d, 90d, 1y, all"),
    start_date: Optional[str] = Query(default=None),
    end_date: Optional[str] = Query(default=None)
):
    """
    Get executive safety dashboard metrics, real calculated KPIs, and Recharts series.
    All data is computed dynamically using MongoDB aggregation pipelines.
    """
    authorized_proj_ids = await get_authorized_project_ids(current_user, db, project_id)
    date_filter = parse_date_filters(date_range, start_date, end_date)

    # Base match filters
    proj_match: Dict[str, Any] = {"deleted_at": None}
    if authorized_proj_ids is not None:
        proj_match["_id"] = {"$in": authorized_proj_ids}

    # Worker filter
    worker_match: Dict[str, Any] = {"deleted_at": None}
    if authorized_proj_ids is not None:
        worker_match["$or"] = [
            {"current_project_id": {"$in": authorized_proj_ids}},
            {"assigned_project_ids": {"$in": authorized_proj_ids}}
        ]

    # Hazard match filter
    hazard_match: Dict[str, Any] = {"deleted_at": None}
    if authorized_proj_ids is not None:
        hazard_match["project_id"] = {"$in": authorized_proj_ids}
    if date_filter:
        hazard_match["created_at"] = date_filter

    # Incident match filter
    incident_match: Dict[str, Any] = {"deleted_at": None}
    if authorized_proj_ids is not None:
        incident_match["project_id"] = {"$in": authorized_proj_ids}
    if date_filter:
        incident_match["occurred_at"] = date_filter

    # Inspection match filter
    insp_match: Dict[str, Any] = {"deleted_at": None}
    if authorized_proj_ids is not None:
        insp_match["project_id"] = {"$in": authorized_proj_ids}
    if date_filter:
        insp_match["scheduled_date"] = date_filter

    # Corrective action match filter
    capa_match: Dict[str, Any] = {"deleted_at": None}
    if authorized_proj_ids is not None:
        capa_match["project_id"] = {"$in": authorized_proj_ids}
    if date_filter:
        capa_match["created_at"] = date_filter

    # --- KPI CALCULATIONS ---
    total_projects = await db.projects.count_documents(proj_match)
    total_workers = await db.workers.count_documents(worker_match)
    total_hazards = await db.hazard_reports.count_documents(hazard_match)
    pending_admin_reviews = await db.hazard_reports.count_documents({
        **hazard_match,
        "status": {"$in": ["pending_admin_review", "submitted", "under_review"]}
    })
    approved_hazards = await db.hazard_reports.count_documents({**hazard_match, "status": "approved"})
    rejected_hazards = await db.hazard_reports.count_documents({**hazard_match, "status": "rejected"})
    action_assigned_hazards = await db.hazard_reports.count_documents({**hazard_match, "status": "action_assigned"})

    open_capas = await db.corrective_actions.count_documents({
        **capa_match,
        "status": {"$in": ["open", "in_progress", "pending_verification"]}
    })
    completed_capas = await db.corrective_actions.count_documents({
        **capa_match,
        "status": {"$in": ["completed", "closed"]}
    })
    total_capas = await db.corrective_actions.count_documents(capa_match)
    capa_closure_rate = round((completed_capas / total_capas) * 100.0, 1) if total_capas > 0 else 0.0

    total_incidents = await db.incidents.count_documents(incident_match)
    total_inspections = await db.inspections.count_documents(insp_match)

    # Inspection pass rate aggregation: scorable checklist items
    pass_rate_pipe = [
        {"$match": insp_match},
        {"$unwind": "$checklist_items"},
        {"$match": {"checklist_items.status": {"$in": ["pass", "fail"]}}},
        {"$group": {
            "_id": None,
            "total_scorable": {"$sum": 1},
            "total_passed": {"$sum": {"$cond": [{"$eq": ["$checklist_items.status", "pass"]}, 1, 0]}}
        }}
    ]
    pass_cursor = await db.inspections.aggregate(pass_rate_pipe)
    pass_docs = [d async for d in pass_cursor]
    if pass_docs and pass_docs[0]["total_scorable"] > 0:
        insp_pass_rate = round((pass_docs[0]["total_passed"] / pass_docs[0]["total_scorable"]) * 100.0, 1)
    else:
        insp_pass_rate = 100.0 if total_inspections > 0 else 0.0

    # Average resolution time (days) for completed CAPAs
    res_time_pipe = [
        {
            "$match": {
                **capa_match,
                "status": {"$in": ["completed", "closed"]},
                "$or": [
                    {"completed_at": {"$ne": None}},
                    {"verified_at": {"$ne": None}}
                ]
            }
        },
        {
            "$project": {
                "res_ms": {
                    "$subtract": [
                        {"$ifNull": ["$completed_at", "$verified_at"]},
                        "$created_at"
                    ]
                }
            }
        },
        {
            "$group": {
                "_id": None,
                "avg_res_ms": {"$avg": "$res_ms"}
            }
        }
    ]
    res_cursor = await db.corrective_actions.aggregate(res_time_pipe)
    res_docs = [d async for d in res_cursor]
    if res_docs and res_docs[0].get("avg_res_ms") is not None:
        avg_res_days = round(res_docs[0]["avg_res_ms"] / (1000.0 * 3600.0 * 24.0), 1)
        if avg_res_days < 0:
            avg_res_days = 0.0
    else:
        avg_res_days = 0.0

    kpis = DashboardKPIs(
        total_projects=total_projects,
        total_workers=total_workers,
        total_hazards=total_hazards,
        pending_admin_reviews=pending_admin_reviews,
        approved_hazards=approved_hazards,
        rejected_hazards=rejected_hazards,
        action_assigned_hazards=action_assigned_hazards,
        open_corrective_actions=open_capas,
        completed_corrective_actions=completed_capas,
        total_corrective_actions=total_capas,
        capa_closure_rate=capa_closure_rate,
        total_incidents=total_incidents,
        inspection_pass_rate=insp_pass_rate,
        total_inspections=total_inspections,
        average_resolution_time_days=avg_res_days
    )

    # --- CHARTS & VISUALIZATIONS ---

    # 1. Monthly Hazard Reporting Trends
    hazard_trend_pipe = [
        {"$match": hazard_match},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m", "date": "$created_at"}},
            "total": {"$sum": 1},
            "approved": {"$sum": {"$cond": [{"$eq": ["$status", "approved"]}, 1, 0]}},
            "rejected": {"$sum": {"$cond": [{"$eq": ["$status", "rejected"]}, 1, 0]}},
            "pending": {"$sum": {"$cond": [{"$in": ["$status", ["pending_admin_review", "submitted", "under_review"]]}, 1, 0]}},
            "action_assigned": {"$sum": {"$cond": [{"$eq": ["$status", "action_assigned"]}, 1, 0]}}
        }},
        {"$sort": {"_id": 1}}
    ]
    hazard_cursor = await db.hazard_reports.aggregate(hazard_trend_pipe)
    hazard_trends = [
        MonthlyTrendItem(
            month=doc["_id"] or "Unknown",
            total=doc["total"],
            approved=doc["approved"],
            rejected=doc["rejected"],
            pending=doc["pending"],
            action_assigned=doc["action_assigned"]
        )
        async for doc in hazard_cursor
    ]

    # 2. Incident Severity Distribution
    inc_sev_pipe = [
        {"$match": incident_match},
        {"$group": {"_id": "$severity", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    inc_sev_cursor = await db.incidents.aggregate(inc_sev_pipe)
    incident_severity_distribution = [
        DistributionItem(
            name=(doc["_id"] or "unspecified").replace("_", " ").title(),
            count=doc["count"]
        )
        async for doc in inc_sev_cursor
    ]

    # 3. Hazard Category Distribution
    haz_cat_pipe = [
        {"$match": hazard_match},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    haz_cat_cursor = await db.hazard_reports.aggregate(haz_cat_pipe)
    hazard_category_distribution = [
        DistributionItem(
            name=(doc["_id"] or "general").replace("_", " ").title(),
            count=doc["count"]
        )
        async for doc in haz_cat_cursor
    ]

    # 4. Inspection Pass/Fail Trends
    insp_trend_pipe = [
        {"$match": insp_match},
        {"$unwind": "$checklist_items"},
        {"$match": {"checklist_items.status": {"$in": ["pass", "fail"]}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m", "date": "$scheduled_date"}},
            "total_items": {"$sum": 1},
            "passed_items": {"$sum": {"$cond": [{"$eq": ["$checklist_items.status", "pass"]}, 1, 0]}},
            "failed_items": {"$sum": {"$cond": [{"$eq": ["$checklist_items.status", "fail"]}, 1, 0]}}
        }},
        {"$sort": {"_id": 1}}
    ]
    insp_trend_cursor = await db.inspections.aggregate(insp_trend_pipe)
    inspection_pass_fail_trends = []
    async for doc in insp_trend_cursor:
        tot = doc["total_items"]
        pas = doc["passed_items"]
        pr = round((pas / tot) * 100.0, 1) if tot > 0 else 100.0
        inspection_pass_fail_trends.append(InspectionTrendItem(
            month=doc["_id"] or "Unknown",
            total_inspections=tot,
            passed_items=pas,
            failed_items=doc["failed_items"],
            pass_rate=pr
        ))

    # 5. CAPA Status Distribution
    capa_stat_pipe = [
        {"$match": capa_match},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    capa_stat_cursor = await db.corrective_actions.aggregate(capa_stat_pipe)
    capa_status_distribution = [
        DistributionItem(
            name=(doc["_id"] or "open").replace("_", " ").title(),
            count=doc["count"]
        )
        async for doc in capa_stat_cursor
    ]

    # 6. Monthly CAPA Closure Trends (Opened vs Closed)
    capa_trend_pipe = [
        {"$match": capa_match},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m", "date": "$created_at"}},
            "opened": {"$sum": 1},
            "closed": {"$sum": {"$cond": [{"$in": ["$status", ["completed", "closed"]]}, 1, 0]}}
        }},
        {"$sort": {"_id": 1}}
    ]
    capa_trend_cursor = await db.corrective_actions.aggregate(capa_trend_pipe)
    capa_closure_trends = [
        CAPATrendItem(
            month=doc["_id"] or "Unknown",
            opened=doc["opened"],
            closed=doc["closed"]
        )
        async for doc in capa_trend_cursor
    ]

    # 7. Project-wise Safety Comparison (Top 10 projects)
    project_safety_comparison: List[ProjectSafetyComparison] = []
    proj_cursor = db.projects.find(proj_match).limit(10)
    async for p_doc in proj_cursor:
        p_oid = p_doc["_id"]
        h_cnt = await db.hazard_reports.count_documents({"project_id": p_oid, "deleted_at": None})
        inc_cnt = await db.incidents.count_documents({"project_id": p_oid, "deleted_at": None})
        insp_cnt = await db.inspections.count_documents({"project_id": p_oid, "deleted_at": None})
        open_c = await db.corrective_actions.count_documents({
            "project_id": p_oid,
            "status": {"$in": ["open", "in_progress", "pending_verification"]},
            "deleted_at": None
        })
        comp_c = await db.corrective_actions.count_documents({
            "project_id": p_oid,
            "status": {"$in": ["completed", "closed"]},
            "deleted_at": None
        })

        # Single project pass rate
        p_insp_pipe = [
            {"$match": {"project_id": p_oid, "deleted_at": None}},
            {"$unwind": "$checklist_items"},
            {"$match": {"checklist_items.status": {"$in": ["pass", "fail"]}}},
            {"$group": {
                "_id": None,
                "total": {"$sum": 1},
                "passed": {"$sum": {"$cond": [{"$eq": ["$checklist_items.status", "pass"]}, 1, 0]}}
            }}
        ]
        p_insp_cur = await db.inspections.aggregate(p_insp_pipe)
        p_insp_docs = [d async for d in p_insp_cur]
        if p_insp_docs and p_insp_docs[0]["total"] > 0:
            p_rate = round((p_insp_docs[0]["passed"] / p_insp_docs[0]["total"]) * 100.0, 1)
        else:
            p_rate = 100.0 if insp_cnt > 0 else 0.0

        project_safety_comparison.append(ProjectSafetyComparison(
            project_id=str(p_oid),
            project_name=p_doc.get("name", "Project"),
            project_code=p_doc.get("code", "PRJ"),
            hazard_count=h_cnt,
            incident_count=inc_cnt,
            inspection_count=insp_cnt,
            inspection_pass_rate=p_rate,
            open_capa_count=open_c,
            completed_capa_count=comp_c
        ))

    return DashboardAnalyticsResponse(
        kpis=kpis,
        hazard_trends=hazard_trends,
        incident_severity_distribution=incident_severity_distribution,
        hazard_category_distribution=hazard_category_distribution,
        inspection_pass_fail_trends=inspection_pass_fail_trends,
        capa_status_distribution=capa_status_distribution,
        project_safety_comparison=project_safety_comparison,
        capa_closure_trends=capa_closure_trends,
        generated_at=datetime.now(timezone.utc),
        date_range=date_range or "30d",
        project_id=project_id
    )


# =============================================================================
# 2. GET /api/v1/analytics/hazards - Hazard Deep Dive
# =============================================================================
@router.get("/hazards", response_model=HazardAnalyticsResponse)
async def get_hazard_analytics(
    current_user: Annotated[UserDocument, Depends(get_current_user)],
    db: Annotated[AsyncDatabase, Depends(get_db)],
    project_id: Optional[str] = Query(default=None),
    date_range: Optional[str] = Query(default="30d")
):
    """Deep-dive hazard analytics: category distribution, severity breakdown, and AI confidence."""
    authorized_proj_ids = await get_authorized_project_ids(current_user, db, project_id)
    date_filter = parse_date_filters(date_range)

    hazard_match: Dict[str, Any] = {"deleted_at": None}
    if authorized_proj_ids is not None:
        hazard_match["project_id"] = {"$in": authorized_proj_ids}
    if date_filter:
        hazard_match["created_at"] = date_filter

    total = await db.hazard_reports.count_documents(hazard_match)
    pending = await db.hazard_reports.count_documents({
        **hazard_match,
        "status": {"$in": ["pending_admin_review", "submitted", "under_review"]}
    })
    approved = await db.hazard_reports.count_documents({**hazard_match, "status": "approved"})
    rejected = await db.hazard_reports.count_documents({**hazard_match, "status": "rejected"})
    action_assigned = await db.hazard_reports.count_documents({**hazard_match, "status": "action_assigned"})

    # Categories
    cat_cursor = await db.hazard_reports.aggregate([
        {"$match": hazard_match},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ])
    category_breakdown = [
        DistributionItem(
            name=(d["_id"] or "unspecified").replace("_", " ").title(),
            count=d["count"],
            percentage=round((d["count"] / total) * 100.0, 1) if total > 0 else 0.0
        )
        async for d in cat_cursor
    ]

    # Severities
    sev_cursor = await db.hazard_reports.aggregate([
        {"$match": hazard_match},
        {"$group": {"_id": "$severity", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ])
    severity_breakdown = [
        DistributionItem(
            name=(d["_id"] or "unspecified").replace("_", " ").title(),
            count=d["count"],
            percentage=round((d["count"] / total) * 100.0, 1) if total > 0 else 0.0
        )
        async for d in sev_cursor
    ]

    # Monthly trends
    trends_cursor = await db.hazard_reports.aggregate([
        {"$match": hazard_match},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m", "date": "$created_at"}},
            "total": {"$sum": 1},
            "approved": {"$sum": {"$cond": [{"$eq": ["$status", "approved"]}, 1, 0]}},
            "rejected": {"$sum": {"$cond": [{"$eq": ["$status", "rejected"]}, 1, 0]}},
            "pending": {"$sum": {"$cond": [{"$in": ["$status", ["pending_admin_review", "submitted", "under_review"]]}, 1, 0]}},
            "action_assigned": {"$sum": {"$cond": [{"$eq": ["$status", "action_assigned"]}, 1, 0]}}
        }},
        {"$sort": {"_id": 1}}
    ])
    monthly_trends = [
        MonthlyTrendItem(
            month=d["_id"] or "Unknown",
            total=d["total"],
            approved=d["approved"],
            rejected=d["rejected"],
            pending=d["pending"],
            action_assigned=d["action_assigned"]
        )
        async for d in trends_cursor
    ]

    # AI confidence avg
    conf_cursor = await db.hazard_reports.aggregate([
        {"$match": {**hazard_match, "ai_analysis.suggested_detections": {"$exists": True}}},
        {"$unwind": "$ai_analysis.suggested_detections"},
        {"$group": {"_id": None, "avg_conf": {"$avg": "$ai_analysis.suggested_detections.confidence"}}}
    ])
    conf_docs = [d async for d in conf_cursor]
    avg_conf = round(conf_docs[0]["avg_conf"] * 100.0, 1) if conf_docs and conf_docs[0].get("avg_conf") is not None else 0.0

    return HazardAnalyticsResponse(
        total_hazards=total,
        pending_review=pending,
        approved=approved,
        rejected=rejected,
        action_assigned=action_assigned,
        category_breakdown=category_breakdown,
        severity_breakdown=severity_breakdown,
        monthly_trends=monthly_trends,
        ai_confidence_average=avg_conf
    )


# =============================================================================
# 3. GET /api/v1/analytics/incidents - Incident Intelligence
# =============================================================================
@router.get("/incidents", response_model=IncidentAnalyticsResponse)
async def get_incident_analytics(
    current_user: Annotated[UserDocument, Depends(get_current_user)],
    db: Annotated[AsyncDatabase, Depends(get_db)],
    project_id: Optional[str] = Query(default=None),
    date_range: Optional[str] = Query(default="30d")
):
    """Deep-dive incident analytics by category, severity, status, and monthly occurrences."""
    authorized_proj_ids = await get_authorized_project_ids(current_user, db, project_id)
    date_filter = parse_date_filters(date_range)

    incident_match: Dict[str, Any] = {"deleted_at": None}
    if authorized_proj_ids is not None:
        incident_match["project_id"] = {"$in": authorized_proj_ids}
    if date_filter:
        incident_match["occurred_at"] = date_filter

    total = await db.incidents.count_documents(incident_match)

    cat_cursor = await db.incidents.aggregate([
        {"$match": incident_match},
        {"$group": {"_id": "$incident_category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ])
    category_breakdown = [
        DistributionItem(name=(d["_id"] or "other").replace("_", " ").title(), count=d["count"])
        async for d in cat_cursor
    ]

    sev_cursor = await db.incidents.aggregate([
        {"$match": incident_match},
        {"$group": {"_id": "$severity", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ])
    severity_breakdown = [
        DistributionItem(name=(d["_id"] or "other").replace("_", " ").title(), count=d["count"])
        async for d in sev_cursor
    ]

    stat_cursor = await db.incidents.aggregate([
        {"$match": incident_match},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ])
    status_breakdown = [
        DistributionItem(name=(d["_id"] or "reported").replace("_", " ").title(), count=d["count"])
        async for d in stat_cursor
    ]

    trends_cursor = await db.incidents.aggregate([
        {"$match": incident_match},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m", "date": "$occurred_at"}},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ])
    monthly_trends = [{"month": d["_id"], "count": d["count"]} async for d in trends_cursor]

    return IncidentAnalyticsResponse(
        total_incidents=total,
        category_breakdown=category_breakdown,
        severity_breakdown=severity_breakdown,
        status_breakdown=status_breakdown,
        monthly_trends=monthly_trends
    )


# =============================================================================
# 4. GET /api/v1/analytics/inspections - Safety Audit Performance
# =============================================================================
@router.get("/inspections", response_model=InspectionAnalyticsResponse)
async def get_inspection_analytics(
    current_user: Annotated[UserDocument, Depends(get_current_user)],
    db: Annotated[AsyncDatabase, Depends(get_db)],
    project_id: Optional[str] = Query(default=None),
    date_range: Optional[str] = Query(default="30d")
):
    """Detailed inspection pass rates, scorable items breakdown, and trend analysis."""
    authorized_proj_ids = await get_authorized_project_ids(current_user, db, project_id)
    date_filter = parse_date_filters(date_range)

    insp_match: Dict[str, Any] = {"deleted_at": None}
    if authorized_proj_ids is not None:
        insp_match["project_id"] = {"$in": authorized_proj_ids}
    if date_filter:
        insp_match["scheduled_date"] = date_filter

    total = await db.inspections.count_documents(insp_match)

    pass_cursor = await db.inspections.aggregate([
        {"$match": insp_match},
        {"$unwind": "$checklist_items"},
        {"$match": {"checklist_items.status": {"$in": ["pass", "fail"]}}},
        {"$group": {
            "_id": None,
            "total_scorable": {"$sum": 1},
            "passed": {"$sum": {"$cond": [{"$eq": ["$checklist_items.status", "pass"]}, 1, 0]}},
            "failed": {"$sum": {"$cond": [{"$eq": ["$checklist_items.status", "fail"]}, 1, 0]}}
        }}
    ])
    pass_docs = [d async for d in pass_cursor]
    if pass_docs and pass_docs[0]["total_scorable"] > 0:
        tot_scorable = pass_docs[0]["total_scorable"]
        passed = pass_docs[0]["passed"]
        failed = pass_docs[0]["failed"]
        pass_rate = round((passed / tot_scorable) * 100.0, 1)
    else:
        tot_scorable, passed, failed = 0, 0, 0
        pass_rate = 100.0 if total > 0 else 0.0

    stat_cursor = await db.inspections.aggregate([
        {"$match": insp_match},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ])
    status_breakdown = [
        DistributionItem(name=(d["_id"] or "scheduled").replace("_", " ").title(), count=d["count"])
        async for d in stat_cursor
    ]

    trends_cursor = await db.inspections.aggregate([
        {"$match": insp_match},
        {"$unwind": "$checklist_items"},
        {"$match": {"checklist_items.status": {"$in": ["pass", "fail"]}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m", "date": "$scheduled_date"}},
            "total_items": {"$sum": 1},
            "passed_items": {"$sum": {"$cond": [{"$eq": ["$checklist_items.status", "pass"]}, 1, 0]}},
            "failed_items": {"$sum": {"$cond": [{"$eq": ["$checklist_items.status", "fail"]}, 1, 0]}}
        }},
        {"$sort": {"_id": 1}}
    ])
    monthly_trends = []
    async for d in trends_cursor:
        t = d["total_items"]
        p = d["passed_items"]
        pr = round((p / t) * 100.0, 1) if t > 0 else 100.0
        monthly_trends.append(InspectionTrendItem(
            month=d["_id"] or "Unknown",
            total_inspections=t,
            passed_items=p,
            failed_items=d["failed_items"],
            pass_rate=pr
        ))

    return InspectionAnalyticsResponse(
        total_inspections=total,
        overall_pass_rate=pass_rate,
        total_items_evaluated=tot_scorable,
        passed_items=passed,
        failed_items=failed,
        monthly_trends=monthly_trends,
        status_breakdown=status_breakdown
    )


# =============================================================================
# 5. GET /api/v1/analytics/capa - Corrective & Preventive Action Analytics
# =============================================================================
@router.get("/capa", response_model=CAPAAnalyticsResponse)
async def get_capa_analytics(
    current_user: Annotated[UserDocument, Depends(get_current_user)],
    db: Annotated[AsyncDatabase, Depends(get_db)],
    project_id: Optional[str] = Query(default=None),
    date_range: Optional[str] = Query(default="30d")
):
    """CAPA resolution statistics, priority distribution, and closure rates."""
    authorized_proj_ids = await get_authorized_project_ids(current_user, db, project_id)
    date_filter = parse_date_filters(date_range)

    capa_match: Dict[str, Any] = {"deleted_at": None}
    if authorized_proj_ids is not None:
        capa_match["project_id"] = {"$in": authorized_proj_ids}
    if date_filter:
        capa_match["created_at"] = date_filter

    total = await db.corrective_actions.count_documents(capa_match)
    open_c = await db.corrective_actions.count_documents({
        **capa_match,
        "status": {"$in": ["open", "in_progress", "pending_verification"]}
    })
    comp_c = await db.corrective_actions.count_documents({
        **capa_match,
        "status": {"$in": ["completed", "closed"]}
    })
    closure_rate = round((comp_c / total) * 100.0, 1) if total > 0 else 0.0

    # Resolution time
    res_cursor = await db.corrective_actions.aggregate([
        {
            "$match": {
                **capa_match,
                "status": {"$in": ["completed", "closed"]},
                "$or": [{"completed_at": {"$ne": None}}, {"verified_at": {"$ne": None}}]
            }
        },
        {
            "$project": {
                "res_ms": {
                    "$subtract": [
                        {"$ifNull": ["$completed_at", "$verified_at"]},
                        "$created_at"
                    ]
                }
            }
        },
        {"$group": {"_id": None, "avg_ms": {"$avg": "$res_ms"}}}
    ])
    res_docs = [d async for d in res_cursor]
    if res_docs and res_docs[0].get("avg_ms") is not None:
        avg_res_days = round(res_docs[0]["avg_ms"] / (1000.0 * 3600.0 * 24.0), 1)
        if avg_res_days < 0:
            avg_res_days = 0.0
    else:
        avg_res_days = 0.0

    prio_cursor = await db.corrective_actions.aggregate([
        {"$match": capa_match},
        {"$group": {"_id": "$priority", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ])
    priority_breakdown = [
        DistributionItem(name=(d["_id"] or "medium").upper(), count=d["count"])
        async for d in prio_cursor
    ]

    stat_cursor = await db.corrective_actions.aggregate([
        {"$match": capa_match},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ])
    status_breakdown = [
        DistributionItem(name=(d["_id"] or "open").replace("_", " ").title(), count=d["count"])
        async for d in stat_cursor
    ]

    trend_cursor = await db.corrective_actions.aggregate([
        {"$match": capa_match},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m", "date": "$created_at"}},
            "opened": {"$sum": 1},
            "closed": {"$sum": {"$cond": [{"$in": ["$status", ["completed", "closed"]]}, 1, 0]}}
        }},
        {"$sort": {"_id": 1}}
    ])
    monthly_trends = [
        CAPATrendItem(month=d["_id"] or "Unknown", opened=d["opened"], closed=d["closed"])
        async for d in trend_cursor
    ]

    return CAPAAnalyticsResponse(
        total_capas=total,
        open_capas=open_c,
        completed_capas=comp_c,
        closure_rate=closure_rate,
        average_resolution_time_days=avg_res_days,
        priority_breakdown=priority_breakdown,
        status_breakdown=status_breakdown,
        monthly_trends=monthly_trends
    )
