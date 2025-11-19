// lib/useCompanySettings.ts
'use client';

import { useState, useEffect } from 'react';
import { companySettingsService, CompanySettings } from './companySettingsService';
import { isApiError } from './api';
import { toast } from 'sonner';
import { getLogoUrl } from './utils';

const DEFAULT_SETTINGS: CompanySettings = {
  name: 'YOUR COMPANY NAME HERE',
  tagline: 'Your Business Tagline',
  address: 'Your Address, City, Country',
  phone: '+234 (0) Your Phone Number',
  email: 'your-email@company.com',
};

export const useCompanySettings = () => {
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await companySettingsService.getSettings();
        // Convert logo path to full URL
        if (data.logo) {
          data.logo = getLogoUrl(data.logo) || data.logo;
        }
        setSettings(data);
        console.log('🔍 Settings loaded:', data);
      } catch (err: unknown) {
        console.error('Failed to load company settings:', err);
        if (isApiError(err)) {
          setError(err.error);
          toast.error(`Failed to load settings: ${err.error}`);
        } else {
          toast.error('Failed to load company settings');
        }
        setSettings(DEFAULT_SETTINGS);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const updateSettings = async (newSettings: Partial<CompanySettings>) => {
    try {
      const updated = { ...settings, ...newSettings };
      const response = await companySettingsService.updateSettings(updated);
      // Convert logo path to full URL
      if (response.logo) {
        response.logo = getLogoUrl(response.logo) || response.logo;
      }
      setSettings(response);
      toast.success('Settings updated successfully!');
      return response;
    } catch (err: unknown) {
      console.error('Failed to update company settings:', err);
      if (isApiError(err)) {
        setError(err.error);
        toast.error(`Failed to update settings: ${err.error}`);
      } else {
        toast.error('Failed to update settings');
      }
      throw err;
    }
  };

  const uploadLogo = async (file: File) => {
    try {
      console.log('🔄 Starting logo upload...', file.name, file.size);
      const response = await companySettingsService.uploadLogo(file);
      console.log('✅ Logo upload response:', response);
      
      // Convert logo path to full URL
      const fullLogoUrl = getLogoUrl(response.logoUrl) || response.logoUrl;
      
      // Update local state with the new logo URL (don't call updateSettings to avoid duplicate API call)
      const updatedSettings = { ...settings, logo: fullLogoUrl };
      setSettings(updatedSettings);
      
      toast.success('Logo uploaded successfully!');
      return fullLogoUrl;
    } catch (err: unknown) {
      console.error('❌ Logo upload failed:', err);
      const errorMessage = isApiError(err) ? err.error : 'Failed to upload logo';
      toast.error(errorMessage);
      throw err;
    }
  };

  return { settings, loading, error, updateSettings, uploadLogo };
};