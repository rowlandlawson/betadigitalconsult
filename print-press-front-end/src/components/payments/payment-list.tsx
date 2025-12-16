'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, ApiError, isApiError } from '@/lib/api';
import { Payment, PaginatedResponse } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Search, Filter, Download, Plus } from 'lucide-react';
import Link from 'next/link';

interface PaymentListProps {
  userRole: 'admin' | 'worker';
}

export const PaymentList: React.FC<PaymentListProps> = ({ userRole }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({
    start_date: '',
    end_date: '',
  });
  const [methodFilter, setMethodFilter] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalPaymentsCount, setTotalPaymentsCount] = useState(0);

  useEffect(() => {
    fetchPayments();
  }, [dateFilter, methodFilter]);

  const fetchPayments = async () => {
    try {
      const params = new URLSearchParams();
      if (dateFilter.start_date)
        params.append('start_date', dateFilter.start_date);
      if (dateFilter.end_date) params.append('end_date', dateFilter.end_date);
      if (methodFilter) params.append('payment_method', methodFilter);

      const response = await api.get<{
        payments: Payment[];
        pagination: any;
        summary: { total_amount: number };
      }>(`/payments?${params.toString()}`);
      setPayments(response.data.payments || []);
      setTotalAmount(response.data.summary?.total_amount || 0);
      setTotalPaymentsCount(response.data.pagination?.total || 0);
    } catch (err: unknown) {
      console.error('Failed to fetch payments:', err);
      if (isApiError(err)) {
        setError(err.error);
      } else {
        setError('Failed to load payments');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = (payments || []).filter(
    (payment) =>
      payment.receipt_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.ticket_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.recorded_by_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPaymentTypeColor = (type: string) => {
    switch (type) {
      case 'full_payment':
        return 'bg-green-100 text-green-800';
      case 'deposit':
        return 'bg-blue-100 text-blue-800';
      case 'balance':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'cash':
        return 'bg-yellow-100 text-yellow-800';
      case 'transfer':
        return 'bg-green-100 text-green-800';
      case 'pos':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const downloadReceipt = async (paymentId: string) => {
    try {
      const response = await api.get(`/payments/receipt/${paymentId}/pdf`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt-${paymentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      console.error('Failed to download receipt:', err);
      alert('Failed to download receipt');
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
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600">Manage and track all payments</p>
        </div>
        <Link href={`/${userRole}/payments/record`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        </Link>
      </div>

      {error && (
        <div className="p-4 text-red-600 bg-red-50 rounded-lg">{error}</div>
      )}

      {/* Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gray-600">Total Payments</p>
            <p className="text-2xl font-bold text-gray-900">
              {totalPaymentsCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gray-600">Total Amount</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(totalAmount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gray-600">Average Payment</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(
                totalPaymentsCount > 0 ? totalAmount / totalPaymentsCount : 0
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gray-600">Unique Jobs</p>
            <p className="text-2xl font-bold text-purple-600">
              {new Set(payments.map((p) => p.job_id)).size}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by receipt number, job ticket, customer, or recorded by..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="date"
                placeholder="Start Date"
                value={dateFilter.start_date}
                onChange={(e) =>
                  setDateFilter((prev) => ({
                    ...prev,
                    start_date: e.target.value,
                  }))
                }
                className="w-full sm:w-40"
              />
              <Input
                type="date"
                placeholder="End Date"
                value={dateFilter.end_date}
                onChange={(e) =>
                  setDateFilter((prev) => ({
                    ...prev,
                    end_date: e.target.value,
                  }))
                }
                className="w-full sm:w-40"
              />
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="w-full sm:w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Methods</option>
                <option value="cash">Cash</option>
                <option value="transfer">Transfer</option>
                <option value="pos">POS</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">
            Payment History ({filteredPayments.length})
          </h3>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No payments found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-semibold text-gray-900">
                        {payment.receipt_number}
                      </h4>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentTypeColor(payment.payment_type)}`}
                      >
                        {payment.payment_type.replace('_', ' ')}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentMethodColor(payment.payment_method)}`}
                      >
                        {payment.payment_method.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Job:</span>{' '}
                        {payment.ticket_id}
                      </div>
                      <div>
                        <span className="font-medium">Customer:</span>{' '}
                        {payment.customer_name}
                      </div>
                      <div>
                        <span className="font-medium">Recorded by:</span>{' '}
                        {payment.recorded_by_name}
                      </div>
                      <div>
                        <span className="font-medium">Date:</span>{' '}
                        {formatDate(payment.date)}
                      </div>
                    </div>

                    {payment.notes && (
                      <p className="text-sm text-gray-500 mt-2">
                        <span className="font-medium">Notes:</span>{' '}
                        {payment.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-4 mt-4 lg:mt-0">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(payment.date)}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Link
                        href={`/${userRole}/payments/receipt/${payment.id}`}
                      >
                        <Button variant="outline" size="sm">
                          View Receipt
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadReceipt(payment.id)}
                        title="Download PDF Receipt"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
