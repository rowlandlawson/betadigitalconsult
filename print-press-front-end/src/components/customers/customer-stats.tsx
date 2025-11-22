'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { api, isApiError } from '@/lib/api';
import { CustomerStats as CustomerStatsType } from '@/types/customers';
import { formatCurrency } from '@/lib/utils';
import { Users, TrendingUp, Star, Award } from 'lucide-react';

export const CustomerStats: React.FC = () => {
  const [stats, setStats] = useState<CustomerStatsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchCustomerStats();
  }, []);

  const fetchCustomerStats = async () => {
    try {
      const response = await api.get<CustomerStatsType>('/customers/customers-stats');
      setStats(response.data);
    } catch (err: unknown) {
      console.error('Failed to fetch customer stats:', err);
      if (isApiError(err)) {
        setError(err.error);
      } else {
        setError('Failed to load customer statistics');
      }
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customer Analytics</h1>
        <p className="text-gray-600">Insights into your customer base and performance</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.stats.total_customers}
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
                <p className="text-sm font-medium text-gray-600">Active Customers</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.stats.active_customers}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Star className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Repeat Customers</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.stats.repeat_customers}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Award className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Highest Spender</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats.stats.highest_spending)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Metrics */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Customer Metrics</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Average Jobs per Customer</span>
                <span className="font-semibold text-gray-900">
                  {stats.stats.avg_jobs_per_customer.toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Average Spend per Customer</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(stats.stats.avg_spent_per_customer)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Avg. Spend (Active Customers)</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(stats.stats.avg_spent_per_active_customer)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Customer Retention Rate</span>
                <span className="font-semibold text-blue-600">
                  {stats.stats.total_customers > 0 ? ((stats.stats.repeat_customers / stats.stats.total_customers) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">New Customer Rate</span>
                <span className="font-semibold text-purple-600">
                  {stats.stats.total_customers > 0 ? (((stats.stats.total_customers - stats.stats.active_customers) / stats.stats.total_customers) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Top Customers</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.top_customers.map((customer, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-blue-600">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{customer.name}</p>
                      <p className="text-sm text-gray-500">{customer.total_jobs_count} jobs</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      {formatCurrency(customer.total_amount_spent)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatCurrency(customer.total_amount_spent / customer.total_jobs_count)} avg.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Segmentation */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Customer Segmentation</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Award className="h-6 w-6 text-purple-600" />
              </div>
              <p className="font-semibold text-purple-900">Repeat Customers</p>
              <p className="text-2xl font-bold text-purple-600">
                {stats.stats.repeat_customers}
              </p>
              <p className="text-sm text-purple-500">6+ jobs</p>
            </div>

            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Star className="h-6 w-6 text-blue-600" />
              </div>
              <p className="font-semibold text-blue-900">Regular Customers</p>
              <p className="text-2xl font-bold text-blue-600">
                {stats.stats.active_customers - stats.stats.repeat_customers}
              </p>
              <p className="text-sm text-blue-500">1-5 jobs</p>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <p className="font-semibold text-green-900">New Customers</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.stats.total_customers - stats.stats.active_customers}
              </p>
              <p className="text-sm text-green-500">0 jobs</p>
            </div>

            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
              <p className="font-semibold text-orange-900">Active Rate</p>
              <p className="text-2xl font-bold text-orange-600">
                {stats.stats.total_customers > 0 ? 
                  Math.round((stats.stats.active_customers / stats.stats.total_customers) * 100) : 0
                }%
              </p>
              <p className="text-sm text-orange-500">With 1+ jobs</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};