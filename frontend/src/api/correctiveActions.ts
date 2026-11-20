import apiClient from './client';

export interface CorrectiveAction {
  id: string;
  action_number: string;
  project_id: string;
  project_name?: string;
  project_code?: string;
  source_type: 'inspection' | 'incident' | 'violation' | 'hazard';
  source_id: string;
  source_title?: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigned_to: string;
  assigned_to_name?: string;
  due_date: string;
  completed_at?: string;
  status: 'open' | 'in_progress' | 'pending_verification' | 'completed' | 'overdue' | 'closed';
  resolution_notes?: string;
  completion_evidence: string[];
  verified_by?: string;
  verified_by_name?: string;
  verified_at?: string;
  verification_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CorrectiveActionListResponse {
  items: CorrectiveAction[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface CorrectiveActionCreateParams {
  project_id: string;
  source_type: string;
  source_id: string;
  title: string;
  description: string;
  priority: string;
  assigned_to: string;
  due_date: string;
}

export interface CorrectiveActionUpdateParams {
  title?: string;
  description?: string;
  priority?: string;
  assigned_to?: string;
  due_date?: string;
  status?: string;
  resolution_notes?: string;
  completion_evidence?: string[];
  verification_notes?: string;
}

export const listCorrectiveActions = async (params: {
  page?: number;
  size?: number;
  search?: string;
  status?: string;
  priority?: string;
  project_id?: string;
  assigned_to?: string;
} = {}): Promise<CorrectiveActionListResponse> => {
  const response = await apiClient.get<CorrectiveActionListResponse>('/corrective-actions', { params });
  return response.data;
};

export const getCorrectiveAction = async (id: string): Promise<CorrectiveAction> => {
  const response = await apiClient.get<CorrectiveAction>(`/corrective-actions/${id}`);
  return response.data;
};

export const createCorrectiveAction = async (data: CorrectiveActionCreateParams): Promise<CorrectiveAction> => {
  const response = await apiClient.post<CorrectiveAction>('/corrective-actions', data);
  return response.data;
};

export const updateCorrectiveAction = async (id: string, data: CorrectiveActionUpdateParams): Promise<CorrectiveAction> => {
  const response = await apiClient.patch<CorrectiveAction>(`/corrective-actions/${id}`, data);
  return response.data;
};

export const deleteCorrectiveAction = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.delete<{ success: boolean; message: string }>(`/corrective-actions/${id}`);
  return response.data;
};

export const correctiveActionsApi = {
  list: listCorrectiveActions,
  get: getCorrectiveAction,
  create: createCorrectiveAction,
  update: updateCorrectiveAction,
  delete: deleteCorrectiveAction,
};
