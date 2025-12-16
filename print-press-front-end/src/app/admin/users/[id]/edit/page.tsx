'use client';

import React from 'react';
import { UserForm } from '@/components/users/user-form';

interface EditUserPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditUserPage({ params }: EditUserPageProps) {
  const { id } = React.use(params);
  return <UserForm mode="edit" userId={id} />;
}
