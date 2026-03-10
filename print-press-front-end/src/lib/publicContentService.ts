import axios from 'axios';
import { api } from './api';

export interface LandingContent {
  id?: string;
  hero_title: string;
  hero_subtitle?: string;
  hero_eyebrow?: string;
  hero_highlight_text?: string;
  hero_panel_title?: string;
  hero_panel_description?: string;
  about_title?: string;
  about_description?: string;
  services_title?: string;
  services_description?: string;
  services_items?: string[];
  navbar_jobs_text?: string;
  navbar_contact_text?: string;
  jobs_section_title?: string;
  jobs_section_link_text?: string;
  jobs_loading_text?: string;
  jobs_empty_text?: string;
  contact_section_title?: string;
  cta_title?: string;
  cta_description?: string;
  cta_button_text?: string;
}

export interface WebsiteContactInfo {
  company_name: string;
  tagline?: string;
  email: string;
  address: string;
  phone: string;
  whatsapp_number: string;
  logo?: string | null;
}

export interface PortfolioCategoryRef {
  id: string | null;
  name: string;
  slug: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description?: string;
  media_type: 'image' | 'video';
  media_url: string;
  is_featured: boolean;
  display_order: number;
  category: PortfolioCategoryRef;
  created_at: string;
}

export interface PortfolioCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  display_order: number;
  items: PortfolioItem[];
}

export interface PublicLandingResponse {
  content: LandingContent;
  contact: WebsiteContactInfo;
  featured_portfolio: PortfolioItem[];
}

export interface PublicPortfolioResponse {
  categories: PortfolioCategory[];
  items: PortfolioItem[];
}

export interface AdminWebsiteResponse {
  content: LandingContent;
  categories: Array<Omit<PortfolioCategory, 'items'>>;
  items: PortfolioItem[];
}

export interface PortfolioCategoryPayload {
  name: string;
  description?: string;
  display_order?: number;
}

export interface PortfolioItemPayload {
  title: string;
  description?: string;
  media_type: 'image' | 'video';
  media_url: string;
  category_id?: string | null;
  is_featured?: boolean;
  display_order?: number;
}

// Public client intentionally bypasses auth interceptors so landing pages never trigger login redirects.
const publicApi = axios.create({
  baseURL: '/api',
});

export const publicContentService = {
  getLanding: async (): Promise<PublicLandingResponse> => {
    const response = await publicApi.get<PublicLandingResponse>('/landing/public');
    return response.data;
  },

  getPortfolio: async (): Promise<PublicPortfolioResponse> => {
    const response = await publicApi.get<PublicPortfolioResponse>('/landing/portfolio');
    return response.data;
  },
};

export const websiteAdminService = {
  getWebsiteData: async (): Promise<AdminWebsiteResponse> => {
    const response = await api.get<AdminWebsiteResponse>('/landing/admin');
    return response.data;
  },

  updateLandingContent: async (
    payload: LandingContent
  ): Promise<{ message: string; content: LandingContent }> => {
    const response = await api.put<{ message: string; content: LandingContent }>(
      '/landing/content',
      payload
    );
    return response.data;
  },

  uploadJobMedia: async (
    file: File
  ): Promise<{ message: string; media_url: string; media_type: 'image' | 'video' }> => {
    const formData = new FormData();
    formData.append('media', file);

    const response = await api.post<{
      message: string;
      media_url: string;
      media_type: 'image' | 'video';
    }>('/landing/upload-media', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  createCategory: async (
    payload: PortfolioCategoryPayload
  ): Promise<{ message: string; category: Omit<PortfolioCategory, 'items'> }> => {
    const response = await api.post<{
      message: string;
      category: Omit<PortfolioCategory, 'items'>;
    }>('/landing/categories', payload);
    return response.data;
  },

  updateCategory: async (
    id: string,
    payload: PortfolioCategoryPayload
  ): Promise<{ message: string; category: Omit<PortfolioCategory, 'items'> }> => {
    const response = await api.put<{
      message: string;
      category: Omit<PortfolioCategory, 'items'>;
    }>(`/landing/categories/${id}`, payload);
    return response.data;
  },

  deleteCategory: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/landing/categories/${id}`);
    return response.data;
  },

  createPortfolioItem: async (
    payload: PortfolioItemPayload
  ): Promise<{ message: string; item: PortfolioItem }> => {
    const response = await api.post<{ message: string; item: PortfolioItem }>(
      '/landing/portfolio-items',
      payload
    );
    return response.data;
  },

  updatePortfolioItem: async (
    id: string,
    payload: PortfolioItemPayload
  ): Promise<{ message: string; item: PortfolioItem }> => {
    const response = await api.put<{ message: string; item: PortfolioItem }>(
      `/landing/portfolio-items/${id}`,
      payload
    );
    return response.data;
  },

  deletePortfolioItem: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/landing/portfolio-items/${id}`);
    return response.data;
  },
};
