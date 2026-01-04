'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api, isApiError } from '@/lib/api';
import { OutstandingPayments as OutstandingPaymentsType } from '@/types/payments';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  AlertTriangle,
  TrendingDown,
  Users,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50];

export const OutstandingPayments: React.FC = () => {
  const [data, setData] = useState<OutstandingPaymentsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const fetchOutstandingPayments = async () => {
      try {
        const response = await api.get<OutstandingPaymentsType>(
          '/payments/outstanding'
        );
        setData(response.data);
      } catch (err: unknown) {
        console.error('Failed to fetch outstanding payments:', err);
        if (isApiError(err)) {
          setError(err.error);
        } else {
          setError('Failed to load outstanding payments');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOutstandingPayments();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-8 text-red-600">
        {error || 'Failed to load outstanding payments'}
      </div>
    );
  }

  const getAgingColor = (category: string): string => {
    if (category.includes('Critical')) return 'bg-red-100 text-red-800';
    if (category.includes('Very Overdue'))
      return 'bg-orange-100 text-orange-800';
    if (category.includes('Overdue')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  };

  // Pagination calculations
  const totalPages = Math.ceil(data.detailed.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedJobs = data.detailed.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
          Outstanding Payments
        </h2>
        <p className="text-sm sm:text-base text-gray-600">
          Track and manage all pending payments
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="min-w-0">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                  Total Outstanding
                </p>
                <p className="text-base sm:text-lg lg:text-2xl font-bold text-red-600 mt-1 break-words">
                  {formatCurrency(data.summary.total_outstanding_amount)}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-red-100 rounded-lg flex-shrink-0">
                <TrendingDown className="h-4 w-4 sm:h-6 sm:w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                  Outstanding Jobs
                </p>
                <p className="text-base sm:text-lg lg:text-2xl font-bold text-orange-600 mt-1 break-words">
                  {data.summary.outstanding_jobs_count}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-orange-100 rounded-lg flex-shrink-0">
                <AlertTriangle className="h-4 w-4 sm:h-6 sm:w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                  Customers Owed
                </p>
                <p className="text-base sm:text-lg lg:text-2xl font-bold text-purple-600 mt-1 break-words">
                  {data.summary.customers_with_outstanding}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-purple-100 rounded-lg flex-shrink-0">
                <Users className="h-4 w-4 sm:h-6 sm:w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aging Analysis */}
      <Card>
        <CardHeader className="pb-2 sm:pb-4">
          <h3 className="text-base sm:text-lg font-semibold">
            Payment Aging Analysis
          </h3>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          <div className="space-y-2 sm:space-y-3">
            {data.aging.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 sm:p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  <div>
                    <p
                      className={`text-[10px] sm:text-sm font-semibold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full inline-block ${getAgingColor(item.category)}`}
                    >
                      {item.category}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                      {item.count} job(s)
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm sm:text-lg font-bold text-gray-900">
                    {formatCurrency(item.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Outstanding Payments with Pagination */}
      <Card>
        <CardHeader className="pb-2 sm:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-base sm:text-lg font-semibold">
              All Outstanding Jobs ({data.detailed.length})
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-gray-600">Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm"
              >
                {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          {paginatedJobs.length > 0 ? (
            <div className="space-y-3">
              {paginatedJobs.map((job, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm sm:text-base">
                        {job.ticket_id}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600">
                        {job.customer_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base sm:text-lg font-bold text-red-600">
                        {formatCurrency(job.outstanding_amount)}
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-500">
                        Outstanding
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:gap-4 my-2 sm:my-3 text-xs sm:text-sm">
                    <div>
                      <p className="text-gray-600">Total Cost</p>
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(job.total_cost)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Paid</p>
                      <p className="font-semibold text-green-600">
                        {formatCurrency(job.amount_paid)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Worker</p>
                      <p className="font-semibold text-gray-900 truncate">
                        {job.worker_name}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 sm:pt-3 border-t border-gray-100 gap-2">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-gray-500">
                      <span>📞 {job.customer_phone}</span>
                      <span>Updated: {formatDate(job.updated_at)}</span>
                    </div>
                    <Link href={`/admin/jobs/${job.id}`}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full sm:w-auto text-xs sm:text-sm"
                      >
                        View Job
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>✅ No outstanding payments! All caught up.</p>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-4 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> Previous
              </Button>
              <span className="text-xs sm:text-sm text-gray-600">
                Page {currentPage} of {totalPages} ({data.detailed.length}{' '}
                total)
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                Next <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
