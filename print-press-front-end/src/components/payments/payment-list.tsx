'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, isApiError } from '@/lib/api';
import { Payment } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Search, Download, Plus, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import Link from 'next/link';

interface PaymentListProps {
  userRole: 'admin' | 'worker';
}

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50];

export const PaymentList: React.FC<PaymentListProps> = ({ userRole }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Default to current month (matching reports behavior)
  const [dateFilter, setDateFilter] = useState({
    start_date: (() => {
      const date = new Date();
      return new Date(date.getFullYear(), date.getMonth(), 1)
        .toISOString()
        .split('T')[0];
    })(),
    end_date: new Date().toISOString().split('T')[0],
  });

  const [methodFilter, setMethodFilter] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalPaymentsCount, setTotalPaymentsCount] = useState(0);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
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
      setCurrentPage(1); // Reset to first page when filters change
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
  }, [dateFilter, methodFilter]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Extended Payment type that includes job and customer info from API
  type ExtendedPayment = Payment & {
    ticket_id?: string;
    customer_name?: string;
    recorded_by_name?: string;
  };

  // Filter payments by search term
  const filteredPayments = ((payments as ExtendedPayment[]) || []).filter(
    (payment) =>
      payment.receipt_number
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      payment.ticket_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.recorded_by_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      payment.recorded_by?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPayments = filteredPayments.slice(startIndex, startIndex + itemsPerPage);

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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Paid Payments</h1>
          <p className="text-sm sm:text-base text-gray-600">View and track all received payments</p>
        </div>
        <Link href={`/${userRole}/payments/record`}>
          <Button className="text-sm">
            <Plus className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        </Link>
      </div>

      {error && (
        <div className="p-4 text-red-600 bg-red-50 rounded-lg">{error}</div>
      )}

      {/* Date Range Filter - Similar to Reports */}
      <Card>
        <CardHeader className="pb-2 sm:pb-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
            <h3 className="text-sm sm:text-base font-semibold">Date Range</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto] gap-2 items-center">
            <Input
              type="date"
              value={dateFilter.start_date}
              onChange={(e) =>
                setDateFilter((prev) => ({
                  ...prev,
                  start_date: e.target.value,
                }))
              }
              className="w-full text-sm"
            />
            <span className="text-gray-500 text-sm text-center hidden sm:block">
              to
            </span>
            <Input
              type="date"
              value={dateFilter.end_date}
              onChange={(e) =>
                setDateFilter((prev) => ({
                  ...prev,
                  end_date: e.target.value,
                }))
              }
              className="w-full text-sm"
            />
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="">All Methods</option>
              <option value="cash">Cash</option>
              <option value="transfer">Transfer</option>
              <option value="pos">POS</option>
            </select>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Card */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="min-w-0">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Payments</p>
            <p className="text-base sm:text-lg lg:text-2xl font-bold text-gray-900 break-words">
              {filteredPayments.length}
            </p>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Amount</p>
            <p className="text-base sm:text-lg lg:text-2xl font-bold text-green-600 break-words">
              {formatCurrency(totalAmount)}
            </p>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Average Payment</p>
            <p className="text-base sm:text-lg lg:text-2xl font-bold text-blue-600 break-words">
              {formatCurrency(
                filteredPayments.length > 0 ? totalAmount / filteredPayments.length : 0
              )}
            </p>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Unique Jobs</p>
            <p className="text-base sm:text-lg lg:text-2xl font-bold text-purple-600 break-words">
              {new Set(payments.map((p) => p.job_id)).size}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by receipt, job ticket, customer..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset to first page on search
              }}
              className="pl-10 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      <Card>
        <CardHeader className="pb-2 sm:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-base sm:text-lg font-semibold">
              Payment History ({filteredPayments.length})
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
          {paginatedPayments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No payments found</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {paginatedPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base">
                        {payment.receipt_number}
                      </h4>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${getPaymentTypeColor(payment.payment_type)}`}
                      >
                        {payment.payment_type.replace('_', ' ')}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${getPaymentMethodColor(payment.payment_method)}`}
                      >
                        {payment.payment_method.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                      <div className="truncate">
                        <span className="font-medium">Job:</span>{' '}
                        {(payment as ExtendedPayment).ticket_id || '-'}
                      </div>
                      <div className="truncate">
                        <span className="font-medium">Customer:</span>{' '}
                        {(payment as ExtendedPayment).customer_name || '-'}
                      </div>
                      <div className="truncate">
                        <span className="font-medium">By:</span>{' '}
                        {(payment as ExtendedPayment).recorded_by_name ||
                          payment.recorded_by}
                      </div>
                      <div className="truncate">
                        <span className="font-medium">Date:</span>{' '}
                        {formatDate(payment.date)}
                      </div>
                    </div>

                    {payment.notes && (
                      <p className="text-xs sm:text-sm text-gray-500 mt-2 truncate">
                        <span className="font-medium">Notes:</span>{' '}
                        {payment.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between lg:justify-end gap-4 mt-3 lg:mt-0">
                    <div className="text-right">
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">
                        {formatCurrency(payment.amount)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/${userRole}/payments/receipt/${payment.id}`}
                      >
                        <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                          View
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadReceipt(payment.id)}
                        title="Download PDF Receipt"
                      >
                        <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
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
                Page {currentPage} of {totalPages} ({filteredPayments.length} total)
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
