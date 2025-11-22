// lib/useCompanySettings.ts
'use client';

import { useEffect, useState } from 'react';
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

type StoreState = {
  settings: CompanySettings;
  loading: boolean;
  error: string | null;
};

let storeState: StoreState = {
  settings: DEFAULT_SETTINGS,
  loading: true,
  error: null,
};

const listeners = new Set<(state: StoreState) => void>();
let initialized = false;
let pendingFetch: Promise<void> | null = null;

const notifySubscribers = () => {
  listeners.forEach((listener) => listener(storeState));
};

const updateStore = (updates: Partial<StoreState>) => {
  storeState = { ...storeState, ...updates };
  notifySubscribers();
};

const normalizeLogoPath = (logo?: string | null) => {
  if (!logo) {
    return undefined;
  }
  return getLogoUrl(logo) || logo;
};

const loadCompanySettings = async () => {
  try {
    updateStore({ loading: true, error: null });
    const data = await companySettingsService.getSettings();
    const normalizedLogo = normalizeLogoPath(data.logo);
    updateStore({
      settings: normalizedLogo ? { ...data, logo: normalizedLogo } : { ...data, logo: undefined },
      loading: false,
      error: null,
    });
    initialized = true;
    console.log('🔍 Company settings loaded:', data);
  } catch (err: unknown) {
    console.error('Failed to load company settings:', err);
    const errorMessage = isApiError(err) ? err.error : 'Failed to load company settings';
    updateStore({
      loading: false,
      error: errorMessage,
      settings: DEFAULT_SETTINGS,
    });
    toast.error(`Failed to load settings: ${errorMessage}`);
  }
};

const ensureSettingsLoaded = () => {
  if (initialized) {
    return;
  }

  if (!pendingFetch) {
    pendingFetch = loadCompanySettings().finally(() => {
      pendingFetch = null;
    });
  }

  return pendingFetch;
};

const refreshSettings = async () => {
  initialized = false;
  return loadCompanySettings();
};

const updateCompanySettings = async (newSettings: Partial<CompanySettings>) => {
  try {
    const payload = { ...storeState.settings, ...newSettings };
    const response = await companySettingsService.updateSettings(payload);
    const { message, ...settingsResponse } = response;
    const normalizedLogo = normalizeLogoPath(settingsResponse.logo);
    const nextSettings = normalizedLogo ? { ...settingsResponse, logo: normalizedLogo } : { ...settingsResponse, logo: undefined };
    updateStore({ settings: nextSettings, error: null });
    toast.success(message || 'Settings updated successfully!');
    return nextSettings;
  } catch (err: unknown) {
    console.error('Failed to update company settings:', err);
    const errorMessage = isApiError(err) ? err.error : 'Failed to update settings';
    updateStore({ error: errorMessage });
    toast.error(`Failed to update settings: ${errorMessage}`);
    throw err;
  }
};

const uploadCompanyLogo = async (file: File) => {
  try {
    console.log('🔄 Starting logo upload...', file.name, file.size);
    const response = await companySettingsService.uploadLogo(file);
    console.log('✅ Logo upload response:', response);
    const fullLogoUrl = normalizeLogoPath(response.logoUrl) || response.logoUrl;
    updateStore({
      settings: { ...storeState.settings, logo: fullLogoUrl },
      error: null,
    });
    toast.success('Logo uploaded successfully!');
    return fullLogoUrl;
  } catch (err: unknown) {
    console.error('❌ Logo upload failed:', err);
    const errorMessage = isApiError(err) ? err.error : 'Failed to upload logo';
    toast.error(errorMessage);
    throw err;
  }
};

export const useCompanySettings = () => {
  const [state, setState] = useState<StoreState>(storeState);

  useEffect(() => {
    ensureSettingsLoaded();
  }, []);

  useEffect(() => {
    const listener = (nextState: StoreState) => {
      setState(nextState);
    };

    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    settings: state.settings,
    loading: state.loading,
    error: state.error,
    updateSettings: updateCompanySettings,
    uploadLogo: uploadCompanyLogo,
    refreshSettings,
  };
};