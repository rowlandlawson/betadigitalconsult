'use client';

import React from 'react';
import { Notification } from '@/types';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Check, LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  getTypeIcon: (type: Notification['type']) => React.ReactNode;
  getTypeColor: (type: Notification['type']) => string;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  getTypeIcon,
  getTypeColor,
}) => {
  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
  };

  const content = (
    <div
      className={`p-4 hover:bg-gray-50 transition-colors ${
        !notification.is_read ? 'bg-blue-50' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${getTypeColor(notification.type)}`}>
          {getTypeIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className={`font-medium ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                  {notification.title}
                </h4>
                {!notification.is_read && (
                  <span className="h-2 w-2 bg-blue-600 rounded-full"></span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{formatDate(notification.created_at)}</span>
                {notification.priority && (
                  <span className={`px-2 py-0.5 rounded ${
                    notification.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                    notification.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    notification.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {notification.priority}
                  </span>
                )}
              </div>
            </div>
            {!notification.is_read && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead(notification.id);
                }}
                className="flex-shrink-0"
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (notification.action_url) {
    return (
      <Link href={notification.action_url} onClick={handleClick}>
        {content}
      </Link>
    );
  }

  return <div onClick={handleClick}>{content}</div>;
};

