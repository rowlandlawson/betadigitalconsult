export interface PaymentFormData {
  job_id: string;
  amount: number;
  payment_type: 'deposit' | 'installment' | 'full_payment' | 'balance';
  payment_method: 'cash' | 'transfer' | 'pos';
  notes?: string;
}

export interface ReceiptData {
  receipt: {
    receipt_number: string;
    date: string;
    business: {
      logo?: string | null;
      name: string;
      phone?: string | null;
      email?: string | null;
      address?: string | null;
    };
    customer: {
      name: string;
      phone: string;
      email?: string;
    };
    job: {
      ticket_id: string;
      description: string;
      date_requested: string;
      delivery_deadline?: string;
      total_cost: number;
    };
    payment: {
      amount: number;
      amount_paid: number;
      balance: number;
      method: string;
      type: string;
      recorded_by: string;
      notes?: string;
    };
    payment_history: Array<{
      amount: number;
      payment_type: string;
      date: string;
      payment_method: string;
      receipt_number: string;
      notes?: string;
    }>;
  };
}

export interface PaymentStats {
  payment_stats: Array<{
    period: string;
    payment_count: number;
    total_amount: number;
    average_payment: number;
    unique_jobs: number;
    unique_customers: number;
  }>;
  method_distribution: Array<{
    payment_method: string;
    count: number;
    total_amount: number;
  }>;
  period: string;
}

export interface OutstandingPaymentDetail {
  id: string;
  ticket_id: string;
  outstanding_amount: number;
  total_cost: number;
  amount_paid: number;
  customer_name: string;
  customer_phone: string;
  worker_name: string;
  updated_at: string;
}

export interface OutstandingPaymentAging {
  category: string;
  count: number;
  amount: number;
}

export interface OutstandingPayments {
  summary: {
    outstanding_jobs_count: number;
    total_outstanding_amount: number;
    customers_with_outstanding: number;
    last_updated: string;
  };
  detailed: OutstandingPaymentDetail[];
  aging: OutstandingPaymentAging[];
}
