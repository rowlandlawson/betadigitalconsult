'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { userService, User } from '@/lib/userService';
import { isApiError } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Edit, ArrowLeft, Shield, Users, UserCheck, UserX, Key } from 'lucide-react';
import Link from 'next/link';
import { ResetPasswordModal } from '@/components/users/reset-password-modal';

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showResetModal, setShowResetModal] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      setError('');
      const userData = await userService.getUserById(userId);
      setUser(userData);
    } catch (err: unknown) {
      console.error('Failed to fetch user:', err);
      if (isApiError(err)) {
        setError(err.error);
      } else {
        setError('Failed to load user');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#AABD77]"></div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-red-600 text-center">
            <p className="text-lg font-semibold">Error loading user</p>
            <p className="text-sm">{error || 'User not found'}</p>
            <Button onClick={() => router.push('/admin/users')} className="mt-4">
              Back to Users
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/users">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{user.name}</h1>
            <p className="text-gray-600">{user.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/users/${userId}/edit`}>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Edit User
            </Button>
          </Link>
          <Button variant="outline" onClick={() => setShowResetModal(true)}>
            <Key className="h-4 w-4 mr-2" />
            Reset Password
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Basic Information</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <p className="font-medium">{user.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Username</p>
              <p className="font-medium">{user.user_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Role</p>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                user.role === 'admin' 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {user.role === 'admin' ? <Shield className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                {user.role}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              {user.is_active ? (
                <span className="flex items-center gap-1 text-green-600">
                  <UserCheck className="h-4 w-4" />
                  Active
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-600">
                  <UserX className="h-4 w-4" />
                  Inactive
                </span>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="font-medium">{user.phone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Address</p>
              <p className="font-medium">{user.address || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Date Joined</p>
              <p className="font-medium">{user.date_joined ? formatDate(user.date_joined) : 'N/A'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Payment Information (for workers) */}
        {user.role === 'worker' && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Payment Information</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Hourly Rate</p>
                <p className="font-medium">{user.hourly_rate ? `$${user.hourly_rate.toFixed(2)}` : 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Monthly Salary</p>
                <p className="font-medium">{user.monthly_salary ? `$${user.monthly_salary.toFixed(2)}` : 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Payment Method</p>
                <p className="font-medium">{user.payment_method || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Bank Name</p>
                <p className="font-medium">{user.bank_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Account Number</p>
                <p className="font-medium">{user.account_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Account Name</p>
                <p className="font-medium">{user.account_name || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {showResetModal && user && (
        <ResetPasswordModal
          userId={user.id}
          userName={user.name}
          onClose={() => setShowResetModal(false)}
          onSuccess={fetchUser}
        />
      )}
    </div>
  );
}

