import apiClient from './client';

export interface ProjectLocation {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface UserSummary {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role_name: string;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  client_name: string;
  client_id?: string;
  description?: string;
  location: ProjectLocation;
  status: 'planning' | 'active' | 'paused' | 'completed' | 'archived';
  start_date?: string;
  expected_completion_date?: string;
  manager_ids: string[];
  inspector_ids: string[];
  managers: UserSummary[];
  inspectors: UserSummary[];
  worker_count: number;
  safety_target_rate: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectListResponse {
  items: Project[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface ProjectCreateParams {
  name: string;
  code: string;
  client_name: string;
  client_id?: string;
  description?: string;
  location?: ProjectLocation;
  status?: string;
  start_date?: string;
  expected_completion_date?: string;
  manager_ids?: string[];
  inspector_ids?: string[];
  safety_target_rate?: number;
}

export interface ProjectUpdateParams {
  name?: string;
  code?: string;
  client_name?: string;
  client_id?: string;
  description?: string;
  location?: ProjectLocation;
  status?: string;
  start_date?: string;
  expected_completion_date?: string;
  manager_ids?: string[];
  inspector_ids?: string[];
  safety_target_rate?: number;
}

export const projectsApi = {
  async listProjects(params?: {
    page?: number;
    size?: number;
    search?: string;
    status?: string;
  }): Promise<ProjectListResponse> {
    const res = await apiClient.get<ProjectListResponse>('/projects', { params });
    return res.data;
  },

  async getProject(id: string): Promise<Project> {
    const res = await apiClient.get<Project>(`/projects/${id}`);
    return res.data;
  },

  async createProject(data: ProjectCreateParams): Promise<Project> {
    const res = await apiClient.post<Project>('/projects', data);
    return res.data;
  },

  async updateProject(id: string, data: ProjectUpdateParams): Promise<Project> {
    const res = await apiClient.patch<Project>(`/projects/${id}`, data);
    return res.data;
  },

  async deleteProject(id: string): Promise<void> {
    await apiClient.delete(`/projects/${id}`);
  },
};

export const listProjects = projectsApi.listProjects;
export const getProject = projectsApi.getProject;
export const createProject = projectsApi.createProject;
export const updateProject = projectsApi.updateProject;
export const deleteProject = projectsApi.deleteProject;

