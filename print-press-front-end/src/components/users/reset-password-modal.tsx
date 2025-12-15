'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { userService } from '@/lib/userService';
import { isApiError } from '@/lib/api';
import { Key } from 'lucide-react';
import { toast } from 'sonner';

interface ResetPasswordModalProps {
  userId: string;
  userName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  userId,
  userName,
  onClose,
  onSuccess,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('Both password fields are required');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await userService.resetPassword(userId, newPassword);
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password reset successfully');
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      console.error('Failed to reset password:', err);
      if (isApiError(err)) {
        setError(err.error);
      } else {
        setError('Failed to reset password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              <span>Reset Password for {userName}</span>
            </div>
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <div>
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              required
              minLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              minLength={6}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

