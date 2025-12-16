'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { userService, CreateUserData, UpdateUserData } from '@/lib/userService';
import { passwordService } from '@/lib/passwordService';
import { isApiError } from '@/lib/api';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface UserFormProps {
  userId?: string;
  mode: 'create' | 'edit';
}

export const UserForm: React.FC<UserFormProps> = ({ userId, mode }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [generatedPassword, setGeneratedPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordChangeData, setPasswordChangeData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [formData, setFormData] = useState<
    CreateUserData & { isActive?: boolean }
  >({
    email: '',
    name: '',
    userName: '',
    phone: '',
    address: '',
    dateJoined: new Date().toISOString().split('T')[0],
    role: 'worker',
    isActive: true,
    hourlyRate: undefined,
    monthlySalary: undefined,
    paymentMethod: '',
    bankName: '',
    accountNumber: '',
    accountName: '',
  });

  useEffect(() => {
    const fetchUser = async () => {
      if (mode === 'edit' && userId) {
        try {
          setFetchLoading(true);
          const user = await userService.getUserById(userId);
          setFormData({
            email: user.email,
            name: user.name,
            userName: user.user_name || '',
            phone: user.phone || '',
            address: user.address || '',
            dateJoined: user.date_joined ? user.date_joined.split('T')[0] : '',
            role: user.role,
            isActive: user.is_active,
            hourlyRate: user.hourly_rate,
            monthlySalary: user.monthly_salary,
            paymentMethod: user.payment_method || '',
            bankName: user.bank_name || '',
            accountNumber: user.account_number || '',
            accountName: user.account_name || '',
          });
        } catch (err: unknown) {
          console.error('Failed to fetch user:', err);
          if (isApiError(err)) {
            setError(err.error);
          } else {
            setError('Failed to load user');
          }
        } finally {
          setFetchLoading(false);
        }
      }
    };

    fetchUser();
  }, [mode, userId]);

  const generatePassword = () => {
    const chars =
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedPassword(password);
  };

  const handlePasswordChange = async () => {
    if (
      !passwordChangeData.newPassword ||
      !passwordChangeData.confirmPassword
    ) {
      setError('Please fill in both password fields');
      return;
    }

    if (passwordChangeData.newPassword !== passwordChangeData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (passwordChangeData.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!userId) return;

    setChangingPassword(true);
    setError('');

    try {
      await userService.resetUserPassword(
        userId,
        passwordChangeData.newPassword
      );
      setPasswordChangeData({ newPassword: '', confirmPassword: '' });
      setError('');
      toast.success('Password changed successfully');
    } catch (err: unknown) {
      console.error('Failed to change password:', err);
      if (isApiError(err)) {
        setError(err.error);
      } else {
        setError('Failed to change password');
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.name.trim() || !formData.email.trim()) {
      setError('Name and email are required');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'create') {
        const { isActive, ...createData } = formData;
        await userService.createUser(createData);
        router.push('/admin/users');
      } else if (mode === 'edit' && userId) {
        await userService.updateUser(userId, formData);
        router.push('/admin/users');
      }
    } catch (err: unknown) {
      console.error('Failed to save user:', err);
      if (isApiError(err)) {
        setError(err.error);
      } else {
        setError(`Failed to ${mode} user`);
      }
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#AABD77]"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-2xl font-bold">
          {mode === 'create' ? 'Create New User' : 'Edit User'}
        </h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
              {error}
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  disabled={mode === 'edit'}
                />
              </div>

              {mode === 'create' && (
                <div className="md:col-span-2">
                  <Label>
                    Generated Password (will be sent to admin email)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={generatedPassword}
                      readOnly
                      placeholder="Click 'Generate Password' to create a secure password"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generatePassword}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Generate Password
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    A password will be auto-generated when creating the user.
                    You can generate one here to preview.
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="userName">Username</Label>
                <Input
                  id="userName"
                  value={formData.userName}
                  onChange={(e) =>
                    setFormData({ ...formData, userName: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="role">Role *</Label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as 'admin' | 'worker',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="worker">Worker</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <Label htmlFor="dateJoined">Date Joined</Label>
                <Input
                  id="dateJoined"
                  type="date"
                  value={formData.dateJoined}
                  onChange={(e) =>
                    setFormData({ ...formData, dateJoined: e.target.value })
                  }
                />
              </div>

              {mode === 'edit' && (
                <div>
                  <Label htmlFor="isActive">Status</Label>
                  <select
                    id="isActive"
                    value={formData.isActive ? 'true' : 'false'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isActive: e.target.value === 'true',
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </div>
          </div>

          {/* Worker Payment Information */}
          {formData.role === 'worker' && (
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-semibold">Payment Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hourlyRate">Hourly Rate</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    step="0.01"
                    value={formData.hourlyRate || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        hourlyRate: e.target.value
                          ? parseFloat(e.target.value)
                          : undefined,
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="monthlySalary">Monthly Salary</Label>
                  <Input
                    id="monthlySalary"
                    type="number"
                    step="0.01"
                    value={formData.monthlySalary || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        monthlySalary: e.target.value
                          ? parseFloat(e.target.value)
                          : undefined,
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <select
                    id="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paymentMethod: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select method</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="mobile_money">Mobile Money</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    value={formData.bankName}
                    onChange={(e) =>
                      setFormData({ ...formData, bankName: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    value={formData.accountNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        accountNumber: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="accountName">Account Name</Label>
                  <Input
                    id="accountName"
                    value={formData.accountName}
                    onChange={(e) =>
                      setFormData({ ...formData, accountName: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* Password Change Section (for edit mode, workers only) */}
          {mode === 'edit' && formData.role === 'worker' && userId && (
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-semibold">Change Password</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordChangeData.newPassword}
                    onChange={(e) =>
                      setPasswordChangeData({
                        ...passwordChangeData,
                        newPassword: e.target.value,
                      })
                    }
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordChangeData.confirmPassword}
                    onChange={(e) =>
                      setPasswordChangeData({
                        ...passwordChangeData,
                        confirmPassword: e.target.value,
                      })
                    }
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handlePasswordChange}
                disabled={
                  changingPassword ||
                  !passwordChangeData.newPassword ||
                  !passwordChangeData.confirmPassword
                }
              >
                {changingPassword ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading}>
              {loading
                ? 'Saving...'
                : mode === 'create'
                  ? 'Create User'
                  : 'Update User'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin/users')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
