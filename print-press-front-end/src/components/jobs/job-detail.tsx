// components/jobs/job-detail.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Receipt as PaymentReceipt } from '@/components/payments/receipt';
import { JobCompletionModal, MaterialEntry, WasteEntry } from './job-completion-modal'; // Import the new modal
import { EditMaterialsModal } from './edit-materials-modal'; // Import the new materials modal
import { jobService } from '@/lib/jobService';
import { isApiError, api } from '@/lib/api'; // Added api import for direct patch call
import { JobWithDetails, Material, MaterialEditHistory } from '@/types/jobs';
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

  // New State for Completion Modal
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  
  // New State for Edit Materials Modal
  const [showEditMaterialsModal, setShowEditMaterialsModal] = useState(false);
  const [updatingMaterials, setUpdatingMaterials] = useState(false);

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

  // Updated to handle optional materials/waste inputs
  const updateJobStatus = async (newStatus: JobWithDetails['status'], materials?: MaterialEntry[], waste?: WasteEntry[]) => {
    if (!job) return;

    setUpdatingStatus(true);
    try {
      if (materials || waste) {
        // If materials/waste are provided (from completion modal), use direct API call to pass the body
        await api.patch(`/jobs/${jobId}/status`, { 
          status: newStatus, 
          materials, 
          waste 
        });
      } else {
        // Standard status update
        await jobService.updateJobStatus(jobId, newStatus);
      }
      
      // Refresh job data immediately to show updated financials
      const updatedJob = await jobService.getJobById(jobId);
      setJob(updatedJob);
      
      // Close modal if it was open
      setShowCompletionModal(false);
      toast.success(`Job marked as ${newStatus.replace('_', ' ')}`);

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

  // Logic to intercept "completed" status
  const handleStatusChangeClick = (nextStatus: string) => {
    if (nextStatus === 'completed') {
      setShowCompletionModal(true);
    } else {
      updateJobStatus(nextStatus as JobWithDetails['status']);
    }
  };

  const handleCompletionConfirm = async (materials: MaterialEntry[], waste: WasteEntry[]) => {
    await updateJobStatus('completed', materials, waste);
  };

  // Handle materials update
  const handleMaterialsUpdate = async (updatedMaterials: Material[], editHistory: MaterialEditHistory[]) => {
    if (!job) return;
    
    setUpdatingMaterials(true);
    try {
      // You'll need to implement updateJobMaterials in your jobService
      // const result = await jobService.updateJobMaterials(jobId, updatedMaterials, editReason);
      
      // For now, just refresh the job data
      const updatedJob = await jobService.getJobById(jobId);
      setJob(updatedJob);
      setShowEditMaterialsModal(false);
      toast.success('Materials updated successfully');
    } catch (error: any) {
      console.error('Failed to update materials:', error);
      toast.error('Failed to update materials');
    } finally {
      setUpdatingMaterials(false);
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

  // Helper to calculate financials for the UI
  const calculateFinancials = () => {
    if (!job) return { expenses: 0, profit: 0, margin: 0 };
    
    // Sum of Materials Cost
    const materialsCost = job.materials?.reduce((sum, m) => sum + Number(m.total_cost), 0) || 0;
    // Sum of Waste Cost
    const wasteCost = job.waste?.reduce((sum, w) => sum + Number(w.total_cost), 0) || 0;
    
    const totalExpenses = materialsCost + wasteCost;
    const revenue = Number(job.total_cost);
    const profit = revenue - totalExpenses;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return { expenses: totalExpenses, profit, margin };
  };

  const financials = calculateFinancials();

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
  <div className="flex flex-col gap-4">
    <div className="text-center sm:text-left">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
        {job.ticket_id}
      </h1>
      <p className="text-gray-600 text-sm sm:text-base mt-1 break-words">
        {job.description}
      </p>
    </div>
    
    {/* Status and Actions */}
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      {/* Status Badge */}
      <div className="flex justify-center sm:justify-start">
        <span className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium ${getStatusColor(job.status)} w-fit`}>
          {job.status.replace('_', ' ')}
        </span>
      </div>
      
      {/* Action Buttons */}
      <div className="flex flex-wrap justify-center sm:justify-start gap-2">
        {/* Print Button - Always visible */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenReceiptModal}
          title="View & print receipt"
          className="flex-1 sm:flex-none min-w-[120px]"
        >
          <Printer className="h-4 w-4 mr-2" />
          <span className="hidden xs:inline">Print</span>
          <span className="xs:hidden">Print</span>
        </Button>

        {/* UPDATE MATERIALS BUTTON - ADDED HERE */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowEditMaterialsModal(true)}
          className="flex-1 sm:flex-none min-w-[140px]"
        >
          <Package className="h-4 w-4 mr-2" />
          <span className="hidden xs:inline">Update Materials</span>
          <span className="xs:hidden">Materials</span>
        </Button>

        {/* Admin Actions */}
        {userRole === 'admin' && (
          <>
            <Link href={`/admin/jobs/${job.id}/edit`} className="flex-1 sm:flex-none min-w-[100px]">
              <Button variant="outline" size="sm" className="w-full">
                <Edit className="h-4 w-4 mr-2" />
                <span className="hidden xs:inline">Edit</span>
                <span className="xs:hidden">Edit</span>
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteJob}
              loading={deleting}
              disabled={deleting}
              className="flex-1 sm:flex-none min-w-[100px] text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              <span >Delete</span>
            </Button>
          </>
        )}

        {/* Next Status Button */}
        {nextStatus && (
          <Button
            size="sm"
            loading={updatingStatus}
            onClick={() => handleStatusChangeClick(nextStatus)}
            className="flex-1 sm:flex-none min-w-[140px]"
          >
            Mark as {nextStatus.replace('_', ' ')}
          </Button>
        )}
      </div>
    </div>
  </div>

  {error && (
    <div className="p-4 text-red-600 bg-red-50 rounded-lg text-sm">
      {error}
    </div>
  )}

  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
    {/* Main Job Information */}
    <div className="lg:col-span-2 space-y-4 sm:space-y-6">
      {/* Customer Information */}
      <Card>
        <CardHeader className="pb-3">
          <h3 className="text-lg font-semibold flex items-center justify-center sm:justify-start">
            <User className="h-5 w-5 mr-2" />
            Customer Information
          </h3>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="text-center sm:text-left">
              <p className="text-sm font-medium text-gray-500">Customer Name</p>
              <p className="text-gray-900 break-words">{job.customer_name}</p>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-sm font-medium text-gray-500">Phone</p>
              <p className="text-gray-900 break-words">{job.customer_phone}</p>
            </div>
            {job.customer_email && (
              <div className="sm:col-span-2 text-center sm:text-left">
                <p className="text-sm font-medium text-gray-500">Email</p>
                <p className="text-gray-900 break-words">{job.customer_email}</p>
              </div>
            )}
            <div className="text-center sm:text-left">
              <p className="text-sm font-medium text-gray-500">Total Jobs</p>
              <p className="text-gray-900">{job.total_jobs_count || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job Details */}
      <Card>
        <CardHeader className="pb-3">
          <h3 className="text-lg font-semibold text-center sm:text-left">Job Details</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="text-center sm:text-left">
              <p className="text-sm font-medium text-gray-500">Date Requested</p>
              <p className="text-gray-900">{formatDate(job.date_requested)}</p>
            </div>
            {job.delivery_deadline && (
              <div className="text-center sm:text-left">
                <p className="text-sm font-medium text-gray-500">Delivery Deadline</p>
                <p className="text-gray-900">{formatDate(job.delivery_deadline)}</p>
              </div>
            )}
            {job.mode_of_payment && (
              <div className="text-center sm:text-left">
                <p className="text-sm font-medium text-gray-500">Payment Mode</p>
                <p className="text-gray-900 capitalize">{job.mode_of_payment}</p>
              </div>
            )}
            <div className="text-center sm:text-left">
              <p className="text-sm font-medium text-gray-500">Assigned Worker</p>
              <p className="text-gray-900 break-words">{job.worker_name || 'Unassigned'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Materials Used */}
      <Card>
        <CardHeader className="pb-3">
          <h3 className="text-lg font-semibold flex items-center justify-center sm:justify-start">
            <Package className="h-5 w-5 mr-2" />
            Materials Used
          </h3>
        </CardHeader>
        <CardContent>
          {job.materials.length === 0 ? (
            <p className="text-gray-500 italic text-center sm:text-left">No materials recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {job.materials.map((material, index) => (
                <div key={material.id || index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 border border-gray-200 rounded-lg gap-2">
                  <div className="text-center sm:text-left">
                    <p className="font-medium text-gray-900 break-words">{material.material_name}</p>
                    <p className="text-sm text-gray-500">
                      {material.quantity} × {formatCurrency(material.unit_cost)}
                      {material.paper_size && ` • ${material.paper_size}`}
                      {material.paper_type && ` • ${material.paper_type}`}
                      {material.grammage && ` • ${material.grammage}g`}
                    </p>
                  </div>
                  <p className="font-semibold text-gray-900 text-center sm:text-right">
                    {formatCurrency(material.total_cost)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Waste Expenses */}
      <Card>
        <CardHeader className="pb-3">
          <h3 className="text-lg font-semibold flex items-center justify-center sm:justify-start text-red-700">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Waste & Expenses
          </h3>
        </CardHeader>
        <CardContent>
          {job.waste.length === 0 ? (
            <p className="text-gray-500 italic text-center sm:text-left">No waste recorded.</p>
          ) : (
            <div className="space-y-2">
              {job.waste.map((waste, index) => (
                <div key={waste.id || index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 border border-red-100 bg-red-50 rounded-lg gap-2">
                  <div className="text-center sm:text-left">
                    <p className="font-medium text-gray-900 break-words">{waste.description}</p>
                    <p className="text-sm text-gray-500 capitalize">
                      {waste.type.replace('_', ' ')}
                      {waste.waste_reason && ` • ${waste.waste_reason}`}
                      {waste.quantity && waste.unit_cost && ` • ${waste.quantity} × ${formatCurrency(waste.unit_cost)}`}
                    </p>
                  </div>
                  <p className="font-semibold text-red-600 text-center sm:text-right">
                    -{formatCurrency(waste.total_cost)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>

    {/* Sidebar - Financial Summary */}
    <div className="space-y-4 sm:space-y-6">
      {/* Financial Summary */}
      <Card>
        <CardHeader className="pb-3">
          <h3 className="text-lg font-semibold flex items-center justify-center sm:justify-start">
            <CreditCard className="h-5 w-5 mr-2" />
            Financial Summary
          </h3>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Total Price:</span>
            <span className="font-semibold text-sm sm:text-base">{formatCurrency(job.total_cost)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Amount Paid:</span>
            <span className="text-green-600 font-semibold text-sm sm:text-base">{formatCurrency(job.amount_paid)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Balance Due:</span>
            <span className={`font-semibold text-sm sm:text-base ${job.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(job.balance)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Payment Status:</span>
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
          
          {/* Manage Payments Button */}
          <div className="pt-3 border-t border-gray-200">
            <Link href={`/${userRole}/payments?job=${job.id}`}>
              <Button variant="outline" className="w-full text-sm">
                Manage Payments
              </Button>
            </Link>
          </div>

          {/* Profit / Loss Section (Visible to Admin Only) */}
          {userRole === 'admin' && (
            <div className="mt-4 pt-4 border-t-2 border-dashed border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2 text-center sm:text-left">Job Profitability</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Materials & Waste:</span>
                  <span>-{formatCurrency(financials.expenses)}</span>
                </div>
                
                <div className="flex justify-between items-center pt-2 border-t border-gray-100 mt-2">
                  <span className="font-bold text-gray-900 text-sm">Net Profit:</span>
                  <div className="text-right">
                    <span className={`block font-bold text-base sm:text-lg ${financials.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(financials.profit)}
                    </span>
                    <span className={`text-xs ${financials.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {financials.margin.toFixed(1)}% Margin
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <h3 className="text-lg font-semibold text-center sm:text-left">Job Timeline</h3>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Created:</span>
            <span className="text-gray-900 text-xs sm:text-sm">{formatDateTime(job.created_at)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Last Updated:</span>
            <span className="text-gray-900 text-xs sm:text-sm">{formatDateTime(job.updated_at)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Recent Payments */}
      {job.payments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <h3 className="text-lg font-semibold text-center sm:text-left">Recent Payments</h3>
          </CardHeader>
          <CardContent className="space-y-2">
            {job.payments.slice(0, 3).map((payment) => (
              <div key={payment.id} className="flex justify-between items-center text-sm">
                <div className="text-center sm:text-left">
                  <p className="font-medium text-gray-900">{formatCurrency(payment.amount)}</p>
                  <p className="text-gray-500 text-xs capitalize">{payment.payment_method.replace('_', ' ')}</p>
                </div>
                <span className="text-gray-500 text-xs">{formatDate(payment.payment_date)}</span>
              </div>
            ))}
            {job.payments.length > 3 && (
              <Link href={`/${userRole}/payments?job=${job.id}`}>
                <Button variant="ghost" size="sm" className="w-full mt-2 text-sm">
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

      {/* Attach the Completion Modal */}
      <JobCompletionModal 
        isOpen={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        onConfirm={handleCompletionConfirm}
        loading={updatingStatus}
      />

      {/* Attach the Edit Materials Modal */}
      {job && (
        <EditMaterialsModal
          isOpen={showEditMaterialsModal}
          onClose={() => setShowEditMaterialsModal(false)}
          onSave={handleMaterialsUpdate}
          initialMaterials={job.materials}
          jobId={jobId}
          userRole={userRole}
        />
      )}

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