'use client';

import React from 'react';
import { InventoryDetail } from '@/components/inventory/inventory-detail';

interface InventoryDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function InventoryDetailPage({
  params,
}: InventoryDetailPageProps) {
  const { id } = React.use(params);
  return <InventoryDetail itemId={id} />;
}
