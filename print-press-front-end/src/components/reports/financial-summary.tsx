'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { reportsService } from '@/lib/reportsService';
import { MonthlyFinancialSummary } from '@/types/reports';
import { formatCurrency } from '@/lib/utils';
import { isApiError } from '@/lib/api';
import { Download, Calendar } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#AABD77', '#8FA66B', '#6B7A4F', '#4F5A3A', '#3D4530'];

export const FinancialSummary: React.FC = () => {
  const [data, setData] = useState<MonthlyFinancialSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  // Default to current month (same as dashboard "month" period)
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    // First day of current month
    return new Date(date.getFullYear(), date.getMonth(), 1)
      .toISOString()
      .split('T')[0];
  });
  const [endDate, setEndDate] = useState(
    () => new Date().toISOString().split('T')[0]
  );

  const fetchData = useCallback(async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const summary = await reportsService.getFinancialSummary(
        startDate,
        endDate
      );
      setData(summary);
    } catch (err: unknown) {
      console.error('Failed to fetch financial summary:', err);
      if (isApiError(err)) {
        setError(err.error);
      } else {
        setError('Failed to load financial summary');
      }
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = async () => {
    if (!data) return;
    try {
      const blob = await reportsService.exportReportData(
        'financial_summary',
        startDate,
        endDate
      );

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial_summary_${startDate}_to_${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const expenseData = data
    ? [
        { name: 'Materials', value: data.expenses.material_costs },
        { name: 'Waste', value: data.expenses.waste_costs },
        { name: 'Operational', value: data.expenses.operational_costs },
        { name: 'Labor', value: data.expenses.labor_costs },
      ]
    : [];

  const topMaterialsData =
    data?.top_materials.slice(0, 5).map((m) => ({
      name: m.material_name,
      cost: m.total_cost,
      quantity: m.total_quantity,
    })) || [];

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-semibold">Financial Summary</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto_auto] gap-2 items-center">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full"
              />
              <span className="text-gray-500 text-sm text-center hidden sm:block">
                to
              </span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full"
              />
              <Button
                onClick={fetchData}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {loading ? 'Loading...' : 'Generate'}
              </Button>
              {data && (
                <Button
                  onClick={handleExport}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#AABD77]"></div>
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="p-6">
            <div className="text-red-600 text-center">
              <p className="text-lg font-semibold">Error loading report</p>
              <p className="text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {data && !loading && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-gray-600">
                  Revenue (Collected)
                </p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {formatCurrency(data.revenue.total_revenue)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Gross Profit: {formatCurrency(data.revenue.gross_profit)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-gray-600">
                  Total Invoiced
                </p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {formatCurrency(data.cash_flow?.total_invoiced || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Jobs value for period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-gray-600">Amount Owed</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  {formatCurrency(data.cash_flow?.outstanding_amount || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Collection:{' '}
                  {(data.cash_flow?.collection_rate || 0).toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-gray-600">Net Profit</p>
                <p
                  className={`text-2xl font-bold mt-1 ${data.profit.is_profitable ? 'text-green-600' : 'text-red-600'}`}
                >
                  {formatCurrency(data.profit.net_profit)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Margin: {data.profit.profit_margin.toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-gray-600">Total Jobs</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {data.job_stats.total_jobs}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Completed: {data.job_stats.completed_jobs}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Expense Breakdown</h3>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={expenseData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {expenseData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number | undefined) =>
                        value !== undefined ? formatCurrency(value) : '-'
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Top Materials by Cost</h3>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topMaterialsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number | undefined) =>
                        value !== undefined ? formatCurrency(value) : '-'
                      }
                    />
                    <Bar dataKey="cost" fill="#AABD77" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Job Statistics */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Job Statistics</h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Jobs</p>
                  <p className="text-xl font-bold">
                    {data.job_stats.total_jobs}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-xl font-bold text-green-600">
                    {data.job_stats.completed_jobs}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">In Progress</p>
                  <p className="text-xl font-bold text-blue-600">
                    {data.job_stats.in_progress_jobs}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fully Paid</p>
                  <p className="text-xl font-bold text-purple-600">
                    {data.job_stats.fully_paid_jobs}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Average Job Value</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(data.job_stats.average_job_value)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Highest Job Value</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(data.job_stats.highest_job_value)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Material Efficiency</p>
                  <p className="text-xl font-bold">
                    {data.efficiency_metrics.material_efficiency.toFixed(2)}x
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Waste Percentage</p>
                  <p className="text-xl font-bold text-red-600">
                    {data.efficiency_metrics.waste_percentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
