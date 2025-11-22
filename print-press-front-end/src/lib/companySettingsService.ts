// lib/companySettingsService.ts
import { api } from './api';

export interface CompanySettings {
  id?: string;
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  logo?: string;
  logoFile?: File;
  created_at?: string;
  updated_at?: string;
  message?: string;
  success?: boolean;
}

export const companySettingsService = {
  async getSettings(): Promise<CompanySettings> {
    try {
      const response = await api.get<CompanySettings>('/company-settings');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch company settings:', error);
      throw error;
    }
  },

  async updateSettings(settings: CompanySettings): Promise<CompanySettings> {
    try {
      const response = await api.put<CompanySettings>('/company-settings', settings);
      return response.data;
    } catch (error) {
      console.error('Failed to update company settings:', error);
      throw error;
    }
  },

  async uploadLogo(file: File): Promise<{ logoUrl: string }> {
    try {
      const formData = new FormData();
      formData.append('logo', file);
      
      // Backend returns { success: true, logoUrl: string, message: string }
      const response = await api.post<{ success?: boolean; logoUrl: string; message?: string }>('/company-settings/upload-logo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Extract logoUrl from response (handles both old and new format)
      return { logoUrl: response.data.logoUrl };
    } catch (error) {
      console.error('Failed to upload logo:', error);
      throw error;
    }
  },
};