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

// Define the Job interface locally since it's not exported from jobs
export interface CustomerJob {
  id: string;
  ticket_id: string;
  description: string;
  status: string;
  total_cost: number;
  amount_paid: number;
  balance: number;
  created_at: string;
  date_requested: string;
}

export interface CustomerWithDetails extends Customer {
  jobs: CustomerJob[];
}

export interface CustomerFormData {
  name: string;
  phone: string;
  email?: string;
}

export interface CustomerStats {
  stats: {
    total_customers: number;
    active_customers: number;
    repeat_customers: number;
    avg_jobs_per_customer: number;
    avg_spent_per_customer: number;
    avg_spent_per_active_customer: number;
    highest_spending: number;
  };
  top_customers: Array<{
    name: string;
    total_jobs_count: number;
    total_amount_spent: number;
  }>;
}