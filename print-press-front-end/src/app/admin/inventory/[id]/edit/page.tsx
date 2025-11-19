'use client';

import React from 'react';
import { InventoryForm } from '@/components/inventory/inventory-form';

interface InventoryEditPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function InventoryEditPage({ params }: InventoryEditPageProps) {
  const { id } = React.use(params);
  return <InventoryForm itemId={id} mode="edit" />;
}