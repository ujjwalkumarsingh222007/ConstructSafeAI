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
  }
};
