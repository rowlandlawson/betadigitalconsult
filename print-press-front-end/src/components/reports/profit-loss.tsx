'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { reportsService } from '@/lib/reportsService';
import { ProfitLossStatement } from '@/types/reports';
import { formatCurrency, formatDate } from '@/lib/utils';
import { isApiError } from '@/lib/api';
import { Download, Calendar } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

export const ProfitLoss: React.FC = () => {
  const [data, setData] = useState<ProfitLossStatement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
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
      const statement = await reportsService.getProfitLossStatement(
        startDate,
        endDate
      );
      setData(statement);
    } catch (err: unknown) {
      console.error('Failed to fetch profit/loss statement:', err);
      if (isApiError(err)) {
        setError(err.error);
      } else {
        setError('Failed to load profit/loss statement');
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
      a.download = `profit_loss_${startDate}_to_${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const chartData =
    data?.revenue_breakdown.slice(0, 10).map((item) => ({
      name: item.ticket_id,
      revenue: item.revenue,
    })) || [];

  const expenseByCategory =
    data?.expense_breakdown.reduce(
      (acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + item.amount;
        return acc;
      },
      {} as Record<string, number>
    ) || {};

  const expenseChartData = Object.entries(expenseByCategory).map(
    ([category, amount]) => ({
      category,
      amount,
    })
  );

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Calendar className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-semibold">Profit & Loss Statement</h3>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
              <span className="text-gray-500">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
              <Button onClick={fetchData} disabled={loading}>
                {loading ? 'Loading...' : 'Generate Report'}
              </Button>
              {data && (
                <Button onClick={handleExport} variant="outline" size="sm">
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
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-gray-600">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {formatCurrency(data.summary.total_revenue)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-gray-600">
                  Material Costs
                </p>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  {formatCurrency(data.summary.material_costs)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-gray-600">
                  Gross Profit
                </p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {formatCurrency(data.summary.gross_profit)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Margin: {data.summary.gross_profit_margin.toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-gray-600">
                  Operating Expenses
                </p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {formatCurrency(data.summary.total_expenses)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-gray-600">Net Profit</p>
                <p
                  className={`text-2xl font-bold mt-1 ${data.summary.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {formatCurrency(data.summary.net_profit)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Margin: {data.summary.profit_margin.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Top Revenue Sources</h3>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
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
                    <Bar dataKey="revenue" fill="#AABD77" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Expenses by Category</h3>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={expenseChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number | undefined) =>
                        value !== undefined ? formatCurrency(value) : '-'
                      }
                    />
                    <Bar dataKey="amount" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Breakdown Table */}
          {/* Revenue Breakdown Table */}
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-semibold">Revenue Breakdown</h3>
      <p className="text-sm text-gray-500">
        Showing {data.revenue_breakdown.length} jobs
      </p>
    </div>
  </CardHeader>
  <CardContent>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">Ticket ID</th>
            <th className="text-left p-2">Description</th>
            <th className="text-left p-2">Customer</th>
            <th className="text-right p-2">Revenue</th>
            <th className="text-right p-2">Payments</th>
            <th className="text-left p-2">Date</th>
            <th className="text-left p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.revenue_breakdown.map((item, idx) => (
            <tr key={idx} className="border-b hover:bg-gray-50">
              <td className="p-2 font-medium">{item.ticket_id}</td>
              <td className="p-2">{item.description}</td>
              <td className="p-2">{item.customer_name || 'N/A'}</td>
              <td className="p-2 text-right font-medium">
                {formatCurrency(item.revenue)}
              </td>
              <td className="p-2 text-right text-sm">
                <div className="flex flex-col">
                  <span className="text-green-600">
                    Paid: {formatCurrency(item.payments_received || 0)}
                  </span>
                  <span className="text-red-500 text-xs">
                    Due: {formatCurrency(item.outstanding || 0)}
                  </span>
                </div>
              </td>
              <td className="p-2">{formatDate(item.payment_date)}</td>
              <td className="p-2">
                <span className={`px-2 py-1 rounded text-xs ${
                  item.status === 'completed' 
                    ? 'bg-green-100 text-green-800' 
                    : item.status === 'delivered'
                    ? 'bg-blue-100 text-blue-800'
                    : item.status === 'in_progress'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {item.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
        {/* Optional: Add summary footer */}
        {data.revenue_breakdown.length > 0 && (
          <tfoot>
            <tr className="bg-gray-50 font-medium">
              <td className="p-2" colSpan={3}>Total</td>
              <td className="p-2 text-right">
                {formatCurrency(data.summary.total_revenue)}
              </td>
              <td className="p-2 text-right">
                <div className="flex flex-col">
                  <span className="text-green-600">
                    {formatCurrency(data.revenue_breakdown.reduce((sum, item) => sum + (item.payments_received || 0), 0))}
                  </span>
                  <span className="text-red-500 text-xs">
                    {formatCurrency(data.revenue_breakdown.reduce((sum, item) => sum + (item.outstanding || 0), 0))}
                  </span>
                </div>
              </td>
              <td className="p-2" colSpan={2}></td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  </CardContent>
</Card>

          {/* Expense Breakdown Table */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Expense Breakdown</h3>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Category</th>
                      <th className="text-left p-2">Description</th>
                      <th className="text-right p-2">Amount</th>
                      <th className="text-left p-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.expense_breakdown.map((item, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{item.category}</td>
                        <td className="p-2">{item.description}</td>
                        <td className="p-2 text-right font-medium text-red-600">
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="p-2">{formatDate(item.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
