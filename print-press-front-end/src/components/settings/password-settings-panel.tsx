'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { passwordService } from '@/lib/passwordService';
import { toast } from 'sonner';
import { ShieldCheck, RefreshCw } from 'lucide-react';

const PASSWORD_REQUIREMENTS =
  'Passwords must be at least 6 characters and include one uppercase letter plus one special character.';

type ApiError = {
  response?: {
    data?: {
      error?: string;
      message?: string;
    };
  };
  message?: string;
};

const extractErrorMessage = (error: unknown) => {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const apiError = error as ApiError;
    return (
      apiError.response?.data?.error ||
      apiError.response?.data?.message ||
      apiError.message ||
      'Something went wrong. Please try again.'
    );
  }
  return 'Something went wrong. Please try again.';
};

export function PasswordSettingsPanel() {
  const [changeForm, setChangeForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [adminResetUserId, setAdminResetUserId] = useState('');

  const [changeLoading, setChangeLoading] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [adminResetLoading, setAdminResetLoading] = useState(false);

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();

    if (changeForm.newPassword !== changeForm.confirmPassword) {
      toast.error('New password and confirmation do not match.');
      return;
    }

    setChangeLoading(true);
    try {
      const response = await passwordService.changePassword({
        currentPassword: changeForm.currentPassword,
        newPassword: changeForm.newPassword,
      });
      toast.success(response.message || 'Password updated successfully.');
      setChangeForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setChangeLoading(false);
    }
  };

  const handleRecoveryRequest = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!recoveryIdentifier.trim()) {
      toast.error('Enter an email or username to send the reset link to.');
      return;
    }

    setRecoveryLoading(true);
    try {
      const response = await passwordService.requestResetLink({ identifier: recoveryIdentifier.trim() });
      toast.success(response.message || 'Recovery link sent.');
      setRecoveryIdentifier('');
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleAdminReset = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!adminResetUserId.trim()) {
      toast.error('Provide a user ID to generate a reset link.');
      return;
    }

    setAdminResetLoading(true);
    try {
      const response = await passwordService.adminResetUserPassword({ userId: adminResetUserId.trim() });
      toast.success(response.message || 'Admin reset link generated.');
      if (response.resetLink) {
        console.info('🔐 Password reset link:', response.resetLink);
      }
      setAdminResetUserId('');
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setAdminResetLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-8 w-8 text-blue-600" />
        <div>
          <h2 className="text-2xl font-semibold">Password & Recovery</h2>
          <p className="text-sm text-gray-600">
            Update your password and send recovery links without leaving the admin console.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div>
            <h3 className="text-lg font-semibold">Change Password</h3>
            <p className="text-sm text-gray-500">{PASSWORD_REQUIREMENTS}</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
              <Input
                type="password"
                value={changeForm.currentPassword}
                onChange={(event) => setChangeForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                placeholder="Enter current password"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <Input
                  type="password"
                  value={changeForm.newPassword}
                  onChange={(event) => setChangeForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                  placeholder="Enter new password"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                <Input
                  type="password"
                  value={changeForm.confirmPassword}
                  onChange={(event) => setChangeForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                  placeholder="Re-type new password"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={changeLoading}>
                {changeLoading ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <h3 className="text-lg font-semibold">Password Recovery</h3>
            <p className="text-sm text-gray-500">
              Send reset links for yourself or workers. Links are logged to the server console right now.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleRecoveryRequest} className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Send recovery link to email or username
            </label>
            <div className="flex flex-col md:flex-row gap-3">
              <Input
                type="text"
                value={recoveryIdentifier}
                onChange={(event) => setRecoveryIdentifier(event.target.value)}
                placeholder="e.g. admin@company.com or johndoe"
              />
              <Button type="submit" variant="outline" disabled={recoveryLoading}>
                {recoveryLoading ? 'Sending...' : 'Send Link'}
              </Button>
            </div>
          </form>

          <form onSubmit={handleAdminReset} className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Generate reset link for a specific user ID
            </label>
            <div className="flex flex-col md:flex-row gap-3">
              <Input
                type="text"
                value={adminResetUserId}
                onChange={(event) => setAdminResetUserId(event.target.value)}
                placeholder="Paste user ID"
              />
              <Button type="submit" disabled={adminResetLoading}>
                {adminResetLoading ? 'Generating...' : (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Generate Link
                  </span>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

