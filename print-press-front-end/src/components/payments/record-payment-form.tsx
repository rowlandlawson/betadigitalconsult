'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, isApiError } from '@/lib/api';
import { PaymentFormData } from '@/types/payments';
import { Job } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Search, Calculator } from 'lucide-react';

interface RecordPaymentFormProps {
  userRole: 'admin' | 'worker';
}

export const RecordPaymentForm: React.FC<RecordPaymentFormProps> = ({
  userRole,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedJobId = searchParams.get('job');

  const [loading, setLoading] = useState(false);
  const [searchingJob, setSearchingJob] = useState(false);
  const [error, setError] = useState<string>('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<PaymentFormData>({
    job_id: preSelectedJobId || '',
    amount: 0,
    payment_type: 'installment',
    payment_method: 'cash',
    notes: '',
  });

  useEffect(() => {
    if (preSelectedJobId) {
      fetchJobDetails(preSelectedJobId);
    }
  }, [preSelectedJobId]);

  const fetchJobDetails = async (jobId: string) => {
    try {
      const response = await api.get<{ job: Job }>(`/jobs/${jobId}`);
      setSelectedJob(response.data.job);
      setFormData((prev) => ({
        ...prev,
        job_id: jobId,
        amount: Math.min(
          response.data.job.balance,
          response.data.job.balance > 0 ? response.data.job.balance : 0
        ),
      }));
    } catch (err: unknown) {
      console.error('Failed to fetch job details:', err);
      setError('Failed to load job details');
    }
  };

  const searchJobs = async (query: string) => {
    if (!query.trim()) {
      setJobs([]);
      return;
    }

    setSearchingJob(true);
    try {
      // Workers can search by ticket ID to access any job for payment recording
      // This uses the ticket endpoint which has no worker restriction
      if (userRole === 'worker' && query.trim().toUpperCase().includes('PRESS-')) {
        // Try ticket ID lookup first for workers
        try {
          const ticketResponse = await api.get<{ job: Job }>(
            `/jobs/ticket/${encodeURIComponent(query.trim())}`
          );
          if (ticketResponse.data.job) {
            setJobs([ticketResponse.data.job]);
            setSearchingJob(false);
            return;
          }
        } catch {
          // Ticket not found, fall through to regular search
        }
      }

      // Regular search (workers will only see their own jobs, admins see all)
      const response = await api.get<{ jobs: Job[] }>(
        `/jobs?search=${encodeURIComponent(query)}&limit=5`
      );
      setJobs(response.data.jobs);
    } catch (err: unknown) {
      console.error('Failed to search jobs:', err);
    } finally {
      setSearchingJob(false);
    }
  };

  const handleJobSelect = (job: Job) => {
    setSelectedJob(job);
    setFormData((prev) => ({
      ...prev,
      job_id: job.id,
      amount: Math.min(
        job.balance,
        job.balance > 0 ? job.balance : job.total_cost
      ),
    }));
    setJobs([]);
    setSearchQuery(`${job.ticket_id} - ${job.customer_name}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedJob) {
      setError('Please select a job');
      return;
    }

    if (formData.amount <= 0) {
      setError('Payment amount must be greater than 0');
      return;
    }

    if (formData.amount > selectedJob.balance && selectedJob.balance > 0) {
      setError(
        `Payment amount cannot exceed balance of ${formatCurrency(selectedJob.balance)}`
      );
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/payments', formData);

      // Show success message and redirect
      const receiptUrl = `/${userRole}/payments/receipt/${response.data.payment.id}`;
      router.push(receiptUrl);
    } catch (err: unknown) {
      console.error('Failed to record payment:', err);
      if (isApiError(err)) {
        setError(err.error);
      } else {
        setError('Failed to record payment');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const calculateSuggestedAmount = () => {
    if (!selectedJob) return 0;

    const balance = selectedJob.balance;
    if (balance <= 0) return selectedJob.total_cost;

    if (balance === selectedJob.total_cost) {
      // First payment - suggest 50% or full amount for small jobs
      return selectedJob.total_cost <= 5000
        ? selectedJob.total_cost
        : selectedJob.total_cost * 0.5;
    } else {
      // Subsequent payment - suggest the remaining balance
      return balance;
    }
  };

  const applySuggestedAmount = () => {
    const suggested = calculateSuggestedAmount();
    setFormData((prev) => ({ ...prev, amount: suggested }));
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <h2 className="text-2xl font-bold text-gray-900">Record Payment</h2>
        <p className="text-gray-600">Record a new payment for a job</p>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          {/* Job Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Job *
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder={userRole === 'worker'
                  ? "Enter full ticket ID (e.g., PRESS-123456) to find any job..."
                  : "Search by ticket ID, customer name, or description..."}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchJobs(e.target.value);
                }}
                className="pl-10"
              />
            </div>
            {userRole === 'worker' && (
              <p className="mt-1 text-xs text-gray-500">
                Tip: Enter the full ticket ID to record payment for any job
              </p>
            )}

            {/* Job Search Results */}
            {jobs.length > 0 && (
              <div className="mt-2 border border-gray-200 rounded-lg bg-white shadow-lg z-10 max-h-60 overflow-y-auto">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleJobSelect(job)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">
                          {job.ticket_id}
                        </p>
                        <p className="text-sm text-gray-600">
                          {job.customer_name}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {job.description}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(job.total_cost)}
                        </p>
                        <p className="text-gray-500">
                          Balance: {formatCurrency(job.balance)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchingJob && (
              <div className="mt-2 text-center py-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            )}
          </div>

          {/* Selected Job Info */}
          {selectedJob && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">Selected Job</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-blue-700 font-medium">
                    {selectedJob.ticket_id}
                  </p>
                  <p className="text-blue-600">{selectedJob.customer_name}</p>
                  <p className="text-blue-500 truncate">
                    {selectedJob.description}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-blue-700 font-semibold">
                    Total: {formatCurrency(selectedJob.total_cost)}
                  </p>
                  <p className="text-green-600">
                    Paid: {formatCurrency(selectedJob.amount_paid)}
                  </p>
                  <p
                    className={`font-semibold ${selectedJob.balance > 0
                      ? 'text-red-600'
                      : 'text-green-600'
                      }`}
                  >
                    Balance: {formatCurrency(selectedJob.balance)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (₦) *
              </label>
              <div className="flex space-x-2">
                <Input
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={applySuggestedAmount}
                  disabled={!selectedJob}
                  title="Apply suggested amount"
                >
                  <Calculator className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Type *
              </label>
              <select
                name="payment_type"
                required
                value={formData.payment_type}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="deposit">Deposit</option>
                <option value="installment">Installment</option>
                <option value="full_payment">Full Payment</option>
                <option value="balance">Balance Payment</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method *
              </label>
              <select
                name="payment_method"
                required
                value={formData.payment_method}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="cash">Cash</option>
                <option value="transfer">Bank Transfer</option>
                <option value="pos">POS</option>
              </select>
            </div>

            {selectedJob && (
              <div className="flex items-end">
                <div className="text-sm text-gray-600">
                  <p>After payment:</p>
                  <p className="font-semibold text-green-600">
                    New Paid:{' '}
                    {formatCurrency(selectedJob.amount_paid + formData.amount)}
                  </p>
                  <p className="font-semibold">
                    New Balance:{' '}
                    {formatCurrency(selectedJob.balance - formData.amount)}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Add any payment notes or references..."
              rows={3}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={loading || !selectedJob}
          >
            Record Payment
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
