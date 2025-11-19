'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Notification } from '@/types';
import { api, isApiError } from '@/lib/api';

interface NotificationsResponse {
  notifications: Notification[];
}

interface UnreadCountResponse {
  count: number;
}

interface WebSocketMessage {
  type: string;
  notification?: Notification;
  message?: string;
  timestamp?: string;
  user?: {
    id: string;
    name: string;
    role: string;
  };
  channels?: string[];
}

export const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string>('');
  const [wsConnected, setWsConnected] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await api.get<UnreadCountResponse>('/notifications/unread-count');
      setUnreadCount(response.data.count);
    } catch (err: unknown) {
      console.error('Failed to fetch unread count:', err);
      if (isApiError(err)) {
        setError(err.error);
      }
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await api.get<NotificationsResponse>('/notifications?limit=10');
      setNotifications(response.data.notifications);
    } catch (err: unknown) {
      console.error('Failed to fetch notifications:', err);
      if (isApiError(err)) {
        setError(err.error);
      }
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
    } catch (err: unknown) {
      console.error('Failed to mark notification as read:', err);
      if (isApiError(err)) {
        setError(err.error);
      }
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await api.patch('/notifications/mark-all-read');
      setUnreadCount(0);
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, is_read: true }))
      );
    } catch (err: unknown) {
      console.error('Failed to mark all as read:', err);
      if (isApiError(err)) {
        setError(err.error);
      }
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.notification-container')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // WebSocket setup with authentication
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;
    let pingInterval: NodeJS.Timeout;

    const connectWebSocket = () => {
      try {
        // Get JWT token from localStorage
        const token = localStorage.getItem('auth_token');
        if (!token) {
          console.log('No auth token available for WebSocket connection');
          return;
        }

        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000';
        ws = new WebSocket(`${wsUrl}/ws/notifications?token=${token}`);
        
        ws.onopen = () => {
          console.log('🔌 WebSocket connection established');
          setWsConnected(true);
          setError('');
          
          // Send subscription message
          ws?.send(JSON.stringify({
            type: 'subscribe',
            channels: ['notifications']
          }));

          // Start ping interval to keep connection alive
          pingInterval = setInterval(() => {
            if (ws?.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }));
            }
          }, 30000); // Ping every 30 seconds
        };

        ws.onmessage = (event: MessageEvent) => {
          try {
            const data: WebSocketMessage = JSON.parse(event.data);
            console.log('📨 WebSocket message received:', data);
            
            switch (data.type) {
              case 'connected':
                console.log('✅ WebSocket authenticated:', data.message);
                break;
                
              case 'subscribed':
                console.log('✅ Subscribed to channels:', data.channels);
                break;
                
              case 'pong':
                console.log('🏓 Pong received:', data.timestamp);
                break;
                
              case 'new_notification':
                if (data.notification) {
                  // Update state in response to external system (WebSocket)
                  setUnreadCount(prev => prev + 1);
                  setNotifications(prev => [data.notification as Notification, ...prev]);
                  console.log('🔔 New notification received:', data.notification.title);
                }
                break;
                
              default:
                console.log('Unknown WebSocket message type:', data.type);
            }
          } catch (parseError) {
            console.error('Failed to parse WebSocket message:', parseError);
          }
        };

        ws.onerror = (error: Event) => {
          console.error('❌ WebSocket error:', error);
          setError('Connection error');
          setWsConnected(false);
        };

        ws.onclose = (event: CloseEvent) => {
          console.log('🔌 WebSocket connection closed:', event.code, event.reason);
          setWsConnected(false);
          clearInterval(pingInterval);
          
          // Attempt to reconnect after 5 seconds if not a normal closure
          if (event.code !== 1000) {
            reconnectTimeout = setTimeout(() => {
              console.log('🔄 Attempting to reconnect WebSocket...');
              connectWebSocket();
            }, 5000);
          }
        };

      } catch (wsError) {
        console.error('❌ Failed to setup WebSocket:', wsError);
        setError('Failed to connect to notification server');
      }
    };

    // Initialize data and connect WebSocket with a small delay
    const initialize = () => {
      fetchUnreadCount();
      connectWebSocket();
    };

    const timer = setTimeout(initialize, 100);

    // Cleanup function
    return () => {
      clearTimeout(timer);
      clearTimeout(reconnectTimeout);
      clearInterval(pingInterval);
      if (ws) {
        ws.close(1000, 'Component unmounting');
      }
    };
  }, [fetchUnreadCount]);

  return (
    <div className="relative notification-container">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            // Fetch notifications when opening the dropdown
            fetchNotifications();
          }
        }}
        className="relative p-2"
        title={wsConnected ? 'Connected to notifications' : 'Connecting...'}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        {!wsConnected && (
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
          </span>
        )}
      </Button>

      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div className="fixed inset-0 bg-black/50 bg-opacity-70 z-40 lg:hidden" onClick={() => setIsOpen(false)} />
          
          {/* Dropdown */}
          <div className="fixed lg:absolute right-0 lg:right-0 mt-2 w-screen lg:w-80 max-w-[calc(100vw-2rem)] lg:max-w-none bg-white rounded-lg shadow-lg border border-gray-200 z-50 lg:z-50 mx-4 lg:mx-0 top-16 lg:top-full">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-semibold">Notifications</h3>
                  {!wsConnected && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                      Connecting...
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-500"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
            </div>
            
            {error && (
              <div className="p-4 text-red-600 bg-red-50 text-sm">
                {error}
              </div>
            )}
            
            <div className="max-h-100 lg:max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <p>No notifications</p>
                  {!wsConnected && (
                    <p className="text-xs mt-1">Waiting for connection...</p>
                  )}
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                      !notification.is_read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center space-x-2 mt-2 flex-wrap gap-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            notification.type === 'low_stock' 
                              ? 'bg-red-100 text-red-800'
                              : notification.type === 'new_job'
                              ? 'bg-green-100 text-green-800'
                              : notification.type === 'payment_update'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {notification.type.replace('_', ' ')}
                          </span>
                          {notification.priority === 'high' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              High Priority
                            </span>
                          )}
                        </div>
                      </div>
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full ml-2 shrink-0 mt-1"></div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(notification.created_at).toLocaleDateString()} at{' '}
                      {new Date(notification.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};