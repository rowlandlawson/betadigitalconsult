'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api, isApiError } from '@/lib/api';
import { CustomerWithDetails, CustomerJob } from '@/types/customers';
import { formatDate } from '@/lib/utils';
import {
  Users,
  Phone,
  Mail,
  Calendar,
  Package,
  ArrowLeft,
  ChevronLeft,
  Briefcase,
} from 'lucide-react';
import Link from 'next/link';

interface WorkerCustomerDetailProps {
  customerId: string;
}

interface CustomerDetailResponse {
  customer: CustomerWithDetails;
  jobs: CustomerJob[];
}

export const WorkerCustomerDetail: React.FC<WorkerCustomerDetailProps> = ({
  customerId,
}) => {
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchCustomerDetail = async () => {
      try {
        const response = await api.get<CustomerDetailResponse>(
          `/customers/customers/${customerId}`
        );
        setCustomer({
          ...response.data.customer,
          jobs: response.data.jobs || [],
        });
      } catch (err: unknown) {
        console.error('Failed to fetch customer details:', err);
        if (isApiError(err)) {
          setError(err.error);
        } else {
          setError('Failed to load customer details');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerDetail();
  }, [customerId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
        return 'bg-purple-100 text-purple-800';
      case 'not_started':
        return 'bg-yellow-100 text-yellow-800';
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

  if (error || !customer) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error || 'Customer not found'}</p>
        <Button onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-0">
      {/* Back Button - Mobile First */}
      <div className="flex items-center space-x-2 mb-4 md:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="px-3"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="h-6 border-l border-gray-300"></div>
        <h1 className="text-lg font-semibold text-gray-900 truncate">
          {customer.name}
        </h1>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3 md:space-x-4">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <Users className="h-5 w-5 md:h-8 md:w-8 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">
              {customer.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {customer.total_jobs_count > 5 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Frequent Customer
                </span>
              )}
              <span className="text-sm text-gray-500">
                {customer.total_jobs_count} jobs
              </span>
            </div>
          </div>
        </div>
        <div className="hidden md:block">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 text-red-600 bg-red-50 rounded-lg">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Customer Information */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader className="pb-3">
              <h3 className="text-lg font-semibold flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Contact Information
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-500">Phone</p>
                    <p className="text-gray-900 truncate">{customer.phone}</p>
                  </div>
                </div>
                {customer.email && (
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-500">Email</p>
                      <p className="text-gray-900 truncate">{customer.email}</p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-500">
                        First Interaction
                      </p>
                      <p className="text-gray-900">
                        {formatDate(customer.first_interaction_date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-500">
                        Last Interaction
                      </p>
                      <p className="text-gray-900">
                        {formatDate(customer.last_interaction_date)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Statistics - NO FINANCIAL DATA */}
          <Card>
            <CardHeader className="pb-3">
              <h3 className="text-lg font-semibold flex items-center">
                <Briefcase className="h-5 w-5 mr-2" />
                Customer Activity
              </h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">
                    {customer.total_jobs_count}
                  </p>
                  <p className="text-xs sm:text-sm text-blue-600">Total Jobs</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-xl sm:text-2xl font-bold text-green-600">
                    {
                      customer.jobs.filter(
                        (job) =>
                          job.status === 'completed' ||
                          job.status === 'delivered'
                      ).length
                    }
                  </p>
                  <p className="text-xs sm:text-sm text-green-600">Completed</p>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <p className="text-xl sm:text-2xl font-bold text-orange-600">
                    {customer.total_jobs_count > 0
                      ? Math.round(
                          (customer.jobs.filter(
                            (job) =>
                              job.status === 'completed' ||
                              job.status === 'delivered'
                          ).length /
                            customer.total_jobs_count) *
                            100
                        )
                      : 0}
                    %
                  </p>
                  <p className="text-xs sm:text-sm text-orange-600">
                    Completion Rate
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Job History - NO FINANCIAL DATA */}
          <Card>
            <CardHeader className="pb-3">
              <h3 className="text-lg font-semibold">
                Job History ({customer.jobs.length})
              </h3>
            </CardHeader>
            <CardContent>
              {customer.jobs.length === 0 ? (
                <div className="text-center py-6 md:py-8">
                  <Package className="h-10 w-10 md:h-12 md:w-12 text-gray-400 mx-auto mb-3 md:mb-4" />
                  <p className="text-gray-500 text-sm md:text-base">
                    No jobs found for this customer
                  </p>
                </div>
              ) : (
                <div className="space-y-3 md:space-y-4">
                  {customer.jobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex flex-col p-3 md:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
                          <h4 className="font-semibold text-gray-900 text-sm md:text-base truncate">
                            {job.ticket_id}
                          </h4>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)} self-start`}
                          >
                            {job.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs md:text-sm text-gray-600 mb-2 line-clamp-2">
                          {job.description}
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-xs md:text-sm text-gray-500">
                          <span>
                            Requested: {formatDate(job.date_requested)}
                          </span>
                          <span className="hidden sm:inline">•</span>
                          <span>Created: {formatDate(job.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-end mt-3 md:mt-4">
                        <Link
                          href={`/worker/jobs/${job.id}`}
                          className="flex-shrink-0"
                        >
                          <Button variant="outline" size="sm">
                            View Job
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Activity Info (NO FINANCIAL DATA) */}
        <div className="space-y-4 md:space-y-6">
          {/* Customer Insights - Non-financial */}
          <Card>
            <CardHeader className="pb-3">
              <h3 className="text-lg font-semibold">Customer Insights</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Customer Since
                </p>
                <p className="text-gray-900 text-sm">
                  {formatDate(customer.first_interaction_date)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Days Since Last Job
                </p>
                <p className="text-gray-900 text-sm">
                  {Math.floor(
                    (new Date().getTime() -
                      new Date(customer.last_interaction_date).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )}{' '}
                  days
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Job Frequency
                </p>
                <p className="text-gray-900 text-sm">
                  {customer.total_jobs_count > 1
                    ? `Every ${Math.floor((new Date(customer.last_interaction_date).getTime() - new Date(customer.first_interaction_date).getTime()) / (1000 * 60 * 60 * 24 * customer.total_jobs_count))} days avg`
                    : 'First-time customer'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity - NO FINANCIAL DATA */}
          <Card>
            <CardHeader className="pb-3">
              <h3 className="text-lg font-semibold">Recent Activity</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm">
                  <p className="font-medium text-gray-900">Last Job</p>
                  <p className="text-gray-500 text-sm">
                    {formatDate(customer.last_interaction_date)}
                  </p>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">
                    Total Interactions
                  </p>
                  <p className="text-gray-500 text-sm">
                    {customer.total_jobs_count} jobs
                  </p>
                </div>
                {customer.jobs.slice(0, 3).map((job) => (
                  <div key={job.id} className="text-sm">
                    <p className="font-medium text-gray-900 truncate">
                      {job.ticket_id}
                    </p>
                    <p className="text-gray-500 text-sm">
                      {job.status.replace('_', ' ')} •{' '}
                      {formatDate(job.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
