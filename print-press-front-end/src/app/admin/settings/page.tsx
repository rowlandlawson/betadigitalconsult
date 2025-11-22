'use client';

import React from 'react';
import { CompanySettingsForm } from '@/components/settings/company-settings-form';
import { PasswordSettingsPanel } from '@/components/settings/password-settings-panel';

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-8">
      <CompanySettingsForm />
      <PasswordSettingsPanel />
    </div>
  );
}
