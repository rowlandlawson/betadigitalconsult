'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { notificationService } from '@/lib/notificationService';
import { Notification } from '@/types';
import { formatDate } from '@/lib/utils';
import { isApiError } from '@/lib/api';
import {
  Bell,
  Check,
  CheckCheck,
  Filter,
  AlertCircle,
  Package,
  CreditCard,
  Briefcase,
  Users,
  Settings,
} from 'lucide-react';
import { NotificationItem } from './notification-item';

type NotificationType = Notification['type'] | 'all';

export const NotificationList: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filter, setFilter] = useState<{
    type: NotificationType;
    unreadOnly: boolean;
  }>({
    type: 'all',
    unreadOnly: false,
  });

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError('');
      const notifs = await notificationService.getNotifications({
        unreadOnly: filter.unreadOnly,
      });
      setNotifications(notifs);
    } catch (err: unknown) {
      console.error('Failed to fetch notifications:', err);
      if (isApiError(err)) {
        setError(err.error);
      } else {
        setError('Failed to load notifications');
      }
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      await fetchNotifications();
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      await fetchNotifications();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const filteredNotifications = notifications.filter((notif) => {
    if (filter.type === 'all') return true;
    return notif.type === filter.type;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getTypeIcon = (type: Notification['type']) => {
    switch (type) {
      case 'new_job':
        return <Briefcase className="h-4 w-4" />;
      case 'payment_update':
        return <CreditCard className="h-4 w-4" />;
      case 'status_change':
        return <AlertCircle className="h-4 w-4" />;
      case 'low_stock':
        return <Package className="h-4 w-4" />;
      case 'system':
        return <Settings className="h-4 w-4" />;
      case 'alert':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: Notification['type']) => {
    switch (type) {
      case 'new_job':
        return 'bg-blue-100 text-blue-800';
      case 'payment_update':
        return 'bg-green-100 text-green-800';
      case 'status_change':
        return 'bg-yellow-100 text-yellow-800';
      case 'low_stock':
        return 'bg-red-100 text-red-800';
      case 'system':
        return 'bg-gray-100 text-gray-800';
      case 'alert':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#AABD77]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={handleMarkAllAsRead} variant="outline">
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark All as Read
          </Button>
        )}
      </div>

      {error && (
        <Card>
          <CardContent className="p-6">
            <div className="text-red-600 text-center">
              <p className="text-lg font-semibold">
                Error loading notifications
              </p>
              <p className="text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                Filter by:
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filter.type === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter({ ...filter, type: 'all' })}
              >
                All
              </Button>
              <Button
                variant={filter.type === 'new_job' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter({ ...filter, type: 'new_job' })}
              >
                <Briefcase className="h-3 w-3 mr-1" />
                Jobs
              </Button>
              <Button
                variant={
                  filter.type === 'payment_update' ? 'default' : 'outline'
                }
                size="sm"
                onClick={() => setFilter({ ...filter, type: 'payment_update' })}
              >
                <CreditCard className="h-3 w-3 mr-1" />
                Payments
              </Button>
              <Button
                variant={filter.type === 'low_stock' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter({ ...filter, type: 'low_stock' })}
              >
                <Package className="h-3 w-3 mr-1" />
                Stock Alerts
              </Button>
              <Button
                variant={filter.type === 'system' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter({ ...filter, type: 'system' })}
              >
                <Settings className="h-3 w-3 mr-1" />
                System
              </Button>
              <Button
                variant={filter.unreadOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() =>
                  setFilter({ ...filter, unreadOnly: !filter.unreadOnly })
                }
              >
                Unread Only
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardContent className="p-0">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No notifications found</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  getTypeIcon={getTypeIcon}
                  getTypeColor={getTypeColor}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
