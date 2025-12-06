import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse, AxiosRequestConfig } from 'axios';
import { getValidToken, logout, refreshAuthToken } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Define proper types for the queue
interface QueueItem {
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
}

// Flag to prevent multiple token refresh requests
let isRefreshing = false;
let failedQueue: QueueItem[] = [];

const processQueue = (error: unknown, token: string | null = null): void => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
};

// Extend AxiosRequestConfig to include _retry property
interface RetryableAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    const token = await getValidToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError): Promise<AxiosError> => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and token refresh
api.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableAxiosRequestConfig;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, add to queue
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh the token
        const newAuth = await refreshAuthToken();
        
        if (newAuth) {
          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${newAuth.accessToken}`;
          processQueue(null, newAuth.accessToken);
          return api(originalRequest);
        } else {
          // Refresh failed, logout user
          processQueue(new Error('Token refresh failed'), null);
          logout();
          return Promise.reject(error);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Error type for API responses
export interface ApiError {
  error: string;
  message?: string;
  statusCode?: number;
}

export const isApiError = (error: unknown): error is ApiError => {
  return typeof error === 'object' && error !== null && 'error' in error;
};

// Helper function for making API calls with token refresh
export const apiCall = async <T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  data?: unknown
): Promise<T> => {
  try {
    const token = await getValidToken();
    if (!token) {
      throw new Error('No valid authentication token');
    }

    const config: AxiosRequestConfig = {
      method,
      url,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: data ? JSON.stringify(data) : undefined,
    };

    const response = await api.request<T>(config);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      logout();
    }
    throw error;
  }
};

// Dashboard statistics types
export interface DashboardStats {
  summary: {
    timestamp: string;
    period: string;
    updated_at: string;
  };
  customers: {
    total: number;
    new_this_month: number;
    growth_rate: number;
  };
  jobs: {
    total: number;
    pending: number;
    active: number;
    completed: number;
    delivered: number;
    completion_rate: number;
  };
  payments: {
    total_revenue: number;
    total_collected: number;
    total_outstanding: number;
    collection_rate: number;
  };
  inventory: {
    total_items: number;
    low_stock: number;
    critical_stock: number;
    total_value: number;
    alert_level: string;
  };
  recent_activities: Array<{
    ticket_id: string;
    description: string;
    status: string;
    total_cost: number;
    amount_paid: number;
    balance: number;
    created_at: string;
    customer_name: string;
  }>;
  revenue_trend: Array<{
    month: string;
    job_count: number;
    revenue: number;
    collected: number;
  }>;
  top_customers: Array<{
    id: number;
    name: string;
    contact_person: string;
    phone: string;
    email: string; // Added this
    total_jobs: number;
    total_spent: number;
    total_paid: number;
    outstanding_balance: number;
  }>;
  performance_metrics: {
    monthly_revenue_growth: number;
    job_completion_rate: number;
    payment_collection_rate: number;
    inventory_health: number;
  };
}

// Quick stats type for the simplified version
export interface QuickStats {
  total_revenue: number;
  total_jobs: number;
  active_customers: number;
  low_stock_items: number;
  completed_jobs: number;
  pending_payments: number;
  monthly_growth: number;
}

// Dashboard API methods
export const dashboardApi = {
  // Get comprehensive dashboard statistics
  getDashboardStats: async (period: string = 'month'): Promise<DashboardStats> => {
    try {
      // Use the apiCall helper to fetch stats for the given period
      return await apiCall<DashboardStats>('GET', `/reports/dashboard-stats?period=${period}`);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      
      // Throw a more specific error if needed
      if (axios.isAxiosError(error)) {
        throw new Error(`Dashboard stats failed: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  },
  
  // Get simplified stats for quick loading
  getQuickStats: async (): Promise<QuickStats> => {
    try {
      // Use the apiCall helper for consistent error handling
      const data = await apiCall<DashboardStats>('GET', '/reports/dashboard-stats');
      
      return {
        total_revenue: data.payments.total_revenue,
        total_jobs: data.jobs.total,
        active_customers: data.customers.total,
        low_stock_items: data.inventory.low_stock + data.inventory.critical_stock,
        completed_jobs: data.jobs.completed,
        pending_payments: data.payments.total_outstanding,
        monthly_growth: data.performance_metrics.monthly_revenue_growth
      };
    } catch (error) {
      console.error('Failed to fetch quick stats:', error);
      
      // Provide fallback or rethrow
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        // If endpoint doesn't exist, return empty stats
        console.warn('Dashboard stats endpoint not found, returning empty stats');
        return {
          total_revenue: 0,
          total_jobs: 0,
          active_customers: 0,
          low_stock_items: 0,
          completed_jobs: 0,
          pending_payments: 0,
          monthly_growth: 0
        };
      }
      throw error;
    }
  },
  
  // Optional: Add a method to refresh specific parts of dashboard data
  refreshDashboardData: async (forceRefresh: boolean = false): Promise<DashboardStats> => {
    const url = forceRefresh 
      ? '/reports/dashboard-stats?refresh=true' 
      : '/reports/dashboard-stats';
    
    return await apiCall<DashboardStats>('GET', url);
  }
};