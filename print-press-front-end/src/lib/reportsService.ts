import { api } from './api';
import {
  MonthlyFinancialSummary,
  ProfitLossStatement,
  MaterialMonitoringDashboard,
  BusinessPerformance,
} from '@/types/reports';

export const reportsService = {
  async getFinancialSummary(
    startDate: string,
    endDate: string
  ): Promise<MonthlyFinancialSummary> {
    const queryParams = new URLSearchParams();
    queryParams.append('start_date', startDate);
    queryParams.append('end_date', endDate);

    const response = await api.get(
      `/reports/financial-summary?${queryParams.toString()}`
    );
    return response.data;
  },

  async getProfitLossStatement(
    startDate: string,
    endDate: string
  ): Promise<ProfitLossStatement> {
    const queryParams = new URLSearchParams();
    queryParams.append('start_date', startDate);
    queryParams.append('end_date', endDate);

    const response = await api.get(
      `/reports/profit-loss?${queryParams.toString()}`
    );
    return response.data;
  },

  async getMaterialMonitoringDashboard(
    startDate: string,
    endDate: string
  ): Promise<MaterialMonitoringDashboard> {
    const queryParams = new URLSearchParams();
    queryParams.append('start_date', startDate);
    queryParams.append('end_date', endDate);

    const response = await api.get(
      `/reports/material-monitoring?${queryParams.toString()}`
    );
    return response.data;
  },

  async getBusinessPerformance(
    period: string = 'month'
  ): Promise<BusinessPerformance> {
    const response = await api.get(
      `/reports/business-performance?period=${period}`
    );
    return response.data;
  },

  async exportReportData(
    reportType: 'financial_summary' | 'material_usage' | 'expenses',
    startDate: string,
    endDate: string
  ): Promise<Blob> {
    const queryParams = new URLSearchParams();
    queryParams.append('report_type', reportType);
    queryParams.append('start_date', startDate);
    queryParams.append('end_date', endDate);

    const response = await api.get(
      `/reports/export?${queryParams.toString()}`,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  },
};
