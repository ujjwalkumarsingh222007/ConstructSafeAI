import apiClient from './client';

export interface Assignment {
  id: string;
  project_id: string;
  project_name?: string;
  project_code?: string;
  worker_id?: string;
  worker_name?: string;
  user_id?: string;
  user_name?: string;
  role_in_project: string;
  assigned_at: string;
  assigned_by?: string;
  is_active: boolean;
}

export interface AssignmentListResponse {
  items: Assignment[];
  total: number;
}

export interface AssignmentCreateParams {
  project_id: string;
  worker_id?: string;
  user_id?: string;
  role_in_project: string;
}

export const assignmentsApi = {
  async listAssignments(params?: {
    project_id?: string;
    worker_id?: string;
    user_id?: string;
  }): Promise<AssignmentListResponse> {
    const res = await apiClient.get<AssignmentListResponse>('/assignments', { params });
    return res.data;
  },

  async createAssignment(data: AssignmentCreateParams): Promise<Assignment> {
    const res = await apiClient.post<Assignment>('/assignments', data);
    return res.data;
  },

  async deleteAssignment(id: string): Promise<void> {
    await apiClient.delete(`/assignments/${id}`);
  },
};
