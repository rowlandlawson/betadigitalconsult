import { api } from './api';
import { Notification } from '@/types';

export interface NotificationsResponse {
  notifications: Notification[];
}

export interface UnreadCountResponse {
  count: number;
}

export const notificationService = {
  async getNotifications(params?: { limit?: number; unreadOnly?: boolean }): Promise<Notification[]> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.unreadOnly) queryParams.append('unreadOnly', 'true');

    const response = await api.get<NotificationsResponse>(`/notifications?${queryParams.toString()}`);
    return response.data.notifications;
  },

  async getUnreadCount(): Promise<number> {
    const response = await api.get<UnreadCountResponse>('/notifications/unread-count');
    return response.data.count;
  },

  async markAsRead(notificationId: string): Promise<void> {
    await api.patch(`/notifications/${notificationId}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await api.patch('/notifications/mark-all-read');
  }
};

