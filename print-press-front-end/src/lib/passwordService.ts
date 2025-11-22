import { api } from './api';

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordPayload {
  identifier: string;
}

export interface AdminResetPasswordPayload {
  userId: string;
}

export const passwordService = {
  async changePassword(payload: ChangePasswordPayload): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/change-password', payload);
    return response.data;
  },

  async requestResetLink(payload: ForgotPasswordPayload): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/forgot-password', payload);
    return response.data;
  },

  async adminResetUserPassword(payload: AdminResetPasswordPayload): Promise<{ message: string; resetLink?: string }> {
    const response = await api.post<{ message: string; resetLink?: string }>('/auth/admin/reset-user-password', payload);
    return response.data;
  },
};

