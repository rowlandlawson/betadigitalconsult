'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { reportsService } from '@/lib/reportsService';
import { ProfitLossStatement } from '@/types/reports';
import { formatCurrency, formatDate } from '@/lib/utils';
import { isApiError } from '@/lib/api';
import { Download, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

const ITEMS_PER_PAGE = 10;

export const ProfitLoss: React.FC = () => {
  const [data, setData] = useState<ProfitLossStatement | null>(null);
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

  // Pagination states
  const [revenueCurrentPage, setRevenueCurrentPage] = useState(1);
  const [expenseCurrentPage, setExpenseCurrentPage] = useState(1);

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
      // Reset pagination when new data is loaded
      setRevenueCurrentPage(1);
      setExpenseCurrentPage(1);
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
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-semibold">Profit & Loss Statement</h3>
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
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
            <Card className="min-w-0">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                  Revenue (Collected)
                </p>
                <p className="text-base sm:text-lg lg:text-2xl font-bold text-green-600 mt-1 break-words">
                  {formatCurrency(data.summary.total_revenue)}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-1">
                  Payments received
                </p>
              </CardContent>
            </Card>

            <Card className="min-w-0">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                  Total Invoiced
                </p>
                <p className="text-base sm:text-lg lg:text-2xl font-bold text-blue-600 mt-1 break-words">
                  {formatCurrency(data.summary.total_invoiced || 0)}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-1">
                  Jobs value in period
                </p>
              </CardContent>
            </Card>

            <Card className="min-w-0">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                  Amount Owed
                </p>
                <p className="text-base sm:text-lg lg:text-2xl font-bold text-orange-600 mt-1 break-words">
                  {formatCurrency(data.summary.outstanding_amount || 0)}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-1">
                  All time balance
                </p>
              </CardContent>
            </Card>

            <Card className="min-w-0">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                  Gross Profit
                </p>
                <p className="text-base sm:text-lg lg:text-2xl font-bold text-blue-600 mt-1 break-words">
                  {formatCurrency(data.summary.gross_profit)}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                  Margin: {data.summary.gross_profit_margin.toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            <Card className="min-w-0">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                  Operating Expenses
                </p>
                <p className="text-base sm:text-lg lg:text-2xl font-bold text-red-600 mt-1 break-words">
                  {formatCurrency(data.summary.total_expenses)}
                </p>
              </CardContent>
            </Card>

            <Card className="min-w-0">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                  Net Profit
                </p>
                <p
                  className={`text-base sm:text-lg lg:text-2xl font-bold mt-1 break-words ${data.summary.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {formatCurrency(data.summary.net_profit)}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                  Margin: {data.summary.profit_margin.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Explanatory Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-blue-800">
              <strong>Note:</strong> Revenue (Collected) shows actual payments
              received in this period, which may include payments for jobs
              created before this period. Total Invoiced shows the value of jobs
              created within this period.
            </p>
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
          {(() => {
            const totalRevenuePages = Math.ceil(
              data.revenue_breakdown.length / ITEMS_PER_PAGE
            );
            const revenueStartIndex = (revenueCurrentPage - 1) * ITEMS_PER_PAGE;
            const paginatedRevenue = data.revenue_breakdown.slice(
              revenueStartIndex,
              revenueStartIndex + ITEMS_PER_PAGE
            );

            return (
              <Card>
                <CardHeader className="pb-2 sm:pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <h3 className="text-base sm:text-lg font-semibold">
                      Revenue Breakdown
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500">
                      Showing {revenueStartIndex + 1}-
                      {Math.min(
                        revenueStartIndex + ITEMS_PER_PAGE,
                        data.revenue_breakdown.length
                      )}{' '}
                      of {data.revenue_breakdown.length} jobs
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="p-2 sm:p-6">
                  <div className="overflow-x-auto -mx-2 sm:mx-0">
                    <table className="w-full text-xs sm:text-sm min-w-[600px]">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left p-2 whitespace-nowrap">
                            Ticket ID
                          </th>
                          <th className="text-left p-2 hidden md:table-cell">
                            Description
                          </th>
                          <th className="text-left p-2 hidden sm:table-cell">
                            Customer
                          </th>
                          <th className="text-right p-2 whitespace-nowrap">
                            Revenue
                          </th>
                          <th className="text-right p-2">Payments</th>
                          <th className="text-left p-2 hidden lg:table-cell">
                            Date
                          </th>
                          <th className="text-left p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedRevenue.map((item, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="p-2 font-medium whitespace-nowrap">
                              {item.ticket_id}
                            </td>
                            <td className="p-2 hidden md:table-cell max-w-[200px] truncate">
                              {item.description}
                            </td>
                            <td className="p-2 hidden sm:table-cell">
                              {item.customer_name || 'N/A'}
                            </td>
                            <td className="p-2 text-right font-medium whitespace-nowrap">
                              {formatCurrency(item.revenue)}
                            </td>
                            <td className="p-2 text-right">
                              <div className="flex flex-col">
                                <span className="text-green-600 text-xs sm:text-sm">
                                  {formatCurrency(item.payments_received || 0)}
                                </span>
                                <span className="text-red-500 text-[10px] sm:text-xs">
                                  Due: {formatCurrency(item.outstanding || 0)}
                                </span>
                              </div>
                            </td>
                            <td className="p-2 hidden lg:table-cell whitespace-nowrap">
                              {formatDate(item.payment_date)}
                            </td>
                            <td className="p-2">
                              <span
                                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs whitespace-nowrap ${
                                  item.status === 'completed'
                                    ? 'bg-green-100 text-green-800'
                                    : item.status === 'delivered'
                                      ? 'bg-blue-100 text-blue-800'
                                      : item.status === 'in_progress'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {data.revenue_breakdown.length > 0 && (
                        <tfoot>
                          <tr className="bg-gray-50 font-medium">
                            <td className="p-2" colSpan={3}>
                              Total
                            </td>
                            <td className="p-2 text-right">
                              {formatCurrency(
                                data.summary.total_invoiced ||
                                  data.revenue_breakdown.reduce(
                                    (sum, item) => sum + item.revenue,
                                    0
                                  )
                              )}
                            </td>
                            <td className="p-2 text-right">
                              <div className="flex flex-col">
                                <span className="text-green-600">
                                  {formatCurrency(data.summary.total_revenue)}
                                </span>
                                <span className="text-red-500 text-xs">
                                  {formatCurrency(
                                    data.summary.outstanding_amount || 0
                                  )}
                                </span>
                              </div>
                            </td>
                            <td className="p-2" colSpan={2}></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  {totalRevenuePages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-4 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setRevenueCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={revenueCurrentPage === 1}
                        className="w-full sm:w-auto text-xs sm:text-sm"
                      >
                        <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />{' '}
                        Previous
                      </Button>
                      <span className="text-xs sm:text-sm text-gray-600">
                        Page {revenueCurrentPage} of {totalRevenuePages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setRevenueCurrentPage((p) =>
                            Math.min(totalRevenuePages, p + 1)
                          )
                        }
                        disabled={revenueCurrentPage === totalRevenuePages}
                        className="w-full sm:w-auto text-xs sm:text-sm"
                      >
                        Next{' '}
                        <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          {/* Expense Breakdown Table */}
          {(() => {
            const totalExpensePages = Math.ceil(
              data.expense_breakdown.length / ITEMS_PER_PAGE
            );
            const expenseStartIndex = (expenseCurrentPage - 1) * ITEMS_PER_PAGE;
            const paginatedExpenses = data.expense_breakdown.slice(
              expenseStartIndex,
              expenseStartIndex + ITEMS_PER_PAGE
            );

            return (
              <Card>
                <CardHeader className="pb-2 sm:pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <h3 className="text-base sm:text-lg font-semibold">
                      Expense Breakdown
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500">
                      Showing {expenseStartIndex + 1}-
                      {Math.min(
                        expenseStartIndex + ITEMS_PER_PAGE,
                        data.expense_breakdown.length
                      )}{' '}
                      of {data.expense_breakdown.length} expenses
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="p-2 sm:p-6">
                  <div className="overflow-x-auto -mx-2 sm:mx-0">
                    <table className="w-full text-xs sm:text-sm min-w-[400px]">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left p-2 whitespace-nowrap">
                            Category
                          </th>
                          <th className="text-left p-2">Description</th>
                          <th className="text-right p-2 whitespace-nowrap">
                            Amount
                          </th>
                          <th className="text-left p-2 hidden sm:table-cell">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedExpenses.map((item, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="p-2 font-medium whitespace-nowrap">
                              {item.category}
                            </td>
                            <td className="p-2 max-w-[150px] sm:max-w-none truncate">
                              {item.description}
                            </td>
                            <td className="p-2 text-right font-medium text-red-600 whitespace-nowrap">
                              {formatCurrency(item.amount)}
                            </td>
                            <td className="p-2 hidden sm:table-cell whitespace-nowrap">
                              {formatDate(item.date)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {data.expense_breakdown.length > 0 && (
                        <tfoot>
                          <tr className="bg-gray-50 font-medium">
                            <td className="p-2" colSpan={2}>
                              Total Expenses
                            </td>
                            <td className="p-2 text-right text-red-600 whitespace-nowrap">
                              {formatCurrency(data.summary.total_expenses)}
                            </td>
                            <td className="p-2 hidden sm:table-cell"></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  {totalExpensePages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-4 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setExpenseCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={expenseCurrentPage === 1}
                        className="w-full sm:w-auto text-xs sm:text-sm"
                      >
                        <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />{' '}
                        Previous
                      </Button>
                      <span className="text-xs sm:text-sm text-gray-600">
                        Page {expenseCurrentPage} of {totalExpensePages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setExpenseCurrentPage((p) =>
                            Math.min(totalExpensePages, p + 1)
                          )
                        }
                        disabled={expenseCurrentPage === totalExpensePages}
                        className="w-full sm:w-auto text-xs sm:text-sm"
                      >
                        Next{' '}
                        <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}
        </>
      )}
    </div>
  );
};
