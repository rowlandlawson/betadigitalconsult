import { api } from './api';
import {
  OperationalExpense,
  OperationalExpensesResponse,
  ExpenseCategoriesResponse,
  MonthlyExpenseSummaryResponse,
  CreateExpenseData,
  UpdateExpenseData,
} from '@/types/operational-expenses';

export const operationalExpensesService = {
  async getExpenses(params?: {
    page?: number;
    limit?: number;
    category?: string;
    month?: number;
    year?: number;
  }): Promise<OperationalExpensesResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.category) queryParams.append('category', params.category);
    if (params?.month) queryParams.append('month', params.month.toString());
    if (params?.year) queryParams.append('year', params.year.toString());

    const response = await api.get<OperationalExpensesResponse>(
      `/operational-expenses?${queryParams.toString()}`
    );
    return response.data;
  },

  async createExpense(
    expenseData: CreateExpenseData
  ): Promise<{ expense: OperationalExpense; message: string }> {
    const response = await api.post('/operational-expenses', expenseData);
    return response.data;
  },

  async updateExpense(
    id: string,
    expenseData: UpdateExpenseData
  ): Promise<{ expense: OperationalExpense; message: string }> {
    const response = await api.put(`/operational-expenses/${id}`, expenseData);
    return response.data;
  },

  async deleteExpense(id: string): Promise<void> {
    await api.delete(`/operational-expenses/${id}`);
  },

  async getCategories(): Promise<string[]> {
    const response = await api.get<ExpenseCategoriesResponse>(
      '/operational-expenses/categories'
    );
    return response.data.categories;
  },

  async getMonthlySummary(
    year?: number
  ): Promise<MonthlyExpenseSummaryResponse> {
    const queryParams = new URLSearchParams();
    if (year) queryParams.append('year', year.toString());

    const response = await api.get<MonthlyExpenseSummaryResponse>(
      `/operational-expenses/monthly-summary?${queryParams.toString()}`
    );
    return response.data;
  },
};
