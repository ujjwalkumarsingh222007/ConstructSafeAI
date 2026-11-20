import apiClient from './client';

export interface EmergencyContact {
  name?: string;
  relation?: string;
  phone?: string;
}

export interface TrainingRecord {
  module_title: string;
  completion_date?: string;
  expiry_date?: string;
  passed?: boolean;
  score?: number;
}

export interface ProjectMini {
  id: string;
  name: string;
  code: string;
}

export interface Worker {
  id: string;
  employee_id: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email?: string;
  phone?: string;
  profile_photo?: string;
  designation?: string;
  trade: string;
  contractor_company?: string;
  current_project_id?: string;
  assigned_project_ids: string[];
  assigned_projects: ProjectMini[];
  joining_date?: string;
  emergency_contact?: EmergencyContact;
  status: 'active' | 'on_leave' | 'terminated';
  training_status: 'certified' | 'pending_induction' | 'expired';
  training_records: TrainingRecord[];
  safety_induction_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkerListResponse {
  items: Worker[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface WorkerCreateParams {
  employee_id: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  designation?: string;
  trade: string;
  contractor_company?: string;
  current_project_id?: string;
  assigned_project_ids?: string[];
  joining_date?: string;
  emergency_contact?: EmergencyContact;
  status?: string;
  training_status?: string;
  training_records?: TrainingRecord[];
  safety_induction_completed?: boolean;
}

export interface WorkerUpdateParams {
  employee_id?: string;
  user_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  designation?: string;
  trade?: string;
  contractor_company?: string;
  current_project_id?: string;
  assigned_project_ids?: string[];
  joining_date?: string;
  emergency_contact?: EmergencyContact;
  status?: string;
  training_status?: string;
  training_records?: TrainingRecord[];
  safety_induction_completed?: boolean;
}

export const workersApi = {
  async listWorkers(params?: {
    page?: number;
    size?: number;
    search?: string;
    trade?: string;
    status?: string;
    project_id?: string;
  }): Promise<WorkerListResponse> {
    const res = await apiClient.get<WorkerListResponse>('/workers', { params });
    return res.data;
  },

  async getWorker(id: string): Promise<Worker> {
    const res = await apiClient.get<Worker>(`/workers/${id}`);
    return res.data;
  },

  async getMyWorkerProfile(): Promise<Worker> {
    const res = await apiClient.get<Worker>('/workers/me');
    return res.data;
  },

  async createWorker(data: WorkerCreateParams): Promise<Worker> {
    const res = await apiClient.post<Worker>('/workers', data);
    return res.data;
  },

  async updateWorker(id: string, data: WorkerUpdateParams): Promise<Worker> {
    const res = await apiClient.patch<Worker>(`/workers/${id}`, data);
    return res.data;
  },

  async deleteWorker(id: string): Promise<void> {
    await apiClient.delete(`/workers/${id}`);
  },
};
