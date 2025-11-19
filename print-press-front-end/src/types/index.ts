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

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  total_jobs_count: number;
  total_amount_spent: number;
  first_interaction_date: string;
  last_interaction_date: string;
  created_at: string;
}

export interface Job {
  id: string;
  ticket_id: string;
  customer_id: string;
  worker_id: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'delivered';
  total_cost: number;
  amount_paid: number;
  balance: number;
  payment_status: 'pending' | 'partially_paid' | 'fully_paid';
  mode_of_payment?: 'cash' | 'transfer' | 'pos';
  date_requested: string;
  delivery_deadline?: string;
  materials_cost?: number;
  waste_cost?: number;
  operational_cost?: number;
  labor_cost?: number;
  profit?: number;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  customer_phone?: string;
  worker_name?: string;
}

export interface Inventory {
  id: string;
  material_name: string;
  category: string;
  paper_size?: string;
  paper_type?: string;
  grammage?: number;
  supplier?: string;
  current_stock: number;
  unit_of_measure: string;
  unit_cost: number;
  selling_price?: number;
  threshold: number;
  reorder_quantity?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  job_id: string;
  amount: number;
  payment_type: 'deposit' | 'installment' | 'full_payment' | 'balance';
  date: string;
  recorded_by: string;
  recorded_by_id: string;
  payment_method: 'cash' | 'transfer' | 'pos';
  receipt_number: string;
  notes?: string;
  created_at: string;
  ticket_id?: string;
  customer_name?: string;
  recorded_by_name?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'new_job' | 'payment_update' | 'status_change' | 'low_stock' | 'system' | 'alert';
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

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
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

export interface Job {
  id: string;
  ticket_id: string;
  customer_id: string;
  worker_id: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'delivered';
  total_cost: number;
  amount_paid: number;
  balance: number;
  payment_status: 'pending' | 'partially_paid' | 'fully_paid';
  mode_of_payment?: 'cash' | 'transfer' | 'pos';
  date_requested: string;
  delivery_deadline?: string;
  materials_cost?: number;
  waste_cost?: number;
  operational_cost?: number;
  labor_cost?: number;
  profit?: number;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  customer_phone?: string;
  worker_name?: string;
  total_jobs_count?: number; 
}

export * from './jobs';

export interface Payment {
  id: string;
  job_id: string;
  amount: number;
  payment_type: 'deposit' | 'installment' | 'full_payment' | 'balance';
  date: string;
  recorded_by: string;
  recorded_by_id: string;
  payment_method: 'cash' | 'transfer' | 'pos';
  receipt_number: string;
  notes?: string;
  created_at: string;
  ticket_id?: string;
  customer_name?: string;
  recorded_by_name?: string;
}

export * from './payments';

// Add to existing types...

export interface InventoryItem {
  id: string;
  material_name: string;
  category: string;
  paper_size?: string;
  paper_type?: string;
  grammage?: number;
  supplier?: string;
  current_stock: number;
  unit_of_measure: string;
  unit_cost: number;
  selling_price?: number;
  threshold: number;
  reorder_quantity?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export * from './inventory';

// Add to existing types...

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  total_jobs_count: number;
  total_amount_spent: number;
  first_interaction_date: string;
  last_interaction_date: string;
  created_at: string;
}

// Export the customer-related types
export * from './customers';