'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { reportsService } from '@/lib/reportsService';
import { MonthlyFinancialSummary } from '@/types/reports';
import { formatCurrency } from '@/lib/utils';
import { isApiError } from '@/lib/api';
import { Download, Calendar } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#AABD77', '#8FA66B', '#6B7A4F', '#4F5A3A', '#3D4530'];

export const FinancialSummary: React.FC = () => {
  const [data, setData] = useState<MonthlyFinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    fetchData();
  }, [year, month]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const summary = await reportsService.getMonthlyFinancialSummary(
        year,
        month
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
  };

  const handleExport = async () => {
    try {
      const startDate = data?.period.start_date || '';
      const endDate = data?.period.end_date || '';
      const blob = await reportsService.exportReportData(
        'financial_summary',
        startDate,
        endDate
      );

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial_summary_${year}_${month}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#AABD77]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-red-600 text-center">
            <p className="text-lg font-semibold">Error loading report</p>
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const expenseData = [
    { name: 'Materials', value: data.expenses.material_costs },
    { name: 'Waste', value: data.expenses.waste_costs },
    { name: 'Operational', value: data.expenses.operational_costs },
    { name: 'Labor', value: data.expenses.labor_costs },
  ];

  const topMaterialsData = data.top_materials.slice(0, 5).map((m) => ({
    name: m.material_name,
    cost: m.total_cost,
    quantity: m.total_quantity,
  }));

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Calendar className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-semibold">
                {data.period.month_name} {data.period.year}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-24"
                min="2020"
                max="2100"
              />
              <Input
                type="number"
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="w-20"
                min="1"
                max="12"
              />
              <Button onClick={handleExport} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-600">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(data.revenue.total_revenue)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Gross Profit: {formatCurrency(data.revenue.gross_profit)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-600">Total Expenses</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(data.expenses.total_expenses)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Materials: {formatCurrency(data.expenses.material_costs)}
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
                    `${name} ${(percent * 100).toFixed(0)}%`
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
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
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
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
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
              <p className="text-xl font-bold">{data.job_stats.total_jobs}</p>
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
    </div>
  );
};
