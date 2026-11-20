import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

export interface HealthCheckData {
  success: boolean;
  status: string;
  project: string;
  version: string;
  environment: string;
  timestamp: string;
}

export interface DatabaseHealthData {
  success: boolean;
  status: string;
  connected: boolean;
  latency_ms: number;
  engine: string;
  database: string;
  message: string;
  timestamp: string;
}

export interface ApiStatusSummary {
  apiConnected: boolean;
  dbConnected: boolean;
  latencyMs: number;
  version: string;
  environment: string;
  message: string;
  lastChecked: Date;
}

const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor: Attach JWT Bearer token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('cs_access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Automatic silent token refresh
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 Unauthorized and not already retried
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Don't intercept auth login/refresh/logout failures
      if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('cs_refresh_token');
      if (!refreshToken) {
        isRefreshing = false;
        localStorage.removeItem('cs_access_token');
        localStorage.removeItem('cs_user');
        return Promise.reject(error);
      }

      try {
        const refreshResponse = await axios.post<{ access_token: string; refresh_token: string }>(
          `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/auth/refresh`,
          { refresh_token: refreshToken }
        );

        const newAccessToken = refreshResponse.data.access_token;
        const newRefreshToken = refreshResponse.data.refresh_token;

        localStorage.setItem('cs_access_token', newAccessToken);
        localStorage.setItem('cs_refresh_token', newRefreshToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        processQueue(null, newAccessToken);
        isRefreshing = false;

        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        isRefreshing = false;
        // Token reuse or expired session: force logout
        localStorage.removeItem('cs_access_token');
        localStorage.removeItem('cs_refresh_token');
        localStorage.removeItem('cs_user');
        window.location.href = '/login?session_expired=1';
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export const apiService = {
  async getHealth(): Promise<HealthCheckData> {
    const response = await apiClient.get<HealthCheckData>('/health');
    return response.data;
  },

  async getDatabaseHealth(): Promise<DatabaseHealthData> {
    const response = await apiClient.get<DatabaseHealthData>('/health/database');
    return response.data;
  },

  async getFullStatus(): Promise<ApiStatusSummary> {
    const startTime = performance.now();
    try {
      const healthData = await this.getHealth();
      let dbData: DatabaseHealthData | null = null;
      try {
        dbData = await this.getDatabaseHealth();
      } catch (dbErr) {
        console.warn('Database health check warning:', dbErr);
      }

      const totalLatency = Math.round(performance.now() - startTime);

      return {
        apiConnected: true,
        dbConnected: dbData ? dbData.connected : false,
        latencyMs: totalLatency,
        version: healthData.version,
        environment: healthData.environment,
        message: dbData?.connected 
          ? 'API & MongoDB are healthy' 
          : 'API operational (MongoDB check degraded)',
        lastChecked: new Date(),
      };
    } catch (err) {
      const axiosError = err as AxiosError;
      const totalLatency = Math.round(performance.now() - startTime);
      return {
        apiConnected: false,
        dbConnected: false,
        latencyMs: totalLatency,
        version: 'Unknown',
        environment: 'Offline',
        message: axiosError.message || 'Cannot reach FastAPI backend',
        lastChecked: new Date(),
      };
    }
  },
};

export default apiClient;
