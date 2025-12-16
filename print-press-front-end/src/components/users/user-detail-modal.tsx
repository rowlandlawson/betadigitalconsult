'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User } from '@/lib/userService';
import { formatDate } from '@/lib/utils';
import {
  X,
  Shield,
  Users,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Building2,
} from 'lucide-react';

interface UserDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      ></div>
      <Card className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-4 sticky top-0 bg-white z-10 border-b">
          <div className="flex items-center gap-3">
            {user.role === 'admin' ? (
              <Shield className="h-6 w-6 text-purple-500" />
            ) : (
              <Users className="h-6 w-6 text-blue-500" />
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
              <p className="text-sm text-gray-600">{user.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-gray-900">{user.email}</p>
                </div>
              </div>

              {user.user_name && (
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Username
                    </p>
                    <p className="text-gray-900">{user.user_name}</p>
                  </div>
                </div>
              )}

              {user.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Phone</p>
                    <p className="text-gray-900">{user.phone}</p>
                  </div>
                </div>
              )}

              {user.address && (
                <div className="flex items-start gap-3 md:col-span-2">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Address</p>
                    <p className="text-gray-900">{user.address}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Date Joined
                  </p>
                  <p className="text-gray-900">
                    {user.date_joined ? formatDate(user.date_joined) : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Role</p>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      user.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      user.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Worker Payment Information */}
          {user.role === 'worker' && (
            <div className="pt-4 border-t">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payment Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {user.hourly_rate && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Hourly Rate
                    </p>
                    <p className="text-gray-900">
                      ₦
                      {parseFloat(user.hourly_rate.toString()).toLocaleString()}
                    </p>
                  </div>
                )}

                {user.monthly_salary && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Monthly Salary
                    </p>
                    <p className="text-gray-900">
                      ₦
                      {parseFloat(
                        user.monthly_salary.toString()
                      ).toLocaleString()}
                    </p>
                  </div>
                )}

                {user.payment_method && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Payment Method
                    </p>
                    <p className="text-gray-900 capitalize">
                      {user.payment_method.replace('_', ' ')}
                    </p>
                  </div>
                )}

                {user.bank_name && (
                  <div className="flex items-start gap-3 md:col-span-2">
                    <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">
                        Bank Details
                      </p>
                      <div className="mt-1 space-y-1">
                        <p className="text-gray-900">{user.bank_name}</p>
                        {user.account_number && (
                          <p className="text-gray-600 text-sm">
                            Account: {user.account_number}
                          </p>
                        )}
                        {user.account_name && (
                          <p className="text-gray-600 text-sm">
                            Name: {user.account_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Account Information */}
          <div className="pt-4 border-t">
            <h3 className="text-lg font-semibold mb-4">Account Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Created At</p>
                <p className="text-gray-900">{formatDate(user.created_at)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Last Updated
                </p>
                <p className="text-gray-900">
                  {user.updated_at ? formatDate(user.updated_at) : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
