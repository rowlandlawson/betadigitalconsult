// components/jobs/job-detail.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Receipt as PaymentReceipt } from '@/components/payments/receipt';
import { jobService } from '@/lib/jobService';
import { isApiError } from '@/lib/api';
import { JobWithDetails } from '@/types/jobs';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import {  
  Edit,
  Trash2,
  Package, 
  AlertTriangle,
  CreditCard,
  User,
  Printer,
  X
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface JobDetailProps {
  jobId: string;
  userRole: 'admin' | 'worker';
}

export const JobDetail: React.FC<JobDetailProps> = ({ jobId, userRole }) => {
  const router = useRouter();
  const [job, setJob] = useState<JobWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchJobDetail = async () => {
      setLoading(true);
      setError('');
      try {
        const jobData = await jobService.getJobById(jobId);
        if (isMounted) setJob(jobData);
      } catch (err: unknown) {
        console.error('Failed to fetch job details:', err);
        if (isApiError(err)) {
          if (isMounted) setError(err.error);
        } else {
          if (isMounted) setError('Failed to load job details');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (jobId) {
      fetchJobDetail();
    }

    return () => {
      isMounted = false;
    };
  }, [jobId]);

  const updateJobStatus = async (newStatus: JobWithDetails['status']) => {
    if (!job) return;

    setUpdatingStatus(true);
    try {
      await jobService.updateJobStatus(jobId, newStatus);
      setJob(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (err: unknown) {
      console.error('Failed to update job status:', err);
      if (isApiError(err)) {
        setError(err.error);
      } else {
        setError('Failed to update job status');
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeleteJob = async () => {
    if (!job || !confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      await jobService.deleteJob(jobId);
      router.push('/admin/jobs');
    } catch (err: unknown) {
      console.error('Failed to delete job:', err);
      if (isApiError(err)) {
        setError(err.error);
      } else {
        setError('Failed to delete job');
      }
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (job?.payments?.length) {
      setSelectedPaymentId(job.payments[0].id);
    } else {
      setSelectedPaymentId(null);
    }
  }, [job]);

  const handleOpenReceiptModal = () => {
    if (!job || job.payments.length === 0) {
      toast.error('No payments found for this job. Record a payment to generate a receipt.');
      return;
    }
    if (!selectedPaymentId) {
      setSelectedPaymentId(job.payments[0].id);
    }
    setShowReceiptModal(true);
  };

  const handleCloseReceiptModal = () => {
    setShowReceiptModal(false);
  };

  const getStatusColor = (status: string) => {
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

  const getNextStatus = (currentStatus: string): string | null => {
    const statusFlow = {
      'not_started': 'in_progress',
      'in_progress': 'completed',
      'completed': 'delivered',
      'delivered': null,
    };
    return statusFlow[currentStatus as keyof typeof statusFlow] || null;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error || 'Job not found'}</p>
        <Button onClick={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const nextStatus = getNextStatus(job.status);

  return (
    <>
      <div className="space-y-6 no-print">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{job.ticket_id}</h1>
            <p className="text-gray-600">{job.description}</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(job.status)}`}>
              {job.status.replace('_', ' ')}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenReceiptModal}
              title="View & print receipt"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Receipt
            </Button>
            {userRole === 'admin' && (
              <>
                <Link href={`/admin/jobs/${job.id}/edit`}>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteJob}
                  loading={deleting}
                  disabled={deleting}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </>
            )}
            {nextStatus && (
              <Button
                size="sm"
                loading={updatingStatus}
                onClick={() => updateJobStatus(nextStatus as JobWithDetails['status'])}
              >
                Mark as {nextStatus.replace('_', ' ')}
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 text-red-600 bg-red-50 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Job Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Customer Information
                </h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Customer Name</p>
                    <p className="text-gray-900">{job.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Phone</p>
                    <p className="text-gray-900">{job.customer_phone}</p>
                  </div>
                  {job.customer_email && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Email</p>
                      <p className="text-gray-900">{job.customer_email}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Jobs</p>
                    <p className="text-gray-900">{job.total_jobs_count || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Job Details */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Job Details</h3>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Date Requested</p>
                    <p className="text-gray-900">{formatDate(job.date_requested)}</p>
                  </div>
                  {job.delivery_deadline && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Delivery Deadline</p>
                      <p className="text-gray-900">{formatDate(job.delivery_deadline)}</p>
                    </div>
                  )}
                  {job.mode_of_payment && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Mode of Payment</p>
                      <p className="text-gray-900 capitalize">{job.mode_of_payment}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-500">Assigned Worker</p>
                    <p className="text-gray-900">{job.worker_name || 'Unassigned'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Materials Used */}
            {job.materials.length > 0 && (
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold flex items-center">
                    <Package className="h-5 w-5 mr-2" />
                    Materials Used
                  </h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {job.materials.map((material, index) => (
                      <div key={material.id || index} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{material.material_name}</p>
                          <p className="text-sm text-gray-500">
                            {material.quantity} × {formatCurrency(material.unit_cost)}
                            {material.paper_size && ` • ${material.paper_size}`}
                            {material.paper_type && ` • ${material.paper_type}`}
                            {material.grammage && ` • ${material.grammage}g`}
                          </p>
                        </div>
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(material.total_cost)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Waste Expenses */}
            {job.waste.length > 0 && (
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    Waste & Expenses
                  </h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {job.waste.map((waste, index) => (
                      <div key={waste.id || index} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{waste.description}</p>
                          <p className="text-sm text-gray-500 capitalize">
                            {waste.type.replace('_', ' ')}
                            {waste.waste_reason && ` • ${waste.waste_reason}`}
                            {waste.quantity && waste.unit_cost && ` • ${waste.quantity} × ${formatCurrency(waste.unit_cost)}`}
                          </p>
                        </div>
                        <p className="font-semibold text-red-600">
                          -{formatCurrency(waste.total_cost)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Financial Summary */}
          <div className="space-y-6">
            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Financial Summary
                </h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Cost:</span>
                  <span className="font-semibold">{formatCurrency(job.total_cost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Paid:</span>
                  <span className="text-green-600 font-semibold">{formatCurrency(job.amount_paid)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Balance:</span>
                  <span className={`font-semibold ${job.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(job.balance)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Status:</span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    job.payment_status === 'fully_paid' 
                      ? 'bg-green-100 text-green-800'
                      : job.payment_status === 'partially_paid'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {job.payment_status.replace('_', ' ')}
                  </span>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <Link href={`/${userRole}/payments?job=${job.id}`}>
                    <Button variant="outline" className="w-full">
                      Manage Payments
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Job Timeline */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Job Timeline</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Created:</span>
                  <span className="text-gray-900">{formatDateTime(job.created_at)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Last Updated:</span>
                  <span className="text-gray-900">{formatDateTime(job.updated_at)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Recent Payments */}
            {job.payments.length > 0 && (
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Recent Payments</h3>
                </CardHeader>
                <CardContent className="space-y-2">
                  {job.payments.slice(0, 3).map((payment) => (
                    <div key={payment.id} className="flex justify-between items-center text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{formatCurrency(payment.amount)}</p>
                        <p className="text-gray-500 capitalize">{payment.payment_method.replace('_', ' ')}</p>
                      </div>
                      <span className="text-gray-500">{formatDate(payment.payment_date)}</span>
                    </div>
                  ))}
                  {job.payments.length > 3 && (
                    <Link href={`/${userRole}/payments?job=${job.id}`}>
                      <Button variant="ghost" size="sm" className="w-full mt-2">
                        View All Payments
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      {showReceiptModal && selectedPaymentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="absolute inset-0" onClick={handleCloseReceiptModal} aria-hidden="true"></div>
          <div className="relative z-10 w-full max-w-5xl max-h-[95vh] bg-white rounded-xl shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Receipt Preview</h3>
                <p className="text-sm text-gray-500">Select a payment to view its printable receipt.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleCloseReceiptModal}>
                <span className="sr-only">Close</span>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {job.payments.length > 1 && (
              <div className="px-6 py-4 border-b border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Choose payment
                </label>
                <select
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedPaymentId}
                  onChange={(e) => setSelectedPaymentId(e.target.value)}
                >
                  {job.payments.map((payment) => (
                    <option key={payment.id} value={payment.id}>
                      {formatDate(payment.payment_date)} • {formatCurrency(payment.amount)} ({payment.payment_method.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-4">
              <PaymentReceipt
                paymentId={selectedPaymentId}
                userRole={userRole}
                showBackButton={false}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};