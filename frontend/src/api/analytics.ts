import apiClient from './client';

export interface DashboardKPIs {
  total_projects: number;
  total_workers: number;
  total_hazards: number;
  pending_admin_reviews: number;
  approved_hazards: number;
  rejected_hazards: number;
  action_assigned_hazards: number;
  open_corrective_actions: number;
  completed_corrective_actions: number;
  total_corrective_actions: number;
  capa_closure_rate: number;
  total_incidents: number;
  inspection_pass_rate: number;
  total_inspections: number;
  average_resolution_time_days: number;
}

export interface MonthlyTrendItem {
  month: string;
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  action_assigned: number;
}

export interface DistributionItem {
  name: string;
  count: number;
  percentage?: number;
}

export interface InspectionTrendItem {
  month: string;
  total_inspections: number;
  passed_items: number;
  failed_items: number;
  pass_rate: number;
}

export interface CAPATrendItem {
  month: string;
  opened: number;
  closed: number;
}

export interface ProjectSafetyComparison {
  project_id: string;
  project_name: string;
  project_code: string;
  hazard_count: number;
  incident_count: number;
  inspection_count: number;
  inspection_pass_rate: number;
  open_capa_count: number;
  completed_capa_count: number;
}

export interface DashboardAnalyticsResponse {
  kpis: DashboardKPIs;
  hazard_trends: MonthlyTrendItem[];
  incident_severity_distribution: DistributionItem[];
  hazard_category_distribution: DistributionItem[];
  inspection_pass_fail_trends: InspectionTrendItem[];
  capa_status_distribution: DistributionItem[];
  project_safety_comparison: ProjectSafetyComparison[];
  capa_closure_trends: CAPATrendItem[];
  generated_at: string;
  date_range: string;
  project_id?: string;
}

export const analyticsApi = {
  getDashboard: async (params?: {
    project_id?: string;
    date_range?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<DashboardAnalyticsResponse> => {
    const response = await apiClient.get<DashboardAnalyticsResponse>('/analytics/dashboard', { params });
    return response.data;
  },

  getHazardsAnalytics: async (params?: Record<string, any>) => {
    const response = await apiClient.get('/analytics/hazards', { params });
    return response.data;
  },

  getIncidentsAnalytics: async (params?: Record<string, any>) => {
    const response = await apiClient.get('/analytics/incidents', { params });
    return response.data;
  },

  getInspectionsAnalytics: async (params?: Record<string, any>) => {
    const response = await apiClient.get('/analytics/inspections', { params });
    return response.data;
  },

  getCAPAAnalytics: async (params?: Record<string, any>) => {
    const response = await apiClient.get('/analytics/capa', { params });
    return response.data;
  },

  downloadProjectReportPdf: async (projectId: string, defaultName?: string) => {
    const response = await apiClient.get(`/reports/project/${projectId}/pdf`, {
      responseType: 'blob'
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', defaultName || `Project_Safety_Report_${projectId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  downloadIncidentReportPdf: async (params?: { incident_id?: string; project_id?: string }) => {
    const response = await apiClient.get('/reports/incidents/pdf', {
      params,
      responseType: 'blob'
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Incident_Safety_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  downloadInspectionReportPdf: async (params?: { inspection_id?: string; project_id?: string }) => {
    const response = await apiClient.get('/reports/inspections/pdf', {
      params,
      responseType: 'blob'
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Inspection_Audit_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  downloadCapaReportPdf: async (params?: { action_id?: string; project_id?: string }) => {
    const response = await apiClient.get('/reports/capa/pdf', {
      params,
      responseType: 'blob'
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `CAPA_Closure_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  downloadExportCsv: async (reportType: string, params?: Record<string, string>) => {
    const response = await apiClient.get(`/exports/${reportType}/csv`, {
      params,
      responseType: 'blob'
    });
    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ConstructSafe_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  downloadExportXlsx: async (reportType: string, params?: Record<string, string>) => {
    const response = await apiClient.get(`/exports/${reportType}/xlsx`, {
      params,
      responseType: 'blob'
    });
    const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ConstructSafe_${reportType}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};
