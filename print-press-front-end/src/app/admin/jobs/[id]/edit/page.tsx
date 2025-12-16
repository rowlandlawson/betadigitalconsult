'use client';

import React from 'react';
import { EditJobForm } from '@/components/jobs/edit-job-form';

interface JobEditPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function JobEditPage({ params }: JobEditPageProps) {
  const { id } = React.use(params);
  return <EditJobForm jobId={id} />;
}
