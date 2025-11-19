'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { User } from '@/types';
import { refreshAuthToken, logout, getStoredUser, isAuthenticated } from '@/lib/auth';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleSetUser = useCallback((userData: User | null) => {
    setUser(userData);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      console.log('🔄 Checking authentication...', { pathname });

      if (pathname && pathname.startsWith('/adm/login')) {
        console.log('On login page, skipping auth check');
        setLoading(false);
        return;
      }

      try {
        const storedUser = getStoredUser();
        const token = localStorage.getItem('auth_token');
        const refreshToken = localStorage.getItem('refresh_token');

        console.log(' Auth check:', {
          hasStoredUser: !!storedUser,
          hasToken: !!token,
          hasRefreshToken: !!refreshToken,
          pathname
        });

        if (!token && !refreshToken) {
          console.log('❌ No tokens found, redirecting to login');
          router.push('/adm/login');
          return;
        }

        if ((!storedUser || !token) && refreshToken) {
          console.log('🔄 No valid token but has refresh token, attempting refresh...');
          const newAuth = await refreshAuthToken();
          
          if (newAuth) {
            console.log('✅ Token refresh successful');
            handleSetUser(newAuth.user as User);
            setLoading(false);
            return;
          } else {
            console.log('❌ Token refresh failed, redirecting to login');
            router.push('/adm/login');
            return;
          }
        }

        if (token && storedUser) {
          const isValid = isAuthenticated();
          if (isValid && storedUser.role === 'admin') {
            console.log('✅ User is authenticated:', storedUser.name);
            handleSetUser(storedUser as User);
            setLoading(false);
            return;
          } else if (isValid && storedUser.role !== 'admin') {
            console.log('❌ User is not admin, redirecting to login');
            router.push('/adm/login');
            return;
          } else {
            console.log('🔄 Token may be expired, attempting refresh...');
            const newAuth = await refreshAuthToken();
            
            if (newAuth && newAuth.user.role === 'admin') {
              console.log('✅ Token refresh successful after expiration');
              handleSetUser(newAuth.user as User);
              setLoading(false);
              return;
            } else {
              console.log('❌ Token refresh failed or user not admin, redirecting to login');
              router.push('/adm/login');
              return;
            }
          }
        }

        console.log('❌ Authentication failed, redirecting to login');
        router.push('/adm/login');
        
      } catch (error) {
        console.error('❌ Auth check error:', error);
        router.push('/adm/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router, pathname, handleSetUser]);

  // FIXED: Only close sidebar on actual route changes, not when toggling
  useEffect(() => {
    if (isSidebarOpen) {
      console.log('🔄 Route changed, closing sidebar');
      setIsSidebarOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]); // We intentionally exclude isSidebarOpen to prevent immediate closure

  const handleLogout = () => {
    console.log('🚪 Logging out...');
    logout();
    handleSetUser(null);
  };

  const toggleSidebar = useCallback(() => {
    console.log('Toggling sidebar:', !isSidebarOpen);
    setIsSidebarOpen(!isSidebarOpen);
  }, [isSidebarOpen]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#AABD77] mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (pathname?.startsWith('/adm/login')) {
    return children;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#AABD77] mx-auto"></div>
          <p className="mt-4 text-gray-600">Authentication required...</p>
          <button 
            onClick={() => router.push('/adm/login')}
            className="mt-4 px-4 py-2 bg-[#AABD77] text-white rounded hover:bg-[#acc565]"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        userRole="admin" 
        isMobileOpen={isSidebarOpen}
        onToggleSidebar={toggleSidebar}
      />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0 min-w-0">
        <Header 
          user={user} 
          onLogout={handleLogout}
          onToggleSidebar={toggleSidebar}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}