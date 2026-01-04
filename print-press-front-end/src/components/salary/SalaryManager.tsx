'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Banknote } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface SalaryPayment {
  id: string;
  user_id: string;
  amount: number;
  payment_date: string;
  payment_month: string;
  notes: string;
  worker_name: string;
  recorded_by_name: string;
}

interface Worker {
  id: string;
  name: string;
  role: string;
}

export const SalaryManager = () => {
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedWorker, setSelectedWorker] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [paymentMonth, setPaymentMonth] = useState(
    new Date().toISOString().slice(0, 7)
  ); // YYYY-MM
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [paymentsRes, usersRes] = await Promise.all([
        api.get('/salary'),
        api.get('/users'),
      ]);

      setPayments(paymentsRes.data.salaries || []);
      // Filter only workers
      setWorkers(
        usersRes.data.users.filter((u: Worker) => u.role === 'worker')
      );
    } catch (error) {
      console.error('Error fetching salary data:', error);
      toast.error('Failed to load salary data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker || !amount || !paymentMonth) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/salary', {
        user_id: selectedWorker,
        amount: parseFloat(amount),
        payment_date: paymentDate,
        payment_month: paymentMonth,
        notes,
      });

      toast.success('Salary payment recorded');
      fetchData(); // Refresh list

      // Reset form (keep date/month usually)
      setAmount('');
      setNotes('');
    } catch (error: any) {
      console.error('Error creating salary payment:', error);
      toast.error(error.response?.data?.error || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Salary Management</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Form */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Record Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Worker</Label>
                <select
                  className="w-full mt-1 border rounded-md p-2"
                  value={selectedWorker}
                  onChange={(e) => setSelectedWorker(e.target.value)}
                  required
                >
                  <option value="">Select a worker...</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Amount (₦)</Label>
                <div className="relative mt-1">
                  <Banknote className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    type="number"
                    className="pl-8"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    min="0"
                  />
                </div>
              </div>

              <div>
                <Label>Payment For (Month)</Label>
                <Input
                  type="month"
                  className="mt-1"
                  value={paymentMonth}
                  onChange={(e) => setPaymentMonth(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label>Payment Date</Label>
                <Input
                  type="date"
                  className="mt-1"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label>Notes (Optional)</Label>
                <Input
                  className="mt-1"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Full salary, Advance..."
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Recording...' : 'Record Payment'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">Loading...</div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No salary payments recorded yet.
              </div>
            ) : (
              <div className="space-y-4">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex justify-between items-center p-4 border rounded-lg bg-gray-50"
                  >
                    <div>
                      <h4 className="font-semibold">{payment.worker_name}</h4>
                      <p className="text-sm text-gray-500">
                        {payment.payment_month} • Paid on{' '}
                        {formatDate(payment.payment_date)}
                      </p>
                      {payment.notes && (
                        <p className="text-xs text-gray-400 mt-1">
                          {payment.notes}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-xs text-gray-400">
                        By {payment.recorded_by_name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
