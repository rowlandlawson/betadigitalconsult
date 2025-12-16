export interface OperationalExpense {
  id: string;
  description: string;
  category: string;
  amount: number;
  expense_date: string;
  receipt_number?: string;
  notes?: string;
  recorded_by?: string;
  recorded_by_name?: string;
  created_at: string;
}

export interface OperationalExpensesResponse {
  expenses: OperationalExpense[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface ExpenseCategoriesResponse {
  categories: string[];
}

export interface MonthlyExpenseSummaryResponse {
  monthly_summary: Array<{
    month: number;
    category: string;
    total_amount: number;
    expense_count: number;
  }>;
  year: number;
}

export interface CreateExpenseData {
  description: string;
  category: string;
  amount: number;
  expense_date: string;
  receipt_number?: string;
  notes?: string;
}

export interface UpdateExpenseData extends Partial<CreateExpenseData> {}
