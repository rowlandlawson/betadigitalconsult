'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { api, isApiError } from '@/lib/api';
import { PaymentStats as PaymentStatsType } from '@/types/payments';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, Users, CreditCard, BarChart3 } from 'lucide-react';

export const PaymentStats: React.FC = () => {
  const [stats, setStats] = useState<PaymentStatsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  // Define fetchPaymentStats with useCallback to stabilize the function reference
  const fetchPaymentStats = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<PaymentStatsType>(`/payments/stats?period=${period}`);
      setStats(response.data);
    } catch (err: unknown) {
      console.error('Failed to fetch payment stats:', err);
      if (isApiError(err)) {
        setError(err.error);
      } else {
        setError('Failed to load payment statistics');
      }
    } finally {
      setLoading(false);
    }
  }, [period]); // Add period as dependency

  useEffect(() => {
    fetchPaymentStats();
  }, [fetchPaymentStats]); // Now fetchPaymentStats is stable due to useCallback

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-8 text-red-600">
        {error || 'Failed to load statistics'}
      </div>
    );
  }

  const totalRevenue = stats.payment_stats.reduce((sum, stat) => sum + stat.total_amount, 0);
  const totalPayments = stats.payment_stats.reduce((sum, stat) => sum + stat.payment_count, 0);
  const averagePayment = totalPayments > 0 ? totalRevenue / totalPayments : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Payment Statistics</h2>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as 'daily' | 'weekly' | 'monthly')}
          className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(totalRevenue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Payments</p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalPayments}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Average Payment</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(averagePayment)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Unique Jobs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.payment_stats.reduce((sum, stat) => sum + stat.unique_jobs, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Method Distribution */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Payment Method Distribution</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.method_distribution.map((method) => (
              <div key={method.payment_method} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    method.payment_method === 'cash' 
                      ? 'bg-yellow-100 text-yellow-800'
                      : method.payment_method === 'transfer'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {method.payment_method.toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-600">
                    {method.count} payments
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(method.total_amount)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {((method.total_amount / totalRevenue) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Periods */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Recent {period.charAt(0).toUpperCase() + period.slice(1)} Performance</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.payment_stats.slice(0, 6).map((stat, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">
                    Period: {stat.period}
                  </p>
                  <p className="text-sm text-gray-500">
                    {stat.payment_count} payments • {stat.unique_jobs} jobs • {stat.unique_customers} customers
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-green-600">
                    {formatCurrency(stat.total_amount)}
                  </p>
                  <p className="text-sm text-gray-500">
                    Avg: {formatCurrency(stat.average_payment)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};