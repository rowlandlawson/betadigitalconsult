import { api } from './api';
import { User } from '@/types';

export interface UsersResponse {
  users: User[];
}

export interface UserResponse {
  user: User;
}

export interface CreateUserData {
  email: string;
  name: string;
  userName?: string;
  phone?: string;
  address?: string;
  dateJoined?: string;
  role?: 'admin' | 'worker';
  hourlyRate?: number;
  monthlySalary?: number;
  paymentMethod?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
}

export interface UpdateUserData extends Partial<CreateUserData> {
  isActive?: boolean;
}

export const userService = {
  async getAllUsers(): Promise<User[]> {
    const response = await api.get<UsersResponse>('/users');
    return response.data.users;
  },

  async getUserById(id: string): Promise<User> {
    const response = await api.get<UserResponse>(`/users/${id}`);
    return response.data.user;
  },

  async createUser(userData: CreateUserData): Promise<{ user: User; message: string }> {
    const response = await api.post('/users', userData);
    return response.data;
  },

  async updateUser(id: string, userData: UpdateUserData): Promise<{ user: User; message: string }> {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  },

  async resetPassword(id: string, newPassword: string): Promise<void> {
    await api.post(`/users/${id}/reset-password`, { newPassword });
  }
};

