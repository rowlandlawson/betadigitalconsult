'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { reportsService } from '@/lib/reportsService';
import type { BusinessPerformance as BusinessPerformanceType } from '@/types/reports';
import { formatCurrency } from '@/lib/utils';
import { isApiError } from '@/lib/api';
import { TrendingUp, Users, Briefcase } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export const BusinessPerformance: React.FC = () => {
  const [data, setData] = useState<BusinessPerformanceType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [period, setPeriod] = useState<'month' | 'week' | 'day'>('month');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const performance = await reportsService.getBusinessPerformance(period);
      setData(performance);
    } catch (err: unknown) {
      console.error('Failed to fetch business performance:', err);
      if (isApiError(err)) {
        setError(err.error);
      } else {
        setError('Failed to load business performance data');
      }
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const revenueChartData = data.revenue_trends.map((item) => ({
    period: new Date(item.period).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    }),
    revenue: parseFloat(item.total_revenue.toString()),
    collected: parseFloat(item.collected_revenue.toString()),
  }));

  const customerChartData = data.customer_trends.map((item) => ({
    period: new Date(item.period).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    }),
    new: item.new_customers,
    repeat: item.repeat_customers,
  }));

  const efficiencyChartData = data.efficiency_metrics.map((item) => ({
    period: new Date(item.period).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    }),
    completionRate: parseFloat(item.completion_rate.toString()),
    avgHours: parseFloat(item.avg_completion_hours.toString()),
  }));

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <Card>
        <CardHeader className="pb-2 sm:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-base sm:text-lg font-semibold">
              Business Performance
            </h3>
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant={period === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod('month')}
                className="text-xs sm:text-sm px-2 sm:px-3"
              >
                Monthly
              </Button>
              <Button
                variant={period === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod('week')}
                className="text-xs sm:text-sm px-2 sm:px-3"
              >
                Weekly
              </Button>
              <Button
                variant={period === 'day' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod('day')}
                className="text-xs sm:text-sm px-2 sm:px-3"
              >
                Daily
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Performance Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <Card className="min-w-0">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                  Average Revenue
                </p>
                <p className="text-base sm:text-lg lg:text-2xl font-bold text-gray-900 break-words">
                  {formatCurrency(data.performance_indicators.average_revenue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                  Customer Growth
                </p>
                <p className="text-base sm:text-lg lg:text-2xl font-bold text-gray-900 break-words">
                  {data.performance_indicators.customer_growth_rate.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                  Total Periods
                </p>
                <p className="text-base sm:text-lg lg:text-2xl font-bold text-gray-900 break-words">
                  {data.performance_indicators.total_periods}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trends */}
      <Card>
        <CardHeader className="pb-2 sm:pb-4">
          <h3 className="text-base sm:text-lg font-semibold">Revenue Trends</h3>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={revenueChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(value: number | undefined) =>
                  value !== undefined ? formatCurrency(value) : '-'
                }
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#AABD77"
                strokeWidth={2}
                name="Total Revenue"
              />
              <Line
                type="monotone"
                dataKey="collected"
                stroke="#8FA66B"
                strokeWidth={2}
                name="Collected Revenue"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Customer Trends */}
      <Card>
        <CardHeader className="pb-2 sm:pb-4">
          <h3 className="text-base sm:text-lg font-semibold">
            Customer Trends
          </h3>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={customerChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="new" fill="#AABD77" name="New Customers" />
              <Bar dataKey="repeat" fill="#8FA66B" name="Repeat Customers" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Efficiency Metrics */}
      <Card>
        <CardHeader className="pb-2 sm:pb-4">
          <h3 className="text-base sm:text-lg font-semibold">
            Efficiency Metrics
          </h3>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={efficiencyChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10 }}
              />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="completionRate"
                stroke="#AABD77"
                strokeWidth={2}
                name="Completion Rate (%)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avgHours"
                stroke="#ef4444"
                strokeWidth={2}
                name="Avg Completion Hours"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Revenue Trends Table */}
      <Card>
        <CardHeader className="pb-2 sm:pb-4">
          <h3 className="text-base sm:text-lg font-semibold">
            Revenue Trends Details
          </h3>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="w-full text-xs sm:text-sm min-w-[400px]">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-2 whitespace-nowrap">Period</th>
                  <th className="text-right p-2">Jobs</th>
                  <th className="text-right p-2 whitespace-nowrap">Revenue</th>
                  <th className="text-right p-2 hidden sm:table-cell">
                    Collected
                  </th>
                  <th className="text-right p-2 hidden md:table-cell">
                    Avg Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.revenue_trends.map((item, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium whitespace-nowrap">
                      {new Date(item.period).toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="p-2 text-right">{item.job_count}</td>
                    <td className="p-2 text-right font-medium whitespace-nowrap">
                      {formatCurrency(item.total_revenue)}
                    </td>
                    <td className="p-2 text-right hidden sm:table-cell whitespace-nowrap">
                      {formatCurrency(item.collected_revenue)}
                    </td>
                    <td className="p-2 text-right hidden md:table-cell whitespace-nowrap">
                      {formatCurrency(item.average_job_value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
