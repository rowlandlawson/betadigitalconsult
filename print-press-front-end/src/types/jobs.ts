// types/jobs.ts
export interface Payment {
  id: string;
  job_id: string;
  amount: number;
  payment_method: 'cash' | 'transfer' | 'pos';
  payment_date: string;
  reference_number?: string;
  created_at: string;
  updated_at: string;
}

export interface JobFormData {
  customer_id?: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  description: string;
  total_cost: number;
  date_requested: string;
  delivery_deadline?: string;
}

export interface MaterialUsed {
  id?: string;
  material_name: string;
  paper_size?: string;
  paper_type?: string;
  grammage?: number;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  update_inventory?: boolean;
}

export interface WasteExpense {
  id?: string;
  type: 'paper_waste' | 'material_waste' | 'labor' | 'operational' | 'other';
  description: string;
  quantity?: number;
  unit_cost?: number;
  total_cost: number;
  waste_reason?: string;
}

export interface JobStatusUpdate {
  status: 'not_started' | 'in_progress' | 'completed' | 'delivered';
  materials?: MaterialUsed[];
  waste?: WasteExpense[];
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

export interface JobWithDetails extends Job {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  worker_name: string;
  materials: MaterialUsed[];
  waste: WasteExpense[];
  payments: Payment[];
  total_jobs_count?: number; // Added this property
}

export interface PaginatedJobsResponse {
  jobs: Job[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}