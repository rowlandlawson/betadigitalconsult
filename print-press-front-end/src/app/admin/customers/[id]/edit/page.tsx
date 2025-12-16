'use client';

import React from 'react';
import { CustomerForm } from '@/components/customers/customer-form';

interface CustomerEditPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function CustomerEditPage({ params }: CustomerEditPageProps) {
  const { id } = React.use(params);
  return <CustomerForm customerId={id} mode="edit" />;
}
