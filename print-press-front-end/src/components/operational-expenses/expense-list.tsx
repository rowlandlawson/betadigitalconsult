'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { operationalExpensesService } from '@/lib/operationalExpensesService';
import { OperationalExpense } from '@/types/operational-expenses';
import { formatCurrency, formatDate } from '@/lib/utils';
import { isApiError } from '@/lib/api';
import { Plus, Search, Filter, Edit, Trash2, DollarSign } from 'lucide-react';
import Link from 'next/link';

export const ExpenseList: React.FC = () => {
  const [expenses, setExpenses] = useState<OperationalExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [month, setMonth] = useState<number | ''>('');
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await operationalExpensesService.getExpenses({
        category: categoryFilter || undefined,
        month: month || undefined,
        year,
      });
      setExpenses(response.expenses);
    } catch (err: unknown) {
      console.error('Failed to fetch expenses:', err);
      if (isApiError(err)) {
        setError(err.error);
      } else {
        setError('Failed to load expenses');
      }
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, month, year]);

  const fetchCategories = useCallback(async () => {
    try {
      const cats = await operationalExpensesService.getCategories();
      setCategories(cats);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
  }, [fetchExpenses, fetchCategories]);

  const handleDelete = async (id: string, description: string) => {
    if (!confirm(`Are you sure you want to delete expense "${description}"?`)) {
      return;
    }

    try {
      await operationalExpensesService.deleteExpense(id);
      await fetchExpenses();
    } catch (err: unknown) {
      console.error('Failed to delete expense:', err);
      alert('Failed to delete expense');
    }
  };

  const filteredExpenses = expenses.filter(
    (expense) =>
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAmount = filteredExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#AABD77]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Operational Expenses
          </h1>
          <p className="text-gray-600">Track and manage operational expenses</p>
        </div>
        <Link href="/admin/operational-expenses/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        </Link>
      </div>

      {error && (
        <Card>
          <CardContent className="p-6">
            <div className="text-red-600 text-center">
              <p className="text-lg font-semibold">Error loading expenses</p>
              <p className="text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <Input
              type="number"
              placeholder="Month"
              value={month}
              onChange={(e) =>
                setMonth(e.target.value ? parseInt(e.target.value) : '')
              }
              className="w-24"
              min="1"
              max="12"
            />
            <Input
              type="number"
              placeholder="Year"
              value={year}
              onChange={(e) =>
                setYear(parseInt(e.target.value) || new Date().getFullYear())
              }
              className="w-24"
            />
          </div>
        </CardContent>
      </Card>

      {/* Total Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-600">
              Total Expenses:
            </span>
            <span className="text-xl font-bold text-gray-900">
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Expenses List */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">
            Expenses ({filteredExpenses.length})
          </h3>
        </CardHeader>
        <CardContent>
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No expenses found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Description</th>
                    <th className="text-left p-3">Category</th>
                    <th className="text-right p-3">Amount</th>
                    <th className="text-left p-3">Receipt #</th>
                    <th className="text-left p-3">Recorded By</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        {formatDate(expense.expense_date)}
                      </td>
                      <td className="p-3">{expense.description}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                          {expense.category}
                        </span>
                      </td>
                      <td className="p-3 text-right font-medium text-red-600">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="p-3">{expense.receipt_number || 'N/A'}</td>
                      <td className="p-3">
                        {expense.recorded_by_name || 'N/A'}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/operational-expenses/${expense.id}/edit`}
                          >
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleDelete(expense.id, expense.description)
                            }
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
