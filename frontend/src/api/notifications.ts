import apiClient from './client';

export interface NotificationItem {
  id: string;
  recipient_id: string;
  project_id?: string;
  title: string;
  message: string;
  type: 'assignment' | 'incident' | 'inspection' | 'hazard' | 'system';
  severity: 'info' | 'warning' | 'critical';
  is_read: boolean;
  read_at?: string;
  link_url?: string;
  created_at: string;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  unread_count: number;
}

export const listNotifications = async (unreadOnly: boolean = false): Promise<NotificationListResponse> => {
  const response = await apiClient.get<NotificationListResponse>('/notifications', {
    params: { unread_only: unreadOnly },
  });
  return response.data;
};

export const markNotificationRead = async (id: string): Promise<NotificationItem> => {
  const response = await apiClient.patch<NotificationItem>(`/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsRead = async (): Promise<{ success: boolean; modified_count: number }> => {
  const response = await apiClient.post<{ success: boolean; modified_count: number }>('/notifications/read-all');
  return response.data;
};

export const notificationsApi = {
  list: async (_params?: { limit?: number; unread_only?: boolean }) => {
    const res = await listNotifications(_params?.unread_only);
    return { notifications: res.items, unread_count: res.unread_count };
  },
  markRead: markNotificationRead,
  markAllRead: markAllNotificationsRead,
};
