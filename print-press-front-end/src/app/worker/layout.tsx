'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { User } from '@/types';
import { PWAInstallPrompt } from '@/components/pwa-install';
import { usePushNotifications } from '@/lib/usePushNotifications';

export default function WorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isSupported: pushSupported, isSubscribed: pushSubscribed, subscribe: subscribePush } = usePushNotifications();

  // Auto-subscribe to push notifications after authentication
  useEffect(() => {
    if (user && pushSupported && !pushSubscribed && !sessionStorage.getItem('push_prompted')) {
      sessionStorage.setItem('push_prompted', 'true');
      const timer = setTimeout(() => {
        subscribePush().then(ok => {
          if (ok) console.log('✅ Worker auto-subscribed to push notifications');
        });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [user, pushSupported, pushSubscribed, subscribePush]);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/auth/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.role !== 'worker') {
        router.push('/auth/login');
        return;
      }
      setUser(parsedUser);
    } catch {
      router.push('/auth/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Close sidebar on route changes
  useEffect(() => {
    if (isSidebarOpen) {
      setIsSidebarOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    router.push('/auth/login');
  };

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(!isSidebarOpen);
  }, [isSidebarOpen]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <div className="flex h-screen bg-gray-50">
        <Sidebar
          userRole="worker"
          isMobileOpen={isSidebarOpen}
          onToggleSidebar={toggleSidebar}
        />
        <div className="flex-1 flex flex-col overflow-hidden lg:ml-0 min-w-0">
          <Header
            user={user}
            onLogout={handleLogout}
            onToggleSidebar={toggleSidebar}
          />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
        </div>
      </div>
      <PWAInstallPrompt staffOnly />
    </>
  );
}
