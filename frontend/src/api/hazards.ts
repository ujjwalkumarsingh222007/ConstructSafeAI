import apiClient from './client';

export interface AISuggestedDetection {
  category: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  normalized_bbox?: [number, number, number, number]; // [ymin, xmin, ymax, xmax]
}

export interface AIAnalysisMetadata {
  model_name: string;
  model_version: string;
  is_custom_hazard_model: boolean;
  is_simulated: boolean;
  mode?: string;
  device: string;
  analyzed_at: string;
  raw_detections: AISuggestedDetection[];
  suggested_categories: string[];
  disclaimer?: string;
}

export interface HazardAnalysisResponse {
  photo_url: string;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  width: number;
  height: number;
  ai_analysis: AIAnalysisMetadata;
}

export interface InspectorConfirmation {
  confirmed_by: string;
  inspector_name: string;
  confirmed_categories: string[];
  rejected_ai_categories: string[];
  inspector_comments?: string;
  confirmed_at: string;
}

export interface AdminReview {
  reviewed_by?: string;
  admin_name?: string;
  action?: 'approved' | 'rejected' | 'action_assigned';
  review_comments?: string;
  reviewed_at?: string;
  corrective_action_id?: string;
  corrective_action_number?: string;
}

export interface HazardAuditEntry {
  action: string;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  timestamp: string;
  details?: string;
}

export interface HazardReport {
  id: string;
  report_number: string;
  project_id: string;
  project_code?: string;
  project_name?: string;
  submitted_by: string;
  inspector_name?: string;
  location_details: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  notes?: string;
  photo_url: string;
  thumbnail_url?: string;
  image_metadata: Record<string, any>;
  ai_analysis?: AIAnalysisMetadata;
  inspector_confirmation?: InspectorConfirmation;
  admin_review?: AdminReview;
  corrective_action_id?: string;
  corrective_action_number?: string;
  status: 'pending_admin_review' | 'approved' | 'rejected' | 'action_assigned';
  audit_trail: HazardAuditEntry[];
  created_at: string;
  updated_at: string;
}

export interface HazardReportListResponse {
  items: HazardReport[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface CreateHazardPayload {
  project_id: string;
  location_details: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  notes?: string;
  photo_url: string;
  image_metadata?: Record<string, any>;
  ai_analysis?: AIAnalysisMetadata;
  confirmed_categories: string[];
  rejected_ai_categories: string[];
  inspector_comments?: string;
}

export const analyzeHazardPhoto = async (
  file: File,
  forceDemo: boolean = false
): Promise<HazardAnalysisResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  if (forceDemo) {
    formData.append('force_demo', 'true');
  }

  const response = await apiClient.post<HazardAnalysisResponse>(
    '/hazards/analyze',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000, // 30s timeout for image inference
    }
  );
  return response.data;
};

export const submitHazardReport = async (
  payload: CreateHazardPayload
): Promise<HazardReport> => {
  const response = await apiClient.post<HazardReport>('/hazards', payload);
  return response.data;
};

export const listHazardReports = async (
  params?: {
    page?: number;
    size?: number;
    search?: string;
    status?: string;
    project_id?: string;
    category?: string;
    severity?: string;
  }
): Promise<HazardReportListResponse> => {
  const response = await apiClient.get<HazardReportListResponse>('/hazards', {
    params,
  });
  return response.data;
};

export const getHazardReport = async (id: string): Promise<HazardReport> => {
  const response = await apiClient.get<HazardReport>(`/hazards/${id}`);
  return response.data;
};

export interface ReviewHazardPayload {
  action: 'approve' | 'reject' | 'assign_action';
  review_comments?: string;
  rejection_reason?: string;
  capa?: {
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    assigned_to: string;
    due_date: string;
  };
}

export const reviewHazardReport = async (
  id: string,
  payload: ReviewHazardPayload
): Promise<HazardReport> => {
  const response = await apiClient.patch<HazardReport>(`/hazards/${id}/review`, payload);
  return response.data;
};

export const hazardsApi = {
  listReports: listHazardReports,
  getReport: getHazardReport,
  submitReport: submitHazardReport,
  analyzePhoto: analyzeHazardPhoto,
  reviewReport: reviewHazardReport,
};
