'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api, isApiError } from '@/lib/api';
import { OutstandingPayments as OutstandingPaymentsType } from '@/types/payments';
import { formatCurrency, formatDate } from '@/lib/utils';
import { AlertTriangle, TrendingDown, Users, Clock, ChevronDown } from 'lucide-react';
import Link from 'next/link';

export const OutstandingPayments: React.FC = () => {
  const [data, setData] = useState<OutstandingPaymentsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [expandedDetails, setExpandedDetails] = useState(false);

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
    if (category.includes('Very Overdue')) return 'bg-orange-100 text-orange-800';
    if (category.includes('Overdue')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Outstanding Payments</h2>
        <p className="text-gray-600">Track and manage pending payments</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Outstanding</p>
                <p className="text-3xl font-bold text-red-600 mt-1">
                  {formatCurrency(data.summary.total_outstanding_amount)}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Outstanding Jobs</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">
                  {data.summary.outstanding_jobs_count}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Customers Owed</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">
                  {data.summary.customers_with_outstanding}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aging Analysis */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Payment Aging Analysis</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.aging.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className={`text-sm font-semibold px-3 py-1 rounded-full inline-block ${getAgingColor(item.category)}`}>
                      {item.category}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{item.count} job(s)</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(item.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Outstanding Payments */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => setExpandedDetails(!expandedDetails)}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Top Outstanding Jobs</h3>
            <ChevronDown
              className={`h-5 w-5 transition-transform ${expandedDetails ? 'rotate-180' : ''}`}
            />
          </div>
        </CardHeader>
        {expandedDetails && (
          <CardContent>
            <div className="space-y-3">
              {data.detailed.length > 0 ? (
                data.detailed.map((job, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">{job.ticket_id}</p>
                        <p className="text-sm text-gray-600">{job.customer_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-600">
                          {formatCurrency(job.outstanding_amount)}
                        </p>
                        <p className="text-xs text-gray-500">Outstanding</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 my-3 text-sm">
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
                        <p className="font-semibold text-gray-900">
                          {job.worker_name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>📞 {job.customer_phone}</span>
                        <span>Last updated: {formatDate(job.updated_at)}</span>
                      </div>
                      <Link href={`/admin/jobs/${job.id}`}>
                        <Button size="sm" variant="outline">
                          View Job
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>✅ No outstanding payments! All caught up.</p>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};
