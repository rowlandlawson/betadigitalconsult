'use client';

import React from 'react';
import { ExpenseForm } from '@/components/operational-expenses/expense-form';

interface EditExpensePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditExpensePage({ params }: EditExpensePageProps) {
  const { id } = React.use(params);
  return <ExpenseForm mode="edit" expenseId={id} />;
}

