// components/jobs/job-list.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { jobService } from '@/lib/jobService';
import { isApiError } from '@/lib/api';
import { Job, PaginatedJobsResponse } from '@/types/jobs';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Search, Plus, Filter, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface JobListProps {
  userRole: 'admin' | 'worker';
}

export const JobList: React.FC<JobListProps> = ({ userRole }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  const fetchJobs = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const response: PaginatedJobsResponse = await jobService.getAllJobs({
          page,
          limit: pagination.limit,
          status: statusFilter,
          search: searchTerm,
        });

        setJobs(response.jobs);
        setPagination(response.pagination);
      } catch (err: unknown) {
        console.error('Failed to fetch jobs:', err);
        if (isApiError(err)) {
          setError(err.error);
        } else {
          setError('Failed to load jobs');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [statusFilter, searchTerm, pagination.limit]
  );

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchJobs(pagination.page);
  };

  const handleTicketSearch = async (ticketId: string) => {
    if (!ticketId.trim()) return;
    try {
      setLoading(true);
      const job = await jobService.getJobByTicketId(ticketId.trim());
      if (job && job.id) {
        // Redirect to job detail with ticket_id param
        window.location.href = `/${userRole}/jobs/${job.id}?ticket_id=${ticketId.trim()}`;
      } else {
        setError('Job ticket not found');
      }
    } catch (err) {
      console.error('Ticket search error:', err);
      setError('Job ticket not found or access denied');
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchJobs(1);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, fetchJobs]);

  const filteredJobs = jobs.filter(
    (job) =>
      job.ticket_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: Job['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: Job['payment_status']) => {
    switch (status) {
      case 'fully_paid':
        return 'bg-green-100 text-green-800';
      case 'partially_paid':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  if (loading && !refreshing) {
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
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-gray-600">Manage and track all printing jobs</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          {userRole === 'worker' && (
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <Input
                  placeholder="Enter Ticket ID..."
                  id="ticket-search"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value;
                      if (val) handleTicketSearch(val);
                    }
                  }}
                />
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  const el = document.getElementById(
                    'ticket-search'
                  ) as HTMLInputElement;
                  if (el && el.value) handleTicketSearch(el.value);
                }}
              >
                Open Ticket
              </Button>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              size="sm"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
            {userRole === 'admin' && (
              <Link href="/admin/jobs/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Job
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 text-red-600 bg-red-50 rounded-lg">{error}</div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search jobs by ticket ID, description, or customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jobs List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">
              {userRole === 'admin' ? 'All Jobs' : 'My Jobs'} (
              {filteredJobs.length})
            </h3>
            {pagination.total > 0 && (
              <span className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredJobs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No jobs found</p>
              {userRole === 'admin' && (
                <Link href="/admin/jobs/create" className="mt-4 inline-block">
                  <Button>Create Your First Job</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-semibold text-gray-900">
                        {job.ticket_id}
                      </h4>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}
                      >
                        {job.status.replace('_', ' ')}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(job.payment_status)}`}
                      >
                        {job.payment_status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {job.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                      <span>Customer: {job.customer_name}</span>
                      {userRole === 'admin' && job.worker_name && (
                        <span className="text-blue-600 font-medium">
                          Worker: {job.worker_name}
                        </span>
                      )}
                      <span>Requested: {formatDate(job.date_requested)}</span>
                      {job.delivery_deadline && (
                        <span>
                          Deadline: {formatDate(job.delivery_deadline)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 mt-4 sm:mt-0">
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(job.total_cost)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Paid: {formatCurrency(job.amount_paid)}
                      </p>
                      <p
                        className={`text-sm font-medium ${
                          job.balance > 0 ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        Balance: {formatCurrency(job.balance)}
                      </p>
                    </div>
                    <Link href={`/${userRole}/jobs/${job.id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => fetchJobs(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => fetchJobs(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
