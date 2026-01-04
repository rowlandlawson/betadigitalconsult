'use client';

import React from 'react';
import { WorkerCustomerDetail } from '@/components/customers/worker-customer-detail';

interface CustomerDetailPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default function WorkerCustomerDetailPage({
    params,
}: CustomerDetailPageProps) {
    const { id } = React.use(params);
    return <WorkerCustomerDetail customerId={id} />;
}
