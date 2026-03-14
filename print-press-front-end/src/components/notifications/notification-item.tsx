'use client';

import React, { useState } from 'react';
import { Notification } from '@/types';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

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
  const [showModal, setShowModal] = useState(false);

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  return (
    <>
      {/* Notification Row */}
      <div
        onClick={handleClick}
        className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${!notification.is_read ? 'bg-blue-50' : ''
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
                  <h4
                    className={`font-medium ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'}`}
                  >
                    {notification.title}
                  </h4>
                  {!notification.is_read && (
                    <span className="h-2 w-2 bg-blue-600 rounded-full"></span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {notification.message}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{formatDate(notification.created_at)}</span>
                  {notification.priority && (
                    <span
                      className={`px-2 py-0.5 rounded ${notification.priority === 'urgent'
                          ? 'bg-red-100 text-red-800'
                          : notification.priority === 'high'
                            ? 'bg-orange-100 text-orange-800'
                            : notification.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                    >
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

      {/* Notification Detail Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between p-5 border-b">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-lg ${getTypeColor(notification.type)}`}>
                  {getTypeIcon(notification.type)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {notification.title}
                  </h2>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>{formatDate(notification.created_at)}</span>
                    {notification.priority && (
                      <span
                        className={`px-2 py-0.5 rounded font-medium ${notification.priority === 'urgent'
                            ? 'bg-red-100 text-red-800'
                            : notification.priority === 'high'
                              ? 'bg-orange-100 text-orange-800'
                              : notification.priority === 'medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}
                      >
                        {notification.priority}
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded font-medium ${notification.is_read
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                        }`}
                    >
                      {notification.is_read ? 'Read' : 'Unread'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {notification.message}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="text-gray-500 text-xs block mb-1">Type</span>
                  <span className="font-medium text-gray-900 capitalize">
                    {notification.type.replace(/_/g, ' ')}
                  </span>
                </div>
                {notification.related_entity_type && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <span className="text-gray-500 text-xs block mb-1">Related To</span>
                    <span className="font-medium text-gray-900 capitalize">
                      {notification.related_entity_type}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 p-5 border-t">
              {!notification.is_read && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onMarkAsRead(notification.id);
                    closeModal();
                  }}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Mark as Read
                </Button>
              )}
              <Button size="sm" onClick={closeModal}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
