import apiClient from './client';

export interface WitnessDetail {
  name: string;
  statement: string;
  recorded_at?: string;
}

export interface WitnessStatement {
  name: string;
  contact?: string;
  statement: string;
  recorded_at?: string;
}

export interface IncidentInvestigation {
  lead_investigator_id?: string;
  root_cause?: string;
  findings?: string;
  witness_statements: WitnessStatement[];
  completed_at?: string;
}

export interface Incident {
  id: string;
  incident_number: string;
  project_id: string;
  project_name?: string;
  project_code?: string;
  reported_by: string;
  reporter_name?: string;
  incident_category:
    | 'worker_injury'
    | 'equipment_accident'
    | 'fire_hazard'
    | 'electrical_hazard'
    | 'falling_object'
    | 'near_miss'
    | 'unsafe_working_condition'
    | 'other';
  severity: 'near_miss' | 'minor_injury' | 'major_injury' | 'critical' | 'property_damage';
  title: string;
  description: string;
  location_details?: string;
  occurred_at: string;
  evidence_photos: string[];
  witness_details: WitnessDetail[];
  assigned_investigator_id?: string;
  assigned_investigator_name?: string;
  status: 'reported' | 'under_investigation' | 'corrective_action_assigned' | 'resolved' | 'closed';
  investigation?: IncidentInvestigation;
  resolution_notes?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface IncidentListResponse {
  items: Incident[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface IncidentCreateParams {
  project_id: string;
  title: string;
  incident_category: string;
  severity: string;
  description: string;
  location_details?: string;
  occurred_at?: string;
  evidence_photos?: string[];
  witness_details?: WitnessDetail[];
}

export interface IncidentUpdateParams {
  title?: string;
  description?: string;
  location_details?: string;
  assigned_investigator_id?: string;
  status?: string;
  resolution_notes?: string;
  evidence_photos?: string[];
  investigation?: IncidentInvestigation;
}

export const listIncidents = async (params: {
  page?: number;
  size?: number;
  search?: string;
  category?: string;
  severity?: string;
  status?: string;
  project_id?: string;
} = {}): Promise<IncidentListResponse> => {
  const response = await apiClient.get<IncidentListResponse>('/incidents', { params });
  return response.data;
};

export const getIncident = async (id: string): Promise<Incident> => {
  const response = await apiClient.get<Incident>(`/incidents/${id}`);
  return response.data;
};

export const createIncident = async (data: IncidentCreateParams): Promise<Incident> => {
  const response = await apiClient.post<Incident>('/incidents', data);
  return response.data;
};

export const updateIncident = async (id: string, data: IncidentUpdateParams): Promise<Incident> => {
  const response = await apiClient.patch<Incident>(`/incidents/${id}`, data);
  return response.data;
};

export const deleteIncident = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.delete<{ success: boolean; message: string }>(`/incidents/${id}`);
  return response.data;
};
