'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { operationalExpensesService } from '@/lib/operationalExpensesService';
import { CreateExpenseData } from '@/types/operational-expenses';
import { isApiError } from '@/lib/api';

interface ExpenseFormProps {
  expenseId?: string;
  mode: 'create' | 'edit';
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  expenseId,
  mode,
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [formData, setFormData] = useState<CreateExpenseData>({
    description: '',
    category: '',
    amount: 0,
    expense_date: new Date().toISOString().split('T')[0],
    receipt_number: '',
    notes: '',
  });

  const fetchCategories = useCallback(async () => {
    try {
      const cats = await operationalExpensesService.getCategories();
      setCategories(cats);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, []);

  const fetchExpense = useCallback(async () => {
    if (!expenseId) return;
    try {
      setFetchLoading(true);
      const response = await operationalExpensesService.getExpenses();
      const expense = response.expenses.find((e) => e.id === expenseId);
      if (expense) {
        setFormData({
          description: expense.description,
          category: expense.category,
          amount: expense.amount,
          expense_date: expense.expense_date.split('T')[0],
          receipt_number: expense.receipt_number || '',
          notes: expense.notes || '',
        });
      }
    } catch (err: unknown) {
      console.error('Failed to fetch expense:', err);
      if (isApiError(err)) {
        setError(err.error);
      } else {
        setError('Failed to load expense');
      }
    } finally {
      setFetchLoading(false);
    }
  }, [expenseId]);

  useEffect(() => {
    fetchCategories();
    if (mode === 'edit' && expenseId) {
      fetchExpense();
    }
  }, [mode, expenseId, fetchCategories, fetchExpense]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (
      !formData.description.trim() ||
      !formData.category ||
      formData.amount <= 0
    ) {
      setError('Description, category, and amount are required');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'create') {
        await operationalExpensesService.createExpense(formData);
        router.push('/admin/operational-expenses');
      } else if (mode === 'edit' && expenseId) {
        await operationalExpensesService.updateExpense(expenseId, formData);
        router.push('/admin/operational-expenses');
      }
    } catch (err: unknown) {
      console.error('Failed to save expense:', err);
      if (isApiError(err)) {
        setError(err.error);
      } else {
        setError(`Failed to ${mode} expense`);
      }
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#AABD77]"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-2xl font-bold">
          {mode === 'create' ? 'Add Operational Expense' : 'Edit Expense'}
        </h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <div className="flex gap-2">
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <Input
                  type="text"
                  placeholder="New category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="flex-1"
                  onFocus={() => {
                    const select = document.getElementById(
                      'category'
                    ) as HTMLSelectElement;
                    if (select) select.value = '';
                  }}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="expense_date">Expense Date *</Label>
              <Input
                id="expense_date"
                type="date"
                value={formData.expense_date}
                onChange={(e) =>
                  setFormData({ ...formData, expense_date: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="receipt_number">Receipt Number</Label>
              <Input
                id="receipt_number"
                value={formData.receipt_number}
                onChange={(e) =>
                  setFormData({ ...formData, receipt_number: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading}>
              {loading
                ? 'Saving...'
                : mode === 'create'
                  ? 'Create Expense'
                  : 'Update Expense'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin/operational-expenses')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
