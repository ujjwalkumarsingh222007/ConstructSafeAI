"""ConstructSafe AI - Analytics & Reporting Schemas
Pydantic v2 schemas for executive dashboard KPIs, chart series, and export filters.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class DashboardKPIs(BaseModel):
    total_projects: int = Field(0, description="Total active and managed projects")
    total_workers: int = Field(0, description="Total registered workers across active projects")
    total_hazards: int = Field(0, description="Total hazard reports submitted")
    pending_admin_reviews: int = Field(0, description="Hazard reports pending admin review")
    approved_hazards: int = Field(0, description="Hazard reports approved by admin")
    rejected_hazards: int = Field(0, description="Hazard reports rejected by admin")
    action_assigned_hazards: int = Field(0, description="Hazard reports escalated to CAPA")
    open_corrective_actions: int = Field(0, description="CAPAs in open, in_progress, or pending_verification state")
    completed_corrective_actions: int = Field(0, description="CAPAs completed or verified closed")
    total_corrective_actions: int = Field(0, description="Total CAPAs created")
    capa_closure_rate: float = Field(0.0, description="Percentage of CAPAs resolved/closed")
    total_incidents: int = Field(0, description="Total safety incidents recorded")
    inspection_pass_rate: float = Field(0.0, description="Percentage of scorable checklist items passed")
    total_inspections: int = Field(0, description="Total inspections conducted")
    average_resolution_time_days: float = Field(0.0, description="Average days between CAPA creation and closure")


class MonthlyTrendItem(BaseModel):
    month: str = Field(..., description="YYYY-MM period")
    total: int = 0
    approved: int = 0
    rejected: int = 0
    pending: int = 0
    action_assigned: int = 0


class DistributionItem(BaseModel):
    name: str = Field(..., description="Category or status label")
    count: int = 0
    percentage: Optional[float] = None


class InspectionTrendItem(BaseModel):
    month: str = Field(..., description="YYYY-MM period")
    total_inspections: int = 0
    passed_items: int = 0
    failed_items: int = 0
    pass_rate: float = 0.0


class CAPATrendItem(BaseModel):
    month: str = Field(..., description="YYYY-MM period")
    opened: int = 0
    closed: int = 0


class ProjectSafetyComparison(BaseModel):
    project_id: str
    project_name: str
    project_code: str
    hazard_count: int = 0
    incident_count: int = 0
    inspection_count: int = 0
    inspection_pass_rate: float = 0.0
    open_capa_count: int = 0
    completed_capa_count: int = 0


class DashboardAnalyticsResponse(BaseModel):
    kpis: DashboardKPIs
    hazard_trends: List[MonthlyTrendItem] = Field(default_factory=list)
    incident_severity_distribution: List[DistributionItem] = Field(default_factory=list)
    hazard_category_distribution: List[DistributionItem] = Field(default_factory=list)
    inspection_pass_fail_trends: List[InspectionTrendItem] = Field(default_factory=list)
    capa_status_distribution: List[DistributionItem] = Field(default_factory=list)
    project_safety_comparison: List[ProjectSafetyComparison] = Field(default_factory=list)
    capa_closure_trends: List[CAPATrendItem] = Field(default_factory=list)
    generated_at: datetime
    date_range: str
    project_id: Optional[str] = None


class HazardAnalyticsResponse(BaseModel):
    total_hazards: int = 0
    pending_review: int = 0
    approved: int = 0
    rejected: int = 0
    action_assigned: int = 0
    category_breakdown: List[DistributionItem] = Field(default_factory=list)
    severity_breakdown: List[DistributionItem] = Field(default_factory=list)
    monthly_trends: List[MonthlyTrendItem] = Field(default_factory=list)
    ai_confidence_average: float = 0.0


class IncidentAnalyticsResponse(BaseModel):
    total_incidents: int = 0
    category_breakdown: List[DistributionItem] = Field(default_factory=list)
    severity_breakdown: List[DistributionItem] = Field(default_factory=list)
    status_breakdown: List[DistributionItem] = Field(default_factory=list)
    monthly_trends: List[Dict[str, Any]] = Field(default_factory=list)


class InspectionAnalyticsResponse(BaseModel):
    total_inspections: int = 0
    overall_pass_rate: float = 0.0
    total_items_evaluated: int = 0
    passed_items: int = 0
    failed_items: int = 0
    monthly_trends: List[InspectionTrendItem] = Field(default_factory=list)
    status_breakdown: List[DistributionItem] = Field(default_factory=list)


class CAPAAnalyticsResponse(BaseModel):
    total_capas: int = 0
    open_capas: int = 0
    completed_capas: int = 0
    closure_rate: float = 0.0
    average_resolution_time_days: float = 0.0
    priority_breakdown: List[DistributionItem] = Field(default_factory=list)
    status_breakdown: List[DistributionItem] = Field(default_factory=list)
    monthly_trends: List[CAPATrendItem] = Field(default_factory=list)
