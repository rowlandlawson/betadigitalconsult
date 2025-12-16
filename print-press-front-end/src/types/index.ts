export interface User {
  id: string;
  email: string;
  name: string;
  user_name: string;
  role: 'admin' | 'worker';
  is_active: boolean;
  hourly_rate?: number;
  monthly_salary?: number;
  payment_method?: string;
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  phone?: string;
  address?: string;
  date_joined?: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type:
    | 'new_job'
    | 'payment_update'
    | 'status_change'
    | 'low_stock'
    | 'system'
    | 'alert';
  related_entity_type?: 'job' | 'payment' | 'inventory' | 'customer' | 'user';
  related_entity_id?: string;
  is_read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  action_url?: string;
  image_url?: string;
  created_at: string;
  expires_at?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

// Response interfaces for API calls
export interface FinancialSummaryResponse {
  revenue?: {
    total_revenue: number;
  };
  job_stats?: {
    total_jobs: number;
  };
}

export interface CustomerStatsResponse {
  stats?: {
    active_customers: number;
  };
}

export interface LowStockResponse {
  low_stock_items?: Array<unknown>;
}

export interface NotificationsResponse {
  notifications: Notification[];
}

export interface UnreadCountResponse {
  count: number;
}

export * from './jobs';
export * from './payments';
export * from './inventory';
export * from './customers';
