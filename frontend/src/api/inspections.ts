import apiClient from './client';

export interface InspectionItem {
  item_id: string;
  category: string;
  description: string;
  status: 'pass' | 'fail' | 'na';
  passed: boolean;
  notes?: string;
  photos: string[];
}

export interface Inspection {
  id: string;
  inspection_number: string;
  title: string;
  project_id: string;
  project_name?: string;
  project_code?: string;
  inspector_id: string;
  inspector_name?: string;
  scheduled_date: string;
  completed_at?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'failed';
  checklist_items: InspectionItem[];
  overall_score: number;
  notes?: string;
  photographs: string[];
  created_at: string;
  updated_at: string;
}

export interface InspectionListResponse {
  items: Inspection[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface InspectionCreateParams {
  project_id: string;
  title: string;
  scheduled_date?: string;
  inspector_id?: string;
  notes?: string;
  checklist_items: InspectionItem[];
  photographs?: string[];
}

export interface InspectionUpdateParams {
  title?: string;
  scheduled_date?: string;
  inspector_id?: string;
  notes?: string;
  status?: string;
  checklist_items?: InspectionItem[];
  photographs?: string[];
}

export const listInspections = async (params: {
  page?: number;
  size?: number;
  search?: string;
  status?: string;
  project_id?: string;
  inspector_id?: string;
} = {}): Promise<InspectionListResponse> => {
  const response = await apiClient.get<InspectionListResponse>('/inspections', { params });
  return response.data;
};

export const getInspection = async (id: string): Promise<Inspection> => {
  const response = await apiClient.get<Inspection>(`/inspections/${id}`);
  return response.data;
};

export const createInspection = async (data: InspectionCreateParams): Promise<Inspection> => {
  const response = await apiClient.post<Inspection>('/inspections', data);
  return response.data;
};

export const updateInspection = async (id: string, data: InspectionUpdateParams): Promise<Inspection> => {
  const response = await apiClient.patch<Inspection>(`/inspections/${id}`, data);
  return response.data;
};

export const deleteInspection = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.delete<{ success: boolean; message: string }>(`/inspections/${id}`);
  return response.data;
};

export const inspectionsApi = {
  list: listInspections,
  get: getInspection,
  create: createInspection,
  update: updateInspection,
  delete: deleteInspection,
};
