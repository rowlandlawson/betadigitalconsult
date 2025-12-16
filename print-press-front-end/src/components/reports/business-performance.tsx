'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { reportsService } from '@/lib/reportsService';
import { BusinessPerformance } from '@/types/reports';
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
  const [data, setData] = useState<BusinessPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [period, setPeriod] = useState<'month' | 'week' | 'day'>('month');

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
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
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Business Performance</h3>
            <div className="flex items-center gap-2">
              <Button
                variant={period === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod('month')}
              >
                Monthly
              </Button>
              <Button
                variant={period === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod('week')}
              >
                Weekly
              </Button>
              <Button
                variant={period === 'day' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod('day')}
              >
                Daily
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Average Revenue
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(data.performance_indicators.average_revenue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Customer Growth Rate
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.performance_indicators.customer_growth_rate.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Periods
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.performance_indicators.total_periods}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trends */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Revenue Trends</h3>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
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
        <CardHeader>
          <h3 className="text-lg font-semibold">Customer Trends</h3>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={customerChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="new" fill="#AABD77" name="New Customers" />
              <Bar dataKey="repeat" fill="#8FA66B" name="Repeat Customers" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Efficiency Metrics */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Efficiency Metrics</h3>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={efficiencyChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
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
        <CardHeader>
          <h3 className="text-lg font-semibold">Revenue Trends Details</h3>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Period</th>
                  <th className="text-right p-2">Job Count</th>
                  <th className="text-right p-2">Total Revenue</th>
                  <th className="text-right p-2">Collected Revenue</th>
                  <th className="text-right p-2">Average Job Value</th>
                </tr>
              </thead>
              <tbody>
                {data.revenue_trends.map((item, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">
                      {new Date(item.period).toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="p-2 text-right">{item.job_count}</td>
                    <td className="p-2 text-right font-medium">
                      {formatCurrency(item.total_revenue)}
                    </td>
                    <td className="p-2 text-right">
                      {formatCurrency(item.collected_revenue)}
                    </td>
                    <td className="p-2 text-right">
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
