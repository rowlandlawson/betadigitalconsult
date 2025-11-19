'use client';

import React from 'react';
import { JobDetail } from '@/components/jobs/job-detail';

interface JobDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = React.use(params);
  return <JobDetail jobId={id} userRole="admin" />;
}