'use client';

import React from 'react';
import { Receipt } from '@/components/payments/receipt';

interface ReceiptPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ReceiptPage({ params }: ReceiptPageProps) {
  const { id } = React.use(params);
  return <Receipt paymentId={id} userRole="admin" />;
}
