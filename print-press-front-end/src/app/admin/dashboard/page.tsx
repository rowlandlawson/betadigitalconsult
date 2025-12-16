'use client';

import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api, dashboardApi, DashboardStats } from '@/lib/api';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  AlertTriangle,
  DollarSign,
  CheckCircle,
  Clock,
  BarChart3,
  RefreshCw,
  ShoppingBag,
  FileText,
} from 'lucide-react';
import Link from 'next/link';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Type for individual stat card
interface StatCard {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
  description: string;
  link?: string;
}

// Add missing utility functions
const calculatePercentageChange = (
  current: number,
  previous: number
): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    completed: 'bg-green-100 text-green-800',
    in_progress: 'bg-blue-100 text-blue-800',
    pending: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<string>(
    new Date().toISOString()
  );
  const [period, setPeriod] = useState('month');

  const fetchDashboardStats = async (currentPeriod: string) => {
    setLoading(true);
    setError('');

    try {
      console.log(`Fetching dashboard statistics for period: ${currentPeriod}`);
      const data = await dashboardApi.getDashboardStats(currentPeriod);
      console.log('Dashboard data received:', data);

      setStats(data);
      setLastUpdated(formatDateTime(data.summary.updated_at));
    } catch (err: unknown) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats(period);
  }, [period]);

  useEffect(() => {
    const interval = setInterval(
      () => fetchDashboardStats(period),
      5 * 60 * 1000
    );
    return () => clearInterval(interval);
  }, [period]);

  // Prepare stat cards data
  const getStatCards = (): StatCard[] => {
    if (!stats) return [];

    return [
      {
        title: 'Total Revenue',
        value: formatCurrency(stats.payments.total_revenue),
        change: stats.performance_metrics.monthly_revenue_growth,
        icon: <DollarSign className="h-5 w-5" />,
        color: 'bg-blue-100 text-blue-600',
        description: 'Total revenue generated',
        link: '/admin/payments',
      },
      {
        title: 'Total Jobs',
        value: stats.jobs.total,
        icon: <Package className="h-5 w-5" />,
        color: 'bg-green-100 text-green-600',
        description: `${stats.jobs.completed} completed, ${stats.jobs.active} active`,
        link: '/admin/jobs',
      },
      {
        title: 'Active Customers',
        value: stats.customers.total,
        change: stats.customers.growth_rate,
        icon: <Users className="h-5 w-5" />,
        color: 'bg-purple-100 text-purple-600',
        description: `${stats.customers.new_this_month} new this month`,
        link: '/admin/customers',
      },
      {
        title: 'Stock Alerts',
        value: stats.inventory.low_stock + stats.inventory.critical_stock,
        icon: <AlertTriangle className="h-5 w-5" />,
        color:
          stats.inventory.critical_stock > 0
            ? 'bg-red-100 text-red-600'
            : stats.inventory.low_stock > 0
              ? 'bg-yellow-100 text-yellow-600'
              : 'bg-green-100 text-green-600',
        description: `${stats.inventory.critical_stock} critical, ${stats.inventory.low_stock} low`,
        link: '/admin/inventory/alerts',
      },
      {
        title: 'Completed Jobs',
        value: stats.jobs.completed,
        change: stats.jobs.completion_rate,
        icon: <CheckCircle className="h-5 w-5" />,
        color: 'bg-emerald-100 text-emerald-600',
        description: `${stats.jobs.completion_rate.toFixed(1)}% completion rate`,
        link: '/admin/jobs?status=completed',
      },
      {
        title: 'Outstanding Payments',
        value: formatCurrency(stats.payments.total_outstanding),
        icon: <Clock className="h-5 w-5" />,
        color: 'bg-orange-100 text-orange-600',
        description: `${stats.payments.collection_rate.toFixed(1)}% collection rate`,
        link: '/admin/payments?status=unpaid',
      },
    ];
  };

  const renderStatCard = (stat: StatCard) => {
    const cardContent = (
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-2 rounded-lg ${stat.color}`}>{stat.icon}</div>
          {stat.change !== undefined && (
            <div
              className={`flex items-center text-sm ${stat.change >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {stat.change >= 0 ? (
                <TrendingUp className="h-4 w-4 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-1" />
              )}
              {Math.abs(stat.change).toFixed(1)}%
            </div>
          )}
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
        <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
        <p className="text-xs text-gray-500">{stat.description}</p>
      </div>
    );

    return stat.link ? (
      <Link href={stat.link}>
        <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
          {cardContent}
        </Card>
      </Link>
    ) : (
      <Card className="h-full">{cardContent}</Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">
              Welcome to your print management dashboard
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats && error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">
              Welcome to your print management dashboard
            </p>
          </div>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
              <div>
                <h3 className="font-semibold text-red-800">
                  Unable to load dashboard
                </h3>
                <p className="text-red-700">{error}</p>
                <Button
                  onClick={() => fetchDashboardStats(period)}
                  variant="outline"
                  className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">
            Welcome to your print management dashboard
          </p>
          {lastUpdated && (
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {lastUpdated}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => fetchDashboardStats(period)}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="year">Year</SelectItem>
            </SelectContent>
          </Select>
          <Link href="/admin/reports">
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              View Reports
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {getStatCards().map((stat, index) => (
          <div key={index}>{renderStatCard(stat)}</div>
        ))}
      </div>

      {/* Charts and Detailed Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>Latest jobs and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recent_activities &&
              stats.recent_activities.length > 0 ? (
                stats.recent_activities.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(activity.status)}`}
                        >
                          {activity.status.replace('_', ' ')}
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {activity.ticket_id}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {activity.customer_name} •{' '}
                        {formatDate(activity.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(activity.total_cost)}
                      </p>
                      <p
                        className={`text-xs ${activity.balance > 0 ? 'text-red-600' : 'text-green-600'}`}
                      >
                        {activity.balance > 0
                          ? `Owing: ${formatCurrency(activity.balance)}`
                          : 'Paid'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No recent activities
                </p>
              )}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Link href="/admin/jobs">
                <Button variant="ghost" size="sm" className="w-full">
                  View All Jobs
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Top Customers & Quick Actions */}
        <div className="space-y-6">
          {/* Top Customers */}
          <Card>
            <CardHeader>
              <CardTitle>Top Customers</CardTitle>
              <CardDescription>By total paid</CardDescription>{' '}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.top_customers && stats.top_customers.length > 0 ? (
                  stats.top_customers.map((customer, index) => (
                    <div
                      key={customer.id}
                      className="flex items-center justify-between p-3 border border-gray-100 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                          <Users className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {customer.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {customer.contact_person}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {formatCurrency(customer.total_paid)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {customer.total_jobs} jobs
                        </p>{' '}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    No customer data available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/admin/jobs/create">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Create New Job
                </Button>
              </Link>
              <Link href="/admin/inventory/create">
                <Button variant="outline" className="w-full justify-start">
                  <Package className="h-4 w-4 mr-2" />
                  Add Inventory Item
                </Button>
              </Link>
              <Link href="/admin/payments/record">
                <Button variant="outline" className="w-full justify-start">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              </Link>
              <Link href="/admin/customers/create">
                <Button variant="outline" className="w-full justify-start">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Add New Customer
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Performance Metrics Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {stats?.performance_metrics.monthly_revenue_growth.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">Revenue Growth</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {stats?.performance_metrics.job_completion_rate.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">Job Completion</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {stats?.performance_metrics.payment_collection_rate.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">Payment Collection</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {stats?.performance_metrics.inventory_health.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">Inventory Health</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
