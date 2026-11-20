import apiClient from './client';

export interface UserSummary {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role_name: string;
  phone?: string;
  permissions: string[];
  assigned_project_ids: string[];
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginResponse {
  success: boolean;
  user: UserSummary;
  tokens: TokenResponse;
}

export interface AdminUserDetail {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role_name: string;
  phone?: string;
  assigned_project_ids: string[];
  assigned_project_names: string[];
  is_active: boolean;
  last_login_at?: string;
  created_at?: string;
  employee_id?: string;
  trade?: string;
}

export interface AdminCreateUserPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role_name: string;
  phone?: string;
  assigned_project_ids?: string[];
  trade?: string;
  employee_id?: string;
}

export interface AdminUserListResponse {
  success: boolean;
  total: number;
  users: AdminUserDetail[];
}

export const authApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', { email, password });
    return response.data;
  },

  async refresh(refreshToken: string): Promise<TokenResponse> {
    const response = await apiClient.post<TokenResponse>('/auth/refresh', { refresh_token: refreshToken });
    return response.data;
  },

  async logout(refreshToken?: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/auth/logout', { refresh_token: refreshToken || '' });
    return response.data;
  },

  async getMe(): Promise<UserSummary> {
    const response = await apiClient.get<UserSummary>('/auth/me');
    return response.data;
  },

  async updateProfile(data: { first_name?: string; last_name?: string; phone?: string }): Promise<{ success: boolean; message: string; user: UserSummary }> {
    const response = await apiClient.patch<{ success: boolean; message: string; user: UserSummary }>('/auth/me', data);
    return response.data;
  },

  async changePassword(data: { current_password: string; new_password: string }): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>('/auth/change-password', data);
    return response.data;
  },

  async testRoleEndpoint(endpoint: string): Promise<{ success: boolean; message: string; role: string }> {
    const response = await apiClient.get(`/auth/${endpoint}`);
    return response.data;
  },

  async getUsers(params?: { role?: string; search?: string }): Promise<AdminUserListResponse> {
    const response = await apiClient.get<AdminUserListResponse>('/auth/users', { params });
    return response.data;
  },

  async createUser(data: AdminCreateUserPayload): Promise<AdminUserDetail> {
    const response = await apiClient.post<AdminUserDetail>('/auth/users', data);
    return response.data;
  },

  async toggleUserStatus(userId: string, isActive: boolean): Promise<{ success: boolean; message: string; is_active: boolean }> {
    const response = await apiClient.patch<{ success: boolean; message: string; is_active: boolean }>(`/auth/users/${userId}/status`, { is_active: isActive });
    return response.data;
  },

  async resetUserPassword(userId: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>(`/auth/users/${userId}/reset-password`, { new_password: newPassword });
    return response.data;
  }
};
