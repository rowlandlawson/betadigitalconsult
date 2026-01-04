'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, isApiError } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Plus,
  Briefcase,
  CheckCircle,
  Clock,
  TrendingUp,
  AlertCircle,
  Search,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

interface WorkerStats {
  summary: {
    timestamp: string;
    worker_id: string;
  };
  jobs: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    delivered: number;
    completion_rate: number;
  };
  payments: {
    total_collected: number;
  };
  this_month: {
    jobs: number;
    revenue: number;
  };
  recent_jobs: Array<{
    id: string;
    ticket_id: string;
    description: string;
    status: string;
    total_cost: number;
    created_at: string;
    customer_name: string;
  }>;
  recent_activity: Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    created_at: string;
  }>;
}

export default function WorkerDashboard() {
  const [stats, setStats] = useState<WorkerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [ticketSearch, setTicketSearch] = useState('');
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    fetchWorkerStats();
  }, []);

  const fetchWorkerStats = async () => {
    try {
      const response = await api.get<WorkerStats>('/worker-stats');
      setStats(response.data);
    } catch (err: unknown) {
      console.error('Failed to fetch worker stats:', err);
      if (isApiError(err)) {
        setError(err.error);
      } else {
        setError('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTicketSearch = async () => {
    if (!ticketSearch.trim()) {
      setSearchError('Please enter a ticket ID');
      return;
    }

    try {
      const response = await api.get(`/jobs/ticket/${ticketSearch.trim()}`);
      if (response.data.job) {
        window.location.href = `/worker/jobs/${response.data.job.id}?ticket_id=${ticketSearch.trim()}`;
      }
    } catch {
      setSearchError('Job ticket not found');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-gray-600">
            Monitor your work activity and performance
          </p>
        </div>
        <Link href="/worker/jobs/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Job
          </Button>
        </Link>
      </div>

      {error && (
        <div className="p-4 text-red-600 bg-red-50 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Quick Ticket Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Enter Ticket ID to view any job..."
                value={ticketSearch}
                onChange={(e) => {
                  setTicketSearch(e.target.value);
                  setSearchError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleTicketSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleTicketSearch}>Open Ticket</Button>
          </div>
          {searchError && (
            <p className="text-red-500 text-sm mt-2">{searchError}</p>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Jobs</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats?.jobs.total || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Briefcase className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-green-600">
                  {(stats?.jobs.completed || 0) + (stats?.jobs.delivered || 0)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-3xl font-bold text-blue-600">
                  {stats?.jobs.in_progress || 0}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats?.this_month.revenue || 0)}
                </p>
                <p className="text-xs text-gray-500">
                  {stats?.this_month.jobs || 0} jobs
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Jobs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">My Recent Jobs</CardTitle>
            <Link
              href="/worker/jobs"
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {!stats?.recent_jobs?.length ? (
              <p className="text-gray-500 text-center py-8">No jobs yet</p>
            ) : (
              <div className="space-y-3">
                {stats.recent_jobs.map((job) => (
                  <Link
                    href={`/worker/jobs/${job.id}`}
                    key={job.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {job.ticket_id}
                      </p>
                      <p className="text-sm text-gray-500 truncate max-w-[200px]">
                        {job.description}
                      </p>
                      <p className="text-xs text-gray-400">
                        {job.customer_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}
                      >
                        {job.status.replace('_', ' ')}
                      </span>
                      <p className="text-sm font-semibold text-gray-900 mt-1">
                        {formatCurrency(job.total_cost)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity/Notifications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">My Recent Activity</CardTitle>
            <Link
              href="/worker/notifications"
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {!stats?.recent_activity?.length ? (
              <p className="text-gray-500 text-center py-8">
                No recent activity
              </p>
            ) : (
              <div className="space-y-3">
                {stats.recent_activity.map((activity) => (
                  <div
                    key={activity.id}
                    className={`p-3 border rounded-lg ${activity.is_read ? 'bg-white' : 'bg-blue-50'}`}
                  >
                    <p className="font-medium text-gray-900">
                      {activity.title}
                    </p>
                    <p className="text-sm text-gray-600">{activity.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(activity.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Completion Rate */}
      {stats && stats.jobs.total > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Completion Rate
              </span>
              <span className="text-sm font-bold text-gray-900">
                {stats.jobs.completion_rate}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(stats.jobs.completion_rate, 100)}%`,
                }}
              ></div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
