'use client';

import React from 'react';
import { CustomerDetail } from '@/components/customers/customer-detail';

interface CustomerDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function CustomerDetailPage({
  params,
}: CustomerDetailPageProps) {
  const { id } = React.use(params);
  return <CustomerDetail customerId={id} />;
}
