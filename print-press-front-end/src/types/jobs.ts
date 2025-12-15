// types/jobs.ts

// Customer and User interfaces for relationships
export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  total_jobs_count?: number;
  total_amount_spent?: number;
  first_interaction_date?: string;
  last_interaction_date?: string;
  created_at?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  is_active?: boolean;
}

export interface Payment {
  id: string;
  job_id: string;
  amount: number;
  payment_type: 'deposit' | 'installment' | 'full_payment' | 'balance';
  payment_method: 'cash' | 'transfer' | 'pos';
  date: string;
  recorded_by: string;
  recorded_by_id: string;
  receipt_number: string;
  notes?: string;
  created_at: string;
}

export interface JobFormData {
  customer_id?: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  worker_id?: string;
  description: string;
  total_cost: number;
  date_requested: string;
  delivery_deadline?: string;
  mode_of_payment?: 'cash' | 'transfer' | 'pos';
}

export interface MaterialUsed {
  id?: string;
  job_id?: string;
  material_id?: string; // Reference to inventory item
  material_name: string;
  paper_size?: string;
  paper_type?: string;
  grammage?: number;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  update_inventory?: boolean;
  inventory_updated?: boolean;
  inventory_updated_at?: string;
  created_at?: string;
}

// Alias for UI components that import `Material`
export type Material = MaterialUsed;

export interface WasteExpense {
  id?: string;
  job_id?: string;
  material_id?: string; // Reference to inventory item
  type: 'paper_waste' | 'material_waste' | 'labor' | 'operational' | 'other';
  description: string;
  quantity?: number;
  unit_cost?: number;
  total_cost: number;
  waste_reason?: string;
  inventory_updated?: boolean;
  inventory_updated_at?: string;
  created_at?: string;
}

export interface JobStatusUpdate {
  status: 'not_started' | 'in_progress' | 'completed' | 'delivered';
  materials?: MaterialUsed[];
  waste?: WasteExpense[];
}

export interface MaterialEditHistory {
  id: string;
  material_used_id: string;
  job_id: string;
  previous_material_name: string | null;
  previous_paper_size: string | null;
  previous_paper_type: string | null;
  previous_grammage: string | null;
  previous_quantity: number | null;
  previous_unit_cost: number | null;
  previous_total_cost: number | null;
  new_material_name: string | null;
  new_paper_size: string | null;
  new_paper_type: string | null;
  new_grammage: string | null;
  new_quantity: number | null;
  new_unit_cost: number | null;
  new_total_cost: number | null;
  edit_reason: string;
  edited_by: string;
  editor_name: string;
  edited_at: string;
  current_material_name: string | null;
}

export interface MaterialsUpdateRequest {
  materials: MaterialUsed[];
  waste?: WasteExpense[];
  expenses?: any[];
  edit_reason: string;
}

export interface MaterialsUpdateResponse {
  message: string;
  materials: MaterialUsed[];
  waste?: WasteExpense[];
  expenses?: any[];
  editHistory: MaterialEditHistory[];
}

export interface Job {
  id: string;
  ticket_id: string;
  customer_id: string;
  worker_id: string | null;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'delivered';
  total_cost: number;
  amount_paid: number;
  balance: number;
  payment_status: 'pending' | 'partially_paid' | 'fully_paid';
  mode_of_payment?: 'cash' | 'transfer' | 'pos';
  date_requested: string;
  delivery_deadline?: string;
  materials_cost: number;
  waste_cost: number;
  operational_cost: number;
  labor_cost: number;
  profit: number;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  worker_name?: string;
}

export interface JobWithDetails extends Job {
  materials: MaterialUsed[];
  waste_expenses: WasteExpense[];
  waste?: WasteExpense[]; // Alias for waste_expenses for component compatibility
  payments: Payment[];
  edit_history: MaterialEditHistory[];
  customer: Customer | null;
  worker: User | null;
  total_paid: number;
  balance: number;
  total_jobs_count?: number;
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

// Types for job completion modal
export interface MaterialEntry {
  material_name: string;
  paper_size?: string;
  paper_type?: string;
  grammage?: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  update_inventory?: boolean;
}

export interface WasteEntry {
  type: 'paper_waste' | 'material_waste' | 'labor' | 'operational' | 'other';
  description: string;
  quantity?: number;
  unit_cost?: number;
  total_cost: number;
  waste_reason?: string;
}

// Types for cost analysis
export interface JobCostBreakdown {
  materials_cost: number;
  waste_cost: number;
  operational_cost: number;
  labor_cost: number;
  profit: number;
  total_cost: number;
  profit_margin: number;
}

// Types for job statistics
export interface JobStats {
  total_jobs: number;
  jobs_in_progress: number;
  jobs_completed: number;
  jobs_delivered: number;
  total_revenue: number;
  total_pending_amount: number;
  average_job_value: number;
  recent_jobs: Job[];
}

// Types for job filters
export interface JobFilters {
  status?: string;
  date_from?: string;
  date_to?: string;
  customer_id?: string;
  worker_id?: string;
  payment_status?: string;
  search?: string;
}

// Types for job timeline/activity
export interface JobActivity {
  id: string;
  job_id: string;
  activity_type: 'created' | 'status_changed' | 'payment_received' | 'material_updated' | 'note_added';
  description: string;
  user_id?: string;
  user_name?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

// Types for job attachments
export interface JobAttachment {
  id: string;
  job_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;
}

// Types for job notes/comments
export interface JobNote {
  id: string;
  job_id: string;
  user_id: string;
  user_name: string;
  note: string;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
}